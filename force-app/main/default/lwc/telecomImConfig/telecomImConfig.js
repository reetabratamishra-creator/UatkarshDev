/**
 * telecomImConfig - the Telecom Tower product (cross product: Angular / Tubular /
 * Tubular Signalling on one quote) inside the International Marketing quote.
 *
 * Same engine as tpImConfig / crashBarrierImConfig (sections, folders, groups, blueprint
 * cloneFrom, visibility, rate cards, line items per section, product-type chips, drafts,
 * approval highlight). The engine itself is unchanged; the Telecom bits are:
 *   - "Sales Region" (Telecom Tower Details) only offers Domestic: fixed to that value and
 *     never shown, and its accordion (nothing else in it) is not drawn. The other two
 *     accordions (Telecom Product Type, Project Setup Details) are gated on it.
 *   - per-type rate cards: the rule value ("Angular") is asked as "Angular Tower" first (the
 *     Quote Rate Card Manager's Department__c), IM twin before domestic, then as "Angular".
 *   - every computed figure (read-only formula: WT / TOTAL / TOTAL RM COST / RATE PER MT /
 *     BASIC RATE / interest ...) lives in the section's "Calculations" modal; the card keeps
 *     the inputs, the reference rates and the checkboxes. Section cards collapse.
 *   - line names come out exactly as the domestic TelecomDocumentController parses them:
 *     "<Angular|Tubular|Tubular Signalling> - <product> - <gsm> GSM[ (AWT)]",
 *     "MINIMUM GUARANTEED LOADABILITY - ...", "PER METRIC TON RATE - ...".
 */
import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getProductConfiguration from '@salesforce/apex/InternationalQuoteController.getProductConfiguration';
import fetchBlueprintPayload from '@salesforce/apex/CreateQuoteController.fetchBlueprintPayload';
// IM twin first (Price_Calculator__mdt Department__c = 'IM - <name>'), domestic row as fallback
import getRateCardJson from '@salesforce/apex/InternationalQuoteController.getImRateCardJson';
import getPricingRates from '@salesforce/apex/InternationalQuoteController.getImPricingRates';
import getOpportunityAccountAddress from '@salesforce/apex/CreateQuoteController.getOpportunityAccountAddress';

/* ================= product-specific constants ================= */
const PRODUCT = { code: 'TEL', label: 'Telecom Tower', sourceTemplate: 'Telecom Tower - Department' };
/* department-level card (fallback only; the real rates are per product type) */
const RATE_CARD_DEPTS = ['Telecom Tower - Department', 'Telecom Tower'];
/* rule controlling value -> Price_Calculator__mdt.Department__c of that type's rate card
   (the Quote Rate Card Manager writes Telecom_Angular_Tower with Department "Angular Tower" ...).
   Both names are tried, the mapped one first, so an org keyed by the bare value still works. */
const TEL_RATE_DEPT = { 'Angular': 'Angular Tower', 'Tubular': 'Tubular Tower', 'Tubular Signalling': 'Tubular Signalling Tower' };
/* accordion root pickers fixed to one value and never shown on this tab */
const SALES_REGION_API = 'Sales_Region_Telecom_Tower';
const FIXED_PICKS = { [SALES_REGION_API]: 'Domestic' };


const DEBOUNCE_MS = 120;
/* Units the Telecom JSON leaves unsaid; a unit the JSON DOES give always wins. */
const UNIT_HINTS = [
    [/_bank_int_rate$|_margin$|_margin_awt$|_percent$/i, '%'],
    [/_tower_weight\d+$/i, 'MT'],
    [/^(tub|tsg)_tower_weight$|_wt$/i, 'kg'],
    [/_com$/i, '%'],
    [/_rate_per_mt\d+_\d+$/i, 'INR / MT'],
    [/_(pipe|plate|ang_chan|misc_chan)_rate$|_rate_kg_value$/i, 'INR / kg'],
    [/_rmc$|_zinc_value$|_without_bom_value1$|_fabrication_cost$|_labour_cost$/i, 'INR'],
    [/_basic_rate\d+_\d+$|_total_value\d+_\d+$|_total$|_total_rm_cost_value$|_total_zinc_value$|_zinc_value_addition_amt$/i, 'INR'],
    [/_quantity\d*$/i, 'nos'],
    [/_payment_terms_days$/i, 'days'],
    [/_vehicle_loadability_\d+$/i, 'MT'],
    [/_minimum_guranteed_freight_\d+$|_rate_per_ton_\d+$/i, 'INR / MT']
];
/* money figures (their INR value is also shown in the quote currency) */
const isInrUnit = (u) => /^INR/.test(String(u || ''));
/* Telecom Tower validators - copies of weightEstimatorModal / createQuote (rajeev 10 / 14 Sep 2026) */
const TELECOM_PRODUCTS = [
    { name: 'Angular',            pfx: 'agl_' },
    { name: 'Tubular',            pfx: 'tub_' },
    { name: 'Tubular Signalling', pfx: 'tsg_' }
];
const TELECOM_COMPOSITION_GROUPS = {
    'Tubular':            ['tub_pipe_com', 'tub_plate_com', 'tub_ang_chan_com', 'tub_misc_com'],
    'Tubular Signalling': ['tsg_pipe_com', 'tsg_plate_com', 'tsg_ang_chan_com', 'tsg_misc_com']
};
const TELECOM_COMPOSITION_APIS = [].concat(...Object.values(TELECOM_COMPOSITION_GROUPS));
function unitHint(apiName) { const hit = UNIT_HINTS.find(([re]) => re.test(String(apiName || ''))); return hit ? hit[1] : ''; }

/* spread cells over the 12-unit row grid (same maths as _telecomLayout's respan) */
function respanFor(span) {
    return (cells) => {
        const total = cells.reduce((a, x) => a + x.w, 0) || 1;
        let used = 0;
        return cells.map((x, i) => {
            const w = i === cells.length - 1 ? 12 - used : Math.max(1, Math.round((x.w * 12) / total));
            used += w;
            return { ...x.c, spanStyle: '--sp:' + w + ';', cls: String(x.c.cls || '').replace(/im-span\d+/g, '').trim() + ' im-span' + w };
        });
    };
}

export default class TelecomImConfig extends LightningElement {
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

    // Telecom: every computed figure always sits in the section's "Calculations" modal - the
    // parent's "Show calculation fields" toggle neither hides them nor puts them inline
    _showCalc = true;
    @api get showCalc() { return true; }
    set showCalc(v) { /* fixed on */ }

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
            this._prepareFixedRoots(cfg.logicRules || []);
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

    /**
     * Telecom: the "Telecom Tower Details" accordion is only the Sales Region picker that
     * gates the other two accordions. On the International tab it is fixed to its single
     * option, so the sections it controls open straight away, and the accordion itself
     * (nothing else in it) is not drawn. A section whose root api is not set in metadata but
     * is referenced by the other sections' Controlling_Field__c gets that api.
     */
    _prepareFixedRoots(rules) {
        const referenced = new Set();
        this._sectionsMdt.forEach((s) => { if (s.Controlling_Field__c) String(s.Controlling_Field__c).split(',').forEach((x) => referenced.add(x.trim().replace(/^!/, ''))); });
        const defined = new Set(this._sectionsMdt.map((s) => s.First_Field_API_Name__c).filter(Boolean));
        const orphan = [...referenced].find((api) => !defined.has(api));
        const ruleSecs = new Set(rules.map((r) => r.Accordion_Section__c));
        this._sectionsMdt = this._sectionsMdt.map((s) => {
            const sec = { ...s };
            if (!sec.First_Field_API_Name__c && orphan && FIXED_PICKS[orphan] !== undefined) sec.First_Field_API_Name__c = orphan;
            if (sec.First_Field_API_Name__c && FIXED_PICKS[sec.First_Field_API_Name__c] !== undefined) sec._imHidden = !ruleSecs.has(sec.Id);
            return sec;
        });
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
                // the type's card may be keyed "Angular Tower" (Quote Rate Card Manager) or "Angular"
                const names = [...new Set([TEL_RATE_DEPT[cv], cv].filter(Boolean))];
                let rec = null;
                for (const nm of names) {
                    const r = await getPricingRates({ departmentName: nm });
                    if (r && (r.JSON_Payload__c || r.Department__c)) { rec = r; break; }
                }
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
                // the two pickers are fixed: one option each, pre-selected, never shown
                if (FIXED_PICKS[tf.apiName] !== undefined) {
                    tf.options = [FIXED_PICKS[tf.apiName]]; tf.defaultValue = FIXED_PICKS[tf.apiName]; tf.forceHidden = true; tf.required = false;
                }
                if (tf.type !== 'folder' || !tf.modalConfigsByValue) return;
                Object.keys(tf.modalConfigsByValue).forEach((k) => {
                    const cfg = tf.modalConfigsByValue[k];
                    if (!cfg || !Array.isArray(cfg.modalFields)) return;
                    cfg.modalFields = cfg.modalFields.map((g) => this.cloneGroupFromBlueprint(g, bp, cfg.modalFields));
                    cfg.modalFields.forEach((g) => { g.fields = this.flattenSubSections(g.fields || []); });
                    // every repeater of this folder shares the column index (item n of the pole,
                    // item n of its Special Description), so a formula in one may read the
                    // other's field of the SAME column: prefix against the union of their names
                    const colNames = new Set();
                    cfg.modalFields.forEach((g) => (g.fields || []).forEach((f) => { if (String(f.type || '').toLowerCase() === 'column-repeater') (f.fields || []).forEach((x) => { if (x && x.apiName) colNames.add(x.apiName); }); }));
                    cfg.modalFields.forEach((g) => this.expandRepeater(g, colNames));
                    if (rates) cfg.modalFields.forEach((g) => this.applyRateCard(g.fields, rates));
                });
            });
        });
    }

    /**
     * COLUMN-REPEATER (the Transmission Pole blueprint): a group whose single entry is
     *   { type: 'column-repeater', countApiName, maxColumns, fields: [...template...] }
     * is one ITEM per column - "No. of Items (Segment 1)" says how many. The domestic
     * estimator stores column n of field X as c{n}_X (the offer / weight-calc PDFs read
     * c1_tp_height_of_pole, c2_tp_unit_price ...), so the same keys are produced here:
     *   - every template field is cloned once per column 1..maxColumns as c{n}_<apiName>
     *   - a formula / controllingField / disableControllingField that names a template
     *     field is re-pointed at the SAME column's copy (c{n}_), anything else (Base_Amount__c,
     *     tp_wind_speed ...) is left as it is - shared by every column
     *   - column n is visible only while countApiName >= n (">=n" gate, the engine's own
     *     rule), so a column that disappears is reset like any hidden field
     * The group keeps the template in `repeater` so the renderer can lay the columns out
     * side by side and the line builder can read one line per column.
     */
    expandRepeater(g, columnNames) {
        const rep = (g.fields || []).find((f) => String(f.type || '').toLowerCase() === 'column-repeater');
        if (!rep) return;
        const template = (rep.fields || []).filter((f) => f && f.apiName);
        const names = new Set(template.map((f) => f.apiName));
        (columnNames || []).forEach((n) => names.add(n));
        const max = Math.max(1, Math.min(10, Number(rep.maxColumns) || 10));
        const countApi = rep.countApiName;
        const others = (g.fields || []).filter((f) => f !== rep);
        const out = [];
        const re = /[A-Za-z_$][A-Za-z0-9_$]*/g;
        const prefixExpr = (src, n) => String(src).replace(re, (id) => (names.has(id) ? 'c' + n + '_' + id : id));
        const prefixRef = (v, n) => {
            if (Array.isArray(v)) return v.map((x) => prefixRef(x, n));
            if (typeof v !== 'string') return v;
            return v.split(',').map((x) => { const t = x.trim(); const neg = t.startsWith('!'); const api = neg ? t.substring(1) : t; return (neg ? '!' : '') + (names.has(api) ? 'c' + n + '_' + api : api); }).join(',');
        };
        for (let n = 1; n <= max; n++) {
            template.forEach((tf) => {
                const c = JSON.parse(JSON.stringify(tf));
                c.apiName = 'c' + n + '_' + tf.apiName;
                c._repCol = n; c._repBase = tf.apiName; c._repGroup = g.id || g.label;
                if (typeof c.formula === 'string') c.formula = prefixExpr(c.formula, n);
                ['controllingField', 'disableControllingField', 'multiplyBy', 'pushToParentApiName'].forEach((k) => { if (c[k]) c[k] = prefixRef(c[k], n); });
                if (c.controllingFields) c.controllingFields = prefixRef(c.controllingFields, n);
                if (c.labelsByController && c.labelsByController.controllingApi) c.labelsByController = { ...c.labelsByController, controllingApi: prefixRef(c.labelsByController.controllingApi, n) };
                // the column exists while the item count reaches it
                if (countApi) {
                    if (c.controllingField) {
                        // keep the field's own gate AND add the column gate (both must hold)
                        const own = Array.isArray(c.controllingValues) ? c.controllingValues : (c.controllingValues !== undefined ? [c.controllingValues] : ['*']);
                        c.controllingField = countApi + ',' + c.controllingField;
                        c.controllingValues = ['>=' + n].concat(own);
                        c.controllingOperator = 'AND';
                    } else {
                        c.controllingField = countApi; c.controllingValues = ['>=' + n];
                    }
                }
                out.push(c);
            });
        }
        g.fields = others.concat(out);
        // the template is kept as text: collectFields() walks every object in the payload
        // and must not index the un-prefixed template names as fields of their own
        g.repeater = { countApi, max, key: g.id || g.label,
            templateJson: JSON.stringify(template.map((f) => ({ apiName: f.apiName, label: f.label, type: f.type, unit: f.unit || '', required: f.required === true || f.required === 'true' }))) };
    }

    /**
     * One ITEM per column, side by side - the domestic column-repeater look. Rows are the
     * template fields (label in the first column), columns are the items 1..count. A row
     * whose every cell is hidden (calc toggle) is dropped. The cells are also returned flat
     * in `fields`, so validation, error focus and the approval outline treat them like any
     * other cell of the group; the grid body is not drawn for a repeater group.
     */
    renderRepeaterGroup(g, visible) {
        if (!this.fieldVisible(g)) return null;
        const rep = g.repeater;
        const template = safeParse(rep.templateJson) || [];
        const rawCount = Number(this.values[rep.countApi]);
        const count = Math.max(0, Math.min(rep.max, Math.floor(isFinite(rawCount) ? rawCount : 0)));
        // TWO TABLES PER CARD, both items-as-columns:
        //   - the card itself: the inputs and the derived DIMENSIONS the user needs while typing
        //     (segment length, bearing plate size, pole cab dia, overlap ...)
        //   - "Weight & Price calculation": the pricing chain - segment weight, base price,
        //     realization, unit price, unit cost (read-only figures; the editable REALIZATION ON
        //     SEGMENT PRICE stays on the card as the user's input) -
        //     opened from a card button, in the panel, so the pricing is never mixed into the
        //     spec entry but is one click away (read-only mode too).
        this._sectionLabel = g.label || ''; this._inTableGroup = true;
        const priceRank = (api) => { const a = String(api).toLowerCase();
            if (/_weight$/.test(a)) return 1; if (/base_price/.test(a)) return 2; if (/total_realization|realization_on/.test(a)) return 4; if (/realization/.test(a)) return 3;
            if (/unit_?price$/.test(a)) return 5; if (/unit_?cost$/.test(a)) return 6; return 9; };
        // only READ-ONLY figures move to the calculation table; an editable price field
        // (REALIZATION ON SEGMENT PRICE - the user's price/kg override) stays on the card
        const isPriceRow = (def) => !!def.formula && (def.readOnly === true || def.readOnly === 'true') && !!(def.isUnitPrice || def.isUnitCost || def.isBasePrice || def.isRealization || def.isWeightTotal
            || /unit_?price$|unit_?cost$|realization|base_price|_weight$/i.test(String(def.apiName || '')));
        const pre = [];
        (g.fields || []).filter((f) => !f._repCol).forEach((f) => { const r = this.renderField(f, visible); if (r) pre.push(r); });
        const cols = [];
        for (let n = 1; n <= count; n++) cols.push({ key: 'c' + n, n, label: 'ITEM ' + n });
        const rows = [], calcRows = [], flat = [], calcFields = [];
        const byApi = new Map((g.fields || []).map((f) => [f.apiName, f]));
        template.forEach((tf) => {
            const cells = [];
            let anyShown = false, priceRow = false;
            cols.forEach((c) => {
                const def = byApi.get('c' + c.n + '_' + tf.apiName);
                const r = def ? this.renderField(def, visible) : null;
                if (r) { r.isCalc = false; r.hiddenCalc = false; }          // the toggle never hides a pole figure
                if (def && isPriceRow(def)) priceRow = true;
                if (r) anyShown = true;
                if (r) { r.cls = 'im-rep-cell'; r.hasLabel = false; flat.push(r); cells.push(r); }
                else cells.push({ key: 'blank_' + c.n + '_' + tf.apiName, isBlankCell: true, cls: 'im-rep-cell' });
            });
            if (!anyShown) return;
            // the unit the blueprint gives the field (Meter / mm / side) is printed with the row
            // label, as the estimator prints it beside every input, unless the label already says it
            const unit = String(tf.unit || unitHint(tf.apiName) || '').trim();
            const baseLabel = tf.label || tf.apiName;
            const rowLabel = unit && !String(baseLabel).toLowerCase().includes(unit.toLowerCase()) ? baseLabel + ' (' + unit + ')' : baseLabel;
            const row = { key: tf.apiName, label: rowLabel, required: !!tf.required, cells, rowCls: 'im-rep-row' };
            if (priceRow) { row._rank = priceRank(tf.apiName); calcRows.push(row); cells.forEach((r) => { if (!r.isBlankCell) calcFields.push(r); }); }
            else rows.push(row);
        });
        // the pricing chain in reading order: weight -> base price -> realization -> price/kg -> unit price -> unit cost
        calcRows.sort((a, b) => a._rank - b._rank);
        this._sectionLabel = ''; this._inTableGroup = false;
        const key = g.id || g.label;
        let gLabel = g.label || '';
        if (g.labelFormat) gLabel = String(g.labelFormat).replace(/\{([^}]+)\}/g, (m, api) => { const v = this.values[api]; return isBlank(v) ? '' : String(v); }).trim();
        const countDef = this._fields.find((f) => f.apiName === rep.countApi);
        const filled = cols.filter((c) => template.some((tf) => { const v = this.values['c' + c.n + '_' + tf.apiName]; const d = byApi.get('c' + c.n + '_' + tf.apiName); return d && !d.formula && !(d.readOnly === true || d.readOnly === 'true') && !isBlank(v) && v !== false && String(v) !== String(this._defaultOf(d)); })).length;
        const gExp = this.isOpen(key, filled > 0 || (cols.length > 0 && !/special/i.test(gLabel)));
        return { key, label: gLabel, rawLabel: g.label || '', visible: true, collapsible: true, gateField: g.controllingField || null, groupCls: 'im-group', isTrigger: false, triggerLines: [],
            tableHead: [], tableRows: [], tableFoot: [], tablePre: [],
            calcFields, calcRows, hasCalc: calcRows.length > 0 && cols.length > 0, calcKey: key + '::calc',
            calcLabel: 'Weight & Price calculation (' + cols.length + (cols.length === 1 ? ' item)' : ' items)'), calcSub: 'weight · base price · realization · unit price / cost (read-only)',
            rowsShown: 0, rowsTotal: 0, rowsFilled: 0, allRepeatRows: [], canAddRow: false, addRowLabel: '',
            // every repeater card folds (a 3-item pole is a long table); Segment-1 and any card
            // that already holds items / data start open, Special Description starts folded
            render: g.isVisible !== false, expanded: gExp, chev: chev(gExp), isTable: false, isCheckboxRow: false, openInModal: false,
            isRepeater: true, repCols: cols, repRows: rows, repStyle: '--n:' + (cols.length || 1) + ';', repCaption: 'ITEMS',
            repEmpty: cols.length === 0, repEmptyText: 'Set "' + ((countDef && countDef.label) || rep.countApi) + '" above to add items.',
            filledLabel: filled ? filled + (filled === 1 ? ' item filled' : ' items filled') : 'Nothing filled yet',
            // rawFields stays empty on purpose: the line builder must not read the whole
            // repeater as ONE line - _repeaterLineGroups() hands it one group per column
            bodyCls: 'im-grid im-group-body', rawFields: [], showRequiredStars: g.showRequired !== false,
            preFields: pre, fields: pre.concat(flat) };
    }

    /**
     * Line items of a repeater group: ONE per column, exactly the rows the domestic
     * estimator produces ("TRANSMISSION POLE (Item 1)", "TRANSMISSION POLE (Item 2)" ...;
     * the Segment-2 pole of the same item is its own line). Only the columns the item count
     * reaches are read.
     */
    _repeaterLineGroups(g, folderTitle) {
        const rep = g.repeater;
        const rawCount = Number(this.values[rep.countApi]);
        const count = Math.max(0, Math.min(rep.max, Math.floor(isFinite(rawCount) ? rawCount : 0)));
        const title = String(folderTitle || '').replace(/^WEIGHT ESTIMATOR\s*-\s*/i, '').trim().toUpperCase();
        const seg2 = /segment\s*-?\s*2/i.test(g.label || '');
        const out = [];
        for (let n = 1; n <= rep.max; n++) {
            const rawFields = (g.fields || []).filter((f) => f._repCol === n);
            out.push({ key: (g.id || g.label) + ':c' + n, label: (g.label || '') + ' (Item ' + n + ')', rawLabel: g.label || '',
                visible: n <= count, render: false, isLineOnly: true, gateField: null, rawFields,
                lineName: (title || 'TRANSMISSION POLE') + (seg2 ? ' - SEGMENT 2' : '') + ' (Item ' + n + ')',
                fields: [] });
        }
        return out;
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
    /**
     * Several MBCB types define the SAME apiName (b_rate, zinc_*, rate/RM ...) with their own
     * formula / rate seed. The index keeps one definition per apiName, so the rules of the
     * types currently ON SCREEN go in first and win - exactly what the domestic estimator
     * sees, since it only ever loads one type's config. Re-run whenever the active type
     * changes (rebuild() checks the signature); the default order is used only at boot,
     * before the saved values are known.
     */
    _activeRuleSig = '';
    _activeRules() {
        const out = [];
        this._sectionsMdt.forEach((sec) => {
            const root = this._fields.find((f) => f.apiName === sec.First_Field_API_Name__c);
            const rule = this.pickRule(sec.Id, root, root ? this.values[root.apiName] : null);
            if (rule) out.push(rule);
        });
        return out;
    }
    buildFieldIndex(activeRules) {
        const all = [];
        const act = activeRules || [];
        act.forEach((r) => { if (r.payload) collectFields(r.payload.fields || r.payload, all); });
        this._rulesMdt.forEach((r) => { if (act.indexOf(r) === -1 && r.payload) collectFields(r.payload.fields || r.payload, all); });
        this._sectionsMdt.forEach((s) => {
            if (s.First_Field_API_Name__c) {
                const fixed = FIXED_PICKS[s.First_Field_API_Name__c];
                all.push({
                    apiName: s.First_Field_API_Name__c,
                    label: s.First_Field_Label__c,
                    type: s.First_Field_Options__c === 'True' ? 'checkbox' : 'picklist',
                    options: fixed !== undefined ? [fixed] : (s.First_Field_Options__c && s.First_Field_Options__c !== 'True' ? s.First_Field_Options__c.split(';').map((o) => o.trim()) : []),
                    required: fixed !== undefined ? false : s.First_Field_Required__c,
                    defaultValue: fixed,                       // Type of Mast is fixed to Standard Mast
                    forceHidden: fixed !== undefined,          // ... and never shown on this tab
                    controllingField: s.Controlling_Field__c,
                    controllingValues: s.Controlling_Field__c ? (s.Controlling_Value__c ? String(s.Controlling_Value__c).split(',').map((x) => x.trim()) : ['*']) : undefined,
                    _accordionRoot: true
                });
            }
        });
        const seen = new Set();
        this._fields = all.filter((f) => f.apiName && !seen.has(f.apiName) && seen.add(f.apiName));
        // Domestic parity: createQuote.collectAllAPIs() pre-registers every checkbox of the
        // accordion + folder fields as false before weightEstimatorModal builds them, so a
        // Section Logic "defaultValue": true never ticks the box - 610 GSM (Angular / Tubular /
        // Tubular Signalling) starts UNTICKED in domestic. Same here. Saved quotes are not
        // affected: a ticked box is saved as true and comes back ticked.
        this._fields.forEach((f) => {
            if (String(f.type || '').toLowerCase() !== 'checkbox' || f._accordionRoot) return;
            if (f.defaultValue === undefined || f.defaultValue === false) return;
            f._metaDefault = f.defaultValue;
            f.defaultValue = false;
        });
        this._compiled = compileFormulas(this._fields).compiled;
    }

    defaults() {
        const d = {};
        this._fields.forEach((f) => {
            let v = f.defaultValue;
            if (v === undefined) v = f.type === 'checkbox' ? false : '';
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
            // a column-repeater group is ONE card on screen but one LINE per item
            (cfg && cfg.modalFields ? cfg.modalFields : []).forEach((g) => { if (g.repeater && this.fieldVisible(g)) groups.push(...this._repeaterLineGroups(g, this._folderTitle)); });
            this._folderTitle = '';
            // A section whose gate lives in another section of the same folder (Override
            // Shipping Address is switched on by a checkbox inside Shipping Address) is shown
            // with its owner - otherwise ticking the box opens nothing the user can see.
            groups.forEach((g) => {
                if (!g.gateField || g.isRepeater) return;     // a repeater card is gated by the item count but is its own card, never folded into General Details
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
        // the type on screen changed -> its formulas / seeds must be the ones in force
        const act = this._activeRules();
        const sig = act.map((r) => r.accordionId + ':' + (r.controllingValue || '')).join('|');
        if (sig !== this._activeRuleSig) { this._activeRuleSig = sig; this.buildFieldIndex(act); }
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

        let shownNo = 0;
        const accordions = this._sectionsMdt.map((sec, ai) => {
            const no = sec._imHidden ? ai + 1 : ++shownNo;
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
            let sub = (root && !root.forceHidden) ? 1 : 0;      // a fixed (hidden) picker takes no number
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
            return { key: sec.Id, no: String(no), label: sec.MasterLabel, visible: accVisible && !sec._imHidden, expanded: aExp, chev: chev(aExp), root: rootR, inline: inlineAll, folders };
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
        const r = this._renderGroupCore(g, visible);
        return r ? this._telecomLayout(r, g) : r;
    }

    _renderGroupCore(g, visible) {
        if (g.repeater) return this.renderRepeaterGroup(g, visible);
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
            if (isTable) return list.slice();      // Telecom: header cells are row labels - never merged
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
        // Telecom: a table cell is named after its COLUMN header and row ("PRODUCT DETAILS (row 1)"),
        // never after the last header of the run - that is what the Apply error list prints
        if (isTable && headItems.length) {
            const bounds = []; let o = 0;
            headItems.forEach((h) => { const w = Math.min(12, Math.max(1, Number(h.colSpan) || 12)); bounds.push({ s: o, e: o + w, label: String(h.label || '').trim() }); o += w; });
            let off = 0, rowNo = 0, rowLabel = '';
            rowItems.forEach((f) => {
                const w = Math.min(12, Math.max(1, Number(f.colSpan) || 12));
                if (off === 0) { rowNo += 1; rowLabel = ''; }
                const col = bounds.find((b) => off >= b.s && off < b.e);
                if (isCellHdr(f) && off === 0) rowLabel = String(f.label || '').trim();
                if (!isHdr(f) && (!f.label || String(f.label).trim() === '') && col && col.label) {
                    f._prettyLabel = col.label + (rowLabel ? ' - ' + rowLabel : ' (row ' + rowNo + ')');
                }
                off += w; if (off >= 12) off = 0;
            });
        }

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

        // With "Show calculation fields" ON the calculation blocks would flood the section,
        // so they move into their own folder card that opens in the panel - the same place the
        // big tables use. Nothing else changes: the fields, their values and the line/validation
        // logic are untouched, only where they are drawn. This runs BEFORE the table rows are
        // built, so in a table section (Railway, Non-Spacer) the calculation cells leave the
        // rows the same way the toggle hides them - they never sit inline in the table.
        let calcFields = [];
        if (this._showCalc) {
            const isCalcHead = (f) => f.isSectionHeader && CALC_SECTION.test(String(f.label || ''));
            // the working figures (unit price / cost, margin, quantity) always stay on screen,
            // even when the JSON lists them under a PRICE CALCULATION heading
            const keyApis = new Set(items.filter((f) => f.isUnitPrice || f.isUnitCost || f.isMargin || f.isQuantity).map((f) => f.apiName));
            const main = [];
            let inCalc = false;
            visibleFields.forEach((f) => {
                if (f.isSectionHeader) inCalc = isCalcHead(f);
                if ((inCalc || f.isCalc) && !keyApis.has(f.apiName)) calcFields.push(f); else main.push(f);
            });
            if (calcFields.length) visibleFields = main;
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
            // a calculation cell moved to the panel is not in visibleFields any more, so it
            // becomes a blank cell here - the same width, like a hidden one; columns never shift
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
            calcLabel: 'Calculations (' + calcFields.filter((f) => !f.isHeader).length + ' fields)', calcSub: 'read-only',
            rowsShown, rowsTotal, rowsFilled, allRepeatRows, canAddRow: rowsTotal > rowsShown, addRowLabel: '+ Add row (' + rowsShown + ' of ' + rowsTotal + ')',
            render: g.isVisible !== false, expanded: gExp, chev: chev(gExp),
            isTable, isCheckboxRow, openInModal,
            filledLabel: isTable ? (rowsFilled ? rowsFilled + (rowsFilled === 1 ? ' row filled' : ' rows filled') : 'No rows yet')
                                 : (filled ? filled + ' filled' : 'Nothing filled yet'),
            bodyCls: 'im-grid im-group-body' + (isTable ? ' im-grid_table' : '') + (isCheckboxRow ? ' im-grid_checks' : ''),
            rawFields: raw, showRequiredStars,
            fields: visibleFields.map((f) => (showRequiredStars ? f : { ...f, required: false, reqAttr: 'false' })) };
    }

    /**
     * SPECIAL TERMS AND CONDITIONS**: 1-HEADING / CONTENT, 2-HEADING / CONTENT, 3-HEADING /
     * CONTENT are six half-width cells in metadata. The checkbox (with the section caption)
     * takes one cell, so every pair slid by one (1-HEADING beside the checkbox, its CONTENT
     * under it). Shown as a table instead: # | HEADING | CONTENT, one numbered row per pair,
     * the checkbox on its own row above it. Same fields, same apiNames, same inputs.
     */
    _pairTable(out) {
        const fields = out.fields || [];
        const byApi = new Map(fields.map((f) => [f.apiName, f]));
        const rows = [];
        fields.forEach((f) => {
            const m = String(f.apiName || '').match(/^(.*?)heading(\d+)$/i);
            if (!m || f.isHeader) return;
            const c = byApi.get(m[1] + 'content' + m[2]) || byApi.get(m[1] + 'Content' + m[2]);
            if (!c || c.isHeader) return;
            rows.push({ n: Number(m[2]), a: f, b: c });
        });
        if (rows.length < 2) return;
        rows.sort((x, y) => x.n - y.n);
        const used = new Set(rows.flatMap((r) => [r.a.apiName, r.b.apiName]));
        const cap = (lbl, fb) => String(lbl || '').replace(/^\s*\d+\s*[-.)]\s*/, '').trim() || fb;
        const cell = (f, what, n) => ({ ...f, hasLabel: false, aria: what + ' ' + n, isInput: !f.isTextarea, isArea: !!f.isTextarea });
        out.pairTable = {
            headA: cap(rows[0].a.label, 'Heading'), headB: cap(rows[0].b.label, 'Content'),
            rows: rows.map((r) => ({ key: 'pt_' + r.a.apiName, no: String(r.n), a: cell(r.a, 'Heading', r.n), b: cell(r.b, 'Content', r.n) }))
        };
        out.pairFields = rows.flatMap((r) => [r.a, r.b]);
        // the checkbox that opens the pairs gets its own full row above the table
        const gate = this._fields.find((d) => d.apiName === rows[0].a.apiName);
        const gateApi = gate && gate.controllingField ? String(gate.controllingField).split(',')[0].trim() : '';
        out.fields = fields.filter((f) => !used.has(f.apiName)).map((f) => (f.apiName === gateApi
            ? { ...f, cls: String(f.cls || '').replace(/im-span\d+/g, '').trim() + ' im-span12', spanStyle: '--sp:12;' } : f));
    }

    /**
     * Telecom card layout (runs on the engine's rendered group):
     *  - every section card collapses (chevron), open by default;
     *  - a matrix / table section keeps only its INPUT columns on the card (the row label,
     *    the composition %, the product / weight / qty of the price table ...). Every column
     *    made of computed or reference figures (WT, RATE/KG, TOTAL, RATE PER MT, BASIC RATE,
     *    TOTAL VALUE ...) and every summary row (TOTAL RM COST, RATE/KG) moves to the section's
     *    "Calculations" modal, which shows the FULL matrix read-only - the domestic grid,
     *    one click away, never in the way of typing;
     *  - a plain section (Part B / C / payment terms) already has its computed fields in
     *    calcFields (showCalc is forced on), so only the collapse is added.
     * Values, formulas, lines and validation are untouched: this only decides where a
     * cell is drawn.
     */
    /** input-only repeat table (freight) -> card with "Open" + styled editable table in the panel */
    _editTableLayout(out, rows, headIdx, cols, numCol, span, colOf, respan) {
        const pos = (row) => { let o = 0; return row.cells.map((c) => { const st = o; o += span(c); return { c, k: colOf(st), w: span(c) }; }); };
        const head = rows[headIdx];
        const labels = cols.map((c) => String(c.label || '').trim());
        const tableRows = [];
        rows.forEach((row, i) => {
            if (i < headIdx) { tableRows.push(row); return; }
            const keep = pos(row).filter((x) => !(x.k >= 0 && numCol[x.k]));
            let cells = respan(keep);
            if (!row.isHeaderRow) {
                // the column caption travels with the cell: hidden on a desktop, shown on a phone card
                cells = cells.map((c, j) => {
                    const x = keep[j]; const cap = x && x.k >= 0 ? labels[x.k] : '';
                    if (c.isHeader || c.isBlankCell || !cap) return c;
                    return { ...c, label: cap, hasLabel: true };
                });
            }
            tableRows.push({ ...row, cells, no: row.isHeaderRow ? '#' : row.no });
        });
        out.tableRows = tableRows;
        out.tableHead = (tableRows.find((row) => row.isHeaderRow) || head).cells;
        out.openInModal = true;
        out.tblCls = 'im-tbl im-tbl_edit';
        out.filledLabel = out.rowsFilled ? out.rowsFilled + (out.rowsFilled === 1 ? ' row filled' : ' rows filled') : 'No rows yet';
        return out;
    }

    _telecomLayout(r, g) {
        const key = r.key;
        const exp = this.isOpen(key, true);
        // Terms & Condition / Customer Address sections: a card with "Open" -> the panel, exactly
        // as on the other IM tabs (engine: cardFolder). Every other section stays inline.
        const out = { ...r, collapsible: true, expanded: exp, chev: chev(exp), openInModal: !r.isTable && !!r.openInModal, tblCls: 'im-tbl im-tbl_inline' };
        if (!r.isTable || !r.tableRows || !r.tableRows.length) {
            if (out.hasCalc) { out.calcLabel = 'Calculations (' + out.calcFields.filter((f) => !f.isHeader).length + ')'; out.calcSub = 'read-only, opens in a panel'; }
            this._pairTable(out);
            return out;
        }
        const rows = r.tableRows;
        const headIdx = rows.findIndex((row) => row.isHeaderRow && row.cells.filter((x) => x.isCellHeader).length >= 2);
        if (headIdx === -1) return out;
        const span = (x) => Math.min(12, Math.max(1, Number(x.rawColSpan) || 12));
        const isInput = (x) => !x.isBlankCell && !x.isHeader && !x.isSpacer && !x.isReadOnlyValue;
        const isFigure = (x) => !!x.isReadOnlyValue;
        // column boundaries from the header row
        const cols = []; let off = 0;
        rows[headIdx].cells.forEach((c) => { cols.push({ start: off, end: off + span(c), label: c.label || '' }); off += span(c); });
        const colOf = (start) => cols.findIndex((c) => start >= c.start && start < c.end);
        const dataRows = rows.slice(headIdx + 1);
        // classify every column: an input anywhere keeps it on the card; figures only -> modal
        const hasInput = cols.map(() => false), hasFigure = cols.map(() => false);
        const rowInfo = dataRows.map((row) => {
            let o = 0; let anyInput = false, anyFigure = false, anyLabel = false;
            const cells = row.cells.map((c) => { const k = colOf(o); const w = span(c); o += w; if (isInput(c)) { anyInput = true; if (k >= 0) hasInput[k] = true; } if (isFigure(c)) { anyFigure = true; if (k >= 0) hasFigure[k] = true; } if (c.isCellHeader) anyLabel = true; return { c, k, w }; });
            return { row, cells, anyInput, anyFigure, anyLabel };
        });
        let calcCol = cols.map((c, k) => !hasInput[k] && hasFigure[k]);
        // a read-only "SL NO" column (Per Metric Ton: 1..10) is only the row number - not a calculation
        const numCol = cols.map((c) => /^\s*(SL|SR|S)\.?\s*NO\.?\s*$/i.test(c.label || ''));
        const realCalc = calcCol.map((c, k) => c && !numCol[k]);
        if (!realCalc.some(Boolean) && !rowInfo.some((ri) => !ri.anyInput && ri.anyFigure)) {
            // Freight tables (MINIMUM GUARANTEED LOADABILITY, PER METRIC TON RATE): input only, up to
            // 10 rows -> edited in the panel as a proper table (numbered rows, grid lines, remove /
            // add row); on a phone every row is a small card with the column captions.
            if ((r.rowsTotal || 0) >= 5) return this._editTableLayout(out, rows, headIdx, cols, numCol, span, colOf, respanFor(span));
            return out;
        }

        const respan = (cells) => {
            const total = cells.reduce((a, x) => a + x.w, 0) || 1;
            let used = 0;
            return cells.map((x, i) => {
                const w = i === cells.length - 1 ? 12 - used : Math.max(1, Math.round((x.w * 12) / total));
                used += w;
                return { ...x.c, spanStyle: '--sp:' + w + ';', cls: String(x.c.cls || '').replace(/im-span\d+/g, '').trim() + ' im-span' + w };
            });
        };
        // colour code in the panel: typed input = white, reference rate = grey, computed = blue
        const defOf = (api) => this._fields.find((f) => f.apiName === api);
        const roCell = (c) => {
            if (c.isBlankCell || c.isHeader || c.isSpacer) return c;
            const d = defOf(c.apiName) || {};
            if (!isInput(c)) {
                const kind = d.formula ? 'calc' : 'ref';
                return { ...c, cls: String(c.cls || '') + ' im-tcell im-tcell_' + kind, valueCls: 'im-value im-value_' + kind };
            }
            const v = this.values[c.apiName];
            let display = isBlank(v) ? '' : (typeof v === 'number' ? fmt(v) : String(v));
            if (c.isCheckbox) display = v === true ? 'Yes' : 'No';
            return { ...c, cls: String(c.cls || '') + ' im-tcell im-tcell_in', isReadOnlyValue: true, isPicklist: false, isNumber: false, isText: false, isTextarea: false, isCheckbox: false, display,
                     valueCls: 'im-value im-value_in', unit: c.unit || '' };
        };
        // card rows: header + data rows that hold an input, without the calc columns
        const cardRows = [];
        // rows above the column headers (MATERIAL LIST, TOWER WEIGHT): spacer cells are dropped
        // and the real cells share the row, so the input is not squeezed into a 2/12 slot
        rows.slice(0, headIdx).forEach((row) => {
            const real = row.cells.filter((c) => !c.isSpacer && !c.isBlankCell).map((c) => ({ c, k: -1, w: span(c) }));
            cardRows.push({ ...row, key: row.key + '_c', canRemove: false, cells: real.length && real.length < row.cells.length ? respan(real) : row.cells });
        });
        const headCells = rows[headIdx].cells.map((c, k) => ({ c, k, w: span(c) })).filter((x) => !calcCol[x.k]);
        // a column whose cells are required carries the star on its header
        const reqCol = cols.map(() => false);
        rowInfo.forEach((ri) => ri.cells.forEach((x) => { if (x.k >= 0 && isInput(x.c) && x.c.required) reqCol[x.k] = true; }));
        cardRows.push({ ...rows[headIdx], key: rows[headIdx].key + '_c', cells: respan(headCells.map((x) => (reqCol[x.k] ? { ...x, c: { ...x.c, required: true } } : x))) });
        // repeating rows (the price table: product / weight / qty x 10): every input api ends
        // with the row number -> the filled rows plus one empty are shown, "+ Add row" for more
        const rowSig = (ri) => ri.cells.filter((x) => isInput(x.c)).map((x) => String(x.c.apiName).replace(/\d+(_\d+)?$/, '')).join('|');
        const inputRows = rowInfo.filter((ri) => ri.anyInput);
        const firstSig = inputRows.length ? rowSig(inputRows[0]) : '';
        const isRepeat = (ri) => firstSig !== '' && rowSig(ri) === firstSig && ri.cells.some((x) => isInput(x.c) && /\d$/.test(String(x.c.apiName)));
        const repeats = inputRows.filter(isRepeat);
        // A cell that copies another table (Ex-works Price (Margin as Actual Weight): PRODUCT
        // DETAILS / TOWER WEIGHT / QTY = the BOM table's row, editable to override) holds 0
        // while its source row is empty. That 0 is not user data: it must not make the row
        // count as filled (all 10 rows were shown) and is shown blank, like the BOM table.
        const mirrorZero = (c) => { const d = defOf(c.apiName); if (!d || !d.formula || this._overrides.has(c.apiName)) return false; const v = this.values[c.apiName]; return isBlank(v) || Number(v) === 0; };
        const rowUsed = (ri) => ri.cells.some((x) => { if (!isInput(x.c)) return false; const v = this.values[x.c.apiName]; return !isBlank(v) && v !== false && !mirrorZero(x.c); });
        let filled = 0; repeats.forEach((ri, i) => { if (rowUsed(ri)) filled = i + 1; });
        const shown = repeats.length > 1 ? Math.min(repeats.length, Math.max(this._rowsShown[key] || 0, filled + 1, 1)) : repeats.length;
        let seenRep = 0;
        rowInfo.forEach((ri) => {
            if (!ri.anyInput) return;                                       // summary / figure-only rows live in the modal
            if (repeats.length > 1 && isRepeat(ri)) { seenRep += 1; if (seenRep > shown) return; }
            let kept = ri.cells.filter((x) => x.k < 0 || !calcCol[x.k]);
            if (!kept.length) return;
            if (isRepeat(ri) && !rowUsed(ri)) kept = kept.map((x) => (isInput(x.c) && mirrorZero(x.c) ? { ...x, c: { ...x.c, value: '' } } : x));
            const rowNo = repeats.length > 1 && isRepeat(ri) ? seenRep : '';
            cardRows.push({ ...ri.row, key: ri.row.key + '_c', no: rowNo, isRepeat: false, canRemove: false, cells: respan(kept) });
        });
        // modal rows: the whole matrix, read-only, numbered; empty repeat rows are left out
        let n = 0, seenM = 0;
        const calcRows = [];
        rows.forEach((row, i) => {
            const ri = i > headIdx ? rowInfo[i - headIdx - 1] : null;
            if (ri && repeats.length > 1 && isRepeat(ri)) { seenM += 1; if (seenM > Math.max(filled, 1)) return; }
            const isHead = row.isHeaderRow;
            if (!isHead) n += 1;
            const summary = !!ri && !ri.anyInput && ri.anyFigure;          // TOTAL RM COST / RATE PER KG rows
            const cells = row.cells.map(roCell).map((c) => (c.isCellHeader && !isHead ? { ...c, cls: String(c.cls || '') + ' im-tcell im-tcell_label' } : c));
            calcRows.push({ ...row, key: row.key + '_m', no: isHead ? '' : n, canRemove: false, cells,
                            rowCls: row.rowCls + (summary ? ' im-tbl-row_sum' : '') });
        });
        const rawCols = cols.filter((c, k) => calcCol[k]).map((c) => c.label).filter(Boolean);
        const gsmSet = new Set(); const calcCols = [];
        rawCols.forEach((l) => { const m = String(l).match(/^(.*?)\s*-\s*(\d+)\s*GSM$/i); const base = m ? m[1].trim() : String(l).trim(); if (m) gsmSet.add(m[2]); if (calcCols.indexOf(base) === -1) calcCols.push(base); });
        if (gsmSet.size) calcCols.push([...gsmSet].join(' / ') + ' GSM');
        // a wide table (the 12-column price table) carries the unit once, in the column
        // heading, instead of inside every narrow cell
        if (cols.length >= 8) {
            const colUnit = cols.map(() => '');
            rowInfo.forEach((ri) => ri.cells.forEach((x) => { if (x.k >= 0 && !colUnit[x.k] && !x.c.isHeader && !x.c.isBlankCell) { const u = x.c.unit || unitHint(x.c.apiName); if (u) colUnit[x.k] = u; } }));
            calcRows.forEach((row) => {
                let o = 0;
                row.cells = row.cells.map((c) => {
                    const k = colOf(o); o += span(c);
                    if (row.isHeaderRow) return c.isCellHeader && k >= 0 && colUnit[k] ? { ...c, label: c.label + ' (' + colUnit[k] + ')' } : c;
                    return c.isHeader ? c : { ...c, unit: '' };
                });
            });
        }
        // Calculations panel (price table: PRODUCT / WEIGHT / QTY + RATE / BASIC / TOTAL per GSM):
        //  - the RATE / BASIC / TOTAL columns of a GSM that is not ticked (blank in every row)
        //    are left out;
        //  - the remaining columns are EQUAL width (a grid of N columns, not 12 units shared out -
        //    that made the last column swallow the rest);
        //  - colour code: GSM group header band + a divider before each group; RATE PER MT grey,
        //    BASIC RATE blue, TOTAL VALUE green (the figure that becomes the line item).
        // Only a table whose header is the first row and whose cells are one column each - any
        // other table (Part A with MATERIAL LIST above its header) keeps the 12-unit layout.
        let keptCols = cols.length;
        out.calcEqCols = 0;
        {
            const pos = (row) => { let o = 0; return row.cells.map((c) => { const s = o; o += span(c); return { c, k: colOf(s), s, w: span(c) }; }); };
            const clean = (x) => x.k >= 0 && x.s === cols[x.k].start && x.w === cols[x.k].end - cols[x.k].start;
            const headFirst = calcRows.length > 1 && calcRows[0].isHeaderRow;
            const allClean = headFirst && calcRows.every((row) => pos(row).every(clean));
            if (allClean) {
                const gsmOf = cols.map((c) => { const m = String(c.label || '').match(/\b(610|900|1000)\s*GSM\b/i); return m ? m[1] : ''; });
                const metricOf = cols.map((c, k) => {
                    const l = String(c.label || '').trim().toUpperCase();
                    if (!calcCol[k]) return 'in';
                    if (l.indexOf('RATE PER MT') === 0) return 'rate';
                    if (l.indexOf('BASIC RATE') === 0) return 'basic';
                    if (l.indexOf('TOTAL VALUE') === 0) return 'total';
                    return 'calc';
                });
                const hasData = cols.map(() => false);
                calcRows.forEach((row) => { if (row.isHeaderRow) return; pos(row).forEach((x) => { if (!x.c.isHeader && !x.c.isBlankCell && String(x.c.display || '').trim() !== '') hasData[x.k] = true; }); });
                const anyGsmData = cols.some((c, k) => gsmOf[k] && hasData[k]);
                const drop = cols.map((c, k) => anyGsmData && calcCol[k] && !!gsmOf[k] && !hasData[k]);
                const kept = cols.map((c, k) => k).filter((k) => !drop[k]);
                const gStart = new Set(kept.filter((k, i) => gsmOf[k] && (i === 0 || gsmOf[kept[i - 1]] !== gsmOf[k])));
                keptCols = kept.length;
                out.calcEqCols = keptCols;
                for (let i = 0; i < calcRows.length; i++) {
                    const row = calcRows[i];
                    const cells = pos(row).filter((x) => !drop[x.k]).map((x) => {
                        const k = x.k, m = metricOf[k], g = gsmOf[k];
                        let cls = String(x.c.cls || '').replace(/im-span\d+/g, '').trim() + ' im-span1';
                        if (gStart.has(k)) cls += ' im-col_gstart';
                        if (row.isHeaderRow) {
                            cls += ' im-th im-th_' + (g ? 'g' + g : m);
                            return { ...x.c, cls, spanStyle: '--sp:1;' };
                        }
                        cls += ' im-tc im-tc_' + m;
                        const out2 = { ...x.c, cls, spanStyle: '--sp:1;' };
                        if (['rate', 'basic', 'total'].includes(m) && x.c.isReadOnlyValue) {
                            out2.valueCls = 'im-value im-value_' + m + (String(x.c.display || '').trim() === '' ? ' im-value_blank' : '');
                        }
                        return out2;
                    });
                    calcRows[i] = { ...row, cells };
                }
            }
        }
        // the panel is as wide as its longest figure needs (a crore total with 2 decimals,
        // "1,13,65,53,000.00", must stay on one line) - it scrolls sideways instead of wrapping
        {
            let chars = 0;
            calcRows.forEach((row) => { if (row.isHeaderRow) return; row.cells.forEach((x) => {
                if (x.isHeader || x.isBlankCell) return;
                chars = Math.max(chars, String(x.display || '').length, Math.ceil(String(x.fcValue ? 'USD ' + x.fcValue : '').length * 0.88));
            }); });
            const perChar = keptCols >= 8 ? 0.47 : 0.57;     // bold digit at .78rem (wide table) / .95rem, Salesforce Sans + margin
            const track = Math.max(6.5, Math.round((chars * perChar + 2) * 10) / 10);   // + tile and cell padding
            out.calcMinRem = out.calcEqCols
                ? Math.round((2.4 + keptCols * track) * 10) / 10                         // im-tbl_eq: no gaps, no delete column
                : Math.round((4.6 + keptCols * track + (keptCols + 1) * 0.4) * 10) / 10;
        }
        out.tableRows = cardRows;
        out.tableHead = cardRows.find((row) => row.isHeaderRow) ? cardRows.find((row) => row.isHeaderRow).cells : r.tableHead;
        // a card table of 2-3 input columns fits the phone width - no forced minimum width
        out.tblCls = 'im-tbl im-tbl_inline im-tbl_nodel' + (out.tableHead.length <= 3 ? ' im-tbl_narrow' : '') + ' im-tbl_n' + out.tableHead.length;
        out.calcTableRows = calcRows; out.calcTableHead = rows[headIdx].cells;
        out.hasCalc = true; out.calcKey = key + '::calc';
        out.calcLabel = 'Calculations' + (calcCols.length ? ' (' + calcCols.join(' · ') + ')' : '');
        out.calcSub = 'full table, read-only';
        out.rowsShown = shown; out.rowsTotal = repeats.length; out.rowsFilled = filled;
        out.canAddRow = repeats.length > 1 && shown < repeats.length;
        out.addRowLabel = '+ Add row (' + shown + ' of ' + repeats.length + ')';
        out.filledLabel = repeats.length > 1 ? (filled ? filled + (filled === 1 ? ' row filled' : ' rows filled') : 'No rows yet') : out.filledLabel;
        out.wideCalc = keptCols >= 8;
        return out;
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
        // count from the rows ON SCREEN: they grow on their own as rows are filled (filled + 1),
        // so the stored number can be behind - "+ Add row" then needed several clicks
        const g = this._findGroup(key);
        const now = (g && g.rowsShown) || this._rowsShown[key] || 1;
        const total = (g && g.rowsTotal) || Infinity;
        this._rowsShown[key] = Math.min(total, now + 1);
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
        const shown = g.rowsShown || this._rowsShown[key] || 1;
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
            if (g.isRepeater) {
                return { key: g.calcKey, label: g.label + ' - weight & price calculation', isTable: false, isRepeater: true,
                         repCols: g.repCols, repRows: g.calcRows, repStyle: g.repStyle, repCaption: g.repCaption,
                         fields: g.calcFields, tableRows: [], tableHead: [], tableFoot: [], canAddRow: false };
            }
            if (g.calcTableRows && g.calcTableRows.length) {
                return { key: g.calcKey, label: g.label + ' - calculations', isTable: true, tblCls: 'im-tbl im-tbl_calc' + (g.wideCalc ? ' im-tbl_wide' : '') + (g.calcEqCols ? ' im-tbl_eq' : ''), tblStyle: (g.calcMinRem ? 'min-width:' + g.calcMinRem + 'rem;' : '') + (g.calcEqCols ? '--cols:' + g.calcEqCols + ';' : ''),
                         tableRows: g.calcTableRows, tableHead: g.calcTableHead || [], tableFoot: [], fields: [], canAddRow: false };
            }
            return { key: g.calcKey, label: g.label + ' - calculations', isTable: false,
                     fields: g.calcFields, tableRows: [], tableHead: [], tableFoot: [], canAddRow: false };
        }
        return null;
    }
    get hasModalGroup() { return !!this.modalGroup; }
    get modalTblCls() { const m = this.modalGroup; return (m && m.tblCls) || 'im-tbl'; }
    get modalTblStyle() { const m = this.modalGroup; return (m && m.tblStyle) || ''; }

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
        // disableControllingField / disableControllingValues (Transmission Pole blueprint):
        // the input is ENABLED only while the controlling field holds one of the listed values
        // (EXTRA MICRON VALUE while "EXTRA MICRON?" is ticked, Price Value while Value = Price)
        // and greyed out otherwise - it stays on screen, unlike a controllingField gate.
        let disabled = false;
        if (f.disableControllingField) {
            const cv = this.values[f.disableControllingField];
            const cur = cv === true ? 'true' : (cv === false ? 'false' : (isBlank(cv) ? '' : String(cv).trim().toLowerCase()));
            const want = (Array.isArray(f.disableControllingValues) ? f.disableControllingValues : [f.disableControllingValues]).filter((x) => x !== undefined && x !== null).map((x) => String(x).trim().toLowerCase());
            disabled = !want.includes(cur);
        }
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
            if (!err && req && !disabled && this._showErrors && t !== 'checkbox' && isBlank(val)) err = 'This field is required';
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
            required: req, reqAttr: req ? 'true' : 'false', err, disabled,
            inputCls: 'im-input' + (err ? ' im-invalid' : '') + (disabled ? ' im-input_disabled' : ''), selectCls: 'im-select' + (err ? ' im-invalid' : '') + (disabled ? ' im-input_disabled' : ''),
            // a read-only tile with no value shows no unit either (an empty "INR / MT" box reads as a value)
            unit: (ro && isBlank(val)) ? '' : (f.unit || unitHint(f.apiName) || ''), min: f.min, isMoney: !!(f.isUnitPrice || f.isUnitCost),
            fcValue: this._fc(f, val, ro),
            isReadOnlyValue: ro && !isHeader && !isSpacer && t !== 'checkbox',
            display: ro && !isHeader && !isSpacer ? (t === 'number' && !isBlank(val) && !isNaN(Number(val)) ? fmt(Number(val)) : (isBlank(val) ? '' : String(val))) : null,
            valueCls: 'im-value im-value_' + (f.isUnitPrice ? 'price' : (f.isUnitCost ? 'cost' : (f.isMargin ? 'margin' : (calc ? 'calc' : 'ref')))) + (err ? ' im-invalid' : ''),
            cls: 'im-cell im-span' + span + (t === 'checkbox' && String(label || '').trim().length > 24 ? ' im-cell_wide' : ''), spanStyle: '--sp:' + span + ';', rawColSpan
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
     * A saved value normally survives being hidden (cross product: another type's data must
     * not be wiped when the type on screen changes). But when the USER changes a controlling
     * field in this session - Trans.in offer? F.O.R -> Ex-works, a section checkbox off -
     * the fields that picklist/checkbox controls must reset exactly as the estimator does,
     * or a saved freight amount keeps feeding the price from a field nobody can see.
     * Only the direct dependents of the changed field lose their saved-value protection.
     */
    _releaseDependents(changedApi) {
        if (!this._savedAtOpen) return;
        // transitive: Trans.in offer? -> types of freight -> Transportation KG / Full Vehicle
        // Freight amount. Every level that hangs off the changed field is released.
        const parentsOf = (def) => String(def.controllingField || '').split(',').map((x) => x.trim().replace(/^!/, '')).filter(Boolean);
        const released = new Set([changedApi]);
        let grew = true;
        while (grew) {
            grew = false;
            this._fields.forEach((dep) => {
                if (released.has(dep.apiName)) return;
                const direct = parentsOf(dep).some((pa) => released.has(pa));
                const viaSub = dep.parentSubSectionApi && released.has(dep.parentSubSectionApi);
                if (direct || viaSub) { released.add(dep.apiName); grew = true; }
            });
        }
        released.forEach((api) => { if (api !== changedApi) delete this._savedAtOpen[api]; });
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
        this._releaseDependents(api);
        clearTimeout(this._timer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._timer = setTimeout(() => {
            this.rebuild(true); this.productPricingFetch();
            // domestic shows the Composition Error toast the moment a composition value takes
            // the total over 100% (weightEstimatorModal handleFieldChange)
            if (TELECOM_COMPOSITION_APIS.includes(api)) {
                const e = this._crossErrors.find((x) => x.title === 'Composition Error' && (x.apis || []).includes(api));
                if (e) this.dispatchEvent(new ShowToastEvent({ title: e.title, message: e.message, variant: 'error' }));
            }
        }, DEBOUNCE_MS);
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
        return { values: { v: 2, inputs, seeds, calc, overrides: Array.from(this._overrides), cleared: Array.from(this._userCleared), approvalView: this._approvalView() }, errors: this.engineErrors };
    }

    /**
     * Approval parity with domestic. The domestic modal saves a hidden field as '' (Apply
     * baseline), so a Margin that is not in use never reaches Quote_Approval_Matrix__mdt.
     * The IM state keeps every typed / default value (reopen needs them), so without this
     * an unused type's default (agl_margin 5) or a stale value (tub_margin_awt 3 after the
     * user switched to "Margin % for BOM") would route the quote to HOD / ED.
     * One flat map of the approval metric fields: value only when the field is in use -
     * its tower type has a line AND its own checkbox is ticked - otherwise ''.
     * InternationalQuoteController.approvalPayload lays it over the flattened bag.
     */
    _approvalView() {
        const out = {};
        let withLines;
        try { withLines = new Set(this._telecomTypesInPlay().filter((p) => p.hasLines).map((p) => p.pfx)); } catch (e) { withLines = new Set(); }
        this._fields.forEach((f) => {
            if (!(f.isMargin || f.isDiscount || f.isRealization || f.approvalMetric)) return;
            const p = TELECOM_PRODUCTS.find((x) => String(f.apiName).indexOf(x.pfx) === 0);
            const inUse = p ? withLines.has(p.pfx) && computeVisible(f, this.values, this._fields) : this._isVisible(f.apiName);
            const v = this.values[f.apiName];
            out[f.apiName] = inUse && !isBlank(v) ? v : '';
        });
        return out;
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
            (a.folders || []).forEach((fo) => { if (fo.visible) (fo.groups || []).forEach((g) => (g.fields || []).concat(g.pairFields || []).forEach(check)); });
        });
        return ok;
    }
    @api getErrors() {
        const out = this._crossErrors.map((e) => ({ apiName: e.apiName || '', field: e.title, where: e.where || this.productLabel, message: e.message }));
        const crossApis = new Set(this._crossErrors.map((e) => e.apiName).filter(Boolean));
        this._crossErrors.forEach((e) => (e.apis || []).forEach((x) => crossApis.add(x)));
        this.accordions.forEach((a) => {
            if (!a.visible) return;
            const push = (f, where) => {
                if (!f || !f.err) return;
                if (crossApis.has(f.apiName)) return;      // already reported once, with its full message
                out.push({ apiName: f.apiName, field: (f.label && f.label.trim()) || f.prettyLabel || f.apiName, where, message: f.err });
            };
            push(a.root, a.label); (a.inline || []).forEach((f) => push(f, a.label));
            (a.folders || []).forEach((fo) => { if (fo.visible) (fo.groups || []).forEach((g) => (g.fields || []).concat(g.pairFields || []).forEach((f) => push(f, a.label + ' › ' + fo.label + (g.label ? ' › ' + g.label : '')))); });
        });
        // the accordion root is rendered twice (root + first inline cell) - report it once
        const seen = new Set();
        return out.filter((e) => { const k = (e.apiName || '') + '|' + e.message; if (e.apiName && seen.has(k)) return false; seen.add(k); return true; });
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
                || (a.folders || []).some((fo) => (fo.groups || []).some((g) => (g.fields || []).concat(g.pairFields || []).some((f) => f.apiName === api)));
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
    /**
     * The estimator works in INR (the rate cards are INR, exactly as domestic). Every money
     * figure that is shown read-only also carries its value in the quote currency underneath
     * ("USD 1,234.56") - the same division the Apply payload, the summary and the offer PDF
     * use (INR / frozen exchange rate), so what is on screen is what is quoted.
     */
    _fc(f, val, ro) {
        const rate = Number(this.exchangeRate);
        if (!(rate > 0) || rate === 1 || isBlank(val) || isNaN(Number(val))) return null;
        const money = f.isUnitPrice || f.isUnitCost || (ro && isInrUnit(f.unit || unitHint(f.apiName)));
        return money && Number(val) !== 0 ? fmtFc(Number(val) / rate) : null;
    }

    /** tower types that are on this quote: the one on screen + every type that has a line */
    _telecomTypesInPlay() {
        const onScreen = this._readStr('telecom_product_details');
        const withLines = new Set();
        (this._lastLines || []).forEach((l) => {
            const n = String(l.name || '');
            TELECOM_PRODUCTS.forEach((p) => { if (n.indexOf(p.name + ' - ') === 0) withLines.add(p.name); });
        });
        // "Tubular Signalling - x" also starts with "Tubular" - the prefix test above uses
        // "<name> - ", so "Tubular - " never matches a Signalling line
        return TELECOM_PRODUCTS.filter((p) => p.name === onScreen || withLines.has(p.name)).map((p) => ({ ...p, hasLines: withLines.has(p.name) }));
    }

    /**
     * weightEstimatorModal._validateTelecomTowerComposition: PIPE + PLATE + ANGLES & CHANNELS +
     * MISCELLANEOUS must not exceed 100% per tower type (only the composition fields on screen,
     * i.e. "BOM Availabel"). Fires only once a total above 100 is entered.
     */
    _validateTelecomComposition() {
        const inPlay = new Set(this._telecomTypesInPlay().map((p) => p.name));
        Object.keys(TELECOM_COMPOSITION_GROUPS).forEach((product) => {
            if (!inPlay.has(product)) return;
            const apis = TELECOM_COMPOSITION_GROUPS[product].filter((a) => this._hasField(a) && !(this._visible && this._visible.get(a) === false));
            if (!apis.length) return;
            let total = 0, any = false;
            apis.forEach((a) => { const n = this._readNum(a); if (n !== null) { total += n; any = true; } });
            total = Math.round(total * 100) / 100;
            if (!any || total <= 100) return;
            const inline = 'Total ' + total + '% - max 100%';
            apis.forEach((a) => { this._crossFields.push(a); this._crossMsg[a] = inline; });
            this._crossErrors.push({ title: 'Composition Error', where: product + ' › PART A - BOM Materials', apiName: apis[0], apis, inline,
                message: 'Total composition for ' + product + ' is ' + total + '%. The sum of PIPE + PLATE + ANGLES & CHANNELS + MISCELLANEOUS must not exceed 100% for each tower type. Please correct the values before saving.' });
        });
    }

    /**
     * weightEstimatorModal._validateTelecomPaymentTerms: every tower type with the Interest
     * Component ON must use the same Payment Terms; on LC / VFS also the same No Of Days and
     * Prevailing rate of Bank Interest. Master = first participating type (Angular ->
     * Tubular -> Tubular Signalling).
     */
    _validateTelecomPaymentTerms() {
        const GATE_ON = new Set(['true', 'yes', 'y', '1']);
        const gateOn = (v) => v === true || v === 1 || GATE_ON.has(String(isBlank(v) ? '' : v).trim().toLowerCase());
        const NEEDS_DETAIL = ['Against LC Before Dispatch', 'Against VFS'];
        const onScreen = this._readStr('telecom_product_details');
        const entries = [];
        this._telecomTypesInPlay().forEach((p) => {
            if (!gateOn(this.values[p.pfx + 'payment_terms_req'])) return;
            const term = this._readStr(p.pfx + 'select_payment_terms');
            if (term === '') return;
            entries.push({ ...p, term, days: this._readNum(p.pfx + 'payment_terms_days'), rate: this._readNum(p.pfx + 'bank_int_rate') });
        });
        if (entries.length < 2) return;
        const master = entries[0];
        const problems = [], marks = [];
        entries.slice(1).forEach((e) => {
            if (e.term !== master.term) { problems.push(e.name + ' is "' + e.term + '" but ' + master.name + ' is "' + master.term + '".'); marks.push([e, 'select_payment_terms', 'Must be "' + master.term + '" - same as ' + master.name]); }
        });
        if (!problems.length && NEEDS_DETAIL.includes(master.term)) {
            entries.slice(1).forEach((e) => {
                if (e.days === null && master.days !== null) { problems.push('No Of Days is missing on ' + e.name + ' - it must be ' + master.days + ', same as ' + master.name + '.'); marks.push([e, 'payment_terms_days', 'Must be ' + master.days + ' - same as ' + master.name]); }
                else if (e.days !== null && master.days !== null && e.days !== master.days) { problems.push('No Of Days differs - ' + master.name + ': ' + master.days + ', ' + e.name + ': ' + e.days + '.'); marks.push([e, 'payment_terms_days', 'Must be ' + master.days + ' - same as ' + master.name]); }
                if (e.rate === null && master.rate !== null) { problems.push('Prevailing rate of Bank Interest is missing on ' + e.name + ' - it must be ' + master.rate + '%, same as ' + master.name + '.'); marks.push([e, 'bank_int_rate', 'Must be ' + master.rate + '% - same as ' + master.name]); }
                else if (e.rate !== null && master.rate !== null && Math.abs(e.rate - master.rate) > 0.00005) { problems.push('Prevailing rate of Bank Interest differs - ' + master.name + ': ' + master.rate + '%, ' + e.name + ': ' + e.rate + '%.'); marks.push([e, 'bank_int_rate', 'Must be ' + master.rate + '% - same as ' + master.name]); }
            });
        }
        if (!problems.length) return;
        // the inline mark goes on the type on screen when it is one of the mismatching ones
        const apis = marks.map(([e, k, msg]) => { const api = e.pfx + k; if (!this._crossMsg[api]) this._crossMsg[api] = msg; this._crossFields.push(api); return { api, e }; });
        const focus = apis.find((x) => x.e.name === onScreen) || apis[0];
        this._crossErrors.push({ title: 'Telecom Tower - Payment Terms Mismatch', where: 'Payment Terms Section', apiName: focus.api, apis: apis.map((x) => x.api),
            inline: this._crossMsg[focus.api],
            message: 'Every tower type with the Interest Component turned on must use the same Payment Terms: ' + problems.join(' ') + ' Please correct it before saving.' });
    }

    /**
     * createQuote._validateTelecomInterestFinal: among the tower types that have a line on this
     * quote, "Interest Component (as per respective payment terms)?" must be ticked on all of
     * them or on none.
     */
    _validateTelecomInterestComponent() {
        const parts = this._telecomTypesInPlay().filter((p) => p.hasLines).map((p) => ({ ...p, on: this._readBool(p.pfx + 'payment_terms_req') }));
        if (parts.length < 2) return;
        const on = parts.filter((p) => p.on), off = parts.filter((p) => !p.on);
        if (!on.length || !off.length) return;
        const onScreen = this._readStr('telecom_product_details');
        const target = parts.find((p) => p.name === onScreen) || off[0];
        const api = target.pfx + 'payment_terms_req';
        this._crossFields.push(api);
        this._crossMsg[api] = target.on ? 'Others do not have this ticked' : 'Tick this - ' + on.map((p) => p.name).join(', ') + ' ' + (on.length > 1 ? 'have' : 'has') + ' it';
        this._crossErrors.push({ title: 'Telecom Tower - Interest Component Mismatch', where: 'Payment Terms Section', apiName: api, apis: parts.map((p) => p.pfx + 'payment_terms_req'), inline: this._crossMsg[api],
            message: on.map((p) => p.name).join(', ') + ' ' + (on.length > 1 ? 'have' : 'has') + ' "Interest Component (as per respective payment terms)?" ticked, but ' + off.map((p) => p.name).join(', ') + ' ' + (off.length > 1 ? 'do' : 'does') + ' not. Every tower type on this quote must use the same setting.' });
    }

    /* Telecom: no month-year pricing fetch - rates come from the per-type Price Calculator rows */
    productPricingFetch() { /* nothing */ }

    /* HM / Transmission Pole: every line comes from the column-repeater items - no extra rows */
    productExtraLines() { return []; }

    /* HM / Transmission Pole: the domestic estimator applies no product-specific validator on
       this branch beyond the required / min / max rules every field carries. The Project
       Set-up freight term (Ex-works / F.O.R) is a single picklist here, nothing to cross-check. */
    /* Telecom: every rule weightEstimatorModal (on each modal's Apply) and createQuote (on the
       quote's Apply) run for Telecom Tower - live here, and blocking on Apply */
    productValidate() {
        this._validateTelecomComposition();
        this._validateTelecomPaymentTerms();
        this._validateTelecomInterestComponent();
    }

}

/* ---------------------------------------------------------------- helpers */
function safeParse(s) { if (!s) return null; if (typeof s === 'object') return s; try { return JSON.parse(s); } catch (e) { return null; } }
function errMsg(e) { return (e && e.body && e.body.message) || (e && e.message) || String(e); }
function chev(open) { return open ? 'utility:chevrondown' : 'utility:chevronright'; }
function fmt(n) { return isFinite(n) ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''; }
/* quote-currency figure (USD 1,134,284.43) - international grouping, as the parent's summary (fmtN) */
function fmtFc(n) { return isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''; }
function flatten(obj, out = {}) {
    Object.keys(obj).forEach((k) => { const v = obj[k]; if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, out); else out[k] = v; });
    return out;
}

/* =====================================================================
   ENGINE - visibility + formulas + line derivation (shared logic)
   ===================================================================== */
const PASSES = 6;
const IDENT = /[A-Za-z_$][A-Za-z0-9_$]*/g;
const JS_RESERVED = new Set(['Math', 'Number', 'String', 'Boolean', 'parseFloat', 'parseInt', 'isNaN', 'isFinite', 'true', 'false', 'null', 'undefined', 'typeof', 'Infinity', 'NaN', 'Array', 'Object', 'JSON', 'Date', 'round', 'max', 'min', 'abs', 'floor', 'ceil', 'pow', 'sqrt', 'toFixed',
    // the Transmission Pole segment-2 weight formula is an arrow function with its own locals
    // ((() => { const N = ...; return ...; })()) - keywords can never be formula arguments
    'const', 'let', 'var', 'return', 'function', 'if', 'else', 'new', 'instanceof', 'in', 'of', 'for', 'while', 'do', 'break', 'continue', 'switch', 'case', 'default', 'try', 'catch', 'finally', 'throw', 'void', 'delete', 'this', 'class', 'yield', 'await', 'async', 'arguments', 'trim', 'replace', 'cos', 'tan', 'sin', 'PI']);

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
        const done = new Set();     // formulas already computed in THIS call (pass 0 ordering)
        compiled.forEach((entry, apiName) => {
            const f = byName.get(apiName);
            if (!f) return;
            if (overrides && overrides.has(apiName)) return;
            // FORWARD REFERENCE on the first pass: REALIZATION (= total - base) is listed before
            // REALIZATION ON SEGMENT PRICE (= base + realization) in the Transmission Pole
            // blueprint. Read in file order the first one would see a blank total and settle
            // on -base / 0 for good. So on the first pass a formula waits while one of its
            // dependencies is a formula that has not been computed yet and is still blank;
            // the pair then resolves from the seeded default (5 -> 100 -> 5), exactly the
            // figures the estimator shows. From the second pass on nothing is deferred.
            if (pass === 0 && entry.deps.some((d) => compiled.has(d) && !done.has(d) && isBlank(values[d]))) return;
            done.add(apiName);
            try {
                // A number-type field enters a formula AS A NUMBER: the JSON defaults are strings
                // ("4", "1800"), the saved inputs may be too, and a blank field is "". JavaScript
                // then CONCATENATES - (80 + 4 + "4" + 6) * wt = "8446" * wt, Railway/Crash Tested
                // unit prices tens of times too high, Noise Barrier NaN once a realization % is
                // typed. The estimator never sees that because its inputs arrive as numbers; this
                // makes the formulas see exactly what they see there. Picklists / text stay as-is.
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
                    name: g.lineName || ((title ? title + ' - ' : '') + cleanLabel), weight, quantity: qty, realization,
                    unitPrice: r2(unitPrice), unitCost: r2(unitCost), listPrice: r2(listPrice), discount, margin, uom };
                if (!suffixes) lines.push(base);
                else suffixes.forEach((sfx) => lines.push({ ...base, id: base.id + ':' + sfx, name: base.name + ' [' + sfx + ']', suffix: sfx }));
            });
        });
    });
    return lines;
}