import { LightningElement, track } from 'lwc';
import getRateCardJson from '@salesforce/apex/CreateQuoteController.getRateCardJson';

export default class ConventionalConfig extends LightningElement {
    @track designType = 'W - Beam';
    @track dynamicPicklists = {};
    @track dynamicBaseRates = {};

    connectedCallback() {
        getRateCardJson({ departmentName: 'Crash Barrier Conventional' })
            .then(result => {
                if (result) {
                    try {
                        let config = typeof result === 'string' ? JSON.parse(result) : result;
                        this.dynamicPicklists = config.PICKLIST_OPTIONS || {};
                        this.dynamicBaseRates = config.BASE_RATES || {};
                    } catch (e) {
                        console.error('Error parsing config for Conventional:', e);
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching Conventional config:', error);
            });
    }

    makeOptions(arr) {
        return arr ? arr.map(v => ({ label: v, value: v })) : [];
    }

    get designOptions() {
        return [
            { label: 'W - Beam', value: 'W - Beam' },
            { label: 'Thrie Beam', value: 'Thrie Beam' }
        ];
    }
    
    get isWBeam() { return this.designType === 'W - Beam'; }
    get isThrieBeam() { return this.designType === 'Thrie Beam'; }

    @track showWSSSB = false;
    @track showWSSDB = false;
    @track showWDSSB = false;
    @track showWDSDB = false;

    @track showTSSSB = false;
    @track showTSSDB = false;
    @track showTDSSB = false;
    @track showTDSDB = false;

    handleDesignChange(event) {
        this.designType = event.detail.value;
    }

    handleCheckboxChange(event) {
        this[event.target.dataset.field] = event.target.checked;
    }

    get wBeamThicknessOptions() { return this.makeOptions(this.dynamicPicklists.wBeamThicknessOptions || ['2', '2.2', '2.3', '2.5', '2.7', '2.8', '2.9', '3']); }
    get tBeamThicknessOptions() { return this.makeOptions(this.dynamicPicklists.tBeamThicknessOptions || ['2', '2.5', '2.7', '2.8', '2.9', '3']); }
    get spacerOptions() { return this.makeOptions(this.dynamicPicklists.spacerOptions || ['3.6', '3.8', '3.9', '4', '4.2', '4.4', '4.5', '4.7', '4.8', '4.9', '5']); }
    get postThicknessOptions() { return this.makeOptions(this.dynamicPicklists.postThicknessOptions || ['3.6', '3.8', '3.9', '4', '4.2', '4.4', '4.5', '4.7', '4.8', '4.9', '5']); }
    get spaceLengthOptions() { return this.makeOptions(this.dynamicPicklists.spaceLengthOptions || ['330', '360']); }
    get zincOptions() { return this.makeOptions(this.dynamicPicklists.zincOptions || ['Regular', 'Average 77 microns over Crash Tested Rates', 'Minimum 77 microns ( Delta over Crash Tested Rates )']); }
    get transOptions() { return this.makeOptions(this.dynamicPicklists.transOptions || ['Ex-works', 'F.O.R (Freight on Road)']); }

    createState(typeStr, rateOffset) {
        return {
            type: typeStr,
            beamThickness: '2',
            spacerThickness: '3.6',
            postThickness: '3.6',
            postHeight: 1800,
            spaceLength: '330',
            roundBolt: 'M16 x 40',
            hexBolt: 'M16 x 40',
            zincCoating: 'Regular',
            nutsBolts: '4.6 / 4.8',
            quantityRm: 0,
            transInOffer: 'Ex-works',
            transportation: 0,
            margin: 0,
            totalWt: 0,
            rateRm: 0,
            unitPrice: 0,
            unitCost: 0,
            listPrice: 0,
            rateOffset: rateOffset
        };
    }

    @track wSSSB = this.createState('W-SSSB', 0);
    @track wSSDB = this.createState('W-SSDB', 1);
    @track wDSSB = this.createState('W-DSSB', 1);
    @track wDSDB = this.createState('W-DSDB', 1);

    @track tSSSB = this.createState('Thrie-SSSB', 0);
    @track tSSDB = this.createState('Thrie-SSDB', 1);
    @track tDSSB = this.createState('Thrie-DSSB', 1);
    @track tDSDB = this.createState('Thrie-DSDB', 1);

    handleWChange(event) {
        const field = event.target.dataset.field;
        const section = event.target.dataset.section;
        let val = event.target.value;
        if (event.target.type === 'number') val = parseFloat(val) || 0;
        this[section][field] = val;
        
        if (field === 'transInOffer' && val === 'Ex-works') {
            this[section].transportation = 0;
        }

        this.calculateW(section);
    }

    handleTChange(event) {
        const field = event.target.dataset.field;
        const section = event.target.dataset.section;
        let val = event.target.value;
        if (event.target.type === 'number') val = parseFloat(val) || 0;
        this[section][field] = val;

        if (field === 'transInOffer' && val === 'Ex-works') {
            this[section].transportation = 0;
        }

        this.calculateT(section);
    }

    calculateW(sec) {
        let s = this[sec];
        const isDoubleSided = sec.includes('DSSB') || sec.includes('DSDB');
        const isDoubleBeam = sec.includes('SSDB') || sec.includes('DSDB');

        const beamMultiplier = isDoubleBeam ? 500 : 250;
        const beamFinalMultiplier = sec === 'wDSDB' ? 1000 : beamMultiplier;
        
        const spacerFinalMultiplier = sec === 'wSSSB' ? 500 : (sec === 'wDSDB' ? 2000 : 1000);
        const postFinalMultiplier = 500;

        let rbCount = 2500;
        let hbCount = 1000;
        if (sec === 'wSSDB' || sec === 'wDSSB') {
            rbCount = 5000;
            hbCount = 2000;
        } else if (sec === 'wDSDB') {
            rbCount = 10000;
            hbCount = 4000;
        }

        let znRate = s.zincCoating === 'Regular' ? 40 : (s.zincCoating.includes('Average') ? 65 : 77);
        let znConsumption = Math.round(znRate * 7.1577574967405);
        let blkBeam = Math.round((4.318 * (parseFloat(s.beamThickness) / 1000) * 0.465 * 7850) * 100) / 100;
        let finishBeam = Math.round((((4.318 * 0.465 * (znConsumption / 1000)) * 2) + blkBeam) * 100) / 100;
        let wtBeam = Math.round(((finishBeam * beamFinalMultiplier) / 1000) * 100) / 100;

        let blkPost = Math.round((((s.postHeight / 1000) * (parseFloat(s.postThickness) / 1000) * 0.28) * 7850) * 100) / 100;
        let finishPost = Math.round(((((s.postHeight / 1000) * 0.28 * (znConsumption / 1000)) * 2) + blkPost) * 100) / 100;
        let wtPost = Math.round(((finishPost * postFinalMultiplier) / 1000) * 100) / 100;

        let blkSpacer = Math.round(((parseFloat(s.spaceLength) / 1000) * (parseFloat(s.spacerThickness) / 1000) * 0.28 * 7850) * 100) / 100;
        let finishSpacer = Math.round(((((parseFloat(s.spaceLength) / 1000) * 0.28 * (znConsumption / 1000)) * 2) + blkSpacer) * 100) / 100;
        let wtSpacer = Math.round(((finishSpacer * spacerFinalMultiplier) / 1000) * 100) / 100;

        let wtRb = Math.round(((rbCount * 0.14) / 1000) * 100) / 100;
        let wtHb = Math.round(((hbCount * 0.14) / 1000) * 100) / 100;

        s.totalWt = Math.round((wtBeam + wtPost + wtSpacer + wtRb + wtHb) * 100) / 100;

        let znDelta = znRate === 77 ? 4 : (znRate === 65 ? 2 : 0);
        let thicknessDelta = parseFloat(s.beamThickness) < 2.5 ? 0.5 : 0;
        let baseRate = this.dynamicBaseRates[s.type] || (76 + s.rateOffset);
        let ratePerKg = baseRate + znDelta + thicknessDelta + s.margin + s.transportation;

        s.rateRm = Math.round((s.totalWt * ratePerKg) * 100) / 100;
        s.unitPrice = Math.ceil(s.rateRm / 5) * 5;
        s.unitCost = Math.round((s.unitPrice - ((s.unitPrice * s.margin) / 100)) * 100) / 100;
        s.listPrice = s.unitPrice;
        
        this[sec] = { ...s };
    }

    calculateT(sec) {
        let s = this[sec];

        const beamFinalMultiplier = sec === 'tDSDB' ? 1000 : (sec === 'tSSSB' ? 250 : 500);
        const spacerFinalMultiplier = sec === 'tSSSB' ? 500 : (sec === 'tDSDB' ? 2000 : 1000);
        const postFinalMultiplier = 500;

        let rbCount = 4000;
        let hbCount = 1000;
        if (sec === 'tSSDB' || sec === 'tDSSB') {
            rbCount = 8000;
            hbCount = 2000;
        } else if (sec === 'tDSDB') {
            rbCount = 16000;
            hbCount = 4000;
        }

        let znRate = s.zincCoating === 'Regular' ? 40 : (s.zincCoating.includes('Average') ? 65 : 77);
        let znConsumption = Math.round(znRate * 7.1577574967405);
        let blkBeam = Math.round((4.318 * (parseFloat(s.beamThickness) / 1000) * 0.725 * 7850) * 100) / 100;
        let finishBeam = Math.round((((4.318 * 0.725 * (znConsumption / 1000)) * 2) + blkBeam) * 100) / 100;
        let wtBeam = Math.round(((finishBeam * beamFinalMultiplier) / 1000) * 100) / 100;

        let blkPost = Math.round((((s.postHeight / 1000) * (parseFloat(s.postThickness) / 1000) * 0.28) * 7850) * 100) / 100;
        let finishPost = Math.round(((((s.postHeight / 1000) * 0.28 * (znConsumption / 1000)) * 2) + blkPost) * 100) / 100;
        let wtPost = Math.round(((finishPost * postFinalMultiplier) / 1000) * 100) / 100;

        let blkSpacer = Math.round(((parseFloat(s.spaceLength) / 1000) * (parseFloat(s.spacerThickness) / 1000) * 0.28 * 7850) * 100) / 100;
        let finishSpacer = Math.round(((((parseFloat(s.spaceLength) / 1000) * 0.28 * (znConsumption / 1000)) * 2) + blkSpacer) * 100) / 100;
        let wtSpacer = Math.round(((finishSpacer * spacerFinalMultiplier) / 1000) * 100) / 100;

        let wtRb = Math.round(((rbCount * 0.14) / 1000) * 100) / 100;
        let wtHb = Math.round(((hbCount * 0.14) / 1000) * 100) / 100;

        s.totalWt = Math.round((wtBeam + wtPost + wtSpacer + wtRb + wtHb) * 100) / 100;

        let znDelta = znRate === 77 ? 4 : (znRate === 65 ? 2 : 0);
        let thicknessDelta = parseFloat(s.beamThickness) < 2.5 ? 0.5 : 0;
        let baseRate = this.dynamicBaseRates[s.type] || (76 + s.rateOffset);
        let ratePerKg = baseRate + znDelta + thicknessDelta + s.margin + s.transportation;

        s.rateRm = Math.round((s.totalWt * ratePerKg) * 100) / 100;
        s.unitPrice = Math.ceil(s.rateRm / 5) * 5;
        s.unitCost = Math.round((s.unitPrice - ((s.unitPrice * s.margin) / 100)) * 100) / 100;
        s.listPrice = s.unitPrice;
        
        this[sec] = { ...s };
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleSave() {
        let sections = [];
        const wMapping = [
            { key: 'wSSSB', show: this.showWSSSB },
            { key: 'wSSDB', show: this.showWSSDB },
            { key: 'wDSSB', show: this.showWDSSB },
            { key: 'wDSDB', show: this.showWDSDB }
        ];
        const tMapping = [
            { key: 'tSSSB', show: this.showTSSSB },
            { key: 'tSSDB', show: this.showTSSDB },
            { key: 'tDSSB', show: this.showTDSSB },
            { key: 'tDSDB', show: this.showTDSDB }
        ];

        if (this.isWBeam) {
            wMapping.forEach(m => {
                if (m.show && this[m.key].quantityRm > 0) {
                    sections.push(this[m.key]);
                }
            });
        } else {
            tMapping.forEach(m => {
                if (m.show && this[m.key].quantityRm > 0) {
                    sections.push(this[m.key]);
                }
            });
        }

        this.dispatchEvent(new CustomEvent('save', {
            detail: { sections: sections, designType: this.designType }
        }));
    }
}