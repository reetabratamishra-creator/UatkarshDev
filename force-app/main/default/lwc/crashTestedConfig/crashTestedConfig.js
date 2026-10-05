import { LightningElement, track, api } from 'lwc';
import getRateCardJson from '@salesforce/apex/CreateQuoteController.getRateCardJson';

export default class CrashTestedConfig extends LightningElement {

    // ── Top-level selections ──
    @track crashType = '';          // 'W-Beam' or 'Thrie-Beam'
    @track addNatrax = false;
    @track addAlka = false;
    @track addTranspolis = false;   // W-Beam only

    // ── Interest-free days (from parent TC fields) ──
    @api interestFreeDays = 0;

    @track dynamicPicklists = {};
    @track dynamicBaseRates = {};

    connectedCallback() {
        getRateCardJson({ departmentName: 'Crash Barrier Crash Tested' })
            .then(result => {
                if (result) {
                    try {
                        let config = typeof result === 'string' ? JSON.parse(result) : result;
                        this.dynamicPicklists = config.PICKLIST_OPTIONS || {};
                        this.dynamicBaseRates = config.BASE_RATES || {};
                    } catch (e) {
                        console.error('Error parsing config for Crash Tested:', e);
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching Crash Tested config:', error);
            });
    }

    // ── Shared option lists ──
    get crashTypeOptions() {
        return this.makeOptions(this.dynamicPicklists.crashTypeOptions || ['W-Beam', 'Thrie-Beam']);
    }

    get transOptions() {
        return this.makeOptions(this.dynamicPicklists.transOptions || ['Ex-works', 'F.O.R (Freight on Road)']);
    }

    get nutsBoltsOptions() {
        return this.makeOptions(this.dynamicPicklists.nutsBoltsOptions || ['Gr 4.6/4.8', 'Gr 8.8']);
    }

    get zincOptions() {
        return this.makeOptions(this.dynamicPicklists.zincOptions || ['Regular', 'Average 77 micron', 'Minimum 77 micron']);
    }

    get isWBeam() { return this.crashType === 'W-Beam'; }
    get isThrieBeam() { return this.crashType === 'Thrie-Beam'; }

    get showNatrax() { return this.addNatrax && !!this.crashType; }
    get showAlka() { return this.addAlka && !!this.crashType; }
    get showTranspolis() { return this.addTranspolis && this.isWBeam; }

    // ══════════════════════════════════════════════════════════
    // W-BEAM NATRAX
    // ══════════════════════════════════════════════════════════
    @track wn = {
        beamThickness: '3', postThickness: '5', spacerThickness: '5',
        postHeight: 1800, spacerLength: 360,
        nutsBolts: 'Gr 4.6/4.8', zincCoating: 'Average 77 micron',
        quantityRm: 0, transInOffer: 'Ex-works', margin: 4,
        Transportation: 0, fvf: 0,
        // Calculated
        znConsumption: 0, blkWtPost: 0, finishWtPost: 0, totalWtPost: 0,
        blkWtSpacer: 0, finishWtSpacer: 0, totalWtSpacer: 0,
        blkWtBeam: 0, finishWtBeam: 0, totalWtBeam: 0,
        totalWt: 0, zincDelta: 0, nbDelta: 0,
        rateRm: 0, unitPrice: 0, unitCost: 0, listPrice: 0
    };

    get wnBeamOptions() { return this.makeOptions(['2.8','2.9','3']); }
    get wnPostOptions() { return this.makeOptions(['4.8','4.9','5']); }
    get wnSpacerOptions() { return this.makeOptions(['4.8','4.9','5']); }
    get wnIsExWorks() { return this.wn.transInOffer === 'Ex-works'; }

    // ══════════════════════════════════════════════════════════
    // W-BEAM ALKA
    // ══════════════════════════════════════════════════════════
    @track wa = {
        beamThickness: '2.2', postHeight: 1500, centreTocentre: '2.0',
        postThickness: '3.8', nutsBolts: 'Gr 4.6/4.8', zincCoating: 'Average 77 micron',
        quantityRm: 0, transInOffer: 'Ex-works', margin: 4,
        Transportation: 0, fvf: 0,
        // Calculated
        znConsumption: 0, blkWtBeam: 0, finishWtBeam: 0, totalWtBeam: 0,
        blkWtPost: 0, finishWtPost: 0, totalWtPost: 0,
        blkWtWasher: 0, finishWtWasher: 0, totalWtWasher: 0,
        totalWtBhb: 0, totalWt: 0, zincDelta: 0, nbDelta: 0,
        rateRm: 0, unitPrice: 0, unitCost: 0, listPrice: 0
    };

    get waBeamOptions() { return this.makeOptions(['2.2','2.3','2.8']); }
    get waCtcOptions() { return this.makeOptions(['2.0','4.0']); }
    get waIsExWorks() { return this.wa.transInOffer === 'Ex-works'; }
    get waPostThicknessOptions() {
        return this.wa.centreTocentre === '4.0'
            ? this.makeOptions(['4.7','4.8','4.9','5.0'])
            : this.makeOptions(['3.8','3.9','4.0']);
    }

    // ══════════════════════════════════════════════════════════
    // W-BEAM TRANSPOLIS
    // ══════════════════════════════════════════════════════════
    @track wt = {
        beamThickness: '2.2', postHeight: 1400, postThickness: '3.6',
        nutsBolts: 'Gr 4.6/4.8', zincCoating: 'Average 77 micron',
        quantityRm: 0, transInOffer: 'Ex-works', margin: 4,
        Transportation: 0, fvf: 0,
        // Calculated
        znConsumption: 0, blkWtPost: 0, finishWtPost: 0, totalWtPost: 0,
        blkWtBeam: 0, finishWtBeam: 0, totalWtBeam: 0,
        finishWtReinf: 0, totalWtReinf: 0,
        totalWt: 0, zincDelta: 0, nbDelta: 0,
        rateRm: 0, unitPrice: 0, unitCost: 0, listPrice: 0
    };

    get wtBeamOptions() { return this.makeOptions(['2.2','2.3','2.5']); }
    get wtPostOptions() { return this.makeOptions(['3.6','3.8','3.9','4.0']); }
    get wtIsExWorks() { return this.wt.transInOffer === 'Ex-works'; }

    // ══════════════════════════════════════════════════════════
    // THRIE-BEAM NATRAX
    // ══════════════════════════════════════════════════════════
    @track tn = {
        beamThickness: '3', postThickness: '5', spacerThickness: '5',
        postHeight: 2100, spacerLength: 550,
        nutsBolts: 'Gr 4.6/4.8', zincCoating: 'Average 77 micron',
        quantityRm: 0, transInOffer: 'Ex-works', margin: 4,
        Transportation: 0, fvf: 0,
        // Calculated
        znConsumption: 0, blkWtPost: 0, finishWtPost: 0, totalWtPost: 0,
        blkWtSpacer: 0, finishWtSpacer: 0, totalWtSpacer: 0,
        blkWtBeam: 0, finishWtBeam: 0, totalWtBeam: 0,
        totalWt: 0, zincDelta: 0, nbDelta: 0,
        rateRm: 0, unitPrice: 0, unitCost: 0, listPrice: 0
    };

    get tnBeamOptions() { return this.makeOptions(['2.8','2.9','3']); }
    get tnPostOptions() { return this.makeOptions(['4.8','4.9','5']); }
    get tnSpacerOptions() { return this.makeOptions(['4.8','4.9','5']); }
    get tnIsExWorks() { return this.tn.transInOffer === 'Ex-works'; }

    // ══════════════════════════════════════════════════════════
    // THRIE-BEAM ALKA
    // ══════════════════════════════════════════════════════════
    @track ta = {
        beamThickness: '2.2', postHeight: 1500, centreTocentre: '2.0',
        postThickness: '3.6', nutsBolts: 'Gr 4.6/4.8', zincCoating: 'Average 77 micron',
        quantityRm: 0, transInOffer: 'Ex-works', margin: 4,
        Transportation: 0, fvf: 0,
        // Calculated
        znConsumption: 0, blkWtBeam: 0, finishWtBeam: 0, totalWtBeam: 0,
        blkWtPost: 0, finishWtPost: 0, totalWtPost: 0,
        blkWtWasher: 0, finishWtWasher: 0, totalWtWasher: 0,
        totalWtBhb: 0, totalWt: 0, zincDelta: 0, nbDelta: 0,
        rateRm: 0, unitPrice: 0, unitCost: 0, listPrice: 0
    };

    get taBeamOptions() { return this.makeOptions(['2.2','2.3','2.5']); }
    get taCtcOptions() { return this.makeOptions(['2.0','2.66']); }
    get taIsExWorks() { return this.ta.transInOffer === 'Ex-works'; }
    get taPostThicknessOptions() {
        return this.makeOptions(['3.6','3.8','3.9','4.0']);
    }

    // ──────────────────────────────────────────────────────────
    makeOptions(arr) {
        return arr ? arr.map(v => ({ label: v, value: v })) : [];
    }

    // ══════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ══════════════════════════════════════════════════════════
    handleCrashTypeChange(e) { this.crashType = e.detail.value; }
    handleNatraxChange(e) { this.addNatrax = e.target.checked; }
    handleAlkaChange(e) { this.addAlka = e.target.checked; }
    handleTranspolisChange(e) { this.addTranspolis = e.target.checked; }

    handleWnChange(e) { this._applyChange(this.wn, e); this.calcWn(); this.wn = { ...this.wn }; }
    handleWaChange(e) { this._applyChange(this.wa, e); this.calcWa(); this.wa = { ...this.wa }; }
    handleWtChange(e) { this._applyChange(this.wt, e); this.calcWt(); this.wt = { ...this.wt }; }
    handleTnChange(e) { this._applyChange(this.tn, e); this.calcTn(); this.tn = { ...this.tn }; }
    handleTaChange(e) { this._applyChange(this.ta, e); this.calcTa(); this.ta = { ...this.ta }; }

    _applyChange(obj, e) {
        const field = e.target.dataset.field;
        let val = e.target.value;
        if (e.target.type === 'number' || e.target.type === 'text' && !isNaN(parseFloat(val)) && e.target.dataset.numeric === 'true') {
            val = parseFloat(val) || 0;
        }
        obj[field] = val;
    }

    // ══════════════════════════════════════════════════════════
    // CALCULATIONS
    // ══════════════════════════════════════════════════════════
    _zincConsumption(coating) {
        return (coating === 'Regular' ? 40 : coating === 'Average 77 micron' ? 65 : coating === 'Minimum 77 micron' ? 77 : 0) * 7.1577574967405;
    }
    _zincDelta(coating) { return coating === 'Average 77 micron' ? 0 : coating === 'Minimum 77 micron' ? 2 : 0; }
    _nbDelta(nb) { return nb === 'Gr 4.6/4.8' ? 0 : 1; }
    _unitPrice(rateRm, baseRate, margin, zincD, nbD, ifd) {
        if (rateRm <= 0) return 0;
        const days = parseFloat(typeof ifd !== 'undefined' ? ifd : this.interestFreeDays) || 0;
        return Math.ceil((rateRm + (rateRm * 0.12 * (days / 365))) / 5) * 5;
    }
    _unitCost(unitPrice, margin) { return (unitPrice || 0) - ((unitPrice || 0) * (margin || 0) / 100); }
    _listPrice(baseRate, zincD, nbD, weight) { return Math.ceil(((baseRate + zincD + nbD + 4) * weight) / 5) * 5; }

    calcWn() {
        const o = this.wn;
        const zn = this._zincConsumption(o.zincCoating);
        const bt = parseFloat(o.beamThickness) || 0, pt = parseFloat(o.postThickness) || 0;
        const ph = parseFloat(o.postHeight) || 0, sl = parseFloat(o.spacerLength) || 0;
        const st = parseFloat(o.spacerThickness) || 0;

        o.znConsumption = zn;
        o.blkWtPost = (pt / 1000) * (ph / 1000) * 0.28 * 7850;
        o.finishWtPost = (((ph / 1000) * 0.28 * (zn / 1000)) * 2) + o.blkWtPost;
        o.totalWtPost = (o.finishWtPost * 500) / 1000;

        o.blkWtSpacer = (sl / 1000) * (st / 1000) * 0.28 * 7850;
        o.finishWtSpacer = (((sl / 1000) * 0.28 * (zn / 1000)) * 2) + o.blkWtSpacer;
        o.totalWtSpacer = (o.finishWtSpacer * 500) / 1000;

        o.blkWtBeam = 4.318 * 0.465 * (bt / 1000) * 7850;
        o.finishWtBeam = (4.318 * 0.465 * (zn / 1000) * 2) + o.blkWtBeam;
        o.totalWtBeam = (o.finishWtBeam * 250) / 1000;

        o.totalWt = o.totalWtBeam + o.totalWtSpacer + o.totalWtPost + 0.49;
        o.zincDelta = this._zincDelta(o.zincCoating);
        o.nbDelta = this._nbDelta(o.nutsBolts);

        const baseRate = this.dynamicBaseRates['W-Beam - Natrax'] || 84;
        o.rateRm = (baseRate + o.zincDelta + o.nbDelta + (o.transInOffer !== 'Ex-works' ? (parseFloat(o.Transportation) || 0) : 0)) * o.totalWt;
        o.unitPrice = this._unitPrice(o.rateRm, baseRate, o.margin, o.zincDelta, o.nbDelta, this.interestFreeDays);
        o.unitCost = this._unitCost(o.unitPrice, o.margin);
        o.listPrice = this._listPrice(baseRate, o.zincDelta, o.nbDelta, o.totalWt);
    }

    calcWa() {
        const o = this.wa;
        const zn = this._zincConsumption(o.zincCoating);
        const bt = parseFloat(o.beamThickness) || 0, pt = parseFloat(o.postThickness) || 0;
        const ph = parseFloat(o.postHeight) || 0;
        const ctc = o.centreTocentre;
        const ctcNum = parseFloat(ctc) || 2;

        o.znConsumption = zn;
        o.blkWtBeam = (bt / 1000) * 4.318 * 0.465 * 7850;
        o.finishWtBeam = (4.318 * 0.465 * (zn / 1000) * 2) + o.blkWtBeam;
        o.totalWtBeam = (o.finishWtBeam * 250) / 1000;

        if (pt > 0 && ph > 0) {
            o.blkWtPost = (ctcNum === 2 || ctc === '2.0')
                ? ((pt / 1000) * (ph / 1000) * 0.274 * 7850) + 0.2
                : ((pt / 1000) * (ph / 1000) * 0.274 * 7850) + 0.4;
        } else { o.blkWtPost = 0; }
        o.finishWtPost = (((ph / 1000) * 0.274 * (zn / 1000)) * 2) + o.blkWtPost;
        const postMult = (ctc === '2.0' || ctcNum === 2) ? 500 : (ctc === '4.0' || ctcNum === 4) ? 250 : 0;
        o.totalWtPost = (o.finishWtPost * postMult) / 1000;

        o.blkWtWasher = 0.176939;
        o.finishWtWasher = (0.115 * 0.040 * (zn / 1000) * 2) + o.blkWtWasher;
        o.totalWtWasher = (o.finishWtWasher * postMult) / 1000;

        const bhbMult = (ctc === '2.0' || ctcNum === 2) ? 2500 : (ctc === '4.0' || ctcNum === 4) ? 2250 : 0;
        o.totalWtBhb = (0.14 * bhbMult) / 1000;

        o.totalWt = Math.round(((o.totalWtBhb + o.totalWtWasher + o.totalWtPost + o.totalWtBeam)) * 100) / 100;
        o.zincDelta = this._zincDelta(o.zincCoating);
        o.nbDelta = this._nbDelta(o.nutsBolts);

        const baseRate = this.dynamicBaseRates['W-Beam - Alka'] || 85;
        o.rateRm = (baseRate + o.zincDelta + o.nbDelta + (o.transInOffer !== 'Ex-works' ? (parseFloat(o.Transportation) || 0) : 0)) * o.totalWt;
        o.unitPrice = this._unitPrice(o.rateRm, baseRate, o.margin, o.zincDelta, o.nbDelta, this.interestFreeDays);
        o.unitCost = this._unitCost(o.unitPrice, o.margin);
        o.listPrice = this._listPrice(baseRate, o.zincDelta, o.nbDelta, o.totalWt);
    }

    calcWt() {
        const o = this.wt;
        const zn = this._zincConsumption(o.zincCoating);
        const bt = parseFloat(o.beamThickness) || 0, ph = parseFloat(o.postHeight) || 0;

        o.znConsumption = zn;
        o.blkWtPost = ph > 0 ? ((0.004 * (ph / 1000) * 0.265 * 7850) + 0.4) : 0;
        o.finishWtPost = (((ph / 1000) * 0.265 * (zn / 1000)) * 2) + o.blkWtPost;
        o.totalWtPost = (o.finishWtPost * 500) / 1000;

        o.blkWtBeam = 4.318 * 0.465 * (bt / 1000) * 7850;
        o.finishWtBeam = (4.318 * 0.465 * (zn / 1000) * 2) + o.blkWtBeam;
        o.totalWtBeam = (o.finishWtBeam * 250) / 1000;

        o.finishWtReinf = (0.3 * 0.176 * (zn / 1000) * 2) + 1.65792;
        o.totalWtReinf = (o.finishWtReinf * 500) / 1000;

        o.totalWt = o.totalWtBeam + o.totalWtPost + o.totalWtReinf + 0.35;
        o.zincDelta = this._zincDelta(o.zincCoating);
        o.nbDelta = this._nbDelta(o.nutsBolts);

        const baseRate = this.dynamicBaseRates['W-Beam - Transpolis'] || 84;
        o.rateRm = (baseRate + o.zincDelta + o.nbDelta + (o.transInOffer !== 'Ex-works' ? (parseFloat(o.Transportation) || 0) : 0)) * o.totalWt;
        o.unitPrice = this._unitPrice(o.rateRm, baseRate, o.margin, o.zincDelta, o.nbDelta, this.interestFreeDays);
        o.unitCost = this._unitCost(o.unitPrice, o.margin);
        o.listPrice = this._listPrice(baseRate, o.zincDelta, o.nbDelta, o.totalWt);
    }

    calcTn() {
        const o = this.tn;
        const zn = this._zincConsumption(o.zincCoating);
        const bt = parseFloat(o.beamThickness) || 0, pt = parseFloat(o.postThickness) || 0;
        const ph = parseFloat(o.postHeight) || 0, sl = parseFloat(o.spacerLength) || 0;
        const st = parseFloat(o.spacerThickness) || 0;

        o.znConsumption = zn;
        o.blkWtPost = (pt / 1000) * (ph / 1000) * 0.28 * 7850;
        o.finishWtPost = (((ph / 1000) * 0.28 * (zn / 1000)) * 2) + o.blkWtPost;
        o.totalWtPost = (o.finishWtPost * 500) / 1000;

        o.blkWtSpacer = (st / 1000) * (sl / 1000) * 0.28 * 7850;
        o.finishWtSpacer = (((sl / 1000) * 0.28 * (zn / 1000)) * 2) + o.blkWtSpacer;
        o.totalWtSpacer = (o.finishWtSpacer * 500) / 1000;

        // Thrie-Beam uses 0.725 width multiplier
        o.blkWtBeam = 4.318 * 0.725 * (bt / 1000) * 7850;
        o.finishWtBeam = (4.318 * 0.725 * (zn / 1000) * 2) + o.blkWtBeam;
        o.totalWtBeam = (o.finishWtBeam * 250) / 1000;

        o.totalWt = o.totalWtBeam + o.totalWtSpacer + o.totalWtPost + 0.70;
        o.zincDelta = this._zincDelta(o.zincCoating);
        o.nbDelta = this._nbDelta(o.nutsBolts);

        const baseRate = this.dynamicBaseRates['Thrie-Beam - Natrax'] || 84;
        o.rateRm = (baseRate + o.zincDelta + o.nbDelta + (o.transInOffer !== 'Ex-works' ? (parseFloat(o.Transportation) || 0) : 0)) * o.totalWt;
        o.unitPrice = this._unitPrice(o.rateRm, baseRate, o.margin, o.zincDelta, o.nbDelta, this.interestFreeDays);
        o.unitCost = this._unitCost(o.unitPrice, o.margin);
        o.listPrice = this._listPrice(baseRate, o.zincDelta, o.nbDelta, o.totalWt);
    }

    calcTa() {
        const o = this.ta;
        const zn = this._zincConsumption(o.zincCoating);
        const bt = parseFloat(o.beamThickness) || 0, pt = parseFloat(o.postThickness) || 0;
        const ph = parseFloat(o.postHeight) || 0;
        const ctc = o.centreTocentre;
        const ctcNum = parseFloat(ctc) || 2;

        o.znConsumption = zn;
        // Thrie-Beam uses 0.725 width multiplier for beam
        o.blkWtBeam = 4.318 * 0.725 * (bt / 1000) * 7850;
        o.finishWtBeam = (4.318 * 0.725 * (zn / 1000) * 2) + o.blkWtBeam;
        o.totalWtBeam = (o.finishWtBeam * 250) / 1000;

        if (pt > 0 && ph > 0) {
            o.blkWtPost = (ctcNum === 2 || ctc === '2.0')
                ? ((pt / 1000) * (ph / 1000) * 0.274 * 7850) + 0.2
                : ((pt / 1000) * (ph / 1000) * 0.274 * 7850) + 0.4;
        } else { o.blkWtPost = 0; }
        o.finishWtPost = (((ph / 1000) * 0.274 * (zn / 1000)) * 2) + o.blkWtPost;
        const postMult = (ctc === '2.0' || ctcNum === 2) ? 500 : (ctc === '2.66' || ctcNum === 2.66) ? 375 : 0;
        o.totalWtPost = (o.finishWtPost * postMult) / 1000;

        o.blkWtWasher = 0.176939;
        o.finishWtWasher = (0.115 * 0.040 * (zn / 1000) * 2) + o.blkWtWasher;
        const washerMult = (ctc === '2.0' || ctcNum === 2) ? 500 : (ctc === '2.66') ? 375 : 0;
        o.totalWtWasher = (o.finishWtWasher * washerMult) / 1000;

        const bhbMult = (ctc === '2.0' || ctcNum === 2) ? 4000 : (ctc === '2.66') ? 3700 : 0;
        o.totalWtBhb = (0.14 * bhbMult) / 1000;

        o.totalWt = Math.round(((o.totalWtBhb + o.totalWtWasher + o.totalWtPost + o.totalWtBeam)) * 100) / 100;
        o.zincDelta = this._zincDelta(o.zincCoating);
        o.nbDelta = this._nbDelta(o.nutsBolts);

        const baseRate = this.dynamicBaseRates['Thrie-Beam - Alka'] || 85;
        o.rateRm = (baseRate + o.zincDelta + o.nbDelta + (o.transInOffer !== 'Ex-works' ? (parseFloat(o.Transportation) || 0) : 0)) * o.totalWt;
        o.unitPrice = this._unitPrice(o.rateRm, baseRate, o.margin, o.zincDelta, o.nbDelta, this.interestFreeDays);
        o.unitCost = this._unitCost(o.unitPrice, o.margin);
        o.listPrice = this._listPrice(baseRate, o.zincDelta, o.nbDelta, o.totalWt);
    }

    // ══════════════════════════════════════════════════════════
    // SAVE / CLOSE
    // ══════════════════════════════════════════════════════════
    handleClose() { this.dispatchEvent(new CustomEvent('close')); }

    handleSave() {
        const sections = [];
        if (this.showNatrax && this.isWBeam)    sections.push({ agency: 'Natrax',    beamType: 'W-Beam',     ...this.wn });
        if (this.showAlka && this.isWBeam)      sections.push({ agency: 'Alka',      beamType: 'W-Beam',     ...this.wa });
        if (this.showTranspolis)                sections.push({ agency: 'Transpolis', beamType: 'W-Beam',     ...this.wt });
        if (this.showNatrax && this.isThrieBeam) sections.push({ agency: 'Natrax',   beamType: 'Thrie-Beam', ...this.tn });
        if (this.showAlka && this.isThrieBeam)   sections.push({ agency: 'Alka',     beamType: 'Thrie-Beam', ...this.ta });

        this.dispatchEvent(new CustomEvent('save', {
            detail: { crashType: this.crashType, sections }
        }));
    }
}