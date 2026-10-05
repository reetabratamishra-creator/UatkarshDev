import { LightningElement, track } from 'lwc';
import getRateCardJson from '@salesforce/apex/CreateQuoteController.getRateCardJson';

export default class RailwayConfig extends LightningElement {
    @track showGraded = false;
    @track showNonGraded = false;

    @track dynamicPicklists = {};
    @track dynamicBaseRates = {};

    connectedCallback() {
        getRateCardJson({ departmentName: 'Crash Barrier Railway' })
            .then(result => {
                if (result) {
                    try {
                        let config = typeof result === 'string' ? JSON.parse(result) : result;
                        this.dynamicPicklists = config.PICKLIST_OPTIONS || {};
                        this.dynamicBaseRates = config.BASE_RATES || {};
                    } catch (e) {
                        console.error('Error parsing config for Railway:', e);
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching Railway config:', error);
            });
    }

    makeOptions(arr) {
        return arr ? arr.map(v => ({ label: v, value: v })) : [];
    }

    get beamOptions() { return this.makeOptions(this.dynamicPicklists.beamOptions || ['2']); }
    get postThicknessOptions() { return this.makeOptions(this.dynamicPicklists.postThicknessOptions || ['3.8', '3.9', '4']); }
    get postHeightOptions() { return this.makeOptions(this.dynamicPicklists.postHeightOptions || ['2100', '2400', '2700']); }
    get zincOptions() { return this.makeOptions(this.dynamicPicklists.zincOptions || ['Regular', 'Average 77 microns over Crash Tested Rates', 'Minimum 77 microns ( Delta over Crash Tested Rates )']); }
    get transOptions() { return this.makeOptions(this.dynamicPicklists.transOptions || ['Ex-works', 'F.O.R (Freight on Road)']); }
    get removePostOptions() { return this.makeOptions(this.dynamicPicklists.removePostOptions || ['8', '9']); }

    @track graded = this.createDefaultModel();
    @track nonGraded = this.createDefaultModel();

    createDefaultModel() {
        return {
            beamThickness: '2',
            postThickness: '',
            postHeight: '2700',
            nutsBolts: '4.6 / 4.8',
            zincCoating: 'Regular',
            removePost: false,
            removePostValue: '8',
            quantityRm: 0,
            transInOffer: 'Ex-works',
            transportation: 0,
            margin: 4,
            
            blkWtBeam: 0, znConsBeam: 0, finishWtBeam: 0, totalWtBeam: 0,
            blkWtPost: 0, znConsPost: 0, finishWtPost: 0, totalWtPost: 0,
            blkWtWasher: 0, znConsWasher: 0, finishWtWasher: 0, totalWtWasher: 0,
            totalWtBhb: 0, totalWt: 0, rateRm: 0, unitPrice: 0, unitCost: 0, listPrice: 0
        };
    }

    get gradedIsExWorks() { return this.graded.transInOffer === 'Ex-works'; }
    get nonGradedIsExWorks() { return this.nonGraded.transInOffer === 'Ex-works'; }

    handleGradedCheckbox(e) { this.showGraded = e.target.checked; }
    handleNonGradedCheckbox(e) { this.showNonGraded = e.target.checked; }

    handleGradedChange(e) {
        this._applyChange(this.graded, e);
        this.calcGraded();
        this.graded = { ...this.graded };
    }

    handleNonGradedChange(e) {
        this._applyChange(this.nonGraded, e);
        this.calcNonGraded();
        this.nonGraded = { ...this.nonGraded };
    }

    _applyChange(obj, e) {
        const field = e.target.dataset.field;
        let val;
        if (e.target.type === 'checkbox') {
            val = e.target.checked;
        } else {
            val = e.target.value;
            if (e.target.type === 'number' || (e.target.type === 'text' && !isNaN(parseFloat(val)) && e.target.dataset.numeric === 'true')) {
                val = parseFloat(val) || 0;
            }
        }
        obj[field] = val;
    }

    _zincConsumption(coating) {
        return Math.round(((coating === 'Regular' ? 40 : coating === 'Average 77 microns over Crash Tested Rates' ? 65 : coating === 'Minimum 77 microns ( Delta over Crash Tested Rates )' ? 77 : 0) * 7.1577574967405) * 100) / 100;
    }

    calcGraded() {
        const o = this.graded;
        
        // Beam
        o.blkWtBeam = Math.round((4.318 * (parseFloat(o.beamThickness) || 0) / 1000 * 0.465 * 7850) * 100) / 100;
        o.znConsBeam = this._zincConsumption(o.zincCoating);
        o.finishWtBeam = Math.round((((4.318 * 0.465 * (o.znConsBeam / 1000)) * 2) + o.blkWtBeam) * 100) / 100;
        o.totalWtBeam = Math.round(((o.finishWtBeam * 500) / 1000) * 100) / 100;

        // Post
        const pt = parseFloat(o.postThickness) || 0;
        const ph = parseFloat(o.postHeight) || 0;
        if (pt > 0 && ph > 0) {
            o.blkWtPost = Math.round(((((ph / 1000) * (pt / 1000) * 0.28) * 7850) + 0.2) * 100) / 100;
        } else { o.blkWtPost = 0; }
        o.znConsPost = o.znConsBeam;
        o.finishWtPost = Math.round(((((ph / 1000) * 0.28 * (o.znConsPost / 1000)) * 2) + o.blkWtPost) * 100) / 100;
        const removePostMult = o.removePostValue === '9' ? 562.5 : 481.5;
        o.totalWtPost = Math.round(((o.finishWtPost * removePostMult) / 1000) * 100) / 100;

        // Washer
        o.blkWtWasher = Math.round((0.075 * 0.004 * 0.045 * 7850) * 100) / 100;
        o.znConsWasher = o.znConsBeam;
        o.finishWtWasher = Math.round((((0.075 * 0.045 * (o.znConsWasher / 1000)) * 2) + o.blkWtWasher) * 100) / 100;
        o.totalWtWasher = Math.round(((o.finishWtWasher * 1125) / 1000) * 100) / 100;

        // BHB
        o.totalWtBhb = Math.round(((4125 * 0.14) / 1000) * 100) / 100;

        // Total
        o.totalWt = Math.round((o.totalWtBeam + o.totalWtPost + o.totalWtWasher + o.totalWtBhb) * 100) / 100;

        // Rate
        const zincDelta = o.zincCoating === 'Minimum 77 microns ( Delta over Crash Tested Rates )' ? 2 : 0;
        const trans = o.transInOffer !== 'Ex-works' ? (parseFloat(o.transportation) || 0) : 0;
        const baseRate = this.dynamicBaseRates['Graded'] || 79;
        o.rateRm = o.totalWt * ((baseRate + zincDelta + (parseFloat(o.margin) || 0)) + trans);
        
        o.unitPrice = Math.ceil(o.rateRm / 5) * 5;
        o.unitCost = o.unitPrice - (o.unitPrice * (parseFloat(o.margin) || 0) / 100);
        o.listPrice = Math.ceil(((baseRate + zincDelta + 4) * o.totalWt) / 5) * 5;
    }

    calcNonGraded() {
        const o = this.nonGraded;
        
        // Beam
        o.blkWtBeam = Math.round((4.318 * (parseFloat(o.beamThickness) || 0) / 1000 * 0.465 * 7850) * 100) / 100;
        o.znConsBeam = this._zincConsumption(o.zincCoating);
        o.finishWtBeam = Math.round((((4.318 * 0.465 * (o.znConsBeam / 1000)) * 2) + o.blkWtBeam) * 100) / 100;
        o.totalWtBeam = Math.round(((o.finishWtBeam * 500) / 1000) * 100) / 100;

        // Post
        const pt = parseFloat(o.postThickness) || 0;
        const ph = parseFloat(o.postHeight) || 0;
        if (pt > 0 && ph > 0) {
            o.blkWtPost = Math.round(((((ph / 1000) * (pt / 1000) * 0.28) * 7850) + 0.2) * 100) / 100;
        } else { o.blkWtPost = 0; }
        o.znConsPost = o.znConsBeam;
        o.finishWtPost = Math.round(((((ph / 1000) * 0.28 * (o.znConsPost / 1000)) * 2) + o.blkWtPost) * 100) / 100;
        const removePostMult = o.removePostValue === '9' ? 562.5 : 481.5;
        o.totalWtPost = Math.round(((o.finishWtPost * removePostMult) / 1000) * 100) / 100;

        // Washer
        o.blkWtWasher = Math.round((0.075 * 0.004 * 0.045 * 7850) * 100) / 100;
        o.znConsWasher = o.znConsBeam;
        o.finishWtWasher = Math.round((((0.075 * 0.045 * (o.znConsWasher / 1000)) * 2) + o.blkWtWasher) * 100) / 100;
        o.totalWtWasher = Math.round(((o.finishWtWasher * 1125) / 1000) * 100) / 100;

        // BHB
        o.totalWtBhb = Math.round(((4125 * 0.14) / 1000) * 100) / 100;

        // Total
        o.totalWt = Math.round((o.totalWtBeam + o.totalWtPost + o.totalWtWasher + o.totalWtBhb) * 100) / 100;

        // Rate
        const zincDelta = o.zincCoating === 'Minimum 77 microns ( Delta over Crash Tested Rates )' ? 4 : (o.zincCoating === 'Average 77 microns over Crash Tested Rates' ? 2 : 0);
        const trans = o.transInOffer !== 'Ex-works' ? (parseFloat(o.transportation) || 0) : 0;
        const baseRate = this.dynamicBaseRates['Non-Graded'] || 76;
        o.rateRm = o.totalWt * ((baseRate + zincDelta + (parseFloat(o.margin) || 0)) + trans);
        
        o.unitPrice = Math.ceil(o.rateRm / 5) * 5;
        o.unitCost = o.unitPrice - (o.unitPrice * (parseFloat(o.margin) || 0) / 100);
        o.listPrice = Math.ceil(((baseRate + zincDelta + 2) * o.totalWt) / 5) * 5;
    }

    handleClose() { this.dispatchEvent(new CustomEvent('close')); }
    
    handleSave() {
        const sections = [];
        if (this.showGraded) sections.push({ type: 'Graded', ...this.graded });
        if (this.showNonGraded) sections.push({ type: 'Non-Graded', ...this.nonGraded });
        
        this.dispatchEvent(new CustomEvent('save', { detail: { sections } }));
    }
}