import { LightningElement, track } from 'lwc';
import getRateCardJson from '@salesforce/apex/CreateQuoteController.getRateCardJson';

export default class NonSpacerConfig extends LightningElement {
    @track designType = 'W - Beam';

    get designOptions() {
        return [
            { label: 'W - Beam', value: 'W - Beam' },
            { label: 'Thrie Beam', value: 'Thrie Beam' }
        ];
    }

    get isWBeam() { return this.designType === 'W - Beam'; }
    get isThrieBeam() { return this.designType === 'Thrie Beam'; }

    @track dynamicPicklists = {};
    @track dynamicBaseRates = {};

    connectedCallback() {
        getRateCardJson({ departmentName: 'Crash Barrier Non Spacer' })
            .then(result => {
                if (result) {
                    try {
                        let config = typeof result === 'string' ? JSON.parse(result) : result;
                        this.dynamicPicklists = config.PICKLIST_OPTIONS || {};
                        this.dynamicBaseRates = config.BASE_RATES || {};
                    } catch (e) {
                        console.error('Error parsing config for Non Spacer:', e);
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching Non Spacer config:', error);
            });
    }

    makeOptions(arr) {
        return arr ? arr.map(v => ({ label: v, value: v })) : [];
    }

    get zincOptions() { return this.makeOptions(this.dynamicPicklists.zincOptions || ['Regular', 'Average 77 microns over Crash Tested Rates', 'Minimum 77 microns ( Delta over Crash Tested Rates )']); }
    get transOptions() { return this.makeOptions(this.dynamicPicklists.transOptions || ['Ex-works', 'F.O.R (Freight on Road)']); }

    // ══════════════════════════════════════════════════════════
    // W-BEAM
    // ══════════════════════════════════════════════════════════
    @track w = {
        beamThickness: '2.2', postHeight: 1500, centreTocentre: '2',
        postThickness: '3.8', nutsBolts: '4.6 / 4.8', zincCoating: 'Regular',
        quantityRm: 0, transInOffer: 'Ex-works', margin: 2,
        transportation: 0,
        
        blkWtBeam: 0, znConsBeam: 0, finishWtBeam: 0, totalWtBeam: 0,
        blkWtPost: 0, znConsPost: 0, finishWtPost: 0, totalWtPost: 0,
        blkWtWasher: 0, znConsWasher: 0, finishWtWasher: 0, totalWtWasher: 0,
        totalWtBhb: 0, totalWt: 0, rateRm: 0, unitPrice: 0, unitCost: 0, listPrice: 0
    };

    get wBeamOptions() { return this.makeOptions(this.dynamicPicklists.wBeamOptions || ['2.2', '2.3', '2.5']); }
    get wCtcOptions() { return this.makeOptions(this.dynamicPicklists.wCtcOptions || ['2', '4']); }
    get wPostThicknessOptions() {
        return String(this.w.centreTocentre) === '4' 
            ? this.makeOptions(this.dynamicPicklists.wPostThicknessOptions_4 || ['5', '4.7', '4.8', '4.9'])
            : this.makeOptions(this.dynamicPicklists.wPostThicknessOptions_2 || ['3.8', '3.9', '4']);
    }
    get wIsExWorks() { return this.w.transInOffer === 'Ex-works'; }

    // ══════════════════════════════════════════════════════════
    // THRIE-BEAM
    // ══════════════════════════════════════════════════════════
    @track t = {
        beamThickness: '2.2', postHeight: 1700, centreTocentre: '2',
        postThickness: '3.6', nutsBolts: '4.6 / 4.8', zincCoating: 'Regular',
        quantityRm: 0, transInOffer: 'Ex-works', margin: 2,
        transportation: 0,

        blkWtBeam: 0, znConsBeam: 0, finishWtBeam: 0, totalWtBeam: 0,
        blkWtPost: 0, znConsPost: 0, finishWtPost: 0, totalWtPost: 0,
        blkWtWasher: 0, znConsWasher: 0, finishWtWasher: 0, totalWtWasher: 0,
        totalWtBhb: 0, totalWt: 0, rateRm: 0, unitPrice: 0, unitCost: 0, listPrice: 0
    };

    get tBeamOptions() { return this.makeOptions(this.dynamicPicklists.tBeamOptions || ['2.2', '2.3', '2.5']); }
    get tCtcOptions() { return this.makeOptions(this.dynamicPicklists.tCtcOptions || ['2', '2.66']); }
    get tPostThicknessOptions() { return this.makeOptions(this.dynamicPicklists.tPostThicknessOptions || ['3.6', '3.8', '3.9', '4']); }
    get tIsExWorks() { return this.t.transInOffer === 'Ex-works'; }

    // ══════════════════════════════════════════════════════════
    // HANDLERS
    // ══════════════════════════════════════════════════════════
    handleDesignChange(e) { this.designType = e.detail.value; }

    handleWChange(e) { 
        this._applyChange(this.w, e);
        if (e.target.dataset.field === 'centreTocentre') {
            const opts = this.wPostThicknessOptions;
            if (!opts.find(opt => opt.value === this.w.postThickness)) {
                this.w.postThickness = opts[0].value;
            }
        }
        this.calcW(); 
        this.w = { ...this.w }; 
    }
    
    handleTChange(e) { 
        this._applyChange(this.t, e); 
        this.calcT(); 
        this.t = { ...this.t }; 
    }

    _applyChange(obj, e) {
        const field = e.target.dataset.field;
        let val = e.target.value;
        if (e.target.type === 'number' || (e.target.type === 'text' && !isNaN(parseFloat(val)) && e.target.dataset.numeric === 'true')) {
            val = parseFloat(val) || 0;
        }
        obj[field] = val;
    }

    _zincConsumption(coating) {
        return Math.round(((coating === 'Regular' ? 40 : coating === 'Average 77 microns over Crash Tested Rates' ? 65 : coating === 'Minimum 77 microns ( Delta over Crash Tested Rates )' ? 77 : 0) * 7.1577574967405) * 100) / 100;
    }

    // ══════════════════════════════════════════════════════════
    // CALCULATIONS
    // ══════════════════════════════════════════════════════════
    calcW() {
        const o = this.w;
        const ctc = String(o.centreTocentre);
        
        // Beam
        o.blkWtBeam = Math.round((4.318 * (parseFloat(o.beamThickness) || 0) / 1000 * 0.465 * 7850) * 100) / 100;
        o.znConsBeam = this._zincConsumption(o.zincCoating);
        o.finishWtBeam = Math.round((((4.318 * 0.465 * (o.znConsBeam / 1000)) * 2) + o.blkWtBeam) * 100) / 100;
        o.totalWtBeam = Math.round(((o.finishWtBeam * 250) / 1000) * 100) / 100;

        // Post
        const pt = parseFloat(o.postThickness) || 0;
        const ph = parseFloat(o.postHeight) || 0;
        o.blkWtPost = Math.round((ctc === '2' ? ((((pt / 1000) * (ph / 1000) * 0.274) * 7850) + 0.2) : ctc === '4' ? ((((pt / 1000) * (ph / 1000) * 0.274) * 7850) + 0.4) : 0) * 100) / 100;
        o.znConsPost = o.znConsBeam;
        o.finishWtPost = Math.round(((((ph / 1000) * 0.274 * (o.znConsPost / 1000)) * 2) + o.blkWtPost) * 100) / 100;
        o.totalWtPost = Math.round(((o.finishWtPost * (ctc === '2' ? 500 : 250)) / 1000) * 100) / 100;

        // Washer
        o.blkWtWasher = Math.round((((4.9 / 1000) * (115 / 1000) * (40 / 1000)) * 7850) * 100) / 100;
        o.znConsWasher = o.znConsBeam;
        o.finishWtWasher = Math.round((((0.115 * 0.040 * (o.znConsWasher / 1000)) * 2) + o.blkWtWasher) * 100) / 100;
        o.totalWtWasher = Math.round(((o.finishWtWasher * (ctc === '2' ? 500 : 250)) / 1000) * 100) / 100;

        // BHB
        o.totalWtBhb = Math.round((((ctc === '2' ? 2500 : 2250) * 0.14) / 1000) * 100) / 100;

        // Total
        o.totalWt = Math.round((o.totalWtBeam + o.totalWtPost + o.totalWtWasher + o.totalWtBhb) * 100) / 100;

        // Rate
        const zincDelta = o.zincCoating === 'Minimum 77 microns ( Delta over Crash Tested Rates )' ? 4 : (o.zincCoating === 'Average 77 microns over Crash Tested Rates' ? 2 : 0);
        const trans = o.transInOffer !== 'Ex-works' ? (parseFloat(o.transportation) || 0) : 0;
        const baseRate = this.dynamicBaseRates['W - Beam'] || 75.5;
        o.rateRm = o.totalWt * ((baseRate + zincDelta + (parseFloat(o.margin) || 0)) + trans);
        
        o.unitPrice = Math.ceil(o.rateRm / 5) * 5;
        o.unitCost = o.unitPrice - (o.unitPrice * (parseFloat(o.margin) || 0) / 100);
        o.listPrice = Math.ceil(((baseRate + 2 + zincDelta) * o.totalWt) / 5) * 5;
    }

    calcT() {
        const o = this.t;
        const ctc = String(o.centreTocentre);
        
        // Beam
        o.blkWtBeam = Math.round((4.318 * (parseFloat(o.beamThickness) || 0) / 1000 * 0.725 * 7850) * 100) / 100;
        o.znConsBeam = this._zincConsumption(o.zincCoating);
        o.finishWtBeam = Math.round((((4.318 * 0.725 * (o.znConsBeam / 1000)) * 2) + o.blkWtBeam) * 100) / 100;
        o.totalWtBeam = Math.round(((o.finishWtBeam * 250) / 1000) * 100) / 100;

        // Post
        const pt = parseFloat(o.postThickness) || 0;
        const ph = parseFloat(o.postHeight) || 0;
        o.blkWtPost = Math.round((ctc === '2' ? ((((pt / 1000) * (ph / 1000) * 0.274) * 7850) + 0.2) : ctc === '2.66' ? ((((pt / 1000) * (ph / 1000) * 0.274) * 7850) + 0.8) : 0) * 100) / 100;
        o.znConsPost = o.znConsBeam;
        o.finishWtPost = Math.round(((((ph / 1000) * 0.274 * (o.znConsPost / 1000)) * 2) + o.blkWtPost) * 100) / 100;
        o.totalWtPost = Math.round(((o.finishWtPost * (ctc === '2.66' ? 375 : 500)) / 1000) * 100) / 100;

        // Washer
        o.blkWtWasher = Math.round((((4.9 / 1000) * (115 / 1000) * (40 / 1000)) * 7850) * 100) / 100;
        o.znConsWasher = o.znConsBeam;
        o.finishWtWasher = Math.round((((0.115 * 0.040 * (o.znConsWasher / 1000)) * 2) + o.blkWtWasher) * 100) / 100;
        o.totalWtWasher = Math.round(((o.finishWtWasher * (ctc === '2.66' ? 700 : 500)) / 1000) * 100) / 100;

        // BHB
        o.totalWtBhb = Math.round((((ctc === '2.66' ? 3700 : 4000) * 0.14) / 1000) * 100) / 100;

        // Total
        o.totalWt = Math.round((o.totalWtBeam + o.totalWtPost + o.totalWtWasher + o.totalWtBhb) * 100) / 100;

        // Rate
        const zincDelta = o.zincCoating === 'Minimum 77 microns ( Delta over Crash Tested Rates )' ? 4 : (o.zincCoating === 'Average 77 microns over Crash Tested Rates' ? 2 : 0);
        const trans = o.transInOffer !== 'Ex-works' ? (parseFloat(o.transportation) || 0) : 0;
        const baseRate = this.dynamicBaseRates['Thrie Beam'] || 75.5;
        o.rateRm = o.totalWt * ((baseRate + zincDelta + (parseFloat(o.margin) || 0)) + trans);
        
        o.unitPrice = Math.ceil(o.rateRm / 5) * 5;
        o.unitCost = o.unitPrice - (o.unitPrice * (parseFloat(o.margin) || 0) / 100);
        o.listPrice = Math.ceil(((baseRate + 2 + zincDelta) * o.totalWt) / 5) * 5;
    }

    // ══════════════════════════════════════════════════════════
    // SAVE / CLOSE
    // ══════════════════════════════════════════════════════════
    handleClose() { this.dispatchEvent(new CustomEvent('close')); }

    handleSave() {
        const sections = [];
        if (this.isWBeam)    sections.push({ type: 'W - Beam',   ...this.w });
        if (this.isThrieBeam) sections.push({ type: 'Thrie Beam', ...this.t });

        this.dispatchEvent(new CustomEvent('save', {
            detail: { designType: this.designType, sections }
        }));
    }
}