import { LightningElement, track, api } from 'lwc';

export default class CrashBarrierConfig extends LightningElement {
    @track selectedType = 'Conventional Type';
    
    get typeOptions() {
        return [
            { label: 'Conventional Type', value: 'Conventional Type' },
            { label: 'Crash Tested', value: 'Crash Tested' },
            { label: 'Railway', value: 'Railway' },
            { label: 'Non-Spacer Design', value: 'Non-Spacer Design' }
        ];
    }

    get isConventional() { return this.selectedType === 'Conventional Type'; }
    get isRailway() { return this.selectedType === 'Railway'; }
    get isCrashTested() { return this.selectedType === 'Crash Tested'; }
    get isNonSpacer() { return this.selectedType === 'Non-Spacer Design'; }

    // ── Shared: beam sub-type (W-Beam / Thrie Beam) ──
    @track conventionalType = '';
    @track crashTestedBeamType = '';

    get conventionalTypeOptions() {
        return [
            { label: 'W - Beam', value: 'W - Beam' },
            { label: 'Thrie Beam', value: 'Thrie Beam' }
        ];
    }

    // ── Conventional checkboxes ──
    @track hasSSSB = false;
    @track hasSSDB = false;
    @track hasDSSB = false;
    @track hasDSDB = false;

    // ── Crash Tested checkboxes ──
    @track ctHasSSSB = false;
    @track ctHasSSDB = false;
    @track ctHasDSSB = false;
    @track ctHasDSDB = false;

    // Rows for both types share the same array, distinguished by id prefix
    @track configuredRows = [];

    get transOptions() {
        return [
            { label: 'Ex-works', value: 'Ex-works' },
            { label: 'F.O.R (Freight on Road)', value: 'F.O.R (Freight on Road)' }
        ];
    }
    
    get beamThicknessOptions() { return this.getOptions(['2', '2.2', '2.3', '2.5', '2.7', '2.8', '2.9', '3']); }
    get spacerThicknessOptions() { return this.getOptions(['3.6', '3.8', '3.9', '4', '4.2', '4.4', '4.5', '4.7', '4.8', '4.9', '5']); }
    get postThicknessOptions() { return this.getOptions(['3.6', '3.8', '3.9', '4', '4.2', '4.4', '4.5', '4.7', '4.8', '4.9', '5']); }
    get spaceLengthOptions() { return this.getOptions(['330', '360']); }
    get zincCoatingOptions() { 
        return [
            { label: 'Regular', value: 'Regular' },
            { label: 'Average 77 microns over Crash Tested Rates', value: 'Average 77 microns over Crash Tested Rates' },
            { label: 'Minimum 77 microns ( Delta over Crash Tested Rates )', value: 'Minimum 77 microns ( Delta over Crash Tested Rates )' }
        ];
    }

    getOptions(arr) {
        return arr.map(a => ({ label: a, value: a }));
    }

    // ── Type Switcher ──
    handleTypeChange(event) {
        this.selectedType = event.detail.value;
    }

    // ─────────────────────────────────────────────────────────────
    // CONVENTIONAL TYPE handlers
    // ─────────────────────────────────────────────────────────────
    handleConventionalTypeChange(event) {
        this.conventionalType = event.detail.value;
        this.updateRows();
    }

    handleSSSBChange(event) { this.hasSSSB = event.target.checked; this.updateRows(); }
    handleSSDBChange(event) { this.hasSSDB = event.target.checked; this.updateRows(); }
    handleDSSBChange(event) { this.hasDSSB = event.target.checked; this.updateRows(); }
    handleDSDBChange(event) { this.hasDSDB = event.target.checked; this.updateRows(); }

    updateRows() {
        if (!this.conventionalType) return;
        const beamPrefix = this.conventionalType === 'W - Beam' ? 'w' : 'Thrie';
        const beamName = this.conventionalType === 'W - Beam' ? 'W-Beam' : 'Thrie Beam';
        this.syncRow(`${beamPrefix}_SSSB`, `${beamName} SSSB`, this.hasSSSB);
        this.syncRow(`${beamPrefix}_SSDB`, `${beamName} SSDB`, this.hasSSDB);
        this.syncRow(`${beamPrefix}_DSSB`, `${beamName} DSSB`, this.hasDSSB);
        this.syncRow(`${beamPrefix}_DSDB`, `${beamName} DSDB`, this.hasDSDB);
    }

    // ─────────────────────────────────────────────────────────────
    // CRASH TESTED TYPE handlers
    // ─────────────────────────────────────────────────────────────
    handleCrashTestedBeamTypeChange(event) {
        this.crashTestedBeamType = event.detail.value;
        this.updateCrashTestedRows();
    }

    handleCtSSSBChange(event) { this.ctHasSSSB = event.target.checked; this.updateCrashTestedRows(); }
    handleCtSSDBChange(event) { this.ctHasSSDB = event.target.checked; this.updateCrashTestedRows(); }
    handleCtDSSBChange(event) { this.ctHasDSSB = event.target.checked; this.updateCrashTestedRows(); }
    handleCtDSDBChange(event) { this.ctHasDSDB = event.target.checked; this.updateCrashTestedRows(); }

    updateCrashTestedRows() {
        if (!this.crashTestedBeamType) return;
        const beamPrefix = this.crashTestedBeamType === 'W - Beam' ? 'ct_w' : 'ct_Thrie';
        const beamName = this.crashTestedBeamType === 'W - Beam' ? 'CT W-Beam' : 'CT Thrie Beam';
        this.syncRow(`${beamPrefix}_SSSB`, `${beamName} SSSB`, this.ctHasSSSB);
        this.syncRow(`${beamPrefix}_SSDB`, `${beamName} SSDB`, this.ctHasSSDB);
        this.syncRow(`${beamPrefix}_DSSB`, `${beamName} DSSB`, this.ctHasDSSB);
        this.syncRow(`${beamPrefix}_DSDB`, `${beamName} DSDB`, this.ctHasDSDB);
    }

    // ─────────────────────────────────────────────────────────────
    // SHARED: row sync & calculation
    // ─────────────────────────────────────────────────────────────
    syncRow(id, label, isChecked) {
        const existingIndex = this.configuredRows.findIndex(r => r.id === id);
        if (isChecked && existingIndex === -1) {
            let row = {
                id, label,
                beamThickness: '3',
                spacerThickness: '5',
                postThickness: '5',
                postHeight: 1800,
                spaceLength: '330',
                roundBolt: 'M16 x 40',
                hexBolt: 'M16 x 40',
                zincCoating: 'Regular',
                nutsBolts: '4.6 / 4.8',
                quantityRm: 0,
                transInOffer: 'Ex-works',
                isExWorks: true,
                transportationKg: 0,
                fullVehicleFreight: 0,
                margin: 0,
                weight: 0,
                rateRm: 0,
                unitPrice: 0,
                unitCost: 0
            };
            this.calculateRow(row);
            this.configuredRows.push(row);
        } else if (!isChecked && existingIndex !== -1) {
            this.configuredRows.splice(existingIndex, 1);
        }
    }

    handleRowChange(event) {
        const rowId = event.target.dataset.id;
        const field = event.target.dataset.field;
        let val = event.target.value;
        if (event.target.type === 'number') {
            val = parseFloat(val) || 0;
        }
        const row = this.configuredRows.find(r => r.id === rowId);
        if (row) {
            row[field] = val;
            if (field === 'transInOffer') {
                row.isExWorks = val === 'Ex-works';
            }
            this.calculateRow(row);
        }
        this.configuredRows = [...this.configuredRows];
    }

    calculateRow(row) {
        // Detect if this is a Crash Tested row
        const isCT = row.id.startsWith('ct_');

        // Multipliers based on sub-type
        let beamMultiplier = 250, postMultiplier = 500, spacerMultiplier = 500, rbMultiplier = 2500, hbMultiplier = 1000;
        if (row.id.includes('SSDB')) {
            beamMultiplier = 500; postMultiplier = 500; spacerMultiplier = 1000; rbMultiplier = 5000; hbMultiplier = 2000;
        } else if (row.id.includes('DSSB')) {
            beamMultiplier = 500; postMultiplier = 500; spacerMultiplier = 1000; rbMultiplier = 5000; hbMultiplier = 2000;
        } else if (row.id.includes('DSDB')) {
            beamMultiplier = 1000; postMultiplier = 500; spacerMultiplier = 2000; rbMultiplier = 10000; hbMultiplier = 4000;
        }

        let widthMultiplier = row.id.includes('Thrie') ? 0.748 : 0.465;

        // Zinc logic
        let zincVal = row.zincCoating === 'Regular' ? 40
                    : row.zincCoating === 'Average 77 microns over Crash Tested Rates' ? 65
                    : row.zincCoating === 'Minimum 77 microns ( Delta over Crash Tested Rates )' ? 77 : 0;
        let znConsumption = zincVal * 7.1577574967405;

        // BEAM weight
        let beamThick = parseFloat(row.beamThickness) || 0;
        let blk_wt_beam = 4.318 * (beamThick / 1000) * widthMultiplier * 7850;
        let finish_wt_beam = ((4.318 * widthMultiplier * (znConsumption / 1000)) * 2) + blk_wt_beam;
        let total_wt_beam = (finish_wt_beam * beamMultiplier) / 1000;

        // POST weight
        let postThick = parseFloat(row.postThickness) || 0;
        let postHeight = parseFloat(row.postHeight) || 0;
        let blk_wt_post = (postHeight / 1000) * (postThick / 1000) * 0.28 * 7850;
        let finish_wt_post = (((postHeight / 1000) * 0.28 * (znConsumption / 1000)) * 2) + blk_wt_post;
        let total_wt_post = (finish_wt_post * postMultiplier) / 1000;

        // SPACER weight
        let spacerThick = parseFloat(row.spacerThickness) || 0;
        let spaceLength = parseFloat(row.spaceLength) || 0;
        let blk_wt_spacer = (spaceLength / 1000) * (spacerThick / 1000) * 0.28 * 7850;
        let finish_wt_spacer = (((spaceLength / 1000) * 0.28 * (znConsumption / 1000)) * 2) + blk_wt_spacer;
        let total_wt_spacer = (finish_wt_spacer * spacerMultiplier) / 1000;

        // BOLTS weight
        let total_wt_rb = (rbMultiplier * 0.14) / 1000;
        let total_wt_hb = (hbMultiplier * 0.14) / 1000;

        row.weight = Math.round((total_wt_beam + total_wt_post + total_wt_spacer + total_wt_rb + total_wt_hb) * 100) / 100;

        // ── Pricing ──
        // Crash Tested uses base rate 76 + 2 (CT premium) vs Conventional 76
        let baseRate = isCT ? 78 : 76;
        let zincRateAdd = zincVal === 77 ? 4 : (zincVal === 65 ? 2 : 0);
        let thicknessAdd = beamThick < 2.5 ? 0.5 : 0;
        let margin = parseFloat(row.margin) || 0;
        let transportation = parseFloat(row.transportationKg) || 0;

        let ratePerKg = baseRate + zincRateAdd + thicknessAdd + margin + transportation;
        if (row.id.includes('SSDB') || row.id.includes('DSDB') || row.id.includes('DSSB')) {
            ratePerKg += 1;
        }

        row.rateRm = Math.round(row.weight * ratePerKg * 100) / 100;
        row.unitPrice = Math.ceil(row.rateRm / 5) * 5;
        row.unitCost = Math.round((row.unitPrice - ((row.unitPrice * margin) / 100)) * 100) / 100;
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleSave() {
        const data = {
            selectedType: this.selectedType,
            rows: this.configuredRows
        };
        this.dispatchEvent(new CustomEvent('save', { detail: data }));
    }
}