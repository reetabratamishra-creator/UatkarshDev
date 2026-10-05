/**
 * highMastImConfig - the HIGH MAST department (every mast type, CROSS PRODUCT) inside the
 * International Marketing quote (tab "High Mast"). Deepanjan (28th September 2026)
 *
 * WHAT IT IS. The High Mast part of the domestic createQuote, as a child of internationalQuote:
 *   - the department's EXISTING Accordion_Section / Section_Logic / Blueprint records, read
 *     as-is (Weight Estimator with Type of Mast and its sub-type pickers, KIT Code Details,
 *     Mid Hinge accessories, Project Set-up with Customer Address + Terms & Conditions);
 *   - every folder is a c-high-mast-im-estimator - the High Mast estimator engine
 *     (weightEstimatorModal's engine, hmEstimator's live UI) drawn inline instead of a
 *     modal, opened with the very config createQuote hands the modal (rule payload, blueprint,
 *     rate card, @@ address tags, saved values, pre-registered keys, KIT lines built from the
 *     mast rows) and answering with the very APPLY payload (values + line items);
 *   - the line-item pipeline of createQuote (_pendingLineItems per folder, per-pole / lump-sum
 *     transportation rules from the Project Set-up JSON, _Final_Apex_Lines);
 *   - the HIGH MAST CROSS PRODUCT of hmQuoteTest (27 Sep 2026): several products on one quote,
 *     one chip each, any mix of mast types, each product its own value bag, the quote-level
 *     keys (freight, transportation, address, T&C) shared, the saved JSON in the same plain /
 *     compact (_HM_V = 2) shape the domestic CP controllers decode.
 * Calculation, validation, line naming and the document data are the domestic ones. What is
 * International here: the rate card is read IM twin first ("IM - Lighting Mast") and frozen
 * with the quote, money on screen also reads in the quote currency, and the state, validation
 * and lines follow the internationalQuote child contract (getState / validate / getErrors /
 * focusFirstError / initialValues / lineschange / revealLine / revealType).
 * Nothing here touches createQuote, weightEstimatorModal, hmQuoteTest or the domestic Apex.
 */
import { LightningElement, api, track } from 'lwc';
import getProductConfiguration from '@salesforce/apex/InternationalQuoteController.getProductConfiguration';
import fetchBlueprintPayload from '@salesforce/apex/CreateQuoteController.fetchBlueprintPayload';
// IM twin first (Price_Calculator__mdt Department__c = 'IM - <name>'), domestic row as fallback
import getPricingRates from '@salesforce/apex/InternationalQuoteController.getImPricingRates';
// the domestic row of the same type: an IM twin saved from Rates > Base Rates carries only Base /
// Add On, while the High Mast formulas also read GST__c (and the flags below) - those come from here
import getDomesticPricingRates from '@salesforce/apex/CreateQuoteController.getPricingRates';
import getOpportunityAccountAddress from '@salesforce/apex/CreateQuoteController.getOpportunityAccountAddress';

/* ================= product-specific constants ================= */
const PRODUCT = { code: 'HMC', label: 'High Mast', sourceTemplate: 'High Mast - Department',
    // Document_Template_Mapping__mdt.IM_Product__c of the three High Mast offer pages. The
    // Transmission Pole tab uses the plain template name, so its rows never show up here.
    docProduct: 'High Mast - Cross Product' };
const DEPARTMENT = 'High Mast - Department';
const DEBOUNCE_MS = 120;
const INTERNAL_LINE_KEYS = ['_pendingLineItems', '_Final_Apex_Lines', '_Saved_Table_Rows'];
const HM_STATE_KEYS = ['_HM_Products', '_HM_Shared', '_HM_V', '_HM_T', '_HM_Lines'];
// Transmission Pole has its own IM tab (tpImConfig), so the High Mast tab does not offer it again:
// the option is dropped from the picklist (metadata untouched, the domestic screen still has it)
const IM_HIDDEN_OPTIONS = { mast_standard: ['Transmission Pole'] };
// Price_Calculator__mdt fields the estimators read besides Base / Add On (valMap + rule GST)
const PRICING_EXTRA = ['GST__c', 'tp_segment__c', 'fm_general_detail__c', 'man_riding_lift__c'];
// STADIUM MAST: NO. OF MAN RIDING LIFT max (the Customized Mast metadata: m2_mrl_ ... m10_mrl_)
const STADIUM_MAX_MRL = 10;

export default class HighMastImConfig extends LightningElement {
    @api productCode = PRODUCT.code;
    @api productLabel = PRODUCT.label;
    @api sourceTemplate = PRODUCT.sourceTemplate;
    @api docProduct = PRODUCT.docProduct;
    @api opportunityId;

    _currencyCode = '';
    @api get currencyCode() { return this._currencyCode; }
    set currencyCode(v) { this._currencyCode = v || ''; }
    _exchangeRate = 1;
    @api get exchangeRate() { return this._exchangeRate; }
    set exchangeRate(v) { this._exchangeRate = v; }
    _isReadOnly = false;
    @api get isReadOnly() { return this._isReadOnly; }
    set isReadOnly(v) { const n = !!v; if (n === this._isReadOnly) return; this._isReadOnly = n; if (this._ready) { this._resetFolders(); this.rebuild(false); } }
    _showCalc = false;
    @api get showCalc() { return this._showCalc; }
    set showCalc(v) { this._showCalc = !!v; }
    /** line names that made the approval fire */
    _highlightNames = [];
    @api get highlightNames() { return this._highlightNames; }
    set highlightNames(v) {
        const next = Array.isArray(v) ? v.slice() : [];
        if (JSON.stringify(next) === JSON.stringify(this._highlightNames)) return;
        this._highlightNames = next;
        if (this._ready) { this._resetFolders(); this.rebuild('noop'); }
    }
    _highlightMetrics = {};
    @api get highlightMetrics() { return this._highlightMetrics; }
    set highlightMetrics(v) {
        const next = v && typeof v === 'object' ? { ...v } : {};
        if (JSON.stringify(next) === JSON.stringify(this._highlightMetrics)) return;
        this._highlightMetrics = next;
        if (this._ready) { this._resetFolders(); this.rebuild('noop'); }
    }
    /** the plain save shape is kept up to this many characters; beyond it the compact (_HM_V = 2) shape is written */
    @api compactThreshold = 40000;   // the saved product JSON is packed (_HM_V=2, lossless) above this many characters - Quote_Value__c holds 131,072
    _initialValues = null;
    @api get initialValues() { return this._initialValues; }
    set initialValues(v) { this._initialValues = v; if (this._ready && v) { this._hydrate(v); this._resetFolders(); this.rebuild(true); } }

    // ------------------------------------------------------------ state
    @track accordions = [];
    isLoading = true;
    loadText = 'Loading product setup…';
    loadPct = 15;
    get loadBarStyle() { return 'width:' + (this.loadPct || 0) + '%;'; }
    loadError = '';
    crossNote = '';
    _rateSrc = { im: [], dom: [] };

    wrapperData = null;          // { sections, logicRules } of the High Mast template
    jsonLogicCache = {};         // "<accordionId>_<controllingValue>" -> payload string (createQuote's cache)
    _cachedAdjustmentRules = [];
    _cachedNewItemRules = [];
    _address = null;
    _blueprintCache = {};
    _ready = false;
    _timer = null;
    _open = {};
    _showErrors = false;
    _hostErrors = [];            // [{ apiName, field, where, message }] of the host-level fields
    _folderErrors = [];          // [{ apiName, field, where, message, folderKey }] from the estimators
    _productErrors = [];         // cross-product rules
    _lastLines = [];
    _lastPricing = null;         // the Price_Calculator record of the last folder opened (GST__c for rules)

    // the product on screen: its own keys + the quote-level keys + the internal _ keys
    bag = {};
    // [hm-cross] every product of the quote - see the note in hmQuoteTest.js
    hmProducts = null;           // [{ key, values, rates }]
    hmActive = 0;
    hmRemoveIdx = -1;
    _hmKeyCache = null;
    _hmSubPicks = null;
    _hmStoredCompact = false;

    // folder instances on screen: key -> { cfgSig, cfg, opened, promise }
    _folders = {};
    _folderCfgPromises = {};
    _rateSnap = {};              // dynamicProductName -> Price_Calculator record fields (frozen with the quote)

    // ------------------------------------------------------------ lifecycle
    async connectedCallback() {
        try {
            const cfg = await getProductConfiguration({ sourceTemplate: this.sourceTemplate });
            if (cfg && cfg.canCreate === false) { this.loadError = cfg.denialMessage || 'No permission.'; this.isLoading = false; return; }
            this.wrapperData = { sections: (cfg.sections || []).slice().sort((a, b) => (a.Sequence_No__c || 0) - (b.Sequence_No__c || 0)), logicRules: cfg.logicRules || [] };
            this.loadText = 'Reading section logic…'; this.loadPct = 40;
            // 1. Build the JSON Cache safely (createQuote._buildQuoteScreen, verbatim in spirit)
            this.jsonLogicCache = {};
            this._cachedAdjustmentRules = [];
            this._cachedNewItemRules = [];
            this.wrapperData.logicRules.forEach((rule) => {
                const ctrlVal = rule.Controlling_Value__c || '';
                this.jsonLogicCache[`${rule.Accordion_Section__c}_${ctrlVal}`] = rule.JSON_Payload__c;
                if (rule.JSON_Payload__c) {
                    try {
                        const parsed = JSON.parse(rule.JSON_Payload__c);
                        if (parsed._lineItemAdjustments) this._cachedAdjustmentRules.push(...parsed._lineItemAdjustments);
                        if (parsed._newLineItemGenerators) this._cachedNewItemRules.push(...parsed._newLineItemGenerators);
                    } catch (e) { /* not a folder payload */ }
                }
            });
            this.loadText = 'Loading address…'; this.loadPct = 60;
            await this.loadAddress();
            this.loadText = 'Preparing products…'; this.loadPct = 85;
            this._hydrate(this._initialValues);
            this._ready = true;
            this.rebuild(true);
        } catch (e) {
            this.loadError = errMsg(e);
        } finally {
            this.isLoading = false;
        }
    }

    async loadAddress() {
        if (!this.opportunityId) { this._address = {}; return; }
        try { this._address = (await getOpportunityAccountAddress({ opportunityId: this.opportunityId })) || {}; }
        catch (e) { this._address = {}; }
    }

    /** Header note - which rate cards the folders on screen are pricing from. */
    get rateSourceNote() {
        if (!this._ready) return '';
        const im = this._rateSrc.im, dom = this._rateSrc.dom;
        if (!im.length && !dom.length) return '';
        if (!im.length) return 'Rate card: DOMESTIC - no International base rates saved for ' + dom.join(', ') + ' yet (Rates > Base Rates).';
        if (!dom.length) return 'Rate card: INTERNATIONAL (' + im.join(', ') + ').';
        return 'Rate card: INTERNATIONAL for ' + im.join(', ') + '; DOMESTIC fallback for ' + dom.join(', ') + '.';
    }
    get rateSourceCls() { return 'im-note' + (this._rateSrc.im.length ? ' im-note_ok' : ' im-note_warn'); }
    _noteRateSource(rec) {
        const d = rec && rec.Department__c ? String(rec.Department__c) : '';
        if (!d) return;
        const isIm = d.indexOf('IM - ') === 0;
        const name = isIm ? d.substring(5) : d;
        const list = isIm ? this._rateSrc.im : this._rateSrc.dom;
        if (list.indexOf(name) === -1) list.push(name);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // THE SCREEN - accordions, inline fields, folders (createQuote's accordion for
    // the High Mast template, rendered the International way)
    // ═════════════════════════════════════════════════════════════════════════
    /** the Section_Logic rule of an accordion for the root value on screen (createQuote's cache lookup) */
    _ruleFor(sec, rootValue) {
        const exact = rootValue !== '' && rootValue !== null && rootValue !== undefined ? this.jsonLogicCache[`${sec.Id}_${rootValue}`] : null;
        const str = exact || (sec.First_Field_API_Name__c
            ? (rootValue ? this.jsonLogicCache[`${sec.Id}_*`] : null)
            : (this.jsonLogicCache[`${sec.Id}_default`] || this.jsonLogicCache[`${sec.Id}_*`] || this.jsonLogicCache[`${sec.Id}_`]));
        if (!str) return null;
        const key = `${sec.Id}|${str.length}|${str.slice(0, 40)}`;
        if (!this._parsedRules) this._parsedRules = {};
        if (!this._parsedRules[key]) { try { this._parsedRules[key] = JSON.parse(str); } catch (e) { this._parsedRules[key] = null; } }
        return this._parsedRules[key];
    }

    /** createQuote's parent-field visibility rule (comma = OR unless controllingOperator AND, "!api", ">=N", '*') */
    _fieldVisible(f) {
        if (!f.controllingField) return true;
        const parents = String(f.controllingField).split(',').map((s) => s.trim()).filter(Boolean);
        const op = String(f.controllingOperator || 'OR').toUpperCase();
        let vis = false, matches = 0;
        for (const raw of parents) {
            const neg = raw.startsWith('!');
            const api = neg ? raw.substring(1) : raw;
            const val = this.bag[api];
            const has = val === true || (val !== '' && val !== null && val !== undefined && val !== false);
            const rawVal = (val === null || val === undefined) ? '' : String(val);
            if (neg && !has) { matches++; if (op === 'OR') { vis = true; break; } }
            else if (!neg && has) {
                const cvs = (f.controllingValues || ['*']).map((v) => String(v).toLowerCase());
                const num = cvs.some((cv) => cv.startsWith('>=') && !isNaN(Number(rawVal)) && Number(rawVal) >= Number(cv.substring(2)));
                if (cvs.includes('*') || num || cvs.includes(rawVal.toLowerCase())) { matches++; if (op === 'OR') { vis = true; break; } }
            }
        }
        if (op === 'AND') vis = matches === parents.length && parents.length > 0;
        return vis;
    }
    /** accordion visibility: Controlling_Field__c (comma) / Controlling_Value__c (comma), OR */
    _accVisible(sec) {
        if (!sec.Controlling_Field__c) return true;
        const parents = String(sec.Controlling_Field__c).split(',').map((s) => s.trim()).filter(Boolean);
        const wanted = sec.Controlling_Value__c ? String(sec.Controlling_Value__c).split(',').map((s) => s.trim().toLowerCase()) : ['*'];
        return parents.some((api) => {
            const v = this.bag[api];
            if (v === '' || v === null || v === undefined || v === false) return false;
            return wanted.includes('*') || wanted.includes(String(v).toLowerCase());
        });
    }

    /** the accordion tree for the product on screen */
    rebuild(emit = false) {
        if (!this._ready) return;
        const secs = this.wrapperData.sections;
        const acc = secs.map((sec, ai) => {
            // numbered as the domestic accordion is: by the record's Sequence_No__c
            const seqRaw = Number(sec.Sequence_No__c);
            const no = isFinite(seqRaw) && seqRaw > 0 ? String(Number.isInteger(seqRaw) ? seqRaw : seqRaw) : String(ai + 1);
            const visible = this._accVisible(sec);
            const inline = [];
            const folders = [];
            let root = null;
            let rule = null;
            let sub = 1;
            if (sec.First_Field_API_Name__c) {
                const rootVal = this.bag[sec.First_Field_API_Name__c];
                const opts = sec.First_Field_Options__c ? String(sec.First_Field_Options__c).split(';').map((o) => o.trim()).filter(Boolean) : [];
                root = this._renderField({ apiName: sec.First_Field_API_Name__c, label: sec.First_Field_Label__c, type: 'picklist', options: opts, required: !!sec.First_Field_Required__c }, sec, true);
                root.no = no + '.1'; root.cls = 'im-cell im-span6 im-root'; root.isRoot = true;
                rule = this._ruleFor(sec, isBlank(rootVal) ? '' : String(rootVal));
            } else {
                rule = this._ruleFor(sec, '');
                sub = 0;
            }
            const fields = rule && Array.isArray(rule.fields) ? rule.fields : [];
            fields.forEach((f, idx) => {
                if (!f || !f.apiName) return;
                if (f.type === 'folder') {
                    if (!this._fieldVisible(f)) return;
                    sub += 1;
                    const cv = f.controllingField ? this.bag[f.controllingField] : null;
                    const label = (f.labelFormat && !isBlank(cv)) ? String(f.labelFormat).replace('{value}', String(cv)) : (f.label || f.apiName);
                    const key = sec.Id + ':' + f.apiName;
                    const st = this._folders[key];
                    const trig = st && st.cfg && st.cfg._imHasTrigger;
                    folders.push({ key, secId: sec.Id, apiName: f.apiName, no: no + '.' + sub, label, visible: true, def: f,
                        folderCls: 'im-folder' + (trig ? ' im-folder_trigger' : ''), isTrigger: !!trig,
                        expanded: this.isOpen(key, true), chev: chev(this.isOpen(key, true)),
                        bodyCls: 'im-folder-body' + (this.isOpen(key, true) ? '' : ' im-folder-body_hidden'),
                        status: st ? (st.error ? 'error' : (st.opened ? 'ok' : 'loading')) : 'loading',
                        statusText: st && st.error ? st.error : '', hint: st && st.hint ? st.hint : '' });
                    return;
                }
                if (!this._fieldVisible(f)) return;
                const r = this._renderField(f, sec, false);
                if (!r) return;
                sub += 1; r.no = no + '.' + sub;
                inline.push(r);
            });
            const aExp = this.isOpen(sec.Id, true);
            return { key: sec.Id, no, label: sec.MasterLabel, visible, expanded: aExp, chev: chev(aExp), root, inline: root ? [root].concat(inline) : inline, folders };
        });
        this.accordions = acc;
        this._syncFolders(acc);
        this._hmCross();
        if (emit === 'noop') return;
        if (emit) this._emitLines();
    }

    _renderField(f, sec, isRoot) {
        const t = String(f.type || '').toLowerCase();
        if (t === 'header') return { key: f.apiName, apiName: f.apiName, label: f.label || '', isHeader: true, isSectionHeader: true, cls: 'im-cell im-span12', spanStyle: '--sp:12;' };
        const val = this.bag[f.apiName];
        const ro = this._isReadOnly || f.readOnly === true || f.readOnly === 'true';
        const req = f.required === true || f.required === 'true';
        let err = '';
        if (!ro) {
            if (f.min !== undefined && f.min !== null && !isBlank(val)) { const n = parseFloat(val); if (isNaN(n) || n < Number(f.min)) err = 'must be >= ' + f.min; }
            if (!err && req && this._showErrors && t !== 'checkbox' && isBlank(val)) err = 'This field is required';
        }
        const hide = IM_HIDDEN_OPTIONS[f.apiName] || [];
        const opts = (f.options || [])
            .filter((o) => hide.indexOf(String(o.value !== undefined ? o.value : o).trim()) === -1)
            .map((o) => ({ label: String(o.label !== undefined ? o.label : o), value: String(o.value !== undefined ? o.value : o), selected: String(o.value !== undefined ? o.value : o) === String(val) }));
        const span = isRoot ? 6 : Math.min(12, Math.max(1, Number(f.colSpan) || 6));
        return {
            key: f.apiName, apiName: f.apiName, label: f.label || '', hasLabel: !!(f.label && String(f.label).trim()), no: '',
            isHeader: false, isSectionHeader: false, isCellHeader: false, isSpacer: false,
            isPicklist: t === 'picklist' && !ro, isCheckbox: t === 'checkbox', isNumber: t === 'number' && !ro, isTextarea: t === 'textarea' && !ro,
            isText: !ro && (t === 'text' || !['picklist', 'checkbox', 'number', 'textarea'].includes(t)),
            options: opts, value: val === undefined || val === null ? '' : val, checked: truthy(val), readOnly: ro,
            isReadOnlyValue: ro && t !== 'checkbox', display: isBlank(val) ? '' : String(val),
            required: req, reqAttr: req ? 'true' : 'false', err, disabled: false, min: f.min, unit: f.unit || '',
            inputCls: 'im-input' + (err ? ' im-invalid' : ''), selectCls: 'im-select' + (err ? ' im-invalid' : ''),
            valueCls: 'im-value im-value_ref' + (err ? ' im-invalid' : ''),
            cls: 'im-cell im-span' + span, spanStyle: '--sp:' + span + ';', where: sec.MasterLabel
        };
    }

    isOpen(key, def) { return this._open[key] === undefined ? def : this._open[key]; }
    toggle(event) {
        const key = event.currentTarget.dataset.key;
        this._open[key] = !(event.currentTarget.dataset.open === 'true');
        this.rebuild(false);
    }

    handleInput(event) {
        if (this._isReadOnly) return;
        const api = event.target.dataset.api;
        if (!api) return;
        let v;
        const type = event.target.type;
        if (type === 'checkbox') v = event.target.checked;
        else v = event.target.value;
        if (typeof v === 'string' && v !== '' && type === 'number') v = Number(v);
        const before = this.bag[api];
        this.bag[api] = v;
        this._afterHostChange(api, before, v);
        clearTimeout(this._timer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._timer = setTimeout(() => { this._recomputeLines(); this.rebuild(true); this._pushBagToFolders(); }, DEBOUNCE_MS);
    }
    handleWheel(event) { if (event.target && typeof event.target.blur === 'function') event.target.blur(); }

    /**
     * A sub-type picker (Type of Mast - Standard / Customized / Pole / Segment Above 5) is
     * hidden the moment Type of Mast changes; its old value would still make the KIT
     * accordion (which reads all of them, OR) show for the wrong type. The hidden pickers
     * of the OTHER types are blanked, so the accordions on screen follow the type on
     * screen - the folders' own data is untouched (cross-product rule: nothing is wiped).
     */
    _afterHostChange(api, before, after) {
        const keys = this._hmKeys();
        if (api !== keys.rootApi || String(before) === String(after)) return;
        const secs = this.wrapperData.sections;
        secs.forEach((sec) => {
            if (sec.Id !== keys.rootSecId) return;
            this.wrapperData.logicRules.filter((r) => r.Accordion_Section__c === sec.Id && r.JSON_Payload__c).forEach((r) => {
                const cv = String(r.Controlling_Value__c || '');
                if (cv === String(after)) return;
                let p = null; try { p = JSON.parse(r.JSON_Payload__c); } catch (e) { p = null; }
                (p && p.fields ? p.fields : []).forEach((f) => {
                    if (f && f.type === 'picklist' && f.apiName && f.controllingField === keys.rootApi && !isBlank(this.bag[f.apiName])) this.bag[f.apiName] = '';
                });
            });
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // FOLDERS -> ESTIMATOR INSTANCES (createQuote.handleFolderClick, live)
    // ═════════════════════════════════════════════════════════════════════════
    _resetFolders() { this._folders = {}; this._folderCfgPromises = {}; this._folderLiveTitles = {}; }

    /** one estimator per visible folder; a folder whose config changed is reopened */
    _syncFolders(accordions) {
        const wanted = new Set();
        accordions.forEach((a) => { if (a.visible) a.folders.forEach((fo) => wanted.add(fo.key)); });
        // instances of folders no longer on screen are dropped: their values stay in the bag
        // (cross-product rule), their LINES leave the quote - a Lighting Mast folder that gave
        // way to a Signage Mast folder must not keep pricing rows nobody can see
        let dropped = false;
        Object.keys(this._folders).forEach((k) => {
            if (wanted.has(k)) return;
            const title = (this._folderLiveTitles || {})[k];
            const key = this._hmActiveKey();
            if (title && Array.isArray(this.bag._pendingLineItems)) {
                const before = this.bag._pendingLineItems.length;
                this.bag._pendingLineItems = this.bag._pendingLineItems.filter((li) => !(li && li._modalSource === title && (li._hmKey === undefined || li._hmKey === key)));
                if (this.bag._pendingLineItems.length !== before) dropped = true;
            }
            // the approval_* keys of a folder that left THIS product (type changed) leave with it,
            // unless a folder still on screen emits the same key (not on a product switch - the
            // bag is then the other product's)
            const gone = this._folders[k];
            if (gone && gone.hmKey === key) {
                (gone.apvKeys || []).forEach((ak) => {
                    const other = Object.keys(this._folders).find((fk) => fk !== k && wanted.has(fk) && this._folders[fk] && (this._folders[fk].apvVals || {})[ak] !== undefined);
                    if (other) this.bag[ak] = this._folders[other].apvVals[ak];
                    else delete this.bag[ak];
                });
            }
            delete this._folders[k];
        });
        if (dropped) { this._recomputeLines(); this._emitLines(); }
        accordions.forEach((a) => {
            if (!a.visible) return;
            a.folders.forEach((fo) => {
                const sig = this._folderSig(a, fo);
                const st = this._folders[fo.key];
                if (st && st.sig === sig) return;
                this._folders[fo.key] = { sig, cfg: null, opened: false, error: '', hint: '', hmKey: this._hmActiveKey() };
                this._prepareFolder(a, fo, sig);
            });
        });
    }

    /** what the config of a folder depends on: the controlling value, read-only, the KIT rows, the approval marks */
    _folderSig(a, fo) {
        const def = fo.def;
        const cv = def.controllingField ? this.bag[def.controllingField] : 'default';
        let extra = '';
        if (def.apiName === 'lm_kit_code_folder') {
            const sd = this.normalizeEstimatorPayload(this.bag);
            const h = sd.header || {};
            const mrl = Object.prototype.hasOwnProperty.call(this.bag, 'man_riding_lift') ? String(this.bag.man_riding_lift) : 'na';
            extra = '|kit:' + sd.lines.filter((l) => !isBlank(l.lm_height_of_mast)).map((l) => l._lineIndex).join(',') + '|mrl:' + mrl + '|' + (h.mrl_height_of_mast || '') + '/' + (h.mrl_no_of_segment || '')
                // STADIUM: which Man Riding Lifts have a KIT line (their figures follow live - _syncStadiumKitRows)
                + '|st:' + (this._isStadium() ? '1' : '0') + ':' + this._stadiumMrlRows(h).map((r) => r.idx).join(',');
        }
        return [a.key, fo.apiName, cv, this._isReadOnly ? 'ro' : 'rw', this._hmActiveKey(), (this._highlightNames || []).join('~'), extra].join('|');
    }

    async _prepareFolder(a, fo, sig) {
        const st = this._folders[fo.key];
        if (!st) return;
        try {
            const cfg = fo.apiName === 'lm_kit_code_folder' ? await this._kitConfig(a, fo) : await this._folderConfig(a, fo);
            if (!this._folders[fo.key] || this._folders[fo.key].sig !== sig) return;   // superseded meanwhile
            if (!cfg) {
                st.error = st.hint ? '' : 'This folder has no configuration for the selected type.';
                // [im] a folder that cannot open any more (KIT: Man Riding Lift unticked, every mast
                // height cleared) takes its lines off the quote - they would price a KIT that is not
                // there. Only this product's lines of this folder. Deepanjan (29th September 2026)
                if (!this._isReadOnly && this._dropFolderLines(fo.key)) { this._recomputeLines(); this._emitLines(); }
                this.rebuild(false); return;
            }
            st.cfg = cfg;
            this.rebuild(false);
            this._openFolderElement(fo.key);
        } catch (e) {
            if (this._folders[fo.key] && this._folders[fo.key].sig === sig) { st.error = 'Could not open this folder: ' + errMsg(e); this.rebuild(false); }
        }
    }

    /** the product-on-screen lines a folder emitted leave the quote; true when any left */
    _dropFolderLines(key) {
        const title = (this._folderLiveTitles || {})[key];
        if (!title || !Array.isArray(this.bag._pendingLineItems)) return false;
        const hk = this._hmActiveKey();
        const before = this.bag._pendingLineItems.length;
        this.bag._pendingLineItems = this.bag._pendingLineItems.filter((li) => !(li && li._modalSource === title && (li._hmKey === undefined || li._hmKey === hk)));
        return this.bag._pendingLineItems.length !== before;
    }

    _folderElement(key) {
        const els = this.template.querySelectorAll('c-high-mast-im-estimator');
        for (const el of els) if (el.dataset && el.dataset.folder === key) return el;
        return null;
    }

    _openFolderElement(key) {
        const st = this._folders[key];
        if (!st || !st.cfg || st.opened || st.opening) return;
        const el = this._folderElement(key);
        if (!el) return;
        st.opening = true;
        const cfg = JSON.parse(JSON.stringify(st.cfg));
        cfg.savedData = this._savedForFolder();
        try { if (typeof el.forgetMemory === 'function') el.forgetMemory(); } catch (e) { /* ignore */ }
        st.promise = Promise.resolve(el.openModal(cfg)).then(() => {
            if (this._folders[key] === st) { st.opened = true; st.opening = false; this.rebuild(false); }
        }).catch((e) => { if (this._folders[key] === st) { st.opening = false; st.error = 'Could not open this folder: ' + errMsg(e); this.rebuild(false); } });
    }

    /** the domestic savedData: the product on screen + the quote-level keys + internal keys */
    _savedForFolder() { const out = {}; Object.keys(this.bag).forEach((k) => { if (INTERNAL_LINE_KEYS.indexOf(k) === -1) out[k] = this.bag[k]; }); return out; }

    /**
     * <select value={x}> is not an attribute LWC keeps in sync (LWC1057) and a reused <select>
     * keeps its old selection when no option carries `selected` any more (a new product's blank
     * Type of Mast showed the previous product's type). Write the bag value into every select
     * and textarea after each render - never into the one the user is working in.
     */
    renderedCallback() {
        Object.keys(this._folders).forEach((k) => { const st = this._folders[k]; if (st && st.cfg && !st.opened && !st.opening) this._openFolderElement(k); });
        const els = this.template.querySelectorAll('select[data-api], textarea[data-api]');
        if (!els.length) return;
        const active = this.template.activeElement;
        els.forEach((el) => {
            if (el === active) return;
            const v = this.bag[el.dataset.api];
            const want = v === undefined || v === null ? '' : String(v);
            if (el.value !== want) el.value = want;
        });
    }

    /** resolves when every folder on screen has opened (used by validate() and product switches) */
    async _foldersReady() {
        for (let i = 0; i < 40; i++) {
            const pending = Object.keys(this._folders).filter((k) => { const st = this._folders[k]; return st && !st.error && !st.opened; });
            if (!pending.length) return;
            pending.forEach((k) => this._openFolderElement(k));
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            await new Promise((r) => setTimeout(r, 120));
            const ps = pending.map((k) => this._folders[k] && this._folders[k].promise).filter(Boolean);
            if (ps.length) await Promise.all(ps.map((p) => p.catch(() => null)));
        }
    }

    /**
     * createQuote.handleFolderClick for a standard folder: the config of the value the
     * folder's controlling field holds (a rule whose payload has modalFields at its root, else
     * the folder's own modalConfigsByValue[value] / ['default']), the blueprint of the rule
     * that carries the folder, @@ address tags, the rate card of that product (IM twin first,
     * frozen with the quote), its JSON rates merged onto the fields and seeded into the bag,
     * read-only in read-only mode, saved values + pre-registered keys + approval marks.
     */
    async _folderConfig(a, fo) {
        const folderField = fo.def;
        let userSelectedValue = 'default';
        if (folderField.controllingField) userSelectedValue = !isBlank(this.bag[folderField.controllingField]) ? String(this.bag[folderField.controllingField]) : null;
        if (!userSelectedValue) return null;
        let configStr = null, blueprintIdToPass = null;
        const rules = this.wrapperData.logicRules;
        let directMatch = null;
        for (const rule of rules) {
            if (rule.Controlling_Value__c === userSelectedValue && rule.JSON_Payload__c) {
                try { const parsed = JSON.parse(rule.JSON_Payload__c); if (parsed.modalFields !== undefined) { directMatch = rule; break; } } catch (e) { /* other rule */ }
            }
        }
        if (directMatch) {
            configStr = directMatch.JSON_Payload__c;
            if (directMatch.Blueprint_Library__c) blueprintIdToPass = directMatch.Blueprint_Library__c;
        } else if (folderField.modalConfigsByValue) {
            const inlineConfig = folderField.modalConfigsByValue[userSelectedValue] || folderField.modalConfigsByValue.default;
            if (inlineConfig) configStr = JSON.stringify(inlineConfig);
            const parentRecord = rules.find((rule) => rule.JSON_Payload__c && rule.JSON_Payload__c.includes(fo.apiName));
            if (parentRecord && parentRecord.Blueprint_Library__c) blueprintIdToPass = parentRecord.Blueprint_Library__c;
        }
        if (!configStr) return null;
        if (configStr.includes('@@')) {
            const contextData = this._address || {};
            Object.keys(contextData).forEach((key) => {
                const searchTag = new RegExp(`@@${key}@@`, 'g');
                const replacementValue = contextData[key] ? String(contextData[key]).replace(/\\/g, '\\\\').replace(/"/g, '\\"') : 'Not Found';
                configStr = configStr.replace(searchTag, replacementValue);
            });
            configStr = configStr.replace(/@@[a-zA-Z0-9_]+@@/g, 'Not Found');
        }
        const processedConfig = JSON.parse(configStr);
        if (blueprintIdToPass) processedConfig.blueprintId = blueprintIdToPass;
        let dynamicProductName = '';
        if (userSelectedValue && userSelectedValue !== 'default') dynamicProductName = userSelectedValue;
        this.bag._Dynamic_Product_Name = dynamicProductName;

        if (dynamicProductName) {
            const pricingRecord = await this._pricingFor(dynamicProductName);
            processedConfig.baseRates = pricingRecord || {};
            if (pricingRecord) this._lastPricing = pricingRecord;
            if (pricingRecord && pricingRecord.JSON_Payload__c) {
                try {
                    let dynamicFields = JSON.parse(pricingRecord.JSON_Payload__c);
                    if (!Array.isArray(dynamicFields)) dynamicFields = [dynamicFields];
                    // the rate is FROZEN with the quote: a key already carrying a saved value keeps it
                    dynamicFields.forEach((df) => {
                        if (df.apiName && df.defaultValue !== undefined && isBlank(this.bag[df.apiName])) this.bag[df.apiName] = Number(df.defaultValue);
                    });
                    (processedConfig.modalFields || []).forEach((section) => {
                        if (!section.fields) return;
                        section.fields.forEach((field, fIndex) => {
                            const dynamicMatch = dynamicFields.find((df) => df.apiName === field.apiName);
                            if (dynamicMatch) {
                                const mergedField = { ...field, ...dynamicMatch };
                                if (dynamicMatch.defaultValue !== undefined) {
                                    mergedField.value = dynamicMatch.defaultValue;
                                    if (mergedField.formula === '0' || mergedField.formula === 0) mergedField.formula = String(dynamicMatch.defaultValue);
                                }
                                section.fields[fIndex] = mergedField;
                            }
                            if ((field.type === 'column-repeater' || field.type === 'sub-section' || field.type === 'grid-repeater') && field.fields) {
                                field.fields.forEach((nestedField, nestedIndex) => {
                                    const nestedDynMatch = dynamicFields.find((df) => df.apiName === nestedField.apiName);
                                    if (!nestedDynMatch) return;
                                    const mergedNestedField = { ...nestedField, ...nestedDynMatch };
                                    if (nestedDynMatch.defaultValue !== undefined) {
                                        mergedNestedField.value = nestedDynMatch.defaultValue;
                                        if (mergedNestedField.formula === '0' || mergedNestedField.formula === 0) mergedNestedField.formula = String(nestedDynMatch.defaultValue);
                                    }
                                    field.fields[nestedIndex] = mergedNestedField;
                                });
                            }
                        });
                    });
                } catch (parseErr) { console.error('Failed to parse Dynamic Rates from Metadata:', parseErr); }
            }
        } else {
            processedConfig.baseRates = {};
        }
        // an approval on screen: the blueprint text tells _approvalTriggersFor whether this folder
        // holds the field of a PU Paint (approval_*) hit - only fetched while marks are shown
        if (processedConfig.blueprintId && (this._highlightNames || []).length && !(processedConfig.blueprintId in this._blueprintCache)) {
            try { this._blueprintCache[processedConfig.blueprintId] = await fetchBlueprintPayload({ blueprintId: processedConfig.blueprintId }); }
            catch (e) { this._blueprintCache[processedConfig.blueprintId] = ''; }
        }
        return this._finishConfig(processedConfig, fo);
    }

    _finishConfig(processedConfig, fo) {
        if (this._isReadOnly && processedConfig.modalFields) {
            processedConfig.modalFields.forEach((sec) => { if (sec.fields) sec.fields.forEach((f) => { f.readOnly = true; }); });
        }
        processedConfig.approvalTriggers = this._approvalTriggersFor(processedConfig);
        processedConfig._imHasTrigger = !!(processedConfig.approvalTriggers && processedConfig.approvalTriggers.items && processedConfig.approvalTriggers.items.length);
        processedConfig.preRegisterApis = this.collectAllAPIs();
        processedConfig.department = DEPARTMENT;
        processedConfig._imFolder = fo.key;
        return processedConfig;
    }

    /**
     * Price_Calculator__mdt record of a product (IM twin "IM - <name>" first, domestic row as
     * fallback - getImPricingRates). Once a quote has been saved with a product's record, that
     * snapshot is used on every reopen (_IM_BaseRates), so a later rate-card change never moves
     * an old quote: the same rule as every other IM product.
     */
    async _pricingFor(name) {
        if (!this._rateSnap) this._rateSnap = {};
        if (this._rateSnap[name]) { this._noteRateSource(this._rateSnap[name]); return this._rateSnap[name]; }
        try {
            const rec = await getPricingRates({ departmentName: name });
            if (rec) {
                const snap = {};
                Object.keys(rec).forEach((k) => { if (k !== 'attributes') snap[k] = rec[k]; });
                // IM twin without GST__c (the Base Rates screen saves Base / Add On only): the
                // Lighting Pole formulas multiply by GST__c, so an empty value would price them at
                // 0 - take the missing fields from the domestic row of the same type.
                if (String(snap.Department__c || '').indexOf('IM - ') === 0) {
                    const missing = PRICING_EXTRA.filter((k) => snap[k] === undefined || snap[k] === null);
                    if (missing.length) {
                        try {
                            const dom = await getDomesticPricingRates({ departmentName: name });
                            if (dom) missing.forEach((k) => { if (dom[k] !== undefined && dom[k] !== null) snap[k] = dom[k]; });
                        } catch (e) { /* no domestic row either */ }
                    }
                }
                this._rateSnap[name] = snap;
                this.bag._IM_BaseRates = { ...(this.bag._IM_BaseRates || {}), [name]: snap };
                this._noteRateSource(snap);
                return snap;
            }
        } catch (e) { /* no card for this type */ }
        return null;
    }

    /** the approval marks of the lines of this folder, in the shape weightEstimatorModal reads */
    _approvalTriggersFor(cfg) {
        const names = this._highlightNames || [];
        if (!names.length) return null;
        const title = String(cfg.title || '').replace('WEIGHT ESTIMATOR - ', '').trim().toUpperCase();
        const seen = {};
        const items = [];
        (this._lastLines || []).forEach((l) => {
            const n = String(l.name || '');
            seen[n] = (seen[n] || 0) + 1;
            if (names.indexOf(n) === -1) return;
            if (title && !n.toUpperCase().startsWith(title + ' - ')) return;
            if (l._hmKey && l._hmKey !== this._hmActiveKey()) return;
            const m = String((this._highlightMetrics || {})[n] || '').toLowerCase();
            items.push({ n, m, o: seen[n], root: false });
        });
        // an approval that fired on this product's approval_* value (PU Paint realization - not a
        // line) marks the field carrying that approvalMetric, in the folder that has it
        const own = this._hmApprovalName(this.bag);
        names.forEach((n) => {
            const m = String((this._highlightMetrics || {})[n] || '').toLowerCase();
            if (m.indexOf('approval_') !== 0 || String(n).toLowerCase() !== own.toLowerCase() || this.bag[m] === undefined) return;
            const am = m.substring('approval_'.length);
            let text = '';
            try { text = JSON.stringify(cfg) + String((cfg.blueprintId && this._blueprintCache[cfg.blueprintId]) || ''); } catch (e) { text = ''; }
            // the blueprint may sit in the config as JSON text (escaped quotes, spaces)
            const re = new RegExp('approvalMetric\\\\?"\\s*:\\s*\\\\?"' + am.replace(/[^a-z0-9_]/gi, '') + '\\\\?"');
            if (!re.test(text)) return;
            items.push({ n, m, am, o: 1, root: true });
        });
        return items.length ? { items } : null;
    }

    /** createQuote.collectAllAPIs - every field of every accordion and folder config, checkbox false / others null */
    collectAllAPIs() {
        const apiDefaults = {};
        const registerField = (field) => {
            if (!field || !field.apiName || field.type === 'header') return;
            if (!(field.apiName in apiDefaults)) apiDefaults[field.apiName] = field.type === 'checkbox' ? false : null;
            if (field.modalConfigsByValue) {
                Object.values(field.modalConfigsByValue).forEach((cfg) => {
                    if (cfg && cfg.modalFields) cfg.modalFields.forEach((sec) => { if (sec.fields) sec.fields.forEach(registerField); });
                });
            }
        };
        this.wrapperData.sections.forEach((sec) => {
            if (sec.First_Field_API_Name__c) registerField({ apiName: sec.First_Field_API_Name__c, type: 'picklist' });
            this.wrapperData.logicRules.filter((r) => r.Accordion_Section__c === sec.Id && r.JSON_Payload__c).forEach((r) => {
                let p = null; try { p = JSON.parse(r.JSON_Payload__c); } catch (e) { p = null; }
                (p && p.fields ? p.fields : []).forEach(registerField);
            });
        });
        return apiDefaults;
    }

    /** createQuote.normalizeEstimatorPayload */
    normalizeEstimatorPayload(flatPayload) {
        const result = { header: {}, lines: [] };
        if (!flatPayload) return result;
        const linesMap = {};
        Object.keys(flatPayload).forEach((key) => {
            const value = flatPayload[key];
            const repeaterMatch = key.match(/^[cr](\d+)_(.+)$/);
            if (repeaterMatch) {
                const index = repeaterMatch[1];
                const cleanApiName = repeaterMatch[2];
                if (!linesMap[index]) linesMap[index] = { _lineIndex: Number(index) };
                linesMap[index][cleanApiName] = value;
            } else {
                result.header[key] = value;
            }
        });
        result.lines = Object.values(linesMap)
            .filter((line) => Object.keys(line).some((k) => k !== '_lineIndex' && line[k] !== '' && line[k] !== null && line[k] !== false))
            .sort((a, b) => a._lineIndex - b._lineIndex)
            .map((line, idx) => ({ ...line, uiLineNumber: idx + 1 }));
        return result;
    }

    /**
     * createQuote's KIT CODE INTERCEPTOR: one KIT line per General-Details mast row (a Stadium
     * mrl_ header is row 1), the line template fields prefixed kit_line_N_, the four derived
     * fields wired to the row, the KIT blueprint sections cloned per line, LCLM's typed MAST
     * HEIGHT scaled at the one point it enters a formula. Verbatim rules.
     */
    async _kitConfig(a, fo) {
        const st = this._folders[fo.key];
        // STADIUM MAST: the KIT belongs to the Man Riding Lift. [im] Read only while the product IS a
        // Stadium Mast: a product switched from Stadium to Lighting Mast keeps the Stadium keys in
        // its bag (cross-product rule) and must not get the Stadium KIT. Deepanjan (29th September 2026)
        if (this._isStadium() && Object.prototype.hasOwnProperty.call(this.bag, 'man_riding_lift')) {
            const mrl = this.bag.man_riding_lift;
            if (!(mrl === true || String(mrl).toLowerCase() === 'true')) {
                if (st) st.hint = 'KIT Code Details applies to the Man Riding Lift only. Tick Man Riding Lift in the Stadium Mast Estimator to fill in the KIT.';
                return null;
            }
        }
        const structuredData = this.normalizeEstimatorPayload(this._savedForFolder());
        const h = structuredData.header || {};
        // STADIUM MAST, several Man Riding Lifts (NO. OF MAN RIDING LIFT, copies mrl_ / m2_mrl_ ...
        // m10_mrl_): one KIT line per Man Riding Lift - lift c is KIT line c, its height / segments /
        // quantity wired to r{c}_lm_* exactly as copy 1 always was (copy 1 alone = the domestic rule,
        // unchanged). Ladder With Cage has no KIT. Deepanjan (29th September 2026)
        const mrlRows = this._stadiumMrlRows(h);
        if (mrlRows.length) {
            structuredData.lines = mrlRows.map((r) => {
                this.bag[`r${r.idx}_lm_height_of_mast`] = r.height;
                this.bag[`r${r.idx}_lm_no_of_segment`] = r.segments;
                this.bag[`r${r.idx}_lm_quantity`] = r.quantity;
                return { _lineIndex: r.idx, lm_height_of_mast: r.height, lm_no_of_segment: r.segments, lm_quantity: r.quantity };
            });
        }
        const __kitFolderObj = fo.def;
        const __kitDef = __kitFolderObj && __kitFolderObj.modalConfigsByValue ? __kitFolderObj.modalConfigsByValue.default : null;
        const __kitMH = __kitDef && (__kitDef.lineTemplateFields || []).find((f) => f.apiName === 'lm_mast_height');
        const __kitHeightIsInput = __kitMH ? !__kitMH.formula : false;
        const __scaleKitHeight = (formula, prefix) => {
            if (!__kitHeightIsInput || !formula) return formula;
            const token = `${prefix}_lm_mast_height`;
            if (formula.indexOf(`(${token} * 10)`) !== -1) return formula;
            const re = new RegExp('(?<![\\w$])' + token + '(?![\\w$])', 'g');
            return formula.replace(re, `(${token} * 10)`);
        };
        let validLines = structuredData.lines.filter((line) => line.lm_height_of_mast !== undefined && line.lm_height_of_mast !== null && line.lm_height_of_mast !== '');
        if (__kitHeightIsInput && validLines.length === 0) validLines = [{ _lineIndex: 1 }];
        if (!validLines || validLines.length === 0) {
            if (st) st.hint = 'Please enter at least one Height of Mast in General Details first.';
            return null;
        }
        let lineTemplateFields = [];
        let modalTitle = 'KIT CODE DETAILS - LIGHTING MAST';
        let baseModalFields = [];
        if (__kitDef) {
            modalTitle = __kitDef.title || modalTitle;
            lineTemplateFields = __kitDef.lineTemplateFields || [];
            if (__kitDef.modalFields && Array.isArray(__kitDef.modalFields)) baseModalFields = JSON.parse(JSON.stringify(__kitDef.modalFields));
        }
        const regularFields = lineTemplateFields.filter((f) => !f.cloneFrom);
        const cloneFromDefs = lineTemplateFields.filter((f) => f.cloneFrom);
        let rawBlueprintJson = {};
        if (cloneFromDefs.length > 0) {
            let kitBlueprintId = null;
            for (const rule of this.wrapperData.logicRules) {
                if (rule.Blueprint_Library__c && rule.JSON_Payload__c && rule.JSON_Payload__c.includes('lm_kit_code_folder')) { kitBlueprintId = rule.Blueprint_Library__c; break; }
            }
            if (!kitBlueprintId) {
                for (const rule of this.wrapperData.logicRules) {
                    if (rule.Blueprint_Library__c && rule.Controlling_Value__c === 'default') { kitBlueprintId = rule.Blueprint_Library__c; break; }
                }
            }
            if (kitBlueprintId) {
                try {
                    const raw = (kitBlueprintId in this._blueprintCache) ? this._blueprintCache[kitBlueprintId]
                        : (this._blueprintCache[kitBlueprintId] = await fetchBlueprintPayload({ blueprintId: kitBlueprintId }));
                    if (raw) {
                        if (typeof raw === 'string') {
                            const cleanRaw = raw.replace(/\t/g, '    ').replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
                            rawBlueprintJson = JSON.parse(cleanRaw);
                        } else {
                            rawBlueprintJson = JSON.parse(JSON.stringify(raw));
                        }
                    }
                } catch (fetchErr) { console.error('Blueprint fetch error:', fetchErr.message); }
            }
        }
        const regularApiNames = regularFields.map((f) => f.apiName).filter(Boolean);
        const dynamicModalConfig = { title: modalTitle, modalFields: baseModalFields, blueprints: {} };
        const _escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const _kitRe = (apiName) => new RegExp(`(?<!r\\d+_)\\b${_escapeRe(apiName)}\\b`, 'g');
        const _TOKENS = /[A-Za-z_$][A-Za-z0-9_$]*/g;
        const _rewriteFormula = (formula, nameSet, prefix) => {
            const toks = formula.match(_TOKENS) || [];
            const present = [];
            const seen = new Set();
            for (const t of toks) { if (seen.has(t) || !nameSet.has(t)) continue; seen.add(t); present.push(t); }
            present.sort((x, y) => y.length - x.length);
            for (const apiName of present) formula = formula.replace(_kitRe(apiName), `${prefix}_${apiName}`);
            return formula;
        };
        const _regularTpl = regularFields.map((f) => JSON.stringify(f));
        const _regularNameSet = new Set(regularApiNames);
        const _bpCache = new Map();
        validLines.forEach((line, index) => {
            const lineIndex = line._lineIndex;
            const prefix = `kit_line_${lineIndex}`;
            const generatedFields = regularFields.map((tmpl, ti) => {
                const newField = JSON.parse(_regularTpl[ti]);
                newField.apiName = `${prefix}_${tmpl.apiName}`;
                if (tmpl.mapFrom && line[tmpl.mapFrom] !== undefined && line[tmpl.mapFrom] !== '') newField.defaultValue = line[tmpl.mapFrom];
                if (tmpl.apiName === 'lm_mast_height') {
                    if (tmpl.formula) newField.formula = `r${lineIndex}_lm_height_of_mast * 10`;
                } else if (tmpl.apiName === 'lm_qty_of_hm') {
                    newField.formula = `r${lineIndex}_lm_quantity`;
                } else if (tmpl.apiName === 'no_of_segment_select') {
                    newField.formula = `r${lineIndex}_lm_no_of_segment`;
                } else if (tmpl.apiName === 'lm_ring_dia') {
                    newField.formula = `(r${lineIndex}_lm_ring_diameter )`;
                } else if (newField.formula) {
                    newField.formula = _rewriteFormula(newField.formula, _regularNameSet, prefix);
                    newField.formula = __scaleKitHeight(newField.formula, prefix);
                }
                if (newField.controllingField) newField.controllingField = `${prefix}_${newField.controllingField}`;
                if (newField.controllingFields) newField.controllingFields = newField.controllingFields.map((cf) => `${prefix}_${cf}`);
                return newField;
            });
            dynamicModalConfig.modalFields.push({ id: `kit_line_${lineIndex}`, name: `Line ${index + 1}`, label: `Line ${index + 1}`, expanded: index === 0, fields: generatedFields });
            cloneFromDefs.forEach((cloneDef) => {
                const blueprintKey = cloneDef.cloneFrom;
                const rawFields = rawBlueprintJson[blueprintKey];
                if (!rawFields || rawFields.length === 0) return;
                const blueprintApiNames = rawFields.map((f) => f.apiName).filter(Boolean);
                let bp = _bpCache.get(blueprintKey);
                if (!bp) { bp = { nameSet: new Set([...blueprintApiNames, ...regularApiNames]), tpl: rawFields.map((f) => JSON.stringify(f)) }; _bpCache.set(blueprintKey, bp); }
                const rewrittenFields = rawFields.map((tmpl, ti) => {
                    const newField = JSON.parse(bp.tpl[ti]);
                    newField.apiName = `${prefix}_${tmpl.apiName}`;
                    if (newField.controllingField) newField.controllingField = `${prefix}_${tmpl.controllingField}`;
                    if (newField.formula) { newField.formula = _rewriteFormula(newField.formula, bp.nameSet, prefix); newField.formula = __scaleKitHeight(newField.formula, prefix); }
                    return newField;
                });
                dynamicModalConfig.modalFields.push({
                    id: `${prefix}_${blueprintKey}`, lineItemGroup: prefix, label: cloneDef.label || '', expanded: cloneDef.expanded !== false,
                    controllingField: `${prefix}_no_of_segment_select`, controllingValues: ['3', '4', '5'], fields: rewrittenFields
                });
            });
        });
        dynamicModalConfig.baseRates = {};
        return this._finishConfig(dynamicModalConfig, fo);
    }

    /** the product on screen is a Stadium Mast (Customized Mast / STADIUM MAST) */
    _isStadium() {
        return String(this.bag.type_of_mast || '').trim().toLowerCase() === 'customized mast'
            && String(this.bag.mast_customized || '').trim().toUpperCase() === 'STADIUM MAST';
    }

    /**
     * STADIUM MAST: the Man Riding Lifts that carry a height or a segment count - copy 1 = mrl_,
     * copy c = m{c}_mrl_, up to NO. OF MAN RIDING LIFT (1 when blank, never above 10). Lift c is
     * KIT line c. Empty for any other mast type or with Man Riding Lift unticked.
     */
    _stadiumMrlRows(h) {
        if (!h || !this._isStadium()) return [];
        // Man Riding Lift unticked: no KIT (an older quote without the tick keeps the mrl_ rule)
        if (Object.prototype.hasOwnProperty.call(h, 'man_riding_lift')
            && !(h.man_riding_lift === true || String(h.man_riding_lift).toLowerCase() === 'true')) return [];
        let count = parseInt(h.man_riding_lift_count, 10);
        if (!(count >= 1)) count = 1;
        count = Math.min(count, STADIUM_MAX_MRL);
        const rows = [];
        for (let c = 1; c <= count; c++) {
            const p = c === 1 ? 'mrl_' : `m${c}_mrl_`;
            const height = h[p + 'height_of_mast'];
            const segments = h[p + 'no_of_segment'];
            if (!(height || segments)) continue;
            rows.push({ idx: c, height, segments, quantity: h[p + 'quantity'] });
        }
        return rows;
    }

    /**
     * STADIUM: the KIT lines read each Man Riding Lift through r{c}_lm_height_of_mast /
     * _no_of_segment / _quantity (what _kitConfig wires at build time). Kept in step on every
     * live pass, so a height / segment / quantity typed after the KIT opened reaches its KIT line
     * at once (the same live bridge the Lighting Mast rows use). Stadium only.
     */
    _syncStadiumKitRows() {
        this._stadiumMrlRows(this.bag).forEach((r) => {
            this.bag[`r${r.idx}_lm_height_of_mast`] = r.height;
            this.bag[`r${r.idx}_lm_no_of_segment`] = r.segments;
            this.bag[`r${r.idx}_lm_quantity`] = r.quantity;
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // LIVE APPLY - the estimator's 'imlive' = the domestic 'applyvalues'
    // (createQuote.handleModalApply, then _applyDynamicLineItemAdjustments)
    // ═════════════════════════════════════════════════════════════════════════
    handleImLive(event) {
        const { folderKey, title, values, lineItems, parentPushes } = event.detail;
        const st = this._folders[folderKey];
        if (!st) return;
        this._folderLiveTitles = this._folderLiveTitles || {};
        this._folderLiveTitles[folderKey] = title;
        // 1. SAVE MODAL DATA TO MEMORY FIRST
        Object.keys(values || {}).forEach((k) => { this.bag[k] = values[k]; });
        // An approval_* key (PU Paint realization) this folder emitted before but not any more
        // (PU Paint unticked) leaves the bag - a merge alone would keep the old value and route
        // the quote to ED / HOD for a PU Paint that is no longer on it. Another folder of the
        // product still emitting the same key keeps it. Deepanjan (29th September 2026)
        const apvNow = Object.keys(values || {}).filter((k) => k.indexOf('approval_') === 0);
        (st.apvKeys || []).forEach((k) => {
            if (apvNow.indexOf(k) !== -1) return;
            const other = Object.keys(this._folders).find((fk) => fk !== folderKey && this._folders[fk] && (this._folders[fk].apvVals || {})[k] !== undefined);
            if (other) this.bag[k] = this._folders[other].apvVals[k];
            else delete this.bag[k];
        });
        st.apvKeys = apvNow;
        st.apvVals = {};
        apvNow.forEach((k) => { st.apvVals[k] = values[k]; });
        // pushToParentApiName - the value lands on the parent key
        Object.keys(parentPushes || {}).forEach((k) => { this.bag[k] = parentPushes[k]; });
        // 2. HANDLE LINE ITEMS: keep the lines of OTHER folders / products, replace this folder's
        const modalSource = title || 'unknown';
        const existing = this.bag._pendingLineItems || [];
        const kept = existing.filter((li) => li._modalSource !== modalSource || this._hmOtherProduct(li));
        const key = this._hmActiveKey();
        this.bag._pendingLineItems = [
            ...kept,
            ...(lineItems || []).map((line) => ({ ...line, _modalSource: modalSource, _baseUnitPrice: line.unitPrice || 0, _baseUnitCost: line.unitCost || 0, ...(key ? { _hmKey: key } : {}) }))
        ];
        this._hmOrderPending();
        this._recomputeLines();
        this._syncStadiumKitRows();   // STADIUM: each Man Riding Lift's height / segments / qty -> its KIT line
        this._pushBagToFolders(folderKey);
        this.rebuild(true);
    }

    /** the other folders read the refreshed bag (the domestic modalSavedData bridge, live) */
    _pushBagToFolders(exceptKey) {
        const saved = this._savedForFolder();
        Object.keys(this._folders).forEach((k) => {
            if (k === exceptKey) return;
            const st = this._folders[k];
            if (!st || !st.opened) return;
            const el = this._folderElement(k);
            if (el && typeof el.imSetSaved === 'function') { try { el.imSetSaved(saved); } catch (e) { /* ignore */ } }
        });
    }

    /**
     * createQuote._applyDynamicLineItemAdjustments, the High Mast part: the pending lines of
     * every product (Accessory / Misc rows excluded, as there) with the per-pole transportation
     * added by the _lineItemAdjustments rules of the Project Set-up JSON, the margin derived
     * from cost / price when the line carries none, then the _newLineItemGenerators lines
     * (Transportation Charges (Lump Sum)). Crash Barrier / HDPE / Steel-Pipe blocks do not apply.
     */
    _recomputeLines() {
        const d = this.bag;
        const pendingItems = (d._pendingLineItems || []).filter((line) => {
            const n = (line.itemName || line.name || '').trim().toLowerCase();
            return !n.startsWith('accessory:') && !n.startsWith('misc:') && !n.startsWith('addl misc:');
        });
        const adjRules = this._cachedAdjustmentRules || [];
        const newRules = this._cachedNewItemRules || [];
        const finalApexLines = [];
        pendingItems.forEach((line) => {
            let currentPrice = line._baseUnitPrice !== undefined ? line._baseUnitPrice : line.unitPrice;
            let currentCost = line._baseUnitCost !== undefined ? line._baseUnitCost : line.unitCost;
            const finalListPrice = (line.listPrice && line.listPrice > 0) ? line.listPrice : currentPrice;
            const currentName = line.itemName || line.name || 'N/A';
            let calculatedDiscount = 0;
            const enteredDiscountAmount = Number(line.discount) || 0;
            if (enteredDiscountAmount > 0) calculatedDiscount = enteredDiscountAmount;
            else { const rawDiscount = ((finalListPrice - currentPrice) / finalListPrice) * 100; calculatedDiscount = Math.round(rawDiscount * 100) / 100; }
            if ((calculatedDiscount === 0 || isNaN(calculatedDiscount)) && d.discount !== undefined && d.discount !== '') calculatedDiscount = Number(d.discount);
            let matchedWord = null;
            const hasExplicitMargin = Object.prototype.hasOwnProperty.call(line, 'margin') && line.margin !== null && line.margin !== undefined && String(line.margin).trim() !== '';
            let currentMargin = hasExplicitMargin ? (Number(line.margin) || 0) : 0;
            if (!hasExplicitMargin && currentCost > 0 && currentPrice > 0) currentMargin = Math.round((1 - (currentCost / currentPrice)) * 100);
            adjRules.forEach((rule) => {
                if (rule.targetItemNameIncludes) {
                    const targetWords = Array.isArray(rule.targetItemNameIncludes) ? rule.targetItemNameIncludes : [rule.targetItemNameIncludes];
                    const isMatch = targetWords.some((word) => currentName.toLowerCase().includes(String(word).toLowerCase()));
                    matchedWord = targetWords.find((word) => currentName.toLowerCase().includes(String(word).toLowerCase()));
                    if (!isMatch) return;
                }
                const savedValue = d[rule.conditionField];
                if (String(savedValue) !== String(rule.conditionValue)) return;
                const charge = Number(d[rule.chargeField]) || 0;
                if (charge === 0) return;
                const gstValue = rule.applyGST ? (Number(this._lastPricing && this._lastPricing.GST__c) || 1) : 1;
                let rawAdjustment = charge * gstValue;
                if (rule.multiplyByWeight) {
                    let lineWeight = Number(line.weight) || 0;
                    if (lineWeight <= 0 && rule.weightFieldByTarget && matchedWord) {
                        const itemMatch = currentName.match(/\(Item\s*(\d+)\)/i);
                        const itemIndex = itemMatch ? itemMatch[1] : null;
                        const fieldSuffix = rule.weightFieldByTarget[matchedWord];
                        if (itemIndex && fieldSuffix) lineWeight = Number(d[`${rule.weightFieldPrefix || 'c'}${itemIndex}_${fieldSuffix}`]) || 0;
                    }
                    if (lineWeight > 0) rawAdjustment = rawAdjustment * lineWeight;
                }
                if (rule.divideByQuantity) rawAdjustment = rawAdjustment / (Number(line.quantity) || 1);
                const adjustment = Math.round(rawAdjustment * 1000) / 1000;
                if (adjustment > 0) {
                    const fieldsToAdjust = rule.applyTo || ['unitPrice', 'unitCost'];
                    if (fieldsToAdjust.includes('unitPrice')) currentPrice = Math.round((currentPrice + adjustment) * 1000) / 1000;
                    if (fieldsToAdjust.includes('unitCost')) currentCost = Math.round((currentCost + adjustment) * 1000) / 1000;
                }
            });
            finalApexLines.push({
                name: currentName, weight: line.weight || 0, quantity: line.quantity || 1, realization: line.realization || '',
                unitPrice: currentPrice, unitCost: currentCost, unitListPrice: finalListPrice, expenses: line.expenses || 0,
                discount: calculatedDiscount, margin: currentMargin, added_up: line.added_up || '', tolerance: line.tolerance || '',
                ...(line._hmKey ? { _hmKey: line._hmKey } : {}), _modalSource: line._modalSource
            });
        });
        newRules.forEach((rule) => {
            const savedValue = d[rule.conditionField];
            const isMatch = (rule.conditionValue === '*')
                ? (savedValue !== undefined && savedValue !== null && savedValue !== '' && savedValue !== 0)
                : (String(savedValue) === String(rule.conditionValue));
            if (!isMatch) return;
            const charge = Number(d[rule.chargeField]) || 0;
            if (charge <= 0) return;
            const gstValue = rule.applyGST ? (Number(this._lastPricing && this._lastPricing.GST__c) || 1) : 1;
            const totalCharge = Math.round(charge * gstValue * 1000) / 1000;
            let newUnitPrice = 0, newUnitCost = 0, newExpenses = 0;
            const applyTo = rule.applyTo || ['expenses', 'unitPrice', 'unitCost'];
            if (applyTo.includes('unitPrice')) newUnitPrice = totalCharge;
            if (applyTo.includes('unitCost')) newUnitCost = totalCharge;
            if (applyTo.includes('expenses')) newExpenses = totalCharge;
            const newName = rule.itemName || 'Additional Charge';
            if (newName.includes('Transit Insurance')) { newUnitPrice = totalCharge; newUnitCost = totalCharge; newExpenses = 0; }
            finalApexLines.push({ name: newName, weight: 0, quantity: 1, unitPrice: newUnitPrice, unitCost: newUnitCost, unitListPrice: newUnitPrice, expenses: newExpenses, _isExtra: true });
        });
        this.bag._Final_Apex_Lines = finalApexLines;
    }

    /** lines in the internationalQuote shape (rate-card INR; the parent converts) */
    _emitLines() {
        const lines = (this.bag._Final_Apex_Lines || []).map((l, i) => {
            const src = String(l._modalSource || '');
            const folderKey = Object.keys(this._folderLiveTitles || {}).find((k) => this._folderLiveTitles[k] === src) || '';
            return { id: this.productCode + ':' + (l._hmKey || 'p') + ':' + i + ':' + l.name, product: this.productCode, name: l.name,
                quantity: Number(l.quantity) || 1, unitPrice: r2(Number(l.unitPrice) || 0), unitCost: r2(Number(l.unitCost) || 0),
                weight: Number(l.weight) || 0, realization: Number(l.realization) || 0, margin: Number(l.margin) || 0, discount: Number(l.discount) || 0,
                listPrice: r2(Number(l.unitListPrice) || 0), uom: 'EA', _hmKey: l._hmKey || '', isExtra: !!l._isExtra,
                expenses: Number(l.expenses) || 0, sectionKey: folderKey, folderKey, group: src };
        });
        this._lastLines = lines;
        this.dispatchEvent(new CustomEvent('lineschange', { detail: { product: this.productCode, lines, values: { ...this._savedForFolder() } } }));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HIGH MAST CROSS PRODUCT - hmQuoteTest.js [hm-cross], the parts a live host needs
    // ═════════════════════════════════════════════════════════════════════════
    _hmMulti() { return Array.isArray(this.hmProducts) && this.hmProducts.length > 1; }
    _hmActiveKey() { const p = Array.isArray(this.hmProducts) ? this.hmProducts[this.hmActive] : null; return p ? p.key : null; }
    _hmNewKey() { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36); }

    /** which keys are the product's and which are the quote's - read from the metadata (hmQuoteTest._hmKeys) */
    _hmKeys() {
        const wd = this.wrapperData;
        if (this._hmKeyCache && this._hmKeyCache.wd === wd) return this._hmKeyCache;
        const secs = (wd && Array.isArray(wd.sections)) ? wd.sections : [];
        const rules = (wd && Array.isArray(wd.logicRules)) ? wd.logicRules : [];
        let root = null;
        secs.forEach((sec) => {
            if (!sec.First_Field_API_Name__c || sec.Controlling_Field__c) return;
            if (!root || Number(sec.Sequence_No__c) < Number(root.Sequence_No__c)) root = sec;
        });
        const shared = new Set();
        const walk = (fields) => (Array.isArray(fields) ? fields : []).forEach((f) => {
            if (!f) return;
            if (f.apiName) shared.add(f.apiName);
            if (f.fields) walk(f.fields);
            if (f.modalConfigsByValue) Object.keys(f.modalConfigsByValue).forEach((k) => {
                const cfg = f.modalConfigsByValue[k];
                (cfg && Array.isArray(cfg.modalFields) ? cfg.modalFields : []).forEach((ms) => walk(ms && ms.fields));
            });
        });
        secs.forEach((sec) => {
            if (!sec.First_Field_API_Name__c || (root && sec.Id === root.Id)) return;
            shared.add(sec.First_Field_API_Name__c);
            rules.filter((r) => r.Accordion_Section__c === sec.Id && r.JSON_Payload__c).forEach((r) => {
                try { walk(JSON.parse(r.JSON_Payload__c).fields); } catch (e) { /* not a folder payload */ }
            });
        });
        this._hmKeyCache = { wd, rootApi: root ? root.First_Field_API_Name__c : 'type_of_mast', rootSecId: root ? root.Id : null, shared };
        return this._hmKeyCache;
    }
    _hmSplit(mem) {
        const keys = this._hmKeys();
        const out = { shared: {}, internal: {}, values: {} };
        Object.keys(mem || {}).forEach((k) => {
            const v = mem[k];
            if (k === '_Dynamic_Product_Name') { out.values[k] = v; return; }
            if (k.charAt(0) === '_') { if (!/^_HM_(Products|Shared|V|T|Lines)$/.test(k)) out.internal[k] = v; return; }
            const base = k.replace(/__(cleared|manual)$/, '');
            if (keys.shared.has(base)) out.shared[k] = v; else out.values[k] = v;
        });
        return out;
    }
    _hmLabelOf(values) {
        const keys = this._hmKeys();
        const v = values || {};
        const type = v[keys.rootApi];
        if (!type) return '';
        let sub = '';
        if (!this._hmSubPicks) this._hmSubPicks = {};
        const ck = `${keys.rootSecId}_${type}`;
        if (!(ck in this._hmSubPicks)) {
            let picks = [];
            const cfgStr = keys.rootSecId ? (this.jsonLogicCache[ck] || this.jsonLogicCache[`${keys.rootSecId}_*`]) : null;
            if (cfgStr) { try { picks = (JSON.parse(cfgStr).fields || []).filter((f) => f && f.type === 'picklist' && f.apiName).map((f) => f.apiName); } catch (e) { picks = []; } }
            this._hmSubPicks[ck] = picks;
        }
        const pick = this._hmSubPicks[ck].find((api) => v[api] !== undefined && v[api] !== null && String(v[api]) !== '');
        if (pick) sub = String(v[pick]);
        return sub ? `${type} / ${sub}` : String(type);
    }
    _hmProductLabels() { return (this.hmProducts || []).map((p, i) => this._hmLabelOf(i === this.hmActive ? this.bag : p.values)); }

    // LOSSLESS compaction of a product's '' / null keys (hmQuoteTest._hmCompact / _hmPackKeys / _hmUnpackKeys / _hmExpand)
    _hmCompact(values) {
        const v = values || {};
        const out = { values: {}, blank: [], nulls: [] };
        Object.keys(v).forEach((k) => {
            const x = v[k];
            const packable = /^[A-Za-z0-9_]+$/.test(k);
            if (packable && x === '') out.blank.push(k);
            else if (packable && x === null) out.nulls.push(k);
            else if (x !== undefined) out.values[k] = x;
        });
        return { values: out.values, blank: this._hmPackKeys(out.blank), nulls: this._hmPackKeys(out.nulls) };
    }
    _hmPackKeys(keys) {
        const groups = new Map();
        const plain = [];
        keys.forEach((k) => {
            const m = /^(r|c|kit_line_)(\d+)_(.+)$/.exec(k);
            if (m) { const t = `${m[1]}~_${m[3]}`; if (!groups.has(t)) groups.set(t, []); groups.get(t).push(m[2]); }
            else plain.push(k);
        });
        const byNums = new Map();
        groups.forEach((nums, t) => { const key = nums.join(','); if (!byNums.has(key)) byNums.set(key, []); byNums.get(key).push(t); });
        const parts = [];
        byNums.forEach((ts, nums) => parts.push(`${nums}:${ts.join(';')}`));
        return [...parts, ...plain].join('|');
    }
    _hmUnpackKeys(packed) {
        const outKeys = [];
        String(packed || '').split('|').forEach((e) => {
            if (!e) return;
            const i = e.indexOf(':');
            if (i < 0) { outKeys.push(e); return; }
            const nums = e.slice(0, i).split(',');
            e.slice(i + 1).split(';').forEach((t) => nums.forEach((n) => { if (t && n) outKeys.push(t.replace('~', n)); }));
        });
        return outKeys;
    }
    _hmExpand(values, rec) {
        const out = { ...(values || {}) };
        const has = (k) => Object.prototype.hasOwnProperty.call(out, k);
        this._hmUnpackKeys(rec && rec.blank).forEach((k) => { if (!has(k)) out[k] = ''; });
        this._hmUnpackKeys(rec && rec.nulls).forEach((k) => { if (!has(k)) out[k] = null; });
        return out;
    }

    /** the buckets from the saved JSON (or one empty product) - hmQuoteTest._hmInitFromMemory */
    _hydrate(saved) {
        this.hmRemoveIdx = -1;
        this._hmSubPicks = null;
        this._rateSnap = {};
        let mem = {};
        if (saved && typeof saved === 'object') {
            if (saved.v === 2 && saved.inputs && typeof saved.inputs === 'object') mem = { ...saved.inputs };
            else if (saved.inputs && typeof saved.inputs === 'object') mem = { ...saved.inputs };
            else mem = { ...saved };
        }
        const pendingSaved = Array.isArray(mem._pendingLineItems) ? mem._pendingLineItems.filter((li) => li && typeof li === 'object').map((li) => ({ ...li })) : [];
        INTERNAL_LINE_KEYS.forEach((k) => { delete mem[k]; });
        const plain = this._hmDecodeStored(mem);
        if (plain !== mem) mem = plain;
        this._hmStoredCompact = !!(mem && mem.__hmCompact);
        if (mem._IM_BaseRates && typeof mem._IM_BaseRates === 'object') this._rateSnap = { ...mem._IM_BaseRates };
        const savedProds = Array.isArray(mem._HM_Products) ? mem._HM_Products.filter((p) => p && typeof p === 'object') : [];
        if (savedProds.length > 1) {
            const { shared, internal, values } = this._hmSplit(mem);
            this.hmProducts = savedProds.map((p, i) => ({ key: p.key || ('p' + (i + 1)), values: this._hmExpand(i === 0 ? values : p.values, p) }));
            this.hmActive = 0;
            this.bag = { ...shared, ...internal, ...this.hmProducts[0].values };
        } else {
            const c = { ...mem };
            HM_STATE_KEYS.forEach((k) => { delete c[k]; });
            const { shared, internal, values } = this._hmSplit(c);
            this.hmProducts = [{ key: (savedProds[0] && savedProds[0].key) || 'p1', values: savedProds[0] ? this._hmExpand(values, savedProds[0]) : values }];
            this.hmActive = 0;
            this.bag = { ...shared, ...internal, ...this.hmProducts[0].values };
        }
        this.bag._pendingLineItems = pendingSaved;
        this.bag._Final_Apex_Lines = [];
        this._folderLiveTitles = {};
        this._recomputeLines();
    }

    /** park the product on screen in its bucket (the quote-level keys stay in the bag) */
    _hmStash() {
        if (!Array.isArray(this.hmProducts)) return;
        const p = this.hmProducts[this.hmActive];
        if (!p) return;
        p.values = this._hmSplit(this._savedForFolder()).values;
    }
    /** bring a bucket on screen: its keys over the quote-level keys, the folders reopened from memory */
    _hmRestore(idx) {
        const p = Array.isArray(this.hmProducts) ? this.hmProducts[idx] : null;
        if (!p) return;
        const { shared, internal } = this._hmSplit(this.bag);
        this.hmActive = idx;
        this.hmRemoveIdx = -1;
        this.bag = { ...shared, ...internal, ...p.values };
        this._resetFolders();
        this._recomputeLines();
        this.rebuild(true);
    }
    _hmOtherProduct(li) {
        if (!this._hmMulti()) return false;
        return !!li && li._hmKey !== undefined && li._hmKey !== this._hmActiveKey();
    }
    _hmTagPending() {
        const key = this._hmActiveKey();
        const list = this.bag._pendingLineItems;
        if (!key || !Array.isArray(list)) return;
        list.forEach((li) => { if (li && li._hmKey === undefined) li._hmKey = key; });
    }
    _hmOrderPending() {
        if (!this._hmMulti()) return;
        const list = this.bag._pendingLineItems;
        if (!Array.isArray(list) || list.length < 2) return;
        const order = new Map(this.hmProducts.map((p, i) => [p.key, i]));
        const rank = (li) => (li && order.has(li._hmKey)) ? order.get(li._hmKey) : this.hmProducts.length;
        this.bag._pendingLineItems = list.map((li, i) => ({ li, i })).sort((a, b) => (rank(a.li) - rank(b.li)) || (a.i - b.i)).map((x) => x.li);
    }

    // ── the product strip ────────────────────────────────────────────────────
    get hmShowStrip() { return this._ready && Array.isArray(this.hmProducts); }
    get hmCanAdd() { return this.hmShowStrip && !this._isReadOnly; }
    get hmProductChips() {
        if (!this.hmShowStrip) return [];
        const many = this.hmProducts.length > 1;
        const trg = new Set((this._lastLines || []).filter((l) => (this._highlightNames || []).indexOf(l.name) !== -1).map((l) => l._hmKey));
        // a product whose approval_* value (PU Paint) fired the approval carries the mark too
        (this.hmProducts || []).forEach((p, i) => {
            const v = (i === this.hmActive ? this.bag : p.values) || {};
            const nm = this._hmApprovalName(v).toLowerCase();
            (this._highlightNames || []).forEach((n) => {
                const m = String((this._highlightMetrics || {})[n] || '').toLowerCase();
                if (m.indexOf('approval_') === 0 && String(n).toLowerCase() === nm && v[m] !== undefined) trg.add(p.key);
            });
        });
        return this.hmProducts.map((p, i) => {
            const active = i === this.hmActive;
            const label = this._hmLabelOf(active ? this.bag : p.values);
            const hasTrigger = trg.has(p.key);
            return { key: p.key, idx: i, no: i + 1, label: label || 'Select Type of Mast',
                cls: 'im-typechip hm-chip' + (active ? ' im-typechip_active' : '') + (hasTrigger ? ' im-typechip_trigger' : ''),
                isActive: active, hasTrigger, confirming: this.hmRemoveIdx === i, canRemove: !this._isReadOnly && many };
        });
    }
    get hmProductCountLabel() { return this.hmProducts ? (this.hmProducts.length === 1 ? '1 product' : this.hmProducts.length + ' products') : ''; }
    handleHmSelectProduct(event) {
        const idx = Number(event.currentTarget.dataset.idx);
        if (!Array.isArray(this.hmProducts) || isNaN(idx) || idx === this.hmActive || !this.hmProducts[idx]) return;
        this._hmStash();
        this._hmRestore(idx);
    }
    handleHmAddProduct() {
        if (!this.hmCanAdd) return;
        const keys = this._hmKeys();
        if (!this.bag[keys.rootApi]) { this.crossNote = 'Choose the Type of Mast for the product on screen before adding another one.'; return; }
        this.crossNote = '';
        this._hmStash();
        this.hmProducts = [...this.hmProducts, { key: this._hmNewKey(), values: {} }];
        this._hmTagPending();
        this._hmRestore(this.hmProducts.length - 1);
    }
    handleHmRemoveAsk(event) { this.hmRemoveIdx = Number(event.currentTarget.dataset.idx); this.rebuild(false); }
    handleHmRemoveCancel() { this.hmRemoveIdx = -1; this.rebuild(false); }
    handleHmRemoveConfirm(event) {
        const idx = Number(event.currentTarget.dataset.idx);
        this.hmRemoveIdx = -1;
        if (!Array.isArray(this.hmProducts) || this.hmProducts.length < 2 || !this.hmProducts[idx] || this._isReadOnly) return;
        this._hmStash();
        const gone = this.hmProducts[idx];
        const cur = this.hmProducts[this.hmActive];
        const rest = this.hmProducts.filter((p, i) => i !== idx);
        this.bag._pendingLineItems = (this.bag._pendingLineItems || []).filter((li) => !li || li._hmKey !== gone.key);
        this.hmProducts = rest;
        const next = rest.indexOf(cur) >= 0 ? rest.indexOf(cur) : Math.max(0, idx - 1);
        this.hmActive = next;
        this._hmRestore(next);
    }
    /** cross-product rules on screen: a type on every product, no two products of one type, a line on every product */
    _hmCross() {
        this._productErrors = [];
        if (!Array.isArray(this.hmProducts)) return;
        const keys = this._hmKeys();
        const labels = this._hmProductLabels();
        const seen = new Set();
        this.hmProducts.forEach((p, i) => {
            const v = i === this.hmActive ? this.bag : p.values;
            if (!v[keys.rootApi]) { this._productErrors.push({ idx: i, message: `Product ${i + 1} has no Type of Mast. Select one or remove the product.` }); return; }
            const sig = labels[i].toLowerCase();
            if (seen.has(sig)) this._productErrors.push({ idx: i, message: `Product ${i + 1} (${labels[i]}) is the same type as an earlier product. Add its rows to that product instead, or remove this one.` });
            seen.add(sig);
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SAVE SHAPE - the domestic CP shape (plain, or compact _HM_V = 2 when big);
    // hmQuoteTest._hmSavePayload / _hmCompactPayload / _hmDecodeStored, lines excluded
    // (they live once, in the quote's _Final_Apex_Lines)
    // ═════════════════════════════════════════════════════════════════════════
    _hmSavePayload() {
        this._hmStash();
        const { shared, internal } = this._hmSplit(this._savedForFolder());
        INTERNAL_LINE_KEYS.forEach((k) => { delete internal[k]; });
        // the pending lines of EVERY product travel with the state (small): on reopen the
        // products not on screen have their lines at once, before their estimators ever open
        internal._pendingLineItems = (this.bag._pendingLineItems || []).map((li) => ({ ...li }));
        if (Object.keys(this._rateSnap || {}).length) internal._IM_BaseRates = { ...this._rateSnap };
        const keys = this._hmKeys();
        const list = this.hmProducts.map((p) => ({ key: p.key, values: p.values }));
        const packed = list.map((p) => this._hmCompact(p.values));
        const payload = { ...shared, ...internal, ...packed[0].values };
        payload._HM_Products = list.map((p, i) => {
            const label = this._hmLabelOf(p.values);
            const j = label.indexOf(' / ');
            const rec = { key: p.key, type: p.values[keys.rootApi] || '', sub: j >= 0 ? label.slice(j + 3) : '', label };
            if (i > 0) rec.values = packed[i].values;
            if (packed[i].blank) rec.blank = packed[i].blank;
            if (packed[i].nulls) rec.nulls = packed[i].nulls;
            return rec;
        });
        payload._HM_Shared = Object.keys(shared);
        const plainLen = JSON.stringify(payload).length;
        if (plainLen <= (Number(this.compactThreshold) || 40000)) return payload;
        const compact = this._hmCompactPayload(shared, internal, list);
        return JSON.stringify(compact).length < plainLen ? compact : payload;
    }
    _hmIsPrim(x) { return x === null || ['string', 'number', 'boolean'].includes(typeof x); }
    _hmIsObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
    _hmFront(list) {
        let prev = '';
        return list.map((x) => { let k = 0; const m = Math.min(prev.length, x.length); while (k < m && prev.charCodeAt(k) === x.charCodeAt(k)) k++; prev = x; return k + ':' + x.substring(k); });
    }
    _hmUnfront(list) {
        let prev = '';
        return (Array.isArray(list) ? list : []).map((e) => {
            const t = String(e);
            const i = t.indexOf(':');
            const cur = (i > 0 && /^[0-9]{1,9}$/.test(t.substring(0, i))) ? prev.substring(0, Math.min(Number(t.substring(0, i)), prev.length)) + t.substring(i + 1) : t;
            prev = cur;
            return cur;
        });
    }
    _hmRanges(ints) {
        const parts = [];
        let i = 0;
        while (i < ints.length) {
            let j = i;
            while (j + 1 < ints.length && ints[j + 1] === ints[j] + 1) j++;
            if (j > i + 1) parts.push(ints[i] + '-' + ints[j]);
            else if (j === i + 1) parts.push(ints[i] + ',' + ints[j]);
            else parts.push(String(ints[i]));
            i = j + 1;
        }
        return parts.join(',');
    }
    _hmPackInts(ints) { const r = this._hmRanges(ints); return r.length + 2 < JSON.stringify(ints).length ? r : ints; }
    _hmUnpackInts(x) {
        if (Array.isArray(x)) return x.filter((v) => Number.isInteger(v) && v >= 0 && v <= 2147483647);
        const out = [];
        if (x !== null && typeof x === 'object') return out;
        String(x === null || x === undefined ? '' : x).split(',').forEach((part) => {
            const m = /^([0-9]{1,9})-([0-9]{1,9})$/.exec(part);
            if (m) { for (let i = Number(m[1]); i <= Number(m[2]) && out.length < 100000; i++) out.push(i); }
            else if (/^[0-9]{1,9}$/.test(part)) out.push(Number(part));
        });
        return out;
    }
    _hmUnpackRows(x) {
        const out = [];
        if (x !== null && typeof x === 'object') return out;
        String(x === null || x === undefined ? '' : x).split(',').forEach((part) => {
            const m = /^([0-9]{1,9})-([0-9]{1,9})$/.exec(part);
            if (m) { for (let i = Number(m[1]); i <= Number(m[2]) && out.length < 100000; i++) out.push(String(i)); }
            else if (part) out.push(part);
        });
        return out;
    }
    _hmCompactPayload(shared, internal, list) {
        const keys = this._hmKeys();
        const enc = this._hmEncodeValues(list.map((p) => p.values));
        const payload = { ...shared, ...internal, _HM_V: 2, _HM_T: enc.T };
        // product 1's _Dynamic_Product_Name stays readable at the root, as in the plain shape:
        // the approval payload names its root item after it (decode overwrites it with the same value)
        if (list[0] && list[0].values && list[0].values._Dynamic_Product_Name !== undefined) payload._Dynamic_Product_Name = list[0].values._Dynamic_Product_Name;
        payload._HM_Products = list.map((p, i) => {
            const label = this._hmLabelOf(p.values);
            const j = label.indexOf(' / ');
            return { key: p.key, type: p.values[keys.rootApi] || '', sub: j >= 0 ? label.slice(j + 3) : '', label, v: enc.prods[i] };
        });
        payload._HM_Shared = Object.keys(shared);
        return payload;
    }
    _hmEncodeValues(list) {
        const T = [];
        const tIdx = new Map();
        const seenCols = new Map();
        let colCount = 0;
        const prods = list.map((values) => {
            const v = values || {};
            const p = {};
            const byTpl = new Map();
            Object.keys(v).forEach((k) => {
                if (v[k] === undefined) return;
                const m = /^[A-Za-z0-9_]+$/.test(k) ? /^(r|c|kit_line_)(\d+)_(.+)$/.exec(k) : null;
                if (!m) { p[k] = v[k]; return; }
                const t = `${m[1]}~_${m[3]}`;
                if (!byTpl.has(t)) byTpl.set(t, { rows: [], vals: [] });
                byTpl.get(t).rows.push(m[2]);
                byTpl.get(t).vals.push(v[k]);
            });
            const groups = new Map();
            byTpl.forEach((e, t) => {
                if (!tIdx.has(t)) { tIdx.set(t, T.length); T.push(t); }
                const canon = e.rows.every((r) => /^(0|[1-9][0-9]{0,8})$/.test(r));
                const rs = canon ? this._hmRanges(e.rows.map(Number)) : e.rows.join(',');
                if (!groups.has(rs)) groups.set(rs, { rs, ts: [], cols: [] });
                groups.get(rs).ts.push(tIdx.get(t));
                groups.get(rs).cols.push(e.vals);
            });
            const o = {};
            if (Object.keys(p).length) o.p = p;
            if (groups.size) {
                o.g = [...groups.values()].map((g) => [g.rs, this._hmPackInts(g.ts), g.cols.map((vals) => {
                    if (this._hmIsPrim(vals[0]) && vals.every((x) => x === vals[0])) return vals[0];
                    const col = vals.slice();
                    while (col.length && col[col.length - 1] === '') col.pop();
                    const js = JSON.stringify(col);
                    if (seenCols.has(js)) return { c: seenCols.get(js) };
                    seenCols.set(js, colCount++);
                    return col;
                })]);
            }
            return o;
        });
        return { T: this._hmFront(T), prods };
    }
    _hmDecodeValues(vList, Tf) {
        const T = this._hmUnfront(Tf);
        const groupsOf = (enc) => (this._hmIsObj(enc) && Array.isArray(enc.g) ? enc.g : []).filter((gr) => Array.isArray(gr) && gr.length >= 3 && Array.isArray(gr[2]));
        const colList = [];
        vList.forEach((enc) => groupsOf(enc).forEach((gr) => {
            const ts = this._hmUnpackInts(gr[1]);
            for (let j = 0; j < ts.length && j < gr[2].length; j++) if (Array.isArray(gr[2][j])) colList.push(gr[2][j]);
        }));
        return vList.map((enc) => {
            const out = {};
            if (!this._hmIsObj(enc)) return out;
            if (this._hmIsObj(enc.p)) Object.keys(enc.p).forEach((k) => { out[k] = enc.p[k]; });
            groupsOf(enc).forEach((gr) => {
                const rows = this._hmUnpackRows(gr[0]);
                const ts = this._hmUnpackInts(gr[1]);
                const cols = gr[2];
                for (let j = 0; j < ts.length && j < cols.length; j++) {
                    let c = cols[j];
                    if (this._hmIsObj(c)) { if (!(Number.isInteger(c.c) && c.c >= 0 && c.c < colList.length)) continue; c = colList[c.c]; }
                    if (ts[j] >= T.length) continue;
                    const t = T[ts[j]];
                    rows.forEach((n, r) => { out[t.split('~').join(n)] = Array.isArray(c) ? (r < c.length ? c[r] : '') : c; });
                }
            });
            return out;
        });
    }
    _hmDecodeStored(mem) {
        if (!mem || typeof mem !== 'object' || Number(mem._HM_V) !== 2 || !Array.isArray(mem._HM_Products)) return mem;
        const out = {};
        Object.keys(mem).forEach((k) => { if (!/^_HM_(Products|Shared|V|T|Lines)$/.test(k)) out[k] = mem[k]; });
        const vals = this._hmDecodeValues(mem._HM_Products.map((p) => (this._hmIsObj(p) ? p.v : undefined)), mem._HM_T);
        out._HM_Products = mem._HM_Products.map((p, i) => {
            if (!this._hmIsObj(p)) return p;
            const rec = { ...p };
            delete rec.v;
            if (i === 0) Object.assign(out, vals[i]);
            else rec.values = vals[i];
            return rec;
        });
        if (mem._HM_Shared !== undefined) out._HM_Shared = mem._HM_Shared;
        Object.defineProperty(out, '__hmCompact', { value: true });
        return out;
    }

    /** the name the approval item of a product carries: its sub-type, else its type (hmQuoteTest) */
    _hmApprovalName(v) {
        const label = this._hmLabelOf(v || {});
        const j = label.indexOf(' / ');
        return (j >= 0 ? label.slice(j + 3) : label) || 'ALL';
    }
    /** the per-product approval_* keys as one item each, named after the product (hmQuoteTest._hmApprovalPayload) */
    _approvalItems() {
        const extra = [];
        (this.hmProducts || []).forEach((p, i) => {
            const v = (i === this.hmActive ? this.bag : p.values) || {};
            const keys = Object.keys(v).filter((k) => k.startsWith('approval_'));
            if (!keys.length) return;
            const label = this._hmLabelOf(v);
            const j = label.indexOf(' / ');
            const item = { name: (j >= 0 ? label.slice(j + 3) : label) || 'ALL', _hmApproval: true };
            keys.forEach((k) => { item[k] = v[k]; });
            extra.push(item);
        });
        return extra;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // THE internationalQuote CHILD CONTRACT
    // ═════════════════════════════════════════════════════════════════════════
    @api getState() {
        const root = this._hmSavePayload();
        return { values: { v: 2, inputs: root, seeds: {}, calc: {}, hmCross: true, docProduct: this.docProduct, approvalItems: this._approvalItems() }, errors: [] };
    }

    /** every product must pass: the host fields, every folder's own rules, the KIT, the cross-product rules */
    @api async validate() {
        this._showErrors = true;
        this._hostErrors = []; this._folderErrors = [];
        const origin = this.hmActive;
        let firstBad = -1;
        const n = (this.hmProducts || []).length;
        for (let i = 0; i < n; i++) {
            if (this.hmActive !== i) { this._hmStash(); this._hmRestore(i); }
            // eslint-disable-next-line no-await-in-loop
            await this._foldersReady();
            const errs = this._validateOnScreen(i);
            if (errs.length) { this._folderErrors = this._folderErrors.concat(errs); if (firstBad < 0) firstBad = i; }
        }
        this._hmCross();
        const cross = (this._productErrors || []).map((e) => ({ apiName: '', field: 'Products', where: 'High Mast', message: e.message, product: e.idx }));
        if (cross.length && firstBad < 0) firstBad = cross[0].product;
        // a line on every product
        (this.hmProducts || []).forEach((p, i) => {
            const has = (this.bag._Final_Apex_Lines || []).some((l) => (n > 1 ? l._hmKey === p.key : true) && !l._isExtra);
            if (!has) { cross.push({ apiName: '', field: 'Products', where: 'High Mast', message: `Product ${i + 1} (${this._hmProductLabels()[i] || 'no type'}) has no line item yet. Fill in its estimator.`, product: i }); if (firstBad < 0) firstBad = i; }
        });
        this._folderErrors = this._folderErrors.concat(cross);
        const back = firstBad >= 0 ? firstBad : origin;
        if (this.hmActive !== back) { this._hmStash(); this._hmRestore(back); }
        this.rebuild(false);
        return this._folderErrors.length === 0;
    }

    /** the rules of the product on screen: host fields, KIT presence, each folder's imValidate() */
    _validateOnScreen(idx) {
        const out = [];
        const label = 'Product ' + (idx + 1);
        const keys = this._hmKeys();
        // host-level required / min (root pickers, sub-type pickers, transportation)
        this.rebuild(false);
        this.accordions.forEach((a) => {
            if (!a.visible) return;
            (a.inline || []).forEach((f) => { if (f && f.err) out.push({ apiName: f.apiName, field: f.label || f.apiName, where: label + ' › ' + a.label, message: f.err, product: idx }); });
            a.folders.forEach((fo) => {
                const st = this._folders[fo.key];
                if (!st) return;
                if (st.error && !st.hint) { out.push({ apiName: '', field: fo.label, where: label + ' › ' + a.label, message: st.error, product: idx }); return; }
                if (fo.apiName === 'lm_kit_code_folder' && !st.cfg) {
                    // a KIT accordion on screen needs the KIT (Stadium without Man Riding Lift excepted)
                    const mrlOff = this._isStadium() && Object.prototype.hasOwnProperty.call(this.bag, 'man_riding_lift') && !(this.bag.man_riding_lift === true || String(this.bag.man_riding_lift).toLowerCase() === 'true');
                    if (!mrlOff) out.push({ apiName: keys.rootApi, field: fo.label, where: label + ' › ' + a.label, message: (a.label || 'KIT CODE DETAILS') + ' is mandatory for this mast type - enter at least one Height of Mast in General Details and fill in the KIT.', product: idx });
                    return;
                }
                const el = st.cfg ? this._folderElement(fo.key) : null;
                if (el && typeof el.imValidate === 'function') {
                    let list = [];
                    try { list = el.imValidate() || []; } catch (e) { list = []; }
                    list.forEach((m) => out.push({ apiName: m.apiName || '', field: fo.label, where: label + ' › ' + a.label, message: m.message, product: idx, folderKey: fo.key }));
                }
            });
        });
        return out;
    }
    @api getErrors() { return (this._folderErrors || []).map((e) => ({ apiName: e.apiName || '', field: e.field, where: e.where || this.productLabel, message: e.message })); }
    @api focusFirstError() {
        const errs = this._folderErrors || [];
        if (!errs.length) return;
        const e = errs[0];
        const go = () => {
            if (e.folderKey) { this._open[e.folderKey] = true; this.rebuild(false); const el = this._folderElement(e.folderKey); if (el && e.apiName && typeof el.imFocus === 'function') { el.imFocus(e.apiName); return; } }
            const target = e.apiName ? this.template.querySelector(`[data-api="${e.apiName}"]`) : this.template.querySelector('.im-note_err');
            if (target && target.scrollIntoView) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (target.focus) target.focus(); }
        };
        if (e.product !== undefined && e.product !== this.hmActive && this.hmProducts[e.product]) { this._hmStash(); this._hmRestore(e.product); this._foldersReady().then(go); }
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        else setTimeout(go, 60);
    }
    get hasErrorPanel() { return this._showErrors && (this._folderErrors || []).length > 0; }
    get errorPanelItems() { return (this._folderErrors || []).slice(0, 12).map((e, i) => ({ key: 'e' + i, text: (e.where ? e.where + ': ' : '') + e.message })); }

    /** the parent's "Products on this quote" chips: switch to the product that owns the line */
    @api revealLine(lineName) {
        const l = (this._lastLines || []).find((x) => x.name === lineName);
        if (!l) return false;
        const idx = (this.hmProducts || []).findIndex((p) => p.key === l._hmKey);
        if (idx >= 0 && idx !== this.hmActive) { this._hmStash(); this._hmRestore(idx); }
        if (l.folderKey) this._open[l.folderKey] = true;
        this.rebuild('noop');
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => { const el = this.template.querySelector('.im-folder_trigger') || this.template.querySelector('.im-acc'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
        return true;
    }
    @api revealType(typeValue) {
        const idx = (this._hmProductLabels() || []).findIndex((lb) => lb === typeValue);
        if (idx < 0 || idx === this.hmActive) return false;
        this._hmStash(); this._hmRestore(idx);
        return true;
    }
    get productTypeChips() { return []; }          // the product strip plays this role here
    get hasProductTypeChips() { return false; }
}

/* ---------------------------------------------------------------- helpers */
function errMsg(e) { return (e && e.body && e.body.message) || (e && e.message) || String(e); }
function chev(open) { return open ? 'utility:chevrondown' : 'utility:chevronright'; }
function isBlank(v) { return v === undefined || v === null || v === '' || (typeof v === 'number' && isNaN(v)); }
function truthy(v) { return v === true || v === 'true' || v === 1 || v === '1'; }
function r2(n) { return Math.round(n * 100) / 100; }