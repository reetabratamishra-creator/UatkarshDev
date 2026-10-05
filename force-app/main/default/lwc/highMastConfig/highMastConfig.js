import { LightningElement, api, track } from 'lwc';

export default class HighMastConfig extends LightningElement {
    @api savedData = {};
    @api typeOfMast = 'Standard Mast';
    @api isReadOnly = false;

    // Classification
    @track selectedMastType = 'Standard Mast';
    @track selectedSubType = 'Lighting Mast';
    @track noOfSides = '20'; // 12, 16, 20 Polygonal, or 8 for Octagonal

    // Structural & Commercial Parameters
    @track heightOfMast = 30;
    @track noOfSegments = '3';
    @track windSpeed = '47';
    @track quantity = 1;
    @track basePricePerKg = 90.0;
    @track realizationPerKg = 7.0;

    // Segment Grid
    @track segments = [];

    // Base Plate & Foundation
    @track basePlateType = 'Circular';
    @track basePlateOd = 750;
    @track basePlateThickness = 30;
    @track basePlatePcd = 650;
    @track boltDiameter = 'M30';
    @track boltLength = 1000;
    @track noOfBolts = 12;
    @track stiffenerThickness = 12;

    // Lantern Carriage (L-Ring)
    @track typeOfLRing = 'Fixed Type Ring';
    @track ringDiameter = '1050';
    @track noOfLuminaires = '12';
    @track typeOfLuminaires = 'Symmetric';

    // Mechanical & Electrical Kit
    @track includeWinch = true;
    @track includePowerTool = true;
    @track includeWireRope = true;
    @track includeTrailingCable = true;
    @track includeFeederPillar = true;
    @track includeAol = true;
    @track includeLightningArrester = true;
    @track includePuPaint = false;

    // Stadium Specialized Equipment
    @track manRidingLift = false;
    @track ladderWithCage = false;

    connectedCallback() {
        if (this.typeOfMast) {
            this.selectedMastType = this.typeOfMast;
        }

        // Restore saved state if exists
        if (this.savedData && Object.keys(this.savedData).length > 0) {
            this.restoreSavedData();
        } else {
            this.applyDepartmentDefaults();
            this.generateSegments();
        }
    }

    restoreSavedData() {
        const d = this.savedData;
        if (d.type_of_mast) this.selectedMastType = d.type_of_mast;
        if (d.mast_standard || d.mast_customized || d.mast_standard_pole || d.seg5_mast_type) {
            this.selectedSubType = d.mast_standard || d.mast_customized || d.mast_standard_pole || d.seg5_mast_type;
        }
        if (d.lm_no_of_sides || d.noOfSides) this.noOfSides = String(d.lm_no_of_sides || d.noOfSides);
        if (d.r1_lm_height_of_mast || d.heightOfMast) this.heightOfMast = Number(d.r1_lm_height_of_mast || d.heightOfMast);
        if (d.r1_lm_no_of_segment || d.noOfSegments) this.noOfSegments = String(d.r1_lm_no_of_segment || d.noOfSegments);
        if (d.wind_speed_value || d.windSpeed) this.windSpeed = String(d.wind_speed_value || d.windSpeed);
        if (d.r1_lm_quantity || d.quantity) this.quantity = Number(d.r1_lm_quantity || d.quantity);
        if (d.basePricePerKg || d.Base_Amount__c) this.basePricePerKg = Number(d.basePricePerKg || d.Base_Amount__c);
        if (d.realizationPerKg || d.lm_realization) this.realizationPerKg = Number(d.realizationPerKg || d.lm_realization);

        if (d._segments && Array.isArray(d._segments) && d._segments.length > 0) {
            this.segments = JSON.parse(JSON.stringify(d._segments));
        } else {
            this.generateSegments();
        }

        if (d.r1_lm_base_plate_type) this.basePlateType = d.r1_lm_base_plate_type;
        if (d.r1_lm_od_of_base_plate) this.basePlateOd = Number(d.r1_lm_od_of_base_plate);
        if (d.r1_lm_thickness_of_base_plate) this.basePlateThickness = Number(d.r1_lm_thickness_of_base_plate);
        if (d.r1_lm_pcd_of_base_plate) this.basePlatePcd = Number(d.r1_lm_pcd_of_base_plate);
        if (d.r1_lm_fdn_bolt_diameter) this.boltDiameter = d.r1_lm_fdn_bolt_diameter;
        if (d.r1_lm_fdn_bolt_length) this.boltLength = Number(d.r1_lm_fdn_bolt_length);
        if (d.r1_lm_fdn_no_of_bolt) this.noOfBolts = Number(d.r1_lm_fdn_no_of_bolt);
        if (d.r1_lm_fdn_stiffner_thickness) this.stiffenerThickness = Number(d.r1_lm_fdn_stiffner_thickness);

        if (d.r1_lm_ring_diameter) this.ringDiameter = String(d.r1_lm_ring_diameter);
        if (d.r1_lm_no_of_luminaries) this.noOfLuminaires = String(d.r1_lm_no_of_luminaries);
        if (d.r1_lm_type_of_luminaries) this.typeOfLuminaires = d.r1_lm_type_of_luminaries;

        if (d.includeWinch !== undefined) this.includeWinch = Boolean(d.includeWinch);
        if (d.includePowerTool !== undefined) this.includePowerTool = Boolean(d.includePowerTool);
        if (d.includeWireRope !== undefined) this.includeWireRope = Boolean(d.includeWireRope);
        if (d.includeTrailingCable !== undefined) this.includeTrailingCable = Boolean(d.includeTrailingCable);
        if (d.includeFeederPillar !== undefined) this.includeFeederPillar = Boolean(d.includeFeederPillar);
        if (d.includeAol !== undefined) this.includeAol = Boolean(d.includeAol);
        if (d.includeLightningArrester !== undefined) this.includeLightningArrester = Boolean(d.includeLightningArrester);
        if (d.includePuPaint !== undefined) this.includePuPaint = Boolean(d.includePuPaint);
        if (d.man_riding_lift !== undefined) this.manRidingLift = Boolean(d.man_riding_lift);
        if (d.ladder_with_cage !== undefined) this.ladderWithCage = Boolean(d.ladder_with_cage);
    }

    applyDepartmentDefaults() {
        if (this.selectedMastType === 'Octagonal Pole') {
            this.noOfSides = '8';
            this.selectedSubType = 'Standard Lighting Pole';
            this.basePricePerKg = 95.0;
            this.heightOfMast = 9;
            this.noOfSegments = '1';
        } else if (this.selectedMastType === 'Customized Mast') {
            this.selectedSubType = 'STADIUM MAST';
            this.basePricePerKg = 98.0;
            this.realizationPerKg = 10.0;
            this.heightOfMast = 35;
            this.noOfSegments = '4';
        } else if (this.selectedMastType === 'Segment Above 5') {
            this.selectedSubType = 'Lighting Mast';
            this.basePricePerKg = 90.0;
            this.heightOfMast = 45;
            this.noOfSegments = '6';
        } else if (this.selectedMastType === 'Lightning Cum Lighting Mast') {
            this.selectedSubType = 'Lightning Cum Lighting Mast';
            this.basePricePerKg = 98.0;
            this.heightOfMast = 30;
            this.noOfSegments = '3';
        } else if (this.selectedMastType === 'Signage Mast') {
            this.selectedSubType = 'Signage Mast';
            this.basePricePerKg = 98.0;
            this.heightOfMast = 20;
            this.noOfSegments = '2';
        } else if (this.selectedMastType === 'Latching Mast') {
            this.selectedSubType = 'Latching Mast';
            this.basePricePerKg = 98.0;
            this.heightOfMast = 30;
            this.noOfSegments = '3';
        } else if (this.selectedMastType === 'Custom Lightning Mast') {
            this.selectedSubType = 'Custom Lightning Mast';
            this.basePricePerKg = 90.0;
            this.heightOfMast = 25;
            this.noOfSegments = '3';
        } else {
            this.selectedMastType = 'Standard Mast';
            this.selectedSubType = 'Lighting Mast';
            this.basePricePerKg = 90.0;
            this.realizationPerKg = 7.0;
            this.heightOfMast = 30;
            this.noOfSegments = '3';
        }
    }

    // Picklist options
    get mastTypeOptions() {
        return [
            { label: 'Standard Mast', value: 'Standard Mast' },
            { label: 'Customized Mast', value: 'Customized Mast' },
            { label: 'Octagonal Pole', value: 'Octagonal Pole' },
            { label: 'Segment Above 5', value: 'Segment Above 5' },
            { label: 'Lightning Cum Lighting Mast', value: 'Lightning Cum Lighting Mast' },
            { label: 'Signage Mast', value: 'Signage Mast' },
            { label: 'Latching Mast', value: 'Latching Mast' },
            { label: 'Custom Lightning Mast', value: 'Custom Lightning Mast' }
        ];
    }

    get subTypeOptions() {
        switch (this.selectedMastType) {
            case 'Standard Mast':
                return [
                    { label: 'Lighting Mast', value: 'Lighting Mast' },
                    { label: 'Transmission Pole', value: 'Transmission Pole' }
                ];
            case 'Customized Mast':
                return [
                    { label: 'STADIUM MAST', value: 'STADIUM MAST' },
                    { label: 'FLAG MAST', value: 'FLAG MAST' }
                ];
            case 'Octagonal Pole':
                return [
                    { label: 'Standard Lighting Pole', value: 'Standard Lighting Pole' },
                    { label: 'Custom Lighting Pole', value: 'Custom Lighting Pole' },
                    { label: 'Mid Hinge Pole', value: 'Mid Hinge Pole' }
                ];
            case 'Segment Above 5':
                return [
                    { label: 'Lighting Mast (>5)', value: 'Lighting Mast' },
                    { label: 'Stadium Mast (>5)', value: 'Stadium Mast' },
                    { label: 'Flag Mast (>5)', value: 'Flag Mast' },
                    { label: 'LCLM (>5)', value: 'LCLM' }
                ];
            case 'Lightning Cum Lighting Mast':
                return [{ label: 'Lightning Cum Lighting Mast', value: 'Lightning Cum Lighting Mast' }];
            case 'Signage Mast':
                return [{ label: 'Signage Mast', value: 'Signage Mast' }];
            case 'Latching Mast':
                return [{ label: 'Latching Mast', value: 'Latching Mast' }];
            case 'Custom Lightning Mast':
                return [{ label: 'Custom Lightning Mast', value: 'Custom Lightning Mast' }];
            default:
                return [{ label: 'Standard Lighting Mast', value: 'Lighting Mast' }];
        }
    }

    get sidesOptions() {
        return [
            { label: '20 Sided Polygonal (Standard HM)', value: '20' },
            { label: '16 Sided Polygonal', value: '16' },
            { label: '12 Sided Polygonal', value: '12' },
            { label: '8 Sided Octagonal (Pole)', value: '8' }
        ];
    }

    get segmentCountOptions() {
        return [
            { label: '1 Segment', value: '1' },
            { label: '2 Segments', value: '2' },
            { label: '3 Segments', value: '3' },
            { label: '4 Segments', value: '4' },
            { label: '5 Segments', value: '5' },
            { label: '6 Segments', value: '6' },
            { label: '7 Segments', value: '7' },
            { label: '8 Segments', value: '8' }
        ];
    }

    get windSpeedOptions() {
        return [
            { label: '39 m/s (140 km/h)', value: '39' },
            { label: '44 m/s (158 km/h)', value: '44' },
            { label: '47 m/s (169 km/h)', value: '47' },
            { label: '50 m/s (180 km/h)', value: '50' },
            { label: '55 m/s (198 km/h)', value: '55' }
        ];
    }

    get thicknessOptions() {
        return [
            { label: '3.0 mm', value: 3.0 },
            { label: '4.0 mm', value: 4.0 },
            { label: '5.0 mm', value: 5.0 },
            { label: '6.0 mm', value: 6.0 },
            { label: '8.0 mm', value: 8.0 },
            { label: '10.0 mm', value: 10.0 }
        ];
    }

    get basePlateTypeOptions() {
        return [
            { label: 'Circular', value: 'Circular' },
            { label: 'Square / Octagonal', value: 'Square' }
        ];
    }

    get boltDiaOptions() {
        return [
            { label: 'M24', value: 'M24' },
            { label: 'M30', value: 'M30' },
            { label: 'M33', value: 'M33' },
            { label: 'M36', value: 'M36' },
            { label: 'M42', value: 'M42' }
        ];
    }

    get lRingTypeOptions() {
        return [
            { label: 'Fixed Type Ring', value: 'Fixed Type Ring' },
            { label: 'Detachable Type Ring', value: 'Detachable Type Ring' }
        ];
    }

    get ringDiaOptions() {
        return [
            { label: '600 mm', value: '600' },
            { label: '800 mm', value: '800' },
            { label: '1050 mm', value: '1050' },
            { label: '1200 mm', value: '1200' }
        ];
    }

    get luminairesCountOptions() {
        return [
            { label: '4 Luminaires', value: '4' },
            { label: '6 Luminaires', value: '6' },
            { label: '8 Luminaires', value: '8' },
            { label: '12 Luminaires', value: '12' },
            { label: '16 Luminaires', value: '16' },
            { label: '18 Luminaires', value: '18' },
            { label: '20 Luminaires', value: '20' },
            { label: '24 Luminaires', value: '24' }
        ];
    }

    get beamOptions() {
        return [
            { label: 'Symmetric Beam', value: 'Symmetric' },
            { label: 'Asymmetric Beam', value: 'Asymmetric' }
        ];
    }

    get isStadiumMast() {
        return this.selectedSubType === 'STADIUM MAST' || this.selectedSubType === 'Stadium Mast';
    }

    get isLatchingMast() {
        return this.selectedMastType === 'Latching Mast';
    }

    get isMinSegments() {
        return this.segments.length <= 1;
    }

    // Segment Generation & Calculation
    generateSegments() {
        const count = parseInt(this.noOfSegments, 10) || 3;
        const totalHeightMm = (this.heightOfMast || 30) * 1000;
        const approxLength = Math.round(totalHeightMm / count + (count > 1 ? 500 : 0));

        let newSegments = [];
        const topOafInitial = 150;
        const bottomOafFinal = Math.min(900, Math.max(300, Math.round(topOafInitial + (this.heightOfMast * 15))));
        const oafStep = (bottomOafFinal - topOafInitial) / count;

        for (let i = 1; i <= count; i++) {
            const segTop = Math.round(topOafInitial + (i - 1) * oafStep);
            const segBottom = Math.round(topOafInitial + i * oafStep);
            const thickness = i === 1 ? 3.0 : (i === count ? (this.heightOfMast > 25 ? 5.0 : 4.0) : 4.0);
            const overlap = i < count ? Math.round(segBottom * 1.5) : 0;

            const segObj = {
                index: i,
                label: i === 1 ? 'Top (Seg 1)' : (i === count ? `Bottom (Seg ${i})` : `Mid (Seg ${i})`),
                length: approxLength,
                oafTop: segTop,
                oafBottom: segBottom,
                thickness: thickness,
                overlap: overlap,
                weightKg: 0
            };
            segObj.weightKg = this.calculateSegmentWeight(segObj, i, count);
            newSegments.push(segObj);
        }
        this.segments = newSegments;
        this.autoSizeBasePlate();
    }

    autoSizeBasePlate() {
        if (!this.segments || this.segments.length === 0) return;
        const bottomSeg = this.segments[this.segments.length - 1];
        const bottomOaf = bottomSeg.oafBottom || 450;
        this.basePlateOd = Math.round(bottomOaf + 250);
        this.basePlatePcd = Math.round(bottomOaf + 150);
        this.basePlateThickness = this.heightOfMast >= 30 ? 30 : (this.heightOfMast >= 20 ? 25 : 20);
        this.noOfBolts = this.heightOfMast >= 30 ? 12 : (this.heightOfMast >= 20 ? 8 : 6);
    }

    calculateSegmentWeight(seg, segIndex, totalSegs) {
        const n = parseInt(this.noOfSides, 10) || 20;
        const tanAngle = Math.tan(Math.PI / n);
        const t = Number(seg.thickness) || 3;
        const l = Number(seg.length) || 1000;
        const topOaf = Number(seg.oafTop) || 150;
        const bottomOaf = Number(seg.oafBottom) || 400;

        // Polygonal Perimeter = (OAF - t) * n * tan(pi/n)
        const pTop = (topOaf - t) * n * tanAngle;
        const pBottom = (bottomOaf - t) * n * tanAngle;
        const avgPerimeter = (pTop + pBottom) / 2;

        // Pure polygonal shaft weight in kg (Steel density 7.85e-6 kg/mm3)
        let wt = avgPerimeter * l * t * 7.85 * 0.000001;

        // Door opening reinforcements for bottom segment
        if (segIndex === totalSegs) {
            let doorOpeningAdd = 20;
            if (bottomOaf <= 400) doorOpeningAdd = 18;
            else if (bottomOaf <= 460) doorOpeningAdd = 26;
            else if (bottomOaf <= 610) doorOpeningAdd = 30;
            else if (bottomOaf <= 750) doorOpeningAdd = 35;
            else doorOpeningAdd = 40;
            wt += doorOpeningAdd;
        }

        // Top head frame pulley mounting brackets for segment 1
        if (segIndex === 1) {
            wt += 30;
        }

        // Add 5% galvanizing zinc tolerance
        wt = wt * 1.05;
        return Math.round(wt);
    }

    // Handlers
    handleMastTypeChange(event) {
        this.selectedMastType = event.detail.value;
        this.applyDepartmentDefaults();
        this.generateSegments();
    }

    handleSubTypeChange(event) {
        this.selectedSubType = event.detail.value;
        if (this.selectedSubType === 'FLAG MAST' || this.selectedSubType === 'STADIUM MAST') {
            this.basePricePerKg = 98.0;
            this.realizationPerKg = 10.0;
        } else if (this.selectedSubType === 'Standard Lighting Pole') {
            this.basePricePerKg = 95.0;
            this.noOfSides = '8';
        }
        this.generateSegments();
    }

    handleSidesChange(event) {
        this.noOfSides = event.detail.value;
        this.recalculateAllSegments();
    }

    handleHeightChange(event) {
        this.heightOfMast = Number(event.detail.value) || 30;
        this.generateSegments();
    }

    handleSegmentCountChange(event) {
        this.noOfSegments = event.detail.value;
        this.generateSegments();
    }

    handleWindSpeedChange(event) {
        this.windSpeed = event.detail.value;
    }

    handleQuantityChange(event) {
        this.quantity = Math.max(1, parseInt(event.detail.value, 10) || 1);
    }

    handleBasePriceChange(event) {
        this.basePricePerKg = Number(event.detail.value) || 0;
    }

    handleRealizationChange(event) {
        this.realizationPerKg = Number(event.detail.value) || 0;
    }

    handleAddSegment() {
        const nextIndex = this.segments.length + 1;
        this.noOfSegments = String(nextIndex);
        this.generateSegments();
    }

    handleRemoveSegment() {
        if (this.segments.length > 1) {
            const nextIndex = this.segments.length - 1;
            this.noOfSegments = String(nextIndex);
            this.generateSegments();
        }
    }

    handleSegmentFieldChange(event) {
        const index = parseInt(event.target.dataset.index, 10);
        const field = event.target.dataset.field;
        const val = Number(event.detail.value);

        this.segments = this.segments.map(seg => {
            if (seg.index === index) {
                seg[field] = val;
                seg.weightKg = this.calculateSegmentWeight(seg, index, this.segments.length);
            }
            return seg;
        });
    }

    recalculateAllSegments() {
        this.segments = this.segments.map(seg => {
            seg.weightKg = this.calculateSegmentWeight(seg, seg.index, this.segments.length);
            return seg;
        });
    }

    handleBasePlateTypeChange(event) { this.basePlateType = event.detail.value; }
    handleBasePlateOdChange(event) { this.basePlateOd = Number(event.detail.value) || 0; }
    handleBasePlateThicknessChange(event) { this.basePlateThickness = Number(event.detail.value) || 0; }
    handleBasePlatePcdChange(event) { this.basePlatePcd = Number(event.detail.value) || 0; }
    handleBoltDiaChange(event) { this.boltDiameter = event.detail.value; }
    handleBoltLengthChange(event) { this.boltLength = Number(event.detail.value) || 0; }
    handleNoOfBoltsChange(event) { this.noOfBolts = Number(event.detail.value) || 0; }
    handleStiffenerThicknessChange(event) { this.stiffenerThickness = Number(event.detail.value) || 0; }

    handleLRingTypeChange(event) { this.typeOfLRing = event.detail.value; }
    handleRingDiaChange(event) { this.ringDiameter = event.detail.value; }
    handleNoOfLuminairesChange(event) { this.noOfLuminaires = event.detail.value; }
    handleTypeOfLuminairesChange(event) { this.typeOfLuminaires = event.detail.value; }

    handleIncludeWinchChange(event) { this.includeWinch = event.target.checked; }
    handleIncludePowerToolChange(event) { this.includePowerTool = event.target.checked; }
    handleIncludeWireRopeChange(event) { this.includeWireRope = event.target.checked; }
    handleIncludeTrailingCableChange(event) { this.includeTrailingCable = event.target.checked; }
    handleIncludeFeederPillarChange(event) { this.includeFeederPillar = event.target.checked; }
    handleIncludeAolChange(event) { this.includeAol = event.target.checked; }
    handleIncludeLightningArresterChange(event) { this.includeLightningArrester = event.target.checked; }
    handleIncludePuPaintChange(event) { this.includePuPaint = event.target.checked; }
    handleManRidingLiftChange(event) { this.manRidingLift = event.target.checked; }
    handleLadderWithCageChange(event) { this.ladderWithCage = event.target.checked; }

    // Calculated Totals
    get shaftTotalWeightKg() {
        return this.segments.reduce((acc, s) => acc + (s.weightKg || 0), 0);
    }

    get basePlateWeightKg() {
        const bottomSeg = this.segments.length > 0 ? this.segments[this.segments.length - 1] : { oafBottom: 400 };
        const innerHole = (bottomSeg.oafBottom || 400) * 0.8;
        let area = 0;
        if (this.basePlateType === 'Circular') {
            area = (Math.PI / 4) * (Math.pow(this.basePlateOd, 2) - Math.pow(innerHole, 2));
        } else {
            area = Math.pow(this.basePlateOd, 2) - (Math.PI / 4) * Math.pow(innerHole, 2);
        }
        const wt = area * this.basePlateThickness * 7.85 * 0.000001 * 1.05;
        return Math.round(wt);
    }

    get boltsWeightKg() {
        const diaNum = parseInt(this.boltDiameter.replace('M', ''), 10) || 30;
        const boltArea = (Math.PI / 4) * Math.pow(diaNum, 2);
        const singleBoltWt = boltArea * this.boltLength * 7.85 * 0.000001;
        const stiffenerWt = ((this.basePlateOd - 400) / 2) * 200 * this.stiffenerThickness * 7.85 * 0.000001;
        const total = (singleBoltWt * this.noOfBolts * 1.3) + (stiffenerWt * this.noOfBolts);
        return Math.round(total);
    }

    get foundationWeightKg() {
        return this.basePlateWeightKg + this.boltsWeightKg;
    }

    get accessoriesWeightKg() {
        let wt = 0;
        // Lantern Carriage / L-Ring Weight
        const ringDia = parseInt(this.ringDiameter, 10) || 1050;
        wt += ringDia >= 1050 ? 120 : (ringDia >= 800 ? 90 : 65);

        // Winch, motor, wire rope, and pulleys
        if (this.includeWinch) wt += 55;
        if (this.includePowerTool) wt += 35;
        if (this.includeWireRope) wt += 40;
        if (this.includeTrailingCable) wt += 35;
        if (this.includeFeederPillar) wt += 45;
        if (this.includeAol) wt += 10;
        if (this.includeLightningArrester) wt += 8;

        if (this.manRidingLift) wt += 350;
        if (this.ladderWithCage) wt += Math.round(this.heightOfMast * 18);

        return wt;
    }

    get unitWeightKg() {
        return this.shaftTotalWeightKg + this.foundationWeightKg + this.accessoriesWeightKg;
    }

    get unitPrice() {
        const netRatePerKg = this.basePricePerKg + this.realizationPerKg;
        const steelValue = (this.shaftTotalWeightKg + this.basePlateWeightKg) * netRatePerKg;
        const hardwareValue = this.boltsWeightKg * (this.basePricePerKg + this.realizationPerKg + 15);
        let kitEquipmentValue = 0;
        if (this.includeWinch) kitEquipmentValue += 32000;
        if (this.includePowerTool) kitEquipmentValue += 28000;
        if (this.includeWireRope) kitEquipmentValue += 14000;
        if (this.includeTrailingCable) kitEquipmentValue += 16000;
        if (this.includeFeederPillar) kitEquipmentValue += 22000;
        if (this.includeAol) kitEquipmentValue += 6500;
        if (this.includeLightningArrester) kitEquipmentValue += 4500;
        if (this.includePuPaint) kitEquipmentValue += (this.unitWeightKg * 8);
        if (this.manRidingLift) kitEquipmentValue += 180000;
        if (this.ladderWithCage) kitEquipmentValue += (this.heightOfMast * 3500);

        return Math.round(steelValue + hardwareValue + kitEquipmentValue);
    }

    get unitCost() {
        const costRatePerKg = this.basePricePerKg;
        const steelCost = (this.shaftTotalWeightKg + this.basePlateWeightKg) * costRatePerKg;
        const hardwareCost = this.boltsWeightKg * (costRatePerKg + 10);
        let kitCost = 0;
        if (this.includeWinch) kitCost += 26000;
        if (this.includePowerTool) kitCost += 22000;
        if (this.includeWireRope) kitCost += 11000;
        if (this.includeTrailingCable) kitCost += 12500;
        if (this.includeFeederPillar) kitCost += 17500;
        if (this.includeAol) kitCost += 5000;
        if (this.includeLightningArrester) kitCost += 3500;
        if (this.includePuPaint) kitCost += (this.unitWeightKg * 6);
        if (this.manRidingLift) kitCost += 150000;
        if (this.ladderWithCage) kitCost += (this.heightOfMast * 2800);

        return Math.round(steelCost + hardwareCost + kitCost);
    }

    get totalWeightKg() {
        return this.unitWeightKg * this.quantity;
    }

    get totalWeightMt() {
        return (this.totalWeightKg / 1000).toFixed(3);
    }

    get totalAmount() {
        return this.unitPrice * this.quantity;
    }

    get formattedTotalAmount() {
        return this.totalAmount.toLocaleString('en-IN');
    }

    get formattedUnitPrice() {
        return this.unitPrice.toLocaleString('en-IN');
    }

    get formattedTotalWeightMt() {
        return this.totalWeightMt;
    }

    get formattedTotalWeightKg() {
        return this.totalWeightKg.toLocaleString('en-IN');
    }

    get formattedUnitWeightKg() {
        return this.unitWeightKg.toLocaleString('en-IN');
    }

    // Modal Close
    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    // Modal Save
    handleSave() {
        const netRatePerKg = this.basePricePerKg + this.realizationPerKg;

        // Build Quote Line Items array
        const lines = [
            {
                Category__c: 'High Mast - Shaft',
                Material__c: `${this.selectedSubType} ${this.heightOfMast}M (${this.noOfSegments} Segments, ${this.noOfSides} Sides)`,
                itemName: `${this.selectedSubType} ${this.heightOfMast}M Shaft (${this.noOfSegments} Segments)`,
                Quantity__c: this.quantity,
                quantity: this.quantity,
                uom: 'Nos',
                Total_Weight__c: ((this.shaftTotalWeightKg * this.quantity) / 1000).toFixed(3),
                weight: Math.round(this.shaftTotalWeightKg * this.quantity),
                Base_Rate__c: this.basePricePerKg,
                unitCost: Math.round(this.shaftTotalWeightKg * this.basePricePerKg),
                Added_Up_Margin__c: this.realizationPerKg,
                realization: this.realizationPerKg,
                Net_Rate__c: Math.round(this.shaftTotalWeightKg * netRatePerKg),
                unitPrice: Math.round(this.shaftTotalWeightKg * netRatePerKg),
                Total_Amount__c: Math.round(this.shaftTotalWeightKg * netRatePerKg * this.quantity),
                totalPrice: Math.round(this.shaftTotalWeightKg * netRatePerKg * this.quantity),
                totalCost: Math.round(this.shaftTotalWeightKg * this.basePricePerKg * this.quantity),
                category: 'High Mast - Shaft'
            },
            {
                Category__c: 'Foundation',
                Material__c: `Base Plate ${this.basePlateOd}mm (${this.basePlateThickness}mm Thk) & ${this.noOfBolts}x${this.boltDiameter} Bolts`,
                itemName: `Foundation Accessories & Anchor Cage (${this.noOfBolts}x${this.boltDiameter}x${this.boltLength}mm)`,
                Quantity__c: this.quantity,
                quantity: this.quantity,
                uom: 'Sets',
                Total_Weight__c: ((this.foundationWeightKg * this.quantity) / 1000).toFixed(3),
                weight: Math.round(this.foundationWeightKg * this.quantity),
                Base_Rate__c: this.basePricePerKg,
                unitCost: Math.round(this.foundationWeightKg * this.basePricePerKg),
                Added_Up_Margin__c: this.realizationPerKg,
                realization: this.realizationPerKg,
                Net_Rate__c: Math.round(this.foundationWeightKg * netRatePerKg),
                unitPrice: Math.round(this.foundationWeightKg * netRatePerKg),
                Total_Amount__c: Math.round(this.foundationWeightKg * netRatePerKg * this.quantity),
                totalPrice: Math.round(this.foundationWeightKg * netRatePerKg * this.quantity),
                totalCost: Math.round(this.foundationWeightKg * this.basePricePerKg * this.quantity),
                category: 'Foundation'
            },
            {
                Category__c: 'Lantern Carriage',
                Material__c: `${this.typeOfLRing} (${this.ringDiameter}mm Dia) for ${this.noOfLuminaires} Luminaires`,
                itemName: `Lantern Carriage & Top Headframe Assembly (${this.ringDiameter}mm Dia)`,
                Quantity__c: this.quantity,
                quantity: this.quantity,
                uom: 'Sets',
                weight: 120 * this.quantity,
                unitCost: 18000,
                unitPrice: 24000,
                realization: this.realizationPerKg,
                totalPrice: 24000 * this.quantity,
                totalCost: 18000 * this.quantity,
                category: 'Lantern Carriage'
            },
            {
                Category__c: 'KIT',
                Material__c: `Electro-Mechanical Operating KIT (Winch, Power Tool, SS Rope, Trailing Cable)`,
                itemName: `High Mast Operating KIT (Double Drum Winch & Electrical Accessories)`,
                Quantity__c: this.quantity,
                quantity: this.quantity,
                uom: 'Sets',
                weight: 180 * this.quantity,
                unitCost: 75000,
                unitPrice: 95000,
                realization: this.realizationPerKg,
                totalPrice: 95000 * this.quantity,
                totalCost: 75000 * this.quantity,
                category: 'KIT'
            }
        ];

        if (this.includeFeederPillar) {
            lines.push({
                Category__c: 'Accessories',
                Material__c: `Outdoor Feeder Pillar / Control Panel with Timer & Contactor`,
                itemName: `Outdoor Feeder Pillar Panel`,
                Quantity__c: this.quantity,
                quantity: this.quantity,
                uom: 'Nos',
                weight: 45 * this.quantity,
                unitCost: 17500,
                unitPrice: 22000,
                realization: this.realizationPerKg,
                totalPrice: 22000 * this.quantity,
                totalCost: 17500 * this.quantity,
                category: 'Accessories'
            });
        }

        if (this.manRidingLift) {
            lines.push({
                Category__c: 'Accessories',
                Material__c: `Man Riding Lift (Elevator Hoist Basket) for Stadium Mast`,
                itemName: `Man Riding Lift Assembly`,
                Quantity__c: this.quantity,
                quantity: this.quantity,
                uom: 'Sets',
                weight: 350 * this.quantity,
                unitCost: 150000,
                unitPrice: 180000,
                realization: this.realizationPerKg,
                totalPrice: 180000 * this.quantity,
                totalCost: 150000 * this.quantity,
                category: 'Accessories'
            });
        }

        // Build Payload matching existing Salesforce VF Pages & SOW controllers
        const payload = {
            type_of_mast: this.selectedMastType,
            mast_standard: this.selectedSubType,
            mast_customized: this.selectedSubType,
            mast_standard_pole: this.selectedSubType,
            seg5_mast_type: this.selectedSubType,
            lm_no_of_sides: this.noOfSides,
            wind_speed: 'YES',
            wind_speed_value: this.windSpeed,
            r1_lm_height_of_mast: this.heightOfMast,
            r1_lm_no_of_segment: this.noOfSegments,
            r1_lm_quantity: this.quantity,
            r1_lm_weight: this.unitWeightKg,
            r1_lm_unit_price: this.unitPrice,
            r1_lm_unit_cost: this.unitCost,
            r1_lm_realization: this.realizationPerKg,
            Base_Amount__c: this.basePricePerKg,

            // Base plate & bolts
            r1_lm_base_plate_type: this.basePlateType,
            r1_lm_od_of_base_plate: this.basePlateOd,
            r1_lm_thickness_of_base_plate: this.basePlateThickness,
            r1_lm_pcd_of_base_plate: this.basePlatePcd,
            r1_lm_fdn_bolt_type: 'Grade 6.8',
            r1_lm_fdn_bolt_diameter: this.boltDiameter,
            r1_lm_fdn_bolt_length: this.boltLength,
            r1_lm_fdn_no_of_bolt: this.noOfBolts,
            r1_lm_fdn_stiffner_thickness: this.stiffenerThickness,

            // Carriage & luminaires
            r1_lm_type_of_l_ring: this.typeOfLRing,
            r1_lm_ring_diameter: this.ringDiameter,
            r1_lm_no_of_luminaries: this.noOfLuminaires,
            r1_lm_type_of_luminaries: this.typeOfLuminaires,

            // KIT accessories
            includeWinch: this.includeWinch,
            includePowerTool: this.includePowerTool,
            includeWireRope: this.includeWireRope,
            includeTrailingCable: this.includeTrailingCable,
            includeFeederPillar: this.includeFeederPillar,
            includeAol: this.includeAol,
            includeLightningArrester: this.includeLightningArrester,
            includePuPaint: this.includePuPaint,
            man_riding_lift: this.manRidingLift,
            ladder_with_cage: this.ladderWithCage,

            _segments: this.segments,
            _totalWeightMt: this.totalWeightMt,
            _totalAmount: this.totalAmount
        };

        // Attach per-segment variables (r1_lm_1_length, etc.) for Visualforce compatibility
        this.segments.forEach((seg, idx) => {
            const num = idx + 1;
            payload[`r1_lm_${num}_length`] = seg.length;
            payload[`r1_lm_${num}_thickness`] = seg.thickness;
            payload[`r1_lm_${num}_oaf_top`] = seg.oafTop;
            payload[`r1_lm_${num}_oaf_bottom`] = seg.oafBottom;
            payload[`r1_lm_${num}_segment_weight`] = seg.weightKg;
            payload[`r1_lm_${num}_overlap`] = seg.overlap;
        });

        this.dispatchEvent(new CustomEvent('save', {
            detail: {
                type: `${this.selectedMastType} (${this.selectedSubType}, ${this.heightOfMast}M)`,
                Lines: lines,
                payload: payload
            }
        }));
    }
}