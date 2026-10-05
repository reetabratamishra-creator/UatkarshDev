/**
 * internationalQuote - shell for the International Marketing quote.
 *
 *  - product tabs: one dedicated child LWC per product
 *    (transmissionImConfig, crashBarrierImConfig, ...). A tab shows only when
 *    that department's Quote_Template_Config row has IM_Enabled__c ticked.
 *    each with its own isolated value bag
 *  - Export setup: currency (Quote.IM_Currency__c picklist) + exchange rate
 *    (typed by the user, prefilled from the rate card's IM row, saved only
 *    inside the Quote_Value__c JSON)
 *  - one "Show calculation fields" toggle for every product
 *  - live line table in the selected currency, no calculate button
 *  - save / reopen / list of IM quotes for the Opportunity
 *
 * Works on the Opportunity record page (recordId) or as a standalone tab
 * (pick an Opportunity first).
 */
import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import IM_CURRENCY from '@salesforce/schema/Quote.IM_Currency__c';
import getExchangeRatePrefill from '@salesforce/apex/InternationalQuoteController.getExchangeRatePrefill';
import getBootstrap from '@salesforce/apex/InternationalQuoteController.getBootstrap';
import getImQuotesByOpportunity from '@salesforce/apex/InternationalQuoteController.getImQuotesByOpportunity';
import getQuoteValueJson from '@salesforce/apex/InternationalQuoteController.getQuoteValueJson';
import saveImQuote from '@salesforce/apex/InternationalQuoteController.saveImQuote';

const PRODUCT_LABEL = { TT: 'Transmission Tower', CB: 'Crash Barrier', HM: 'High Mast', TEL: 'Telecom Tower' };
const LOCKED_STATUSES = ['Approved', 'Accepted', 'Presented', 'In Review'];

export default class InternationalQuote extends LightningElement {
    @api recordId;              // Opportunity Id when placed on the record page
    @api objectApiName;

    // config
    templateName = '';
    products = [];
    currencies = [];
    canCreate = true;
    denialMessage = '';

    // export setup (quote level)
    currencyCode = '';
    exchangeRate = null;
    rateSource = '';
    showCalc = false;

    // Currency list = the picklist itself. Master record type id is the
    // standard default for objects without record types.
    @wire(getPicklistValues, { recordTypeId: '012000000000000AAA', fieldApiName: IM_CURRENCY })
    wiredCurrency({ data }) {
        if (data) {
            this.currencies = data.values.map((v) => ({ label: v.label, value: v.value, code: v.value }));
            if (!this.currencyCode && data.defaultValue) this.applyCurrency(data.defaultValue.value);
        }
    }

    // state
    isLoading = true;
    isSaving = false;
    view = 'list';                 // list | editor
    @track quotes = [];
    quoteId = null;
    quoteNumber = '';
    quoteReference = '';
    quoteStatus = 'Draft';
    expirationDate = null;
    opportunityId = null;
    @track initialByProduct = {};  // product -> saved values (on reopen)
    @track linesByProduct = {};    // product -> lines (live)
    valuesByProduct = {};

    async connectedCallback() {
        this.opportunityId = this.recordId || null;
        try {
            const b = await getBootstrap();
            this.canCreate = b.canCreate !== false;
            this.denialMessage = b.denialMessage || '';
            this.templateName = b.templateName;
            this.products = (b.products || []).map((p) => ({ ...p, key: p.code, label: p.label }));
            if (this.opportunityId) await this.loadQuotes();
        } catch (e) {
            this.toast('Error', msg(e), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // ------------------------------------------------------------ list
    async loadQuotes() {
        this.quotes = (await getImQuotesByOpportunity({ opportunityId: this.opportunityId })).map((q) => ({
            ...q,
            key: q.Id,
            ref: q.Quote_Reference__c || q.QuoteNumber,
            money: q.Final_Quote_Amount__c != null ? `${codeOf(q.IM_Currency__c)} ${fmtN(q.Final_Quote_Amount__c)}` : '—',
            fx: codeOf(q.IM_Currency__c),
            created: q.CreatedDate ? new Date(q.CreatedDate).toLocaleDateString('en-IN') : ''
        }));
    }

    handleOppChange(event) {
        this.opportunityId = event.detail.recordId;
        if (this.opportunityId) this.loadQuotes();
    }

    newQuote() {
        this.quoteId = null; this.quoteNumber = ''; this.quoteReference = ''; this.quoteStatus = 'Draft';
        this.initialByProduct = {}; this.linesByProduct = {}; this.valuesByProduct = {};
        this.rateSource = '';
        if (this.currencyCode) this.applyCurrency(this.currencyCode); else if (this.currencies.length) this.applyCurrency(this.currencies[0].code);
        this.view = 'editor';
    }

    async openQuote(event) {
        const id = event.currentTarget.dataset.id;
        const q = this.quotes.find((x) => x.Id === id);
        this.isLoading = true;
        try {
            const raw = await getQuoteValueJson({ quoteId: id });
            const qv = raw ? JSON.parse(raw) : {};
            const exp = qv._IM_Export || {};
            this.quoteId = id;
            this.quoteNumber = q ? q.QuoteNumber : '';
            this.quoteReference = q ? q.Quote_Reference__c : '';
            this.quoteStatus = q ? q.Status : 'Draft';
            this.currencyCode = exp.currency_picklist || (q && q.IM_Currency__c) || exp.currency || '';
            this.exchangeRate = exp.exchange_rate != null ? exp.exchange_rate : null;
            this.rateSource = exp.rate_source || 'manual';
            const prods = qv._IM_Products || {};
            const init = {};
            Object.keys(prods).forEach((code) => { init[code] = prods[code].saved || {}; });
            this.initialByProduct = init;
            this.linesByProduct = {};
            this.view = 'editor';
        } catch (e) {
            this.toast('Error', msg(e), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    backToList() { this.view = 'list'; this.loadQuotes(); }

    // ------------------------------------------------------------ export setup
    handleCurrency(event) { this.applyCurrency(event.detail.value); }
    async applyCurrency(code) {
        this.currencyCode = code;
        // prefill: INR -> 1; else last saved rate in this currency; else admin default (IM_Settings__c)
        try {
            const p = await getExchangeRatePrefill({ currencyCode: code });
            if (this.currencyCode === code) { this.exchangeRate = p && p.rate != null ? p.rate : null; this.rateSource = (p && p.source) || ''; }
        } catch (e) { this.exchangeRate = code === 'INR' ? 1 : null; this.rateSource = code === 'INR' ? 'inr' : ''; }
    }
    handleRate(event) {
        const v = event.detail.value;
        this.exchangeRate = v === '' ? null : Number(v);
        this.rateSource = 'manual';
    }
    handleShowCalc(event) { this.showCalc = event.target.checked; }

    // ------------------------------------------------------------ lines
    handleLines(event) {
        const { product, lines, values } = event.detail;
        this.linesByProduct = { ...this.linesByProduct, [product]: lines };
        this.valuesByProduct[product] = values;
    }

    get rate() { return Number(this.exchangeRate) > 0 ? Number(this.exchangeRate) : null; }

    get allLines() {
        const out = [];
        Object.keys(this.linesByProduct).forEach((code) => {
            (this.linesByProduct[code] || []).forEach((l) => {
                const amount = (l.unitPrice || 0) * (l.quantity || 1);
                out.push({
                    key: l.id,
                    product: PRODUCT_LABEL[code] || code,
                    name: l.name,
                    qty: l.quantity,
                    unit: this.rate ? fmtN(l.unitPrice / this.rate) : '—',
                    amount: this.rate ? fmtN(amount / this.rate) : '—',
                    _amount: amount
                });
            });
        });
        return out;
    }
    get hasLines() { return this.allLines.length > 0; }
    get total() { const t = this.allLines.reduce((s, l) => s + l._amount, 0); return this.rate ? fmtN(t / this.rate) : '—'; }
    get fcLabel() { return this.currencyShort || ''; }
    get currencyShort() { return codeOf(this.currencyCode); }
    get isInr() { return this.currencyShort === 'INR'; }
    get rateHint() { return this.rateSource === 'inr' ? 'INR quote - no conversion' : this.rateSource === 'default' ? 'Prefilled from the rate card - edit if needed' : (this.rateSource === 'manual' ? 'Entered manually' : 'Enter today\'s rate'); }
    get isLocked() { return LOCKED_STATUSES.includes(this.quoteStatus); }
    get isEditor() { return this.view === 'editor'; }
    get isList() { return this.view === 'list'; }
    get needsOpp() { return !this.opportunityId; }
    get hasQuotes() { return this.quotes.length > 0; }
    get title() { return this.quoteReference || this.quoteNumber || 'New International Quote'; }
    // ---- one flag per product child; the tab is drawn only when enabled in metadata
    enabled(word) { return this.products.some((p) => (p.label || '').toLowerCase().includes(word)); }
    get hasTT() { return this.enabled('transmission'); }
    get hasCB() { return this.enabled('crash barrier'); }
    get hasHM() { return this.enabled('high mast'); }
    get hasTel() { return this.enabled('telecom'); }
    get initTT() { return this.initialByProduct.TT || null; }
    get initCB() { return this.initialByProduct.CB || null; }
    get initHM() { return this.initialByProduct.HM || null; }
    get initTel() { return this.initialByProduct.TEL || null; }

    // ------------------------------------------------------------ save
    async save() {
        if (this.isLocked) { this.toast('Locked', `Quote is ${this.quoteStatus}. Reopen to edit.`, 'warning'); return; }
        if (!this.currencyCode || !this.rate) { this.toast('Export setup', 'Select a currency and enter the exchange rate.', 'warning'); return; }
        const panels = this.template.querySelectorAll('[data-im-child]');
        let valid = true;
        const productsPayload = {};
        const finalLines = [];
        panels.forEach((p) => {
            if (!p.validate()) valid = false;
            const code = p.productCode;
            const st = p.getState();
            const lines = this.linesByProduct[code] || [];
            productsPayload[code] = {
                source_template: p.sourceTemplate,
                saved: st.values,
                lines
            };
            lines.forEach((l) => {
                const baseAmount = r2((l.unitPrice || 0) * (l.quantity || 1));
                const unitPrice  = r2(l.unitPrice / this.rate);          // in the selected currency
                const amount     = r2(baseAmount / this.rate);
                finalLines.push({
                    product: code,
                    name: l.name,
                    Product_Name: l.name,
                    quantity: l.quantity,
                    Quantity__c: l.quantity,
                    // what the offer prints - selected currency
                    currency: this.currencyShort,
                    exchangeRate: this.rate,
                    unitPrice,
                    unitCost: l.unitCost != null ? r2(l.unitCost / this.rate) : null,
                    amount,
                    Unit_Price__c: unitPrice,
                    Unit_Cost__c: l.unitCost != null ? r2(l.unitCost / this.rate) : null,
                    // internal base figures (rate-card currency) - approval threshold only
                    unitPriceBase: l.unitPrice,
                    unitCostBase: l.unitCost,
                    amountBase: baseAmount
                });
            });
        });
        if (!valid) { this.toast('Validation', 'Please fill the required fields.', 'warning'); return; }

        const totalBase = r2(finalLines.reduce((s, l) => s + l.amountBase, 0));
        const total     = r2(totalBase / this.rate);
        const payload = {
            _Saved_Template_Name: this.templateName,
            _Dynamic_Product_Name: 'International Marketing',
            _IM_Export: {
                currency: this.currencyShort, currency_picklist: this.currencyCode,
                exchange_rate: this.rate, rate_source: this.rateSource,
                total, total_base: totalBase, saved_on: new Date().toISOString()
            },
            _IM_Products: productsPayload,
            _Final_Apex_Lines: finalLines
        };

        this.isSaving = true;
        try {
            const r = await saveImQuote({
                quoteId: this.quoteId, opportunityId: this.opportunityId,
                quoteValueJson: JSON.stringify(payload),
                currencyCode: this.currencyCode, finalAmount: total,
                expirationDate: this.expirationDate
            });
            this.quoteId = r.quoteId; this.quoteNumber = r.quoteNumber; this.quoteReference = r.quoteReference;
            this.toast('Saved', r.quoteReference || r.quoteNumber, 'success');
        } catch (e) {
            this.toast('Save failed', msg(e), 'error');
        } finally {
            this.isSaving = false;
        }
    }

    toast(title, message, variant) { this.dispatchEvent(new ShowToastEvent({ title, message, variant })); }
}

/** picklist value may be 'USD' or 'USD - US Dollar'; the code is the part before ' - ' */
function codeOf(v) { return String(v || '').split(' - ')[0].trim().toUpperCase(); }
function msg(e) { return (e && e.body && e.body.message) || (e && e.message) || String(e); }
function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function fmtN(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }