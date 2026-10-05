/* ═══════════════════════════════════════════════════════════════════════════
   highMastImEstimator — High Mast estimator of the INTERNATIONAL MARKETING quote.
   Deepanjan (28th September 2026)

   A copy of hmEstimator (the High Mast cross-product estimator of the domestic
   createQuote), which is itself the weightEstimatorModal engine with a live UI.
   Every addition for the International tab is tagged [im]:
     - INLINE mode (@api inline): the sections are drawn as cards inside the High
       Mast tab of internationalQuote instead of a modal; no backdrop, no header, no
       APPLY / CLOSE footer. The host (highMastImConfig) opens one instance per
       folder of the domestic accordion (Weight Estimator, HM Items, Customer
       Address, Terms & Conditions) with the SAME config createQuote hands the modal.
     - LIVE APPLY: after every recalculation the instance emits 'imlive' with the
       very payload the domestic APPLY sends ('applyvalues': values + lineItems +
       parentPushes), computed by the unchanged _applyNow() in headless mode. The
       host merges it exactly as createQuote.handleModalApply does. Nothing is ever
       lost to a forgotten APPLY.
     - imValidate() / imFocus(): the domestic validateRequiredFields() rules (required,
       min, accessory block ...), returned as a list instead of a toast, so the parent
       can show them in its own error panel; the failing field can be scrolled to.
     - imSetSaved(bag): the other folders' values (the domestic modalSavedData bridge
       _lastValues) refreshed live while this instance stays open.
     - currency: a unit price / cost tile also shows the quote-currency figure.
   Calculation, visibility, blueprint cloning, segment generation, line naming and
   validation are the domestic ones - no formula, rule or message was changed.
   hmEstimator's own notes follow.
   ─────────────────────────────────────────────────────────────────────────────
   hmEstimator — High Mast estimator. Deepanjan (27th September 2026)

   The formula / visibility / blueprint / segment engine below is the
   weightEstimatorModal.js engine, copied VERBATIM (same file, same order, same
   comments). It takes the same config through openModal(config) and answers with
   the same 'applyvalues' event, so the parent needs no change to host it in place
   of the modal for High Mast.

   Only the UI layer differs, and every such change is tagged "hmEstimator":
     1. LIVE FIGURES, NO LAG (28th Sep 2026) - the International Marketing pattern
        (tpImConfig / transmissionImConfig / telecomImConfig): every field is a NATIVE
        <input> / <select> / <textarea> with onchange, so a keystroke costs nothing and
        ONE change event arrives when the user leaves the field. That change runs the
        very same _calculateNow() the CALCULATE button ran (120 ms debounce, as in IM)
        and the figures update on the spot - no CALCULATE button, no spinner.
        lightning-input fired a change per keystroke, which is what made typing lag.
        The engine's per-formula console.log calls are silenced. Number fields are
        text boxes, exactly as the domestic lightning-input type="float" was (not a
        valid lightning-input type - it falls back to text), so what is stored is what
        is typed. Audit of 28 Sep 2026: typing is never lost to a re-render, the last
        typed field is committed before APPLY / CLOSE, side effects only where the
        domestic modal runs them, compiled formulas guarded by a tokenizer.
     2. CALCULATED VALUES IN A POPUP - on a section card only the inputs stay;
        the read-only computed fields of that section open in a popup from a
        "Calculated values (N)" button. Table sections (grid-header / column
        repeater) keep every cell, so their rows stay aligned.
     3. REQUIRED MARKS ONLY AFTER INPUT - a required field is marked red only
        after the user has touched it, or after an APPLY that failed validation.
   ═══════════════════════════════════════════════════════════════════════════ */
import { LightningElement, api, track } from 'lwc';
import fetchBlueprintPayload from '@salesforce/apex/CreateQuoteController.fetchBlueprintPayload';
import { ShowToastEvent } from 'lightning/platformShowToastEvent'; // 👉 Required for the warning popup
import getPriceVariationData from '@salesforce/apex/CreateQuoteController.getPriceVariationData';
import getRateCardJson from '@salesforce/apex/CreateQuoteController.getRateCardJson';
import getTransmissionPricing from '@salesforce/apex/CreateQuoteController.getTransmissionPricing';
import {
    validateSegmentCount,
    buildDynamicMast,
    buildNotReadyPlaceholder
} from './segmentGeneratorIm';
import CORE_SUBTYPE_DATA from './coreSubtypeWeightDataIm';

/* ═══════════════════════════════════════════════════════════════════════════
   PERF: formula-engine caches. Pure memoisation - no rule, order or result of
   the math engine changes. Compiled once, reused for the life of the tab.
   Previously _evaluateAllFormulas compiled 3 RegExps per valMap key, per
   formula field, per pass (3 passes) => tens of millions of compiles a keystroke.
   - Reetabrata (9th July 2026)
   ═══════════════════════════════════════════════════════════════════════════ */
const _TOKEN_RE = /[A-Za-z_$][A-Za-z0-9_$]*/g;          // maximal-munch identifier scan
const _IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;         // key is a plain identifier?
const _RE_CACHE = new Map();                            // key -> { word, dot, probe }
const _FN_CACHE = new Map();                            // expr -> compiled Function
 
function _reFor(key) {
    let e = _RE_CACHE.get(key);
    if (!e) {
        const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        e = {
            word:  new RegExp('\\b' + esc + '\\b', 'g'),   // used only in .replace() -> lastIndex resets
            dot:   new RegExp('\\b' + esc + '\\b\\.'),     // non-global .test() -> no lastIndex drift
            probe: new RegExp('\\b' + esc + '\\b')
        };
        _RE_CACHE.set(key, e);
    }
    return e;
}
 
// PERF - Deepanjan (4th September 2026)
// _expandFields compiled `new RegExp('\\b' + apiName + '\\b', 'g')` once per column per
// sub-field per apiName - ~68,000 compiles for one Custom Lighting Pole open. The pattern
// depends only on apiName, so it is compiled once here and reused. Built from the SAME
// unescaped string as the original, so it matches exactly what it matched before.
// (Deliberately NOT _reFor: that one escapes metacharacters, which the original did not.)
const _PREFIX_RE_CACHE = new Map();
function _prefixReFor(apiName) {
    let re = _PREFIX_RE_CACHE.get(apiName);
    if (!re) {
        re = new RegExp(`\\b${apiName}\\b`, 'g');
        _PREFIX_RE_CACHE.set(apiName, re);
    }
    return re;
}

/* ═══════════════════════════════════════════════════════════════════════════
   hmEstimator - COMPILED FORMULAS (IM engine). Deepanjan (28th September 2026)

   _evaluateAllFormulas builds, for every formula field on every pass, a NEW expression
   string by pasting the current values into the formula text, and compiles a Function
   from it - so a changed value means a fresh compile (_FN_CACHE only helps while nothing
   changes). The IM children (tpImConfig ...) compile a formula ONCE, with its parents as
   parameters, and call it with the values. The same is done here, and it is what turns
   a 200 ms pass on a full LCLM quote into a few milliseconds.

   The pasted-text semantics are kept EXACTLY: the compiled source is the very expression
   the original builds (row prefix step included), with each value replaced by a named
   parameter instead of its text; the value handed to the parameter is what that text
   would have evaluated to (number, string, the boolean of a saved checkbox, the raw
   string for a key used with a dot method).

   The formula is read with a small JavaScript tokenizer first (_hmLex), and it is NOT
   compiled - _hmFastFormula returns null and the original text substitution below runs
   unchanged for that field - whenever pasting text could behave differently from passing
   a value (audit of 28th September 2026):
     - a field name inside a string literal ('discount ' + d: the original pastes INTO the text)
     - a field name used as a property (x.key, x?.key) or as an object-literal key
     - a regular-expression literal, a template literal, a comment, an unknown character
     - an assignment or ++ / -- / => / ... anywhere (the original gets a syntax error)
     - a value with a quote, backslash, line break or $ in it, or naming another field
     - a NEGATIVE number where the pasted "-3" is a unary minus that binds differently:
       right after a minus (x--3), or before ** . ?. [ ( (-3 ** 2, -2.3.toFixed)
     - declarations / this / new / eval ... (arrow-function formulas)
   ═══════════════════════════════════════════════════════════════════════════ */
const _HM_FX = new Map();            // formula text -> { tokens, cands, unsafe, byKey: Map(prefix|mask -> entry) }
const _HM_STR_OK = new Map();        // value string -> { clean, toks }
const _HM_PREFIX_TOKEN_RE = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;     // the row-prefix step's own scan
const _HM_UNSAFE_FORMULA = /=>|\bfunction\b|\bconst\b|\blet\b|\bvar\b|\bclass\b|\bthis\b|\barguments\b|\bnew\b|\beval\b|\bwith\b|\byield\b|\bawait\b|\$|\/\/|\/\*|`|__hm/;
// punctuators, longest first
const _HM_PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=',
    '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>'];
const _HM_ASSIGN = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??=', '++', '--', '=>', '...']);
// after one of these words a "/" starts a regular expression, not a division
const _HM_KW_BEFORE_REGEX = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const _HM_ONE_CHAR = '{}()[];,<>+-*/%&|^!~?:=.';

// JavaScript tokens of an expression, or null when anything is not plainly an expression
// this tokenizer understands (then the formula is simply not compiled).
function _hmLex(src) {
    const out = [];
    const n = src.length;
    let i = 0;
    while (i < n) {
        const ch = src[i];
        if (/\s/.test(ch)) { i++; continue; }
        if (/[A-Za-z_$]/.test(ch)) {
            let j = i + 1;
            while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
            out.push({ t: 'id', v: src.slice(i, j), s: i, e: j });
            i = j;
            continue;
        }
        if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
            const m = /^(?:0[xX][0-9a-fA-F]+|0[oO][0-7]+|0[bB][01]+|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)/.exec(src.slice(i));
            if (!m) return null;
            const j = i + m[0].length;
            if (j < n && /[A-Za-z0-9_$.]/.test(src[j])) return null;     // 1n, 1_000, 5.toFixed ...
            out.push({ t: 'num', v: m[0], s: i, e: j });
            i = j;
            continue;
        }
        if (ch === "'" || ch === '"') {
            let j = i + 1;
            while (j < n && src[j] !== ch) {
                if (src[j] === '\\') j++;
                if (j >= n || src[j] === '\n' || src[j] === '\r') return null;
                j++;
            }
            if (j >= n) return null;
            out.push({ t: 'str', v: src.slice(i, j + 1), s: i, e: j + 1 });
            i = j + 1;
            continue;
        }
        if (ch === '`') return null;
        if (ch === '/') {
            if (src[i + 1] === '/' || src[i + 1] === '*') return null;
            const p = out.length ? out[out.length - 1] : null;
            const division = !!p && (p.t === 'num' || p.t === 'str'
                || (p.t === 'id' && !_HM_KW_BEFORE_REGEX.has(p.v))
                || (p.t === 'p' && (p.v === ')' || p.v === ']')));
            if (!division) return null;           // a regular expression literal - not compiled
        }
        let v = null;
        for (let k = 0; k < _HM_PUNCT.length; k++) { if (src.startsWith(_HM_PUNCT[k], i)) { v = _HM_PUNCT[k]; break; } }
        if (v === '?.' && /[0-9]/.test(src[i + 2] || '')) v = null;       // "? .5" is a conditional
        if (v === null) {
            if (_HM_ONE_CHAR.indexOf(ch) >= 0) v = ch;
            else return null;
        }
        out.push({ t: 'p', v, s: i, e: i + v.length });
        i += v.length;
    }
    return out;
}

// Can every present key of this expression be passed as a parameter with exactly the
// result the pasted text gives? null = no; otherwise which keys must never receive a
// negative number (negRisk[i]).
function _hmAnalyse(expr, keys) {
    const toks = _hmLex(expr);
    if (!toks) return null;
    const probes = keys.map((k) => _reFor(k).probe);
    for (let x = 0; x < toks.length; x++) {
        const tk = toks[x];
        if (tk.t === 'p' && _HM_ASSIGN.has(tk.v)) return null;
        if (tk.t === 'str' && probes.some((re) => re.test(tk.v))) return null;   // the original pastes into the text
    }
    const keyIdx = new Map(keys.map((k, i) => [k, i]));
    const negRisk = keys.map(() => false);
    const stack = [];
    for (let x = 0; x < toks.length; x++) {
        const tk = toks[x];
        if (tk.t === 'p') {
            if (tk.v === '(' || tk.v === '[' || tk.v === '{') stack.push(tk.v);
            else if (tk.v === ')' || tk.v === ']' || tk.v === '}') stack.pop();
            continue;
        }
        if (tk.t !== 'id' || !keyIdx.has(tk.v)) continue;
        const i = keyIdx.get(tk.v);
        const prev = x > 0 ? toks[x - 1] : null;
        const next = x + 1 < toks.length ? toks[x + 1] : null;
        if (prev && prev.t === 'p' && (prev.v === '.' || prev.v === '?.')) return null;               // x.key
        if (stack[stack.length - 1] === '{' && prev && prev.t === 'p' && (prev.v === '{' || prev.v === ',')) return null;   // { key: .. } / { key }
        if (tk.s > 0 && expr[tk.s - 1] === '-') negRisk[i] = true;                                   // x--3
        if (next && next.t === 'p' && (next.v === '**' || next.v === '.' || next.v === '?.' || next.v === '[' || next.v === '(')) negRisk[i] = true;   // -3 ** 2, -2.3.toFixed
    }
    return { negRisk };
}

function _hmStrOk(str, valKeySet) {
    // the character test is a property of the string (cached); whether it names another
    // field depends on the key set of THIS call, so that part is checked every time
    let c = _HM_STR_OK.get(str);
    if (c === undefined) {
        c = { clean: !/['\\$\n\r\u2028\u2029]/.test(str), toks: str.match(_TOKEN_RE) || [] };
        if (_HM_STR_OK.size > 5000) _HM_STR_OK.clear();
        _HM_STR_OK.set(str, c);
    }
    if (!c.clean) return false;
    for (let i = 0; i < c.toks.length; i++) { if (valKeySet.has(c.toks[i])) return false; }
    return true;
}
function _hmFastFormula(field, rowPrefix, rawMap, valMap, valKeySet, oddValKeys, memo) {
    if (oddValKeys.length) return null;
    // the compiled form depends on the formula, the row prefix and the key set - all fixed
    // for one _evaluateAllFormulas call, so passes 2 and 3 reuse pass 1's lookup
    let c = memo.get(field);
    if (c === undefined) { c = _hmCompiledFor(field, rowPrefix, valKeySet); memo.set(field, c); }
    if (c === null) return null;
    const args = [];
    for (let i = 0; i < c.keys.length; i++) {
        const k = c.keys[i];
        if (c.dot[i]) {
            const s = `${rawMap[k]}`;
            if (!_hmStrOk(s, valKeySet)) return null;
            args.push(s);
        } else {
            const v = valMap[k];
            if (typeof v === 'number') {
                if (v < 0 && c.negRisk[i]) return null;
                args.push(v === 0 ? 0 : v);
            } else if (v === 'true') {
                args.push(true);
            } else {
                const s = String(rawMap[k]);
                if (!_hmStrOk(s, valKeySet)) return null;
                args.push(s);
            }
        }
    }
    return { fn: c.fn, args };
}
function _hmCompiledFor(field, rowPrefix, valKeySet) {
    const formula = field.formula;
    let meta = _HM_FX.get(formula);
    if (!meta) {
        const tokens = formula.match(_HM_PREFIX_TOKEN_RE) || [];
        // the tokens the row-prefix step may rewrite, filtered once (same rule, same order)
        const cands = tokens.filter((token) => !(token === 'Math' || token === 'true' || token === 'false') && !/^r\d+_/.test(token));
        meta = { tokens, cands, unsafe: _HM_UNSAFE_FORMULA.test(formula), byKey: new Map() };
        if (_HM_FX.size > 20000) _HM_FX.clear();
        _HM_FX.set(formula, meta);
    }
    if (meta.unsafe) return null;
    // which un-prefixed tokens the row-prefix step would rewrite (same rule, same order)
    let pmask = '';
    if (rowPrefix) {
        const cands = meta.cands;
        for (let i = 0; i < cands.length; i++) pmask += valKeySet.has(rowPrefix + '_' + cands[i]) ? '1' : '0';
    }
    const key = (rowPrefix || '') + '|' + pmask;
    let entry = meta.byKey.get(key);
    if (!entry) {
        // the expression exactly as the original builds it after the row-prefix step
        let expr = formula;
        if (rowPrefix) {
            meta.cands.forEach((token, n) => { if (pmask[n] === '1') expr = expr.replace(_reFor(token).word, rowPrefix + '_' + token); });
        }
        const seenT = new Set();
        entry = { expr, utokens: (expr.match(_TOKEN_RE) || []).filter((t) => !seenT.has(t) && seenT.add(t)), byPresent: new Map() };
        meta.byKey.set(key, entry);
    }
    // which tokens of that expression are keys right now (first-appearance order, like _present)
    const present = []; let smask = '';
    const ut = entry.utokens;
    for (let i = 0; i < ut.length; i++) { if (valKeySet.has(ut[i])) { present.push(ut[i]); smask += '1'; } else smask += '0'; }
    let c = entry.byPresent.get(smask);
    if (!c) {
        const keys = present.slice().sort((a, b) => b.length - a.length);
        const ana = _hmAnalyse(entry.expr, keys);
        let fn = null;
        const dot = [];
        if (ana) {
            let src = entry.expr;
            keys.forEach((k, i) => {
                const re = _reFor(k);
                dot.push(re.dot.test(entry.expr));
                src = src.replace(re.word, '__hm' + i);
            });
            try { fn = Function('Math', ...keys.map((k, i) => '__hm' + i), '"use strict"; return (' + src + ')'); } catch (e) { fn = null; }
        }
        c = { keys, dot, negRisk: ana ? ana.negRisk : [], fn };
        entry.byPresent.set(smask, c);
    }
    return c.fn ? c : null;
}

function _fnFor(expr) {
    let fn = _FN_CACHE.get(expr);
    if (!fn) {
        if (_FN_CACHE.size > 5000) _FN_CACHE.clear();   // bound memory
        fn = Function('Math', '"use strict"; return (' + expr + ')');
        _FN_CACHE.set(expr, fn);
    }
    return fn;
}

/*
const MULTI_PRICE_MODAL_TITLES = [
    'STANDARD POLE ESTIMATOR',
    'CUSTOMIZED POLE ESTIMATOR'
];
*/
// api names mapped based on modal - for bom validation check
const TELECOM_COMPOSITION_GROUPS = {
        'Tubular':            ['tub_pipe_com', 'tub_plate_com', 'tub_ang_chan_com', 'tub_misc_com'],
        'Tubular Signalling': ['tsg_pipe_com', 'tsg_plate_com', 'tsg_ang_chan_com', 'tsg_misc_com']
    };
const TELECOM_COMPOSITION_APIS = [].concat(...Object.values(TELECOM_COMPOSITION_GROUPS));

// hmEstimator: the engine's console.log calls (three per formula per pass, plus the
// lookup ones that stringify whole weight maps) are the single biggest cost of a calc
// pass with DevTools open. Routed to a no-op here; console.error / console.warn stay.
const _hmLog = () => {};
// [im] the computed figures that leave the card for the CALCULATED VALUES panel: price / cost /
// realization / weight / margin (and a unit price / unit cost flag). Every other read-only value -
// the default segment dimensions an OVERRIDE toggle replaces, quantities, BOM item counts - stays
// on the card, as the domestic modal shows it.
const IM_FX_RE = /price|cost|realization|realisation|weight|margin|amount/i;
const IM_RO_TABLE_MIN = 12;     // [im] a section of only read-only cells with more than this many opens in a panel (VIEW)
export default class HighMastImEstimator extends LightningElement {

    
    
@api isReadOnly = false;
    // ═══════════════════════════ [im] International Marketing ═══════════════════════════
    @api inline = false;               // [im] drawn in place (no modal shell, no footer)
    @api folderKey = '';               // [im] the host's key of this folder (echoed on every imlive)
    _imCurrencyCode = '';              // [im] quote currency (USD ...); '' / INR = no second figure
    _imExchangeRate = 1;               // [im] INR per 1 unit of that currency
    @api get currencyCode() { return this._imCurrencyCode; }
    set currencyCode(v) { this._imCurrencyCode = v || ''; if (this.isModalOpen) this._hmRefreshUI(); }
    @api get exchangeRate() { return this._imExchangeRate; }
    set exchangeRate(v) { this._imExchangeRate = v; if (this.isModalOpen) this._hmRefreshUI(); }
    _imEmitTimer = null;
    _imOpenSec = null;                 // [im] the table section open in the full-width panel
    _imDoneErr = '';                   // [im] what DONE found wrong in the open panel
    _imLastEmitted = '';               // [im] JSON of the last imlive payload - a pass that changes nothing emits nothing
    get imWrapCls() { return this.inline ? 'hm-wrap im-inline' : 'hm-wrap'; }
    get imShowShell() { return !this.inline; }
    // [im] the domestic APPLY payload of this instance, without the event / reset / toasts
    _imResult() {
        const wasHeadless = this._headlessMode;
        this._headlessMode = true;
        this._headlessResult = null;
        try { this._applyNow(); } finally { this._headlessMode = wasHeadless; }
        const r = this._headlessResult;
        this._headlessResult = null;
        return r;
    }
    // [im] emit the live payload once the current pass (and its render) is over
    _imEmitSoon() {
        if (!this.inline) return;
        clearTimeout(this._imEmitTimer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._imEmitTimer = setTimeout(() => this._imEmitNow(), 0);
    }
    _imEmitNow() {
        if (!this.inline || !this.isModalOpen || !this._modalConfig) return;
        let r = null;
        try { r = this._imResult(); } catch (e) { console.error('[im] live apply failed', e); return; }
        if (!r) return;
        const payload = { folderKey: this.folderKey, title: this.modalTitle, values: r.values, lineItems: r.lineItems, parentPushes: r.parentPushes };
        let sig = '';
        try { sig = JSON.stringify(payload); } catch (e) { sig = String(Date.now()); }
        if (sig === this._imLastEmitted) return;
        this._imLastEmitted = sig;
        this.dispatchEvent(new CustomEvent('imlive', { detail: payload }));
    }
    /** [im] the host's flat bag changed elsewhere (another folder, another product): refresh the bridge */
    @api
    imSetSaved(bag) {
        if (!bag || typeof bag !== 'object' || !this.isModalOpen) return;
        const own = new Set();
        (this.accordionSections || []).forEach(sec => (sec.fields || []).forEach(f => { if (f && f.apiName) own.add(f.apiName); }));
        let changed = false;
        Object.keys(bag).forEach(k => {
            if (own.has(k) || k.charAt(0) === '_') return;
            if (this._lastValues[k] !== bag[k]) { this._lastValues[k] = bag[k]; changed = true; }
        });
        if (!changed) return;
        clearTimeout(this._hmLiveTimer);
        try { this._calculateNow(); } catch (e) { console.error('[im] recalculation failed', e); }
        this._imResolveDependents();   // KIT: CABLE TYPE / WINCH / POWER TOOL / WIRE ROPE follow the segment count that just arrived
        this._imEmitSoon();
    }
    /**
     * [im] Dependent picklists (dependentOptionsMap) are resolved by the domestic engine on load
     * and when their controlling field is the one just edited. In the IM flow the controlling
     * field is often a FORMULA fed by another folder (KIT no_of_segment_select = the Weight
     * Estimator's segment count), so its value arrives through a calculation pass, not an
     * edit - the options stayed empty until Apply + reopen. Re-run the load resolution after
     * every pass; it never clears a chosen value, it only refreshes the option lists.
     */
    _imResolveDependents() {
        if (!this.inline) return;
        let changed = false, cleared = false;
        for (let round = 0; round < 3; round++) {   // a dependent of a cleared dependent follows in the next round
            let clearedNow = false;
            try {
                const lens = () => (this.accordionSections || []).map(sec => sec.fields.filter(f => f.dependentOptionsMap).map(f => (f.options || []).length).join(',')).join(';');
                const before = lens();
                this._resolveDependentOptionsOnLoad();
                if (lens() !== before) changed = true;
                // A chosen value the new option list no longer offers is removed, exactly as the
                // clear (x) button does - segment count 4 -> 3 drops "S=6 Sq.mm 5 Core" from CABLE
                // TYPE, so the pick goes and the field asks again (required). An empty list means
                // the controlling value is not known yet (reopen, before the math) - kept. Never on
                // a read-only quote. Deepanjan (29th September 2026)
                if (!this.isReadOnly) {
                    const gone = new Set();
                    this.accordionSections.forEach(sec => (sec.fields || []).forEach(f => {
                        if (!f.dependentOptionsMap || f.type !== 'picklist') return;
                        const v = f.value;
                        if (v === '' || v === null || v === undefined) return;
                        const opts = (f.options || []).map(o => String(o !== null && typeof o === 'object' && o.value !== undefined ? o.value : o));
                        if (!opts.length || opts.indexOf(String(v)) !== -1) return;
                        gone.add(f.apiName);
                    }));
                    gone.forEach(api => {
                        this.accordionSections.forEach(sec => (sec.fields || []).forEach(f => {
                            if (f.apiName !== api) return;
                            f.value = ''; f.userCleared = true; f.isManualOverride = false; f.touched = true;
                        }));
                        this._lastValues[api] = '';
                        this._lastValues[`${api}__cleared`] = true;
                        this._lastValues[`${api}__manual`] = false;
                    });
                    if (gone.size) { clearedNow = true; cleared = true; }
                }
            } catch (e) { console.error('[im] dependent options', e); }
            if (!clearedNow) break;
            try { this._calculateNow(); } catch (e) { /* the next pass repairs it */ }   // the BOM formulas reading the cleared pick follow
        }
        if (!cleared && changed) this._hmRefreshUI();
    }
    /** [im] force a live emit (the host asks once after it has wired the folder) */
    @api
    imRefresh() { this._imLastEmitted = ''; this._imEmitSoon(); }
    /** [im] the domestic Apply validation as a list: [] = ok. Marks every required field like a failed APPLY. */
    @api
    imValidate() {
        this._hmFlushActive();
        clearTimeout(this._hmLiveTimer);
        try { this._calculateNow(); } catch (e) { /* the figures on screen are used */ }
        const missing = this._imMissingFields();
        if (missing.length) { this._hmShowAllRequired = true; this._hmRefreshUI(); }
        // every message once, with the field to focus when a field produced it
        const apiOf = new Map((this._imMissingApis || []).map(x => [x.message, x.apiName]));
        return missing.map(m => ({ message: m, apiName: apiOf.get(m) || '' }));
    }
    /** [im] open the section of a field and scroll to it */
    @api
    imFocus(apiName) {
        if (!apiName) return false;
        let found = false;
        this.accordionSections.forEach(sec => {
            if (sec.fields.some(f => f.apiName === apiName)) {
                sec.isExpanded = true;
                this._updateSectionUI(sec);
                if (sec.imTable) { this._imOpenSec = sec.id; this._updateSectionUI(sec); }   // [im] the field sits in a panel
                found = true;
            }
        });
        if (!found) return false;
        this.accordionSections = [...this.accordionSections];
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const el = this.template.querySelector(`[data-name="${apiName}"]`);
            if (el && el.scrollIntoView) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus) el.focus(); }
        }, 60);
        return true;
    }
    /** [im] a plain summary of the sections on screen (diagnostics / harness only) */
    @api
    imSections() {
        return (this.accordionSections || []).map(sec => ({ id: sec.id, label: sec.label, grid: sec.gridWrapperClass, table: !!sec.imTable, visible: sec.isVisible !== false,
            fields: (sec.visibleFields || []).map(f => ({ apiName: f.apiName, type: f.type, colSpan: f.colSpan, readOnly: !!f.baseReadOnly, formula: !!f.formula,
                label: f.label, unit: f.unit || '', price: !!f.isUnitPrice, cost: !!f.isUnitCost, weight: !!(f.lookupWeight || f.weightMap), card: (sec.cardFields || []).indexOf(f) !== -1 && !f.imCalc && !f.imHidden,
                calc: (sec.calcFields || []).some(r => r.key === f.apiName) })),
            calcCount: sec.calcCount || 0,
            calcRows: (sec.calcFields || []).map(r => ({ key: r.key, label: r.label, value: r.value, group: !!r.isGroup })),
            calcGrid: sec.calcGrid ? { by: sec.calcGrid.by, cols: sec.calcGrid.cols.map(c => c.label), rows: sec.calcGrid.rows.map(r => [r.label].concat(r.cells.map(c => c.value))), extra: (sec.calcGrid.extra || []).length } : null }));
    }
    /** [im] every field this instance owns (the host splits the bag by owner) */
    @api
    imFieldNames() {
        const out = [];
        (this.accordionSections || []).forEach(sec => (sec.fields || []).forEach(f => { if (f && f.apiName && f.type !== 'header') out.push(f.apiName); }));
        return out;
    }
    // ═══════════════════════════════════════════════════════════════════════════════════
    @track isModalOpen = false;
    @track modalTitle = '';
    // hmEstimator: THE ENGINE'S TREE OFF THE @track PROXY (IM engine, 28th Sep 2026).
    // @track wraps every section / field in a reactive proxy, so each of the hundreds of
    // thousands of property reads and writes a calc pass makes went through the membrane -
    // 4-5x slower in the browser than the same code on plain objects. The IM children keep
    // their model in plain objects and hand the template a fresh tree; the same is done
    // here without touching the engine: accordionSections is a getter/setter over a plain
    // array, and every assignment (the engine reassigns after each pass, toggle, clear ...)
    // also lands on hmView, a reactive field, which is what makes the template re-render.
    // The template reads accordionSections as before.
    _hmSections = [];
    hmView = [];
    get accordionSections() { return this._hmSections; }
    set accordionSections(v) { this._hmSections = v; this.hmView = v; }
    @track isLoading = false;
 
    _modalConfig = null;
    _lastValues = {};
    _typingTimer;
    _segCountTimer; // debounce for the Segment-Above-5 count validation - Reetabrata (8th July)
    _structuralApis = null; // api names that OTHER fields depend on (counts / controllers) - Reetabrata (8th July)
    @track columnTotalsArray = [];
    @track baseRates = {};
    _pvRowData = {};
    _pvSharedKey = '';
 
    @track rateCardData = [];

    _headlessMode = false;
    _headlessResult = null;
    @track hmCalc = null;              // hmEstimator: the open "Calculated values" popup
    _hmShowAllRequired = false;        // hmEstimator: set by a failed APPLY validation
    _hmTyping = null;                  // hmEstimator: { name, value, sel } of the field being typed in, until its change event
 
    // =========================================================
    // PUBLIC API
    // =========================================================
    @api
    async openModal(config) {
        try {
            if (!config) return;
            clearTimeout(this._hmLiveTimer);   // hmEstimator: a pass pending from the last open never runs on this one
            this._hmTyping = null;
            this.hmCalc = null;
            this._hmShowAllRequired = false;
 
            this.isLoading = true;
// ─────────────────Reetabrata (7th July)────────────────────────────────────────
            // let the spinner paint before the heavy synchronous build - Reetabrata (8th July)
            await new Promise(requestAnimationFrame);
            await new Promise(resolve => setTimeout(resolve, 0));
// ─────────────────Reetabrata (7th July)────────────────────────────────────────
 
            // Instantly flattens accidental arrays into safe strings -Abhishek saxena
            this._modalConfig = JSON.parse(JSON.stringify(config, (key, value) => {
                if ((key === 'controllingField' || key === 'disableControllingField') && Array.isArray(value)) {
                    return value.join(',');
                }
                return value;
            }));
            //end
            this.modalTitle = this._modalConfig.title || 'ESTIMATOR';
            // Approval marks passed by createQuote for review: outline the ONE input the
            // approval rule evaluated. null on every non-approval open, and then nothing
            // below ever runs. Deepanjan (20th September 2026)
            this._apvTriggers = this._modalConfig.approvalTriggers || null;
            this.baseRates = config.baseRates || {};
            this._modalConfig.blueprints = {};
            // 👉 ADD THIS LINE: Catch the massive JSON dict from the parent!
            //Abhishek saxena
           this.baseRates = this._modalConfig.baseRates || {};
            this.weightManifest = this._modalConfig.weightManifest || {};
            //End
            //this._lastValues = this._modalConfig.savedData || {};
            this._lastValues = {
                ...this._lastValues,
                ...(this._modalConfig.savedData || {})
            };
 
            // add the same apis in _lastValues
            _hmLog('***line 51', this._modalConfig.preRegisterApis);
            if (this._modalConfig.preRegisterApis) {
                Object.keys(this._modalConfig.preRegisterApis).forEach(apiName => {
                    if (!(apiName in this._lastValues)) {
                        this._lastValues[apiName] = this._modalConfig.preRegisterApis[apiName];
                    }
                });
            }
 
            if (this._modalConfig.blueprintId) {
                let payloadString = await fetchBlueprintPayload({ blueprintId: this._modalConfig.blueprintId });
 
                if (payloadString) {
                    try {
                        // 👉 FIX: Handle both string AND Proxy/object returns
                        let parsed;
 
                        if (typeof payloadString === 'string') {
                            // It's a string — clean and parse it
                            payloadString = payloadString.replace(/[\u200B-\u200D\uFEFF]/g, '');
                            parsed = JSON.parse(payloadString);
                        } else if (typeof payloadString === 'object') {
                            // It's already an object (or Proxy) — convert to string first, then reparse to clean it
                            parsed = JSON.parse(JSON.stringify(payloadString));
                        } else {
                            parsed = payloadString;
                        }
 
                        this._modalConfig.blueprints = parsed;
                    } catch (parseError) {
                        console.error('❌ FATAL ERROR: JSON syntax error!', parseError);
                    }
                }
            }
 
            // ── SEGMENT ABOVE 5 (gated) Reetabrata (7th July)─────────────────────────────
if (this._modalConfig.dynamicSegments === true) {
    if (this._modalConfig.notReady === true) {
        this._modalConfig.modalFields =
            buildNotReadyPlaceholder(this._modalConfig.mastType);
    } else {
        const built = buildDynamicMast(this._modalConfig.mastType);
        this._modalConfig.modalFields = built.modalFields;
        this._modalConfig.blueprints = Object.assign(
            {}, this._modalConfig.blueprints || {}, built.blueprints
        );
    }
}
// ─────────────────Reetabrata (7th July)────────────────────────────────────────
 
            this.accordionSections = this._buildSections(this._modalConfig.modalFields || []);
            this._apvApplyFallback();   // approval: resolve marks that need the whole modal - Deepanjan (20th Sep 2026)
            this._apvMarkSources();     // approval: a marked field that only copies another field marks that source too - Deepanjan (22nd Sep 2026)
            this._buildStructuralApiSet(); // precompute which fields drive visibility - Reetabrata (8th July)
            this.isModalOpen = true;
 
            
 
            this.accordionSections.forEach(sec => {
                this._evaluateFieldVisibility(sec.fields);
                this._evaluateDynamicDisable(sec.fields); // 👉 SAFELY INJECTED HERE
 
 
                // WAKE UP DEPENDENT PICKLISTS ON PAGE LOAD: Abhishek saxena
                sec.fields.filter(f => f.dependentOptionsMap).forEach(dep => {
 
 
                    let ctrlNames = [];
                    if (Array.isArray(dep.controllingFields)) ctrlNames = dep.controllingFields;
                    else if (Array.isArray(dep.controllingField)) ctrlNames = dep.controllingField;
                    else if (typeof dep.controllingFields === 'string') ctrlNames = dep.controllingFields.split(',').map(s => s.trim());
                    else if (typeof dep.controllingField === 'string') ctrlNames = dep.controllingField.split(',').map(s => s.trim());
 
                    if (ctrlNames.length === 0) return;
 
 
                    let currentValues = ctrlNames.map(ctrlName => {
                        let ctrlField = sec.fields.find(x => x.apiName.endsWith(ctrlName) && x.columnCountIndex === dep.columnCountIndex);
                        return ctrlField && ctrlField.value ? String(ctrlField.value).trim() : '';
                    });
 
 
                    let possibleKeys = [];
                    let tempVals = [];
                    for (let val of currentValues) {
                        if (val !== '') {
                            tempVals.push(val);
                            possibleKeys.unshift(tempVals.join('|'));
                        } else {
                            break;
                        }
                    }
 
                    let matchedKey = possibleKeys.find(key => dep.dependentOptionsMap[key]);
                    let fullyFilled = currentValues.every(v => v !== '');
 
 
                    if (!dep.masterOptions) dep.masterOptions = dep.options ? [...dep.options] : [];
 
 
                    if (matchedKey) {
 
                        let mapVal = dep.dependentOptionsMap[matchedKey];
                        if (mapVal.length > 0 && typeof mapVal[0] === 'string') {
                            dep.options = mapVal.map(opt => ({ label: opt, value: opt }));
                        } else {
                            dep.options = mapVal;
                        }
                    } else if (fullyFilled) {
 
                        dep.options = dep.masterOptions;
                    } else {
 
                        dep.options = [];
                    }
                });
                // End 
 
            });
            // 👉 THE NEW FIX: Evaluate Lookups BEFORE UI render so dynamic pricing loads instantly!
            this._evaluateLookups();
            this._evaluateAllFormulas();
            this._evaluateSectionVisibility();
            this._evaluateAllFormulas();
            // ═══════════════════════════════════════════════════════════════════════
            // ★ CHANGE 1 of 5 — BUG 1 (KIT picklist options empty on first open) ★
            // Reetabrata (14th July 2026)
            // Re-resolve dependent picklist options now that formula-driven controlling
            // fields (no_of_segment_select, etc.) have values. The original onload
            // "WAKE UP DEPENDENT PICKLISTS" block (~line 172) is left untouched.
            // ═══════════════════════════════════════════════════════════════════════
            this._resolveDependentOptionsOnLoad(); // Reetabrata (14th July 2026)
            
            this._evaluateDynamicColSpans();
            this._evaluateSectionLabels();
 
            this.accordionSections = this.accordionSections.map(sec => {
                sec.fields.forEach(f => this._updateFieldUI(f));
                this._updateSectionUI(sec);
                return { ...sec };
            });
 
            // Fetch PV data if saved values already have month/year/materialType
            await this._checkAndFetchPriceVariation();


            this.isLoading = false;
            this._imLastEmitted = '';
            this._imEmitSoon();                        // [im] the lines / values of the opened folder, at once

        } catch (e) {
            console.error('openModal error:', e);
            this.isLoading = false;
        }
    }
 
    @api
    closeModal() {
        try {
            clearTimeout(this._hmLiveTimer);   // hmEstimator: no pass on a closed modal
            this._hmFlushActive();
            this._saveCurrentValues();
            this.isModalOpen = false;
        } catch (e) {
            console.error('closeModal error:', e);
        }
    }
 
    // fetch prices for Transmission Tower
    async _fetchSharedPvRates({ monthApi, yearApi, bloomsApi, billetsApi, zincApi, cpiApi, getFieldVal, setFieldVal }) {
        try {
            const month = getFieldVal(monthApi);
            const year = getFieldVal(yearApi);
 
            if (!month || !year) return;
 
            //const sharedKey = `${monthApi}_${month}_${year}`;
            //if (this._pvSharedKey === sharedKey) {
                //_hmLog(`[PV] Cache hit for ${sharedKey} — skipping fetch`);
               // return;
            //}
            _hmLog(`[PV] Fetching shared rates for ${monthApi} → ${month} ${year}`);
            this.isLoading = true;
 
            const sharedData = await getTransmissionPricing({
                month,
                year
            });
 
            _hmLog('*****line 214 ', monthApi, yearApi, cpiApi, month, year, sharedData);
 
            if (sharedData) {
                //update bloom price
                if (bloomsApi) {
                    setFieldVal(bloomsApi, Number(sharedData.bloomsPrice) || 0);
                    _hmLog(`[PV] ${bloomsApi} ← ${sharedData.bloomsPrice}`);
                }
 
                // update Billets value
                if (billetsApi) {
                    setFieldVal(billetsApi, Number(sharedData.billetsPrice) || 0);
                    _hmLog(`[PV] ${billetsApi} ← ${sharedData.billetsPrice}`);
                }
                // update zinc value
                if (zincApi) {
                    setFieldVal(zincApi, Number(sharedData.zincPrice) || 0);
                    _hmLog(`[PV] ${zincApi} ← ${sharedData.zincPrice}`);
                }
                // update zinc value
                if (cpiApi) {
                    setFieldVal(cpiApi, Number(sharedData.cpiValue) || 0);
                    _hmLog(`[PV] ${cpiApi} ← ${sharedData.cpiValue}`);
                }
 
                //this._pvSharedKey = sharedKey;
            }
 
            // ── Re-run the formula engine so dependent fields recalculate ─────────
            this.accordionSections.forEach(sec => this._evaluateFieldVisibility(sec.fields));
            this._evaluateLookups(); // 👉 NEW FIX: Re-evaluate dynamic lookups!
            this._evaluateSectionVisibility();
            this._evaluateAllFormulas();
            this.accordionSections = this.accordionSections.map(sec => {
                sec.fields.forEach(f => this._updateFieldUI(f));
                this._updateSectionUI(sec);
                return { ...sec };
            });
        }
        catch (ex) {
            console.error('[PV Shared] Error fetching transmission pricing:', JSON.stringify(ex));
        }
        finally {
            this.isLoading = false;
        }
    }
 
 
    async _checkAndFetchPriceVariation() {
        try {
 
            // ── Helpers ───────────────────────────────────────────────────────
            const getFieldVal = (apiName) => {
                if (!apiName) return '';
                for (const sec of this.accordionSections) {
                    const f = sec.fields.find(x => x.apiName === apiName);
                    if (f && f.value !== '' && f.value !== null && f.value !== undefined)
                        return String(f.value);
                }
                return String(this._lastValues[apiName] || '');
            };
 
            const setFieldVal = (apiName, value) => {
                if (!apiName) return;
                this.accordionSections.forEach(sec => {
                    const f = sec.fields.find(x => x.apiName === apiName);
                    if (f) { f.value = value; f.userCleared = false; }
                });
            };
 
            // ── Detect mode ───────────────────────────────────────────────────
            const basisValue = String(this._lastValues['Price_Basis'] || '');
 
            // With column-repeater, runtime fields are c1_material_list_type, c2_... etc.
            // Check for any c{N}_material_list_type field OR legacy _1 suffix
            const hasMaterialField = this.accordionSections.some(sec =>
                sec.fields.some(f =>
                    f.apiName === 'material_list_type_1' ||
                    /^c\d+_material_list_type$/.test(f.apiName)
                )
            );
            const hasPVMonthField = this.accordionSections.some(sec =>
                sec.fields.some(f => f.apiName === 'price_variable_month')
            );
 
            const isCoreMode = basisValue === 'Price Variation' && hasPVMonthField;
            const isFirmMode = hasMaterialField && !hasPVMonthField;
 
            // check Transmission Tower Modal - rajeev 15-06-2026
            const hasPvtMonth = this.accordionSections.some(sec =>
                sec.fields.some(f => f.apiName === 'pvt_price_variable_month')
            );
            const isTowerPvMode = hasPvtMonth && getFieldVal('pvt_price_basics') === 'Price Variation';
 
            // check Tranmission Substation Modal 
            const hasPvsMonth = this.accordionSections.some(sec =>
                sec.fields.some(f => f.apiName === 'pvs_price_variable_month')
            );
            const isSubstationPvMode = hasPvsMonth && getFieldVal('pvs_price_model') === 'Price Variation';
 
            const hasPvBaseMonth = this.accordionSections.some(sec =>
                sec.fields.some(f => f.apiName === 'pv_base_month')
            );
 
            if (isTowerPvMode) {
                await this._fetchSharedPvRates({
                    monthApi: 'pvt_price_variable_month',
                    yearApi: 'pvt_price_variable_year',
                    bloomsApi: 'pvt_pv_blooms',
                    billetsApi: 'pvt_pv_billets',
                    zincApi: 'pvt_pv_zinc_value_as_IEEMA',
                    cpiApi: 'pvt_pv_CPI',
                    getFieldVal,
                    setFieldVal
                });
            }
 
            if (isSubstationPvMode) {
                await this._fetchSharedPvRates({
                    monthApi: 'pvs_price_variable_month',
                    yearApi: 'pvs_price_variable_year',
                    bloomsApi: 'pvs_pv_blooms',
                    billetsApi: 'pvs_pv_billets',
                    zincApi: 'pvs_pv_zinc_value_as_per_ieema',
                    cpiApi: 'pvs_pv_CPI',
                    getFieldVal,
                    setFieldVal
                });
            }
 
            if (hasPvBaseMonth) {
                await this._fetchSharedPvRates({
                    monthApi: 'pv_base_month',
                    yearApi: 'pv_base_year',
                    bloomsApi: 'pv_blooms',
                    billetsApi: 'pv_billets',
                    zincApi: 'pv_zinc',
                    cpiApi: 'pv_consumer_price_index',
                    getFieldVal,
                    setFieldVal
                })
            }
 
            if (isTowerPvMode || isSubstationPvMode || hasPvBaseMonth) return;
 
            if (!isCoreMode && !isFirmMode) return;
 
            const priceBasisType = isCoreMode ? 'Price Variation' : 'FIRM';
 
            // ── Validate required inputs ──────────────────────────────────────
            const month = isCoreMode ? getFieldVal('price_variable_month') : '';
            const year = isCoreMode ? getFieldVal('price_variable_year') : '';
            if (isCoreMode && (!month || !year)) return;
 
            this.isLoading = true;
 
            // ── 1. Shared rates — Core only (billets / zinc / CPI) ────────────
            if (isCoreMode) {
                const sharedKey = `${month}_${year}`;
                if (this._pvSharedKey !== sharedKey) {
                    const sharedData = await getPriceVariationData({
                        month, year, materialType: '', priceBasisType
                    });
                    if (sharedData) {
                        setFieldVal('billets_rate', Number(sharedData.billetsPrice) || 0);
                        setFieldVal('zinc_rate', Number(sharedData.zincPrice) || 0);
                        setFieldVal('cpi_rate', Number(sharedData.cpiValue) || 0);
                        this._pvSharedKey = sharedKey;
                        _hmLog('[PV] Shared rates — billets:', sharedData.billetsPrice,
                            'zinc:', sharedData.zincPrice, 'cpi:', sharedData.cpiValue);
                    }
                }
            }
 
            // ── 2. Build dynamic material rows ────────────────────────────────
            // Supports both:
            //   column-repeater prefix:  c{N}_material_list_type / c{N}_unit_rate / c{N}_added_up
            //   legacy static suffix:    material_list_type_{N}  / unit_rate_{N}  / added_up_{N}
 
            const buildMaterialRows = () => {
                const rows = [];
 
                // ── column-repeater style (new JSON) ──────────────────────────
                // Collect all c{N}_material_list_type fields across all sections
                const colRepeaterFields = [];
                for (const sec of this.accordionSections) {
                    for (const f of sec.fields) {
                        const match = f.apiName.match(/^c(\d+)_material_list_type$/);
                        if (match) {
                            colRepeaterFields.push(Number(match[1]));
                        }
                    }
                }
 
                if (colRepeaterFields.length > 0) {
                    // Sort by column index and build rows
                    const uniqueIndexes = [...new Set(colRepeaterFields)].sort((a, b) => a - b);
                    for (const n of uniqueIndexes) {
                        rows.push({
                            materialApi: `c${n}_material_list_type`,
                            unitRateApi: `c${n}_unit_rate`,
                            addedUpApi: `c${n}_added_up`
                        });
                    }
                    return rows;
                }
 
                // ── Legacy static style (old JSON: _1, _2, _3 ...) ───────────
                // Read number_of_materials field; fall back to scanning existing fields
                const countVal = parseInt(getFieldVal('number_of_materials'), 10);
                const maxCount = !isNaN(countVal) && countVal > 0
                    ? Math.min(countVal, 10)
                    : 10; // scan all possible if field not present
 
                for (let n = 1; n <= maxCount; n++) {
                    const apiName = `material_list_type_${n}`;
                    const exists = this.accordionSections.some(sec =>
                        sec.fields.some(f => f.apiName === apiName)
                    );
                    if (!exists) break; // stop at first missing slot
                    rows.push({
                        materialApi: apiName,
                        unitRateApi: `unit_rate_${n}`,
                        addedUpApi: `added_up_${n}`
                    });
                }
 
                return rows;
            };
 
            const materialRows = buildMaterialRows();
            _hmLog(`[PV] Processing ${materialRows.length} material row(s)`);
 
            // ── 3. Per-row unit price — Core AND FIRM ─────────────────────────
            const discount = Number(getFieldVal('discount')) || 0;
            let zincCoatingWasAutoSet = false;
 
            for (const row of materialRows) {
                const materialType = getFieldVal(row.materialApi);
 
                if (!materialType) {
                    setFieldVal(row.unitRateApi, '');
                    continue;
                }
 
                // Only re-fetch when material / month / year / basis changes
                const cacheKey = `${priceBasisType}_${materialType}_${month}_${year}`;
                if (
                    !this._pvRowData[row.materialApi] ||
                    this._pvRowData[row.materialApi].cacheKey !== cacheKey
                ) {
                    const rowData = await getPriceVariationData({
                        month, year, materialType, priceBasisType
                    });
                    if (rowData) {
                        this._pvRowData[row.materialApi] = {
                            cacheKey,
                            baseUnitPrice: Number(rowData.unitPrice) || 0,
                            addOnAmount: Number(rowData.addOnAmount) || 0,
                            addOnPercentage: Number(rowData.addOnPercentage) || 0,
                            calOnPercentage: rowData.calOnPercentage,
                            metaZincCoating: String(rowData.zincCoatingType || '').trim()
                        };
                        _hmLog(`[${priceBasisType}] Fetched: ${materialType} → base:`,
                            rowData.unitPrice, '| zinc:', rowData.zincCoatingType);
                    }
                }
 
                const pvData = this._pvRowData[row.materialApi];
                if (!pvData) { setFieldVal(row.unitRateApi, ''); continue; }
 
                // Auto-set zinc_coating from metadata ONLY when field is currently empty
                const existingZinc = getFieldVal('zinc_coating');
                if (!existingZinc && !zincCoatingWasAutoSet && pvData.metaZincCoating) {
                    setFieldVal('zinc_coating', pvData.metaZincCoating);
                    zincCoatingWasAutoSet = true;
                }
 
                // Only show unit price when zinc coating has a value
                const currentZinc = getFieldVal('zinc_coating');
                if (!currentZinc) {
                    setFieldVal(row.unitRateApi, '');
                    continue;
                }
 
                // ── Zinc coating logic ────────────────────────────────────────
                let finalUnitPrice;
                const base = pvData.baseUnitPrice;
 
                if (currentZinc === '1000') {
                    finalUnitPrice = pvData.calOnPercentage
                        ? base + base * (pvData.addOnPercentage / 100)
                        : base + pvData.addOnAmount;
                } else if (currentZinc === '610') {
                    finalUnitPrice = base;
                } else {
                    finalUnitPrice = base;
                }
 
                // ── User-entered adjustments ──────────────────────────────────
                //const addedUp = Number(getFieldVal(row.addedUpApi)) || 0;
                //finalUnitPrice += addedUp;
 
                //if (discount > 0 && basisValue === 'Price Variation') {
                    //finalUnitPrice = finalUnitPrice - discount;
                //}
 
                const billetsPrice = Number(getFieldVal('billets_rate')) || 0;
                if (billetsPrice > 0 && materialType != 'SPECIAL 1') {
                    finalUnitPrice = finalUnitPrice + billetsPrice;
                }
 
                setFieldVal(row.unitRateApi, Math.round(finalUnitPrice * 1000) / 1000);
                // The addedUp / discount adjustments above are intentionally disabled -
                // they are already applied by the blueprint formula
                // (cost_price = unit_rate - discount + added_up), so applying them here too
                // double-counted them. This log must therefore NOT reference the now-removed
                // `addedUp` variable: doing so threw a ReferenceError that aborted this loop
                // after the first row, leaving every later row unpriced and skipping the
                // Step-4 UI/formula refresh below entirely. Reetabrata (24th July 2026)
                _hmLog(`[${priceBasisType}] ${materialType} | zinc: ${currentZinc}`,
                    `| discount: ${discount} | billets: ${billetsPrice}`,
                    `→ ${finalUnitPrice}`);
            }
 
            // ── 4. Refresh UI ─────────────────────────────────────────────────
            this.accordionSections.forEach(sec => this._evaluateFieldVisibility(sec.fields));
            this._evaluateSectionVisibility();
            this._evaluateAllFormulas();
            this.accordionSections = this.accordionSections.map(sec => {
                sec.fields.forEach(f => this._updateFieldUI(f));
                this._updateSectionUI(sec);
                return { ...sec };
            });
 
 
        } catch (e) {
            console.error('[PV] Error:', e);
        } finally {
            this.isLoading = false;
        }
    }
 
 
 
 
 
    // =========================================================
    // 🌟 EXPANSION LOGIC
    // =========================================================
    _expandSections(modalFields) {
        let expandedSections = [];
        modalFields.forEach(section => {
            if (section.type === 'matrix-accordion-repeater') {
                const maxRows = section.maxRows || 10;
                const gridField = section.gridFieldApi;
 
                for (let r = 1; r <= maxRows; r++) {
                    section.templates.forEach(template => {
                        expandedSections.push({
                            id: `${template.cloneFrom}_r${r}`,
                            label: template.label.replace('{row}', r),
                            expanded: section.expanded !== false,
                            controllingField: `r${r}_${gridField}`,
                            controllingValues: [template.value],
                            cloneFrom: template.cloneFrom,
                            replaceTarget: section.replaceTarget,
                            replaceWith: `r${r}_${section.replaceTarget}`
                        });
                    });
                }
            } else if (section.type === 'accordion-repeater') {
                const maxRows = section.maxRows || 10;
                const gridField = section.gridFieldApi;
                const allowedValues = section.controllingValues || ["*"];
 
                for (let r = 1; r <= maxRows; r++) {
                    expandedSections.push({
                        id: `${section.cloneFrom}_r${r}`,
                        label: section.label.replace('{row}', r),
                        expanded: section.expanded !== false,
                        controllingField: `r${r}_${gridField}`,
                        controllingValues: allowedValues,
                        cloneFrom: section.cloneFrom,
                        replaceTarget: section.replaceTarget,
                        replaceWith: `r${r}_${section.replaceTarget}`
                    });
                }
            } else {
                expandedSections.push(section);
            }
        });
        return expandedSections;
    }
 
    // PHASE 3: Expand grid/columns inside sections
    _expandFields(fields, globalApiNames = []) {
        let expanded = [];
        fields.forEach(field => {
            if (field.type === 'column-repeater') {
                const maxCols = field.maxColumns || 10;
                const countApi = field.countApiName;
 
                expanded.push({
                    apiName: `${field.apiName}_top_spacer`,
                    label: ' ',
                    type: 'header',
                    colSpan: 4,
                    controllingField: countApi,
                    controllingValues: [">=1"],
                    isColRepeaterLabel: true,
                    repeaterApi: countApi,
                    repeaterMaxCols: maxCols
                });
 
                for (let c = 1; c <= maxCols; c++) {
                    expanded.push({
                        apiName: `${field.apiName}_top_hdr_${c}`,
                        label: String(c),
                        type: 'header',
                        colSpan: 2,
                        controllingField: countApi,
                        controllingValues: [">=1"],
                        columnCountApi: countApi,
                        columnCountIndex: c,
                        isColRepeaterInput: true,
                        repeaterApi: countApi,
                        repeaterMaxCols: maxCols
                    });
                }
 
               // NEW:
field.fields.forEach(subField => {
    // 👉 THE FIX: If subField has its own controllingField,
    // combine it with countApi so the label hides when condition isn't met.
    // We use c1_ prefix because column 1 is always the representative column for the label.
    let labelControllingField = countApi;
    let labelControllingValues = [">=1"];
 
    if (subField.controllingField) {
        const fieldsToReplace = globalApiNames.length > 0
            ? globalApiNames
            : field.fields.map(f => f.apiName);
 
        // Rewrite the subField's controllingField to use c1_ prefix (column 1 is representative)
        let cFields = subField.controllingField.split(',');
        let rewrittenControlling = cFields.map(cf => {
            let isNeg = cf.trim().startsWith('!');
            let clean = isNeg ? cf.trim().substring(1) : cf.trim();
            let isInternal = fieldsToReplace.includes(clean);
            return (isNeg ? '!' : '') + (isInternal ? `c1_${clean}` : clean);
        }).join(',');
 
        // Combine: must satisfy count>=1 AND the subField's own condition
        labelControllingField = `${countApi},${rewrittenControlling}`;
        labelControllingValues = subField.controllingValues || ['*'];
    }
 
    expanded.push({
        ...subField,
        apiName: `lbl_${subField.apiName}`,
        type: subField.hideLabelLayout ? subField.type : 'header',
        colSpan: 4,
        controllingField: labelControllingField,
        controllingValues: labelControllingValues,
        isColRepeaterLabel: true,
        repeaterApi: countApi,
        repeaterMaxCols: maxCols,
        formula: undefined,
        dependentOptionsMap: undefined  // 👉 Labels must never have dependentOptionsMap
    });
 
                   /* field.fields.forEach(subField => {
                    expanded.push({
                        ...subField,
                        apiName: `lbl_${subField.apiName}`,
                        type: subField.hideLabelLayout ? subField.type : 'header',
                        colSpan: 4,
                        controllingField: countApi,
                        controllingValues: [">=1"],
                        isColRepeaterLabel: true,
                        repeaterApi: countApi,
                        repeaterMaxCols: maxCols,
                        formula: undefined
                    });*/
 
 
 
                    // PERF - Deepanjan (4th September 2026)
                    // fieldsToReplace and its length-sorted copy are identical for every one of
                    // the maxCols iterations below, so build them ONCE per sub-field instead of
                    // once per column. The replace loop below is the SAME sequential,
                    // longest-first loop as before, so every formula comes out byte-identical.
                    const fieldsToReplace = globalApiNames.length > 0
                        ? globalApiNames
                        : field.fields.map(f => f.apiName);
                    const sortedToReplace = subField.formula
                        ? [...fieldsToReplace].sort((a, b) => b.length - a.length)
                        : null;

                    for (let c = 1; c <= maxCols; c++) {
                        let cloned = JSON.parse(JSON.stringify(subField));
                        cloned.apiName = `c${c}_${cloned.apiName}`;
                        cloned.label = cloned.unit ? cloned.unit : ' ';
                        cloned.colSpan = 2;
                        cloned.columnCountApi = countApi;
                        cloned.columnCountIndex = c;
                        cloned.isColRepeaterInput = true;
                        cloned.repeaterApi = countApi;
                        cloned.repeaterMaxCols = maxCols;
 
                        // Use globalApiNames (repeater sub-fields only, standalone fields excluded)
                        // so cross-repeater references like material_list_type → c1_material_list_type work,
                        // while standalone fields like 'discount' stay unprefixed.
                        // (fieldsToReplace / sortedToReplace are hoisted above the column loop - Deepanjan 4th Sep 2026)
 
                        if (cloned.formula) {
                            for (const apiName of sortedToReplace) {
                                cloned.formula = cloned.formula.replace(_prefixReFor(apiName), `c${c}_${apiName}`);
                            }
                        }
                       if (cloned.controllingFields && Array.isArray(cloned.controllingFields)) {
                            cloned.controllingFields = cloned.controllingFields.map(cf => {
                                let isNeg = cf.trim().startsWith('!');
                                let clean = isNeg ? cf.trim().substring(1) : cf.trim();
                                let isInternal = fieldsToReplace.includes(clean);
                                return (isNeg ? '!' : '') + (isInternal ? `c${c}_${clean}` : clean);
                            });
                        } else if (cloned.controllingField) {
                            let cFields = cloned.controllingField.split(',');
                            cloned.controllingField = cFields.map(cf => {
                                let isNeg = cf.trim().startsWith('!');
                                let clean = isNeg ? cf.trim().substring(1) : cf.trim();
                                let isInternal = fieldsToReplace.includes(clean);
                                return (isNeg ? '!' : '') + (isInternal ? `c${c}_${clean}` : clean);
                            }).join(',');
                        }
 
                        if (cloned.disableControllingField) {
                            let dFields = cloned.disableControllingField.split(',');
                            cloned.disableControllingField = dFields.map(df => {
                                let isNeg = df.trim().startsWith('!');
                                let clean = isNeg ? df.trim().substring(1) : df.trim();
                                let isInternal = fieldsToReplace.includes(clean);
                                return (isNeg ? '!' : '') + (isInternal ? `c${c}_${clean}` : clean);
                            }).join(',');
                        }
 
                        expanded.push(cloned);
                    }
                });
            } else if (field.type === 'grid-repeater') {
                const defaultRows = field.defaultRows || 5;
                const maxRows = field.maxRows || 10;
                const addMoreApi = field.addMoreApiName;
 
                for (let r = 1; r <= maxRows; r++) {
                    field.fields.forEach(subField => {
                        let clonedField = JSON.parse(JSON.stringify(subField));
                        clonedField.apiName = `r${r}_${clonedField.apiName}`;

                        // Every cell born from a grid-repeater is part of a TABLE by
                        // definition, whether or not the section also has header cells.
                        // The mobile marker in _updateSectionUI reads this flag so such
                        // sections keep the desktop 12-column shape and pan sideways on
                        // the phone. No desktop rule reads it. Reetabrata (17th July 2026)
                        clonedField.isGridRepeaterCell = true;
 
                        if (clonedField.defaultValue === '{row}') clonedField.defaultValue = String(r);
                        if (clonedField.label && clonedField.label.includes('{row}')) {
                            clonedField.label = clonedField.label.replace('{row}', r);
                        }
 
                        // added by faizan
 
                        if (clonedField.formula) {
                            const fieldsToReplace = field.fields.map(f => f.apiName);
                            [...fieldsToReplace].sort((a, b) => b.length - a.length).forEach(apiName => {
                                clonedField.formula = clonedField.formula.replace(
                                    new RegExp(`\\b${apiName}\\b`, 'g'),
                                    `r${r}_${apiName}`
                                );
                            });
                        }
 
                        // Endes
 
                        if (clonedField.controllingField) {
                            let cFields = clonedField.controllingField.split(',');
                            cFields = cFields.map(cf => {
                                let isNeg = cf.trim().startsWith('!');
                                let cleanName = isNeg ? cf.trim().substring(1) : cf.trim();
                                return (isNeg ? '!' : '') + `r${r}_${cleanName}`;
                            });
                            clonedField.controllingField = cFields.join(',');
                        }
 
                        if (r > defaultRows && addMoreApi) {
                            if (!clonedField.controllingField) {
                                clonedField.controllingField = addMoreApi;
                                clonedField.controllingValues = ["true"];
                            }
                        }
                        expanded.push(clonedField);
                    });
                }
            } // 👉 NEW: Sub-Section Logic
           // 👉 NEW: Sub-Section Logic
            else if (field.type === 'sub-section') {
                const headerApiName = `${field.apiName}_header`;
                const isExpandedDef = field.expanded === true; // Read 'expanded: true' from JSON
                // 👉 isVisible:false hides the whole sub-section; otherwise it shows by default - Reetabrata (8th July 2026)
                const subHidden = field.isVisible === false;
 
                // 1. Inject an Accordion Header field to visually separate this sub-section
                expanded.push({
                    apiName: headerApiName,
                    label: field.label || ' ',
                    type: 'sub-section-header', // 👉 Using custom type
                    isSubSectionExpanded: !subHidden, // Reetabrata (8th July 2026)
                    colSpan: field.colSpan || 12,
                    controllingField: field.controllingField || null,
                    controllingValues: field.controllingValues || ['*'],
                    forceHidden: subHidden // 👉 hard-hide when isVisible:false - Reetabrata (8th July 2026)
                });
 
                // 2. Flatten all child fields into the parent section
                if (field.fields && Array.isArray(field.fields)) {
                    field.fields.forEach(subField => {
                        let cloned = JSON.parse(JSON.stringify(subField));
                        
                        // 👉 Tie child to the Accordion Header
                        cloned.parentSubSectionApi = headerApiName; 
                        cloned.isCollapsedUI = subHidden; // shown by default; only hidden when isVisible:false - Reetabrata (8th July 2026)
                        cloned.forceHidden = subHidden;   // 👉 hard-hide when isVisible:false - Reetabrata (8th July 2026)
 
                        // Inherit the sub-section's visibility rules if the child doesn't have its own
                        if (field.controllingField) {
                            if (cloned.controllingField) {
                                cloned.controllingField = `${field.controllingField},${cloned.controllingField}`;
                            } else {
                                cloned.controllingField = field.controllingField;
                                cloned.controllingValues = field.controllingValues || ['*'];
                            }
                        }
                        expanded.push(cloned);
                    });
                }
            }
            else {
                expanded.push(field);
            }
        });
        return expanded;
    }
 
 
    // =========================================================
    // SECTION BUILDER 
    // =========================================================
    _buildSections(modalFields) {
        if (!modalFields || modalFields.length === 0) return [];
 
        let processedSections = this._expandSections(modalFields);
 
        const isFlat = processedSections[0].apiName !== undefined && processedSections[0].fields === undefined;
        if (isFlat) {
            let expandedFields = this._expandFields(processedSections);
            const fields = this._buildFields(expandedFields, 'default_section', true);
            return [this._makeSectionObj({ id: 'default_section', label: '', expanded: true }, fields)];
        }
 
        processedSections = processedSections.map(sectionDef => {
            if (sectionDef.cloneFrom) {
                let sourceFields = null;
 
                if (this._modalConfig.blueprints && this._modalConfig.blueprints[sectionDef.cloneFrom]) {
                    sourceFields = this._modalConfig.blueprints[sectionDef.cloneFrom];
                } else {
                    const sourceSection = processedSections.find(s => s.id === sectionDef.cloneFrom);
                    if (sourceSection) sourceFields = sourceSection.fields;
                }
 
                if (sourceFields) {
                    let sourceString = JSON.stringify(sourceFields);
                    const targetPrefix = sectionDef.replaceTarget || 'd1_';
                    const newPrefix = sectionDef.replaceWith || 'd2_';
 
                    sourceString = sourceString.split(targetPrefix).join(newPrefix);
 
                    if (sectionDef.replaceLabelTarget && sectionDef.replaceLabelWith) {
                        sourceString = sourceString.split(sectionDef.replaceLabelTarget).join(sectionDef.replaceLabelWith);
                    }
 
                    if (sectionDef.replaceExtraTarget && sectionDef.replaceExtraWith) {
                        sourceString = sourceString.split(sectionDef.replaceExtraTarget).join(sectionDef.replaceExtraWith);
                    }
 
                    try {
                        const clonedFields = JSON.parse(sourceString);
                        return { ...sectionDef, fields: clonedFields };
                    } catch (err) {
                        console.error(`❌ ERROR: Failed to clone string for ${sectionDef.cloneFrom}`, err);
                    }
                }
            }
            return sectionDef;
        });
 
        // 👉 FIX: Collect ALL base API names globally before expansion
        // Collect ONLY repeater sub-field names for cross-repeater formula replacement.
        // Standalone fields (like 'discount') are excluded — they must stay unprefixed.
        const globalApiNames = [];
        processedSections.forEach(sec => {
            if (sec.fields) {
                sec.fields.forEach(f => {
                    if (f.fields) {
                        f.fields.forEach(subF => globalApiNames.push(subF.apiName));
                    }
                    // Standalone fields (no nested f.fields) intentionally not added
                });
            }
        });
 
 
        return processedSections.map(sectionDef => {
            const showRequired = sectionDef.showRequired !== false;
            let finalFields = sectionDef.fields || [];
 
            // Pass global names into the expander so formulas update globally
            finalFields = this._expandFields(finalFields, globalApiNames);
 
            const builtFields = this._buildFields(finalFields, sectionDef.id, showRequired);
            return this._makeSectionObj(sectionDef, builtFields, showRequired);
        });
    }
 
    // evaluate section labels to render dynamic values like - "labelFormat": "{type_of_tower} - {ang_product_details1}" => Angular - XYZ - rajeev 29-05-2026
    _evaluateSectionLabels() {
        const allValues = {};
 
        // 1. Collect values from every modal field
        this.accordionSections.forEach(sec => {
            sec.fields.forEach(f => {
                if (f.value !== undefined && f.value !== null && f.value !== '') {
                    allValues[f.apiName] = f.value;
                }
            });
        });
 
        // also put values coming from modalSave Data
        if (this._lastValues) {
            Object.keys(this._lastValues).forEach(key => {
                if (!(key in allValues)) {
                    const v = this._lastValues[key];
                    if (v !== undefined && v !== null && v !== '') {
                        allValues[key] = v;
                    }
                }
            })
        }
 
        // replace apiName placeholder in labelFormat
        this.accordionSections.forEach(sec => {
            if (!sec.labelFormat) return;
            sec.label = sec.labelFormat.replace(/\{([^}]+)\}/g, (match, apiName) => {
                const val = allValues[apiName];
                return (val !== undefined && val !== null && val !== '') ? String(val) : '';
            });
        })

        this.accordionSections.forEach(sec => {
            sec.fields.forEach(f => {
                if (!f.labelsByController || !f.labelsByController.controllingApi) return;

                const cfg = f.labelsByController;
                // allValues already holds every field value + _lastValues (built above)
                const ctrlVal = allValues[cfg.controllingApi] !== undefined
                    ? String(allValues[cfg.controllingApi]).trim()
                    : '';

                const newLabel = (ctrlVal !== '' && cfg.map && cfg.map[ctrlVal] !== undefined)
                    ? cfg.map[ctrlVal]
                    : (cfg.default !== undefined ? cfg.default : f.baseLabel);

                if (f.label !== newLabel) {
                    f.label = newLabel;
                    this._updateFieldUI(f);
                }
            });
        });
    }
 
    // validate telecom tower composition updated for both tubular/signalling - rajeev 10-09-2026
    _validateTelecomTowerComposition() {
        const groups = [];

        Object.keys(TELECOM_COMPOSITION_GROUPS).forEach(product => {
            const apis = TELECOM_COMPOSITION_GROUPS[product];
            const seen = new Set();
            let total = 0;
            let found = false;

            this.accordionSections.forEach(sec => {
                sec.fields.forEach(f => {
                    if (!f.isVisible) return;
                    if (!apis.includes(f.apiName)) return;
                    if (seen.has(f.apiName)) return;   // same field in 2 sections
                    seen.add(f.apiName);
                    found = true;
                    total += Number(f.value) || 0;
                });
            });

            if (found) groups.push({ product, total: Math.round(total * 100) / 100 });
        });

        // no composition fields on this modal - every other department unaffected
        if (groups.length === 0) return true;

        const bad = groups.filter(g => g.total > 100);
        if (bad.length === 0) return true;

        const detail = bad.map(g => `${g.product} is ${g.total}%`).join(' and ');
        this.dispatchEvent(new ShowToastEvent({
            title: 'Composition Error',
            message: `Total composition for ${detail}. The sum of PIPE + PLATE + ANGLES & CHANNELS `
                + '+ MISCELLANEOUS must not exceed 100% for each tower type. Please correct the '
                + 'values before saving.',
            variant: 'error'
        }));
        return false;
    }

    // Adding validation for payments that such that each angular, tubular, & tubular signalling should have same payment
    // terms details - rajeev 14 sep
    _validateTelecomPaymentTerms() {
        const PRODUCTS = [
            { name: 'Angular',            pfx: 'agl_' },
            { name: 'Tubular',            pfx: 'tub_' },
            { name: 'Tubular Signalling', pfx: 'tsg_' }
        ];
        const GATE = 'payment_terms_req';
        const TERM = 'select_payment_terms';
        const DAYS = 'payment_terms_days';
        const RATE = 'bank_int_rate';
        const NEEDS_DETAIL = ['Against LC Before Dispatch', 'Against VFS'];
        const VIRTUAL_SECTION = '__cross_modal_context__';

        // real    = fields declared by THIS modal's JSON (visible copy preferred)
        // virtual = other modals' saved values injected by crossPriceVariationContext
        const real = new Map();
        const virtual = new Map();
        (this.accordionSections || []).forEach(sec => {
            const isVirtualSec = !!sec && sec.id === VIRTUAL_SECTION;
            (sec && sec.fields || []).forEach(f => {
                if (!f || !f.apiName) return;
                if (isVirtualSec || f.type === 'hidden') {
                    if (!virtual.has(f.apiName)) virtual.set(f.apiName, f);
                    return;
                }
                const hit = real.get(f.apiName);
                if (!hit || (!hit.isVisible && f.isVisible)) real.set(f.apiName, f);
            });
        });

        // Which product's modal is open? Decided from REAL fields only.
        const mine = PRODUCTS.find(p => real.has(p.pfx + TERM));
        if (!mine) return true;                       // not a Telecom Tower modal

        const saved = this._lastValues || {};
        const isBlank = v => v === '' || v === null || v === undefined || String(v).trim() === '';
        const str = v => (isBlank(v) ? '' : String(v).trim());
        const num = v => { if (isBlank(v)) return null; const n = Number(v); return isNaN(n) ? null : n; };

        // Accepts the gate as a checkbox (true) or as a Yes/No picklist.
        const GATE_ON = new Set(['true', 'yes', 'y', '1']);
        const gateOn = v => (v === true || v === 1) ? true : GATE_ON.has(str(v).toLowerCase());

        // Current product: live real field. Other products: virtual copy, then saved.
        const read = (p, key) => {
            const api = p.pfx + key;
            if (p.pfx === mine.pfx) return real.has(api) ? real.get(api).value : '';
            if (virtual.has(api))   return virtual.get(api).value;
            return saved[api];
        };

        const entries = [];
        PRODUCTS.forEach(p => {
            if (!gateOn(read(p, GATE))) return;       // gate OFF -> not participating
            const term = str(read(p, TERM));
            if (term === '') return;                  // gate ON but no term chosen yet
            entries.push({
                name: p.name,
                term,
                days: num(read(p, DAYS)),
                rate: num(read(p, RATE))
            });
        });

        if (entries.length < 2) return true;          // only one tower type to check

        // Master = first participating tower type (Angular -> Tubular -> Signalling).
        const master = entries[0];
        const problems = [];

        entries.slice(1).forEach(e => {
            if (e.term !== master.term) {
                problems.push(`${e.name} is "${e.term}" but ${master.name} is "${master.term}".`);
            }
        });

        // Only once every participant agrees on the term do the LC / VFS details matter.
        if (problems.length === 0 && NEEDS_DETAIL.includes(master.term)) {
            entries.slice(1).forEach(e => {
                if (e.days === null && master.days !== null) {
                    problems.push(`No Of Days is missing on ${e.name} - it must be `
                        + `${master.days}, same as ${master.name}.`);
                } else if (e.days !== null && master.days !== null && e.days !== master.days) {
                    problems.push(`No Of Days differs - ${master.name}: ${master.days}, `
                        + `${e.name}: ${e.days}.`);
                }

                // Rate is a rounded formula output (3 dp) - compare with a tiny epsilon,
                // same as the Tower / Substation check.
                if (e.rate === null && master.rate !== null) {
                    problems.push(`Prevailing rate of Bank Interest is missing on ${e.name} - `
                        + `it must be ${master.rate}%, same as ${master.name}.`);
                } else if (e.rate !== null && master.rate !== null
                        && Math.abs(e.rate - master.rate) > 0.00005) {
                    problems.push(`Prevailing rate of Bank Interest differs - `
                        + `${master.name}: ${master.rate}%, ${e.name}: ${e.rate}%.`);
                }
            });
        }

        if (problems.length === 0) return true;

        this.dispatchEvent(new ShowToastEvent({
            title: 'Telecom Tower - Payment Terms Mismatch',
            message: 'Every tower type with the Interest Component turned on must use the same '
                + 'Payment Terms:\n' + problems.join('\n')
                + '\nPlease correct it before saving.',
            variant: 'error'
        }));
        return false;
    }

    /*
     * Tower and Substation must agree on Price Basis: Price Variation on one
     * means Price Variation on the other, FIRM means FIRM.
     *
     * The two live in separate Section Logic records under different apiNames -
     * Tower `pvt_price_basics` (options "Price Variation" / "FIRM") and
     * Substation `pvs_price_model` (options "Price Variation" / "Firm"). Note the
     * casing differs between the two option sets, so the comparison is
     * normalised rather than a raw ===.
     *
     * Both records set requiresCrossModalData: true, so crossPriceVariationContext()
     * in createQuote.js merges the other modal's saved keys into savedData, which
     * lands in this._lastValues. That is how the Substation modal can see the
     * Tower's basis and the other way round. Same read order the PV-rate block
     * above uses: the live field first, the cross-modal saved value as fallback.
     *
     * Fires only when BOTH sides actually have a value. Whichever modal is filled
     * first has nothing to compare against and must not be blocked; the mismatch
     * surfaces when the second one is applied. Editing the first one later is
     * caught too, because by then the second side is saved.
     *
     * Returns true for every other department - if neither field is on this modal
     * there is nothing to check. Deepanjan (12th August 2026)
     */
    _validateTowerSubstationPriceBasis() {
        const TOWER_API = 'pvt_price_basics';
        const SUBSTATION_API = 'pvs_price_model';

        // Prefer a visible field, then any field, then the cross-modal saved value.
        const readBasis = (apiName) => {
            let anyMatch = null;
            for (const sec of this.accordionSections || []) {
                for (const f of sec.fields || []) {
                    if (f.apiName !== apiName) continue;
                    if (f.isVisible) return String(f.value || '').trim();
                    if (anyMatch === null) anyMatch = String(f.value || '').trim();
                }
            }
            if (anyMatch) return anyMatch;
            return String(this._lastValues[apiName] || '').trim();
        };

        const onThisModal = (this.accordionSections || []).some(sec =>
            (sec.fields || []).some(f => f.apiName === TOWER_API || f.apiName === SUBSTATION_API)
        );
        if (!onThisModal) return true;

        const towerBasis = readBasis(TOWER_API);
        const substationBasis = readBasis(SUBSTATION_API);
        if (!towerBasis || !substationBasis) return true;

        // "FIRM" vs "Firm" is the same choice spelled two ways.
        const normalise = (v) => v.toUpperCase().replace(/\s+/g, ' ');
        if (normalise(towerBasis) === normalise(substationBasis)) return true;

        this.dispatchEvent(new ShowToastEvent({
            title: 'Price Basis Mismatch',
            message: `Tower is set to "${towerBasis}" but Substation is set to "${substationBasis}". `
                + 'Both must use the same Price Basis. Please correct one of them before saving.',
            variant: 'error'
        }));
        return false;
    }

    _validateTowerSubstationPaymentTerms() {
        const TOWER_BASIS_API = 'pvt_price_basics';
        const SUBSTATION_BASIS_API = 'pvs_price_model';

        // visible field first, then any matching field, then the cross-modal
        // saved value. Generic so it can read basis, picklist, checkbox and
        // number fields alike.
        const readRaw = (apiName) => {
            let anyMatch;
            for (const sec of this.accordionSections || []) {
                for (const f of sec.fields || []) {
                    if (f.apiName !== apiName) continue;
                    if (f.isVisible) return f.value;
                    if (anyMatch === undefined) anyMatch = f.value;
                }
            }
            if (anyMatch !== undefined) return anyMatch;
            return this._lastValues ? this._lastValues[apiName] : undefined;
        };

        const readStr = (apiName) => String(readRaw(apiName) || '').trim();
        const readBool = (apiName) => {
            const v = readRaw(apiName);
            return v === true || v === 'true';
        };
        // Returns null when genuinely empty (not-yet-filled), never 0-as-empty.
        const readNum = (apiName) => {
            const v = readRaw(apiName);
            if (v === '' || v === null || v === undefined) return null;
            const n = Number(v);
            return isNaN(n) ? null : n;
        };

        const onThisModal = (this.accordionSections || []).some(sec =>
            (sec.fields || []).some(f => f.apiName === TOWER_BASIS_API || f.apiName === SUBSTATION_BASIS_API)
        );
        if (!onThisModal) return true;

        // "FIRM" vs "Firm" - same normalisation used for the basis comparison.
        const normalise = (v) => v.toUpperCase().replace(/\s+/g, ' ');

        const towerBasis = normalise(readStr(TOWER_BASIS_API));
        const substationBasis = normalise(readStr(SUBSTATION_BASIS_API));

        const towerPrefix =
            towerBasis === 'FIRM' ? 'pvt_firm_' :
            towerBasis === 'PRICE VARIATION' ? 'pvt_pv_' : null;

        const substationPrefix =
            substationBasis === 'FIRM' ? 'pvs_firm_' :
            substationBasis === 'PRICE VARIATION' ? 'pvs_pv_' : null;

        // Either side hasn't picked a basis yet, or the two bases disagree -
        // in both cases there is no safe, single field-set pair to compare, and
        // a basis mismatch is already reported (or will be) by
        // _validateTowerSubstationPriceBasis. Stay silent here.
        if (!towerPrefix || !substationPrefix) return true;
        if (towerPrefix.startsWith('pvt_firm_') !== substationPrefix.startsWith('pvs_firm_')) return true;

        if (towerPrefix === 'pvt_pv_') {
            const towerModule = readStr('pvt_price_module');
            const substationModule = readStr('pvs_price_module');
            const towerMonth = readStr('pvt_price_variable_month');
            const substationMonth = readStr('pvs_price_variable_month');
            const towerYear = readStr('pvt_price_variable_year');
            const substationYear = readStr('pvs_price_variable_year');

            const pvProblems = [];

            if (towerModule && substationModule && towerModule !== substationModule) {
                pvProblems.push(`PRICE MODULE (Tower: "${towerModule}", Substation: "${substationModule}")`);
            }
            if (towerMonth && substationMonth && towerMonth !== substationMonth) {
                pvProblems.push(`PRICE VARIATION (MONTH) (Tower: "${towerMonth}", Substation: "${substationMonth}")`);
            }
            if (towerYear && substationYear && towerYear !== substationYear) {
                pvProblems.push(`PRICE VARIABLE (YEAR) (Tower: "${towerYear}", Substation: "${substationYear}")`);
            }

            if (pvProblems.length > 0) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Price Variation Details Mismatch',
                    message: 'Both Tower and Substation are on Price Variation, but the following details '
                        + `differ: ${pvProblems.join('; ')}. These must be identical between Tower and `
                        + 'Substation. Please correct one of them before saving.',
                    variant: 'error'
                }));
                return false;
            }
        }

        const towerInterestOn = readBool(`${towerPrefix}interest_component`);
        const substationInterestOn = readBool(`${substationPrefix}interest_component`);

        // Payment Terms only exists once the "Interest Component ... ?" checkbox
        // is on. If either side hasn't switched it on (or hasn't picked a term
        // yet), there is nothing on that side to compare against - don't block.
        if (!towerInterestOn && !substationInterestOn) return true;

        const towerTerm = readStr(`${towerPrefix}payment_terms`);
        const substationTerm = readStr(`${substationPrefix}payment_terms`);

        if (!towerTerm || !substationTerm) return true;

        if (towerTerm !== substationTerm) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Payment Terms Mismatch',
                message: `Tower Payment Terms is "${towerTerm}" but Substation Payment Terms is `
                    + `"${substationTerm}". Both must use the same Payment Terms. Please correct one `
                    + 'of them before saving.',
                variant: 'error'
            }));
            return false;
        }

        // Only "Against LC Before Dispatch" and "Against VFS" unlock the extra
        // No Of Days / Prevailing Rate fields. Every other Payment Terms value
        // (Before Dispatch, Against PDC, Against Open Credit) has no further
        // fields to reconcile, so matching the term above is already sufficient.
        const NEEDS_DETAIL = ['Against LC Before Dispatch', 'Against VFS'];
        if (!NEEDS_DETAIL.includes(towerTerm)) return true;

        const towerDays = readNum(`${towerPrefix}no_of_days`);
        const substationDays = readNum(`${substationPrefix}no_of_days`);
        const towerRate = readNum(`${towerPrefix}prevailing_rate_of_bank_interest`);
        const substationRate = readNum(`${substationPrefix}prevailing_rate_of_bank_interest`);

        const problems = [];

        // Only compare once BOTH sides have entered the detail value - same
        // non-blocking rule as everything above.
        if (towerDays !== null && substationDays !== null && towerDays !== substationDays) {
            problems.push(`No Of Days (Tower: ${towerDays}, Substation: ${substationDays})`);
        }

        // Rate is a rounded formula output (rounded to 3 decimals by the global
        // math engine) - compare with a tiny epsilon instead of strict ===.
        if (towerRate !== null && substationRate !== null && Math.abs(towerRate - substationRate) > 0.00005) {
            problems.push(`Prevailing Rate of Bank Interest (Tower: ${towerRate}%, Substation: ${substationRate}%)`);
        }

        if (problems.length > 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Payment Terms Detail Mismatch',
                message: `Both sides use Payment Terms "${towerTerm}", but the following details differ: `
                    + `${problems.join('; ')}. These must be identical between Tower and Substation. `
                    + 'Please correct one of them before saving.',
                variant: 'error'
            }));
            return false;
        }

        return true;
    }
 
    _formatDateDDMMYYYY(isoStr) {
    if (!isoStr || typeof isoStr !== 'string') return '';
    const parts = isoStr.split('-'); // YYYY-MM-DD
    if (parts.length !== 3) return isoStr;
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
    }
 
    _makeSectionObj(sectionDef, fields, showRequired = true) {
        const sec = {
            id: sectionDef.id || sectionDef.name,
            label: sectionDef.label || '',
            labelFormat: sectionDef.labelFormat || null,
            isExpanded: sectionDef.expanded !== false,
            showRequired: showRequired,
            isCheckboxGroup: sectionDef.isCheckboxGroup || false,
            controllingField: sectionDef.controllingField || null,
            controllingValues: sectionDef.controllingValues || null,
            controllingOperator: sectionDef.controllingOperator || 'OR',
            // lineItemGroup lets two sections contribute to ONE line item. The grouping code
            // below already reads sec.lineItemGroup, but _makeSectionObj never copied it, so it
            // was permanently undefined and groupId always fell back to sec.id. No metadata
            // sets it today, so null keeps every existing section on its own id exactly as
            // before. Reetabrata (16th July 2026)
            lineItemGroup: sectionDef.lineItemGroup || null,
            isVisible: !sectionDef.controllingField,
            forceHidden: sectionDef.isVisible === false, // 👉 isVisible:false hides the section - Reetabrata (8th July 2026)
            fields: fields,
            chevronIcon: '',
            headerClass: '',
            gridWrapperClass: '',
            visibleFields: []
        };
 
        if (sectionDef.isExpanded !== undefined) sec.isExpanded = sectionDef.isExpanded;
        if (sectionDef.isVisible !== undefined) sec.isVisible = sectionDef.isVisible;
 
        // ═══════════════════════════════════════════════════════════════════════
        // isVisible:false ALWAYS HIDES THE WHOLE SECTION. Reetabrata (14th July 2026)
        // A section marked isVisible:false is a pure internal calc block: it stays
        // fully hidden in the UI (forceHidden), its formulas still compute in
        // _evaluateAllFormulas, and all its fields still persist to the saved JSON via
        // the forceHidden branch in the save path. No auto-reveal of input fields.
        // ═══════════════════════════════════════════════════════════════════════

        // ── approval mark: does this section produce a flagged line? A line is named
        //    `${modalTitle} - ${sectionLabel}` (see finalItemName) plus at most one
        //    suffix this modal appends: " (Row N)", " (Item N)" or " [multiplier]".
        //    If the section owns a field for the evaluated metric, mark that field.
        //    If it does not, remember the metric and a sample apiName from this
        //    section so _apvApplyFallback can find the matching field elsewhere in
        //    the modal. Deepanjan (20th September 2026)
        if (this._apvTriggers && Array.isArray(this._apvTriggers.items) && this._apvTriggers.items.length) {
            const apvTitle = String(this.modalTitle || '').replace('WEIGHT ESTIMATOR - ', '').trim();
            const apvClean = String(sec.label || '').replace(/^[0-9.]+\s*/, '').trim();
            if (apvClean) {
                const apvKey = (apvTitle + ' - ' + apvClean).toUpperCase();
                const apvHits = this._apvTriggers.items.filter(h => {
                    const n = String(h && h.n || '').trim().toUpperCase();
                    return !h.root && (n === apvKey || n.startsWith(apvKey + ' (ROW ') ||
                                       n.startsWith(apvKey + ' (ITEM ') || n.startsWith(apvKey + ' ['));
                });
                if (apvHits.length) {
                    const apvMetrics = [...new Set(apvHits.map(h => String(h.m || '').toLowerCase()).filter(Boolean))];
                    let apvAny = false;
                    // Exact apiName first, substring only as a fallback. Several
                    // departments name the rule after the input itself (added_up,
                    // c1_swan_d_added, tsg_margin_awt ...), and a plain substring
                    // test would then let a short metric like `added_up` match every
                    // *_added_up field on the card. Deepanjan (21st September 2026)
                    apvMetrics.forEach(m => {
                        const exact = fields.filter(f => f.type !== 'header' && String(f.apiName || '').toLowerCase() === m);
                        const pick = exact.length ? exact
                                                  : fields.filter(f => f.type !== 'header' && String(f.apiName || '').toLowerCase().includes(m));
                        pick.forEach(f => { f._apvHit = true; apvAny = true; });
                    });
                    if (!apvAny) {
                        const sample = (fields.find(f => f.type !== 'header' && f.apiName) || {}).apiName || '';
                        sec._apvMetrics = apvMetrics;
                        sec._apvSample = String(sample).toLowerCase();
                    }
                }
            }
        }
        // [im] an approval that fired on an approval_* value (PU Paint realization) marks the
        // field(s) of this section carrying that approvalMetric
        if (this._apvTriggers && Array.isArray(this._apvTriggers.items)) {
            const ams = this._apvTriggers.items.filter(h => h && h.am).map(h => String(h.am).toLowerCase());
            if (ams.length) fields.forEach(f => { if (f && f.approvalMetric && ams.indexOf(String(f.approvalMetric).toLowerCase()) !== -1) f._apvHit = true; });
        }
        this._updateSectionUI(sec);
        return sec;
    }
 
    _updateSectionUI(sec) {
        sec.chevronIcon = sec.isExpanded ? 'utility:chevrondown' : 'utility:chevronright';
 
        const req = sec.fields.some(f => f.required && f.isVisible && !f.hasValue && (f.touched === true || this._hmShowAllRequired === true));   // hmEstimator
        sec.headerClass = sec.isExpanded
            ? `section-header expanded${req ? ' has-required' : ''}`
            : `section-header${req ? ' has-required' : ''}`;
 
        const isSpreadsheet = sec.fields.some(f => f.colSpan && f.colSpan < 12);
        sec.gridWrapperClass = isSpreadsheet
            ? 'section-fields slds-grid slds-wrap grid-container spreadsheet-mode'
            : 'section-fields slds-grid slds-wrap grid-container standard-mode';
 
        sec.visibleFields = sec.fields.filter(f => f.isVisible);

        // Column-repeater sections (a label column + c1..cN value columns) lose all
        // meaning when their cells are stacked vertically - the labels pile up first
        // and the values follow with nothing tying them together. This marker lets the
        // mobile CSS keep exactly the desktop table shape for THESE sections and pan
        // them sideways, while every other section stacks into the 2-column form grid.
        // No rule outside @media (max-width: 600px) targets the class, so desktop
        // rendering is untouched. Reetabrata (17th July 2026)
        if (sec.fields.some(f => f.isColRepeaterInput || f.isColRepeaterLabel)) {
            sec.gridWrapperClass += ' has-col-repeater';
        }

        // Grid-header TABLES get the same mobile treatment. Sections like LM/LCLM
        // General Details (SL NO. / HEIGHT OF MAST / ... header cells followed by
        // grid-repeater rows) and HDPE Accessories Details (Sl no. / Product Category /
        // Item Name / ... header cells followed by input cells with matching colSpans)
        // are tables exactly like the col-repeater sections: stacking their cells
        // vertically detaches every value from its column heading, which is what the
        // phone screenshots showed. A section qualifies when it renders at least one
        // grid-header-cell, i.e. a type:'header' field with colSpan < 12 (full-width
        // colSpan 12 headers are plain row titles, not table columns, so they do NOT
        // mark the section). Also marks any section containing grid-repeater cells
        // (isGridRepeaterCell, tagged during expansion) so header-less grid tables and
        // tables inside FOLDER-launched modals are caught too - folder modals build
        // their sections through this very same path. Reusing the existing
        // has-col-repeater class means the
        // MOBILE v3 CSS (desktop 12-column track + horizontal pan) applies unchanged,
        // and since no rule outside @media (max-width: 600px) targets the class,
        // desktop rendering stays byte-identical. Reetabrata (17th July 2026)
        if (!sec.gridWrapperClass.includes('has-col-repeater') &&
            sec.fields.some(f => ((f.isHeader || f.type === 'header') && f.colSpan && f.colSpan < 12) || f.isGridRepeaterCell)) {
            sec.gridWrapperClass += ' has-col-repeater';
        }

        // MOBILE: a phone table packs its 12 columns into 56px each, which leaves an
        // input in a 1-span column only ~6px of visible text - typed values, picked
        // picklist values and auto-filled weights are there but cannot be seen (CB
        // Accessories / Miscellaneous). When such a table has an EDITABLE input in a
        // 1-span column, mark it so the mobile CSS gives the table wider columns. Read
        // once, when the section is built, from the metadata (not from view-mode
        // read-only), so the table keeps the same width in view mode. Desktop never
        // reads this class. Deepanjan (24th September 2026)
        if (sec._narrowInputs === undefined) {
            sec._narrowInputs = sec.gridWrapperClass.includes('has-col-repeater') &&
                sec.fields.some(f => f.colSpan === 1 && !f.baseReadOnly && !f.formula &&
                    ['picklist', 'number', 'text', 'date', 'textarea'].includes(f.type));
        }
        if (sec._narrowInputs && sec.gridWrapperClass.includes('has-col-repeater')) {
            sec.gridWrapperClass += ' has-narrow-inputs';
        }

        // hmEstimator: computed values leave the card and open in a popup. A field is
        // "computed" when the metadata itself made it read-only AND it is produced by a
        // formula / weight lookup. In a TABLE section (column repeater / grid header) a
        // computed CELL stays in its column so the rows stay aligned, but a computed
        // full-width row under the table (weight, base price, unit price / cost) goes to
        // the popup like everywhere else. Popup rows are grouped under the heading they
        // sit under (TOP SEGMENT, MIDDLE SEGMENT 2 ... or "Row n" of a table), and a
        // heading left with nothing under it is not drawn on the card. View (read-only)
        // mode uses the very same card + popup. visibleFields (what the engine uses) is
        // untouched.
        // [im] OVERRIDE PAIR (Customer Address: SHIPPING ADDRESS + OVERRIDE SHIPPING ADDRESS): the
        // override section is not a card of its own - its inputs sit in the section it overrides,
        // next to the value each one replaces (see _imOverridePair / _imCompareCard). The engine,
        // the values and the save are untouched: only where the inputs are drawn changes.
        const hmPair = this.inline ? this._imOverridePair(sec) : null;
        if (hmPair && hmPair.role === 'ovr') {
            sec.imMerged = true;
            sec.imGroupCls = 'accordion-section im-group im-group_merged';
            sec.imLabel = sec.label || '';
            sec.cardFields = []; sec.calcFields = []; sec.calcCount = 0; sec.calcGrid = null;
            sec.hasCardFields = false; sec.hasCalc = false; sec.imHeadCalc = false; sec.imTable = false; sec.imOpen = false;
            sec.imShowGrid = false; sec.imIsPairs = false; sec.imGridShown = false; sec.imMissing = ''; sec.imTrigger = false;
            sec.calcLabel = ''; sec.calcShort = ''; sec.calcBtnCls = 'hm-calc-btn';
            return;
        }
        sec.imMerged = false;
        const hmIsTable = sec.gridWrapperClass.includes('has-col-repeater');
        const hmIsHdr = f => f.type === 'header' || f.type === 'sub-section-header' || f.isHeader === true;
        const hmFull = f => !f.colSpan || Number(f.colSpan) >= 12;
        // [im] COMPUTED = read-only in the METADATA + a formula / weight lookup + a price / cost /
        // realization / weight figure. A field the user types into (an override too) and a field a
        // controlling field enables / disables are never computed - they stay on the card. Read from
        // the metadata flag, not baseReadOnly, which view mode sets on every field (so view mode
        // shows the same card as edit mode). The same rule in every section of every mast type:
        // in a TABLE the computed cells leave too (the table keeps its columns aligned - see
        // _imSectionUI). Deepanjan (29th September 2026)
        const hmMetaRO = f => (f._imMetaRO !== undefined ? f._imMetaRO === true : f.baseReadOnly === true);
        const hmIsCalc = f => !hmIsHdr(f) && hmMetaRO(f) && (f.formula || f.lookupWeight === true || f.weightMap)
            && (f.isUnitPrice === true || f.isUnitCost === true || IM_FX_RE.test(String(f.apiName || '') + ' ' + String(f.label || '')));
        const hmShow = f => {
            if (f.type === 'checkbox' || f.type === 'toggle') return f.value === true ? 'Yes' : 'No';
            const v = f.displayValue !== undefined && f.displayValue !== null && f.displayValue !== '' ? f.displayValue : f.value;
            return (v === undefined || v === null) ? '' : String(v);
        };
        const hmRow = (f, label) => ({ key: f.apiName, label: label !== undefined ? label : f.label, value: hmShow(f), unit: f.unit || '', fc: f.imFc || '', isGroup: false,
            cls: (f._apvHit ? 'calc-row calc-row-apv' : 'calc-row') + (f.isUnitPrice ? ' calc-row_price' : (f.isUnitCost ? ' calc-row_cost' : '')) });
        const hmGroupRow = (label, key) => ({ key: 'g_' + key, label, value: '', unit: '', isGroup: true, cls: 'calc-group' });
        // popup rows, grouped
        const calc = [];
        let card;
        // [im] KIT line: its BOM ITEM DETAILS (the computed "<item> - Qty Consumed" / amount pairs -
        // in the line itself for 1 / 2 segments) and its BOM heading leave the card; they show in
        // the line's CALCULATED VALUES panel with COST / SET, UNIT PRICE, UNIT COST (see hmCalcBom)
        const kitLine = !!this.inline && this._imIsKitLine(sec);
        sec._imKit = kitLine;   // drawn as equal tiles, 4 a row (see _imSectionUI / .im-layout_kit)
        const kitOut = new Set();
        if (kitLine) {
            this._imBomPairs(sec.visibleFields).used.forEach(f => kitOut.add(f));
            sec.visibleFields.forEach(f => { if (hmIsHdr(f) && hmFull(f) && /\bBOM\b/i.test(String(f.label || ''))) kitOut.add(f); });
        }
        const kitKeep = f => !kitOut.has(f);
        if (hmIsTable) {
            // a table keeps every cell in its grid (a computed one hidden) so the rows and columns
            // stay aligned; _imSectionUI names each computed cell after its column heading / row
            // label and groups it by row / item
            card = kitOut.size ? sec.visibleFields.filter(kitKeep) : sec.visibleFields.slice();
            if (kitLine) card = this._imKitOrder(card, hmIsHdr, hmMetaRO, hmIsCalc);
            sec.cardFields = card;
            const out = this._imSectionUI(sec, card, true, hmIsHdr, hmIsCalc);
            const groups = new Map();
            out.forEach(e => { if (e.group) groups.set(e.group, (groups.get(e.group) || 0) + 1); });
            // one value per row (General Details "REALIZATION FOR..." of rows 1-10): the row goes
            // into the label instead of a heading over every single line
            const single = groups.size > 1 && [...groups.values()].every(n => n === 1);
            let lastGroup = null;
            out.forEach(e => {
                if (single) { calc.push(hmRow(e.f, e.group ? e.label + ' (' + e.group + ')' : e.label)); return; }
                const g = groups.size > 1 ? e.group : '';
                if (g && g !== lastGroup) { calc.push(hmGroupRow(g, e.f.apiName)); lastGroup = g; }
                calc.push(hmRow(e.f, e.label));
            });
            // several items / rows: the panel shows them as a table (see _imCalcGrid)
            sec.calcGrid = this._imCalcGrid(out, groups, hmShow);
            if (sec.calcGrid) sec.calcGrid.extra = out.filter(e => !e.group).map(e => hmRow(e.f, e.label));
        } else {
            sec.calcGrid = null;
            let group = '', lastGroup = null;
            sec.visibleFields.forEach(f => {
                if (hmIsHdr(f) && hmFull(f)) { group = f.label || ''; return; }
                if (!hmIsCalc(f) || kitOut.has(f)) return;
                if (group && group !== lastGroup) { calc.push(hmGroupRow(group, f.apiName)); lastGroup = group; }
                calc.push(hmRow(f));
            });
            // card: everything else; a full-width heading with nothing left under it is dropped
            card = sec.visibleFields.filter(f => !hmIsCalc(f) && kitKeep(f));
            card = card.filter((f, i) => {
                if (!(hmIsHdr(f) && hmFull(f))) return true;
                const n = card[i + 1];
                return !!n && !(hmIsHdr(n) && hmFull(n));
            });
            if (hmPair && hmPair.role === 'host') card = this._imCompareCard(sec, card, hmPair, hmIsHdr);
            if (kitLine) card = this._imKitOrder(card, hmIsHdr, hmMetaRO, hmIsCalc);
            sec.cardFields = card;
            this._imSectionUI(sec, card, false, hmIsHdr, null, hmPair && hmPair.role === 'host' ? hmPair : null);
        }
        sec.calcFields = calc;
        sec._imOwnCalc = calc.filter(r => !r.isGroup).length;
        sec._imOwnApv = calc.some(r => !r.isGroup && /calc-row-apv/.test(r.cls));
        const kitBomSec = !!this.inline && this._imIsKitBom(sec);
        if (kitBomSec) sec._imOwnBom = this._imBomPairs(sec.visibleFields).pairs.length > 0;
        // [im] KIT line: the figures / BOM of its BOM section count here (that section is not a card)
        let kitMore = 0, kitApv = false, kitBom = kitOut.size > 0;
        if (kitLine) {
            this._imKitParts(sec).forEach(p => { kitMore += p._imOwnCalc || 0; if (p._imOwnApv) kitApv = true; if (p._imOwnBom) kitBom = true; });
            sec._imKitSig = this._imKitSig(sec.id);
        }
        sec.calcCount = sec._imOwnCalc + kitMore;
        sec.hasCardFields = hmIsTable ? card.some(f => !hmIsHdr(f) && !f.imCalc) : card.length > 0;
        sec.hasCalc = sec.calcCount > 0 || kitBom;
        sec.calcLabel = sec.calcCount === 1 ? 'Calculated value' : `Calculated values (${sec.calcCount})`;
        sec.calcShort = `Calculated (${sec.calcCount})`;   // the button in a table panel's head (a phone has little room there)
        sec.imHeadCalc = sec.hasCalc && sec.hasCardFields;
        // the approval metric evaluated for this quote is a computed value: the button that opens it is marked
        sec.calcBtnCls = 'hm-calc-btn' + (kitApv || sec._imOwnApv ? ' hm-calc-btn_apv' : '');
        if (kitApv && sec.imGroupCls.indexOf('im-group_trigger') === -1) sec.imGroupCls += ' im-group_trigger';
        // [im] a BOM section of a KIT line is not a card: its line's panel shows it. Its figures
        // may change after its line was drawn in the same pass (the segment count arrives from the
        // Weight Estimator, the section appears) - the line is redrawn once right after the pass.
        if (kitBomSec) {
            sec.imMerged = true;
            sec.imGroupCls = 'accordion-section im-group im-group_merged';
            sec.imHeadCalc = false;
            const line = (this.accordionSections || []).find(x => x && x.id === sec.lineItemGroup);
            if (line && line._imKitSig !== undefined && line._imKitSig !== this._imKitSig(line.id)) this._imKitLineSoon(line.id);
        }
    }
    /** [im] what a KIT line's button shows from its BOM sections: visible / figures / approval / BOM */
    _imKitSig(lineId) {
        return (this.accordionSections || []).filter(p => p && p.lineItemGroup === lineId && p.id !== lineId)
            .map(p => (p.isVisible === false ? 'h' : 'v' + (p._imOwnCalc || 0) + (p._imOwnApv ? 'a' : '') + (p._imOwnBom ? 'b' : ''))).join(',');
    }
    /** [im] redraw KIT lines right after the current pass (microtask; one redraw per line) */
    _imKitLineSoon(id) {
        if (!this._imKitDirty) this._imKitDirty = new Set();
        if (this._imKitDirty.has(id)) return;
        this._imKitDirty.add(id);
        Promise.resolve().then(() => {
            const ids = [...this._imKitDirty];
            this._imKitDirty.clear();
            if (ids.length) this._imRefreshSections(ids);
        });
    }

    // [im] IM presentation of a section (the tpImConfig look): a big table section is shown
    // as a card ("n of m filled" + OPEN) and edited in a full-width panel; a small section
    // is a bordered table in place. Required marks / counts follow the domestic rules
    // (touched, or every required after a failed Apply).
    _imSectionUI(sec, card, isTable, isHdr, isCalc, cmp) {
        card = card || [];
        // ---- the grid as a table: rows, column headings (with the unit), zebra, layout ----
        const full = f => !f.colSpan || Number(f.colSpan) >= 12;
        const span = f => (full(f) ? 12 : Math.max(1, Number(f.colSpan) || 1));
        const blank = f => !f.label || /^[\s\-–—.]*$/.test(String(f.label));   // '' or a '-' spacer
        card.forEach(f => { f.imHidden = false; f.imColCell = false; f.imRowAlt = false; f.imCaption = ''; f.imUnit = ''; f.imRowIn = false; f.imRowLbl = false; f.imRequired = false; f.imHead = false;
            f.imStyle = ''; f._imColGone = false; f._imAbs = false;
            f.imCalc = !!(isTable && isCalc && isCalc(f)); });   // [im] a computed cell of a table: hidden here, shown in the Calculated values panel
        sec.imGridStyle = '';
        const rows = []; let row = { cells: [] }; let col = 0;
        const flush = () => { if (row.cells.length) rows.push(row); row = { cells: [] }; col = 0; };
        card.forEach(f => {
            if (isHdr(f) && blank(f) && full(f)) { f.imHidden = true; flush(); return; }   // row separator (a blank narrow heading keeps its cell)
            if (isHdr(f) && full(f)) { flush(); row.cells.push(f); row.band = true; flush(); return; }
            const sp = span(f);
            if (col + sp > 12) flush();
            f.imCol = col; f.imSpan = sp; row.cells.push(f); col += sp;
            if (col >= 12) flush();
        });
        flush();
        const colRep = card.some(f => f.isColRepeaterInput || f.isColRepeaterLabel);
        if (isTable) {
            // COLUMN REPEATER: a row leaves only as a whole (every item cell computed) - a row that
            // mixes computed and input cells keeps them all, so the item columns never shift
            if (colRep) rows.forEach(r => { const vals = r.cells.filter(c => !isHdr(c)); if (vals.some(c => c.imCalc) && !vals.every(c => c.imCalc)) vals.forEach(c => { c.imCalc = false; }); });
            // a row whose every value is computed leaves with its row label / caption / spacer
            rows.forEach(r => {
                if (r.band) return;
                const vals = r.cells.filter(c => !isHdr(c));
                r.gone = vals.length > 0 && vals.every(c => c.imCalc);
                if (r.gone) r.cells.forEach(c => { if (isHdr(c)) c.imHidden = true; });
            });
            // a band heading with only such rows under it leaves too
            rows.forEach((r, i) => {
                if (!r.band) return;
                let k = i + 1, any = false, all = true;
                for (; k < rows.length && !rows[k].band; k++) { any = true; if (!rows[k].gone) all = false; }
                if (any && all) r.cells.forEach(c => { c.imHidden = true; });
            });
        }
        // ---- the section card: counts, required, approval (computed cells are not counted) ----
        const cells = card.filter(f => !isHdr(f) && !f.imCalc);
        const allRo = cells.length > 0 && cells.every(f => f.readOnly);
        sec.imTable = !!this.inline && cells.length > 0;   // every section edits in its panel (the folder shows cards only)
        sec.imOpen = sec.imTable && this._imOpenSec === sec.id;
        sec.imShowGrid = !sec.imTable || sec.imOpen;
        sec.imShellCls = sec.imOpen ? 'im-gm' : 'im-grid-shell';
        sec.imBodyCls = sec.imOpen ? 'im-gm-body' : 'im-grid-body';
        const filled = cells.filter(f => f.hasValue).length;
        const miss = cells.filter(f => f.required && !f.hasValue && !f.readOnly && (f.touched === true || this._hmShowAllRequired === true)).length;
        sec.imMissing = miss ? (miss === 1 ? '1 required' : miss + ' required') : '';
        sec.imFilledLabel = !cells.length ? '' : (allRo ? cells.length + ' values' : `${filled} of ${cells.length} filled`);
        sec.imTrigger = card.some(f => !isHdr(f) && f._apvHit === true);   // an approval metric field sits in this table (on the card or in its calculated values)
        sec.imCardCls = 'im-tablecard' + (miss ? ' im-tablecard_missing' : '') + (sec.imTrigger ? ' im-tablecard_trigger' : '');
        sec.imOpenLabel = allRo ? 'VIEW' : (filled ? 'OPEN' : 'FILL IN');
        sec.imLabel = this._imSectionLabel(sec);
        sec.imGroupCls = 'accordion-section im-group' + (sec.isExpanded ? ' im-group_open' : '') + (miss ? ' im-group_missing' : '') + (sec.imTrigger ? ' im-group_trigger' : '');
        const head = cmp ? null : rows.find(r => !r.band && !r.gone && r.cells.length > 1 && r.cells.every(isHdr));
        let dataRows = 0;
        if (head) {
            // a data row belongs to the table when each of its cells sits under a heading cell of
            // the same column and width (a row may leave trailing columns empty - the seg5
            // Foundation Bolt metadata has a WEIGHT heading with no cell under it)
            const headAt = {}; head.cells.forEach(h => { headAt[h.imCol + ':' + h.imSpan] = h; });
            let alt = false;
            rows.forEach(r => {
                if (r === head || r.band || r.gone || r.cells.some(isHdr) || r.cells.length < 2) return;
                if (!r.cells.every(c => headAt[c.imCol + ':' + c.imSpan])) return;
                dataRows++; alt = !alt;
                r.cells.forEach(c => { const h = headAt[c.imCol + ':' + c.imSpan]; c.imColCell = true; c.imRowAlt = alt; if (c.unit && !h.imUnit) h.imUnit = c.unit; if (c.required && !c.readOnly) h.imRequired = true; });
            });
        }
        // MATRIX: heading row + data rows. GRID: every row is made of equal-width cells (segment
        // details 4 x 3, full-width rows), so the metadata spans are kept. FORM: odd mixed widths
        // (KIT line) drawn as equal tiles.
        // COLREP: the Transmission-Pole-style column repeater (row label | item 1 | item 2 ...)
        let layout = 'form';
        if (colRep) {
            layout = 'colrep';
            let alt = false, n = 1;
            rows.forEach(r => {
                if (r.band || r.gone) return;
                const lbl = r.cells.find(c => c.isColRepeaterLabel);
                const ins = r.cells.filter(c => c.isColRepeaterInput);
                if (ins.length > n) n = ins.length;
                if (lbl) alt = !alt;
                const headRow = r.cells.every(isHdr);
                r.cells.forEach(c => { c.imHead = headRow; if (c.isColRepeaterInput) { c.imRowIn = true; c.imRowAlt = alt; } else if (c.isColRepeaterLabel) { c.imRowLbl = true; c.imRowAlt = alt; } });
                if (headRow) alt = false;
                if (lbl && ins.length && !headRow) { lbl.imUnit = ins[0].unit || ''; lbl.imRequired = ins.some(c => c.required && !c.readOnly); }
            });
            sec.imGridStyle = '--n:' + n + ';';   // one column per item; the panel scrolls sideways, the row label stays
        }
        else if (head && dataRows) layout = 'matrix';
        // ROWS: the metadata lays the section out as captioned rows (a narrow heading cell -
        // "TOP SEGMENT", "MIDDLE SEGMENT - 2" - followed by its inputs on the same 12-column
        // row): the spans are kept and the caption reads as a row label on the left
        else if (rows.some(r => !r.band && !r.gone && r.cells.some(c => isHdr(c) && !blank(c)) && r.cells.some(c => !isHdr(c)))) layout = 'rows';
        // COMPARE: an override pair - field | current value | override input (see _imCompareCard)
        if (cmp) layout = 'compare';
        // [im] KIT line: equal tiles whatever the metadata widths (the mast figures first - see
        // _imKitOrder); a blank spacer heading takes no tile
        if (sec._imKit) {
            layout = 'form';
            card.forEach(f => { if (isHdr(f) && blank(f)) f.imHidden = true; });
        }
        // everything else - segment details under their bands, general details, KIT line, a
        // single full-width field - is drawn as equal tiles (label above, input below), so every
        // mast type reads the same compact way
        if (layout === 'form') {
            // a column heading that only names the input beside it becomes that input's caption
            rows.forEach(r => r.cells.forEach((c, i) => {
                const n = r.cells[i + 1];
                if (isHdr(c) && !full(c) && n && !isHdr(n) && blank(n)) { n.imCaption = c.label; c.imHidden = true; }
            }));
        }
        // ---- [im] the computed cells of a table leave it (Deepanjan, 29th September 2026) ----
        const out = [];
        if (isTable && card.some(f => f.imCalc)) {
            const under = (h, c) => c.imCol >= h.imCol && c.imCol + c.imSpan <= h.imCol + h.imSpan;
            // a column whose every cell is computed leaves with its heading (General Details
            // "REALIZATION FOR...", accessory "Amount")
            if (head && (layout === 'matrix' || layout === 'rows')) {
                head.cells.forEach(h => {
                    const below = [];
                    rows.forEach(r => { if (r === head || r.band) return; r.cells.forEach(c => { if (!isHdr(c) && under(h, c)) below.push(c); }); });
                    if (below.length && below.every(c => c.imCalc)) { h.imHidden = true; h._imColGone = true; below.forEach(c => { c._imColGone = true; }); }
                });
            }
            // MATRIX / ROWS are placed on the 12-column grid: every cell gets its column so a row
            // never runs into the next one. The width of a column that left goes to its left
            // neighbour (or the right one) on the heading row and on every row under it alike, so
            // the table stays aligned and full-width; any other computed cell just closes up.
            if (layout === 'matrix' || layout === 'rows') {
                rows.forEach(r => {
                    if (r.band || r.gone) return;
                    const out1 = c => c.imCalc || c.imHidden;
                    const vis = r.cells.filter(c => !out1(c));
                    const pos = new Map(vis.map(c => [c, { s: c.imCol, n: c.imSpan }]));
                    r.cells.forEach(c => {
                        if (!out1(c) || !c._imColGone) return;
                        const left = vis.find(v => { const p = pos.get(v); return p.s + p.n === c.imCol; });
                        if (left) { pos.get(left).n += c.imSpan; c._imAbs = true; return; }
                        const right = vis.find(v => pos.get(v).s === c.imCol + c.imSpan);
                        if (right) { const p = pos.get(right); p.s = c.imCol; p.n += c.imSpan; c._imAbs = true; }
                    });
                    vis.forEach(v => {
                        const p = pos.get(v);
                        let sh = 0;
                        r.cells.forEach(c => { if (out1(c) && !c._imAbs && c.imCol < v.imCol) sh += c.imSpan; });
                        v.imStyle = 'grid-column: ' + (p.s - sh + 1) + ' / span ' + p.n + ';';
                    });
                });
            }
            // the Calculated values rows: named after the row label (column repeater), the column
            // heading (matrix) or the row caption + heading (captioned rows); grouped by item / row
            const own = c => (blank(c) ? '' : String(c.label).trim());
            const headOf = c => { if (!head) return ''; const h = head.cells.find(x => under(x, c)); return h && !blank(h) ? String(h.label).trim() : ''; };
            const capOf = r => { const h = r.cells.find(c => isHdr(c) && !blank(c) && !c._imColGone); return h ? String(h.label).trim() : ''; };
            const groupOf = c => {
                if (c.isColRepeaterInput && c.columnCountIndex) return 'Item ' + c.columnCountIndex;
                const m = /^(r|c|kit_line_)(\d+)_/.exec(c.apiName || '');
                return m ? (m[1] === 'r' ? 'Row ' : (m[1] === 'c' ? 'Item ' : 'Line ')) + m[2] : '';
            };
            rows.forEach(r => r.cells.forEach(c => {
                if (!c.imCalc) return;
                let label = '';
                if (layout === 'colrep') { const rl = r.cells.find(x => x.isColRepeaterLabel) || r.cells.find(isHdr); label = (rl && !blank(rl) ? String(rl.label).trim() : '') || own(c); }
                else if (layout === 'matrix') label = own(c) || headOf(c) || capOf(r);
                else if (layout === 'rows') { label = own(c); if (!label) { const cp = capOf(r), hd = headOf(c); label = cp && hd && cp !== hd ? cp + ' - ' + hd : (cp || hd); } }
                else label = c.imCaption || own(c);
                if (!label) label = this._prettyLabel(sec, c);
                out.push({ f: c, label, group: groupOf(c), idx: out.length });
            }));
            // item by item (a column repeater lists row by row across the items)
            if (layout === 'colrep') {
                const num = e => { const m = /(\d+)$/.exec(e.group || ''); return m ? Number(m[1]) : 0; };
                out.sort((a, b) => (num(a) - num(b)) || (a.idx - b.idx));
            }
        }
        // PAIRS: a section of only computed "<item> - Qty Consumed" / "<item>" (amount) values
        // (KIT BOM items) reads as a three-column table: ITEM | QTY CONSUMED | AMOUNT
        sec.imIsPairs = false; sec.imPairs = []; sec.imPairsTotal = ''; sec.imPairsTotalFc = '';
        if (allRo && cells.length >= 4) {
            const pairs = []; let i = 0, paired = 0;
            const cur = String(this.currencyCode || '').split(/\s*-\s*/)[0].trim().toUpperCase();
            const rate = Number(this.exchangeRate);
            const money = n => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const fc = n => (cur && cur !== 'INR' && rate > 0) ? cur + ' ' + ((Number(n) || 0) / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
            let total = 0;
            while (i < cells.length) {
                const a = cells[i], b = cells[i + 1];
                const m = /^(.*?)\s*-\s*qty\.?\s*consumed\s*$/i.exec(String(a.label || ''));
                if (m && b && String(b.label || '').trim().toLowerCase() === m[1].trim().toLowerCase()) {
                    const amt = Number(b.value) || 0; total += amt;
                    pairs.push({ key: a.apiName, item: m[1].trim(), qty: (a.value === undefined || a.value === null || a.value === '') ? '0' : String(a.value), unit: a.unit || '', amt: money(amt), fc: amt ? fc(amt) : '', cls: amt ? 'im-pairs-row' : 'im-pairs-row im-pairs-row_zero' });
                    i += 2; paired += 2;
                } else { pairs.push({ key: a.apiName, item: String(a.label || a.apiName), qty: (a.value === undefined || a.value === null || a.value === '') ? '' : String(a.value), unit: a.unit || '', amt: '', fc: '', cls: 'im-pairs-row' }); i += 1; }
            }
            if (paired >= cells.length * 0.8) { sec.imIsPairs = true; sec.imPairs = pairs; sec.imPairsTotal = money(total); sec.imPairsTotalFc = fc(total); }
        }
        sec.imGridShown = !sec.imIsPairs;
        sec.gridWrapperClass = sec.gridWrapperClass.replace(/ im-layout_\w+/g, '') + ' im-layout_' + layout + (sec._imKit ? ' im-layout_kit' : '') + (cmp && cmp.on ? ' im-cmp_on' : '');
        card.forEach(f => this._imFieldCls(f));   // the flags above become classes (no full field UI pass)
        return out;
    }
    /**
     * [im] the Calculated values of a table with several items / rows, drawn as a table too, in
     * the shape of the table they come from: a column repeater (Octagonal Pole Item 1, 2, 3 ...)
     * gives one column per item with the figures down the side; a row table (General Details
     * Row 1 ... 5) gives one row per table row with the figures across the top. A figure an item
     * does not have shows a dash. Values that belong to no item / row stay a list under it.
     * Only when the items share their figures - otherwise the grouped list reads better.
     * Deepanjan (29th September 2026)
     */
    _imCalcGrid(out, groups, show) {
        if (!out || !groups || groups.size < 2) return null;
        const names = [...groups.keys()];
        const grouped = out.filter(e => e.group);
        const labels = [];
        grouped.forEach(e => { if (labels.indexOf(e.label) === -1) labels.push(e.label); });
        if (!labels.length || labels.length * 2 > grouped.length) return null;
        const at = new Map();
        grouped.forEach(e => { const k = e.label + '\u0001' + e.group; if (!at.has(k)) at.set(k, e.f); });
        const fieldsOf = l => grouped.filter(e => e.label === l).map(e => e.f);
        const unitOf = l => { const u = new Set(fieldsOf(l).map(f => f.unit || '')); return u.size === 1 ? [...u][0] : null; };   // null: units differ -> in the cells
        const kindOf = l => { const fs = fieldsOf(l); return fs.every(f => f.isUnitPrice) ? ' im-cg_price' : (fs.every(f => f.isUnitCost) ? ' im-cg_cost' : ''); };
        const cell = (l, g, withUnit) => {
            const f = at.get(l + '\u0001' + g);
            if (!f) return { key: 'x_' + l + '_' + g, value: '\u2013', unit: '', fc: '', cls: 'im-cg-v im-cg-v_none' };
            const v = show(f);
            return { key: f.apiName, value: v === '' ? '\u2013' : v, unit: withUnit && v !== '' ? (f.unit || '') : '', fc: f.imFc || '',
                cls: 'im-cg-v' + (f.isUnitPrice ? ' im-cg_price' : (f.isUnitCost ? ' im-cg_cost' : '')) + (f._apvHit ? ' im-cg_apv' : '') + (v === '' ? ' im-cg-v_none' : '') };
        };
        const byRows = names.every(g => /^Row \d+$/.test(g));
        if (byRows) {
            return { by: 'rows', corner: 'Row', extra: [],
                cols: labels.map((l, i) => ({ key: 'c' + i, label: l, unit: unitOf(l) || '', cls: 'im-cg-h' + kindOf(l) })),
                rows: names.map((g, i) => ({ key: 'r' + i, label: g.replace(/^Row\s+/, ''), unit: '', cls: 'im-cg-r', cells: labels.map(l => cell(l, g, unitOf(l) === null)) })) };
        }
        return { by: 'cols', corner: '', extra: [],
            cols: names.map((g, i) => ({ key: 'c' + i, label: g, unit: '', cls: 'im-cg-h' })),
            rows: labels.map((l, i) => ({ key: 'r' + i, label: l, unit: unitOf(l) || '', cls: 'im-cg-r' + kindOf(l), cells: names.map(g => cell(l, g, unitOf(l) === null)) })) };
    }
    /**
     * [im] OVERRIDE PAIR: section B is shown only while a checkbox of the section A right before it
     * is ticked, and B's inputs carry the same names as A's values (Customer Address: SHIPPING
     * ADDRESS def_street ... + OVERRIDE EXISTING ADDRESS? -> OVERRIDE SHIPPING ADDRESS ovr_street
     * ...). Read from the metadata shape, so any such pair is drawn the same way.
     * Returns { role: 'host' | 'ovr', other, ctl } or null.
     */
    _imOverridePair(sec) {
        const list = this.accordionSections || [];
        const i = list.findIndex(x => x && x.id === sec.id);
        if (i === -1) return null;
        const test = (a, b) => {
            if (!a || !b || !b.controllingField || /[,!]/.test(String(b.controllingField))) return null;
            const vals = (b.controllingValues || []).map(v => String(v).toLowerCase());
            if (vals.indexOf('true') === -1) return null;
            const ctl = (a.fields || []).find(f => f.apiName === b.controllingField && f.type === 'checkbox');
            if (!ctl) return null;
            const hdr = f => f.type === 'header' || f.type === 'sub-section-header';
            const norm = l => String(l || '').replace(/\s+/g, ' ').trim().toUpperCase();
            const aLabels = new Set((a.fields || []).filter(f => f !== ctl && !hdr(f)).map(f => norm(f.label)));
            const bFields = (b.fields || []).filter(f => !hdr(f));
            const hits = bFields.filter(f => aLabels.has(norm(f.label))).length;
            return (bFields.length && hits >= 2 && hits * 2 >= bFields.length) ? ctl : null;
        };
        const next = list[i + 1], prev = list[i - 1];
        let ctl = test(sec, next);
        if (ctl) return { role: 'host', other: next, ctl };
        ctl = test(prev, sec);
        if (ctl) return { role: 'ovr', other: prev, ctl };
        return null;
    }
    /**
     * [im] the card of the host section of an override pair: the checkbox on top, then a table
     * FIELD | CURRENT | OVERRIDE - the current (read-only) value and, once the box is ticked, the
     * override input beside it on the same row. The override inputs are the override section's
     * own fields (same apiName, same value, same save); a heading / blank cell is a display-only
     * object that the engine never sees.
     */
    _imCompareCard(sec, card, pair, isHdr) {
        const other = pair.other, ctl = pair.ctl;
        (sec.fields || []).concat(other.fields || []).forEach(f => { f.imCmp = ''; });
        const on = other.isVisible !== false;
        pair.on = on;
        const norm = l => String(l || '').replace(/\s+/g, ' ').trim().toUpperCase();
        const ovr = on ? (other.fields || []).filter(f => f.isVisible !== false && !isHdr(f)) : [];
        const used = new Set();
        const out = [];
        if (ctl && card.indexOf(ctl) !== -1) { ctl.imCmp = 'toggle'; out.push(ctl); }
        out.push(this._imSynthCell(sec, 'h0', '', 'corner'), this._imSynthCell(sec, 'h1', 'Current', 'head'));
        if (on) out.push(this._imSynthCell(sec, 'h2', 'Override', 'head im-cmp-head_ovr'));
        card.forEach(f => {
            if (f === ctl || isHdr(f)) return;
            out.push(this._imSynthCell(sec, 'l_' + f.apiName, f.label, 'lbl'));
            f.imCmp = 'cur';
            out.push(f);
            if (!on) return;
            const o = ovr.find(x => !used.has(x) && norm(x.label) === norm(f.label));
            if (o) { used.add(o); o.imCmp = 'ovr'; out.push(o); }
            else out.push(this._imSynthCell(sec, 'e_' + f.apiName, '', 'empty'));
        });
        ovr.forEach(o => {
            if (used.has(o)) return;
            o.imCmp = 'ovr';
            out.push(this._imSynthCell(sec, 'l_' + o.apiName, o.label, 'lbl'), this._imSynthCell(sec, 'e_' + o.apiName, '', 'empty'), o);
        });
        return out;
    }
    /** [im] a display-only heading / blank cell of the compare table (kept per section, so its identity is stable) */
    _imSynthCell(sec, key, label, kind) {
        const store = sec._imSynth || (sec._imSynth = {});
        const k = sec.id + '__im_' + key;
        const c = store[k] || (store[k] = { apiName: k, type: 'header', isHeader: true, colSpan: 6, _imSynthetic: true });
        c.label = label || '';
        c.imUnit = ''; c.imRequired = false; c.imErr = ''; c.imCaption = '';
        c._imBaseCls = 'slds-col field-cell-grid grid-header-cell im-cmp-' + kind;
        c.containerClass = c._imBaseCls;
        return c;
    }
    /** [im] the fields a section's panel shows: its own, and the override inputs drawn in it */
    _imPanelFields(sec) {
        const pair = this.inline ? this._imOverridePair(sec) : null;
        return (sec.fields || []).concat(pair && pair.role === 'host' && pair.other.isVisible !== false ? (pair.other.fields || []) : []);
    }
    /** [im] a section without a label takes the last band heading of the section before it (KIT: "BOM ITEM DETAILS") */
    _imSectionLabel(sec) {
        if (sec.label && String(sec.label).trim()) return sec.label;
        const list = this.accordionSections || [];
        const i = list.indexOf(sec);
        for (let k = i - 1; k >= 0; k--) {
            const hdrs = (list[k].fields || []).filter(f => (f.type === 'header' || f.type === 'sub-section-header') && f.label && String(f.label).trim());
            if (hdrs.length) return hdrs[hdrs.length - 1].label;
        }
        return 'Details';
    }
    handleImTableOpen(event) {
        event.stopPropagation();
        this._hmFlushActive();
        const prev = this._imOpenSec;
        this._imOpenSec = event.currentTarget.dataset.id;
        this._imDoneErr = '';
        this._imRefreshSections([prev, this._imOpenSec]);
    }
    handleImTableClose(event) {
        if (event) event.stopPropagation();
        this._hmFlushActive();
        const prev = this._imOpenSec;
        this._imOpenSec = null;
        this._imDoneErr = '';
        this._imRefreshSections([prev]);
    }
    /** [im] PERF: opening / closing a panel changes only that section's panel state - re-render it alone */
    _imRefreshSections(ids) {
        const want = new Set((ids || []).filter(Boolean));
        if (!want.size) return;
        this.accordionSections = this.accordionSections.map(sec => {
            if (!want.has(sec.id)) return sec;
            this._updateSectionUI(sec);
            return { ...sec };
        });
    }
    /** DONE: the section must be complete - every required field filled, no value below its minimum,
     *  no refused segment count. Otherwise the panel stays open, the fields are marked and the
     *  first one is focused. The x closes without checking (the Apply check still runs). */
    handleImTableDone(event) {
        event.stopPropagation();
        this._hmFlushActive();
        const id = event.currentTarget.dataset.id;
        const sec = this.accordionSections.find(x => x.id === id);
        if (!sec) { this.handleImTableClose(); return; }
        clearTimeout(this._hmLiveTimer);
        try { this._calculateNow(); } catch (e) { /* the figures on screen are used */ }
        const panelFields = this._imPanelFields(sec);   // [im] with the override inputs drawn in it
        panelFields.forEach(f => { if (f.isVisible !== false && !f.readOnly && f.type !== 'header') f.touched = true; });
        this._imMissingFields();
        const own = new Set(panelFields.map(f => f.apiName));
        const hits = (this._imMissingApis || []).filter(x => own.has(x.apiName));
        if (!hits.length) { this.handleImTableClose(); return; }
        this._imDoneErr = hits.length === 1 ? '1 field needs attention' : hits.length + ' fields need attention';
        this._hmRefreshUI();
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const el = this.template.querySelector(`[data-name="${hits[0].apiName}"]`);
            if (el && el.scrollIntoView) { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); if (el.focus) el.focus(); }
        }, 60);
    }
    get imDoneErr() { return this._imDoneErr || ''; }

    // ═════════════════════════ hmEstimator UI helpers ═════════════════════════
    // LIVE ENGINE (IM pattern). Every field is a native input: typing costs nothing, and
    // ONE change event arrives when the user leaves the field (Tab / click away / Enter).
    // That commit runs the very _calculateNow() the domestic CALCULATE button runs, so the
    // figures are what the domestic modal shows after CALCULATE - just without the button.
    _hmTouch(fields) {
        (fields || []).forEach(f => { if (f) f.touched = true; });
    }
    // One committed field -> one full pass of the engine (visibility, lookups, formulas,
    // section labels, UI). 120 ms debounce, as in the IM children, so a Tab straight into
    // the next field never queues two passes. sideEffects: the price-variation fetch and
    // the Telecom composition check, which the domestic modal runs only after a picklist /
    // checkbox / structural field - a plain number or text field does not run them there,
    // so it does not run them here either.
    _hmSchedule(fieldApiName, sideEffects) {
        clearTimeout(this._hmLiveTimer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._hmLiveTimer = setTimeout(() => {
            try {
                this._calculateNow();
                if (sideEffects && TELECOM_COMPOSITION_APIS.includes(fieldApiName)) {
                    this._validateTelecomTowerComposition();
                }
            } catch (mathError) {
                console.error('Math Engine Error:', mathError);
            }
            // Fetch PV data whenever month, year, or material type changes
            if (sideEffects) this._checkAndFetchPriceVariation();
            this._imResolveDependents();           // [im] dependent picklists whose controlling field is a formula
            this._imEmitSoon();                    // [im] live apply after the pass
        }, 120);
    }
    // TYPING IS NEVER LOST (audit of 28th September 2026). A native input keeps what the
    // user types in the box only - the model gets it on the change event. If a re-render
    // happens meanwhile (the pass of the field just left, a price fetch), the template puts
    // the model value back into the box and the characters typed so far would vanish. So
    // every keystroke is noted here (no render, no math) and renderedCallback puts it back.
    handleHmTyping(event) {
        const el = event.target;
        if (!el || !el.dataset || !el.dataset.name) return;
        let sel = null;
        try { sel = el.selectionStart; } catch (e) { sel = null; }
        this._hmTyping = { name: el.dataset.name, value: el.value, sel };
    }
    // The last field typed into but not yet left: committed now, exactly as its change
    // event would commit it. APPLY / CLOSE / the calculated-values popup call this first,
    // because a device that does not move the focus on that click (iOS) would not fire
    // the change event before it - the domestic modal had every keystroke already.
    _hmFlushActive() {
        const t = this._hmTyping;
        if (!t) return;
        this._hmTyping = null;
        const el = this.template.activeElement;
        if (!el || !el.dataset || el.dataset.name !== t.name) return;
        // [im] PERF: the box already holds what the model has (its change event came through) -
        // nothing to commit, so no second calculation pass
        let model;
        this.accordionSections.some(sec => sec.fields.some(f => {
            if (f.apiName !== t.name || sec.isVisible === false || f.isVisible === false) return false;
            model = f.value; return true;
        }));
        if (this.inline && model !== undefined && String(model === null ? '' : model) === String(el.value)) return;
        this.handleFieldChange({ currentTarget: el, target: el, detail: {} });
    }
    // <textarea value={x}> is only an attribute in LWC (LWC1057) and a <select> gets its value
    // before its options exist on first paint: write both into the element after every
    // render - never into the one the user is working in. And the text being typed (see
    // handleHmTyping) goes back into its box if a render replaced it.
    renderedCallback() {
        const active = this.template.activeElement;
        const t = this._hmTyping;
        if (t && active && active.dataset && active.dataset.name === t.name && active.value !== t.value) {
            active.value = t.value;
            if (t.sel !== null && t.sel !== undefined) { try { active.setSelectionRange(t.sel, t.sel); } catch (e) { /* not a text box */ } }
        }
        const els = this.template.querySelectorAll('textarea[data-name], select[data-name]');
        if (!els.length) return;
        els.forEach(el => {
            if (el === active) return;
            let want = '';
            this.accordionSections.some(sec => sec.fields.some(f => {
                if (f.apiName !== el.dataset.name) return false;
                if (sec.isVisible === false || f.isVisible === false) return false;
                want = (f.value === undefined || f.value === null) ? '' : String(f.value);
                return true;
            }));
            if (el.value !== want) el.value = want;
        });
    }
    // Re-run the per-field / per-section UI pass without any math.
    _hmRefreshUI() {
        this.accordionSections = this.accordionSections.map(sec => {
            sec.fields.forEach(f => this._updateFieldUI(f));
            this._updateSectionUI(sec);
            return { ...sec };
        });
    }
    // The popup reads the section's rows at every render, so a pass that finishes while
    // it is open (the field left by clicking the button) shows up in it at once.
    handleCalcOpen(event) {
        event.stopPropagation();       // the button sits inside the section header - don't toggle the section
        this._hmFlushActive();
        const id = event.currentTarget.dataset.id;
        const sec = this.accordionSections.find(x => x.id === id);
        if (!sec) return;
        this._updateSectionUI(sec);   // freshest values
        // [im] KIT line: its BOM section feeds the same panel - freshest too
        if (this._imIsKitLine(sec)) this._imKitParts(sec).forEach(p => this._updateSectionUI(p));
        this.hmCalc = { id, title: sec.imLabel || sec.label };
    }
    handleCalcClose() { this.hmCalc = null; }
    get hmCalcOpen() { return !!this.hmCalc; }
    get hmCalcTitle() { return this.hmCalc ? this.hmCalc.title : ''; }
    get hmCalcRows() {
        if (!this.hmCalc) return [];
        const sec = this.accordionSections.find(x => x.id === this.hmCalc.id);
        const own = sec && Array.isArray(sec.calcFields) ? sec.calcFields : [];
        // [im] KIT line: its own figures (1 / 2 segments) + those of its BOM section (3+ segments)
        if (this._imIsKitLine(sec)) return own.concat(...this._imKitParts(sec).map(p => (Array.isArray(p.calcFields) ? p.calcFields : []).filter(r => !r.isGroup)));
        return own;
    }
    /** [im] the open panel's table form (several items / rows), or null for the plain list */
    get hmCalcGrid() {
        if (!this.hmCalc) return null;
        const sec = this.accordionSections.find(x => x.id === this.hmCalc.id);
        return sec && sec.calcGrid ? sec.calcGrid : null;
    }
    get hmCalcExtra() { const g = this.hmCalcGrid; return g && Array.isArray(g.extra) ? g.extra : []; }
    get hmCalcHasExtra() { return this.hmCalcExtra.length > 0; }
    get hmCalcGridCls() { const g = this.hmCalcGrid; return 'im-cg' + (g ? ' im-cg_by' + g.by : ''); }
    get hmCalcSheetCls() { return 'im-gm im-gm_calc hm-calc-sheet' + (this.hmCalcGrid ? ' im-gm_calcgrid' : '') + (this.hmCalcBom ? ' im-gm_calcbom' : ''); }

    // ═════════════════ [im] KIT CODE DETAILS: one card per KIT line ═════════════════
    // Deepanjan (29th September 2026): a KIT line is ONE card, like every other section. Its
    // CALCULATED VALUES panel holds what the formulas give for that line: COST / SET, UNIT PRICE,
    // UNIT COST and the BOM ITEM DETAILS (item | qty consumed | amount) - whichever mast type the
    // KIT is for and whatever the segment count: 1 / 2 segments keep the BOM formulas in the line
    // itself, 3+ in the BOM section the KIT blueprint clones per line (kit_line_N_lm-3-kit-segment),
    // which is therefore not drawn as a card of its own. Presentation only: the sections, fields,
    // formulas, line items and saved values are the engine's, untouched.
    /**
     * [im] KIT line card order: the mast figures of the line (QTY. OF HM, MAST HEIGHT, RING DIA,
     * No of Segment - read from the Weight Estimator; MAST HEIGHT / segments typed in LCLM) open
     * the card as one row, then the inputs in metadata order (REALIZATION, luminaries, cable,
     * winch ...). Order only - same fields, same values.
     */
    _imKitOrder(card, isHdr, metaRO, isCalc) {
        // the mast figures (typed in LCLM, read from the Weight Estimator elsewhere) + any other read-only one
        const MAST = /_(lm_qty_of_hm|lm_mast_height|lm_ring_dia|no_of_segment_select)$/;
        const ctx = card.filter(f => !isHdr(f) && !isCalc(f) && (MAST.test(String(f.apiName || '')) || metaRO(f)));
        return ctx.length ? ctx.concat(card.filter(f => ctx.indexOf(f) === -1)) : card;
    }
    /** the KIT line a section is: its Line section (kit_line_N) */
    _imIsKitLine(sec) { return !!sec && /^kit_line_\d+$/.test(String(sec.id || '')); }
    /** a BOM section of a KIT line (its lineItemGroup is the line) */
    _imIsKitBom(sec) { return !!sec && /^kit_line_\d+$/.test(String(sec.lineItemGroup || '')) && sec.id !== sec.lineItemGroup; }
    /** the BOM section(s) of a KIT line that are on screen */
    _imKitParts(line) {
        return (this.accordionSections || []).filter(s => s && s.isVisible !== false && s.lineItemGroup === line.id && s.id !== line.id);
    }
    /** "<item> - Qty Consumed" + "<item>" (amount) computed pairs of a field list: rows + total (the BOM table) */
    _imBomPairs(fields) {
        const cells = (fields || []).filter(f => f && f.type !== 'header' && f.type !== 'sub-section-header' && f.isHeader !== true);
        const cur = String(this.currencyCode || '').split(/\s*-\s*/)[0].trim().toUpperCase();
        const rate = Number(this.exchangeRate);
        const money = n => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const fc = n => (cur && cur !== 'INR' && rate > 0) ? cur + ' ' + ((Number(n) || 0) / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
        const pairs = []; const used = new Set(); let total = 0;
        for (let i = 0; i < cells.length - 1; i++) {
            const a = cells[i], b = cells[i + 1];
            const m = /^(.*?)\s*-\s*qty\.?\s*consumed\s*$/i.exec(String(a.label || ''));
            if (!m || String(b.label || '').trim().toLowerCase() !== m[1].trim().toLowerCase()) continue;
            const amt = Number(b.value) || 0; total += amt;
            pairs.push({ key: a.apiName, item: m[1].trim(), qty: (a.value === undefined || a.value === null || a.value === '') ? '0' : String(a.value), unit: a.unit || '',
                amt: money(amt), fc: amt ? fc(amt) : '', cls: amt ? 'im-pairs-row' : 'im-pairs-row im-pairs-row_zero' });
            used.add(a); used.add(b); i++;
        }
        return { pairs, used, total: money(total), totalFc: fc(total) };
    }
    /** [im] the BOM ITEM DETAILS of the open panel's KIT line, or null */
    get hmCalcBom() {
        if (!this.hmCalc) return null;
        const sec = this.accordionSections.find(x => x.id === this.hmCalc.id);
        if (!this._imIsKitLine(sec)) return null;
        const src = (sec.visibleFields || []).concat(...this._imKitParts(sec).map(p => p.visibleFields || []));
        const b = this._imBomPairs(src);
        return b.pairs.length ? b : null;
    }

    // =========================================================
    // FIELD BUILDER
    // =========================================================
    _buildFields(fieldDefs, sectionId, showRequired = true) {
        return fieldDefs.map(f => {
            const defaultVal = this._computeDefaultVal(f);
            const lastVal = this._lastValues[f.apiName];
            const wasCleared = this._lastValues[`${f.apiName}__cleared`] === true;
            const wasManual = this._lastValues[`${f.apiName}__manual`] === true;
            const hasLastVal = !wasCleared && lastVal !== undefined && lastVal !== null && lastVal !== '';
 
            const initialValue = f.formula
                ? (hasLastVal ? lastVal : (defaultVal !== '' ? defaultVal : ''))
                : (hasLastVal ? lastVal : (wasCleared ? '' : defaultVal));
 
            const field = {
                apiName: f.apiName,
                label: f.label,
                type: f.type,
                labelsByController: f.labelsByController || null,
                value: initialValue,
                isWeightTotal: f.isWeightTotal || false,
                isQuantity: f.isQuantity || false,
                isRealization: f.isRealization || false,
                isUnitPrice: f.isUnitPrice || false,
                isUnitCost: f.isUnitCost || false,
                isListPrice: f.isListPrice || false,
                isMargin: f.isMargin || false,
                isDiscount: f.isDiscount || false,        
                isAddedUp: f.isAddedUp || false,          // 👉 ADD THIS
                isTolerance: f.isTolerance || false, 
                approvalMetric: f.approvalMetric || null,  //added by faizan
                defaultValue: defaultVal,
                userCleared: wasCleared,
                isManualOverride: wasManual,
                formula: f.formula || null,
                required: showRequired ? (f.required || false) : false,
 
                // 👉 SAFELY INJECTED TRACKER FOR READONLY
                readOnly: this.isReadOnly ? true : (f.readOnly || false),
                baseReadOnly: f.readOnly || false,
                _imMetaRO: !!f.readOnly,   // [im] read-only in the metadata (view mode sets baseReadOnly on every field)

                unit: f.unit || null,
                min: f.min || null,
                max: f.max || null,
                controllingField: f.controllingField || null,
                controllingValues: f.controllingValues || ['*'],
 
                disableControllingField: f.disableControllingField || null,
                disableControllingValues: f.disableControllingValues || ['*'],
                hideLabelLayout: f.hideLabelLayout || false,
 
                columnCountApi: f.columnCountApi || null,
                columnCountIndex: f.columnCountIndex || null,
                isColRepeaterLabel: f.isColRepeaterLabel || false,
                isColRepeaterInput: f.isColRepeaterInput || false,
                // carried from the grid-repeater expansion; read only by the mobile
                // table marker in _updateSectionUI. Reetabrata (17th July 2026)
                isGridRepeaterCell: f.isGridRepeaterCell || false,
                repeaterApi: f.repeaterApi || null,
                repeaterMaxCols: f.repeaterMaxCols || null,
 
                options: (f.options || []).map(opt => ({ label: opt, value: opt })),
                masterOptions: (f.options || []).map(opt => ({ label: opt, value: opt })), //  SAVES ORIGINAL LIST Abhishek saxena
                dependentOptionsMap: f.dependentOptionsMap || null, // CATCHES THE MAP FROM JSON Abhishek saxena
                controllingFields: f.controllingFields || null,//CATCHES THE ARRAY Abhishek saxena
                //Abhishek saxena
                lookupWeight: f.lookupWeight || false,
                weightMap: f.weightMap || null,
                baseRatesMap: f.baseRatesMap || null,
                calculateTotalWeight: f.calculateTotalWeight || false,
                calculateSecretWeight: f.calculateSecretWeight || false,
                //End
                sectionId,
                colSpan: f.colSpan || 12,
                isVisible: false,
 
                isSubSectionHeader: false,
                isSubSectionExpanded: f.isSubSectionExpanded || false,
                parentSubSectionApi: f.parentSubSectionApi || null,
                isCollapsedUI: f.isCollapsedUI || false,
                forceHidden: f.forceHidden || false, // Reetabrata (8th July 2026)
 
                containerClass: '', checkboxCellClass: '', dividerClass: '', labelClass: '',
               
                isText: false, isPicklist: false, isNumber: false, isDate: false, isCheckbox: false, isHeader: false, isTextarea: false, hasValue: false
            };
 
            this._updateFieldUI(field);
            return field;
        });
    }
 
    // A flagged section may hold no field for the evaluated metric - the input can live
    // in a separate pricing section of the same modal. Pick it by apiName kinship: among
    // every field in the modal carrying that metric, take the one sharing the longest
    // apiName prefix with the flagged section's own fields. A tie, or no candidate, marks
    // nothing - never a guess. Deepanjan (20th September 2026)
    _apvApplyFallback() {
        const secs = Array.isArray(this.accordionSections) ? this.accordionSections : [];
        if (!secs.length) return;
        const common = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
        secs.forEach(sec => {
            if (!Array.isArray(sec._apvMetrics) || !sec._apvMetrics.length || !sec._apvSample) return;
            sec._apvMetrics.forEach(metric => {
                // Exact apiName first, substring only when nothing matches exactly -
                // same reason as in _makeSectionObj above.
                const exact = [];
                const loose = [];
                secs.forEach(s => (s.fields || []).forEach(f => {
                    if (f.type === 'header' || !f.apiName) return;
                    const api = String(f.apiName).toLowerCase();
                    if (api === metric) exact.push(f);
                    else if (api.includes(metric)) loose.push(f);
                }));
                const cands = exact.length ? exact : loose;
                if (!cands.length) return;
                if (cands.some(f => f._apvHit)) return;                 // already resolved
                if (cands.length === 1) { cands[0]._apvHit = true; this._updateFieldUI(cands[0]); return; }
                const scored = cands.map(f => ({ f, k: common(String(f.apiName).toLowerCase(), sec._apvSample) }))
                                    .sort((x, y) => y.k - x.k);
                if (scored[0].k > 0 && scored[0].k > scored[1].k) {     // a clear winner only
                    scored[0].f._apvHit = true;
                    this._updateFieldUI(scored[0].f);
                }
            });
        });
    }

    // A marked field may hold no number of its own - it only COPIES another field (its
    // whole formula is that one field, e.g. the Row's TOTALS "Line Item Realization" =
    // (r1_lm_seg5_realization || 0)). The number the reviewer must look at is the source
    // (the Row's REALIZATION cell up in General Details), so mark it too, wherever it
    // sits. The copy stays marked. Any formula that does more than copy (a sum, a
    // condition, a second field) stops the walk - never a guess. At most 3 copies deep.
    // Deepanjan (22nd September 2026)
    _apvMarkSources() {
        const secs = Array.isArray(this.accordionSections) ? this.accordionSections : [];
        if (!secs.length) return;
        const marked = [];
        secs.forEach(s => (s.fields || []).forEach(f => { if (f && f._apvHit) marked.push(f); }));
        if (!marked.length) return;                                   // no approval marks - nothing to do
        const COPY = /^\s*\(?\s*(?:Number\s*\(\s*)?([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\|\|\s*0\s*)?\)?\s*\)?\s*$/;
        const byApi = new Map();
        secs.forEach(s => (s.fields || []).forEach(f => {
            if (!f || !f.apiName || f.type === 'header') return;
            if (!byApi.has(f.apiName)) byApi.set(f.apiName, []);
            byApi.get(f.apiName).push(f);
        }));
        marked.forEach(f => {
            let cur = f;
            for (let hop = 0; hop < 3; hop++) {
                const m = cur && cur.formula ? String(cur.formula).match(COPY) : null;
                if (!m || m[1] === cur.apiName) break;
                const src = byApi.get(m[1]);
                if (!src || !src.length) break;
                src.forEach(x => { if (!x._apvHit) { x._apvHit = true; this._updateFieldUI(x); } });
                cur = src[0];
            }
        });
    }

    _updateFieldUI(field) {
        field.isText = field.type === 'text';
        field.isPicklist = field.type === 'picklist';
        field.isNumber = field.type === 'number';
        field.isDate = field.type === 'date';
        field.isCheckbox = field.type === 'checkbox';
        field.isHeader = field.type === 'header';
        
        // 👉 CRITICAL FIX: This triggers the HTML to draw the grey accordion box!
        field.isSubSectionHeader = field.type === 'sub-section-header'; 
        
        field.isTextarea = field.type === 'textarea';
        field.isSubtypeQtyGrid = field.type === 'subtype_qty_grid';
        
        field.displayValue = field.isDate ? this._formatDateDDMMYYYY(field.value) : field.value;
 
        const sizeClass = `slds-col slds-size_${field.colSpan}-of-12`;
       let baseClass = (field.type === 'header' || field.type === 'sub-section-header')
            ? (field.colSpan < 12 ? 'field-cell-grid grid-header-cell' : 'field-row-header')
            : (field.colSpan < 12 ? 'field-cell-grid' : 'field-row-standard');
            
        if (field.readOnly) baseClass += ' readonly-row';
        
        // 👉 This hides the internal fields when the accordion is collapsed
        if (field.isCollapsedUI) baseClass += ' slds-hide';
        
        field.containerClass = `${sizeClass} ${baseClass}`;
        // approval mark (Deepanjan, 20th Sep 2026), price / cost colour and the [im] table / state
        // classes are added by _imFieldCls on top of this base
        field._imBaseCls = field.containerClass;
 
        // 👉 This controls the chevron rotation
        if (field.isSubSectionHeader) {
            field.chevronIcon = field.isSubSectionExpanded ? 'utility:chevrondown' : 'utility:chevronright';
            field.subSectionHeaderClass = `sub-section-header-bar ${field.isSubSectionExpanded ? 'expanded' : ''}`;
        }
 
        field.checkboxCellClass = field.value === true ? 'checkbox-cell selected' : 'checkbox-cell';
 
        field.hasValue = field.type === 'checkbox' ? field.value === true : (field.value !== '' && field.value !== null && field.value !== undefined);
        // hmEstimator: the red mark waits until the user has touched the field or an APPLY failed validation
        const hmShowReq = field.required && !field.hasValue && (field.touched === true || this._hmShowAllRequired === true);
        field.dividerClass = hmShowReq ? 'field-divider required-divider' : 'field-divider';
        // hmEstimator: bindings of the native <select> / toggle (options carry their own selected flag)
        const hmVal = (field.value === undefined || field.value === null) ? '' : String(field.value);
        field.hmOptions = (field.options || []).map(o => {
            const v = (o !== null && typeof o === 'object' && o.value !== undefined) ? o.value : o;
            const l = (o !== null && typeof o === 'object' && o.label !== undefined) ? o.label : o;
            return { label: (l === undefined || l === null) ? '' : String(l), value: (v === undefined || v === null) ? '' : String(v), selected: String(v) === hmVal };
        });
        field.hmChecked = typeof field.value === 'string' || !!field.value;   // lightning-input's rule (normalizeBoolean): any string shows ON
        field.hmBlankSelected = !field.hmOptions.some(o => o.selected);        // the empty, unpickable option shows a blank / unknown value
        field.hmToggleText = field.hmChecked ? 'Yes' : 'No';
        field.labelClass = field.required ? 'field-label required-label' : 'field-label';
        if (field.isSubtypeQtyGrid) this._sqgEnrich(field);
        // [im] a unit price / unit cost figure also reads in the quote currency (the rate-card
        // figure stays the value - the offer converts at print time, exactly like the parent)
        field.imFc = '';
        if ((field.isUnitPrice || field.isUnitCost) && field.hasValue && field.type === 'number') {
            const cur = String(this.currencyCode || '').split(/\s*-\s*/)[0].trim().toUpperCase();
            const rate = Number(this.exchangeRate);
            const n = Number(field.value);
            if (cur && cur !== 'INR' && rate > 0 && !isNaN(n)) {
                field.imFc = cur + ' ' + (n / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }
        this._imFieldCls(field);
    }
    /**
     * [im] the IM part of a field's classes: table presentation flags set by _imSectionUI
     * (hidden separator headings, column cells named by the heading row, zebra rows, a caption
     * borrowed from a heading cell) and the field's state (required / error). Runs after
     * _updateFieldUI (hasValue is current), and alone when only the flags changed.
     */
    _imFieldCls(field) {
        field.imLabelText = field.imCaption || field.label || '';
        field.containerClass = field._imBaseCls || field.containerClass || '';
        if (field._apvHit) field.containerClass += ' apv-hit-field';   // approval: the evaluated metric field - Deepanjan (20th Sep 2026)
        if (field.isUnitPrice) field.containerClass += ' im-cell_price';   // [im] colour code of a price / cost cell
        else if (field.isUnitCost) field.containerClass += ' im-cell_cost';
        const imBlankLabel = /^[\s\-\u2013\u2014.]*$/.test(String(field.imLabelText));   // '' or a '-' spacer
        if (field.imHidden) field.containerClass += ' im-hdr_blank';
        if (field.imCalc) field.containerClass += ' im-cell_calc';
        if (field.imCmp) field.containerClass += field.imCmp === 'toggle' ? ' im-cmp-toggle' : ' im-cmp-cell im-cmp-' + field.imCmp;   // [im] override pair   // [im] a computed table cell: shown in the Calculated values panel
        else if (imBlankLabel) {
            const imIsHdr = field.type === 'header' || field.type === 'sub-section-header';
            const imFull = !field.colSpan || Number(field.colSpan) >= 12;
            field.containerClass += imIsHdr ? (imFull ? ' im-hdr_blank' : ' im-hdr_empty') : ' im-cell_nolabel';   // a blank narrow heading keeps its cell
        }
        // [im] what is wrong with this field, shown under it: required (after the user touched
        // it or Apply failed), below the minimum, or a segment count this estimator refuses
        field.imErr = '';
        field.imReq = false;   // required and still empty: marked from the start, the message once touched / DONE / Apply
        if (!field.readOnly && field.isVisible !== false && field.type !== 'header' && field.type !== 'sub-section-header') {
            const imShow = field.touched === true || this._hmShowAllRequired === true;
            if (field.required && !field.hasValue) { field.imReq = true; if (imShow) field.imErr = 'Required'; }
            else if (field.hasValue && field.min !== null && field.min !== undefined) {
                const n = parseFloat(field.value);
                if (isNaN(n) || n < Number(field.min)) field.imErr = 'Must be ' + field.min + ' or more';
            } else if (field.hasValue && this._modalConfig && this._modalConfig.dynamicSegments === true && /lm_no_of_segment$/.test(String(field.apiName || ''))) {
                const c = validateSegmentCount(field.value);
                if (c.block) field.imErr = '6 to 15 segments only - for 1 to 5 use Standard Mast > Lighting Mast';
                else if (c.message && String(c.value) !== String(field.value).trim()) field.imErr = c.message;
            }
        }
        if (field.imErr) field.containerClass += ' im-cell_err';
        else if (field.imReq) field.containerClass += ' im-cell_req';
        if (field.imHead) field.containerClass += ' im-cell_head';
        if (field.imColCell) field.containerClass += ' im-cell_col';
        if (field.imRowIn) field.containerClass += ' im-cell_rowin';
        if (field.imRowLbl) field.containerClass += ' im-cell_rowlbl';
        if (field.imRowAlt) field.containerClass += ' im-row_alt';
    }
 
    _computeDefaultVal(f) {
        if (f.type === 'checkbox') return f.defaultValue || false;
        if (f.type === 'number') {
            return (f.defaultValue !== undefined && f.defaultValue !== null) ? Number(f.defaultValue) : '';
        }
        return (f.defaultValue !== undefined && f.defaultValue !== null) ? String(f.defaultValue) : '';
    }

    /* No class-level this.isFirmMode exists — detect mode the same way the
       pricing engine does: material grid present AND no PV month field = FIRM. */
    _sqgIsFirm() {
        const hasMaterialField = this.accordionSections.some(sec =>
            sec.fields.some(f =>
                f.apiName === 'material_list_type_1' ||
                /^c\d+_material_list_type$/.test(f.apiName)
            )
        );
        const hasPVMonthField = this.accordionSections.some(sec =>
            sec.fields.some(f => f.apiName === 'price_variable_month')
        );
        return hasMaterialField && !hasPVMonthField;
    }

    /* ═══════════════ Core SUB-TYPE × QUANTITY multiselect widget (Path B) ═══════════════
       One field type: 'subtype_qty_grid'. Fully gated. Writes total_weight + total_quantity
       into the column's EXISTING slots, so unit_rate / cost / summary / line-item stay
       unchanged. Weight comes from CORE_SUBTYPE_DATA (blueprint ternary -> weightMap). */

    _sqgDataset() {
        const key = this._sqgIsFirm() ? 'FIRM' : 'PV';
        return (CORE_SUBTYPE_DATA && CORE_SUBTYPE_DATA[key]) || { weightMap: {}, typeToSubtypes: {} };
    }

    // self-locate this column's target slots from the widget's own c{N}_ prefix
    _sqgTargets(field) {
        const m = (field.apiName || '').match(/^(c\d+_)/);
        const pfx = m ? m[1] : '';
        return {
            controllingApi: field.controllingField || (pfx + 'material_list_type'),
            weightApi: pfx + 'total_weight_mt',
            qtyApi: pfx + (this._sqgIsFirm() ? 'quantity_mt' : 'quantity_pc')
        };
    }

    _sqgGetSelection(fieldApi) {
        // field.value is the source of truth (it survives _saveCurrentValues and
        // persists through save/reopen); _lastValues is the fallback
        const fld = this._sqgFindField(fieldApi);
        const raw = (fld && fld.value) ? fld.value : this._lastValues[fieldApi];
        if (!raw || typeof raw !== 'string') return [];
        try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch (e) { return []; }
    }
    _sqgSaveSelection(fieldApi, rows) {
        // Embed the per-unit weight (MT) on every row: the MATERIAL LIST table in
        // CoreOfferLetterController reads c{n}_subtype_qty as [{subtype, qty, wt}]
        // and prints WEIGHT/NOS (KG) + TOTAL WEIGHT (MT) from wt. Without it the
        // Apex fallback only covers single-subtype columns; multi-subtype columns
        // print blank weight cells. Deepanjan (24th July 2026)
        const _ds = this._sqgDataset();
        rows.forEach(r => { r.wt = Number(_ds.weightMap[r.subtype]) || 0; });
        const json = JSON.stringify(rows);
        this._lastValues[fieldApi] = json;
        this.accordionSections.forEach(sec => sec.fields.forEach(fl => {
            if (fl.apiName === fieldApi) { fl.value = json; fl.userCleared = false; }
        }));
    }

    // resolve a field's CURRENT value: live field object first (slow path writes
    // field.value immediately but _lastValues only syncs later), then _lastValues
    _sqgLiveVal(api) {
        if (this.accordionSections && this.accordionSections.length) {
            for (const sec of this.accordionSections) {
                const f = (sec.fields || []).find(x => x.apiName === api);
                if (f && f.value !== '' && f.value !== null && f.value !== undefined) return f.value;
            }
        }
        const lv = this._lastValues ? this._lastValues[api] : undefined;
        return (lv === undefined || lv === null) ? '' : lv;
    }

    // build the render model for one widget field (called from _updateFieldUI)
    // ---- mobile bottom-sheet open/close (phone layout only; the launcher
    //      button is display:none on desktop, so this never fires there) ----
    handleSqgSheetOpen(event) {
        const api = event.currentTarget.dataset.name;
        const field = this._sqgFindField(api);
        // readOnly no longer blocks OPENING: after Apply the launcher is the only
        // way to see the saved selection. Every control inside the sheet already
        // carries disabled={field.readOnly}, so in read-only it opens as a pure
        // view-only popup - nothing can be changed from it. Edit mode identical.
        // Reetabrata (24th July 2026)
        if (!field) return;
        field.sqgSheetOpen = true;
        this.accordionSections = [...this.accordionSections];
    }

    handleSqgSheetClose(event) {
        const api = event.currentTarget.dataset.name;
        const field = this._sqgFindField(api);
        if (!field) return;
        field.sqgSheetOpen = false;
        this.accordionSections = [...this.accordionSections];
    }

    _sqgEnrich(field) {
        const ds = this._sqgDataset();
        const t = this._sqgTargets(field);
        const selectedType = String(this._sqgLiveVal(t.controllingApi) || '');
        const available = ds.typeToSubtypes[selectedType] || [];

        // auto-drop stale subtypes when the material type changes (only if we know the list)
        let rows = this._sqgGetSelection(field.apiName);
        // Upgrade pass: rows saved before wt existed get it embedded the next time
        // the modal is opened in EDIT mode (save re-derives wt for every row), so a
        // reopen + Apply makes an old quote's MATERIAL LIST weights print too.
        // Deepanjan (24th July 2026)
        if (!field.readOnly && rows.length > 0 && rows.some(r => r.wt === undefined)) {
            this._sqgSaveSelection(field.apiName, rows);
        }
        // Guard: in read-only (post-Apply view) never rewrite the saved selection.
        // The auto-drop below would otherwise silently delete saved sub-types from
        // a quote nobody can edit. Edit mode unchanged (!readOnly is always true).
        // Reetabrata (24th July 2026)
        if (available.length > 0 && !field.readOnly) {
            const availSet = new Set(available);
            const filtered = rows.filter(r => availSet.has(r.subtype));
            if (filtered.length !== rows.length) { rows = filtered; this._sqgSaveSelection(field.apiName, rows); }
        }

        field.isDependentBlocked = !selectedType;
        const selSet = new Set(rows.map(r => r.subtype));
        field.subtypeOptions = available.map(sub => ({ label: sub, value: sub, checked: selSet.has(sub) }));
        field.selectedValues = rows.map(r => r.subtype);
        const prevRows = field.qtyRows || [];
        field.qtyRows = rows.map(r => {
            const w = Number(ds.weightMap[r.subtype]) || 0;
            const q = Number(r.qty) || 0;
            const existing = prevRows.find(p => p.subtype === r.subtype);
            if (existing) {
                existing.qty = r.qty; existing.unitWeight = w;
                existing.rowWeight = this._sqgRound(w * q, 5);
                return existing;
            }
            return { key: field.apiName + '::' + r.subtype, subtype: r.subtype, qty: r.qty,
                     unitWeight: w, rowWeight: this._sqgRound(w * q, 5) };
        });
        const totals = this._sqgTotals(field.apiName);
        field.totalWeight = totals.totalWeight;
        field.totalQuantity = totals.totalQuantity;

        // ---- mobile bottom-sheet props (used only by the phone layout) ----
        // sqgSheetOpen is user state; never reset it here, only default it once.
        if (field.sqgSheetOpen === undefined) field.sqgSheetOpen = false;
        const colM = String(field.apiName || '').match(/^c(\d+)_/);
        field.sqgSheetTitle = (colM ? 'Column ' + colM[1] : 'Sub-types') +
            (selectedType ? ' \u00B7 ' + selectedType : '');
        field.sqgLaunchLabel = rows.length === 0
            ? 'Select sub-types'
            : rows.length + ' selected \u00B7 Wt ' + (field.totalWeight || 0);
    }

    _sqgTotals(fieldApi) {
        const ds = this._sqgDataset();
        let tw = 0, tq = 0;
        this._sqgGetSelection(fieldApi).forEach(r => {
            const q = Number(r.qty) || 0;
            const w = Number(ds.weightMap[r.subtype]) || 0;
            tw += w * q; tq += q;
        });
        return { totalWeight: this._sqgRound(tw, 5), totalQuantity: this._sqgRound(tq, 5) };
    }

    // push totals into the existing weight + quantity fields (the whole trick)
    _sqgWriteTargets(field) {
        const t = this._sqgTargets(field);
        const totals = this._sqgTotals(field.apiName);
        this._lastValues[t.weightApi] = totals.totalWeight;
        this._lastValues[t.qtyApi] = totals.totalQuantity;
        this.accordionSections.forEach(sec => sec.fields.forEach(f => {
            if (f.apiName === t.weightApi) { f.value = totals.totalWeight; this._updateFieldUI(f); }
            if (f.apiName === t.qtyApi)    { f.value = totals.totalQuantity; this._updateFieldUI(f); }
        }));
    }

    _sqgFindField(fieldApi) {
        let out = null;
        this.accordionSections.some(sec => sec.fields.some(f => {
            if (f.apiName === fieldApi) { out = f; return true; } return false;
        }));
        return out;
    }

    _sqgRefresh(fieldApi) {
        const field = this._sqgFindField(fieldApi);
        if (!field) return;
        this._sqgEnrich(field);
        this._sqgWriteTargets(field);
        this.accordionSections = this.accordionSections.map(sec => {
            this._updateSectionUI(sec);
            return { ...sec, fields: [...sec.fields] };
        });
    }

    // ★ multiselect tick/untick (lightning-dual-listbox -> event.detail.value = array)
    handleSubtypeToggle(event) {
        const fieldApi = event.currentTarget.dataset.name;
        const selected = (event.detail && Array.isArray(event.detail.value)) ? event.detail.value : [];
        const prev = this._sqgGetSelection(fieldApi);
        const prevBySub = {};
        prev.forEach(r => { prevBySub[r.subtype] = r.qty; });
        const rows = selected.map(sub => ({ subtype: sub, qty: prevBySub[sub] != null ? prevBySub[sub] : null }));
        this._sqgSaveSelection(fieldApi, rows);
        this._sqgRefresh(fieldApi);
    }

    // ★ per-subtype quantity change
    handleSubtypeQtyChange(event) {
        const fieldApi = event.currentTarget.dataset.name;
        const subtype  = event.currentTarget.dataset.subtype;
        const val      = event.target.value;
        const rows = this._sqgGetSelection(fieldApi);
        const row = rows.find(r => r.subtype === subtype);
        if (row) row.qty = (val === '' ? null : Number(val));
        this._sqgSaveSelection(fieldApi, rows);

        // targeted update: mutate this widget's rows + totals in place,
        // write targets - do NOT rebuild sections (typing must not reset the UI)
        const field = this._sqgFindField(fieldApi);
        if (field) {
            const ds = this._sqgDataset();
            const qr = (field.qtyRows || []).find(p => p.subtype === subtype);
            if (qr) {
                qr.qty = row ? row.qty : null;
                qr.rowWeight = this._sqgRound((Number(ds.weightMap[subtype]) || 0) * (Number(qr.qty) || 0), 5);
            }
            const totals = this._sqgTotals(fieldApi);
            field.totalWeight = totals.totalWeight;
            field.totalQuantity = totals.totalQuantity;
            this._sqgWriteTargets(field);
            this.accordionSections = [...this.accordionSections];
        }
    }

    _sqgRound(n, dp = 3) {
        const f = Math.pow(10, dp);
        return Math.round((Number(n) || 0) * f) / f;
    }
 
    handleSectionToggle(event) {
        try {
            const sectionId = event.currentTarget.dataset.id;
            const idx = this.accordionSections.findIndex(s => s.id === sectionId);
            if (idx !== -1) {
                this.accordionSections[idx].isExpanded = !this.accordionSections[idx].isExpanded;
                this._updateSectionUI(this.accordionSections[idx]);
                this.accordionSections[idx] = { ...this.accordionSections[idx] };
                this.accordionSections = [...this.accordionSections];
            }
        } catch (e) {
            console.error('handleSectionToggle error:', e);
        }
    }
    handleSubSectionToggle(event) {
        try {
            const apiName = event.currentTarget.dataset.name;
            const sectionId = event.currentTarget.dataset.section;
 
            let clonedSections = JSON.parse(JSON.stringify(this.accordionSections));
            const sec = clonedSections.find(s => s.id === sectionId);
            
            if (sec) {
                const headerField = sec.fields.find(f => f.apiName === apiName);
                if (headerField) {
                    // 1. Toggle the header state
                    headerField.isSubSectionExpanded = !headerField.isSubSectionExpanded;
                    
                    // 2. Toggle the visual UI state for all nested children
                    sec.fields.forEach(child => {
                        if (child.parentSubSectionApi === apiName) {
                            child.isCollapsedUI = !headerField.isSubSectionExpanded;
                        }
                    });
 
                    // 3. Update the UI styles and refresh the HTML's array reference!
                    clonedSections.forEach(s => {
                        s.fields.forEach(f => this._updateFieldUI(f));
                        this._updateSectionUI(s); // 👉 CRITICAL FIX: Forces HTML to recognize the CSS changes
                    });
 
                    this.accordionSections = clonedSections;
                }
            }
        } catch (e) {
            console.error('handleSubSectionToggle error:', e);
        }
    }
 
    // =========================================================
    // 👉 PERFORMANCE: collect every api name that some OTHER field depends on
    // (controllingField / disableControllingField / column-repeater counts).
    // A plain number/text field NOT in this set can skip the whole re-render on
    // change and just store its value - Reetabrata (8th July)
    // =========================================================
    _buildStructuralApiSet() {
        try {
            const set = new Set();
            const addTokens = (raw) => {
                if (!raw) return;
                String(raw).split(',').forEach(t => {
                    let s = t.trim();
                    if (s.startsWith('!')) s = s.substring(1);
                    if (s) set.add(s);
                });
            };
            this.accordionSections.forEach(sec => {
                addTokens(sec.controllingField);
                sec.fields.forEach(f => {
                    addTokens(f.controllingField);
                    addTokens(f.disableControllingField);
                    if (f.columnCountApi) set.add(f.columnCountApi);
                    if (f.repeaterApi) set.add(f.repeaterApi);
                });
            });
            this._structuralApis = set;
        } catch (e) {
            console.error('_buildStructuralApiSet error:', e);
            this._structuralApis = new Set();
        }
    }
 
    handleFieldChange(event) {
        try {
            this._hmTyping = null;     // hmEstimator: what was being typed is committed now
            const fieldApiName = event.currentTarget.dataset.name;
            let newValue = this._extractValue(event);
 
            // ── Pre-fill OVR fields: when a segment's Override toggle is switched ON,
            //    copy the base Length/Thickness into the OVR fields so they aren't blank - Reetabrata (8th July 2026)
            if ((newValue === true || newValue === 'true') && fieldApiName) {
                const om = fieldApiName.match(/^(.*)lm_override_(mid\d+|bot\d+)$/);
                if (om) {
                    const pfx = om[1];   // grid prefix, e.g. 'r1_'
                    const seg = om[2];   // 'mid4' or 'bot9'
                    ['length', 'thickness'].forEach(attr => {
                        const baseApi = `${pfx}lm_${seg}_${attr}`;
                        const ovrApi  = `${pfx}lm_ovr_${seg}_${attr}`;
                        let baseVal = null;
                        this.accordionSections.some(sec => sec.fields.some(f => {
                            if (f.apiName === baseApi) { baseVal = f.value; return true; }
                            return false;
                        }));
                        if (baseVal !== null && baseVal !== '' && baseVal !== undefined) {
                            this.accordionSections.forEach(sec => sec.fields.forEach(f => {
                                if (f.apiName === ovrApi &&
                                    (f.value === '' || f.value === null || f.value === undefined)) {
                                    f.value = baseVal;
                                    f.userCleared = false;
                                    this._lastValues[ovrApi] = baseVal;
                                    this._updateFieldUI(f);
                                }
                            }));
                        }
                    });
                }
            }
            // for transmission tower consider line items only for current checked modal which is on the screen, if I first added value for 
            // for firm then moving to price variation then only price variation should be considered. firm value/line items should not be considered
            // and vice versa. so when we are changing price basis with gsm checked then this block marked it false before change so that never considered on evaluation
            if (fieldApiName === 'pvt_price_basics' || fieldApiName === 'pvs_price_model') {
                const staleCheckboxApis = fieldApiName === 'pvt_price_basics'
                    ? ['pvt_pv_610_gsm', 'pvt_pv_900_gsm', 'pvt_pv_1000_gsm',
                    'pvt_firm_610_gsm', 'pvt_firm_900_gsm', 'pvt_firm_1000_gsm']
                    : ['pvs_pv_610_gsm', 'pvs_pv_900_gsm', 'pvs_pv_1000_gsm',
                    'pvs_firm_610_gsm', 'pvs_firm_900_gsm', 'pvs_firm_1000_gsm'];

                staleCheckboxApis.forEach(api => {
                    this.accordionSections.forEach(sec => {
                        const f = sec.fields.find(x => x.apiName === api);
                        if (f && f.value === true) {
                            f.value = false;
                            f.userCleared = false;
                            this._updateFieldUI(f);
                        }
                    });
                    this._lastValues[api] = false;
                });
            }


            //Reetabrata (8th July 2026)
 
 
            // ── SEGMENT ABOVE 5 count guard + regen (gated) ───Reetabrata (7th July)───────
        // In the grid the field is r1_lm_no_of_segment, r2_..., so match by suffix.
        // Validate on a DEBOUNCE so typing "12" isn't rejected the instant "1" is seen. - Reetabrata (8th July)
if (this._modalConfig && this._modalConfig.dynamicSegments &&
    fieldApiName && fieldApiName.endsWith('lm_no_of_segment')) {
 
    const rawSeg = newValue;
    const segEl = event.target;
    const segApi = fieldApiName;
 
    clearTimeout(this._segCountTimer);
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    this._segCountTimer = setTimeout(() => {
        const check = validateSegmentCount(rawSeg);
 
        if (check.block) {                          // 1-5 rejected (only after the user pauses typing)
            this.dispatchEvent(new ShowToastEvent({
                title: 'Use the 5-Segment Estimator',
                message: check.message,
                variant: 'warning'
            }));
            if (segEl) segEl.value = '';
            this.accordionSections.forEach(sec => {
                const f = sec.fields.find(x => x.apiName === segApi);
                if (f) { f.value = ''; f.userCleared = true; this._updateFieldUI(f); }
            });
            this._lastValues[segApi] = '';
            if (this._hmTyping && this._hmTyping.name === segApi) this._hmTyping = null;   // [im] the typed "4" must not come back
            this.accordionSections.forEach(sec => this._evaluateFieldVisibility(sec.fields));
            this._evaluateSectionVisibility();
            this.accordionSections = [...this.accordionSections];
            try { this._calculateNow(); } catch (e) { /* the pass of the next change repairs it */ }   // [im] the host bag follows the clear
            this._imEmitSoon();
        } else if (check.value !== rawSeg && check.message) {  // capped at 15
            this.dispatchEvent(new ShowToastEvent({
                title: 'Maximum Limit Reached',
                message: check.message,
                variant: 'warning'
            }));
            if (segEl) segEl.value = check.value;
            this.accordionSections.forEach(sec => {
                const f = sec.fields.find(x => x.apiName === segApi);
                if (f) { f.value = check.value; this._updateFieldUI(f); }
            });
            this._lastValues[segApi] = check.value;
            this.accordionSections = [...this.accordionSections];
        }
    }, 900);
    // Let the typed value flow through normally below so the user can keep typing (1 -> 12).
    // NO manual regeneration - the matrix-accordion-repeater shows the
    // matching lm_segment_{N} section on its own, just like 1-5 does.
}
        // ───────────────────────Reetabrata (7th July)──────────────────────────────────
 
           /* let maxAllowedForThisField = null;
            this.accordionSections.forEach(sec => sec.fields.forEach(f => {
                if (f.repeaterApi === fieldApiName && f.repeaterMaxCols) {
                    maxAllowedForThisField = f.repeaterMaxCols;
                }
            }));
            if (maxAllowedForThisField && newValue > maxAllowedForThisField) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Maximum Limit Reached',
                    message: `You can only generate up to ${maxAllowedForThisField} segments here.`,
                    variant: 'warning'
                }));
                newValue = maxAllowedForThisField;
                event.target.value = newValue;
            }*/
 
            let wasUpdated = false;
 
            // ── PERFORMANCE: find the changed field WITHOUT cloning the whole modal ── Reetabrata (8th July)
            // The same apiName can exist in several sections (e.g. lm_mid2_length lives in every
            // lm_segment_N blueprint). Collect ALL matches and prefer a VISIBLE one, otherwise the
            // value would be written into a hidden section and lost on save. - Reetabrata (9th July 2026)
            const matchedFields = [];
            let changedField = null;
            for (const sec of this.accordionSections) {
                for (const x of sec.fields) {
                    if (x.apiName === fieldApiName) {
                        matchedFields.push(x);
                        if (changedField === null && sec.isVisible !== false && x.isVisible !== false) {
                            changedField = x;
                        }
                    }
                }
            }
            if (changedField === null && matchedFields.length) changedField = matchedFields[0];
            if (!changedField) return;
 
            const isDiscreteField = ['picklist', 'checkbox', 'toggle', 'date'].includes(changedField.type);
            // structural = something else depends on this field (a count / controller). Those still need a light refresh.
            const isStructural = this._structuralApis ? this._structuralApis.has(fieldApiName) : true;
 
            // ── FAST PATH: plain number / text ── just store the value; NO clone, NO render, NO spinner, NO math.
            // The typed value is already in the input box; the CALCULATE / APPLY button runs the math.
            if (!isDiscreteField && !isStructural) {
                // keep every duplicate in sync so the visible one always holds the value - Reetabrata (9th July 2026)
                matchedFields.forEach(mf => { mf.value = newValue; });
                changedField.value = newValue;
                // if the user emptied the field, treat it as cleared so the default doesn't repopulate - Reetabrata (8th July)
                changedField.userCleared = (newValue === '' || newValue === null || newValue === undefined);
                if (changedField.formula) {
                    changedField.isManualOverride = (newValue !== '' && newValue !== null);
                }
                this._lastValues[fieldApiName] = newValue;
                this._lastValues[`${fieldApiName}__cleared`] = changedField.userCleared;
                this._hmTouch(matchedFields);          // hmEstimator: required mark only after input
                this._hmSchedule(fieldApiName, false); // hmEstimator: the field was committed - recalculate (IM engine); no PV fetch, as before
                return;
            }
 
            // 🌟 1. DEEP CLONE FIX: Break the LWC Proxy lock
            // (deep clone removed - stringifying ~9000 fields froze the tab; mutate the real array in place) - Reetabrata (8th July)
            let clonedSections = this.accordionSections;
 
            clonedSections.forEach(sec => {
                const field = sec.fields.find(f => f.apiName === fieldApiName);
                if (field) {
                    field.value = newValue;
                    field.touched = true;                  // hmEstimator: required mark only after input
                    // if the user emptied the field, treat it as cleared so the default doesn't repopulate - Reetabrata (8th July)
                    field.userCleared = (newValue === '' || newValue === null || newValue === undefined);
                    if (field.formula) {
                        field.isManualOverride = (newValue !== '' && newValue !== null);
                    }
 
                    // UNIVERSAL DEPENDENT PICKLIST LOGIC
                    sec.fields.filter(f => f.dependentOptionsMap).forEach(dep => {
                        let ctrlNames = dep.controllingFields && Array.isArray(dep.controllingFields)
                            ? dep.controllingFields
                            : (dep.controllingField ? dep.controllingField.split(',').map(s => s.trim()) : []);
 
                        if (ctrlNames.length === 0) return;
                        if (!ctrlNames.some(ctrl => fieldApiName.endsWith(ctrl))) return;
                        if (dep.columnCountIndex && field.columnCountIndex && dep.columnCountIndex !== field.columnCountIndex) return;
 
                        let currentValues = ctrlNames.map(ctrlName => {
                            let ctrlField = sec.fields.find(x => x.apiName.endsWith(ctrlName) && x.columnCountIndex === dep.columnCountIndex);
                            return ctrlField && ctrlField.value ? String(ctrlField.value).trim() : '';
                        });
 
                        let hasBlank = currentValues.some(v => v === '');
                        let mapKey = currentValues.join('|');
 
                        if (hasBlank) {
                            dep.options = [];
                        } else if (dep.dependentOptionsMap[mapKey]) {
                            dep.options = dep.dependentOptionsMap[mapKey].map(opt => ({ label: opt, value: opt }));
                        } else {
                            dep.options = dep.masterOptions;
                        }
 
                        // THE UX FIX: Only clear the box if the old value is no longer valid!
                        let isValid = dep.options.some(opt => opt.value === dep.value);
                        if (!isValid) {
                            dep.value = '';
                        }
 
                        this._updateFieldUI(dep);
                    });
 
                    // Core subtype_qty_grid: re-enrich any widget in this section whose
                    // controlling field just changed (additive; no-op for other types)
                    sec.fields.filter(w => w.isSubtypeQtyGrid).forEach(w => this._updateFieldUI(w));
 
                    this._updateFieldUI(field);
                    this._updateSectionUI(sec);
                    wasUpdated = true;
                }
            });
 
            if (!wasUpdated) return;
 
            // 🌟 2. REASSIGN CLONED ARRAY TO TRIGGER UI RENDER
            // (shallow copy triggers re-render without the costly deep clone) - Reetabrata (8th July)
            this.accordionSections = [...clonedSections];

            // hmEstimator: a native input commits once - recalculate now, the IM way. The
            // spinner + timer block that follows is left as it was and is never reached.
            this._hmSchedule(fieldApiName, true);
            return;
 
            clearTimeout(this._typingTimer);
            this._typingTimer = setTimeout(() => {
                setTimeout(() => {
                    // ── PERFORMANCE: defer the heavy formula engine ── Reetabrata (8th July)
                    // Discrete/dependency fields (picklist / checkbox / toggle / date) auto-calculate.
                    // Number / text fields only refresh the cheap UI while typing; the heavy
                    // weight/price math waits for the CALCULATE (or APPLY) button.
                    // (isDiscreteField was already computed above, before the deep clone)
 
                    //check composition validation when composition value changed
                    const comAPI = TELECOM_COMPOSITION_APIS;
 
                    if (isDiscreteField) {
                        // dependency picklists / discrete fields → full recalculation now
                        // 👉 turn the spinner on, let it PAINT (rAF + setTimeout), THEN run the blocking calc - Reetabrata (8th July)
                        this.isLoading = true;
                        requestAnimationFrame(() => {
                            // eslint-disable-next-line @lwc/lwc/no-async-operation
                            setTimeout(() => {
                                try {
                                    this._calculateNow();
                                    if (comAPI.includes(fieldApiName)) {
                                        this._validateTelecomTowerComposition();
                                    }
                                } catch (mathError) {
                                    console.error('Math Engine Error:', mathError);
                                } finally {
                                    this.isLoading = false;
                                }
                                // Fetch PV data whenever month, year, or material type changes
                                this._checkAndFetchPriceVariation();
                            }, 0);
                        });
                    } else {
                        // number / text → cheap UI reactions only (heavy math waits for the button)
                        try {
                            this.accordionSections.forEach(sec => {
                                this._evaluateFieldVisibility(sec.fields);
                                this._evaluateDynamicDisable(sec.fields);
                            });
                            this._evaluateSectionVisibility();
                            this._evaluateDynamicColSpans();
                            ////evaluate section label after field change
                            this._evaluateSectionLabels();
 
                            this.accordionSections = this.accordionSections.map(sec => {
                                sec.fields.forEach(f => this._updateFieldUI(f));
                                this._updateSectionUI(sec);
                                return { ...sec };
                            });
 
                            if (comAPI.includes(fieldApiName)) {
                                this._validateTelecomTowerComposition();
                            }
                        } catch (mathError) {
                            console.error('Math Engine Error:', mathError);
                        }
                        // Fetch PV data whenever month, year, or material type changes
                        this._checkAndFetchPriceVariation();
                    }
                }, 50);
            }, 200);
        } catch (e) {
            console.error('handleFieldChange error:', e);
            this.isLoading = false;
        }
    }
 
    _extractValue(event) {
        if (event.target.type === 'checkbox' || event.target.type === 'toggle') {
            return event.target.checked;
        }
        let val = event.detail?.value ?? event.target?.value ?? '';
       // if (event.target.type === 'number' && val !== '') return Number(val);
        return val;
    }
 
    // =========================================================
    // DYNAMIC ALIGNMENT ENGINE 
    // =========================================================
    _evaluateDynamicColSpans() {
        const counts = {};
 
        this.accordionSections.forEach(sec => sec.fields.forEach(f => {
            if (f.value !== '' && f.value !== null && f.value !== undefined && !isNaN(f.value)) {
                counts[f.apiName] = Number(f.value);
            }
        }));
 
        this.accordionSections.forEach(sec => {
            sec.fields.forEach(f => {
                if (f.repeaterApi) {
                    let userCount = counts[f.repeaterApi] || 0;
                    const maxAllowed = f.repeaterMaxCols || 10;
 
                    if (userCount > maxAllowed) userCount = maxAllowed;
                    if (userCount < 1) userCount = 1;
 
                    let lblSpan = 12;
                    let inpSpan = 12;
 
                    if (userCount === 1) { lblSpan = 6; inpSpan = 6; }
                    else if (userCount === 2) { lblSpan = 4; inpSpan = 4; }
                    else if (userCount === 3) { lblSpan = 3; inpSpan = 3; }
                    else if (userCount === 4) { lblSpan = 4; inpSpan = 2; }
                    else if (userCount === 5) { lblSpan = 2; inpSpan = 2; }
                    else {
                        inpSpan = 1;
                        lblSpan = 12 - (userCount * inpSpan);
                        if (lblSpan < 1) lblSpan = 1;
                    }
 
                    if (f.isColRepeaterLabel) {
                        f.colSpan = lblSpan;
                    } else if (f.isColRepeaterInput) {
                        f.colSpan = inpSpan;
                    }
 
                    this._updateFieldUI(f);
                }
            });
        });
    }
 
    // =========================================================
    // 👉 NEW & SAFE: DYNAMIC DISABLE / READONLY ENGINE
    // =========================================================
    // ═══════════════════════════════════════════════════════════════════════
    // PERF - Deepanjan (4th September 2026)
    // _evaluateFieldVisibility and _evaluateDynamicDisable resolved every parent
    // with `fields.find(...)` and, on a miss, a `find` over EVERY section. In a
    // column-repeater modal (Octagonal / Custom Lighting Pole builds ~1,800
    // fields) that is a full linear scan per field - millions of property reads,
    // every one of them through the @track proxy. This builds one
    // apiName -> field index per call instead.
    //
    // Resolution order is IDENTICAL to the scans it replaces: first match inside
    // `fields`, otherwise first match walking this.accordionSections in order.
    // It hands back the SAME object references, so a value written to a parent
    // earlier in the same pass is read back exactly as before. The global index
    // is built lazily - only when a local miss actually happens.
    // ═══════════════════════════════════════════════════════════════════════
    _fieldResolver(fields) {
        const local = new Map();
        for (const f of fields) {
            if (!local.has(f.apiName)) local.set(f.apiName, f);
        }
        let global = null;
        return (apiName) => {
            const hit = local.get(apiName);
            if (hit) return hit;
            if (global === null) {
                global = new Map();
                for (const sec of this.accordionSections) {
                    for (const f of sec.fields) {
                        if (!global.has(f.apiName)) global.set(f.apiName, f);
                    }
                }
            }
            return global.get(apiName);
        };
    }

    _evaluateDynamicDisable(fields) {
        try {
            if (this.isReadOnly) {
                fields.forEach(field => {
                    field.readOnly = true;
                    field.baseReadOnly = true;
                    if (!this._imDeferFieldUI) this._updateFieldUI(field);
                });
                return;
            }
 
            const resolve = this._fieldResolver(fields); // PERF - Deepanjan (4th September 2026)
            fields.forEach(field => {
                if (!field.disableControllingField) {
                    field.readOnly = field.baseReadOnly;
                    if (!this._imDeferFieldUI) this._updateFieldUI(field);
                    return;
                }
 
                const parentApiNames = field.disableControllingField.includes(',')
                    ? field.disableControllingField.split(',').map(s => s.trim())
                    : [field.disableControllingField];
 
                let isEnabled = false;
 
                for (const rawApiName of parentApiNames) {
                    const isNegated = rawApiName.startsWith('!');
                    const apiName = isNegated ? rawApiName.substring(1) : rawApiName;
 
                    // same first-match order as the find() scans this replaces - Deepanjan (4th Sep 2026)
                    let parent = resolve(apiName);
 
                    if (parent) {
                        const parentHasValue = parent.type === 'checkbox'
                            ? parent.value === true
                            : parent.value !== '' && parent.value !== null && parent.value !== undefined;
 
                        if (isNegated && !parentHasValue) {
                            isEnabled = true;
                        }
                        // 👉 STRICT CHECK (Uses isEnabled)
                        else if (!isNegated && parentHasValue) {
                            const controllingValues = field.disableControllingValues || ['*'];
 
                            let rawParentValue = '';
                            if (parent.type === 'checkbox') {
                                rawParentValue = String(parent.value || false);
                            } else {
                                rawParentValue = (parent.value === null || parent.value === undefined) ? '' : String(parent.value);
                            }
 
                            const safeParentValue = rawParentValue.toLowerCase();
                            const safeControllingValues = controllingValues.map(v => String(v).toLowerCase());
 
                            const matchedNum = safeControllingValues.some(cv => {
                                if (cv.startsWith('>=')) {
                                    const threshold = Number(cv.substring(2));
                                    const val = Number(parent.value);
                                    return !isNaN(val) && val >= threshold;
                                }
                                return false;
                            });
 
                            const matched = safeControllingValues.includes('*')
                                ? parentHasValue
                                : (matchedNum || safeControllingValues.includes(safeParentValue));
 
                            if (matched) {
                                isEnabled = true; // 👉 Correct variable used here!
                                break;
                            }
                        }
                    }
                }
 
                field.readOnly = field.baseReadOnly || !isEnabled;
                if (!this._imDeferFieldUI) this._updateFieldUI(field);
            });
        } catch (e) {
            console.error('_evaluateDynamicDisable error:', e);
        }
    }
 
    // =========================================================
    // ★ CHANGE 2 of 5 — BUG 1 (KIT picklist options empty on first open) ★
    // Reetabrata (14th July 2026)  — NEW METHOD (purely additive)
    // DEPENDENT PICKLIST RE-RESOLUTION
    // The onload "WAKE UP" block runs before _evaluateAllFormulas(), so formula-driven
    // controlling fields (e.g. no_of_segment_select = Number(r1_lm_no_of_segment)||...)
    // are still empty when KIT picklists (CABLE TYPE / TYPE OF WINCH / TYPE OF POWER
    // TOOL) try to resolve their options -> options come up empty until Apply+reopen.
    // This pass re-runs the SAME resolution logic AFTER formulas are computed, so the
    // controlling values are present. It is idempotent and only fills options; it never
    // clears a user's chosen value.
    // =========================================================
    _resolveDependentOptionsOnLoad() { // Reetabrata (14th July 2026)
        this.accordionSections.forEach(sec => {
            sec.fields.filter(f => f.dependentOptionsMap).forEach(dep => {
                let ctrlNames = [];
                if (Array.isArray(dep.controllingFields)) ctrlNames = dep.controllingFields;
                else if (Array.isArray(dep.controllingField)) ctrlNames = dep.controllingField;
                else if (typeof dep.controllingFields === 'string') ctrlNames = dep.controllingFields.split(',').map(s => s.trim());
                else if (typeof dep.controllingField === 'string') ctrlNames = dep.controllingField.split(',').map(s => s.trim());

                if (ctrlNames.length === 0) return;

                let currentValues = ctrlNames.map(ctrlName => {
                    let ctrlField = sec.fields.find(x => x.apiName.endsWith(ctrlName) && x.columnCountIndex === dep.columnCountIndex);
                    return ctrlField && ctrlField.value ? String(ctrlField.value).trim() : '';
                });

                let possibleKeys = [];
                let tempVals = [];
                for (let val of currentValues) {
                    if (val !== '') {
                        tempVals.push(val);
                        possibleKeys.unshift(tempVals.join('|'));
                    } else {
                        break;
                    }
                }

                let matchedKey = possibleKeys.find(key => dep.dependentOptionsMap[key]);
                let fullyFilled = currentValues.every(v => v !== '');

                if (!dep.masterOptions) dep.masterOptions = dep.options ? [...dep.options] : [];

                if (matchedKey) {
                    let mapVal = dep.dependentOptionsMap[matchedKey];
                    if (mapVal.length > 0 && typeof mapVal[0] === 'string') {
                        dep.options = mapVal.map(opt => ({ label: opt, value: opt }));
                    } else {
                        dep.options = mapVal;
                    }
                } else if (fullyFilled) {
                    dep.options = dep.masterOptions;
                } else {
                    dep.options = [];
                }
            });
        });
    }
 
    // =========================================================
    // VISIBILITY ENGINES 
    // =========================================================
    _evaluateSectionVisibility() {
        try {
            const allFieldValues = {};
            this.accordionSections.forEach(sec => {
                sec.fields.forEach(f => { allFieldValues[f.apiName] = f.value; });
            });
 
            this.accordionSections.forEach(sec => {
                // isVisible:false (-> forceHidden) means "never draw this section in the UI".
                // It must NOT mean "ignore controllingField": a forceHidden section still has to
                // know whether it applies, otherwise every variant of a mutually-exclusive group
                // (e.g. the 12 PV/FIRM price models) looks active at once and each emits a line.
                // So we always evaluate controllingField into sec.isApplicable below, and only
                // then force the UI flag off. Reetabrata (15th July 2026)
                if (!sec.controllingField) {
                    sec.isApplicable = true;
                    sec.isVisible = !sec.forceHidden;
                    return;
                }
 
                const parentApiNames = sec.controllingField.includes(',')
                    ? sec.controllingField.split(',').map(s => s.trim())
                    : [sec.controllingField];
 
                let isVisible = false;
 
                // Adding context to handle evaluation based on controlling operator - rajeev 17-05-2026
                const operator = sec.controllingOperator || 'OR';
                let matchCount = 0;
 
                for (const apiName of parentApiNames) {
                    const parentValue = allFieldValues[apiName];
                    const parentIsEmpty = parentValue === '' || parentValue === null ||
                        parentValue === undefined || parentValue === false;
 
                    if (!parentIsEmpty) {
                        const normalized = typeof parentValue === 'boolean' ? String(parentValue) : String(parentValue);
                        const controllingValues = sec.controllingValues || [];
                        const safeControllingValues = controllingValues.map(String);
 
                        const matchedNum = safeControllingValues.some(cv => {
                            if (cv.startsWith('>=')) {
                                const threshold = Number(cv.substring(2));
                                const val = Number(parentValue);
                                return !isNaN(val) && val >= threshold;
                            }
                            return false;
                        });
 
                        if (matchedNum || safeControllingValues.includes('*') || safeControllingValues.includes(normalized)) {
                            //isVisible = true;
                            //break;
 
                            matchCount++;
                            if (operator === 'OR') {
                                isVisible = true;
                                break;    // OR: first match is enough, stop immediately
                            }
                        }
                    }
                }
 
                // AND: every field in the list must have matched
                if (operator === 'AND') {
                    isVisible = matchCount === parentApiNames.length;
                }
 
                // Reetabrata (15th July 2026): isApplicable = the controllingField verdict.
                // isVisible = that verdict AND the section is allowed on screen.
                sec.isApplicable = isVisible;
                sec.isVisible = isVisible && !sec.forceHidden;
            });
        } catch (e) {
            console.error('_evaluateSectionVisibility error:', e);
        }
    }
 
    _evaluateFieldVisibility(fields) {
        try {
            const resolve = this._fieldResolver(fields); // PERF - Deepanjan (4th September 2026)
            fields.forEach(field => {
                // 👉 isVisible:false on a sub-section hard-hides its header + children - Reetabrata (8th July 2026)
                if (field.forceHidden) { field.isVisible = false; return; }
                if (field.columnCountApi) {
                    // same first-match order as the find() scans this replaces - Deepanjan (4th Sep 2026)
                    let countParent = resolve(field.columnCountApi);
                    const currentCount = countParent ? (Number(countParent.value) || 0) : 0;
                    if (currentCount < field.columnCountIndex) {
                        field.isVisible = false;
                        if (!field.formula) field.value = (!field.userCleared && field.defaultValue !== '' && field.defaultValue != null) ? field.defaultValue : (field.type === 'checkbox' ? false : '');
                        return;
                    }
                }
 
                if (!field.controllingField) {
                    field.isVisible = true;
                    this._restoreDefaultIfEmpty(field);
                    return;
                }
 
                const parentApiNames = field.controllingField.includes(',')
                    ? field.controllingField.split(',').map(s => s.trim())
                    : [field.controllingField];
 
                let isVisible = false;
                let forceHide = false;
 
                for (const rawApiName of parentApiNames) {
                    const isNegated = rawApiName.startsWith('!');
                    const apiName = isNegated ? rawApiName.substring(1) : rawApiName;
 
                    // same first-match order as the find() scans this replaces - Deepanjan (4th Sep 2026)
                    let parent = resolve(apiName);
 
                    if (parent) {
                        const parentHasValue = parent.type === 'checkbox'
                            ? parent.value === true
                            : parent.value !== '' && parent.value !== null && parent.value !== undefined;
 
                        if (isNegated && parentHasValue) {
                            forceHide = true;
                        }
                        // 👉 THE VISIBILITY BYPASS FOR SPACERS (Uses isVisible)
                        else if (!isNegated && (parentHasValue || field.type === 'header')) {
                            const controllingValues = field.controllingValues || ['*'];
 
                            let rawParentValue = '';
                            if (parent.type === 'checkbox') {
                                rawParentValue = String(parent.value || false);
                            } else {
                                rawParentValue = (parent.value === null || parent.value === undefined) ? '' : String(parent.value);
                            }
 
                            const safeParentValue = rawParentValue.toLowerCase();
                            const safeControllingValues = controllingValues.map(v => String(v).toLowerCase());
 
                            const matchedNum = safeControllingValues.some(cv => {
                                if (cv.startsWith('>=')) {
                                    const threshold = Number(cv.substring(2));
                                    const val = Number(parent.value);
                                    return !isNaN(val) && val >= threshold;
                                }
                                return false;
                            });
 
                            const matched = safeControllingValues.includes('*')
                                ? parentHasValue
                                : (matchedNum || safeControllingValues.includes(safeParentValue));
 
                            if (matched) {
                                isVisible = true; // 👉 Correct variable used here!
                            }
                        }
                    }
                }
 
                field.isVisible = forceHide ? false : isVisible;
 
                if (!field.isVisible) {
                    // CROSS PRODUCT — Deepanjan (10th September 2026)
                    const __saved = this._lastValues[field.apiName];
                    const __hasSaved = __saved !== undefined && __saved !== null && __saved !== '';
                    if (!field.formula && !__hasSaved) {
                        field.value = (!field.userCleared && field.defaultValue !== '' && field.defaultValue !== null && field.defaultValue !== undefined)
                            ? field.defaultValue
                            : (field.type === 'checkbox' ? false : '');
                    }
                } else {
                    this._restoreDefaultIfEmpty(field);
                }
            });
        } catch (e) {
            console.error('_evaluateFieldVisibility error:', e);
        }
    }
 
    _restoreDefaultIfEmpty(field) {
        if (!field.userCleared &&
            (field.value === '' || field.value === null || field.value === undefined) &&
            (field.defaultValue !== '' && field.defaultValue !== null && field.defaultValue !== undefined)) {
            field.value = field.defaultValue;
        }
    }
 
    // =========================================================
    // THE GLOBAL MATH ENGINE
    // =========================================================
    _evaluateAllFormulas() {
        try {
            const rawMap = {};
            const valMap = {};
            const allFields = [];
 
            // PERF: these debug logs stringified the entire modal (~9000 fields) and froze the tab - disabled - Reetabrata (8th July)
            // _hmLog('acc ', JSON.stringify(this.accordionSections, null, 2));
            // _hmLog(
            //     'last values',
            //     JSON.stringify(this._lastValues, null, 2)
            // );
 
            this.accordionSections.forEach(sec => {
                // before returning for not visible section pre-register fields for default value.
                // commented visibility thing to check in transmission tower - rajeev 14 july 3pm

                //if (!sec.isVisible) {
                    //return;
                //}
 
                sec.fields.forEach(f => {
                    allFields.push(f);
                    let val = f.value;
 
 
                    rawMap[f.apiName] = (val !== null && val !== undefined) ? val : '';
                    const numVal = Number(val);
                    if (val === '' || val === null || val === undefined) {
                        valMap[f.apiName] = 0;
                    } else if (!isNaN(numVal)) {
                        valMap[f.apiName] = numVal;
                    } else {
                        // 👉 CRITICAL FIX: Wraps text strings in quotes so the math engine can read them!
                        valMap[f.apiName] = `'${val}'`;
                    }
                });
            });
 
            // =========================================================
            // 👉 THE BRIDGE: Inject saved values from OTHER folders!
            // =========================================================
            if (this._lastValues) {
                Object.keys(this._lastValues).forEach(key => {
                    // Only add it if it's not already in the dictionary (current modal values take priority)
                    if (valMap[key] === undefined) {
                        let savedVal = this._lastValues[key];
 
                        // 👉 ADD THIS: Extract prefix from picklist values before adding to valMap
                        if (typeof savedVal === 'string' && savedVal.includes('=')) {
                            const prefix = savedVal.split('=')[0].trim();
                            const numPrefix = Number(prefix);
                            savedVal = isNaN(numPrefix) ? prefix : numPrefix;
                        }
 
                        rawMap[key] = (savedVal !== null && savedVal !== undefined) ? savedVal : '';
                        const numSavedVal = Number(savedVal);
 
                        if (savedVal === '' || savedVal === null || savedVal === undefined || savedVal === false) {
                            valMap[key] = 0;
                        } else if (savedVal === true) {
                            valMap[key] = 'true'; // Keep booleans as strings for JS eval
                        } else if (!isNaN(numSavedVal)) {
                            valMap[key] = numSavedVal;
                        } else {
                            valMap[key] = `'${String(savedVal).replace(/'/g, "\\'")}'`; // Escape quotes safely
                        }
                    }
                });
            }
 
            // PERF: disabled - stringified large map every pass - Reetabrata (8th July)
            // _hmLog(
            //     '***line 1122 valMap',
            //     JSON.stringify(valMap, null, 2)
            // );
 
            // PERF: disabled - stringified large map every pass - Reetabrata (8th July)
            // _hmLog(
            //     'rawMap',
            //     JSON.stringify(rawMap, null, 2)
            // );
            // 👉 3. ADD THIS BLOCK: Inject Database Rates into the Math Engine!
            if (this.baseRates) {
                Object.keys(this.baseRates).forEach(key => {
                    valMap[key] = Number(this.baseRates[key]) || 0;
                });
            }
 
            // PERF: key sets are stable for the whole call (every field is pre-registered
            // above and the passes only overwrite existing keys, never add new ones), so
            // build them ONCE instead of per-field-per-pass. - Reetabrata (9th July 2026)
            const rawKeySet   = new Set(Object.keys(rawMap));
            const valKeySet   = new Set(Object.keys(valMap));
            // Keys that are not plain identifiers can't be found by the token scan;
            // they keep the original RegExp probe. In practice this list is empty.
            const oddRawKeys  = Object.keys(rawMap).filter(k => !_IDENT_RE.test(k));
            const oddValKeys  = Object.keys(valMap).filter(k => !_IDENT_RE.test(k));
            const tokenCache  = new Map();   // formula string -> its identifier tokens
            const hmParentCache = new Map(); // hmEstimator: field -> parentApiNames (rawKeySet is fixed for the whole call)
            const hmFxMemo = new Map();      // hmEstimator: field -> compiled formula for this call (key set is fixed for the whole call)
 
            for (let pass = 0; pass < 3; pass++) {
                allFields.forEach(field => {
 
                    if (!field.formula || (field.isManualOverride && field.type !== 'header')) return;
 
                    // PERF: identical result to `Object.keys(rawMap).filter(k => \bk\b matches formula)`,
                    // computed by scanning the formula once instead of compiling one RegExp per key.
                    // - Reetabrata (9th July 2026)
                    let _fTokens = tokenCache.get(field.formula);
                    if (!_fTokens) {
                        _fTokens = field.formula.match(_TOKEN_RE) || [];
                        tokenCache.set(field.formula, _fTokens);
                    }
                    let parentApiNames = hmParentCache.get(field);     // hmEstimator: same list on every pass of this call
                    if (!parentApiNames) {
                    parentApiNames = [];
                    const _seenParent = new Set();
                    for (const _t of _fTokens) {
                        if (_t === field.apiName || _seenParent.has(_t) || !rawKeySet.has(_t)) continue;
                        _seenParent.add(_t);
                        parentApiNames.push(_t);
                    }
                    for (const _k of oddRawKeys) {
                        if (_k !== field.apiName && !_seenParent.has(_k) && _reFor(_k).probe.test(field.formula)) {
                            _seenParent.add(_k);
                            parentApiNames.push(_k);
                        }
                    }
                    hmParentCache.set(field, parentApiNames);
                    }
 
                    let newResult = '';
 
                    const anyParentHasValue = parentApiNames.some(key => {
                        const raw = rawMap[key];
                        return raw !== '' && raw !== null && raw !== undefined && String(raw).trim() !== '';
                    });
 
                    if (!anyParentHasValue && parentApiNames.length > 0) {
                        newResult = (field.defaultValue !== undefined && field.defaultValue !== null) ? field.defaultValue : '';
                    } else {
                        try {
                            const rowMatch = field.apiName.match(/^(r\d+)_/);
                            const rowPrefix = rowMatch ? rowMatch[1] : null;
 
                            let expr = field.formula;

                            // hmEstimator: compiled formula (IM engine) - null means "not
                            // compilable with identical semantics", and the original text
                            // substitution below runs exactly as before
                            const hmFx = _hmFastFormula(field, rowPrefix, rawMap, valMap, valKeySet, oddValKeys, hmFxMemo);
                            if (hmFx === null) {
 
                            if (rowPrefix) {
 
                                // Extract all NON-prefixed variables from formula
                                const tokens = expr.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
 
                                tokens.forEach(token => {
 
                                    // Skip JS keywords / Math / numbers
                                    if (['Math', 'true', 'false'].includes(token)) return;
 
                                    // Skip already prefixed variables (r1_, r2_, etc.)
                                    if (/^r\d+_/.test(token)) return;
 
                                    const dynamicKey = rowPrefix + '_' + token;
 
                                    // Replace ONLY if such key exists
                                    if (valMap.hasOwnProperty(dynamicKey)) {
                                        // PERF: cached regex instead of a fresh compile per token. - Reetabrata (9th July 2026)
                                        expr = expr.replace(_reFor(token).word, dynamicKey);
                                    }
                                });
                            }
 
                            // PERF: the old code swept EVERY valMap key (thousands) and compiled two
                            // RegExps for each. Keys absent from `expr` can only ever produce a no-op
                            // replace, so scan `expr` once and substitute only the keys present, still
                            // in descending-length order. Same substitutions, same order, same result.
                            // - Reetabrata (9th July 2026)
                            const _exprTokens = expr.match(_TOKEN_RE) || [];
                            const _present = [];
                            const _seenSub = new Set();
                            for (const _t of _exprTokens) {
                                if (_seenSub.has(_t) || !valKeySet.has(_t)) continue;
                                _seenSub.add(_t);
                                _present.push(_t);
                            }
                            for (const _k of oddValKeys) {
                                if (!_seenSub.has(_k)) { _seenSub.add(_k); _present.push(_k); }
                            }
                            _present.sort((a, b) => b.length - a.length);
                            const _exprBefore = expr;
                            for (const key of _present) {
                                const _re = _reFor(key);
                                // If this key is used with a dot method like .startsWith(), wrap as string
                                if (_re.dot.test(expr)) {
                                    expr = expr.replace(_re.word, `'${rawMap[key]}'`);
                                } else {
                                    expr = expr.replace(_re.word, valMap[key]);
                                }
                            }
 
                            // CORRECTNESS GUARD: a text-valued key substitutes a quoted string
                            // (valMap[k] = `'<text>'`). If that text happens to contain another
                            // apiName as a whole word, the ORIGINAL full sweep would have gone on
                            // to substitute it, while the token scan above would not. That should
                            // never happen with real data, but if it does we replay the original
                            // algorithm verbatim so the result is guaranteed identical.
                            // - Reetabrata (9th July 2026)
                            let _leaked = false;
                            const _after = expr.match(_TOKEN_RE) || [];
                            for (const _t of _after) {
                                if (valKeySet.has(_t)) { _leaked = true; break; }
                            }
                            if (_leaked) {
                                expr = _exprBefore;
                                Object.keys(valMap)
                                    .sort((a, b) => b.length - a.length)
                                    .forEach(key => {
                                        const _re = _reFor(key);
                                        if (_re.dot.test(expr)) {
                                            expr = expr.replace(_re.word, `'${rawMap[key]}'`);
                                        } else {
                                            expr = expr.replace(_re.word, valMap[key]);
                                        }
                                    });
                            }
                            }   // hmEstimator: end of the original text substitution
 
                            // 🟢 --- START OF DEBUG LOGS --- 🟢
                            // _hmLog(`\n========== EVALUATING: ${field.apiName} (Pass ${pass + 1}) ==========`); // PERF disabled - Reetabrata (8th July)
                            _hmLog(`📝 Original Formula: \n${field.formula}`);
                            _hmLog(`⚙️ Expression to Evaluate: \n${expr}`);
 
                            // 👉 Includes the 'Math' fix so Math.pow() works!
                            // PERF: cached compile, identical semantics. - Reetabrata (9th July 2026)
                            const result = hmFx !== null ? hmFx.fn(Math, ...hmFx.args) : _fnFor(expr)(Math);   // hmEstimator
 
                             _hmLog(`✅ Evaluated Result: ${result}`);
                            // 🟢 --- END OF DEBUG LOGS --- 🟢
 
                            if (typeof result === 'string' || typeof result === 'boolean') {
                                newResult = result;
                            } else if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                                newResult = Math.round(result * 1000) / 1000;
                            } else {
                                newResult = '';
                            }
                        } catch (e) {
                            // 🔴 Log exact syntax errors if the formula breaks!
                            console.error(`❌ Math Engine Error on ${field.apiName}:`, e.message);
                            console.error(`⚠️ Failed Expression: \n${field.formula}`); // Helps see what broke
                            newResult = '';
                        }
                    }
 
                    if (field.value !== newResult) {
                        field.value = newResult;
                        rawMap[field.apiName] = newResult;
                        const numVal = Number(newResult);
                        valMap[field.apiName] = !isNaN(numVal) ? numVal : 0;
                    }
                });
            }
            this._calculateGridTotals();
 
        } catch (err) {
            console.error('Global Math Engine Error:', err);
        }
    }
 
    // =========================================================
    //  DICTIONARY LOOKUP ENGINE (Backwards Compatible!) //Abhishek saxena
    // =========================================================
   // =========================================================
    //  DICTIONARY LOOKUP ENGINE
    // =========================================================
    // =========================================================
    //  DICTIONARY LOOKUP ENGINE (Global Scope Fix)
    // =========================================================
    _evaluateLookups() {
        // 👉 THE ULTIMATE FIX: A global search helper that finds values anywhere in the modal or saved history
        const getSafeValue = (searchName, colIndex) => {
            if (!searchName) return '';
            
            // Allows matching exact names, or repeater prefixes (like c1_uom)
            const isMatch = (api) => api === searchName || api.endsWith(`_${searchName}`) || api.endsWith(searchName);
 
            _hmLog('isMatch function created for searchName:', isMatch.toString());
            _hmLog(`🔍 Searching for "${searchName}" in column index ${colIndex}...`);
 
            // 1. Search all active accordion sections globally
            for (const section of this.accordionSections) {
                let field = section.fields.find(x => isMatch(x.apiName) && (x.columnCountIndex === colIndex || !x.columnCountIndex));
                if (field && field.value !== '' && field.value !== null && field.value !== undefined) {
                    return String(field.value).trim();
                }
            }
            
            // 2. Fallback to _lastValues (for values saved in other separate modals/folders!)
            const savedKey = Object.keys(this._lastValues).find(key => isMatch(key));
            if (savedKey) {
                let saved = this._lastValues[savedKey];
                if (saved !== '' && saved !== null && saved !== undefined) {
                    return String(saved).trim();
                }
            }
            
            return '';
        };
 
        this.accordionSections.forEach(sec => {
            sec.fields.forEach(field => {
 
                if (field.weightMap || field.lookupWeight === true) {
 
                    let ctrlNames = Array.isArray(field.controllingFields)
                        ? field.controllingFields
                        : (field.controllingField ? field.controllingField.split(',').map(s => s.trim()) : []);
 
                        _hmLog('🎯 DEBUG: Controlling Fields for', field.apiName, 'are:', JSON.stringify(ctrlNames));
                    if (ctrlNames.length === 0) return;
 
                    // 👉 Fetch current values using the new global search
                    let currentValues = ctrlNames.map(ctrlName => getSafeValue(ctrlName, field.columnCountIndex));
                    _hmLog('🎯 DEBUG: Current Values for', field.apiName, 'are:', JSON.stringify(currentValues));
                    let engineeringValues = currentValues.slice(0, 4);
                    _hmLog('🎯 DEBUG: Engineering Values for', field.apiName, 'are:', JSON.stringify(engineeringValues));
 
                    if (engineeringValues.some(v => v === '')) {
                        field.value = 0;
                    } else {
                        let mapKey = engineeringValues.join('|');
 
                        _hmLog('🎯 DEBUG: Mapped Key Created is:', JSON.stringify(mapKey));
                        _hmLog('📋 DEBUG: Available weightMap is:', JSON.stringify(field.weightMap));
                        let foundWeight = field.weightMap ? (field.weightMap[mapKey] || 0) : 0;
 
                        let multVal = 0;
                        if (field.multiplyBy) {
                            let mVal = getSafeValue(field.multiplyBy, field.columnCountIndex);
                            multVal = mVal !== '' ? Number(mVal) : 0;
                        } else if (field.baseRatesMap) {
                            // 👉 Fetch specs globally
                            let steelTypeVal = getSafeValue('steel_type', field.columnCountIndex);
                            let desigVal = getSafeValue('designation', field.columnCountIndex);
 
                            let shapeVal = currentValues[1] || '';
                            let classVal = currentValues[2] || '';
                            let sizeVal = currentValues[3] || '';
 
                            let rateValues = [steelTypeVal, desigVal, shapeVal, classVal, sizeVal];
                            let searchKeys = [
                                    rateValues.join('|'),             
                                    rateValues.slice(0, 4).join('|'), 
                                    rateValues.slice(0, 3).join('|'), 
                                    rateValues.slice(0, 2).join('|'), 
                                    rateValues[0]                     
                                ];
 
                            for (let sk of searchKeys) {
                                if (this.baseRates && this.baseRates[sk] !== undefined) {
                                    multVal = this.baseRates[sk];
                                    break;
                                } else if (field.baseRatesMap && field.baseRatesMap[sk] !== undefined) {
                                    multVal = field.baseRatesMap[sk];
                                    break;
                                }
                            }
                        }
 
                        if (field.extraChargesMap) {
                            let endFinishVal = getSafeValue('end_finish', field.columnCountIndex);
                            if (endFinishVal && field.extraChargesMap[endFinishVal]) {
                                multVal += field.extraChargesMap[endFinishVal];
                            }
                        }
 
                        let uomVal = getSafeValue('uom', field.columnCountIndex);
 
                        if (field.multiplyBy || field.baseRatesMap) {
 
                            if (uomVal === '') {
                                field.value = '';
                                if (field.calculateSecretWeight) field.secretWeight = 0;
                            } else {
                                if (!uomVal) uomVal = 'Meters';
 
                                let finalRate = 0;
                                if (uomVal === 'MT') {
                                    finalRate = multVal * 1000;
                                } else if (uomVal === 'Pieces') {
                                    finalRate = foundWeight * 6 * multVal;
                                } else {
                                    finalRate = foundWeight * multVal;
                                }
 
                                field.value = Math.round(finalRate * 1000) / 1000;
 
                                if (field.calculateSecretWeight) {
                                    let qtyVal = getSafeValue('quantity', field.columnCountIndex);
                                    qtyVal = qtyVal !== '' ? Number(qtyVal) : 0;
 
                                    let totalKg = 0;
                                    if (uomVal === 'MT') {
                                        totalKg = qtyVal * 1000;
                                    } else if (uomVal === 'Pieces') {
                                        totalKg = foundWeight * 6 * qtyVal;
                                    } else {
                                        totalKg = foundWeight * qtyVal;
                                    }
                                    field.secretWeight = Math.round(totalKg * 1000) / 1000;
                                }
                            }
 
                        } else {
                            field.value = foundWeight;
                        }
                    }
                    this._updateFieldUI(field);
                }
            });
        });
    }
    //End
 
    handleClearField(event) {
        try {
            const fieldApiName = event.currentTarget.dataset.name;
 
            this.accordionSections.forEach(sec => {
                const field = sec.fields.find(f => f.apiName === fieldApiName);
                if (field) {
                    field.value = field.type === 'checkbox' ? false : '';
                    field.userCleared = true;
                    field.isManualOverride = false;
                    field.touched = true;                  // hmEstimator
                    this._updateFieldUI(field);
                    this._updateSectionUI(sec);
                }
            });
 
            this._lastValues[fieldApiName] = '';
            this._lastValues[`${fieldApiName}__cleared`] = true;
            this._lastValues[`${fieldApiName}__manual`] = false;
 
            this.accordionSections = [...this.accordionSections];
            this.accordionSections.forEach(sec => {
                this._evaluateFieldVisibility(sec.fields);
                this._evaluateDynamicDisable(sec.fields); // 👉 SAFELY INJECTED HERE
            });
            this._evaluateSectionVisibility();
            this._evaluateAllFormulas();
            
            //evaluate section label after clear
            this._evaluateSectionLabels();
 
            this._evaluateDynamicColSpans();

            this.accordionSections = this.accordionSections.map(sec => {
                sec.fields.forEach(f => this._updateFieldUI(f));
                this._updateSectionUI(sec);
                return { ...sec };
            });
            this._imEmitSoon();                    // [im] live apply after a clear

        } catch (e) {
            console.error('handleClearField error:', e);
        }
    }
 
    // =========================================================
    // 👉 THE FIX: VISIBLE FIELDS ALWAYS WIN
    // =========================================================
    _saveCurrentValues() {
        try {
            // 1. Set a default empty state for everything
            this.accordionSections.forEach(sec => {
                sec.fields.forEach(f => {
                    if (this._lastValues[f.apiName] === undefined) {
                        this._lastValues[f.apiName] = f.type === 'checkbox' ? false : '';
                    }
                });
            });
 
            this.accordionSections.forEach(sec => {
                sec.fields.forEach(f => {
                    if (f.type === 'hidden' && f.value !== undefined && f.value !== null && f.value !== '') {
                        this._lastValues[f.apiName] = f.value;
                    }
                });
            });
 
            // 2. Let the VISIBLE sections overwrite the empty state
            this.accordionSections.forEach(sec => {
                if (sec.isVisible) {
                    sec.fields.forEach(f => {
                        if (f.isVisible) {
                            this._lastValues[f.apiName] = f.value;
                            this._lastValues[`${f.apiName}__cleared`] = f.userCleared === true;
                            this._lastValues[`${f.apiName}__manual`] = f.isManualOverride === true;
                        }
                    });
                }
            });
        } catch (e) {
            console.error('_saveCurrentValues error:', e);
        }
    }
 
    // =========================================================
    // 👉 ON-DEMAND CALCULATION (CALCULATE / APPLY) - Reetabrata (8th July)
    // Runs the full heavy pipeline ONCE instead of on every keystroke.
    // =========================================================
    _calculateNow() {
        this._imConverged = null;
        try {
            // [im] PERF: the disable pass below re-renders every field (_updateFieldUI), and the
            // map at the end of this method re-renders every field again after the math. Only the
            // second one is ever seen, so in IM the first is deferred to it (values are untouched).
            this._imDeferFieldUI = !!this.inline;
            try {
                this.accordionSections.forEach(sec => {
                    this._evaluateFieldVisibility(sec.fields);
                    this._evaluateDynamicDisable(sec.fields);
                });
            } finally { this._imDeferFieldUI = false; }
 
            // moving evaluate look first - so it first fetch values from map then formula evaluation happans - rajeev 02-07-2026
            this._evaluateLookups();
            this._evaluateAllFormulas();
            this._evaluateSectionVisibility();
            // [im] PERF: remember whether the last formula pass left every value as it was - the
            // state is then a fixed point of the formulas and the live emit need not recompute it
            const imSig = this.inline ? this._imValueSig() : null;
            this._evaluateAllFormulas();
            if (imSig !== null && this._imValueSig() === imSig) this._imConverged = imSig;
            this._evaluateDynamicColSpans();
            ////evaluate section label after field change
            this._evaluateSectionLabels();
 
            this.accordionSections = this.accordionSections.map(sec => {
                sec.fields.forEach(f => this._updateFieldUI(f));
                this._updateSectionUI(sec);
                return { ...sec };
            });
        } catch (mathError) {
            console.error('Math Engine Error:', mathError);
            // [im] the deferred field UI of the disable pass must still land when the math failed
            if (this.inline) { try { this.accordionSections.forEach(sec => sec.fields.forEach(f => this._updateFieldUI(f))); this.accordionSections = [...this.accordionSections]; } catch (e) { /* nothing more to do */ } }
        }
    }
    /** [im] PERF: every field value of the estimator as one string (formula fixed-point check) */
    _imValueSig() {
        const out = [];
        (this.accordionSections || []).forEach(sec => (sec.fields || []).forEach(f => {
            const v = f.value;
            out.push(v === undefined ? 'u' : (v === null ? 'n' : (typeof v).charAt(0) + String(v)));
        }));
        return out.join('\u0001');
    }
 
    // 👉 Bound to the CALCULATE button in the footer - Reetabrata (8th July)
    handleCalculate() {
        this.isLoading = true;
        setTimeout(() => {
            try {
                this._calculateNow();
            } catch (e) {
                console.error('handleCalculate error:', e);
            } finally {
                this.isLoading = false;
            }
        }, 0);
    }
 
    // 👉 APPLY now runs the CALCULATE pass first, with the spinner visible.
    // isLoading is flipped BEFORE the work is queued so LWC gets a frame to paint
    // the spinner; the heavy _calculateNow() + _applyNow() then run on the next
    // tick. Same pattern as handleCalculate(). The `finally` is essential: the
    // Telecom-Tower validation inside _applyNow() returns early, and _resetModal()
    // does not touch isLoading, so without it the spinner would never stop.
    // - Reetabrata (9th July 2026)
    handleApply() {
        this._hmFlushActive();                     // hmEstimator: the field still being typed in counts
        if (this.isLoading) return;   // ignore double-clicks while a run is in flight
        clearTimeout(this._hmLiveTimer);           // hmEstimator: the pass below covers any pending live pass
        this.isLoading = true;
        setTimeout(() => {
            try {
                this._calculateNow();   // exactly what the CALCULATE button runs
                this._applyNow();
            } catch (e) {
                console.error('handleApply error:', e);
            } finally {
                this.isLoading = false;
            }
        }, 0);
    }
 
    // Body of the original handleApply(), unchanged apart from the _calculateNow()
    // call being hoisted into handleApply() above. - Reetabrata (9th July 2026)
    _applyNow() {
        _hmLog('🛑 [DEBUG] handleApply START');
        try {
            if (!this._headlessMode && !this._validateTelecomTowerComposition()) {
                return; // Blocks save completely, toast already shown inside method
            }

            if (!this._headlessMode && !this._validateTelecomPaymentTerms()) {
                return; // Blocks save completely, toast already shown inside method
            }

            // Tower and Substation must share one Price Basis. No-op on every
            // other department. Deepanjan (12th August 2026)
            if (!this._headlessMode && !this._validateTowerSubstationPriceBasis()) {
                return; // Blocks save completely, toast already shown inside method
            }

            // Tower and Substation must agree on Payment Terms (and, where applicable,
            // No Of Days / Prevailing Rate of Bank Interest). No-op on every other
            // department.
            if (!this._headlessMode && !this._validateTowerSubstationPaymentTerms()) {
                return; // Blocks save completely, toast already shown inside method
            }

            // 👉 Block Apply when a visible required field is empty, or a min-flagged
            //    field (e.g. Full Vehicle Freight) holds 0 / negative. Toast shown inside.
            if (!this._headlessMode && !this.validateRequiredFields()) {
                this._hmShowAllRequired = true;        // hmEstimator: now mark every empty required field
                this._hmRefreshUI();
                return;
            }

            // ═══════════════════════════════════════════════════════════════
            // FIRST-APPLY FRESHNESS — Deepanjan (24th July 2026)
            // Two-step guard, both no-ops when everything is already fresh:
            //  1. Re-run the CALCULATE pipeline (lookups + a double formula
            //     pass) so dependency chains like added_up -> unit_rate ->
            //     cost_price -> unit_price fully converge before we read.
            //  2. Sync duplicates FROM the visible copy: the same apiName can
            //     live in several sections (hidden internal-calc groups). The
            //     change handler already syncs every duplicate when the USER
            //     types (see matchedFields: "prefer a VISIBLE one"), but
            //     FORMULA outputs updated only the copy they sit on - the
            //     hidden duplicates kept the value loaded at open. The line
            //     item parser then read those stale hidden copies (its "||"
            //     collectors are last-wins), so the first Apply saved the old
            //     unit_price (e.g. 75797 instead of 76297). Copying the
            //     visible value onto its hidden namesakes makes every copy
            //     agree, WITHOUT touching the parser's iteration order or any
            //     hidden-only section's behaviour.
            // Hardened: can never block the save itself.
            // ═══════════════════════════════════════════════════════════════
            try {
                this._evaluateLookups();
                // [im] PERF (live emit only): _calculateNow has just left a formula fixed point
                // (_imConverged); unless the lookups moved a value since, both passes below would
                // recompute the very same numbers. The second pass also runs only when the first
                // still moved something - on an unchanged state it gives an identical result.
                const imLive = this._headlessMode && this.inline;
                const imSig0 = imLive ? this._imValueSig() : null;
                if (!(imLive && this._imConverged !== null && imSig0 === this._imConverged)) {
                    this._evaluateAllFormulas();
                    if (!imLive || this._imValueSig() !== imSig0) this._evaluateAllFormulas();
                }

                const visibleVals = {};
                this.accordionSections.forEach(sec => {
                    if (!sec.isVisible) return;
                    sec.fields.forEach(f => {
                        if (f.type === 'header' || f.type === 'hidden') return;
                        if (!f.isVisible) return;
                        if (f.value !== '' && f.value !== null && f.value !== undefined) {
                            visibleVals[f.apiName] = f.value;
                        }
                    });
                });
                this.accordionSections.forEach(sec => {
                    sec.fields.forEach(f => {
                        if (f.isVisible) return;
                        if (visibleVals[f.apiName] !== undefined && f.value !== visibleVals[f.apiName]) {
                            f.value = visibleVals[f.apiName];
                        }
                    });
                });
            } catch (freshErr) {
                console.error('Pre-apply refresh failed (saving as-is):', freshErr);
            }
 
            const result = {};
            const parsedLineItems = []; 
 
            // 1. Baseline empty state.
            // Include hidden internal calc sections (forceHidden) AND sections that were
            // revealed only to collect inputs (revealedHiddenInputs) — both hold internal
            // fields whose values must persist. Reetabrata (14th July 2026)
            this.accordionSections.forEach(sec => {
                if (!sec.isVisible && !sec.forceHidden && !sec.revealedHiddenInputs) return;
 
                sec.fields.forEach(f => {
                    if (f.type === 'header' || f.type === 'hidden') return;
                    if (result[f.apiName] === undefined) result[f.apiName] = f.type === 'checkbox' ? false : '';
                });
            });
 
            // 2. Save field values AND capture parent push mappings.
            // For a normal visible section: save its visible fields (unchanged behaviour).
            // For an internal calc section — whether still fully hidden (forceHidden) or
            // revealed to show inputs (revealedHiddenInputs) — save ALL its non-header
            // fields, so both the user inputs AND the hidden formula outputs are stored in
            // the JSON exactly as required. Reetabrata (14th July 2026)
            const parentPushes = {}; 
            this.accordionSections.forEach(sec => {
                const isInternalCalc = sec.forceHidden === true || sec.revealedHiddenInputs === true;
                if (!sec.isVisible && !isInternalCalc) return;
                sec.fields.forEach(f => {
                    if (f.type === 'header' || f.type === 'hidden') return;
                    if (f.isVisible || isInternalCalc) {
                        result[f.apiName] = (f.value !== null && f.value !== undefined) ? f.value : '';
 
                        if (f.pushToParentApiName) {
                            parentPushes[f.pushToParentApiName] = result[f.apiName];
                        }
                    }
                });
            });

                        //  — manual overrides survive reopen. Deepanjan (22nd September 2026)
            // An editable field that also carries a formula (TOTAL PRICE (/KG) =
            // Base_Amount__c + 5, every segment LENGTH / THICKNESS, SI price/weight add)
            // is skipped by the formula engine only while isManualOverride is true. That
            // flag lived only in this instance's _lastValues and never reached the saved
            // JSON, so any rebuild from saved data re-ran the formula over the typed
            // value (99 -> 102). The flag now travels with the values as
            // <apiName>__manual, which _buildFields already reads.
            // TRUE only for a VISIBLE field the user overrode. FALSE is written only to
            // retire a flag that was TRUE before - an override the user cleared, or a
            // field that went invisible (its value is blanked by the baseline above, so
            // the formula must be free to run again when it reappears). Everything else
            // writes nothing, so the JSON grows by a handful of keys. Sections that are
            // not visible are skipped, exactly like the value loop above.
            // Other departments are untouched.
            if (this._modalConfig) {
                const savedAtOpen = this._modalConfig.savedData || {};   // absent in headless
                const lastVals    = this._lastValues || {};
                const wasTrue = k => savedAtOpen[k] === true || lastVals[k] === true;
                const formulaApis = new Set();
                const manualNow   = new Set();
                this.accordionSections.forEach(sec => {
                    if (!sec.isVisible) return;
                    sec.fields.forEach(f => {
                        if (!f.formula || f.type === 'header' || f.type === 'hidden') return;
                        formulaApis.add(f.apiName);
                        if (f.isVisible && f.isManualOverride === true) manualNow.add(f.apiName);
                    });
                });
                formulaApis.forEach(api => {
                    const k = `${api}__manual`;
                    if (manualNow.has(api)) result[k] = true;
                    else if (wasTrue(k)) result[k] = false;
                });
            }

            // PU Paint realization is not a line item, so the approval matrix could never
            // see it. Every field carrying an approvalMetric tag is folded into ONE flat key
            // on the saved values. Lowest value wins - low realization is the risky case.
            // The field is hidden while PU Paint is unticked, so nothing is written then.
            const approvalMins = {};
            this.accordionSections.forEach(sec => {
            const isInternalCalc = sec.forceHidden === true || sec.revealedHiddenInputs === true;
            if (!sec.isVisible && !isInternalCalc) return;
            sec.fields.forEach(f => {
            if (!f.approvalMetric) return;
            if (!f.isVisible && !isInternalCalc) return;
            const v = Number(f.value);
            if (f.value === '' || f.value === null || !Number.isFinite(v)) return;
            const k = 'approval_' + f.approvalMetric;
            approvalMins[k] = (k in approvalMins) ? Math.min(approvalMins[k], v) : v;
            });
            });
            // clear stale approval_* first, so a re-save can never leave an old value behind
            Object.keys(result).filter(k => k.startsWith('approval_')).forEach(k => delete result[k]);
            Object.assign(result, approvalMins);

           
          // 3. 👉 DYNAMIC LINE ITEM PARSER
            let sectionCounter = 1;
            const groupedSectionsMap = new Map();
            
            // Pre-compute which sections carry genuine line-item flags, so a section that
            // is RESPONSIBLE for a line item is processed even when it is hidden. Line-item
            // creation is governed by these flags (see sectionHasLineFlags below), never by
            this.accordionSections.forEach(sec => {
                // Process the section if it is visible OR it is INTENTIONALLY hidden via
                // isVisible:false (forceHidden) — an internal calc/line section that must
                // still emit its line item. A section hidden only because its controllingField
                // did not match (e.g. an EMPTY repeater row) is NOT a line-item section and is
                // skipped, so empty rows create no spurious line items. Reetabrata (14th July 2026)
                if (!sec.isVisible && !sec.forceHidden) return;

                // A forceHidden section (isVisible:false) is an internal block that still emits
                // its line - but only when its controllingField says it applies. Without this,
                // every member of a mutually-exclusive hidden group (the 12 PV/FIRM price
                // models) is treated as active and each emits a line. Sections with no
                // controllingField default to applicable, so pure internal-calc blocks are
                // untouched. Reetabrata (15th July 2026)
                const __applies = (sec.isApplicable !== undefined) ? sec.isApplicable : true;
                if (sec.forceHidden && !__applies) return;

                const groupId = sec.lineItemGroup || sec.id;
                
                if (!groupedSectionsMap.has(groupId)) {
                    groupedSectionsMap.set(groupId, {
                        label: sec.label, 
                        fields: [],
                        // The grouped pseudo-section must carry the REAL visibility of its
                        // constituents. Without this, `sec.isVisible` is undefined below, so
                        // __readHidden treats every flagged section as a hidden line section
                        // and reads its hidden fields — e.g. the 9 count-hidden columns of a
                        // column-repeater (Solar), whose rate-driven formulas hold nonzero
                        // prices, each emitting a phantom "(Item N)" line. OR-merge across
                        // the group: visible if any part is visible; internal-calc if any
                        // part is forceHidden/revealedHiddenInputs. Reetabrata (15th July 2026)
                        isVisible: false,
                        forceHidden: false,
                        revealedHiddenInputs: false
                    });
                }
                const __grp = groupedSectionsMap.get(groupId);            // Reetabrata (15th July 2026)
                __grp.isVisible = __grp.isVisible || sec.isVisible === true;
                __grp.forceHidden = __grp.forceHidden || sec.forceHidden === true;
                __grp.revealedHiddenInputs = __grp.revealedHiddenInputs || sec.revealedHiddenInputs === true;
                __grp.fields.push(...sec.fields);
            });
 
            groupedSectionsMap.forEach((sec, groupId) => {
                
                let maxCol = 1;
                sec.fields.forEach(f => {
                    if (f.isColRepeaterInput && f.columnCountIndex > maxCol) maxCol = f.columnCountIndex;
                });
 
                // ═══════════════════════════════════════════════════════════════════
                // ★ CHANGE 3 of 5 — BUG 2 (Stadium "Segment Weight Details" creates a
                //   spurious line item) ★  Reetabrata (14th July 2026)  — NEW VARIABLE
                // A section is a genuine LINE-ITEM section only if at least one field
                // declares a line-item flag (isWeightTotal / isUnitPrice / isUnitCost /
                // isQuantity / isListPrice / isRealization / isMargin / isDiscount) OR
                // carries a designation. Display-only sections such as "Segment Weight
                // Details" have a field whose apiName ends in "_weight" (which trips the
                // weight fallback below) but declare NO line-item flags — they must not
                // create a line item. This gate preserves every real section (all carry
                // these flags) and only suppresses the duplicate weight-display rows.
                // ═══════════════════════════════════════════════════════════════════
                const sectionHasLineFlags = sec.fields.some(f => // Reetabrata (14th July 2026)
                    f.isWeightTotal || f.isUnitPrice || f.isUnitCost || f.isQuantity ||
                    f.isListPrice || f.isRealization || f.isMargin || f.isDiscount ||
                    (f.secretWeight !== undefined && f.secretWeight > 0) ||
                    (f.apiName && (
                        f.apiName.toLowerCase().endsWith('unit_price') ||
                        f.apiName.toLowerCase().endsWith('unit_cost') ||
                        f.apiName.toLowerCase().endsWith('list_price') ||
                        f.apiName.toLowerCase().endsWith('designation')
                    ))
                );
 
                // When a section is responsible for a line item, its line-item fields may
                // themselves be hidden (a hidden line section). In that case we must read
                // field values regardless of field visibility; visibility only controls the
                // UI, not whether the line item is built. For normal visible sections this
                // is unchanged (all their line fields are visible). Reetabrata (14th July 2026)
                const __readHidden = sectionHasLineFlags && (!sec.isVisible || sec.revealedHiddenInputs);

                // ✅ NEW BLOCK START
                const gridRowIndices = new Set();
                sec.fields.forEach(f => {
                    if (!f.isVisible && !__readHidden) return;
                    const rowMatch = f.apiName.match(/^r(\d+)_/);
                    if (rowMatch) gridRowIndices.add(Number(rowMatch[1]));
                });
 
                if (gridRowIndices.size > 0) {
                    [...gridRowIndices].sort((a, b) => a - b).forEach(rowIdx => {
                        let weight = 0, qty = 1, realization = 0, unitPrice = 0, unitCost = 0, listPrice = 0, discount = 0, margin = 0;
                        let steel_type = '', designation = '', size_nb = '', pipe_class = '', standard = '', end_finish = '', uom = '', rate = 0, gst = 0, price_per_uom = 0, total_price = 0 , added_up = '', tolerance = '';
                        
                        sec.fields.forEach(f => {
                            if (!f.isVisible && !__readHidden) return;
                            const rowMatch = f.apiName.match(/^r(\d+)_/);
                            if (!rowMatch || Number(rowMatch[1]) !== rowIdx) return;
 
                            // 👉 BULLETPROOF FALLBACKS ADDED HERE
                            if (f.isWeightTotal || f.apiName.toLowerCase().endsWith('_weight')) weight = Number(f.value) || weight;
                            if (f.secretWeight !== undefined && f.secretWeight > 0) weight = f.secretWeight;
                            if (f.isQuantity || f.apiName.toLowerCase().includes('quantity')) qty = Number(f.value) || qty;
                            if (f.isRealization) realization = Number(f.value) || 0;
                            if (f.isUnitPrice || f.apiName.toLowerCase().endsWith('unit_price')) unitPrice = Number(f.value) || unitPrice;
                            if (f.isUnitCost || f.apiName.toLowerCase().endsWith('unit_cost')) unitCost = Number(f.value) || unitCost;
                            if (f.isListPrice || f.apiName.toLowerCase().endsWith('list_price')) listPrice = Number(f.value) || listPrice;
                            if (f.isDiscount || f.apiName.toLowerCase().endsWith('discount')) discount = Number(f.value) || discount;
                            if (f.isMargin || f.apiName.toLowerCase().endsWith('margin')) margin = Number(f.value) || margin; // 👉 Extracts Margin

                             // 👉 ADD THESE TWO LINES TO EXTRACT THE VALUES
                           // 👉 EXACT MATCH FIX: Prevent sub-components from overwriting the main component
                            const isMainAddedUp = /^[a-z]\d+_added_up$/.test(f.apiName) || f.apiName === 'added_up';
                            const isMainTolerance = /^[a-z]\d+_(tolerance_percent|tol_pct)$/.test(f.apiName) || f.apiName === 'tolerance';

                            if (isMainAddedUp) {
                                added_up = (f.value !== '' && f.value !== null && f.value !== undefined) ? Number(f.value) : '';
                            }
                            if (isMainTolerance) {
                                tolerance = (f.value !== '' && f.value !== null && f.value !== undefined) ? Number(f.value) : '';
                            }
                            
                            if (f.apiName.endsWith('steel_type')) steel_type = f.value;
                            if (f.apiName.endsWith('designation')) designation = f.value;
                            if (f.apiName.endsWith('size_nb')) size_nb = f.value;
                            if (f.apiName.endsWith('pipe_class')) pipe_class = f.value;
                            if (f.apiName.endsWith('standard_spec_grade')) standard = f.value;
                            if (f.apiName.endsWith('end_finish')) end_finish = f.value;
                            if (f.apiName.endsWith('uom')) uom = f.value;
                            if (f.apiName.endsWith('rate')) rate = Number(f.value) || 0;
                            if (f.apiName.endsWith('gst')) gst = Number(f.value) || 0;
                            if (f.apiName.endsWith('price_per_uom')) price_per_uom = Number(f.value) || 0;
                            if (f.apiName.endsWith('total_price')) total_price = Number(f.value) || 0;
                        });
 
                        // ★ CHANGE 4 of 5 — BUG 2 gate (grid-row push) ★ Reetabrata (14th July 2026)
                        // Was: if (weight > 0 || unitPrice > 0 || unitCost > 0 || designation !== '')
                        if (sectionHasLineFlags && (weight > 0 || unitPrice > 0 || unitCost > 0 || designation !== '')) { // Reetabrata (14th July 2026)
                            let cleanSectionName = sec.label.replace(/^[0-9.]+\s*/, '').trim();
                            let finalItemName = `${this.modalTitle.replace('WEIGHT ESTIMATOR - ', '').trim()} - ${cleanSectionName} (Row ${rowIdx})`;
                            
                            parsedLineItems.push({
                                itemName: finalItemName,
                                weight, quantity: qty, realization,
                                unitPrice, unitCost, listPrice, discount,
                                steel_type, designation, size_nb, pipe_class,
                                standard_spec_grade: standard, end_finish, uom,
                                rate, gst, price_per_uom, total_price,added_up, tolerance
                            });
                        }
                    });
                    sectionCounter++;
                    return; 
                }
                // ✅ NEW BLOCK END
 
                for (let c = 1; c <= maxCol; c++) {

                    // This block create a line item for each basic rates in Steel tubular Pole - rajeev 27-july 2026
                    // ═══ STEEL TUBULAR POLE ONLY — one line item per isUnitPrice field.
                    // Gate 1: hardcoded department check. Gate 2: 2+ priced fields in the
                    // section. Any other department fails Gate 1 and never enters. ═══
                    // const _isPoleDept = MULTI_PRICE_MODAL_TITLES.includes(
                    //     (this.modalTitle || '').trim().toUpperCase()
                    // );

                    // if (_isPoleDept) {
                    //     const _inScope = (f) => (f.isVisible || __readHidden) &&
                    //         (f.columnCountIndex === c || !f.columnCountIndex);

                    //     const _priced = sec.fields.filter(f =>
                    //         _inScope(f) && f.isUnitPrice && Number(f.value) > 0);

                    //     if (_priced.length > 1) {
                    //         const _priceApis = _priced.map(f => f.apiName);
                    //         // Skip rollups: a priced field whose formula references another
                    //         // priced field in this section (d1_final_total_amount sums the
                    //         // component rates) would double-count the components.
                    //         const _leaves = _priced.filter(f => {
                    //             if (!f.formula) return true;
                    //             return !_priceApis.some(api =>
                    //                 api !== f.apiName &&
                    //                 new RegExp('\\b' + api + '\\b').test(f.formula));
                    //         });
                    //         const _emit = _leaves.length ? _leaves : _priced;
                    //         const _ordered = sec.fields.filter(_inScope);

                    //         // Section weight goes on the first emitted line only
                    //         let _secWeight = 0;
                    //         _ordered.forEach(f => {
                    //             if (f.isWeightTotal || f.apiName.toLowerCase().endsWith('_weight'))
                    //                 _secWeight = Number(f.value) || _secWeight;
                    //             if (f.secretWeight !== undefined && f.secretWeight > 0)
                    //                 _secWeight = f.secretWeight;
                    //         });

                    //         const _cleanName = sec.label.replace(/^[0-9.]+\s*/, '').trim();
                    //         let _first = true;

                    //         _emit.forEach(pf => {
                    //             const idx = _ordered.indexOf(pf);

                    //             // Pair the rate with ITS quantity: nearest isQuantity AFTER
                    //             // this rate (stopping at the next rate), else nearest BEFORE,
                    //             // else 1. Matches your JSON layout (rate → added-up → qty).
                    //             let q = null;
                    //             for (let i = idx + 1; i < _ordered.length; i++) {
                    //                 if (_ordered[i].isUnitPrice) break;
                    //                 if (_ordered[i].isQuantity) { q = Number(_ordered[i].value) || 1; break; }
                    //             }
                    //             if (q === null) for (let i = idx - 1; i >= 0; i--) {
                    //                 if (_ordered[i].isUnitPrice) break;
                    //                 if (_ordered[i].isQuantity) { q = Number(_ordered[i].value) || 1; break; }
                    //             }
                    //             if (q === null) q = 1;

                    //             // Component name from the controlling checkbox's label
                    //             // ("MS / GI", "Cast Iron (IS)", "Single Arm", ...)
                    //             let comp = '';
                    //             if (pf.controllingField && !pf.controllingField.includes(',')) {
                    //                 const ctrl = sec.fields.find(x =>
                    //                     x.apiName === pf.controllingField.trim());
                    //                 if (ctrl && ctrl.label && ctrl.label.trim())
                    //                     comp = ctrl.label.trim();
                    //             }
                    //             let nm = `${this.modalTitle.trim()} - ${_cleanName}`;
                    //             if (comp) nm += ` - ${comp}`;
                    //             if (maxCol > 1) nm += ` (Item ${c})`;

                    //             const p = Math.round(Number(pf.value) * 1000) / 1000;
                    //             parsedLineItems.push({
                    //                 itemName: nm,
                    //                 weight: _first ? _secWeight : 0,
                    //                 quantity: q, realization: 0,
                    //                 unitPrice: p, unitCost: p, listPrice: p,
                    //                 discount: 0, margin: 0,
                    //                 steel_type: '', designation: '', size_nb: '', pipe_class: '',
                    //                 standard_spec_grade: '', end_finish: '', uom: '',
                    //                 rate: 0, gst: 0, price_per_uom: 0, total_price: 0,
                    //                 added_up: '', tolerance: ''
                    //             });
                    //             _first = false;
                    //         });
                    //         continue; // this section/column fully handled — skip legacy path
                    //     }
                    //     // _priced.length <= 1 → fall through to legacy path even for Pole,
                    //     // so single-price Pole sections (if any) behave like before.
                    // }

                    let weight = 0, qty = 1, realization = 0, unitPrice = 0, unitCost = 0, listPrice = 0, discount = 0, margin = 0;
                    let steel_type = '', designation = '', size_nb = '', pipe_class = '', standard = '', end_finish = '', uom = '', rate = 0, gst = 0, price_per_uom = 0, total_price = 0, added_up = '', tolerance = '';
 
                    sec.fields.forEach(f => {
                        if (!f.isVisible && !__readHidden) return;
                        if (f.columnCountIndex === c || !f.columnCountIndex) {
                            
                            // 👉 BULLETPROOF FALLBACKS ADDED HERE
                            if (f.isWeightTotal || f.apiName.toLowerCase().endsWith('_weight')) weight = Number(f.value) || weight;
                            if (f.secretWeight !== undefined && f.secretWeight > 0) weight = f.secretWeight;
                            if (f.isQuantity || f.apiName.toLowerCase().includes('quantity')) qty = Number(f.value) || qty;
                            if (f.isRealization) realization = Number(f.value) || 0;
                            if (f.isUnitPrice || f.apiName.toLowerCase().endsWith('unit_price')) {
                                unitPrice = Number(f.value) || unitPrice;
                            }
                            if (f.isUnitCost || f.apiName.toLowerCase().endsWith('unit_cost')) {
                                unitCost = Number(f.value) || unitCost;
                            }
                            if (f.isListPrice || f.apiName.toLowerCase().endsWith('list_price')) listPrice = Number(f.value) || listPrice;
                            if (f.isDiscount || f.apiName.toLowerCase().endsWith('discount')) discount = Number(f.value) || discount;
                            if (f.isMargin || f.apiName.toLowerCase().endsWith('margin')) margin = Number(f.value) || margin; // 👉 Extracts Margin

                             // 👉 ADD THESE TWO LINES TO EXTRACT THE VALUES
                           // 👉 THE FIX: Safely extract values without forcing an empty string to become a 0
                           // 👉 EXACT MATCH FIX: Prevent sub-components from overwriting the main component
                            const isMainAddedUp = /^[a-z]\d+_added_up$/.test(f.apiName) || f.apiName === 'added_up';
                            const isMainTolerance = /^[a-z]\d+_(tolerance_percent|tol_pct)$/.test(f.apiName) || f.apiName === 'tolerance';

                            if (isMainAddedUp) {
                                added_up = (f.value !== '' && f.value !== null && f.value !== undefined) ? Number(f.value) : '';
                            }
                            if (isMainTolerance) {
                                tolerance = (f.value !== '' && f.value !== null && f.value !== undefined) ? Number(f.value) : '';
                            }
 
                            if (f.apiName.endsWith('steel_type')) steel_type = f.value;
                            if (f.apiName.endsWith('designation')) designation = f.value;
                            if (f.apiName.endsWith('size_nb')) size_nb = f.value;
                            if (f.apiName.endsWith('pipe_class')) pipe_class = f.value;
                            if (f.apiName.endsWith('standard_spec_grade')) standard = f.value;
                            if (f.apiName.endsWith('end_finish')) end_finish = f.value;
                            if (f.apiName.endsWith('uom')) uom = f.value;
                            if (f.apiName.endsWith('rate')) rate = Number(f.value) || 0;
                            if (f.apiName.endsWith('gst')) gst = Number(f.value) || 0;
                            if (f.apiName.endsWith('price_per_uom')) price_per_uom = Number(f.value) || 0;
                            if (f.apiName.endsWith('total_price')) total_price = Number(f.value) || 0;
                        }
                    });
 
                    // ★ CHANGE 5 of 5 — BUG 2 gate (column push) ★ Reetabrata (14th July 2026)
                    // Was: if (weight > 0 || unitPrice > 0 || unitCost > 0 || designation !== '')
                    // ── Added: skip a section-level line whose section label resolves to EMPTY.
                    // Such a line renders as a nameless "{Modal} - " row — it is always a
                    // container/base section (e.g. the Freight base section carrying the product
                    // total forward), never a real product line, which always has a descriptive
                    // label. Repeater rows keep their "{label}" name and are unaffected, and no
                    // labeled section in any department is touched. Reetabrata (14th July 2026)
                    let cleanSectionName = sec.label.replace(/^[0-9.]+\s*/, '').trim();
                    if (sectionHasLineFlags && cleanSectionName !== '' && (weight > 0 || unitPrice > 0 || unitCost > 0 || designation !== '')) {
                        let finalItemName = `${this.modalTitle.replace('WEIGHT ESTIMATOR - ', '').trim()} - ${cleanSectionName}`;
                        
                        if (maxCol > 1) {
                            finalItemName += ` (Item ${c})`;
                        }
                        
                        parsedLineItems.push({
                            itemName: finalItemName,
                            weight: weight, quantity: qty, realization: realization,
                            unitPrice: unitPrice, unitCost: unitCost, listPrice: listPrice, discount: discount,margin: margin,
                            steel_type: steel_type, designation: designation, size_nb: size_nb, pipe_class: pipe_class,
                            standard_spec_grade: standard, end_finish: end_finish, uom: uom,
                           rate: rate, gst: gst, price_per_uom: price_per_uom, total_price: total_price, added_up: added_up, tolerance: tolerance
                        });
                    }
                }
                sectionCounter++;
            });
 
            this._saveCurrentValues();

            // Headless recompute (cross-modal refresh): capture results, no event, no reset.
            if (this._headlessMode) {
                this._headlessResult = {
                    values: result,
                    lineItems: parsedLineItems,
                    parentPushes: parentPushes
                };
                return;
            }
            
            // 4. Send BOTH the raw values AND the Line Items to the Parent
            this.dispatchEvent(new CustomEvent('applyvalues', {
                detail: {
                    values: result,
                    lineItems: parsedLineItems,
                    modalConfig: this._modalConfig,
                    parentPushes: parentPushes,
                    isComplete: true
                }
            }));
            
            this._resetModal();
            _hmLog('🛑 [DEBUG] handleApply COMPLETE');
        } catch (e) {
            console.error('🚨 [DEBUG ERROR] handleApply crashed!');
            console.error('🚨 [DEBUG ERROR] Message:', e.message);
            console.error('handleApply error:', e);
        }
    }
 
    handleClose() {
        try {
            this._hmFlushActive();     // hmEstimator: the field still being typed in is kept, as the domestic modal kept every keystroke
            this._saveCurrentValues();
            this.dispatchEvent(new CustomEvent('modalclose', {}));
            this._resetModal();
        } catch (e) {
            console.error('handleClose error:', e);
        }
    }
 
    _resetModal() {
        this._hmShowAllRequired = false;           // hmEstimator
        this.hmCalc = null;                        // hmEstimator
        clearTimeout(this._hmLiveTimer);           // hmEstimator: no pass after the modal is gone
        this.isModalOpen = false;
        this.accordionSections = [];
        this.modalTitle = '';
        this._modalConfig = null;
    }
 
    stopPropagation(event) {
        event.stopPropagation();
    }
 
    // =========================================================
    // 👉 CHILD MODAL VALIDATION ENGINE
    // Automatically respects hidden and dynamically disabled fields!
    // =========================================================
    // Resolve a human-readable label for a field. Some inputs carry an empty
    // label (their caption lives on a sibling header field), so never fall back
    // to the raw apiName in the toast until every option is exhausted.
    _prettyLabel(sec, field) {
        // [im] an item cell of the column repeater is named after its row label ("HEIGHT OF
        // POLE (Item 2)"), not after the unit its own label carries ("mm")
        if (field.isColRepeaterInput) {
            const idx = sec.fields.indexOf(field);
            for (let i = idx - 1; i >= 0; i--) {
                const f = sec.fields[i];
                if (f.isColRepeaterLabel && f.label && String(f.label).trim()) return String(f.label).trim() + (field.columnCountIndex ? ' (Item ' + field.columnCountIndex + ')' : '');
            }
        }
        if (field.label && field.label.trim() !== '') return field.label.trim();
        // 1) sibling header by this engine's naming convention: <apiName>_header
        const hdr = sec.fields.find(f =>
            f.apiName === field.apiName + '_header' && f.label && f.label.trim() !== '');
        if (hdr) return hdr.label.trim();
        // 2) nearest preceding header field in the same section
        const idx = sec.fields.indexOf(field);
        for (let i = idx - 1; i >= 0; i--) {
            const f = sec.fields[i];
            if (f.type === 'header' && f.label && f.label.trim() !== '') return f.label.trim();
        }
        // 3) last resort
        return field.apiName;
    }

    // =========================================================
    // CRASH BARRIER - Accessories row validation
    // ---------------------------------------------------------
    // A row of ACCESSORIES DETAILS is only "in use" once its W/T BEAM
    // picklist has a value. Such a row must then also have UOM, RATE and
    // QUANTITY (NO.). Rows with no beam selected are left completely alone,
    // and nothing is ever hidden - the JSON required/controllingField route
    // would have hidden the three cells instead.
    //
    // Scoping: the loop keys off acc_section_w_t_beam_input*, which only
    // exists in the Crash Barrier Accessories section logic. Departments
    // whose accessories table has no W/T BEAM column contribute no fields
    // here and the method returns an empty array - same "no fields, no
    // effect" guard used by _validateTelecomTowerComposition.
    //
    // Row keys are irregular: row 1 has NO numeric suffix
    // (acc_section_uom_input) while rows 2-10 do (acc_section_uom_input2 ...
    // acc_section_uom_input10), so the suffix list starts with ''.
    // =========================================================
    // ADDITIONAL ACCESSORIES block, Segment Above 5 - Deepanjan (6th September 2026,
    // widened 8th September 2026). Wherever the block is on screen, it must carry RATE and
    // at least ONE of TYPE OF WINCH / DRUM TYPE / TYPE OF POWER TOOL / TYPE OF WIRE ROPE.
    //   - Stadium Mast: the quote-level block (bare lm_acc_rate), on screen only while Man
    //     Riding Lift is ticked. RATE there is a plain required flag in segmentGeneratorIm.js,
    //     so this method only adds the "one of four" rule (no duplicate RATE message).
    //   - Lighting Mast / LCLM: the block is cloned PER ROW (r{n}_lm_acc_rate) and is always
    //     on screen for every mast row, so both RATE and "one of four" are checked here,
    //     per row, labelled "Additional Accessories <row>" like the section header.
    //   - Flag Mast prices its accessories in its own fm_ac_ grid; its lm_ block is not the
    //     priced one, so a recipe that carries any fm_ac_ field is skipped entirely.
    // An "any one of four" rule cannot be a per-field required flag, hence this method -
    // same shape as the Crash Barrier precedent below. Other departments have no
    // lm_acc_rate field and return [] on the first pass.
    _validateAccessoryBlock() {
        const problems = [];
        const sections = Array.isArray(this.accordionSections) ? this.accordionSections : [];
        const byApi = new Map();
        sections.forEach(sec => {
            if (!sec || !sec.isVisible || !Array.isArray(sec.fields)) return;
            sec.fields.forEach(f => {
                if (f && f.apiName && !byApi.has(f.apiName)) byApi.set(f.apiName, f);
            });
        });

        for (const api of byApi.keys()) {
            if (/^(r\d+_)?fm_ac_/.test(api)) return problems;   // Flag Mast: own accessory grid
        }

        const hasValue = (f) => {
            if (!f) return false;
            const v = f.value;
            if (v === '' || v === null || v === undefined) return false;
            return String(v).trim() !== '';
        };
        const TYPES = ['lm_type_of_winch', 'lm_winch_drum', 'lm_type_of_power_tool', 'lm_type_of_wire_rope'];

        byApi.forEach((rate, api) => {
            const m = api.match(/^(r(\d+)_)?lm_acc_rate$/);
            if (!m || !rate.isVisible) return;
            const pfx   = m[1] || '';
            const label = '[Additional Accessories' + (m[2] ? ' ' + m[2] : '') + ']';

            // RATE: only when the field is not already a required flag (Stadium copy is).
            if (rate.required !== true && !hasValue(rate)) {
                problems.push(label + ' RATE');
            }
            const anyType = TYPES.some(k => hasValue(byApi.get(pfx + k)));
            if (!anyType) {
                problems.push(label + ' TYPE OF WINCH / DRUM TYPE / TYPE OF POWER TOOL / TYPE OF WIRE ROPE (at least one)');
            }
        });
        return problems;
    }


       /* Octagonal / Custom Pole (High Mast): FOUNDATION BOLT DIAMETER = N.R. means the
       bolts are NOT in our scope, but the offer still prints their dimensions - N.R FB
       DIAMETER, FOUNDATION BOLT LENGTH and BOLT QUANTITY. HighMastSOWController drops
       each one when blank, so a half-filled N.R. foundation saved cleanly and then
       printed a sentence with pieces missing (seen on a quote with
       c1_s1_cus_op_nr_fb_diameter and _foundation_bolt_length both empty). Make all
       three mandatory once N.R. is picked.

       Column-repeater fields are flattened into sec.fields by _expandFields as
       c{n}_<api>, each carrying isColRepeaterInput + columnCountIndex, so siblings are
       matched on columnCountIndex - the same idiom as the dependent-picklist wake-up.

       Matching on the VALUE, not on isVisible: an unused column saves as '' while an
       in-use N.R. column saves 'N.R.', so columns 2-10 fall out on their own and this
       never depends on how a disabled-but-shown repeater input reports visibility.
       Covers Standard (s1_foundation_bolt_diameter) and Custom (s1_cus_op_...) alike -
       both end in the same suffix. Deepanjan (16th September 2026) */
       _validateOctagonalNrFoundation() {
        const missing = [];
        const NR_REQUIRED = [
            { suffix: 'nr_fb_diameter',         label: 'N.R FB DIAMETER' },
            { suffix: 'foundation_bolt_length', label: 'FOUNDATION BOLT LENGTH' },
            { suffix: 'bolt_quantity',          label: 'BOLT QUANTITY' }
        ];

        const resolve = this._fieldResolver([]);   // global apiName -> field

        this.accordionSections.forEach(sec => {
            if (!sec.isVisible) return;

            sec.fields.forEach(dia => {
                if (dia.type === 'header' || !dia.isColRepeaterInput) return;
                if (!dia.apiName || !dia.apiName.endsWith('foundation_bolt_diameter')) return;

                // Only columns the user actually opened. Every column carries the
                // defaultValue "N.R." in memory, so without this all 10 report errors -
                // the saved JSON hides it because unused columns are stripped on write.
                // Deepanjan (16th September 2026)
                const cnt   = resolve(dia.columnCountApi);
                const inUse = parseInt(cnt && cnt.value, 10) || 0;
                if (!dia.columnCountIndex || dia.columnCountIndex > inUse) return;

                if (String(dia.value || '').trim().toUpperCase() !== 'N.R.') return;

                NR_REQUIRED.forEach(req => {
                    const t = sec.fields.find(f => f.apiName
                                               && f.apiName.endsWith(req.suffix)
                                               && f.columnCountIndex === dia.columnCountIndex);
                    if (!t) return;                     // field not on this layout
                    if (t.value === '' || t.value === null || t.value === undefined) {
                        missing.push(`[${sec.label}] Column ${dia.columnCountIndex}: ${req.label} (required when FOUNDATION BOLT is N.R.)`);
                    }
                });
            });
        });

        return missing;
    }

    _validateCrashBarrierAccessoryRows() {
        const problems = [];

        // Flatten every visible field once, keyed by apiName.
        const byApi = new Map();
        const sections = Array.isArray(this.accordionSections) ? this.accordionSections : [];
        sections.forEach(sec => {
            if (!sec || !sec.isVisible || !Array.isArray(sec.fields)) return;
            sec.fields.forEach(f => {
                if (f && f.apiName && !byApi.has(f.apiName)) byApi.set(f.apiName, f);
            });
        });

        const hasValue = (f) => {
            if (!f) return false;
            const v = f.value;
            if (v === '' || v === null || v === undefined) return false;
            return String(v).trim() !== '';
        };

        // '' = row 1, then '2' .. '10'
        const suffixes = ['', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

        suffixes.forEach((sfx, idx) => {
            const beam = byApi.get('acc_section_w_t_beam_input' + sfx);

            // Not a Crash Barrier accessories row, or the row is not visible.
            if (!beam || !beam.isVisible) return;

            // No beam picked - this row is unused, leave it alone.
            if (!hasValue(beam)) return;

            const rowNo = idx + 1;
            [
                ['acc_section_uom_input' + sfx, 'UOM'],
                ['acc_section_rate_input' + sfx, 'RATE'],
                ['acc_section_quantity_no_input' + sfx, 'QUANTITY (NO.)']
            ].forEach(([api, label]) => {
                const f = byApi.get(api);
                if (!f || !f.isVisible || f.readOnly) return;
                if (!hasValue(f)) {
                    problems.push(`[Accessories Details] Row ${rowNo} - ${label}`);
                }
            });
        });

        return problems;

        
    }

        // ── CROSS PRODUCT: the freight TERM must agree across every product on the quote ──
    // Deepanjan (10th September 2026)
    //
    // One quote can now carry several MBCB types, each with its own "Trans.in offer?"
    // picklist. Ex-works / F.O.R is a commercial term of the whole offer (the T&C prints
    // one sentence for it), so it must be the same everywhere: the FIRST product's
    // choice is the master and every other product must match it.
    //
    // Deliberately NOT validated: types of freight and the Transportation KG / Full
    // Vehicle Freight amounts. Those are per-product costs that legitimately differ
    // with weight and quantity, and each PDF section prints its own.
    //
    // Field names differ per product, so fields are matched by ROLE, not by name:
    // any visible picklist whose apiName contains "trans_in_offer".
    //
    // "Master" = the value already saved by ANY OTHER modal (read from _lastValues,
    // excluding this modal's own fields). If nothing is saved yet, this modal's first
    // visible value is the master and the others in this modal must agree with it.
    //
    // Scope: Crash Barrier only, detected by MBCB_Type in the saved data - no other
    // department carries that key. Returns [] everywhere else.
    _validateCrashBarrierFreightConsistency() {
        const problems = [];
        const saved = this._lastValues || {};
        if (!saved.MBCB_Type) return problems;

        const R1 = /trans_in_offer/i;
        const isBlank = v => v === '' || v === null || v === undefined || String(v).trim() === '';
        const norm = v => String(v).trim();

                const mine = [];
        const mineApi = new Set();
        (Array.isArray(this.accordionSections) ? this.accordionSections : []).forEach(sec => {
            if (!sec || !Array.isArray(sec.fields)) return;
            sec.fields.forEach(f => {
                if (!f || !f.apiName || f.type === 'header') return;
                // every field of THIS modal (hidden sections too) is "mine", never another product
                mineApi.add(f.apiName);
                if (sec.isVisible && f.isVisible && f.type === 'picklist' && R1.test(f.apiName)) mine.push({ f, sec });
            });
        });
        if (mine.length === 0) return problems;          // this modal has no freight term

        // Master from OTHER products already saved on this quote.
        let master = null;
                Object.keys(saved).forEach(k => {
            if (master !== null) return;
            if (!R1.test(k) || mineApi.has(k) || /_header$/i.test(k)) return;
            // skip internal flags (<api>__cleared / <api>__manual) - they hold true/false, not a freight term
            if (/__(cleared|manual)$/i.test(k)) return;
            const v = saved[k];
            if (typeof v === 'boolean') return;
            if (!isBlank(v)) master = norm(v);
        });
        const where = master !== null ? 'the product entered first' : 'the first section above';

        // Nothing saved elsewhere yet: this modal's first chosen value is the master.
        if (master === null) {
            const first = mine.find(x => !isBlank(x.f.value));
            if (!first) return problems;
            master = norm(first.f.value);
        }

        mine.forEach(x => {
            if (isBlank(x.f.value)) return;                // blanks are the required-check's job
            if (norm(x.f.value) !== master) {
                problems.push(`[${x.sec.label}] Trans.in offer? must be "${master}" - same as ${where}`);
            }
        });
        return problems;
    }

    validateRequiredFields() {
        const missingFields = this._imMissingFields();   // [im] the same rules, shared with imValidate()
        if (missingFields.length > 0) {
            // Remove duplicates (Grid rows often have the same column labels repeatedly)
            let uniqueFields = [...new Set(missingFields)];

            // Fire the Toast error
            this.dispatchEvent(new ShowToastEvent({
                title: 'Validation Error',
                message: `Please fill in the following required fields:\n${uniqueFields.join('\n')}`,
                variant: 'error'
            }));
            return false; // Tells the apply function to STOP
        }
        return true; // Everything is good, proceed!
    }

    // [im] Body of validateRequiredFields() as it was - every rule, every message - returning
    // the list (duplicates removed) instead of toasting. validateRequiredFields() wraps it.
    _imMissingFields() {
        let missingFields = [];
        this._imMissingApis = [];   // [im] {message, apiName} of the per-field hits, for imFocus()

        this.accordionSections.forEach(sec => {
            // Only check sections that are currently visible
            if (sec.isVisible) {
                sec.fields.forEach(field => {
                    // Ignore headers
                    if (field.type === 'header') return;
 
                    // Check fields that are Visible, Required, and NOT locked as Read-Only
                    if (field.isVisible && field.required && !field.readOnly) {
                        if (field.value === '' || field.value === null || field.value === undefined) {
                            // Grab the label (fallback to API name if label is blank like in grid spaces)
                            let fLabel = this._prettyLabel(sec, field);
 
                            // Push the section name and field name so the user knows exactly where to look
                            missingFields.push(`[${sec.label}] ${fLabel}`);
                            this._imMissingApis.push({ message: `[${sec.label}] ${fLabel}`, apiName: field.apiName });   // [im]
                        }
                    }

                    // 👉 Positive-value guard: a min-flagged field must not hold 0 /
                    //    negative / below-min. Label may be blank on some inputs, so
                    //    fall back to apiName for the message.
                    if (field.isVisible && !field.readOnly &&
                        field.min !== null && field.min !== undefined) {
                        const raw = field.value;
                        if (raw !== '' && raw !== null && raw !== undefined) {
                            const num = parseFloat(raw);
                            if (isNaN(num) || num < Number(field.min)) {
                                let fLabel = this._prettyLabel(sec, field);
                                missingFields.push(`[${sec.label}] ${fLabel} (must be >= ${field.min})`);
                                this._imMissingApis.push({ message: `[${sec.label}] ${fLabel} (must be >= ${field.min})`, apiName: field.apiName });   // [im]
                            }
                        }
                    }
                });
            }
        });

        // [im] Segment Above 5: a count the estimator refuses (1-5) or caps (above 15) blocks
        // Apply - the domestic modal clears the box with a toast; here the field shows the
        // message and the quote cannot be applied with it.
        if (this._modalConfig && this._modalConfig.dynamicSegments === true) {
            this.accordionSections.forEach(sec => {
                if (!sec.isVisible) return;
                sec.fields.forEach(field => {
                    if (!field.isVisible || field.readOnly || !/lm_no_of_segment$/.test(String(field.apiName || ''))) return;
                    if (field.value === '' || field.value === null || field.value === undefined) return;
                    const c = validateSegmentCount(field.value);
                    if (c.block || (c.message && String(c.value) !== String(field.value).trim())) {
                        const msg = `[${sec.label}] ${this._prettyLabel(sec, field)}: ${c.block ? '6 to 15 segments only (1-5: Standard Mast > Lighting Mast)' : c.message}`;
                        missingFields.push(msg);
                        this._imMissingApis.push({ message: msg, apiName: field.apiName });
                    }
                });
            });
        }

        // Crash Barrier only: an accessory row that has a W/T BEAM picked must also
        // carry UOM, RATE and QUANTITY (NO.). Rows with no beam stay optional, and
        // no field is hidden - see _validateCrashBarrierAccessoryRows.
        missingFields = missingFields.concat(this._validateCrashBarrierAccessoryRows());

        // Crash Barrier cross product: Ex-works / F.O.R must match what other products
        // on this quote already saved - see _validateCrashBarrierFreightConsistency.
        missingFields = missingFields.concat(this._validateCrashBarrierFreightConsistency());


        // Segment Above 5 Additional Accessories (Stadium quote-level block, Lighting Mast /
        // LCLM per-row blocks): RATE + at least one accessory type - see _validateAccessoryBlock.
        missingFields = missingFields.concat(this._validateAccessoryBlock());

        // Octagonal Pole: N.R. foundation must carry dia / length / bolt quantity -
        // see _validateOctagonalNrFoundation. Faizan (16th September 2026)
        missingFields = missingFields.concat(this._validateOctagonalNrFoundation());

        return [...new Set(missingFields)];   // [im] duplicates removed, exactly as the toast did
    }

    // =========================================================
    // 👉 DYNAMIC COLUMN-BY-COLUMN TOTAL CALCULATOR
    // =========================================================
    _calculateGridTotals() {
        let totalsByCol = {};
        let maxActiveCol = 1;
 
        // 1. Loop through all fields to find the max columns and sum the weights
        this.accordionSections.forEach(sec => {
            if (!sec.isVisible) return;
            sec.fields.forEach(f => {
                if (!f.isVisible) return;
 
                // Find the absolute maximum active columns across ANY repeater section
                if (f.isColRepeaterInput) {
                    let colIndex = f.columnCountIndex || 1;
                    if (colIndex > maxActiveCol) {
                        maxActiveCol = colIndex; // Locks in the widest grid
                    }
                }
 
                // Sum up the weights using your JSON flag
                if (f.isWeightTotal === true) {
                    let colIndex = f.columnCountIndex || 1;
                    if (!totalsByCol[colIndex]) totalsByCol[colIndex] = 0;
                    totalsByCol[colIndex] += (Number(f.value) || 0);
                }
 
                // 👉 ADD THIS: Sum up the secret weights!Abhishek saxena
                if (f.secretWeight !== undefined) {
                    let colIndex = f.columnCountIndex || 1;
                    if (!totalsByCol[colIndex]) totalsByCol[colIndex] = 0;
                    totalsByCol[colIndex] += f.secretWeight;
                }
                //end
            });
        });
 
        // 2. 👉 THE FIX: Calculate the exact span sizes ONCE based on maxActiveCol
        let lblSpan = 12;
        let inpSpan = 12;
 
        if (maxActiveCol === 1) { lblSpan = 6; inpSpan = 6; }
        else if (maxActiveCol === 2) { lblSpan = 4; inpSpan = 4; }
        else if (maxActiveCol === 3) { lblSpan = 3; inpSpan = 3; }
        else if (maxActiveCol === 4) { lblSpan = 4; inpSpan = 2; }
        else if (maxActiveCol === 5) { lblSpan = 2; inpSpan = 2; }
        else {
            inpSpan = 1;
            lblSpan = 12 - (maxActiveCol * inpSpan);
            if (lblSpan < 1) lblSpan = 1;
        }
 
        // 3. Build the array for the HTML to render the grid perfectly
        let totalsUI = [];
 
        totalsUI.push({
            id: 'label_total',
            isLabel: true,
            spanClass: `slds-col slds-size_${lblSpan}-of-12`,
            text: 'TOTAL WEIGHT (KG)'
        });
 
        for (let c = 1; c <= maxActiveCol; c++) {
            let colWeight = totalsByCol[c] || 0;
            totalsUI.push({
                id: `col_${c}_total`,
                isLabel: false,
                spanClass: `slds-col slds-size_${inpSpan}-of-12`,
                value: Math.round(colWeight * 1000) / 1000
            });
        }
 
        this.columnTotalsArray = totalsUI;
    }
    // =========================================================
    // 👉 3. ADD THIS FETCH METHOD
    // =========================================================
   // =========================================================
   // 👉 THE DYNAMIC PRICING INJECTOR
   // =========================================================
   async _fetchRateCardData(departmentName) {
    if (!departmentName) return;
 
    try {
        const jsonString = await getRateCardJson({ departmentName: departmentName });
        if (jsonString) {
            const parsedCard = JSON.parse(jsonString);
 
            // 👉 ROUTER: Handle both older arrays and modern dictionaries
            if (Array.isArray(parsedCard)) {
                const rateCardFields = parsedCard.map(field => ({
                    ...field,
                    type: 'hidden'
                }));
 
                if (!this._modalConfig.modalFields) {
                    this._modalConfig.modalFields = [];
                }
                this._modalConfig.modalFields.push({
                    name: 'hidden_rate_card_section',
                    label: 'System Rate Cards',
                    isVisible: false,
                    fields: rateCardFields
                });
            } else {
                // Extracts baseRates into the modal's global state
                const extractedRates = parsedCard.baseRatesMap || parsedCard.baseRates || parsedCard.BASE_RATES || parsedCard;
                this.baseRates = { ...this.baseRates, ...extractedRates };
            }
 
            _hmLog('✅ Rate Card injected into Math Engine successfully!');
 
            // 👉 FIX 2: DEEP CLONE - Forces LWC to redraw the UI instantly!
            let clonedSections = JSON.parse(JSON.stringify(this.accordionSections));
            
            // Swap array momentarily for calculations
            this.accordionSections = clonedSections;
 
            this._evaluateLookups();
            this._evaluateAllFormulas();
            this._evaluateSectionVisibility();
            this._evaluateAllFormulas();
            this._evaluateDynamicColSpans();
 
            // Apply visual updates
            clonedSections.forEach(sec => {
                sec.fields.forEach(f => this._updateFieldUI(f));
                this._updateSectionUI(sec);
            });
 
            // Reassign the clean cloned array to trigger the HTML to render
            this.accordionSections = [...clonedSections];
        }
    } catch (error) {
        console.error('❌ Failed to fetch Rate Card JSON:', error);
    }
}
// ─────────────────Reetabrata (7th July)────────────────────────────────────────
_clearSegmentCount() {
    this._lastValues.lm_no_of_segment = '';
    this.accordionSections.forEach(sec =>
        sec.fields.forEach(f => {
            if (f.apiName === 'lm_no_of_segment') { f.value = ''; f.userCleared = true; }
        })
    );
    if (this._modalConfig) {
        this._modalConfig.modalFields =
            generateSegmentModal(this._modalConfig.mastType, this._lastValues);
        this.accordionSections =
            this._buildSections(this._modalConfig.modalFields);
    }
}

// ─────────────────Reetabrata (7th July)────────────────────────────────────────


// ========================================================= rajeev 21-july
    // 👉 CROSS-MODAL HEADLESS RECOMPUTE
    // Rebuilds this modal from its cached config + the LATEST combined savedData,
    // runs the SAME math the CALCULATE button runs, and extracts values + line
    // items via the SAME extractor APPLY uses - all without opening/showing the
    // modal, dispatching events, or hitting Apex. Reuses the live instance so
    // _lastValues (and its __manual/__cleared flags) is preserved.
    // =========================================================
    @api
    recomputeHeadless(config, savedData) {
        if (!config) return null;

        const snap = {
            cfg: this._modalConfig,
            sections: this.accordionSections,
            title: this.modalTitle,
            baseRates: this.baseRates,
            structural: this._structuralApis,
            open: this.isModalOpen
        };

        try {
            const cfg = JSON.parse(JSON.stringify(config, (key, value) => {
                if ((key === 'controllingField' || key === 'disableControllingField') && Array.isArray(value)) {
                    return value.join(',');
                }
                return value;
            }));

            this._modalConfig = cfg;
            this.modalTitle = cfg.title || 'ESTIMATOR';
            this.baseRates = cfg.baseRates || {};

            // Merge the latest combined data, exactly like openModal does. Because we
            // reuse the same instance, prior __manual/__cleared flags in _lastValues
            // are preserved (manual overrides are not lost).
            this._lastValues = { ...this._lastValues, ...(savedData || {}) };
            if (cfg.preRegisterApis) {
                Object.keys(cfg.preRegisterApis).forEach(a => {
                    if (!(a in this._lastValues)) this._lastValues[a] = cfg.preRegisterApis[a];
                });
            }

            this.accordionSections = this._buildSections(cfg.modalFields || []);
            this._buildStructuralApiSet();

            // Identical to the CALCULATE button. No async pricing/blueprint/PV fetch -
            // those rates are already in savedData from the original apply and reused.
            this._calculateNow();

            this._headlessMode = true;
            this._headlessResult = null;
            this._applyNow();               // fills _headlessResult, no event, no reset
            return this._headlessResult;

        } catch (e) {
            console.error('recomputeHeadless error:', e);
            return null;
        } finally {
            this._headlessMode = false;
            this._headlessResult = null;
            // _lastValues intentionally NOT restored (recomputed values must persist).
            this._modalConfig = snap.cfg;
            this.accordionSections = snap.sections;
            this.modalTitle = snap.title;
            this.baseRates = snap.baseRates;
            this._structuralApis = snap.structural;
            this.isModalOpen = snap.open;
        }
    }
// per-subtype checkbox tick/untick (compact per-column widget)
    handleSubtypeCheckToggle(event) {
        const fieldApi = event.currentTarget.dataset.name;
        const subtype  = event.currentTarget.dataset.subtype;
        const checked  = event.target.checked === true;
        let rows = this._sqgGetSelection(fieldApi);
        if (checked) {
            if (!rows.some(r => r.subtype === subtype)) rows.push({ subtype: subtype, qty: null });
        } else {
            rows = rows.filter(r => r.subtype !== subtype);
        }
        this._sqgSaveSelection(fieldApi, rows);
        const field = this._sqgFindField(fieldApi);
        if (field) {
            this._sqgEnrich(field);
            this._sqgWriteTargets(field);
            this.accordionSections = [...this.accordionSections];
        }
    }


    // ═════════════════════════════════════════════════════════════════════════
    // HIGH MAST CROSS PRODUCT - Deepanjan (27th September 2026)   [hm-cross]
    // openModal / recomputeHeadless MERGE savedData over _lastValues, so keys of the
    // previous open stay behind. That is wanted inside one product (manual-override
    // flags survive), but when the host swaps the product on screen the memory must
    // start from that product's own saved keys alone - otherwise a second Lighting
    // Mast opens pre-filled with the first one's rows. The host calls this on every
    // product switch; nothing else calls it, so single-product behaviour is untouched.
    @api
    forgetMemory() {
        this._lastValues = {};
    }
}