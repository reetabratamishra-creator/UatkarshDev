/**
 * transmissionImConfig - the Transmission Tower product inside the International Marketing
 * quote. Renders the department's EXISTING Section Logic / Blueprint records
 * as-is, with its own isolated value bag. Nothing here touches createQuote,
 * weightEstimatorModal or CreateQuoteController.
 *
 * Everything the domestic modal does with the JSON is reproduced here:
 *   - sections, folders (ex-modals), groups, sub-sections (flattened with an
 *     injected header, children inherit the sub-section gate)
 *   - blueprint cloneFrom (replaceTarget / replaceWith / label / extra)
 *   - visibility: comma = OR, "!api" = force hide, ">=N", case-insensitive,
 *     '*' = any value, missing parent = hidden, headers bypass; hidden
 *     non-formula fields fall back to their default unless a saved value
 *     exists (CROSS PRODUCT rule, 10 Sep 2026); visible empty fields restore
 *     their default unless the user cleared them
 *   - dependentOptionsMap (progressive "a|b" keys, master fallback, clear an
 *     invalid pick when a controller changes)
 *   - rate card per rule: getPricingRates(<controlling value>) JSON_Payload__c
 *     array merged onto the fields (value + formula '0' override) and the bag
 *   - pushToParentApiName (freight_incoterms ...)
 *   - line items per section exactly like the modal's Apply (name =
 *     "<modal title> - <section label>", weight/qty/unitPrice/unitCost/
 *     listPrice/discount/margin/realization/uom by flag or api suffix,
 *     sectionHasLineFlags gate, hidden internal sections read)
 *   - required / min validation with the modal's messages, plus the
 *     product-specific validators below
 *   - values that belong to a non-active rule are never reset, so every
 *     product type entered on the quote keeps its data and its lines
 *
 * Product-specific bits live in the PRODUCT / RATE_CARD_DEPTS constants and
 * in the three hooks: productPricingFetch(), productExtraLines(),
 * productValidate(). A new product = copy this bundle, change those.
 */
import { LightningElement, api, track } from 'lwc';
import getProductConfiguration from '@salesforce/apex/InternationalQuoteController.getProductConfiguration';
import fetchBlueprintPayload from '@salesforce/apex/CreateQuoteController.fetchBlueprintPayload';
// IM twin first (Price_Calculator__mdt Department__c = 'IM - <name>'), domestic row as fallback
import getRateCardJson from '@salesforce/apex/InternationalQuoteController.getImRateCardJson';
import getPricingRates from '@salesforce/apex/InternationalQuoteController.getImPricingRates';
import getTransmissionPricing from '@salesforce/apex/CreateQuoteController.getTransmissionPricing';
import getOpportunityAccountAddress from '@salesforce/apex/CreateQuoteController.getOpportunityAccountAddress';

/* ================= product-specific constants ================= */
const PRODUCT = { code: 'TT', label: 'Transmission Tower', sourceTemplate: 'Transmission Tower - Department' };
/* Price_Calculator__mdt.Department__c candidates for this product's department-level card */
const RATE_CARD_DEPTS = ['Transmission Tower - Department', 'Transmission Tower', 'Transmission Tower Department'];

const DEBOUNCE_MS = 120;

export default class TransmissionImConfig extends LightningElement {
    @api productCode = PRODUCT.code;
    @api productLabel = PRODUCT.label;
    @api sourceTemplate = PRODUCT.sourceTemplate;
    @api opportunityId;

    // every prop that changes how fields render must re-run the render pass
    _currencyCode = '';
    @api get currencyCode() { return this._currencyCode; }
    set currencyCode(v) { this._currencyCode = v || ''; if (this._ready) this.rebuild(false); }

    _exchangeRate = 1;
    @api get exchangeRate() { return this._exchangeRate; }
    set exchangeRate(v) { this._exchangeRate = v; if (this._ready) this.rebuild(false); }

    _isReadOnly = false;
    @api get isReadOnly() { return this._isReadOnly; }
    set isReadOnly(v) { this._isReadOnly = !!v; if (this._ready) this.rebuild(false); }

    _showCalc = false;
    @api get showCalc() { return this._showCalc; }
    set showCalc(v) { this._showCalc = !!v; if (this._ready) this.rebuild(); }

    /** line names that made the approval fire - their sections are outlined in red */
    _highlightNames = [];
    @api get highlightNames() { return this._highlightNames; }
    /** line name -> metric that matched (margin / discount / realization / a field apiName) */
    _highlightMetrics = {};
    @api get highlightMetrics() { return this._highlightMetrics; }
    set highlightMetrics(v) {
        const next = v && typeof v === 'object' ? { ...v } : {};
        if (JSON.stringify(next) === JSON.stringify(this._highlightMetrics)) return;
        this._highlightMetrics = next;
        if (this._ready) this.rebuild('noop');
    }
    set highlightNames(v) {
        const next = Array.isArray(v) ? v.slice() : [];
        // only react to a REAL change - a parent re-render hands over the same list again,
        // and rebuilding on that would emit lineschange, re-render the parent, and loop forever
        if (JSON.stringify(next) === JSON.stringify(this._highlightNames)) return;
        this._highlightNames = next;
        if (this._ready) this.rebuild('noop');
    }

    _initialValues = null;
    @api get initialValues() { return this._initialValues; }
    set initialValues(v) { this._initialValues = v; if (this._ready && v) { this.values = this._hydrate(v); this.rebuild(true); } }

    @track accordions = [];
    isLoading = true;
    // config load shown with the same card + stepped bar the parent uses for APPLY
    loadText = 'Loading product setup…';
    loadPct = 15;
    get loadBarStyle() { return 'width:' + (this.loadPct || 0) + '%;'; }
    loadError = '';
    pricingNote = '';
    // which rate-card rows came from an International twin vs the domestic row (header note)
    _rateSrc = { im: [], dom: [] };
    crossNote = '';
    engineErrors = [];

    values = {};           // THIS product's bag - never shared across products
    _fields = [];          // flat leaf list (after blueprint clone + sub-section flatten)
    _compiled = null;
    _sectionsMdt = [];
    _rulesMdt = [];
    _rateCard = {};
    _rateByRule = {};      // rule key -> {apiName: defaultValue} from Price_Calculator JSON_Payload__c
    _address = {};
    _blueprintCache = {};
    _ready = false;
    _timer = null;
    _pvInFlight = null;
    _overrides = new Set();    // editable formula fields the user typed into (isManualOverride)
    _userCleared = new Set();  // fields the user emptied (default must not repopulate)
    _editOrder = [];           // apiNames in the order the user first set them (freight master)
    _savedAtOpen = {};         // values present when the quote was opened (hidden-reset guard)
    _showErrors = false;
    _crossErrors = [];
    _crossFields = [];
    _crossMsg = {};
    _open = {};

    // ------------------------------------------------------------ lifecycle
    async connectedCallback() {
        try {
            const cfg = await getProductConfiguration({ sourceTemplate: this.sourceTemplate });
            if (cfg && cfg.canCreate === false) { this.loadError = cfg.denialMessage || 'No permission.'; this.isLoading = false; return; }
            this._sectionsMdt = (cfg.sections || []).slice().sort((a, b) => (a.Sequence_No__c || 0) - (b.Sequence_No__c || 0));
            this._rulesMdt = (cfg.logicRules || []).map((r) => ({
                accordionId: r.Accordion_Section__c,
                controllingValue: r.Controlling_Value__c,
                blueprintId: r.Blueprint_Library__c,
                payload: safeParse(r.JSON_Payload__c)
            }));
            this.loadText = 'Loading rate cards…'; this.loadPct = 45;
            await Promise.all([this.loadBlueprints(), this.loadRateCard(), this.loadAddress(), this.loadRuleRateCards()]);
            this.loadText = 'Preparing sections…'; this.loadPct = 85;
            this.prepareRules();
            this.buildFieldIndex();
            this.values = this._hydrate(this._initialValues);
            this._ready = true;
            this.rebuild(true);
            this.productPricingFetch();
        } catch (e) {
            this.loadError = errMsg(e);
        } finally {
            this.isLoading = false;
        }
    }

    // ------------------------------------------------------------ loaders
    async loadBlueprints() {
        const ids = [...new Set(this._rulesMdt.map((r) => r.blueprintId).filter(Boolean))];
        await Promise.all(ids.map(async (id) => {
            try {
                let p = await fetchBlueprintPayload({ blueprintId: id });
                if (typeof p === 'string') p = p.replace(/[\u200B-\u200D\uFEFF]/g, '');
                this._blueprintCache[id] = safeParse(p);
            } catch (e) { this._blueprintCache[id] = null; }
        }));
    }

    /** Department-level rate card (kept for products whose card is keyed by department). */
    async loadRateCard() {
        const candidates = [...RATE_CARD_DEPTS, this.sourceTemplate].filter((v, i, a) => v && a.indexOf(v) === i);
        for (const dept of candidates) {
            try {
                const json = await getRateCardJson({ departmentName: dept });
                const parsed = safeParse(json);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) { this._rateCard = flatten(parsed); break; }
                if (Array.isArray(parsed)) { parsed.forEach((df) => { if (df && df.apiName && df.defaultValue !== undefined) this._rateCard[df.apiName] = df.defaultValue; }); break; }
            } catch (e) { /* try next */ }
        }
        try {
            const pc = await getPricingRates({ departmentName: candidates[0] });
            this._noteRateSource(pc);
            if (pc) ['Base_Amount__c', 'Add_On_Amount__c', 'GST__c', 'tp_segment__c', 'fm_general_detail__c', 'man_riding_lift__c']
                .forEach((k) => { if (pc[k] !== undefined && pc[k] !== null) this._rateCard[k] = pc[k]; });
        } catch (e) { /* optional */ }
    }

    /**
     * Per-rule rate card, exactly what createQuote does before opening a modal:
     * getPricingRates(<the folder's controlling value>, e.g. "Conventional Type",
     * "Railway", "Crash Tested") -> JSON_Payload__c = [{apiName, defaultValue, ...}].
     * Each entry is merged onto the matching field (value = defaultValue; a formula
     * that is literally '0' becomes that value) and written into the bag.
     */
    async loadRuleRateCards() {
        const wanted = [...new Set(this._rulesMdt.map((r) => r.controllingValue).filter((v) => v && v !== '*' && v !== 'default' && v !== 'True' && v !== 'true'))];
        // sections without a controlling value (Accessories & Misc) still have a rate card in
        // some orgs, keyed by the accordion label - ask for those too (missing = ignored)
        this._sectionsMdt.forEach((s) => { if (s.MasterLabel && wanted.indexOf(s.MasterLabel) === -1) wanted.push(s.MasterLabel); });
        await Promise.all(wanted.map(async (cv) => {
            try {
                const rec = await getPricingRates({ departmentName: cv });
                this._noteRateSource(rec);
                if (rec && rec.JSON_Payload__c) {
                    let arr = safeParse(rec.JSON_Payload__c);
                    if (arr && !Array.isArray(arr)) arr = [arr];
                    const map = {};
                    (arr || []).forEach((df) => { if (df && df.apiName) map[df.apiName] = df; });
                    this._rateByRule[cv] = map;
                    // defaults keyed by apiName also apply to any rule (accessory weights etc.)
                    Object.keys(map).forEach((api) => { if (map[api].defaultValue !== undefined && this._rateCard[api] === undefined) this._rateCard[api] = map[api].defaultValue; });
                }
            } catch (e) { /* no card for this type */ }
        }));
    }

    /** Records the source of one rate-card row: 'IM - X' = International twin, anything else = domestic. */
    _noteRateSource(rec) {
        const d = rec && rec.Department__c ? String(rec.Department__c) : '';
        if (!d) return;
        const isIm = d.indexOf('IM - ') === 0;
        const name = isIm ? d.substring(5) : d;
        const list = isIm ? this._rateSrc.im : this._rateSrc.dom;
        if (list.indexOf(name) === -1) list.push(name);
    }
    /** Header note - which rate card this estimator is pricing from. */
    get rateSourceNote() {
        if (!this._ready) return '';
        const im = this._rateSrc.im, dom = this._rateSrc.dom;
        if (!im.length && !dom.length) return '';
        if (!im.length) return 'Rate card: DOMESTIC - no International base rates saved for this product yet (Rates > Base Rates).';
        if (!dom.length) return 'Rate card: INTERNATIONAL (' + im.join(', ') + ').';
        return 'Rate card: INTERNATIONAL for ' + im.join(', ') + '; DOMESTIC fallback for ' + dom.join(', ') + '.';
    }
    get rateSourceCls() { return 'im-note' + (this._rateSrc.im.length ? ' im-note_ok' : ' im-note_warn'); }

    async loadAddress() {
        if (!this.opportunityId) return;
        try { this._address = (await getOpportunityAccountAddress({ opportunityId: this.opportunityId })) || {}; }
        catch (e) { this._address = {}; }
    }

    // ------------------------------------------------------------ config preparation
    /**
     * Turns every rule payload into the shape the modal renders:
     *  - address merge tags (@@BillingStreet@@ ...)
     *  - blueprint cloneFrom on groups
     *  - sub-sections flattened into their group (header + children)
     *  - rate-card overrides for this rule
     */
    prepareRules() {
        this._rulesMdt.forEach((r) => {
            if (!r.payload) return;
            // address tags, like createQuote does on the raw config string
            let str = JSON.stringify(r.payload);
            if (str.includes('@@')) {
                str = str.replace(/@@([A-Za-z0-9_]+)@@/g, (m, key) => {
                    const v = this._address ? this._address[key] : undefined;
                    return (v !== undefined && v !== null && v !== '') ? String(v).replace(/"/g, '\\"') : '';
                });
                r.payload = safeParse(str) || r.payload;
            }
            const bp = r.blueprintId ? this._blueprintCache[r.blueprintId] : null;
            const rates = this._rateByRule[r.controllingValue] || null;
            (r.payload.fields || []).forEach((tf) => {
                if (tf.type !== 'folder' || !tf.modalConfigsByValue) return;
                Object.keys(tf.modalConfigsByValue).forEach((k) => {
                    const cfg = tf.modalConfigsByValue[k];
                    if (!cfg || !Array.isArray(cfg.modalFields)) return;
                    cfg.modalFields = cfg.modalFields.map((g) => this.cloneGroupFromBlueprint(g, bp, cfg.modalFields));
                    cfg.modalFields.forEach((g) => { g.fields = this.flattenSubSections(g.fields || []); });
                    if (rates) cfg.modalFields.forEach((g) => this.applyRateCard(g.fields, rates));
                });
            });
        });
    }

    /** modal _buildSections: cloneFrom a blueprint key (or another section) with prefix/label replacement */
    cloneGroupFromBlueprint(g, bp, allGroups) {
        if (!g.cloneFrom) return g;
        let src = null;
        if (bp && bp[g.cloneFrom]) src = bp[g.cloneFrom];
        else { const s = allGroups.find((x) => x.id === g.cloneFrom); if (s) src = s.fields; }
        if (!src) return g;
        let s = JSON.stringify(src);
        const tgt = g.replaceTarget || 'd1_', nw = g.replaceWith || 'd2_';
        if (g.replaceTarget) s = s.split(tgt).join(nw);
        if (g.replaceLabelTarget && g.replaceLabelWith) s = s.split(g.replaceLabelTarget).join(g.replaceLabelWith);
        if (g.replaceExtraTarget && g.replaceExtraWith) s = s.split(g.replaceExtraTarget).join(g.replaceExtraWith);
        try { return { ...g, fields: JSON.parse(s) }; } catch (e) { return g; }
    }

    /** modal _expandFields: sub-section -> injected header + children carrying the parent gate */
    flattenSubSections(fields) {
        const out = [];
        fields.forEach((f) => {
            if (f.type === 'sub-section') {
                const headerApi = f.apiName + '_header';
                const subHidden = f.isVisible === false;
                out.push({ apiName: headerApi, label: f.label || ' ', type: 'sub-section-header', colSpan: f.colSpan || 12,
                    controllingField: f.controllingField || null, controllingValues: f.controllingValues || ['*'], forceHidden: subHidden });
                (f.fields || []).forEach((sf) => {
                    const c = JSON.parse(JSON.stringify(sf));
                    c.parentSubSectionApi = headerApi;
                    c.forceHidden = subHidden;
                    if (f.controllingField) {
                        if (c.controllingField) c.controllingField = f.controllingField + ',' + c.controllingField;
                        else { c.controllingField = f.controllingField; c.controllingValues = f.controllingValues || ['*']; }
                    }
                    out.push(c);
                });
            } else if (f.fields && Array.isArray(f.fields) && !f.type) {
                // untyped container with children - flatten too
                out.push(...this.flattenSubSections(f.fields));
            } else {
                out.push(f);
            }
        });
        return out;
    }

    /** createQuote's rate merge: value + formula override ('0' -> the rate) */
    applyRateCard(fields, rates) {
        (fields || []).forEach((f, i) => {
            const df = rates[f.apiName];
            if (!df) return;
            const merged = { ...f, ...df };
            if (df.defaultValue !== undefined) {
                merged.defaultValue = df.defaultValue;
                merged.rateSeed = df.defaultValue;
                if (merged.formula === '0' || merged.formula === 0) merged.formula = String(df.defaultValue);
            }
            fields[i] = merged;
        });
    }

    // ------------------------------------------------------------ model
    buildFieldIndex() {
        const all = [];
        this._rulesMdt.forEach((r) => { if (r.payload) collectFields(r.payload.fields || r.payload, all); });
        this._sectionsMdt.forEach((s) => {
            if (s.First_Field_API_Name__c) {
                all.push({
                    apiName: s.First_Field_API_Name__c,
                    label: s.First_Field_Label__c,
                    type: s.First_Field_Options__c === 'True' ? 'checkbox' : 'picklist',
                    options: s.First_Field_Options__c && s.First_Field_Options__c !== 'True' ? s.First_Field_Options__c.split(';').map((o) => o.trim()) : [],
                    required: s.First_Field_Required__c,
                    controllingField: s.Controlling_Field__c,
                    controllingValues: s.Controlling_Field__c ? (s.Controlling_Value__c ? String(s.Controlling_Value__c).split(',').map((x) => x.trim()) : ['*']) : undefined,
                    _accordionRoot: true
                });
            }
        });
        const seen = new Set();
        this._fields = all.filter((f) => f.apiName && !seen.has(f.apiName) && seen.add(f.apiName));
        this._compiled = compileFormulas(this._fields).compiled;
    }

    defaults() {
        const d = {};
        this._fields.forEach((f) => {
            let v = f.defaultValue;
            if (v === undefined) v = f.type === 'checkbox' ? false : '';
            // number-type defaults arrive from the JSON as strings ("10", "110000") - seed them as numbers
            if (String(f.type || '').toLowerCase() === 'number' && typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) v = Number(v);
            d[f.apiName] = v;
            const ro = f.readOnly === true || f.readOnly === 'true';
            if (ro && !f.formula && this._rateCard[f.apiName] !== undefined) d[f.apiName] = this._rateCard[f.apiName];
        });
        Object.keys(this._rateCard).forEach((k) => { if (d[k] === undefined) d[k] = this._rateCard[k]; });
        return d;
    }

    /**
     * The rate card of the ACTIVE type is seeded into the bag - one type at a time, exactly
     * like createQuote seeds the modal it is about to open. Several MBCB types share key
     * names (b_rate, zinc_*), so applying them all would let one type's card overwrite
     * another's. A value that arrived with the saved quote is never overwritten: the rate is
     * frozen with the quote, and a later rate-card change must not move an old quote.
     */
    applyActiveRateCards() {
        this._sectionsMdt.forEach((sec) => {
            const root = this._fields.find((f) => f.apiName === sec.First_Field_API_Name__c);
            const rule = this.pickRule(sec.Id, root, root ? this.values[root.apiName] : null);
            const cv = rule && rule.controllingValue;
            const card = cv ? this._rateByRule[cv] : null;
            if (!card) return;
            const key = sec.Id + '|' + cv;
            if (this._rateApplied[sec.Id] === key) return;      // already seeded for this type
            this._rateApplied[sec.Id] = key;
            Object.keys(card).forEach((api) => {
                const df = card[api];
                if (df.defaultValue === undefined) return;
                if (this._savedAtOpen && !isBlank(this._savedAtOpen[api])) return;   // frozen with the quote
                this.values[api] = Number(df.defaultValue);
            });
        });
    }

    /** Fields belonging ONLY to rules that are not active: never re-seeded. */
    _inactiveFields() {
        const active = new Set(), other = new Set();
        this._sectionsMdt.forEach((sec) => {
            const root = this._fields.find((f) => f.apiName === sec.First_Field_API_Name__c);
            const rule = this.pickRule(sec.Id, root, root ? this.values[root.apiName] : null);
            this._rulesMdt.filter((r) => r.accordionId === sec.Id).forEach((r) => {
                const names = []; collectFields(r.payload ? (r.payload.fields || r.payload) : [], names);
                names.forEach((f) => (r === rule ? active : other).add(f.apiName));
            });
        });
        active.forEach((a) => other.delete(a));
        return other;
    }

    /** Rules that hold user data although they are not the active one. */
    _touchedRules(sec, activeRule) {
        const out = [];
        this._rulesMdt.filter((r) => r.accordionId === sec.Id && r !== activeRule).forEach((r) => {
            const names = []; collectFields(r.payload ? (r.payload.fields || r.payload) : [], names);
            const touched = names.some((f) => {
                if (f.formula || f.readOnly === true || f.readOnly === 'true') return false;
                const v = this.values[f.apiName];
                if (isBlank(v) || v === false) return false;
                return String(v) !== String(this._defaultOf(f));
            });
            if (touched) out.push(r);
        });
        return out;
    }

    _buildFolders(rule, visible, no, offset, ignoreRootGate) {
        const folders = [];
        let sub = offset;
        ((rule && rule.payload) ? (rule.payload.fields || []) : []).forEach((tf) => {
            if (tf.type !== 'folder') return;
            // when we build the tree only to derive LINES for a product type that is not
            // the one on screen, the type picklist itself must not hide it - the rule is
            // already the gate (cross product: every entered MBCB type keeps its lines)
            const fVisible = (ignoreRootGate && tf.controllingField === ignoreRootGate) ? true : this.fieldVisible(tf);
            const cfgKey = this.pickConfigKey(tf);
            const cfg = tf.modalConfigsByValue ? tf.modalConfigsByValue[cfgKey] : null;
            this._folderTitle = cfg && cfg.title ? cfg.title : (tf.label || '');
            const groups = cfg && cfg.modalFields ? cfg.modalFields.map((g) => this.renderGroup(g, visible)).filter(Boolean) : [];
            this._folderTitle = '';
            // A section whose gate lives in another section of the same folder (Override
            // Shipping Address is switched on by a checkbox inside Shipping Address) is shown
            // with its owner - otherwise ticking the box opens nothing the user can see.
            groups.forEach((g) => {
                if (!g.gateField) return;
                const owner = groups.find((o) => o !== g && (o.rawFields || []).some((f) => f.apiName === g.gateField));
                if (!owner) return;
                g.linkedInto = owner.key;
                owner.linkedGroups = (owner.linkedGroups || []).concat(g);
            });
            sub += 1;
            const gs = (cfg && cfg.modalFields) ? cfg.modalFields : [];
            const hasTable = gs.some((g) => { const h = (g.fields || []); let n = 0; while (n < h.length && (h[n].type || '').toLowerCase() === 'header' && Number(h[n].colSpan) > 0 && Number(h[n].colSpan) < 12) n++; return n >= 4; });
            const fExp = true;      // folders are headings, not another click level
            folders.push({ key: tf.apiName, ruleKey: String(rule.controllingValue || ''), folderCls: 'im-folder', isTrigger: false, triggerLines: [], no: no + '.' + sub, label: cfg && cfg.title ? cfg.title : tf.label, title: cfg ? cfg.title : tf.label,
                visible: fVisible, groups, uiGroups: groups.filter((g) => g.render), expanded: fExp, chev: chev(fExp),
                multiplier: cfg && cfg.lineItemMultiplierConfig ? cfg.lineItemMultiplierConfig : null, cfgKey });
        });
        return folders;
    }

    /** Re-evaluate + rebuild the render tree. */
    rebuild(emit = false) {
        if (!this._ready) return;
        this.applyActiveRateCards();
        const { visible, errors } = evaluate(this._fields, this.values, this._compiled, this._overrides, this._inactiveFields(), this._savedAtOpen, this._userCleared);
        this.engineErrors = errors;
        this._visible = visible;
        this.applyDependentOptions();
        this.evaluateLookups();
        this.pushToParents();

        this._crossErrors = []; this._crossFields = []; this._crossMsg = {};
        this.productValidate();
        this._crossErrors.forEach((e) => { if (e.apiName) this._crossMsg[e.apiName] = e.inline || e.message; });
        this.crossNote = this._crossErrors.length ? this._crossErrors[0].title + ': ' + this._crossErrors[0].message : '';

        const accordions = this._sectionsMdt.map((sec, ai) => {
            const no = ai + 1;
            const root = this._fields.find((f) => f.apiName === sec.First_Field_API_Name__c);
            // accordion visibility: its own Controlling_Field__c / Value__c (comma list, '*', or none)
            let accVisible = true;
            if (sec.Controlling_Field__c) {
                accVisible = this.fieldVisible({ apiName: '__acc_' + sec.Id, type: 'header',
                    controllingField: sec.Controlling_Field__c,
                    controllingValues: sec.Controlling_Value__c ? String(sec.Controlling_Value__c).split(',').map((x) => x.trim()) : ['*'] });
            }
            const rule = this.pickRule(sec.Id, root, root ? this.values[root.apiName] : null);
            const topFields = rule && rule.payload ? (rule.payload.fields || []) : [];
            const inline = [];
            let sub = root ? 1 : 0;
            topFields.forEach((tf) => {
                if (tf.type === 'folder') return;
                const rf = this.renderField(tf, visible);
                if (rf) { sub += 1; rf.no = no + '.' + sub; inline.push(rf); }
            });
            const folders = this._buildFolders(rule, visible, String(no), sub);
            const aExp = this.isOpen(sec.Id, true);
            const rootR = root && accVisible ? this.renderField(root, visible, true) : null;
            if (rootR) { rootR.no = no + '.1'; rootR.cls = 'im-cell im-span6 im-root'; rootR.isRoot = true; }
            // the root (MBCB Type) is just the first inline cell - one render path, no
            // separate markup that could reference a different loop variable
            const inlineAll = rootR ? [rootR].concat(inline) : inline;
            return { key: sec.Id, no: String(no), label: sec.MasterLabel, visible: accVisible, expanded: aExp, chev: chev(aExp), root: rootR, inline: inlineAll, folders };
        });
        this.accordions = accordions;

        // lines: active rule + every other rule that still holds data (cross product)
        const lineTrees = accordions.slice();
        this._sectionsMdt.forEach((sec, ai) => {
            const root = this._fields.find((f) => f.apiName === sec.First_Field_API_Name__c);
            const activeRule = this.pickRule(sec.Id, root, root ? this.values[root.apiName] : null);
            this._touchedRules(sec, activeRule).forEach((r) => {
                lineTrees.push({ key: sec.Id + ':' + r.controllingValue, label: sec.MasterLabel, visible: true, folders: this._buildFolders(r, visible, String(ai + 1), 0, sec.First_Field_API_Name__c) });
            });
        });
        let lines = deriveLines(this.productCode, lineTrees, this.values, visible);
        lines = lines.concat(this.productExtraLines());
        this._lastLines = lines;
        this._onScreenGroups = new Set(accordions.flatMap((a) => a.folders.filter((fo) => fo.visible).flatMap((fo) => [fo.key + '@' + (fo.ruleKey || '')].concat((fo.uiGroups || []).flatMap((g) => [g.key, g.rawLabel])))));
        // approval highlight: a section whose line is in highlightNames gets flagged
        if (this._highlightNames && this._highlightNames.length) {
            const hitLines = lines.filter((l) => this._highlightNames.indexOf(l.name) !== -1);
            const hit = new Set(hitLines.map((l) => l.sectionKey || l.group));
            const hitFolders = new Set(hitLines.map((l) => l.folderKey));
            accordions.forEach((a) => a.folders.forEach((fo) => {
                let inGroup = false;
                (fo.uiGroups || []).forEach((g) => {
                    if (hit.has(g.key) || hit.has(g.rawLabel) || hit.has(g.label)) {
                        g.isTrigger = true; g.groupCls = 'im-group im-group_trigger'; inGroup = true;
                        g.triggerLines = hitLines.filter((l) => (l.sectionKey || l.group) === g.key || l.group === g.rawLabel || l.group === g.label).map((l) => ({ key: l.name, name: l.name }));
                    }
                });
                // the line came from an internal (non-rendered) section of this folder - e.g. the
                // per-column price sections of Transmission Tower - so mark the folder itself
                // and list the EXACT lines under its heading
                const fKey = fo.key + '@' + (fo.ruleKey || '');
                if (!inGroup && hitFolders.has(fKey) && fo.visible) {
                    fo.isTrigger = true; fo.folderCls = 'im-folder im-folder_trigger';
                    const names = hitLines.filter((l) => l.folderKey === fKey).map((l) => l.name);
                    fo.triggerLines = names.map((n) => ({ key: n, name: n }));
                }
                // outline the EXACT input the rule looked at: the field that supplied the
                // matched metric (Margin for a margin rule, Discount for a discount rule ...),
                // or the field itself when the rule's metric is a field apiName
                const wanted = new Set();
                hitLines.filter((l) => l.folderKey === fKey || (fo.uiGroups || []).some((g) => (l.sectionKey || l.group) === g.key || l.group === g.rawLabel)).forEach((l) => {
                    const metric = String((this._highlightMetrics || {})[l.name] || '').toLowerCase().replace(/[\s_]/g, '');
                    if (!metric) return;
                    let api = (l.metricApis || {})[metric] ||
                        (this._fields.some((f) => f.apiName.toLowerCase() === metric) ? this._fields.find((f) => f.apiName.toLowerCase() === metric).apiName : null);
                    // the line's own section has no such field (Transmission Tower price sections
                    // are internal) -> the folder's single Margin / Discount / ... input is the one
                    const flag = { margin: 'isMargin', discount: 'isDiscount', realization: 'isRealization', unitprice: 'isUnitPrice', unitcost: 'isUnitCost', quantity: 'isQuantity', weight: 'isWeightTotal' }[metric];
                    if (!api && flag) {
                        (fo.uiGroups || []).some((g) => {
                            const cells = (g.tableRows && g.tableRows.length) ? g.tableRows.flatMap((r) => r.cells) : (g.fields || []);
                            const cell = cells.find((f) => { const d = this._fields.find((x) => x.apiName === f.apiName); return d && (d[flag] || String(d.apiName).toLowerCase().endsWith(metric)); });
                            if (cell) { api = cell.apiName; return true; }
                            return false;
                        });
                    }
                    if (api) wanted.add(api);
                });
                if (wanted.size) {
                    (fo.uiGroups || []).forEach((g) => {
                        const cells = (g.tableRows && g.tableRows.length) ? g.tableRows.flatMap((r) => r.cells) : (g.fields || []);
                        cells.forEach((f) => { if (wanted.has(f.apiName)) { f.isTriggerField = true; f.cls = (f.cls || '') + ' im-cell_trigger'; } });
                    });
                }
            }));
        }
        if (emit === 'noop') return;          // highlight-only rebuild: never re-emit lines
        this.dispatchEvent(new CustomEvent('lineschange', { detail: { product: this.productCode, lines, values: { ...this.values } } }));
    }

    pickRule(accordionId, root, rootVal) {
        const rules = this._rulesMdt.filter((r) => r.accordionId === accordionId);
        if (!rules.length) return null;
        if (!root) {
            // no first field on this accordion (Accessories, CB Project Setup): the rule is
            // whichever one is marked '*' / default / blank - and there is normally just one
            return rules.find((r) => r.controllingValue === '*') || rules.find((r) => !r.controllingValue || r.controllingValue === 'default') || rules[0];
        }
        const sv = root && root.type === 'checkbox' ? (truthy(rootVal) ? 'True' : '') : (rootVal == null ? '' : String(rootVal));
        return rules.find((r) => r.controllingValue === sv)
            || rules.find((r) => r.controllingValue === '*' && !isBlank(sv))
            || rules.find((r) => !r.controllingValue || r.controllingValue === 'default')
            || null;
    }

    pickConfigKey(folder) {
        const keys = folder.modalConfigsByValue ? Object.keys(folder.modalConfigsByValue) : [];
        const cv = folder.controllingField ? this.values[folder.controllingField] : null;
        if (cv !== null && cv !== undefined && keys.includes(String(cv))) return String(cv);
        if (typeof cv === 'boolean' && keys.includes(cv ? 'True' : 'False')) return cv ? 'True' : 'False';
        if (keys.includes('default')) return 'default';
        return keys[0];
    }

    /** the modal's _evaluateFieldVisibility rule, usable for any def (group / folder / accordion / field) */
    fieldVisible(def) { return computeVisible(def, this.values, this._fields); }

    renderGroup(g, visible) {
        const gVisible = this.fieldVisible(g);
        if (!gVisible) return null;
        const raw = g.fields || [];
        // _prettyLabel: a blank label falls back to "<apiName>_header", then to the
        // nearest preceding header - the same order the domestic modal uses for messages
        raw.forEach((f, i) => {
            if (f.label && String(f.label).trim() !== '') return;
            const own = raw.find((x) => x.apiName === f.apiName + '_header' && x.label && String(x.label).trim() !== '');
            if (own) { f._prettyLabel = own.label.trim(); return; }
            for (let j = i - 1; j >= 0; j--) {
                const p = raw[j];
                if ((p.type || '').toLowerCase().indexOf('header') === 0 && p.label && String(p.label).trim() !== '') { f._prettyLabel = p.label.trim(); return; }
            }
            f._prettyLabel = f.apiName;
        });
        const isHdr = (f) => { const t = (f.type || '').toLowerCase(); return t === 'header' || t === 'sub-section-header'; };
        const isCellHdr = (f) => (f.type || '').toLowerCase() === 'header' && Number(f.colSpan) > 0 && Number(f.colSpan) < 12;

        // ---- layout mode ----------------------------------------------------
        // A run of >= 3 narrow headers ANYWHERE in the group is a column header row
        // (Accessories start with it; Railway / Non-Spacer have a few labelled inputs
        // first). Fields before the run keep their own labels, the run becomes the table
        // head, the inputs after it become the table rows, and anything past the next
        // header/spacer is rendered underneath.
        let runStart = -1, runLen = 0;
        for (let i = 0; i < raw.length; i++) {
            if (isCellHdr(raw[i])) {
                let j = i; while (j < raw.length && isCellHdr(raw[j])) j++;
                if (j - i >= 2) { runStart = i; runLen = j - i; break; }
                i = j;
            }
        }
        const isTable = runStart >= 0;
        const headRun = runLen;

        // pair a header with the unlabelled input right after it (W-SSSB style)
        const pairUp = (list) => {
            const out = [];
            for (let i = 0; i < list.length; i++) {
                const f = list[i], next = list[i + 1];
                if (isCellHdr(f) && next && !isHdr(next) && (next.label === undefined || String(next.label).trim() === '')) {
                    out.push({ ...next, label: f.label, _mergedHeader: f.apiName,
                        required: (next.required === true || next.required === 'true') || (f.required === true || f.required === 'true') });
                    i++;
                } else out.push(f);
            }
            return out;
        };

        let preItems = [], headItems = [], rowItems = [], postItems = [];
        if (isTable) {
            preItems  = pairUp(raw.slice(0, runStart));
            headItems = raw.slice(runStart, runStart + runLen);
            const after = raw.slice(runStart + runLen);
            let stop = after.findIndex((f, i) => i > 0 && isHdr(f));
            if (stop === -1) stop = after.length;
            rowItems  = after.slice(0, stop);
            postItems = pairUp(after.slice(stop));
        } else {
            preItems = pairUp(raw);
        }
        const items = preItems.concat(headItems, rowItems, postItems);

        // the heading a field sits under drives the calculation toggle
        this._sectionLabel = g.label || '';
        this._inTableGroup = isTable;
        const fields = [];
        items.forEach((f) => {
            const t = (f.type || '').toLowerCase();
            if (t === 'header' && (!f.colSpan || Number(f.colSpan) >= 12)) this._sectionLabel = f.label || '';
            if (t === 'sub-section-header') this._sectionLabel = f.label || '';
            const r = this.renderField(f, visible);
            if (r) fields.push(r);
        });
        this._sectionLabel = ''; this._inTableGroup = false;
        if (!fields.length) return null;
        const shownFields = fields.filter((f) => !f.hiddenCalc);   // a merged label goes with its field

        // a full-width section header with nothing visible under it (calc fields hidden) goes too
        const kept = [];
        for (let i = 0; i < shownFields.length; i++) {
            const f = shownFields[i];
            if (f.isSectionHeader) {
                let hasContent = false;
                for (let j = i + 1; j < shownFields.length; j++) {
                    if (shownFields[j].isSectionHeader) break;
                    if (!shownFields[j].isCellHeader) { hasContent = true; break; }
                }
                if (!hasContent) continue;
            }
            kept.push(f);
        }
        let visibleFields = kept;
        if (!visibleFields.length || visibleFields.every((f) => f.isHeader || f.isSpacer)) {
            if (!this._showCalc) return null;
        }

        // ---- rows are built by COLSPAN, exactly like the domestic 12-column grid ----
        // Every field (headers included) is laid out in order; a row closes as soon as the
        // colSpans reach 12. That reproduces the estimator exactly: for Railway the first row
        // is [ ] WEIGHT RATE/RM QUANTITY TRANS MARGIN, the second is the column header row
        // ITEM ... ZINC COATING, the third is DIMENSION + its five inputs, the fourth the two
        // toggles. No guessing, no pairing - the JSON's own colSpans decide.
        let tableRows = [], tableHead = [], tablePre = [], tableFoot = [];
        let rowsShown = 0, rowsTotal = 0, rowsFilled = 0, allRepeatRows = [];
        if (isTable) {
            const shownByApi = new Map(visibleFields.map((f) => [f.apiName, f]));
            const allByApi = new Map(fields.map((f) => [f.apiName, f]));
            // a cell that is hidden (calc toggle) leaves an empty cell of the same width, so
            // the columns never shift
            const ordered = items.map((f) => shownByApi.get(f.apiName)
                || (allByApi.has(f.apiName) ? { key: 'blank_' + f.apiName, isBlankCell: true, rawColSpan: allByApi.get(f.apiName).rawColSpan, cls: allByApi.get(f.apiName).cls, spanStyle: allByApi.get(f.apiName).spanStyle } : null)).filter(Boolean);
            let buf = [], span = 0, n = 0;
            const flush = () => {
                if (!buf.length) return;
                if (buf.every((x) => x.isBlankCell)) { buf = []; span = 0; return; }   // whole row hidden
                n += 1;
                const allHdr = buf.every((x) => x.isHeader || x.isBlankCell) && buf.some((x) => x.isHeader);
                tableRows.push({ key: 'r' + n, no: n, cells: buf, isHeaderRow: allHdr, rowCls: 'im-tbl-row' + (allHdr ? ' im-tbl-row_head' : '') });
                buf = []; span = 0;
            };
            ordered.forEach((f) => {
                const w = Math.min(12, Math.max(1, Number(f.rawColSpan) || 12));
                if (span + w > 12) flush();
                buf.push(f); span += w;
                if (span >= 12) flush();
            });
            flush();
            tableHead = (tableRows.find((r) => r.isHeaderRow) || { cells: [] }).cells;

            // ---- repeating rows (Accessories / Misc / Add Misc: the same fields with a
            // numeric suffix) are shown one at a time: the filled ones plus one empty, with
            // an "+ Add row" button up to the number the metadata defines. Rows that are not
            // part of the repeat (Trans.in offer?, Anchor Fasteners ...) always render.
            const baseOf = (f) => String(f.apiName || '').replace(/\d+$/, '');
            const dataRows = tableRows.filter((r) => !r.isHeaderRow);
            const sig = (r) => r.cells.filter((x) => !x.isBlankCell).map(baseOf).join('|');
            const firstSig = dataRows.length ? sig(dataRows[0]) : '';
            dataRows.forEach((r) => { r.isRepeat = sig(r) === firstSig && firstSig !== ''; });
            const repeats = dataRows.filter((r) => r.isRepeat);
            repeats.forEach((r, i) => { r.no = i + 1; });
            dataRows.filter((r) => !r.isRepeat).forEach((r) => { r.no = ''; });
            // a row counts as used only when the USER put something in it: a read-only cell
            // (the looked-up weight, which is 0 until a beam is chosen) does not make a row used
            const used = (r) => r.cells.some((x) => {
                if (x.isBlankCell || x.isReadOnlyValue || x.isHeader) return false;
                const v = this.values[x.apiName];
                return !isBlank(v) && v !== false && String(v) !== '0';
            });
            let lastUsed = 0;
            repeats.forEach((r, i) => { if (used(r)) lastUsed = i + 1; });
            const filled = lastUsed;
            const key = g.id || g.label;
            const want = Math.max(this._rowsShown[key] || 0, filled + 1, 1);
            const shown = Math.min(want, repeats.length || 1);
            let seen = 0;
            tableRows = tableRows.filter((r) => {
                if (r.isHeaderRow || !r.isRepeat) return true;
                seen += 1;
                return seen <= shown;
            });
            // every shown repeat row can be removed (the last remaining row is only cleared)
            const groupKey = g.id || g.label;
            tableRows.forEach((r) => {
                if (!r.isRepeat) { r.canRemove = false; return; }
                r.canRemove = true;
                r.removeKey = groupKey + '::' + r.no;
                r.removeTitle = shown > 1 ? 'Remove row ' + r.no : 'Clear this row';
            });
            rowsShown = shown; rowsTotal = repeats.length; rowsFilled = filled; allRepeatRows = repeats;
        }

        // With "Show calculation fields" ON the calculation blocks would flood the section,
        // so they move into their own folder card that opens in the panel - the same place the
        // big tables use. Nothing else changes: the fields, their values and the line/validation
        // logic are untouched, only where they are drawn.
        let calcFields = [];
        if (this._showCalc) {
            const isCalcHead = (f) => f.isSectionHeader && CALC_SECTION.test(String(f.label || ''));
            const main = [];
            let inCalc = false;
            visibleFields.forEach((f) => {
                if (f.isSectionHeader) inCalc = isCalcHead(f);
                if (inCalc || f.isCalc) calcFields.push(f); else main.push(f);
            });
            if (calcFields.length) visibleFields = main;
        }

        const showRequiredStars = g.showRequired !== false;
        const checkboxRun = items.filter((f) => (f.type || '').toLowerCase() === 'checkbox').length;
        const isCheckboxRow = !!g.isCheckboxGroup || (checkboxRun >= 2 && checkboxRun >= items.filter((f) => !isHdr(f)).length * 0.6);
        // big tables (Accessories / Misc / Add Misc) open in a modal instead of sitting inline
        // a wide multi-row table (Accessories / Misc / Add Misc) opens in the panel;
        // a compact one (Railway, Non-Spacer: one row of columns) stays inline.
        const rowCount = rowsTotal || tableRows.filter((r) => !r.isHeaderRow && r.cells.some((x) => !x.isBlankCell)).length;
        const cardFolder = /ADDRESS|TERMS|CONDITION/i.test(this._folderTitle || '');
        const openInModal = (isTable && rowCount >= 5) || (!isTable && cardFolder);   // Accessories/Misc yes, Railway/Non-Spacer inline
        let gLabel = g.label || '';
        if (g.labelFormat) gLabel = String(g.labelFormat).replace(/\{([^}]+)\}/g, (m, api) => { const v = this.values[api]; return isBlank(v) ? '' : String(v); }).trim();
        // default open only for small sections; anything bigger starts collapsed so the
        // screen is a list of folders the user opens one at a time
        // count what is actually RENDERED (hidden helpers and calc fields don't make a
        // section "heavy"), so small sections like General Details stay open
        const inputCount = fields.filter((f) => !f.isHeader && !f.isSpacer).length;
        // one click level only: sections are open; a very heavy one (20+ visible cells)
        // keeps a chevron so it can be folded away, but even that starts open
        const collapsible = inputCount > 20;
        const gExp = collapsible ? this.isOpen(g.id || g.label, true) : true;
        const filled = isTable ? this._filledRowCount(raw, tableHead.length) : this._filledCount(raw);
        // a table renders as a header strip + numbered rows so the columns stay readable
        return { key: g.id || g.label, label: gLabel, rawLabel: g.label || '', visible: true, collapsible, gateField: g.controllingField || null, groupCls: 'im-group', isTrigger: false, triggerLines: [], tableHead, tableRows, tableFoot, tablePre,
            calcFields, hasCalc: calcFields.length > 0, calcKey: (g.id || g.label) + '::calc',
            calcLabel: 'Calculations (' + calcFields.filter((f) => !f.isHeader).length + ' fields)',
            rowsShown, rowsTotal, rowsFilled, allRepeatRows, canAddRow: rowsTotal > rowsShown, addRowLabel: '+ Add row (' + rowsShown + ' of ' + rowsTotal + ')',
            render: g.isVisible !== false, expanded: gExp, chev: chev(gExp),
            isTable, isCheckboxRow, openInModal,
            filledLabel: isTable ? (rowsFilled ? rowsFilled + (rowsFilled === 1 ? ' row filled' : ' rows filled') : 'No rows yet')
                                 : (filled ? filled + ' filled' : 'Nothing filled yet'),
            bodyCls: 'im-grid im-group-body' + (isTable ? ' im-grid_table' : '') + (isCheckboxRow ? ' im-grid_checks' : ''),
            rawFields: raw, showRequiredStars,
            fields: visibleFields.map((f) => (showRequiredStars ? f : { ...f, required: false, reqAttr: 'false' })) };
    }

    _filledCount(raw) {
        const n = (raw || []).filter((f) => { const t = (f.type || '').toLowerCase(); if (!t || t.indexOf('header') === 0) return false;
            const v = this.values[f.apiName]; return !isBlank(v) && v !== false; }).length;
        return n;
    }

    /** how many table rows already carry data (shown on the collapsed card) */
    _filledRowCount(rowItems, headRun) {
        const inputs = (rowItems || []).filter((f) => !((f.type || '').toLowerCase() === 'header'));
        const cols = headRun || 1;
        let n = 0;
        for (let i = 0; i < inputs.length; i += cols) {
            const row = inputs.slice(i, i + cols);
            if (row.some((f) => !isBlank(this.values[f.apiName]) && this.values[f.apiName] !== false)) n++;
        }
        return n;
    }

    // ---- table modal ----
    _rowsShown = {};
    modalGroupKey = '';
    openGroupModal(event) {
        this.modalGroupKey = event.currentTarget.dataset.key;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => { const el = this.template.querySelector('.im-gm'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 40);
    }
    closeGroupModal() { this.modalGroupKey = ''; }
    addTableRow(event) {
        const key = event.currentTarget.dataset.key;
        this._rowsShown[key] = (this._rowsShown[key] || 1) + 1;
        this.rebuild(false);
    }

    /**
     * Remove a row: its values are cleared and every row below moves up one, so there is
     * never a hole in the middle (the offer PDF numbers the rows in order). The last
     * remaining row is not deleted, only emptied.
     */
    removeTableRow(event) {
        const raw = event.currentTarget.dataset.key || '';
        const idx = raw.lastIndexOf('::');
        if (idx < 0) return;
        const key = raw.substring(0, idx);
        const no = parseInt(raw.substring(idx + 2), 10);
        if (!no) return;
        const g = this._findGroup(key);
        if (!g) return;
        const repeats = (g.allRepeatRows || []).slice();     // every row the metadata defines
        if (!repeats.length) return;
        const editable = (cells) => cells.filter((x) => !x.isBlankCell && !x.isHeader && !x.isReadOnlyValue);
        // shift every row below up one, then blank the last one
        for (let i = no - 1; i < repeats.length - 1; i++) {
            const from = editable(repeats[i + 1].cells), to = editable(repeats[i].cells);
            to.forEach((cell, j) => {
                const src = from[j];
                this.values[cell.apiName] = src ? this.values[src.apiName] : '';
                if (isBlank(this.values[cell.apiName])) this._userCleared.add(cell.apiName); else this._userCleared.delete(cell.apiName);
            });
        }
        editable(repeats[repeats.length - 1].cells).forEach((cell) => {
            this.values[cell.apiName] = cell.isCheckbox ? false : '';
            this._userCleared.add(cell.apiName);
        });
        const shown = this._rowsShown[key] || 1;
        this._rowsShown[key] = Math.max(1, shown - 1);
        this.rebuild(true);
    }

    /**
     * Find the accordion root value (Type of Product / MBCB Type) whose rule produces this
     * line. Used to bring a hidden type on screen when its line triggered the approval.
     */
    _ruleForLine(lineName) {
        for (const sec of this._sectionsMdt) {
            const root = this._fields.find((f) => f.apiName === sec.First_Field_API_Name__c);
            if (!root) continue;
            for (const r of this._rulesMdt.filter((x) => x.accordionId === sec.Id)) {
                const tree = [{ key: 'probe', label: sec.MasterLabel, visible: true,
                    folders: this._buildFolders(r, this._visible, '0', 0, sec.First_Field_API_Name__c) }];
                const found = deriveLines(this.productCode, tree, this.values, this._visible).some((l) => l.name === lineName);
                if (found) return { sec, root, rule: r };
            }
        }
        return null;
    }

    /**
     * Bring the section that produced `lineName` on screen: switch the type picklist to the
     * owning rule (values of every type are retained, lines do not change), open the
     * section and scroll to it. Works in read-only mode too - it only changes what is shown.
     */
    @api revealLine(lineName) {
        const hit = this._ruleForLine(lineName);
        if (!hit) return false;
        const cv = hit.rule.controllingValue;
        if (cv && cv !== '*' && cv !== 'default' && String(this.values[hit.root.apiName]) !== cv) {
            this.values[hit.root.apiName] = hit.root.type === 'checkbox' ? (cv === 'True' || cv === 'true') : cv;
        }
        this._open[hit.sec.Id] = true;
        this.rebuild('noop');
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const el = this.template.querySelector('.im-group_trigger') || this.template.querySelector('.im-folder_trigger');
            if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
        return true;
    }

    /**
     * Trigger lines that belong to a product type NOT on screen, grouped BY TYPE - one chip
     * per type ("Tower · 2 lines"), never one per line. Clicking the chip switches to that
     * type and scrolls to the flagged section.
     */
    get hiddenTriggerNotices() {
        if (!this._highlightNames || !this._highlightNames.length || !this._ready) return [];
        const lines = this._lastLines || [];
        const onScreen = new Set(lines.filter((l) => this._onScreenGroups.has(l.sectionKey) || this._onScreenGroups.has(l.folderKey)).map((l) => l.name));
        const byType = {};
        this._highlightNames.forEach((n) => {
            if (onScreen.has(n) || !lines.some((l) => l.name === n)) return;
            const hit = this._ruleForLine(n);
            const type = hit && hit.rule ? String(hit.rule.controllingValue || '') : '';
            const label = type && type !== '*' && type !== 'default' && type !== 'True' ? type : (hit && hit.sec ? hit.sec.MasterLabel : 'Other');
            if (!byType[label]) byType[label] = { key: label, type: label, first: n, count: 0 };
            byType[label].count += 1;
        });
        return Object.keys(byType).map((k) => { const t = byType[k]; return { ...t, chip: t.type + ' · ' + t.count + (t.count === 1 ? ' line' : ' lines') }; });
    }
    get hasHiddenTriggers() { return this.hiddenTriggerNotices.length > 0; }
    revealFromNotice(event) { this.revealLine(event.currentTarget.dataset.name); }   // data-name = first line of that type

    // ─── PRODUCT TYPE SWITCHER (cross product) ───────────────────────────────────────
    // A cross-product quote carries lines of several product types, but the accordion
    // renders only the type the root picklist is on - and in read-only mode (In Review /
    // Approved) that picklist is disabled, so a reviewer could never reach the others.
    // These chips list every type that owns at least one line on this quote; the one
    // holding an approval trigger is marked. Clicking a chip only changes WHAT IS SHOWN:
    // every type's values stay in this.values, lines and prices do not change and nothing
    // is saved from here.
    /** line name -> the type (root picklist value) whose rule produced it; probed once, then cached
     *  (a line's owning type never changes, so the cache is safe for the life of the component) */
    _lineTypeMap = {};
    _typeForLine(lineName) {
        if (Object.prototype.hasOwnProperty.call(this._lineTypeMap, lineName)) return this._lineTypeMap[lineName];
        if (!this._ready || !(this._sectionsMdt || []).length) return null;   // config not loaded yet - do not cache a miss
        let out = null;
        const hit = this._ruleForLine(lineName);
        if (hit) {
            const cv = String(hit.rule.controllingValue || '');
            if (cv && cv !== '*' && cv !== 'default' && cv !== 'True' && cv !== 'true') {   // a real type choice
                out = { type: cv, secId: hit.sec.Id, rootApi: hit.root.apiName, isCheckbox: hit.root.type === 'checkbox' };
            }
        }
        this._lineTypeMap[lineName] = out;      // misses are cached too, so a line is probed only once
        return out;
    }

    get productTypeChips() {
        const lines = this._lastLines || [];
        if (!lines.length) return [];
        const trg = new Set(this._highlightNames || []);
        const byType = {};
        lines.forEach((l) => {
            const t = this._typeForLine(l.name);
            if (!t) return;
            if (!byType[t.type]) byType[t.type] = { key: t.type, type: t.type, count: 0, hasTrigger: false, secId: t.secId, rootApi: t.rootApi, isCheckbox: t.isCheckbox };
            byType[t.type].count += 1;
            if (trg.has(l.name)) byType[t.type].hasTrigger = true;
        });
        const keys = Object.keys(byType);
        if (keys.length < 2) return [];          // single-type quote: nothing to switch between
        return keys.map((k) => {
            const c = byType[k];
            const active = String(this.values[c.rootApi]) === c.type;
            return { ...c, active,
                label: c.type + ' · ' + c.count + (c.count === 1 ? ' line' : ' lines'),
                cls: 'im-typechip' + (active ? ' im-typechip_active' : '') + (c.hasTrigger ? ' im-typechip_trigger' : '') };
        });
    }
    get hasProductTypeChips() { return this.productTypeChips.length > 0; }
    goToProductType(event) { this.revealType(event.currentTarget.dataset.type); }

    /** show that product type - read-only too; only what is displayed changes */
    @api revealType(typeValue) {
        const c = this.productTypeChips.find((x) => x.type === typeValue);
        if (!c || c.active) return false;
        this.values[c.rootApi] = c.isCheckbox ? (c.type === 'True' || c.type === 'true') : c.type;
        this._open[c.secId] = true;
        this.rebuild('noop');
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const el = this.template.querySelector('.im-group_trigger') || this.template.querySelector('.im-folder_trigger') || this.template.querySelector('.im-acc');
            if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
        return true;
    }

    /** the rendered section that holds this field (used in messages and by focusFirstError) */
    _groupOf(apiName) {
        for (const a of this.accordions) for (const fo of a.folders) for (const g of (fo.groups || fo.uiGroups || [])) {
            const inRows = (g.tableRows || []).some((r) => r.cells.some((c) => c.apiName === apiName));
            const inFields = (g.fields || []).some((f) => f.apiName === apiName) || (g.calcFields || []).some((f) => f.apiName === apiName);
            if (inRows || inFields || (g.rawFields || []).some((f) => f.apiName === apiName)) return { accordion: a, folder: fo, group: g };
        }
        return null;
    }

    _findGroup(key) {
        for (const a of this.accordions) for (const fo of a.folders) {
            const g = (fo.uiGroups || []).find((x) => x.key === key);
            if (g) return g;
        }
        return null;
    }
    get modalGroup() {
        if (!this.modalGroupKey) return null;
        const calc = this.modalGroupKey.endsWith('::calc');
        const key = calc ? this.modalGroupKey.slice(0, -6) : this.modalGroupKey;
        for (const a of this.accordions) for (const fo of a.folders) {
            const g = (fo.uiGroups || []).find((x) => x.key === key);
            if (!g) continue;
            if (!calc) {
                if (!g.linkedGroups || !g.linkedGroups.length) return g;
                const extra = [];
                g.linkedGroups.forEach((lg) => {
                    extra.push({ key: 'lnk_' + lg.key, isHeader: true, isSectionHeader: true, label: lg.label,
                                 cls: 'im-cell im-span12', spanStyle: '--sp:12;' });
                    (lg.fields || []).forEach((f) => extra.push(f));
                });
                return { ...g, fields: (g.fields || []).concat(extra) };
            }
            return { key: g.calcKey, label: g.label + ' - calculations', isTable: false,
                     fields: g.calcFields, tableRows: [], tableHead: [], tableFoot: [], canAddRow: false };
        }
        return null;
    }
    get hasModalGroup() { return !!this.modalGroup; }

    renderField(f, visible, isRoot = false) {
        if (!isRoot && visible.get(f.apiName) === false) return null;
        if (f.isVisible === false || f.forceHidden) return null;
        const t = (f.type || '').toLowerCase();
        const isSectionHeader = t === 'sub-section-header' || (t === 'header' && (!f.colSpan || Number(f.colSpan) >= 12));
        const isCellHeader = t === 'header' && !isSectionHeader;       // table column head / orphan inline label
        const isHeader = isSectionHeader || isCellHeader;
        const isSpacer = !t && !f.formula;
        const calc = isCalcDetail(f, this._sectionLabel, this._inTableGroup);
        const hiddenCalc = calc && !this._showCalc;
        const ro = this.isReadOnly || f.readOnly === true || f.readOnly === 'true';
        const val = this.values[f.apiName];
        let label = f.label;
        if (f.labelsByController && f.labelsByController.controllingApi) {
            const cfg = f.labelsByController; const cv = this.values[cfg.controllingApi];
            const key = cv === undefined || cv === null ? '' : String(cv).trim();
            label = (key !== '' && cfg.map && cfg.map[key] !== undefined) ? cfg.map[key] : (cfg.default !== undefined ? cfg.default : f.label);
        }
        const rawColSpan = Number(f.colSpan) || (isHeader ? 12 : 6);
        const span = Math.min(12, Math.max(1, rawColSpan));
        const req = f.required === true || f.required === 'true';
        let err = '';
        // domestic validateRequiredFields: only visible, non-readOnly fields are checked;
        // a min-flagged field must hold a number >= min (0 / negative / text all fail)
        if (!isHeader && !isSpacer && !ro) {
            if (f.min !== undefined && f.min !== null && !isBlank(val)) {
                const num = parseFloat(val);
                if (isNaN(num) || num < Number(f.min)) err = 'must be >= ' + f.min;
            }
            if (!err && f.max !== undefined && f.max !== null && !isBlank(val)) {
                const num = parseFloat(val);
                if (!isNaN(num) && num > Number(f.max)) err = 'Value must not exceed ' + f.max;
            }
            if (!err && req && this._showErrors && t !== 'checkbox' && isBlank(val)) err = 'This field is required';
            if (!err && this._crossMsg[f.apiName]) err = this._crossMsg[f.apiName];
        }
        const opts = this._optionsFor(f);
        const hasLabel = !!(label && String(label).trim());
        return {
            key: f.apiName, apiName: f.apiName, label: label || '', prettyLabel: f._prettyLabel || '', no: '', hasLabel,
            isHeader, isSectionHeader, isCellHeader, isSpacer, hiddenCalc, isCalc: calc,
            // a read-only field is shown as a formatted tile only - never as an input as well
            isPicklist: t === 'picklist' && !ro, isCheckbox: t === 'checkbox', isTextarea: t === 'textarea' && !ro, isNumber: t === 'number' && !ro,
            isText: !ro && (t === 'text' || (!isHeader && !isSpacer && !['picklist', 'checkbox', 'textarea', 'number'].includes(t))),
            options: opts.map((o) => ({ label: String(o.label !== undefined ? o.label : o), value: String(o.value !== undefined ? o.value : o), selected: String(o.value !== undefined ? o.value : o) === String(val) })),
            value: val === undefined || val === null ? '' : val, checked: truthy(val), readOnly: ro,
            required: req, reqAttr: req ? 'true' : 'false', err,
            inputCls: 'im-input' + (err ? ' im-invalid' : ''), selectCls: 'im-select' + (err ? ' im-invalid' : ''),
            unit: f.unit || '', min: f.min, isMoney: !!(f.isUnitPrice || f.isUnitCost),
            fcValue: (f.isUnitPrice || f.isUnitCost) && Number(this.exchangeRate) > 0 ? fmt(Number(val || 0) / Number(this.exchangeRate)) : null,
            isReadOnlyValue: ro && !isHeader && !isSpacer && t !== 'checkbox',
            display: ro && !isHeader && !isSpacer ? (t === 'number' && !isBlank(val) && !isNaN(Number(val)) ? fmt(Number(val)) : (isBlank(val) ? '' : String(val))) : null,
            valueCls: 'im-value im-value_' + (f.isUnitPrice ? 'price' : (f.isUnitCost ? 'cost' : (f.isMargin ? 'margin' : (calc ? 'calc' : 'ref')))) + (err ? ' im-invalid' : ''),
            cls: 'im-cell im-span' + span, spanStyle: '--sp:' + span + ';', rawColSpan
        };
    }

    // ------------------------------------------------------------ dependent picklists
    _optionsFor(f) {
        if (f.dependentOptionsMap && f._depOptions) return f._depOptions;
        return f.options || [];
    }
    /** modal load-time rule: progressive "a|b|c" -> "a|b" -> "a" key, master when all filled, [] when a controller is blank */
    applyDependentOptions() {
        this._fields.forEach((dep) => {
            if (!dep.dependentOptionsMap) return;
            const ctrls = Array.isArray(dep.controllingFields) ? dep.controllingFields
                : (typeof dep.controllingFields === 'string' ? dep.controllingFields.split(',').map((s) => s.trim())
                : (typeof dep.controllingField === 'string' ? dep.controllingField.split(',').map((s) => s.trim()) : []));
            if (!ctrls.length) return;
            const cur = ctrls.map((c) => { const v = this.values[c]; return isBlank(v) ? '' : String(v).trim(); });
            if (!dep.masterOptions) dep.masterOptions = dep.options ? [...dep.options] : [];
            const keys = []; const tmp = [];
            for (const v of cur) { if (v !== '') { tmp.push(v); keys.unshift(tmp.join('|')); } else break; }
            const matched = keys.find((k) => dep.dependentOptionsMap[k]);
            if (matched) dep._depOptions = dep.dependentOptionsMap[matched];
            else if (cur.every((v) => v !== '')) dep._depOptions = dep.masterOptions;
            else dep._depOptions = [];
        });
    }
    /** modal change-time rule: when a controller changes, a pick that is no longer valid is cleared */
    clearInvalidDependents(changedApi) {
        this._fields.forEach((dep) => {
            if (!dep.dependentOptionsMap) return;
            const ctrls = Array.isArray(dep.controllingFields) ? dep.controllingFields
                : (typeof dep.controllingFields === 'string' ? dep.controllingFields.split(',').map((s) => s.trim())
                : (typeof dep.controllingField === 'string' ? dep.controllingField.split(',').map((s) => s.trim()) : []));
            if (!ctrls.some((c) => changedApi.endsWith(c))) return;
            const cur = ctrls.map((c) => { const v = this.values[c]; return isBlank(v) ? '' : String(v).trim(); });
            let opts;
            if (cur.some((v) => v === '')) opts = [];
            else if (dep.dependentOptionsMap[cur.join('|')]) opts = dep.dependentOptionsMap[cur.join('|')];
            else opts = dep.masterOptions || dep.options || [];
            const vals = opts.map((o) => String(o.value !== undefined ? o.value : o));
            if (!isBlank(this.values[dep.apiName]) && !vals.includes(String(this.values[dep.apiName]))) this.values[dep.apiName] = '';
        });
    }

    /**
     * _evaluateLookups - copy of weightEstimatorModal._evaluateLookups for the
     * weightMap / lookupWeight fields (CB accessory WEIGHT (KG) is one):
     * key = the controlling field values joined with '|', looked up in weightMap;
     * any controller still blank -> 0. multiplyBy / baseRatesMap / extraChargesMap /
     * UOM handling reproduced exactly, so a Meters / Pieces / MT row behaves as
     * it does in the estimator. Runs on load and after every change.
     */
    evaluateLookups() {
        const val = (api) => { const v = this.values[api]; return isBlank(v) ? '' : String(v).trim(); };
        this._fields.forEach((f) => {
            if (!(f.weightMap || f.lookupWeight === true)) return;
            const ctrls = Array.isArray(f.controllingFields) ? f.controllingFields
                : (typeof f.controllingFields === 'string' ? f.controllingFields.split(',').map((s) => s.trim())
                : (typeof f.controllingField === 'string' ? f.controllingField.split(',').map((s) => s.trim()) : []));
            if (!ctrls.length) return;
            const current = ctrls.map(val);
            const engineering = current.slice(0, 4);
            if (engineering.some((v) => v === '')) { this.values[f.apiName] = 0; return; }

            const mapKey = engineering.join('|');
            const foundWeight = f.weightMap ? (Number(f.weightMap[mapKey]) || 0) : 0;

            let multVal = 0;
            if (f.multiplyBy) { const m = val(f.multiplyBy); multVal = m !== '' ? Number(m) : 0; }
            else if (f.baseRatesMap) {
                const rateValues = [val('steel_type'), val('designation'), current[1] || '', current[2] || '', current[3] || ''];
                const keys = [rateValues.join('|'), rateValues.slice(0, 4).join('|'), rateValues.slice(0, 3).join('|'), rateValues.slice(0, 2).join('|'), rateValues[0]];
                for (const k of keys) {
                    if (this._baseRates && this._baseRates[k] !== undefined) { multVal = this._baseRates[k]; break; }
                    if (f.baseRatesMap[k] !== undefined) { multVal = f.baseRatesMap[k]; break; }
                }
            }
            if (f.extraChargesMap) { const ef = val('end_finish'); if (ef && f.extraChargesMap[ef]) multVal += f.extraChargesMap[ef]; }

            if (f.multiplyBy || f.baseRatesMap) {
                let uom = val('uom');
                if (uom === '') { this.values[f.apiName] = ''; return; }
                if (!uom) uom = 'Meters';
                const finalRate = uom === 'MT' ? multVal * 1000 : (uom === 'Pieces' ? foundWeight * 6 * multVal : foundWeight * multVal);
                this.values[f.apiName] = Math.round(finalRate * 1000) / 1000;
            } else {
                this.values[f.apiName] = foundWeight;      // plain weight lookup (CB accessories)
            }
        });
    }

    /** modal Apply: pushToParentApiName -> the value lands on the parent key (last visible wins) */
    pushToParents() {
        this._fields.forEach((f) => {
            if (!f.pushToParentApiName) return;
            if (this._visible && this._visible.get(f.apiName) === false) return;
            const v = this.values[f.apiName];
            if (!isBlank(v)) this.values[f.pushToParentApiName] = v;
        });
    }

    // ------------------------------------------------------------ events
    handleInput(event) {
        const api = event.target.dataset.api;
        if (!api) return;
        let v;
        const type = event.target.type;
        if (type === 'checkbox') v = event.target.checked;
        else v = event.target.value;
        if (typeof v === 'string' && v !== '' && type === 'number') v = Number(v);
        this.values[api] = v;
        if (v === '' || v === null || v === undefined) { this._userCleared.add(api); this._editOrder = this._editOrder.filter((k) => k !== api); }
        else { this._userCleared.delete(api); if (this._editOrder.indexOf(api) === -1) this._editOrder.push(api); }
        const def = this._fields.find((f) => f.apiName === api);
        if (def && def.formula) { if (isBlank(v)) this._overrides.delete(api); else this._overrides.add(api); }
        this.clearInvalidDependents(api);
        clearTimeout(this._timer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._timer = setTimeout(() => { this.rebuild(true); this.productPricingFetch(); }, DEBOUNCE_MS);
    }

    /**
     * A number input changes its value when the wheel rolls over it while focused - people
     * scroll the page and quietly change a rate. Blur on wheel: the page scrolls, the value
     * does not move. Arrow keys still work for anyone who wants them.
     */
    handleWheel(event) {
        if (event.target && typeof event.target.blur === 'function') event.target.blur();
    }

    isOpen(key, def) { return this._open[key] === undefined ? def : this._open[key]; }
    toggle(event) {
        const key = event.currentTarget.dataset.key;
        this._open[key] = !(event.currentTarget.dataset.open === 'true');
        this.rebuild(false);
    }

    // ------------------------------------------------------------ state
    /**
     * <textarea value={f.value}> is only an HTML attribute in LWC (compiler warning LWC1057) -
     * a textarea never reads it, so the box stayed EMPTY although the value was in the state:
     * the metadata default (Telecom PAYMENT TERMS "10% advance & 90% payment via RTGS OR LC ...")
     * and any saved Payment Terms / Delivery Details after reopen. Write it into the property
     * after every render - never while the user is typing in that box.
     */
    renderedCallback() {
        const boxes = this.template.querySelectorAll('textarea[data-api]');
        if (!boxes.length || !this.values) return;
        const active = this.template.activeElement;
        boxes.forEach((el) => {
            if (el === active) return;
            const v = this.values[el.dataset.api];
            const want = v === undefined || v === null ? '' : String(v);
            if (el.value !== want) el.value = want;
        });
    }

    @api getState() {
        const inputs = {}, seeds = {}, calc = {};
        this._fields.forEach((f) => {
            if (f.type === 'header' || f.type === 'sub-section-header' || f.type === 'folder') return;
            const v = this.values[f.apiName];
            const ro = f.readOnly === true || f.readOnly === 'true';
            if (ro && !f.formula) { if (!isBlank(v)) seeds[f.apiName] = v; return; }
            if (f.formula && !this._overrides.has(f.apiName)) {
                if (!isBlank(v) && v !== false && v !== 0) calc[f.apiName] = typeof v === 'number' ? Math.round(v * 10000) / 10000 : v;
                return;
            }
            // an unticked checkbox whose default is ON (Telecom "610 GSM", TT "Gantry Structure")
            // must be saved as false, or the default would tick it again on reopen
            if (isBlank(v) || (v === false && this._defaultOf(f) !== true)) return;
            inputs[f.apiName] = v;
        });
        // parent pushes + rate-card scalars that are not fields (Base_Amount__c ...)
        Object.keys(this.values).forEach((k) => {
            if (this._fields.some((f) => f.apiName === k)) return;
            const v = this.values[k];
            if (!isBlank(v) && v !== false) seeds[k] = v;
        });
        return { values: { v: 2, inputs, seeds, calc, overrides: Array.from(this._overrides), cleared: Array.from(this._userCleared) }, errors: this.engineErrors };
    }

    _defaultOf(f) { let v = f.defaultValue; if (v === undefined) v = f.type === 'checkbox' ? false : ''; return v; }

    _hydrate(saved) {
        const base = this.defaults();
        this._overrides = new Set(); this._userCleared = new Set(); this._savedAtOpen = {}; this._rateApplied = {};
        if (!saved) return base;
        if (saved.v === 2) {
            Object.assign(base, saved.seeds || {}, saved.inputs || {});
            this._overrides = new Set(Array.isArray(saved.overrides) ? saved.overrides : []);
            this._userCleared = new Set(Array.isArray(saved.cleared) ? saved.cleared : []);
            // a field the user emptied is not in inputs - blank it again so its default
            // does not creep back in on reopen
            this._userCleared.forEach((api) => { const f = this._fields.find((x) => x.apiName === api); base[api] = f && f.type === 'checkbox' ? false : ''; });
            Object.assign(this._savedAtOpen, saved.seeds || {}, saved.inputs || {});
            return base;
        }
        const full = { ...base, ...saved };
        this._overrides = new Set(Array.isArray(saved._overrides) ? saved._overrides : []);
        delete full._overrides;
        Object.keys(saved).forEach((k) => { if (!isBlank(saved[k])) this._savedAtOpen[k] = saved[k]; });
        return full;
    }

    _readRaw(api) { const v = this.values[api]; return v === undefined ? '' : v; }
    _readStr(api) { const v = this._readRaw(api); return String(v === null || v === undefined ? '' : v).trim(); }
    _readBool(api) { const v = this._readRaw(api); return v === true || v === 'true'; }
    _readNum(api) { const v = this._readRaw(api); if (isBlank(v)) return null; const n = Number(v); return isNaN(n) ? null : n; }
    _hasField(api) { return this._fields.some((f) => f.apiName === api); }
    _isVisible(api) { return this._visible ? this._visible.get(api) !== false : true; }

    // ------------------------------------------------------------ validation (Apply)
    @api validate() {
        this._showErrors = true;
        this.rebuild(false);
        let ok = this._crossErrors.length === 0;
        const check = (f) => { if (f && f.err) ok = false; };
        this.accordions.forEach((a) => {
            if (!a.visible) return;
            check(a.root); (a.inline || []).forEach(check);
            (a.folders || []).forEach((fo) => { if (fo.visible) (fo.groups || []).forEach((g) => (g.fields || []).forEach(check)); });
        });
        return ok;
    }
    @api getErrors() {
        const out = this._crossErrors.map((e) => ({ apiName: e.apiName || '', field: e.title, where: e.where || this.productLabel, message: e.message }));
        const crossApis = new Set(this._crossErrors.map((e) => e.apiName).filter(Boolean));
        this.accordions.forEach((a) => {
            if (!a.visible) return;
            const push = (f, where) => {
                if (!f || !f.err) return;
                if (crossApis.has(f.apiName)) return;      // already reported once, with its full message
                out.push({ apiName: f.apiName, field: (f.label && f.label.trim()) || f.prettyLabel || f.apiName, where, message: f.err });
            };
            push(a.root, a.label); (a.inline || []).forEach((f) => push(f, a.label));
            (a.folders || []).forEach((fo) => { if (fo.visible) (fo.groups || []).forEach((g) => (g.fields || []).forEach((f) => push(f, a.label + ' › ' + fo.label + (g.label ? ' › ' + g.label : '')))); });
        });
        return out;
    }
    @api focusFirstError() {
        const errs = this.getErrors().filter((e) => e.apiName);
        if (!errs.length) return;
        const api = errs[0].apiName;
        // a field inside a folder card lives in the side panel - open it, otherwise the user
        // is told about an error they cannot see
        const loc = this._groupOf(api);
        if (loc && loc.group) {
            this._open[loc.accordion.key] = true;
            this._open[loc.folder.key] = true;
            this._open[loc.group.key] = true;
            if (loc.group.openInModal) this.modalGroupKey = loc.group.key;
            else if (loc.group.linkedInto) this.modalGroupKey = loc.group.linkedInto;
            else if ((loc.group.calcFields || []).some((f) => f.apiName === api)) this.modalGroupKey = loc.group.calcKey;
        }
        this.accordions.forEach((a) => {
            const inAcc = (a.root && a.root.apiName === api) || (a.inline || []).some((f) => f.apiName === api)
                || (a.folders || []).some((fo) => (fo.groups || []).some((g) => (g.fields || []).some((f) => f.apiName === api)));
            if (!inAcc) return;
            this._open[a.key] = true;
            (a.folders || []).forEach((fo) => (fo.groups || []).forEach((g) => { if ((g.fields || []).some((f) => f.apiName === api)) { this._open[fo.key] = true; this._open[g.key] = true; } }));
        });
        this.rebuild(false);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => { const el = this.template.querySelector(`[data-api="${api}"]`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus) el.focus(); } }, 50);
    }

    get hasErrors() { return this.engineErrors && this.engineErrors.length; }
    get errorText() { return (this.engineErrors || []).map((e) => e.apiName + ': ' + e.message).join(' | '); }

    /* ===================== PRODUCT HOOKS ===================== */
    /* TT: month/year -> Transmission_Pricing__mdt (copy of weightEstimatorModal._checkAndFetchPriceVariation) */
    productPricingFetch() { this._checkAndFetchPriceVariation(); }

    async _checkAndFetchPriceVariation() {
        try {
            const has = (api) => this._fields.some((f) => f.apiName === api);
            const getFieldVal = (api) => (api && !isBlank(this.values[api]) ? String(this.values[api]) : '');

            const isTowerPvMode      = has('pvt_price_variable_month') && getFieldVal('pvt_price_basics') === 'Price Variation';
            const isSubstationPvMode = has('pvs_price_variable_month') && getFieldVal('pvs_price_model') === 'Price Variation';
            const hasPvBaseMonth     = has('pv_base_month');

            if (isTowerPvMode) {
                await this._fetchSharedPvRates({ monthApi: 'pvt_price_variable_month', yearApi: 'pvt_price_variable_year',
                    bloomsApi: 'pvt_pv_blooms', billetsApi: 'pvt_pv_billets', zincApi: 'pvt_pv_zinc_value_as_IEEMA', cpiApi: 'pvt_pv_CPI' });
            }
            if (isSubstationPvMode) {
                await this._fetchSharedPvRates({ monthApi: 'pvs_price_variable_month', yearApi: 'pvs_price_variable_year',
                    bloomsApi: 'pvs_pv_blooms', billetsApi: 'pvs_pv_billets', zincApi: 'pvs_pv_zinc_value_as_per_ieema', cpiApi: 'pvs_pv_CPI' });
            }
            if (hasPvBaseMonth) {
                await this._fetchSharedPvRates({ monthApi: 'pv_base_month', yearApi: 'pv_base_year',
                    bloomsApi: 'pv_blooms', billetsApi: 'pv_billets', zincApi: 'pv_zinc', cpiApi: 'pv_consumer_price_index' });
            }
        } catch (e) { /* same as domestic: never break the screen on a pricing fetch */ }
    }

    async _fetchSharedPvRates({ monthApi, yearApi, bloomsApi, billetsApi, zincApi, cpiApi }) {
        const month = isBlank(this.values[monthApi]) ? '' : String(this.values[monthApi]);
        const year  = isBlank(this.values[yearApi]) ? '' : String(this.values[yearApi]);
        if (!month || !year) return;
        const key = monthApi + '|' + month + '|' + year;
        if (this._pvInFlight === key) return;              // avoid duplicate calls for the same keystroke
        this._pvInFlight = key;
        try {
            const d = await getTransmissionPricing({ month, year });
            if (d) {
                const missing = [];
                const put = (api, val, label) => {
                    if (!api || !this._fields.some((f) => f.apiName === api)) return;
                    this.values[api] = Number(val) || 0;                       // domestic fallback: 0
                    if (val === null || val === undefined || val === '') missing.push(label);
                };
                put(bloomsApi,  d.bloomsPrice,  'Blooms');
                put(billetsApi, d.billetsPrice, 'Billets');
                put(zincApi,    d.zincPrice,    'Zinc');
                put(cpiApi,     d.cpiValue,     'CPI');
                this.pricingNote = missing.length
                    ? `No ${missing.join(', ')} rate in Transmission Pricing for ${month} ${year} - those fields are 0. Add the row(s) in Setup or pick another month/year.`
                    : '';
                this.rebuild(true);                                            // re-run the formula engine, like domestic
            }
        } catch (e) {
            this.pricingNote = 'Price variation fetch failed: ' + errMsg(e);
        } finally {
            this._pvInFlight = null;
        }
    }


    /* TT: no extra lines beyond the section-derived ones */
    productExtraLines() { return []; }

    /* TT: Tower / Substation cross rules (createQuote + weightEstimatorModal) - run live and on Apply */
    productValidate() {
        if (this._validateTowerSubstationPriceBasis()) this._validateTowerSubstationPaymentTerms();
        this._validateFreightTermConsistency();
    }

    /**
     * Ex-works / F.O.R must be the same everywhere on the quote - the same rule Crash Barrier
     * uses. Transmission Tower normally carries one Incoterms picklist, but any section that
     * has its own term (or a second product type entered earlier on this quote) has to agree
     * with the one entered first. Amounts (Transportation KG, Full Vehicle Freight) are never
     * compared - they are calculated per section and legitimately differ.
     */
    _validateFreightTermConsistency() {
        const R1 = /^Incoterms$|trans_in_offer|freight_incoterms/i;
        const norm = (v) => String(v).trim();
        const inactive = this._inactiveFields();
        const mine = this._fields.filter((f) => f.type === 'picklist' && R1.test(f.apiName) && !/_header$/i.test(f.apiName)
            && !inactive.has(f.apiName) && this._isVisible(f.apiName));
        if (mine.length < 2 && !this._fields.some((f) => R1.test(f.apiName) && inactive.has(f.apiName) && !isBlank(this.values[f.apiName]))) return;
        let master = null, where = 'the section entered first';
        for (const api of this._editOrder) {
            if (!R1.test(api) || /_header$/i.test(api)) continue;
            if (isBlank(this.values[api])) continue;
            master = norm(this.values[api]);
            const loc = this._groupOf(api);
            where = loc && loc.group ? loc.group.label : 'the section entered first';
            break;
        }
        this._fields.forEach((f) => {
            if (master !== null) return;
            if (!R1.test(f.apiName) || /_header$/i.test(f.apiName) || !inactive.has(f.apiName)) return;
            if (!isBlank(this.values[f.apiName])) master = norm(this.values[f.apiName]);
        });
        if (master === null) {
            const first = mine.find((f) => !isBlank(this.values[f.apiName]));
            if (!first) return;
            master = norm(this.values[first.apiName]);
        }
        mine.forEach((f) => {
            if (/^freight_incoterms$/i.test(f.apiName)) return;   // mirror of a section, not a choice
            const v = this.values[f.apiName];
            if (isBlank(v) || norm(v) === master) return;
            const label = /^Incoterms$/i.test(f.apiName) ? 'Incoterms' : 'Trans.in offer?';
            this._crossFields.push(f.apiName);
            this._crossErrors.push({ title: 'Freight term', where: 'Freight', apiName: f.apiName,
                inline: `Must be "${master}"`, message: `${label} must be "${master}" - same as ${where}` });
        });
    }

    /** Tower and Substation must share one Price Basis (PV vs FIRM). */
    _validateTowerSubstationPriceBasis() {
        const TOWER_API = 'pvt_price_basics', SUBSTATION_API = 'pvs_price_model';
        if (!this._hasField(TOWER_API) && !this._hasField(SUBSTATION_API)) return true;
        const towerBasis = this._readStr(TOWER_API), substationBasis = this._readStr(SUBSTATION_API);
        if (!towerBasis || !substationBasis) return true;
        const normalise = (v) => v.toUpperCase().replace(/\s+/g, ' ');
        if (normalise(towerBasis) === normalise(substationBasis)) return true;
        this._crossFields = [TOWER_API, SUBSTATION_API];
        this._crossErrors.push({
            title: 'Price Basis Mismatch',
            message: `Tower is set to "${towerBasis}" but Substation is set to "${substationBasis}". Both must use the same Price Basis. Please correct one of them before saving.`
        });
        return false;
    }

    /** Same PRICE MODULE / month / year on PV, same Payment Terms + details. */
    _validateTowerSubstationPaymentTerms() {
        const TOWER_BASIS_API = 'pvt_price_basics', SUBSTATION_BASIS_API = 'pvs_price_model';
        if (!this._hasField(TOWER_BASIS_API) && !this._hasField(SUBSTATION_BASIS_API)) return true;
        const normalise = (v) => v.toUpperCase().replace(/\s+/g, ' ');
        const towerBasis = normalise(this._readStr(TOWER_BASIS_API));
        const substationBasis = normalise(this._readStr(SUBSTATION_BASIS_API));
        const towerPrefix = towerBasis === 'FIRM' ? 'pvt_firm_' : towerBasis === 'PRICE VARIATION' ? 'pvt_pv_' : null;
        const substationPrefix = substationBasis === 'FIRM' ? 'pvs_firm_' : substationBasis === 'PRICE VARIATION' ? 'pvs_pv_' : null;
        if (!towerPrefix || !substationPrefix) return true;
        if (towerPrefix.startsWith('pvt_firm_') !== substationPrefix.startsWith('pvs_firm_')) return true;

        if (towerPrefix === 'pvt_pv_') {
            const towerModule = this._readStr('pvt_price_module'), substationModule = this._readStr('pvs_price_module');
            const towerMonth = this._readStr('pvt_price_variable_month'), substationMonth = this._readStr('pvs_price_variable_month');
            const towerYear = this._readStr('pvt_price_variable_year'), substationYear = this._readStr('pvs_price_variable_year');
            const pvProblems = [];
            if (towerModule && substationModule && towerModule !== substationModule) pvProblems.push(`PRICE MODULE (Tower: "${towerModule}", Substation: "${substationModule}")`);
            if (towerMonth && substationMonth && towerMonth !== substationMonth) pvProblems.push(`PRICE VARIATION (MONTH) (Tower: "${towerMonth}", Substation: "${substationMonth}")`);
            if (towerYear && substationYear && towerYear !== substationYear) pvProblems.push(`PRICE VARIABLE (YEAR) (Tower: "${towerYear}", Substation: "${substationYear}")`);
            if (pvProblems.length) {
                if (towerModule !== substationModule) this._crossFields.push('pvt_price_module', 'pvs_price_module');
                if (towerMonth !== substationMonth) this._crossFields.push('pvt_price_variable_month', 'pvs_price_variable_month');
                if (towerYear !== substationYear) this._crossFields.push('pvt_price_variable_year', 'pvs_price_variable_year');
                this._crossErrors.push({
                    title: 'Price Variation Details Mismatch',
                    message: `Both Tower and Substation are on Price Variation, but the following details differ: ${pvProblems.join('; ')}. These must be identical between Tower and Substation. Please correct one of them before saving.`
                });
                return false;
            }
        }

        const towerInterestOn = this._readBool(`${towerPrefix}interest_component`);
        const substationInterestOn = this._readBool(`${substationPrefix}interest_component`);
        // createQuote._validateTowerSubstationInterestFinal: the checkbox itself must match
        if (towerInterestOn !== substationInterestOn) {
            const onSide = towerInterestOn ? 'Tower' : 'Substation';
            const offSide = towerInterestOn ? 'Substation' : 'Tower';
            this._crossFields.push(`${towerPrefix}interest_component`, `${substationPrefix}interest_component`);
            this._crossErrors.push({
                title: 'Payment Terms Mismatch',
                message: `${onSide} has "Interest Component (as per respective payment terms)?" checked, but ${offSide} does not. Both Tower and Substation must use the same Interest Component setting before this quote can be saved.`
            });
            return false;
        }
        if (!towerInterestOn && !substationInterestOn) return true;

        const towerTerm = this._readStr(`${towerPrefix}payment_terms`);
        const substationTerm = this._readStr(`${substationPrefix}payment_terms`);
        if (!towerTerm || !substationTerm) return true;
        if (towerTerm !== substationTerm) {
            this._crossFields.push(`${towerPrefix}payment_terms`, `${substationPrefix}payment_terms`);
            this._crossErrors.push({
                title: 'Payment Terms Mismatch',
                message: `Tower Payment Terms is "${towerTerm}" but Substation Payment Terms is "${substationTerm}". Both must use the same Payment Terms. Please correct one of them before saving.`
            });
            return false;
        }

        const NEEDS_DETAIL = ['Against LC Before Dispatch', 'Against VFS'];
        if (!NEEDS_DETAIL.includes(towerTerm)) return true;

        const towerDays = this._readNum(`${towerPrefix}no_of_days`), substationDays = this._readNum(`${substationPrefix}no_of_days`);
        const towerRate = this._readNum(`${towerPrefix}prevailing_rate_of_bank_interest`), substationRate = this._readNum(`${substationPrefix}prevailing_rate_of_bank_interest`);
        const problems = [];
        if (towerDays !== null && substationDays !== null && towerDays !== substationDays) problems.push(`No Of Days (Tower: ${towerDays}, Substation: ${substationDays})`);
        if (towerRate !== null && substationRate !== null && Math.abs(towerRate - substationRate) > 0.00005) problems.push(`Prevailing Rate of Bank Interest (Tower: ${towerRate}%, Substation: ${substationRate}%)`);
        if (problems.length) {
            if (towerDays !== substationDays) this._crossFields.push(`${towerPrefix}no_of_days`, `${substationPrefix}no_of_days`);
            if (towerRate !== substationRate) this._crossFields.push(`${towerPrefix}prevailing_rate_of_bank_interest`, `${substationPrefix}prevailing_rate_of_bank_interest`);
            this._crossErrors.push({
                title: 'Payment Terms Detail Mismatch',
                message: `Both sides use Payment Terms "${towerTerm}", but the following details differ: ${problems.join('; ')}. These must be identical between Tower and Substation. Please correct one of them before saving.`
            });
            return false;
        }
        return true;
    }


}

/* ---------------------------------------------------------------- helpers */
function safeParse(s) { if (!s) return null; if (typeof s === 'object') return s; try { return JSON.parse(s); } catch (e) { return null; } }
function errMsg(e) { return (e && e.body && e.body.message) || (e && e.message) || String(e); }
function chev(open) { return open ? 'utility:chevrondown' : 'utility:chevronright'; }
function fmt(n) { return isFinite(n) ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''; }
function flatten(obj, out = {}) {
    Object.keys(obj).forEach((k) => { const v = obj[k]; if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, out); else out[k] = v; });
    return out;
}

/* =====================================================================
   ENGINE - visibility + formulas + line derivation (shared logic)
   ===================================================================== */
const PASSES = 6;
const IDENT = /[A-Za-z_$][A-Za-z0-9_$]*/g;
const JS_RESERVED = new Set(['Math', 'Number', 'String', 'Boolean', 'parseFloat', 'parseInt', 'isNaN', 'isFinite', 'true', 'false', 'null', 'undefined', 'typeof', 'Infinity', 'NaN', 'Array', 'Object', 'JSON', 'Date', 'round', 'max', 'min', 'abs', 'floor', 'ceil', 'pow', 'sqrt', 'toFixed']);

function isBlank(v) { return v === undefined || v === null || v === '' || (typeof v === 'number' && isNaN(v)); }
function truthy(v) { return v === true || v === 'true' || v === 1 || v === '1'; }

function collectFields(node, out = []) {
    if (Array.isArray(node)) node.forEach((n) => collectFields(n, out));
    else if (node && typeof node === 'object') {
        if (node.apiName) out.push(node);
        Object.keys(node).forEach((k) => { const v = node[k]; if (v && typeof v === 'object') collectFields(v, out); });
    }
    return out;
}

/**
 * The modal's _evaluateFieldVisibility, verbatim in spirit:
 *  - no controllingField -> visible; forceHidden -> hidden
 *  - comma list = OR; "!api" = force hide when that parent has a value
 *  - parent missing from the field set -> that parent contributes nothing
 *  - '*' = parent has a value; ">=N"; otherwise case-insensitive equality
 *  - checkbox parent value compared as "true"/"false"; headers bypass the
 *    parentHasValue requirement
 *  - a group may declare controllingOperator 'AND'
 */
function computeVisible(def, values, fields) {
    if (!def) return true;
    if (def.forceHidden) return false;
    if (!def.controllingField) return true;
    const parents = String(def.controllingField).split(',').map((s) => s.trim()).filter(Boolean);
    const isAnd = String(def.controllingOperator || '').toUpperCase() === 'AND';
    const wanted = (Array.isArray(def.controllingValues) ? def.controllingValues : (def.controllingValues !== undefined ? [def.controllingValues] : ['*']));
    const safeWanted = wanted.map((v) => String(v).toLowerCase());
    let anyVisible = false, allVisible = true, forceHide = false;
    parents.forEach((raw) => {
        const neg = raw.startsWith('!');
        const api = neg ? raw.substring(1) : raw;
        const pdef = fields.find((f) => f.apiName === api);
        if (!pdef && !(api in values)) { allVisible = false; return; }
        const pv = values[api];
        const isCheckbox = pdef && pdef.type === 'checkbox';
        const hasValue = isCheckbox ? pv === true : !isBlank(pv);
        if (neg && hasValue) { forceHide = true; return; }
        if (!neg && (hasValue || def.type === 'header')) {
            const rawVal = isCheckbox ? String(pv || false) : (isBlank(pv) ? '' : String(pv));
            const safe = rawVal.toLowerCase();
            const matchedNum = safeWanted.some((cv) => cv.startsWith('>=') && !isNaN(Number(pv)) && Number(pv) >= Number(cv.substring(2)));
            const matched = safeWanted.includes('*') ? hasValue : (matchedNum || safeWanted.includes(safe));
            if (matched) anyVisible = true; else allVisible = false;
        } else { allVisible = false; }
    });
    if (forceHide) return false;
    return isAnd ? (allVisible && parents.length > 0) : anyVisible;
}

function compileFormulas(fields) {
    const compiled = new Map(); const identifiers = new Set();
    fields.forEach((f) => {
        if (!f.formula || typeof f.formula !== 'string') return;
        const deps = new Set();
        (f.formula.match(IDENT) || []).forEach((id) => { if (!JS_RESERVED.has(id) && !/^\d/.test(id)) deps.add(id); });
        deps.forEach((d) => identifiers.add(d));
        compiled.set(f.apiName, { deps: Array.from(deps), src: f.formula, fn: null });
    });
    return { compiled, identifiers };
}
function getFn(entry) {
    if (entry.fn) return entry.fn;
    // eslint-disable-next-line no-new-func
    entry.fn = new Function(...entry.deps, 'return (' + entry.src + ');');
    return entry.fn;
}
function normaliseNumber(v) { if (typeof v === 'number') return isFinite(v) ? v : ''; return v; }

/**
 * Visibility + formulas to a fixpoint.
 * keepValues  - fields of a non-active config: never re-seeded
 * savedAtOpen - hidden non-formula fields keep a saved value (CROSS PRODUCT rule)
 * userCleared - a field the user emptied does not get its default back
 */
/** a number-type field's value as the formula must see it: blank = 0, numeric string = number, anything else untouched */
function numArg(v) {
    if (v === '' || v === null || v === undefined) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') { const t = v.trim(); if (t === '') return 0; const n = Number(t); return isNaN(n) ? v : n; }
    return v;
}
function evaluate(fields, values, compiled, overrides, keepValues, savedAtOpen, userCleared) {
    const errors = [];
    const byName = new Map(fields.map((f) => [f.apiName, f]));
    const numericFields = new Set(fields.filter((f) => String(f.type || '').toLowerCase() === 'number').map((f) => f.apiName));
    const visible = new Map();
    for (let pass = 0; pass < PASSES; pass++) {
        let changed = false;
        fields.forEach((f) => {
            const vis = computeVisible(f, values, fields);
            visible.set(f.apiName, vis);
            const isHeader = f.type === 'header' || f.type === 'sub-section-header' || f.type === 'folder';
            if (isHeader) return;
            if (keepValues && keepValues.has(f.apiName)) return;
            const cleared = userCleared && userCleared.has(f.apiName);
            if (!vis) {
                const hasSaved = savedAtOpen && !isBlank(savedAtOpen[f.apiName]);
                if (!f.formula && !hasSaved) {
                    const seed = (!cleared && !isBlank(f.defaultValue)) ? f.defaultValue : (f.type === 'checkbox' ? false : '');
                    if (values[f.apiName] !== seed && !(isBlank(values[f.apiName]) && isBlank(seed))) { values[f.apiName] = seed; changed = true; }
                }
            } else if (!cleared && isBlank(values[f.apiName]) && !isBlank(f.defaultValue) && !f.formula) {
                values[f.apiName] = f.defaultValue; changed = true;   // _restoreDefaultIfEmpty
            }
        });
        compiled.forEach((entry, apiName) => {
            const f = byName.get(apiName);
            if (!f) return;
            if (overrides && overrides.has(apiName)) return;
            try {
                // A number-type field enters a formula AS A NUMBER: JSON defaults are strings ("10",
                // "110000"), saved inputs may be too, a blank field is "". JavaScript would then
                // CONCATENATE (price + "10" + margin) instead of adding - the same defect fixed in
                // the Crash Barrier child (bugs 8/9/10). Picklists / text stay exactly as they are.
                const args = entry.deps.map((d) => (numericFields.has(d) ? numArg(values[d]) : (values[d] === undefined ? undefined : values[d])));
                let out = getFn(entry)(...args);
                out = normaliseNumber(out);
                if (out === undefined) out = '';
                const prev = values[apiName];
                if (prev !== out && !(isBlank(prev) && isBlank(out))) { values[apiName] = out; changed = true; }
            } catch (e) { errors.push({ apiName, message: e && e.message ? e.message : String(e) }); }
        });
        if (!changed) break;
    }
    return { visible, errors };
}

/** A calculation detail = formula-driven field the user is not meant to type into:
 *  readOnly, or no required/min rule on it. Unit price / cost / qty / margin always stay. */
/**
 * "Calculation field" = what the domestic estimator groups under a WEIGHT CALCULATION /
 * PRICE CALCULATION / RATE CARD heading. Those hide with the toggle, headings included.
 * A read-only figure that sits in the working row (WEIGHT, RATE/RM, NUTS & BOLTS) is NOT
 * a calculation detail - it stays on screen, exactly as in the estimator.
 */
const CALC_SECTION = /calculat|rate\s*card|pricing/i;
function isCalcDetail(f, sectionLabel, inTable) {
    if (!f) return false;
    if (f.isUnitPrice || f.isUnitCost || f.isQuantity || f.isMargin) return false;
    if (CALC_SECTION.test(String(sectionLabel || ''))) return true;      // WEIGHT / PRICE CALCULATION, RATE CARD
    const ro = f.readOnly === true || f.readOnly === 'true';
    // a computed read-only figure is a calculation detail, EXCEPT inside a table row where
    // it is part of the working line (WEIGHT, RATE/RM, NUTS & BOLTS)
    return !inTable && ro && !!f.formula;
}
function r2(n) { return Math.round(n * 100) / 100; }

function multiplierSuffixes(cfg, values) {
    if (!cfg) return null;
    const out = [];
    ((cfg.flat && cfg.flat.sources) || []).forEach((s) => { if (truthy(values[s.apiName])) out.push(s.label); });
    const groups = (cfg.cartesian && cfg.cartesian.groups) || [];
    if (groups.length) {
        let combos = [[]];
        groups.forEach((g) => {
            const active = (g.sources || []).filter((s) => truthy(values[s.apiName])).map((s) => s.label);
            if (!active.length) { combos = []; return; }
            const next = []; combos.forEach((c) => active.forEach((a) => next.push(c.concat(a)))); combos = next;
        });
        combos.forEach((c) => { if (c.length) out.push(c.join(' | ')); });
    }
    return out;
}

const LINE_FLAG = (f) => f.isWeightTotal || f.isUnitPrice || f.isUnitCost || f.isQuantity || f.isListPrice || f.isRealization || f.isMargin || f.isDiscount
    || (f.apiName && (/unit_price$/i.test(f.apiName) || /unit_cost$/i.test(f.apiName) || /list_price$/i.test(f.apiName)));

/**
 * The modal's Apply line builder, per section (group):
 *   name = "<modal title without 'WEIGHT ESTIMATOR - '> - <section label without leading numbering>"
 *   fields read by flag OR api suffix, hidden sections with line flags read too,
 *   line only when the section has line flags and weight/unitPrice/unitCost > 0.
 */
function deriveLines(productCode, accordions, values, visible) {
    const lines = [];
    accordions.forEach((acc) => {
        (acc.folders || []).forEach((folder) => {
            if (!folder.visible) return;
            const title = String(folder.title || folder.label || '').replace('WEIGHT ESTIMATOR - ', '').trim();
            const suffixes = multiplierSuffixes(folder.multiplier, values);
            (folder.groups || []).forEach((g) => {
                if (!g.visible) return;
                const raw = g.rawFields || [];
                if (!raw.some(LINE_FLAG)) return;
                const readHidden = g.render === false || raw.some((f) => f.isVisible === false || f.forceHidden);
                let weight = 0, qty = 1, realization = 0, unitPrice = 0, unitCost = 0, listPrice = 0, discount = 0, margin = 0, uom = '', designation = '';
                const metricApis = {};      // which field supplied each metric - used to outline the exact input
                raw.forEach((f) => {
                    if (!f.apiName || f.type === 'header' || f.type === 'sub-section-header') return;
                    if (visible.get(f.apiName) === false && !readHidden) return;
                    const v = values[f.apiName]; const lower = f.apiName.toLowerCase();
                    if (f.isWeightTotal || lower.endsWith('_weight')) { weight = Number(v) || weight; metricApis.weight = f.apiName; }
                    if (f.isQuantity || lower.includes('quantity')) { qty = Number(v) || qty; metricApis.quantity = f.apiName; }
                    if (f.isRealization) { realization = Number(v) || 0; metricApis.realization = f.apiName; }
                    if (f.isUnitPrice || lower.endsWith('unit_price')) { unitPrice = Number(v) || unitPrice; metricApis.unitprice = f.apiName; }
                    if (f.isUnitCost || lower.endsWith('unit_cost')) { unitCost = Number(v) || unitCost; metricApis.unitcost = f.apiName; }
                    if (f.isListPrice || lower.endsWith('list_price')) listPrice = Number(v) || listPrice;
                    if (f.isDiscount || lower.endsWith('discount')) { discount = Number(v) || discount; metricApis.discount = f.apiName; }
                    if (f.isMargin || lower.endsWith('margin')) { margin = Number(v) || margin; metricApis.margin = f.apiName; }
                    if (lower.endsWith('designation')) designation = isBlank(v) ? '' : String(v);
                    if (lower.endsWith('uom')) uom = isBlank(v) ? '' : String(v);
                });
                // the modal names the line from the section label AFTER labelFormat resolution
                const cleanLabel = String(g.label || g.rawLabel || '').replace(/^[0-9.]+\s*/, '').trim();
                if (cleanLabel === '') return;
                if (!(weight > 0 || unitPrice > 0 || unitCost > 0 || designation !== '')) return;
                const base = { id: productCode + ':' + (g.key || cleanLabel), product: productCode, accordion: acc.label, group: cleanLabel, sectionKey: g.key || cleanLabel, folderKey: folder.key + '@' + (folder.ruleKey || ''), metricApis,
                    name: (title ? title + ' - ' : '') + cleanLabel, weight, quantity: qty, realization,
                    unitPrice: r2(unitPrice), unitCost: r2(unitCost), listPrice: r2(listPrice), discount, margin, uom };
                if (!suffixes) lines.push(base);
                else suffixes.forEach((sfx) => lines.push({ ...base, id: base.id + ':' + sfx, name: base.name + ' [' + sfx + ']', suffix: sfx }));
            });
        });
    });
    return lines;
}