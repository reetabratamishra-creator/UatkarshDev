/**
 * internationalQuote - International Marketing quote shell.
 *
 * Same navigation shape as the domestic createQuote: a left rail with
 * GENERATE QUOTE / QUOTES / RATES / PENDING APPROVALS, a dark header bar with
 * a back chevron, and the working area. Inside "Generate Quote" the product
 * tabs host one dedicated child per product (transmissionImConfig, ...).
 *
 *  - Currency: Quote.IM_Currency__c picklist; the rate comes from the rate
 *    card's IM row (Price_Calculator__mdt "International Marketing") and is
 *    frozen into the Quote_Value__c JSON on save.
 *  - RATES: users with rate-manager access edit the IM exchange rates here;
 *    the row is deployed through the Metadata API (a few seconds).
 *  - Quote summary (lines + total in the selected currency) sits in a side
 *    panel on desktop and below the config on mobile - never under the buttons.
 *  - PENDING APPROVALS: placeholder; approval process itself is unchanged.
 */
import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import IM_CURRENCY from '@salesforce/schema/Quote.IM_Currency__c';
import getBootstrap from '@salesforce/apex/InternationalQuoteController.getBootstrap';
import getImQuotesByOpportunity from '@salesforce/apex/InternationalQuoteController.getImQuotesByOpportunity';
import getQuoteValueJson from '@salesforce/apex/InternationalQuoteController.getQuoteValueJson';
import saveImQuote from '@salesforce/apex/InternationalQuoteController.saveImQuote';
import getExchangeRatePrefill from '@salesforce/apex/InternationalQuoteController.getExchangeRatePrefill';
import getExchangeRates from '@salesforce/apex/InternationalQuoteController.getExchangeRates';
import saveExchangeRates from '@salesforce/apex/InternationalQuoteController.saveExchangeRates';
import getImRateCard from '@salesforce/apex/InternationalQuoteController.getImRateCard';
import saveImRateCard from '@salesforce/apex/InternationalQuoteController.saveImRateCard';
import setApplied from '@salesforce/apex/InternationalQuoteController.setApplied';
import cloneQuote from '@salesforce/apex/InternationalQuoteController.cloneQuote';
import selfApproveQuote from '@salesforce/apex/InternationalQuoteController.selfApproveQuote';
import getOpportunityForClone from '@salesforce/apex/CreateQuoteController.getOpportunityForClone';
import searchOpportunitiesForClone from '@salesforce/apex/CreateQuoteController.searchOpportunitiesForClone';
import createRevision from '@salesforce/apex/InternationalQuoteController.createRevision';
import submitForApproval from '@salesforce/apex/InternationalQuoteController.submitForApproval';
import getApprovalDebug from '@salesforce/apex/InternationalQuoteController.getApprovalDebug';
import getApprovalTriggers from '@salesforce/apex/InternationalQuoteController.getApprovalTriggers';
import approveQuote from '@salesforce/apex/InternationalQuoteController.approveQuote';
import rejectQuote from '@salesforce/apex/InternationalQuoteController.rejectQuote';
import checkEscalation from '@salesforce/apex/InternationalQuoteController.checkEscalation';
import escalateQuote from '@salesforce/apex/InternationalQuoteController.escalateQuote';
import finalizeQuote from '@salesforce/apex/InternationalQuoteController.finalizeQuote';
import getOfferDocs from '@salesforce/apex/InternationalQuoteController.getOfferDocs';
import setImOfferType from '@salesforce/apex/InternationalQuoteController.setImOfferType';
import saveImDraft from '@salesforce/apex/InternationalQuoteController.saveImDraft';
import getMyImDrafts from '@salesforce/apex/InternationalQuoteController.getMyImDrafts';
import getDraftValueJson from '@salesforce/apex/InternationalQuoteController.getDraftValueJson';
import getImQuoteProducts from '@salesforce/apex/InternationalQuoteController.getImQuoteProducts';
import USER_ID from '@salesforce/user/Id';
import { NavigationMixin } from 'lightning/navigation';
import LightningConfirm from 'lightning/confirm';
import { RATE_CATALOGUE } from './imRateMaps';
// FORM_FACTOR no longer needed - the shared generator handles desktop/mobile itself

// HMC = the High Mast department with every mast type (cross product); HM = its Transmission Pole-only tab
const PRODUCT_LABEL = { TT: 'Transmission Tower', CB: 'Crash Barrier', HM: 'Transmission Pole', HMC: 'High Mast', TEL: 'Telecom Tower' };
// tab order = the order the tabs sit in the markup; the first one the user's departments allow opens by default
const TAB_ORDER = ['TT', 'CB', 'HMC', 'HM', 'TEL'];
// Rejected is locked too: like domestic, a rejected quote is edited only through Reopen -> revision
// Type of Offer (Generate Documents): the format family of the mapping rows. Blank row = Domestic.
const OFFER_TYPE_DEFAULT = 'Domestic';
const OFFER_TYPES = ['Domestic', 'International'];
const LOCKED_STATUSES = ['Approved', 'Accepted', 'Presented', 'In Review', 'Rejected'];

export default class InternationalQuote extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;

    // config
    templateName = '';
    products = [];
    currencies = [];
    canCreate = true;
    canManageRates = false;
    canViewApprovals = false;
    hasImAccess = true;
    isApprovalActive = true;
    denialMessage = '';

    // nav
    nav = 'generate';            // generate | quotes | rates | approvals
    // RATES screen: 'fx' = exchange rates (as before), 'base' = International base-rate cards
    rateMode = 'fx';
    baseDept = '';
    baseType = '';
    baseCard = null;             // ImRateCard from Apex (domestic reference + IM twin)
    @track baseRows = [];
    baseDirty = false;
    baseSaving = false;
    baseLoading = false;
    editorOpen = false;          // inside "generate": false = currency step, true = product editor

    // export setup
    currencyCode = '';
    exchangeRate = null;
    rateSource = '';
    rateError = '';
    showCalc = false;

    // quote state
    isLoading = true;
    isSaving = false;
    savingText = '';
    savingPct = 0;
    _setApplyStep(label, pct) { this.savingText = label; this.savingPct = pct; }
    // Every wait uses the APPLY card + stepped bar. _beginLoad opens it (or, when another masked
    // action already holds it, just advances that bar - never backwards); _endLoad closes only
    // what it opened, so a nested openQuote no longer drops the mask half-way through a reopen/clone.
    _loadStep(label, pct) { this.savingText = label; this.savingPct = Math.max(this.savingPct || 0, pct || 0); }
    _beginLoad(label, pct) {
        const outer = this.isSaving;
        if (!outer) { this.isSaving = true; this.savingPct = 0; }
        this._loadStep(label, pct);
        return outer;
    }
    _endLoad(outer) { if (!outer) { this.isSaving = false; this.savingText = ''; this.savingPct = 0; } }
    get progressStyle() { return 'width:' + (this.savingPct || 0) + '%;'; }
    @track quotes = [];
    quoteId = null;
    quoteNumber = '';
    quoteReference = '';
    quoteStatus = 'Draft';
    applied = false;          // APPLY pressed -> read-only until Reopen for Edit
    expirationDate = null;      // mandatory on APPLY, mirrored to Opportunity.CloseDate (domestic parity)
    expirationError = '';
    opportunityId = null;
    @track initialByProduct = {};
    @track linesByProduct = {};
    valuesByProduct = {};
    summaryOpen = true;
    summaryMobileOpen = false;
    routingReport = '';
    // which line(s) made the approval fire - frozen at submit, shown to submitter and approver
    approvalTriggers = [];
    triggerNames = [];          // stable array - passed to the children; rebuilt only in setTriggers()
    triggerMetrics = {};        // line name -> metric that matched (Margin / Discount / ...), same stability rule
    get hasApprovalTriggers() { return this.approvalTriggers.length > 0; }
    activeTab = 'TT';
    handleTabActive(event) { this.activeTab = event.target.value; this._toastDraftBlock(this.activeTab); }
    setTriggers(list) {
        const next = Array.isArray(list) ? list : [];
        const names = next.filter((t) => !t.isRoot).map((t) => t.itemName);
        this.approvalTriggers = next;
        // keep the SAME array reference when nothing changed, so the children see no new prop
        if (JSON.stringify(names) !== JSON.stringify(this.triggerNames)) this.triggerNames = names;
        const metrics = {};
        next.filter((t) => !t.isRoot && t.metric).forEach((t) => { metrics[t.itemName] = t.metric; });
        if (JSON.stringify(metrics) !== JSON.stringify(this.triggerMetrics)) this.triggerMetrics = metrics;
    }
    async loadApprovalTriggers() {
        // nothing before submission: a draft, an applied-not-submitted or a reopened quote shows no trigger
        const q = this.currentQuote;
        if (!this.quoteId || !q || q.isDraft || q.Status === 'Draft') { this.setTriggers([]); return; }
        const id = this.quoteId;
        try {
            const list = await getApprovalTriggers({ quoteId: id });
            if (this.quoteId === id) this.setTriggers(list);     // a late answer never lands on another quote
        } catch (e) { if (this.quoteId === id) this.setTriggers([]); }
    }
    @track applyErrors = [];    // [{field, where, message}] shown above the buttons after a failed Apply

    // approval
    showSubmitPopover = false;
    approvalMessage = '';
    approvalDueDate = null;
    showRejectModal = false;
    rejectionReason = '';
    escalationRequired = false;
    escalationTargetId = null;

    // rates screen
    @track rateRows = [];
    ratesDirty = false;
    ratesSaving = false;

    @wire(getPicklistValues, { recordTypeId: '012000000000000AAA', fieldApiName: IM_CURRENCY })
    wiredCurrency({ data }) {
        if (data) {
            this.currencies = data.values.map((v) => ({ label: v.label, value: v.value, code: v.value }));
            // picklist default if the org has one, else the first value - never leave the rate blank on load
            if (!this.currencyCode) {
                const first = (data.defaultValue && data.defaultValue.value) || (this.currencies.length ? this.currencies[0].value : '');
                if (first) this.applyCurrency(first);
            }
        }
    }

    // ---- mobile breakout: measure where the host sits and pull it to the viewport's left edge (CSS uses --im-left)
    _onResize = () => this.measureOffset();
    renderedCallback() { this.measureOffset(); }
    measureOffset() {
        const host = this.template.host;
        if (!host) return;
        if (window.innerWidth > 600) { host.style.removeProperty('--im-left'); return; }
        // reset first so the measurement is of the natural position, not the already-shifted one
        host.style.setProperty('--im-left', '0px');
        const left = host.getBoundingClientRect().left;
        host.style.setProperty('--im-left', Math.max(0, Math.round(left)) + 'px');
    }

    async connectedCallback() {
        window.addEventListener('resize', this._onResize);
        this.opportunityId = this.recordId || null;
        this._loadStep('Loading International Quote…', 15);
        try {
            const b = await getBootstrap();
            this._loadStep('Loading quotes…', 55);
            this.canCreate = b.canCreate !== false;
            this.canManageRates = b.canManageRates === true;
            this.canViewApprovals = b.canViewApprovals === true;
            this.hasImAccess = b.hasImAccess === true;
            this.isApprovalActive = b.isApprovalActive !== false;
            this.denialMessage = b.denialMessage || '';
            this.templateName = b.templateName;
            this.products = (b.products || []).map((p) => ({ ...p, key: p.code }));
            // open on the first product tab this user actually has (a High Mast-only user must not land on an absent TT tab)
            const firstTab = TAB_ORDER.find((c) => this.hasProduct(c));
            if (firstTab && !this.hasProduct(this.activeTab)) this.activeTab = firstTab;
            if (this.opportunityId) await this.loadQuotes();
            if (this.opportunityId) this.loadMyDrafts();          // nav dot - async, never blocks
            if (this.currencyCode && this.exchangeRate == null) this.applyCurrency(this.currencyCode);
            this._loadStep('Almost ready…', 90);
        } catch (e) {
            this.toast('Error', msg(e), 'error');
        } finally {
            this.isLoading = false;
            this.savingText = ''; this.savingPct = 0;
        }
    }

    disconnectedCallback() { window.removeEventListener('resize', this._onResize); }

    // ------------------------------------------------------------ nav
    goGenerate() { this.nav = 'generate'; }
    goQuotes() { this.nav = 'quotes'; this.loadQuotes(); }
    goRates() { this.nav = 'rates'; this.loadRates(); }
    goApprovals() { this.nav = 'approvals'; this.loadQuotes(); }
    goDrafts() { this.nav = 'drafts'; this.loadMyDrafts(); }
    back() {
        if (this.nav === 'generate' && this.editorOpen) { this.editorOpen = false; return; }
        this.nav = 'generate';
    }
    get blocked() { return !this.hasImAccess || !this.canCreate; }
    get isGenerate() { return this.nav === 'generate'; }
    get isQuotes() { return this.nav === 'quotes'; }
    get isRates() { return this.nav === 'rates'; }
    get isApprovals() { return this.nav === 'approvals'; }
    get isDrafts() { return this.nav === 'drafts'; }
    get navDraftsCls() { return 'im-nav-item' + (this.isDrafts ? ' im-nav-item_active' : ''); }
    get navGenerateCls() { return 'im-nav-item' + (this.isGenerate ? ' im-nav-item_active' : ''); }
    get navQuotesCls() { return 'im-nav-item' + (this.isQuotes ? ' im-nav-item_active' : ''); }
    get navRatesCls() { return 'im-nav-item' + (this.isRates ? ' im-nav-item_active' : ''); }
    get navApprovalsCls() { return 'im-nav-item' + (this.isApprovals ? ' im-nav-item_active' : ''); }
    get headerTitle() {
        if (this.isQuotes) return 'INTERNATIONAL QUOTES';
        if (this.isRates) return this.rateMode === 'base' ? 'BASE RATES' : 'EXCHANGE RATES';
        if (this.isApprovals) return 'PENDING APPROVALS';
        if (this.isDrafts) return 'DRAFT QUOTES';
        return this.editorOpen ? (this.headerQuoteNo || 'NEW INTERNATIONAL QUOTE') : 'CURRENCY SELECTION';
    }
    /** A revision's reference carries the ORIGINAL quote's number (UIL/IM/<FY>/<root no>/Rn - the 3 Sep
     *  reference rule), so on a revision the header shows THIS record's own Quote Number; the R1/R2 pill
     *  beside it and the ORIGINAL QUOTE line below already give the lineage. R0: reference as before. */
    get headerQuoteNo() {
        const q = this.currentQuote;
        const isRevision = !!(q && (q.Original_Quote__c || Number(q.Revision_No__c) > 0));
        if (isRevision) return this.quoteNumber || q.QuoteNumber || this.quoteReference;
        return this.quoteReference || this.quoteNumber;
    }
    get showBack() { return !this.isGenerate || this.editorOpen; }
    get showEditor() { return this.isGenerate && this.editorOpen; }
    get showCurrencyStep() { return this.isGenerate && !this.editorOpen; }

    // ------------------------------------------------------------ quotes list
    async loadQuotes() {
        if (!this.opportunityId) return;
        this.quotes = (await getImQuotesByOpportunity({ opportunityId: this.opportunityId })).map((q) => ({
            ...q, key: q.Id,
            ref: q.Quote_Reference__c || q.QuoteNumber,
            currency: codeOf(q.IM_Currency__c),
            money: q.Final_Quote_Amount__c != null ? fmtN(q.Final_Quote_Amount__c) : '—',
            created: q.CreatedDate ? new Date(q.CreatedDate).toLocaleDateString('en-IN') : '',
            badgeCls: 'im-badge im-badge_' + String(q.Status || 'draft').toLowerCase().replace(/\s+/g, '-'),
            rev: Number(q.Revision_No__c) ? 'R' + Number(q.Revision_No__c) : 'R0',
            approvedBy: q.approved_by__r ? q.approved_by__r.Name : '',
            finalized: !!q.IsSyncing,
            isDraft: q.Is_Draft__c === true,
            clonedFrom: q.Cloned__c ? (q.Original_Quote_Number_After_Cloned__c || '') : '',
            statusStyle: statusStyle(q.Status),
            hasRejectionReason: q.Status === 'Rejected' && !!(q.Rejection_Reason__c && String(q.Rejection_Reason__c).trim()),
            rejectionTooltip: buildRejectionTooltip(q),
            submitterName: (q.Approval_Submitted_By__r && q.Approval_Submitted_By__r.Name) || (q.CreatedBy && q.CreatedBy.Name) || 'System',
            // the shared c-pending-approvals-list reads uiApprovalDueDate
            uiApprovalDueDate: q.Approval_Due_Date__c ? new Date(q.Approval_Due_Date__c).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
            dueDate: q.Approval_Due_Date__c ? new Date(q.Approval_Due_Date__c).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
            pendingForMe: q.Status === 'In Review' && !!q.Pending_Approver__c && q.Pending_Approver__c === USER_ID,
            productLabel: ''            // filled by loadQuoteProducts (PRODUCT column)
        }));
        this.loadQuoteProducts();       // async, never blocks the list
        // the open quote's status may have changed (submit / approve / reject)
        if (this.quoteId) {
            const cur = this.quotes.find((x) => x.Id === this.quoteId);
            if (cur) { this.quoteStatus = cur.Status; this.quoteReference = cur.Quote_Reference__c || this.quoteReference; }
            await this.refreshEscalation();
        }
    }
    /** PRODUCT column: which department(s) each quote carries - "Transmission Pole", "Crash Barrier", "Transmission Tower" */
    async loadQuoteProducts() {
        if (!this.opportunityId) return;
        try {
            const map = (await getImQuoteProducts({ opportunityId: this.opportunityId })) || {};
            this.quotes = this.quotes.map((q) => {
                const codes = map[q.Id] || [];
                return { ...q, productLabel: codes.map((c) => PRODUCT_LABEL[c] || c).join(' + ') };
            });
        } catch (e) { console.error('IM product column', msg(e)); }
    }
    get currentQuote() { return this.quotes.find((x) => x.Id === this.quoteId) || null; }

    // Families for the Quotes tab: one MAIN row per family (latest revision),
    // older versions nested under a chevron. Same grouping as createQuote:
    // key = Original_Quote__c (blank on R0 = its own Id); families open by default.
    collapsedFamilies = [];
    get familyQuotes() {
        const byRoot = new Map();
        this.quotes.forEach((q) => { const root = q.Original_Quote__c || q.Id; if (!byRoot.has(root)) byRoot.set(root, []); byRoot.get(root).push(q); });
        const families = [];
        byRoot.forEach((members, root) => {
            members.sort((a, b) => (Number(b.Revision_No__c) || 0) - (Number(a.Revision_No__c) || 0));
            const head = { ...members[0] };
            const older = members.slice(1).map((v) => ({ ...v, revLabel: 'R' + (Number(v.Revision_No__c) || 0), originalTag: (Number(v.Revision_No__c) || 0) === 0 ? 'ORIGINAL' : '' }));
            head.rootId = root;
            head.hasOlder = older.length > 0;
            head.versionChip = older.length > 0 ? members.length + ' versions' : '';
            head.isExpanded = !this.collapsedFamilies.includes(root);
            head.chevronIcon = head.isExpanded ? 'utility:chevrondown' : 'utility:chevronright';
            head.latestTag = older.length > 0 ? 'LATEST' : '';
            head.olderVersions = older;
            families.push(head);
        });
        families.sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate));
        return families;
    }
    toggleFamily(event) {
        event.stopPropagation();
        const root = event.currentTarget.dataset.root;
        this.collapsedFamilies = this.collapsedFamilies.includes(root) ? this.collapsedFamilies.filter((r) => r !== root) : [...this.collapsedFamilies, root];
    }
    get pendingQuotes() { return this.quotes.filter((q) => q.pendingForMe); }
    get hasPendingApprovals() { return this.pendingQuotes.length > 0; }
    get pendingCount() { return this.pendingQuotes.length; }
    handleOppChange(event) { this.opportunityId = event.detail.recordId; if (this.opportunityId) this.loadQuotes(); }

    newQuote() {
        this.quoteId = null; this.quoteNumber = ''; this.quoteReference = ''; this.quoteStatus = 'Draft'; this.applied = false; this.setTriggers([]);
        this.offerType = OFFER_TYPE_DEFAULT;
        this.expirationDate = null; this.expirationError = '';
        this.initialByProduct = {}; this.linesByProduct = {}; this.valuesByProduct = {};
        this.draftSavedAt = ''; this._draftToasted = {}; this._draftSession += 1;
        if (this.currencyCode) this.applyCurrency(this.currencyCode); else if (this.currencies.length) this.applyCurrency(this.currencies[0].code);
        this.nav = 'generate'; this.editorOpen = false;
    }
    startEditor() {
        if (!this.currencyCode || !this.rate) { this.toast('Currency', this.rateError || 'Select a currency with a rate in the rate card.', 'warning'); return; }
        this.editorOpen = true;
        this._draftToasted = {};
        this._toastDraftBlock(this.activeTab);
    }

    async openQuote(event) {
        const id = event.currentTarget.dataset.id;
        const q = this.quotes.find((x) => x.Id === id);
        const outer = this._beginLoad('Opening quote…', 20);
        try {
            const raw = (q && q.isDraft) ? await getDraftValueJson({ quoteId: id }) : await getQuoteValueJson({ quoteId: id });
            this._loadStep('Loading quote data…', 60);
            const qv = raw ? JSON.parse(raw) : {};
            const exp = qv._IM_Export || {};
            this.quoteId = id;
            this.loadApprovalTriggers();   // async, fills the highlight once the quote is open
            this.quoteNumber = q ? q.QuoteNumber : '';
            this.quoteReference = q ? q.Quote_Reference__c : '';
            this.quoteStatus = q ? q.Status : 'Draft';
            this.currencyCode = exp.currency_picklist || (q && q.IM_Currency__c) || exp.currency || '';
            this.exchangeRate = exp.exchange_rate != null ? exp.exchange_rate : null;
            this.rateSource = exp.rate_source || 'saved';
            this.offerType = exp.offer_type || OFFER_TYPE_DEFAULT;
            this.rateError = '';
            this.applied = exp.applied === true;
            this.draftSavedAt = ''; this._draftSession += 1;
            this.expirationDate = qv._Expiration_Date || (q && q.ExpirationDate) || null;
            this.expirationError = '';
            const prods = qv._IM_Products || {};
            const init = {};
            Object.keys(prods).forEach((code) => { init[code] = prods[code].saved || {}; });
            this.initialByProduct = init;
            this.linesByProduct = {};
            // land on the tab of the department this quote belongs to (its other tabs are blocked anyway)
            const dept = Object.keys(init)[0];
            if (dept && this.hasProduct(dept)) this.activeTab = dept;
            this._loadStep('Preparing editor…', 90);
            this.nav = 'generate'; this.editorOpen = true;
        } catch (e) {
            this.toast('Error', msg(e), 'error');
        } finally {
            this._endLoad(outer);
        }
    }

    // ------------------------------------------------------------ currency
    handleCurrency(event) { this.applyCurrency(event.target.value); }
    async applyCurrency(code) {
        this.currencyCode = code;
        this.rateError = '';
        try {
            const p = await getExchangeRatePrefill({ currencyCode: code });
            if (this.currencyCode !== code) return;
            this.exchangeRate = p && p.rate != null ? p.rate : null;
            this.rateSource = (p && p.source) || '';
            if (this.exchangeRate == null) this.rateError = `No rate for ${codeOf(code)} in the rate card. Add it under RATES.`;
        } catch (e) { this.exchangeRate = null; this.rateSource = ''; this.rateError = msg(e); }
    }
    get currencyOptions() { return this.currencies.map((c) => ({ ...c, selected: c.value === this.currencyCode })); }
    get currencyShort() { return codeOf(this.currencyCode); }
    get isInr() { return this.currencyShort === 'INR'; }
    get rate() { return Number(this.exchangeRate) > 0 ? Number(this.exchangeRate) : null; }
    get rateDisplay() { return this.rate ? `1 ${this.currencyShort} = ₹ ${this.rate}` : '—'; }
    get rateHint() {
        if (this.rateSource === 'inr') return 'INR quote - no conversion';
        if (this.rateSource === 'default') return 'From rate card - frozen with this quote on save';
        if (this.rateSource === 'saved') return 'Frozen with this quote';
        return '';
    }
    get fcLabel() { return this.currencyShort || ''; }
    handleShowCalc(event) { this.showCalc = event.target.checked; }
    handleExpiration(event) { this.expirationDate = event.target.value || null; this.expirationError = ''; }
    get expirationCls() { return 'im-input im-input_date' + (this.expirationError ? ' im-invalid' : ''); }
    get todayIso() { return new Date().toISOString().slice(0, 10); }
    toggleSummary() { this.summaryOpen = !this.summaryOpen; }
    toggleMobileSummary() { this.summaryMobileOpen = !this.summaryMobileOpen; }
    get mobileSummaryChev() { return this.summaryMobileOpen ? 'utility:chevrondown' : 'utility:chevronup'; }

    // ------------------------------------------------------------ products
    enabled(word) { return this.products.some((p) => (p.label || '').toLowerCase().includes(word)); }
    get hasTT() { return this.enabled('transmission'); }
    get hasCB() { return this.enabled('crash barrier'); }
    get hasHM() { return this.enabled('high mast'); }
    get hasTel() { return this.enabled('telecom'); }
    get hasHMC() { return this.hasHM; }      // same department, same IM_Enabled flag
    hasProduct(code) { return code === 'TT' ? this.hasTT : (code === 'CB' ? this.hasCB : (code === 'HM' || code === 'HMC' ? this.hasHM : (code === 'TEL' ? this.hasTel : false))); }
    get noProducts() { return this.products.length === 0; }
    get initTT() { return this.initialByProduct.TT || null; }
    get initCB() { return this.initialByProduct.CB || null; }
    get initHM() { return this.initialByProduct.HM || null; }
    get initHMC() { return this.initialByProduct.HMC || null; }
    get initTEL() { return this.initialByProduct.TEL || null; }

    // ---- ONE DEPARTMENT PER QUOTE (Deepanjan, 10 Sep 2026) ----
    // A quote belongs to the first product department that got lines on it
    // (cross product is allowed INSIDE that department - e.g. all six MBCB types -
    // never across departments). Any other department's tab is blocked at once,
    // and Apply refuses too (server side as well).
    get quoteDepartment() {
        const saved = Object.keys(this.initialByProduct || {});
        if (saved.length) return saved[0];
        const live = Object.keys(this.linesByProduct || {}).filter((c) => (this.linesByProduct[c] || []).length);
        return live.length ? live[0] : null;
    }
    isBlockedFor(code) { const d = this.quoteDepartment; return !!d && d !== code; }
    get ttBlocked() { return this.isBlockedFor('TT'); }
    get cbBlocked() { return this.isBlockedFor('CB'); }
    get hmBlocked() { return this.isBlockedFor('HM'); }
    get hmcBlocked() { return this.isBlockedFor('HMC'); }
    get telBlocked() { return this.isBlockedFor('TEL'); }
    get blockedMessage() {
        const d = this.quoteDepartment;
        return `This quote is a ${PRODUCT_LABEL[d] || d} quote. Another department cannot be added to the same quote - create a separate International quote for it.`;
    }

    // ------------------------------------------------------------ lines / summary
    handleLines(event) {
        const { product, lines, values } = event.detail;
        this.linesByProduct = { ...this.linesByProduct, [product]: lines };
        this.valuesByProduct[product] = values;
    }
    get allLines() {
        const out = [];
        Object.keys(this.linesByProduct).forEach((code) => {
            (this.linesByProduct[code] || []).forEach((l) => {
                const amount = (l.unitPrice || 0) * (l.quantity || 1);
                out.push({
                    key: l.id, code, product: PRODUCT_LABEL[code] || code, name: l.name, qty: l.quantity,
                    unit: this.rate ? fmtN(l.unitPrice / this.rate) : '—',
                    amount: this.rate ? fmtN(amount / this.rate) : '—',
                    _amount: amount
                });
            });
        });
        return out;
    }
    get hasLines() { return this.allLines.length > 0; }
    get hasApplyErrors() { return this.applyErrors.length > 0; }
    get applyErrorCount() { return this.applyErrors.length; }
    dismissErrors() { this.applyErrors = []; }
    clearRoutingReport() { this.routingReport = ''; }
    get lineCount() { return this.allLines.length; }
    get total() { const t = this.allLines.reduce((s, l) => s + l._amount, 0); return this.rate ? fmtN(t / this.rate) : '—'; }
    get isStatusLocked() { return LOCKED_STATUSES.includes(this.quoteStatus); }
    get isInReview() { return this.quoteStatus === 'In Review'; }
    get isApproved() { return this.quoteStatus === 'Approved'; }
    get isRejected() { return this.quoteStatus === 'Rejected'; }
    get isFinalized() { const q = this.currentQuote; return !!(q && q.IsSyncing); }
    get isPendingForMe() { const q = this.currentQuote; return !!(q && q.pendingForMe); }
    // a saved Draft can be submitted - it does not have to be re-applied first
    get canSubmit() { return this.isApprovalActive && this.isCurrentQuoteOwner && !!this.quoteId && this.quoteStatus === 'Draft' && !this.isDraftQuote; }
    get canSelfApprove() { return !this.isApprovalActive && this.isCurrentQuoteOwner && !!this.quoteId && this.quoteStatus === 'Draft' && !this.isDraftQuote; }
    async handleSelfApprove() {
        await this.runChain('Approving quote…', async () => { await selfApproveQuote({ quoteId: this.quoteId }); this.toast('Approved', 'Quote approved successfully!', 'success'); }, 'Approval failed.');
    }
    get showApprove() { return this.isPendingForMe && !(this.escalationRequired && this.escalationTargetId && this.escalationTargetId !== USER_ID); }
    get showEscalate() { return this.isPendingForMe && this.escalationRequired && this.escalationTargetId && this.escalationTargetId !== USER_ID; }
    get showReject() { return this.isPendingForMe; }
    get showFinalize() { return this.isApproved && !this.isFinalized; }
    get showExportPdf() { return !!this.quoteId && !this.isDraftQuote; }
    get rejectionReasonShown() { const q = this.currentQuote; return this.isRejected && q && q.Rejection_Reason__c ? q.Rejection_Reason__c : ''; }
    get isRejectConfirmDisabled() { return !this.rejectionReason || !this.rejectionReason.trim(); }
    // ---- approver card (domestic quote-card block) ----
    isApproverHovered = false;
    isHoverDropdownExpanded = false;
    handleApproverHoverEnter() { clearTimeout(this._hoverTimer); this.isApproverHovered = true; }
    handleApproverHoverLeave() {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._hoverTimer = setTimeout(() => { this.isApproverHovered = false; this.isHoverDropdownExpanded = false; }, 300);
    }
    toggleHoverDropdown(event) { if (event) event.stopPropagation(); this.isHoverDropdownExpanded = !this.isHoverDropdownExpanded; }
    get hoverDropdownIcon() { return this.isHoverDropdownExpanded ? 'utility:chevrondown' : 'utility:chevronright'; }
    get approverName() {
        const q = this.currentQuote;
        if (q && q.approved_by__c && q.approved_by__r && q.approved_by__r.Name) return q.approved_by__r.Name;
        return 'System (Self-Approved)';
    }
    get submitterName() {
        const q = this.currentQuote;
        return (q && q.CreatedBy && q.CreatedBy.Name) || 'System';
    }
    get formattedSubmissionDate() {
        const q = this.currentQuote;
        if (!q || !q.submition_date__c) return 'N/A';
        return new Date(q.submition_date__c).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    get approvalComments() { const q = this.currentQuote; return (q && q.Description) || 'No comments provided.'; }
    get showApproverCard() { return this.isApproved && this.isCurrentQuoteOwner; }

    // ---- revision child header (root number above this quote's own) ----
    get isRevisionChild() { const q = this.currentQuote; return !!(q && q.Original_Quote__c); }
    get originalQuoteNumber() {
        const q = this.currentQuote;
        if (!q || !q.Original_Quote__c) return '';
        const root = this.quotes.find((x) => x.Id === q.Original_Quote__c);
        return root ? (root.Quote_Reference__c || root.QuoteNumber) : '';
    }

    // ---- ownership: only the creator may edit / apply / submit (domestic rule) ----
    get isCurrentQuoteOwner() {
        if (!this.quoteId) return true;                       // brand-new quote in this session
        const q = this.currentQuote;
        return q ? q.CreatedById === USER_ID : true;
    }
    get notOwnerHint() { return this.isCurrentQuoteOwner ? '' : 'This quote was created by ' + this.submitterName + ' - only the creator can edit it.'; }

    get pendingApproverName() { const q = this.currentQuote; return (q && q.Pending_Approver__r && q.Pending_Approver__r.Name) || 'no approver matched - check the approval matrix'; }
    get isLocked() { return this.isStatusLocked || this.applied; }
    get canApply() { return !this.isLocked && this.isCurrentQuoteOwner; }
    // domestic canEditQuote: editing/reopening is possible on Draft, Rejected and Approved -
    // never while the quote is In Review (it is sitting with the approver).
    // domestic showReopenFallback: Approved / Rejected can ALWAYS be revised, whatever
    // the applied flag says; a Draft is reopened only to unlock it.
    get canReopen() { return this.isCurrentQuoteOwner && !!this.quoteId && !this.hasNewerRevision && !this.isInReview && (this.applied || this.isRejected || this.isApproved); }
    get reopenBlockTitle() { return this.hasNewerRevision ? 'Already revised - open the latest revision to make changes.' : 'Re-open this quote for editing'; }
    get showReopenBlocked() { return this.hasNewerRevision && (this.isApproved || this.isRejected); }
    // Clone only on the finalized (IsSyncing) quote - domestic rule
    get canClone() { return this.isFinalized && this.isCurrentQuoteOwner; }
    // a quote that already has a revision can't be reopened again (linear chain) - open the latest revision
    get hasNewerRevision() { return !!this.quoteId && this.quotes.some((q) => q.Previous_Revision__c === this.quoteId); }
    get revisionLabel() { const q = this.currentQuote; const n = q ? Number(q.Revision_No__c) || 0 : 0; return n ? 'R' + n : ''; }
    get approvedByName() { const q = this.currentQuote; return q && q.approved_by__r ? q.approved_by__r.Name : ''; }
    get lockHint() { if (this.isDraftQuote) return 'Draft - fill the Expiration Date and press Apply when ready'; if (this.quoteStatus === 'Draft' && !this.applied && this.quoteId) return 'Reopened - make your changes, press Apply, then Submit for Approval'; if (this.isInReview) return 'Quote is with the approver - it can be edited again only after approval or rejection'; if (this.hasNewerRevision) return 'Already revised - open the latest revision to make changes'; return this.isStatusLocked ? `Quote is ${this.quoteStatus} - Reopen creates a revision` : (this.applied ? 'Applied - Reopen for Edit to change' : ''); }
    get needsOpp() { return !this.opportunityId; }
    get hasQuotes() { return this.quotes.length > 0; }
    get quotesCount() { return this.quotes.length; }
    get totalQuotesAmount() {
        const t = this.quotes.reduce((sum, q) => sum + (Number(q.Final_Quote_Amount__c) || 0), 0);
        return fmtN(t);
    }
    get summaryCls() { return 'im-summary' + (this.summaryOpen ? '' : ' im-summary_collapsed') + (this.summaryMobileOpen ? ' im-summary_mopen' : ''); }
    get summaryChev() { return this.summaryOpen ? 'utility:chevronright' : 'utility:chevronleft'; }

    // ------------------------------------------------------------ DRAFT (domestic parity, 21 Sep 2026)
    // SAVE AS DRAFT (button only - no auto-save) keeps everything typed so far in
    // Quote_Value__c with Is_Draft__c = true: no Expiration Date, no validation, no
    // line items, no total, no Opportunity change. The first press creates the Quote.
    // A draft opens in edit mode, never goes to approval, and APPLY clears the flag.
    // Starting a new quote while one of MY drafts on this opportunity holds a
    // department: that department's tab is blocked (toast + Open draft); the other
    // department stays free. "+ New" only informs.
    @track myDrafts = [];
    isSavingDraft = false;
    draftSavedAt = '';
    showDraftPrompt = false;
    _draftToasted = {};
    _newQuoteBusy = false;
    _draftSession = 0;                  // bumps on New / Open, so a late draft save never lands on another quote

    get isDraftQuote() { const q = this.currentQuote; return !!(this.quoteId && q && q.isDraft); }
    /** only a never-applied quote takes a draft save - an applied quote's JSON is what PDF/approval read */
    get canSaveDraft() {
        return this.showEditor && !this.isLocked && this.isCurrentQuoteOwner && !this.isInReview
            && (!this.quoteId || this.isDraftQuote);
    }
    get saveDraftLabel() { return this.isSavingDraft ? 'Saving…' : 'Save as Draft'; }
    get saveDraftDisabled() { return this.isSavingDraft || this.isSaving; }
    get hasMyDrafts() { return this.myDrafts.length > 0; }
    get myDraftCount() { return this.myDrafts.length; }

    async loadMyDrafts() {
        if (!this.opportunityId) { this.myDrafts = []; return this.myDrafts; }
        try {
            const rows = await getMyImDrafts({ opportunityId: this.opportunityId });
            this.myDrafts = (rows || []).map((d) => ({
                ...d, key: d.quoteId,
                products: d.products || [],
                productLabel: (d.products || []).map((c) => PRODUCT_LABEL[c] || c).join(' + ') || 'No product yet',
                savedLabel: fmtWhen(d.lastSaved),
                createdLabel: fmtWhen(d.created),
                currency: codeOf(d.currencyCode)
            }));
        } catch (e) {
            // a failed check must never stop anyone from working - same as domestic
            console.error('IM draft check failed', msg(e));
            return null;                    // caller treats "unknown" as "no drafts"
        }
        return this.myDrafts;
    }

    /** MY draft that holds this department - only while building a brand-new quote */
    draftFor(code) {
        if (this.quoteId) return null;
        return this.myDrafts.find((d) => d.products.includes(code)) || null;
    }
    get ttDraft() { return this.draftFor('TT'); }
    get cbDraft() { return this.draftFor('CB'); }
    get hmDraft() { return this.draftFor('HM'); }
    get hmcDraft() { return this.draftFor('HMC'); }
    get telDraft() { return this.draftFor('TEL'); }
    get ttDraftBlocked() { return !!this.ttDraft; }
    get cbDraftBlocked() { return !!this.cbDraft; }
    get hmDraftBlocked() { return !!this.hmDraft; }
    get hmcDraftBlocked() { return !!this.hmcDraft; }
    get telDraftBlocked() { return !!this.telDraft; }
    get ttDraftId() { const d = this.ttDraft; return d ? d.quoteId : ''; }
    get cbDraftId() { const d = this.cbDraft; return d ? d.quoteId : ''; }
    get hmDraftId() { const d = this.hmDraft; return d ? d.quoteId : ''; }
    get hmcDraftId() { const d = this.hmcDraft; return d ? d.quoteId : ''; }
    get telDraftId() { const d = this.telDraft; return d ? d.quoteId : ''; }
    get ttDraftMessage() { return this._draftBlockText('TT'); }
    get cbDraftMessage() { return this._draftBlockText('CB'); }
    get hmDraftMessage() { return this._draftBlockText('HM'); }
    get hmcDraftMessage() { return this._draftBlockText('HMC'); }
    get telDraftMessage() { return this._draftBlockText('TEL'); }
    _draftBlockText(code) {
        const d = this.draftFor(code);
        return d ? `You already have a ${PRODUCT_LABEL[code] || code} quotation in draft (${d.quoteNumber}, saved ${d.savedLabel}) on this opportunity. Open it to continue.` : '';
    }
    _toastDraftBlock(code) {
        const d = this.draftFor(code);
        if (!d || !this.showEditor || this._draftToasted[code]) return;
        this._draftToasted = { ...this._draftToasted, [code]: true };
        this.toast('Draft already exists', `A ${PRODUCT_LABEL[code] || code} quotation is already in draft (${d.quoteNumber}). A new one cannot be created for the same department.`, 'warning');
    }

    /** "+ New International Quote": fresh server check, then inform (never blocks here) */
    async handleNewQuote() {
        if (this._newQuoteBusy) return;
        this._newQuoteBusy = true;
        const outer = this._beginLoad('Checking drafts…', 40);
        try {
            const drafts = await this.loadMyDrafts();
            if (drafts && drafts.length) { this.showDraftPrompt = true; return; }
            this.newQuote();
        } finally {
            this._newQuoteBusy = false;
            this._endLoad(outer);
        }
    }
    closeDraftPrompt() { this.showDraftPrompt = false; }
    createNewAnyway() { this.showDraftPrompt = false; this.newQuote(); }

    /** CONTINUE / Open draft: the list must know the draft before openQuote reads it */
    async continueDraft(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this.showDraftPrompt = false;
        const outer = this._beginLoad('Loading draft…', 15);
        try {
            if (!this.quotes.some((x) => x.Id === id)) await this.loadQuotes();
            if (!this.quotes.some((x) => x.Id === id)) { this.toast('Draft', 'This draft could not be found - it may have been applied already.', 'error'); return; }
            await this.openQuote({ currentTarget: { dataset: { id } } });
        } finally {
            this._endLoad(outer);
        }
    }

    /**
     * The rest of a createQuote line (Deepanjan, 29th September 2026): expenses on EVERY line (0
     * when none - the Crash Barrier "Accessory:" approval rule reads it; the High Mast freight lump
     * sum carries its amount there), the unit list price, and which lines are extra (CB accessory /
     * misc, HM freight). Quote currency like unitPrice, rate-card figure in ...Base for approval.
     */
    _lineExtras(l) {
        const exp = Number(l.expenses) || 0;
        const out = { expenses: r2(exp / this.rate), expensesBase: exp };
        const list = Number(l.listPrice) || 0;
        if (list > 0) { out.unitListPrice = r2(list / this.rate); out.unitListPriceBase = list; }
        if (l.isExtra) out.isExtra = true;
        return out;
    }

    /** the same product/line shape APPLY writes, minus validation and minus the total */
    _buildDraftPayload() {
        const panels = this.template.querySelectorAll('[data-im-child]');
        const withLines = Object.keys(this.linesByProduct).filter((c) => (this.linesByProduct[c] || []).length);
        // the department this draft holds: products with lines, else the tab being worked on
        const draftProducts = withLines.length ? withLines : (this.activeTab ? [this.activeTab] : []);
        const productsPayload = {};
        const finalLines = [];
        panels.forEach((p) => {
            const code = p.productCode;
            if (!draftProducts.includes(code) || this.isBlockedFor(code) || this.draftFor(code)) return;   // never into a blocked department
            const st = p.getState();
            productsPayload[code] = { source_template: p.sourceTemplate, saved: st.values };
            if (p.docProduct) productsPayload[code].doc_product = p.docProduct;
            (this.linesByProduct[code] || []).forEach((l) => {
                const baseAmount = r2((l.unitPrice || 0) * (l.quantity || 1));
                const unitPrice = r2(l.unitPrice / this.rate);
                finalLines.push({
                    product: code, name: l.name, Product_Name: l.name,
                    quantity: l.quantity, Quantity__c: l.quantity,
                    currency: this.currencyShort, exchangeRate: this.rate,
                    unitPrice, unitCost: l.unitCost != null ? r2(l.unitCost / this.rate) : null, amount: r2(baseAmount / this.rate),
                    Unit_Price__c: unitPrice, Unit_Cost__c: l.unitCost != null ? r2(l.unitCost / this.rate) : null,
                    unitPriceBase: l.unitPrice, unitCostBase: l.unitCost, amountBase: baseAmount,
                    margin: l.margin || 0, discount: l.discount || 0, realization: l.realization || 0, weight: l.weight || 0,
                    uom: l.uom || 'EA',
                    ...(l._hmKey ? { _hmKey: l._hmKey } : {}),
                    ...this._lineExtras(l)
                });
            });
        });
        const payload = {
            _Saved_Template_Name: this.templateName,
            _Dynamic_Product_Name: 'International Marketing',
            _IM_Export: { currency: this.currencyShort, currency_picklist: this.currencyCode, exchange_rate: this.rate, rate_source: this.rateSource,
                          applied: false, draft: true, offer_type: this.offerType || OFFER_TYPE_DEFAULT, saved_on: new Date().toISOString() },
            _IM_Products: productsPayload,
            _IM_Draft_Products: draftProducts.filter((c) => !!productsPayload[c]),
            _Final_Apex_Lines: finalLines
        };
        if (this.expirationDate) payload._Expiration_Date = this.expirationDate;
        return payload;
    }

    async handleSaveAsDraft() {
        if (!this.canSaveDraft || this.isSavingDraft || this.isSaving) return;
        if (!this.opportunityId) { this.toast('Draft', 'Select an opportunity first.', 'warning'); return; }
        if (!this.currencyCode || !this.rate) { this.toast('Currency', this.rateError || 'Select a currency with a rate in the rate card.', 'warning'); return; }
        const payload = this._buildDraftPayload();
        if (!payload._IM_Draft_Products.length) {
            const d = this.draftFor(this.activeTab);
            this.toast(d ? 'Draft already exists' : 'Draft',
                d ? `A ${PRODUCT_LABEL[this.activeTab] || this.activeTab} quotation is already in draft (${d.quoteNumber}). Open it to continue.`
                  : 'Enter some details in a product tab before saving the draft.', 'warning');
            return;
        }
        const session = this._draftSession;
        this.isSavingDraft = true;
        const outer = this._beginLoad('Saving draft…', 30);
        try {
            const r = await saveImDraft({ quoteId: this.quoteId, opportunityId: this.opportunityId,
                                          quoteValueJson: JSON.stringify(payload), currencyCode: this.currencyCode });
            if (session !== this._draftSession) return;   // user opened / started another quote meanwhile - do not adopt the id
            this.quoteId = r.quoteId; this.quoteNumber = r.quoteNumber;
            this.draftSavedAt = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            this.toast('Saved as Draft', `${r.quoteNumber} - you can continue it later from Quotes or Draft Quotes.`, 'success');
            this._loadStep('Refreshing quotes…', 75);
            await this.loadQuotes();                        // the list must know the draft (isDraftQuote, next "+ New")
            this.loadMyDrafts();
        } catch (e) {
            this.toast('Draft not saved', msg(e), 'error');
        } finally {
            this.isSavingDraft = false;
            this._endLoad(outer);
        }
    }

    // ------------------------------------------------------------ save
    async save() {
        if (this.isLocked) { this.toast('Locked', `Quote is ${this.quoteStatus}. Reopen to edit.`, 'warning'); return; }
        if (!this.currencyCode || !this.rate) { this.toast('Currency', this.rateError || 'Select a currency with a rate in the rate card.', 'warning'); return; }
        if (!this.expirationDate) {
            this.expirationError = 'Expiration Date is required';
            this.toast('Cannot apply', 'Expiration Date — This field is required', 'error');
            const el = this.template.querySelector('.im-input_date'); if (el) el.focus();
            return;
        }
        const panels = this.template.querySelectorAll('[data-im-child]');
        const withLines = Object.keys(this.linesByProduct).filter((c) => (this.linesByProduct[c] || []).length);
        if (withLines.length > 1) {
            this.toast('Cannot apply', 'A quote can carry only one department (' + withLines.map((c) => PRODUCT_LABEL[c] || c).join(' + ') + ' found). Keep one and create a separate quote for the other.', 'error');
            return;
        }
        let valid = true;
        const productsPayload = {};
        const finalLines = [];
        this.applyErrors = [];
        let firstBad = null;
        for (const p of panels) {
            const code = p.productCode;
            if (this.isBlockedFor(code)) continue;                     // not this quote's department
            // High Mast validates every product on the quote in turn (async); the others answer at once
            // eslint-disable-next-line no-await-in-loop
            const ok = await p.validate();
            if (!ok) { valid = false; if (!firstBad) firstBad = p; this.applyErrors = this.applyErrors.concat(p.getErrors().map((e, i) => ({ ...e, key: p.productCode + ':' + e.apiName + ':' + i, product: PRODUCT_LABEL[p.productCode] || p.productCode }))); }
            const st = p.getState();
            const lines = this.linesByProduct[code] || [];
            productsPayload[code] = { source_template: p.sourceTemplate, saved: st.values };   // lines live once, in _Final_Apex_Lines
            if (p.docProduct) productsPayload[code].doc_product = p.docProduct;   // which Document_Template_Mapping rows print this product
            lines.forEach((l) => {
                const baseAmount = r2((l.unitPrice || 0) * (l.quantity || 1));
                const unitPrice = r2(l.unitPrice / this.rate);
                const amount = r2(baseAmount / this.rate);
                finalLines.push({
                    product: code, name: l.name, Product_Name: l.name,
                    quantity: l.quantity, Quantity__c: l.quantity,
                    currency: this.currencyShort, exchangeRate: this.rate,
                    unitPrice, unitCost: l.unitCost != null ? r2(l.unitCost / this.rate) : null, amount,
                    Unit_Price__c: unitPrice, Unit_Cost__c: l.unitCost != null ? r2(l.unitCost / this.rate) : null,
                    unitPriceBase: l.unitPrice, unitCostBase: l.unitCost, amountBase: baseAmount,
                    // approval metrics - the matrix rules read these by name (domestic parity)
                    margin: l.margin || 0, discount: l.discount || 0, realization: l.realization || 0, weight: l.weight || 0,
                    uom: l.uom || 'EA',
                    // High Mast cross product: which product of the quote the line belongs to
                    ...(l._hmKey ? { _hmKey: l._hmKey } : {}),
                    ...this._lineExtras(l)
                });
            });
        }
        if (!valid) {
            // toast carries the actual messages (first three), like the domestic modal
            const lines = this.applyErrors.slice(0, 3).map((e) => (e.apiName ? `${e.field} — ${e.message}` : e.message));
            const more = this.applyErrors.length > 3 ? ` (+${this.applyErrors.length - 3} more below)` : '';
            this.toast('Cannot apply', lines.join('  •  ') + more, 'error');
            if (firstBad && firstBad.focusFirstError) firstBad.focusFirstError();
            return;
        }

        const totalBase = r2(finalLines.reduce((s, l) => s + l.amountBase, 0));
        const total = r2(totalBase / this.rate);
        const payload = {
            _Saved_Template_Name: this.templateName,
            _Dynamic_Product_Name: 'International Marketing',
            _IM_Export: { currency: this.currencyShort, currency_picklist: this.currencyCode, exchange_rate: this.rate, rate_source: this.rateSource,
                          total, total_base: totalBase, applied: true, offer_type: this.offerType || OFFER_TYPE_DEFAULT, saved_on: new Date().toISOString() },
            _Expiration_Date: this.expirationDate,
            _IM_Products: productsPayload,
            _Final_Apex_Lines: finalLines
        };

        this.isSaving = true; this._setApplyStep('Saving quote...', 10);
        try {
            this._setApplyStep('Updating opportunity...', 45);
            const r = await saveImQuote({ quoteId: this.quoteId, opportunityId: this.opportunityId, quoteValueJson: JSON.stringify(payload),
                                          currencyCode: this.currencyCode, finalAmount: total, expirationDate: this.expirationDate });
            this._setApplyStep('Generating line items...', 60);
            this.quoteId = r.quoteId; this.quoteNumber = r.quoteNumber; this.quoteReference = r.quoteReference;
            this._setApplyStep('Quote saved', 70);
            this._setApplyStep('Stamping quote reference...', 80);
            this._setApplyStep('Capturing offer total...', 90);
            await this.loadQuotes();
            this.loadMyDrafts();                      // APPLY cleared Is_Draft__c on the server
            this.draftSavedAt = '';
            this._setApplyStep('Done', 100);
            this.rateSource = 'saved';
            this.applied = true;                       // APPLY = save + lock, like domestic
            this.toast('Applied', (r.quoteReference || r.quoteNumber) + (r.lineCount ? ' - ' + r.lineCount + (r.lineCount === 1 ? ' line item' : ' line items') : ''), 'success');
            if (r.lineWarning) this.dispatchEvent(new ShowToastEvent({ title: 'Line items not created', message: r.lineWarning, variant: 'warning', mode: 'sticky' }));
        } catch (e) {
            this.toast('Save failed', msg(e), 'error');
        } finally {
            this.isSaving = false; this.savingText = '';
        }
    }

    // ------------------------------------------------------------ approval (domestic parity)
    async refreshEscalation() {
        this.escalationRequired = false; this.escalationTargetId = null;
        if (!this.quoteId || !this.isInReview) return;
        try {
            const r = await checkEscalation({ quoteId: this.quoteId });
            this.escalationRequired = r && r.required === 'true';
            this.escalationTargetId = (r && r.targetId) || null;
        } catch (e) { /* no escalation */ }
    }
    toggleSubmitPopover() {
        try {
            this.showSubmitPopover = !this.showSubmitPopover;
            if (this.showSubmitPopover) {
                this.approvalMessage = ''; this.approvalDueDate = null;
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => { const el = this.template.querySelector('.im-popover'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 40);
            }
        } catch (e) { this.toast('Error', msg(e), 'error'); }
    }
    handleApprovalMessage(event) { this.approvalMessage = event.target.value; }
    get isSubmitDisabled() { return !this.approvalMessage || this.approvalMessage.trim().length === 0 || !this.approvalDueDate; }
    handleDueDate(event) { this.approvalDueDate = event.target.value || null; }
    async confirmSubmit() {
        if (!this.approvalMessage || !this.approvalMessage.trim()) { this.toast('Approval', 'Please write a message for the approver.', 'error'); return; }
        if (!this.approvalDueDate) { this.toast('Approval', 'Please select an Approval Due Date.', 'error'); return; }
        this.showSubmitPopover = false;
        await this.runChain('Finding the approver…', async () => {
            const r = await submitForApproval({ quoteId: this.quoteId, message: this.approvalMessage, dueDate: this.approvalDueDate });
            this.setTriggers((r && r.triggers) || []);
            if (!r.approverId) {
                this.toast('No approver assigned', (r.routingIssue || 'No valid approver found.') + ' See the routing report below.', 'warning');
                try { this.routingReport = await getApprovalDebug({ quoteId: this.quoteId }); } catch (e) { this.routingReport = msg(e); }
            } else {
                this.routingReport = '';
                this.toast('Submitted', 'Quote successfully submitted for approval!', 'success');
            }
        }, 'Failed to submit quote for approval.');
    }
    async handleApprove() {
        await this.runChain('Approving quote…', async () => { await approveQuote({ quoteId: this.quoteId }); this.toast('Approved', 'Quote approved successfully!', 'success'); }, 'Approval failed.');
    }
    async handleEscalate() {
        await this.runChain('Escalating…', async () => { await escalateQuote({ quoteId: this.quoteId, targetId: this.escalationTargetId }); this.toast('Escalated', 'Quote escalated for final approval.', 'success'); }, 'Escalation failed.');
    }
    openReject() { this.rejectionReason = ''; this.showRejectModal = true; }
    closeReject() { this.showRejectModal = false; this.rejectionReason = ''; }
    handleRejectionReason(event) { this.rejectionReason = event.target.value; }
    async confirmReject() {
        if (this.isRejectConfirmDisabled) { this.toast('Rejection', 'Rejection Reason is required.', 'error'); return; }
        const reason = this.rejectionReason.trim();
        this.showRejectModal = false; this.rejectionReason = '';
        await this.runChain('Rejecting quote…', async () => { await rejectQuote({ quoteId: this.quoteId, reason }); this.toast('Rejected', 'Quote has been rejected.', 'success'); }, 'Rejection failed.');
    }
    async handleFinalize() {
        await this.runChain('Finalizing quote…', async () => { await finalizeQuote({ opportunityId: this.opportunityId, quoteId: this.quoteId }); this.toast('Finalized', 'Quote has been successfully finalized!', 'success'); }, 'Finalization failed.');
    }
    // Documents: pick the Template Sub-Type, press PDF or Word. No preview.
    showExport = false;
    @track exportDocs = [];
    selectedDocType = '';
    offerType = OFFER_TYPE_DEFAULT;   // 'Domestic' | 'International' - remembered on the quote (_IM_Export.offer_type)
    async exportPdf() {
        if (!this.quoteId) { this.toast('Documents', 'Apply the quote first.', 'warning'); return; }
        let docs = [];
        const outer = this._beginLoad('Loading documents…', 40);
        try { docs = await getOfferDocs({ quoteId: this.quoteId }); }
        catch (e) { this.toast('Documents', msg(e), 'error'); return; }
        finally { this._endLoad(outer); }
        if (!docs.length) {
            this.toast('Documents', 'No document is mapped for the products in this quote (Document Template Mapping: Department = International Marketing - Department, IM Product = the product).', 'warning');
            return;
        }
        this.exportDocs = docs.map((d, i) => ({
            value: String(i),
            label: d.templateType || (d.productLabel + ' - Offer'),
            offerType: d.offerType || OFFER_TYPE_DEFAULT,
            pdf: d.pdfPage ? `${d.pdfPage}?id=${this.quoteId}` : null,
            word: d.wordPage ? `${d.wordPage}?id=${this.quoteId}` : null,
            excel: d.excelPage ? `${d.excelPage}?id=${this.quoteId}` : null
        }));
        if (OFFER_TYPES.indexOf(this.offerType) === -1) this.offerType = OFFER_TYPE_DEFAULT;
        this._selectFirstDocOfType();
        this.showExport = true;
    }
    get offerTypeOptions() { return OFFER_TYPES.map((t) => ({ label: t, value: t, selected: t === this.offerType })); }
    /** Chosen type has no mapping row yet (e.g. International before its VF pages exist). */
    get noDocsForOfferType() { return !this.exportDocs.some((d) => d.offerType === this.offerType); }
    get noDocsHint() { return 'No ' + this.offerType + ' format is mapped yet for the products in this quote (Document Template Mapping: Offer Type = ' + this.offerType + ').'; }
    _selectFirstDocOfType() {
        const first = this.exportDocs.find((d) => d.offerType === this.offerType);
        this.selectedDocType = first ? first.value : '';
    }
    handleOfferType(event) {
        this.offerType = event.target.value || OFFER_TYPE_DEFAULT;
        this._selectFirstDocOfType();
        // remember it on the quote so Finalize attaches the same format (best effort - the modal keeps working if this fails)
        if (this.quoteId) setImOfferType({ quoteId: this.quoteId, offerType: this.offerType }).catch(() => { /* ignore */ });
    }

    closeExport() { this.showExport = false; }
    handleDocType(event) { this.selectedDocType = event.target.value; }
    get docTypeOptions() {
        return this.exportDocs.filter((d) => d.offerType === this.offerType).map((d) => ({ ...d, selected: d.value === this.selectedDocType }));
    }
    get selectedDoc() { return this.exportDocs.find((d) => d.value === this.selectedDocType) || null; }
    get hasPdf() { const d = this.selectedDoc; return !!(d && d.pdf); }
    get hasWord() { const d = this.selectedDoc; return !!(d && d.word); }
    get hasExcel() { const d = this.selectedDoc; return !!(d && d.excel); }
    // ---- offer document: preview any time, download only after approval (18 Sep rule) ----
    // Before the quote is Approved / finalized the PDF is shown through the common
    // QuoteOfferPreview page (pdf.js in an iframe - no file reaches the browser); the
    // Word / Excel / PDF download buttons appear only once approval is done.
    get canDownloadOffer() { return this.isApproved || this.isFinalized; }
    get cannotDownloadOffer() { return !this.canDownloadOffer; }
    get downloadHint() { return this.canDownloadOffer ? '' : 'Download is available after approval - preview only for now'; }
    showPreview = false;
    previewUrl = '';
    get previewTitle() { const d = this.selectedDoc; return d ? d.label : 'Preview'; }
    openPreview() {
        const d = this.selectedDoc;
        if (!d || !d.pdf) return;
        // "/apex/CrashBarrierImOfferPdf?id=..." -> bare page name for the common viewer
        const bare = String(d.pdf).replace(/^\/apex\//, '').split('?')[0];
        this.previewUrl = '/apex/QuoteOfferPreview?id=' + encodeURIComponent(this.quoteId) + '&page=' + encodeURIComponent(bare);
        this.showPreview = true;
        this.showExport = false;
    }
    closePreview() { this.showPreview = false; this.previewUrl = ''; }
    openPdf() { this._openDoc('pdf'); }
    openWord() { this._openDoc('word'); }
    openExcel() { this._openDoc('excel'); }
    _openDoc(kind) {
        const d = this.selectedDoc;
        if (!d || !d[kind]) return;
        if (!this.canDownloadOffer) {            // guard - the buttons are hidden, but never trust the DOM alone
            this.toast('Not yet', 'The offer can be downloaded after approval. Use Preview for now.', 'warning');
            return;
        }
        window.open(d[kind], '_blank');
        this.showExport = false;
    }
    reviewFromPending(event) { this.openQuote({ currentTarget: { dataset: { id: event.currentTarget.dataset.id } } }); }
    // event from the shared pendingApprovalsList component
    handleChildReviewQuote(event) { this.openQuote({ currentTarget: { dataset: { id: event.detail.quoteId } } }); }
    /** save-style masked chain: action, then refresh the list (status/escalation), overlay always released */
    async runChain(label, fn, failMsg) {
        this.isSaving = true; this._setApplyStep(label, 30);
        try { await fn(); this._setApplyStep('Refreshing quotes...', 80); await this.loadQuotes(); this._setApplyStep('Done', 100); }
        catch (e) { this.toast('Error', msg(e) || failMsg, 'error'); }
        finally { this.isSaving = false; this.savingText = ''; this.savingPct = 0; }
    }

    // ------------------------------------------------------------ reopen / clone (domestic parity)
    async reopenForEdit() {
        if (!this.quoteId) return;
        const outer = this._beginLoad('Reopening…', 15);
        try {
            if (this.isStatusLocked) {
                // Approved / Rejected -> existing revision logic (Previous_Revision__c chain, fresh expiry)
                this._loadStep('Creating revision…', 25);
                const newId = await createRevision({ quoteId: this.quoteId });
                this._loadStep('Unlocking revision…', 45);
                await setApplied({ quoteId: newId, applied: false });   // unlock + stamp Has_Quote_Value__c
                this._loadStep('Refreshing quotes…', 60);
                await this.loadQuotes();
                await this.openQuote({ currentTarget: { dataset: { id: newId } } });
                this.applied = false;
                this.toast('Revision created', this.quoteReference || '', 'success');
            } else {
                this._loadStep('Unlocking quote…', 55);
                await setApplied({ quoteId: this.quoteId, applied: false });
                this.applied = false;
                this.toast('Reopened', 'Quote is editable again.', 'success');
            }
        } catch (e) { this.toast('Reopen failed', msg(e), 'error'); }
        finally { this._endLoad(outer); }
    }
    // Clone modal - same flow as createQuote: current opportunity pre-selected,
    // search the running user's own OPEN opportunities by name, create ->
    // same opportunity refreshes the list, another one navigates there.
    showCloneModal = false;
    cloneSearchTerm = '';
    @track cloneOppOptions = [];
    cloneSelectedOpp = null;
    cloneSearching = false;
    cloneCreating = false;
    _cloneSearchTimer = null;
    async cloneThisQuote() {
        if (!this.quoteId) return;
        this.cloneSearchTerm = ''; this.cloneOppOptions = []; this.cloneSelectedOpp = null; this.showCloneModal = true;
        try { const cur = await getOpportunityForClone({ opportunityId: this.opportunityId }); if (cur) this.cloneSelectedOpp = cur; }
        catch (e) { /* user can still search */ }
    }
    closeCloneModal() { if (this.cloneCreating) return; this.showCloneModal = false; clearTimeout(this._cloneSearchTimer); }
    handleCloneSearchChange(event) {
        const term = event.target.value || '';
        this.cloneSearchTerm = term;
        clearTimeout(this._cloneSearchTimer);
        if (term.trim().length < 2) { this.cloneOppOptions = []; this.cloneSearching = false; return; }
        this.cloneSearching = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._cloneSearchTimer = setTimeout(async () => {
            try {
                const rows = await searchOpportunitiesForClone({ searchTerm: term.trim() });
                if (this.cloneSearchTerm === term) this.cloneOppOptions = (rows || []).map((o) => ({ ...o, meta: [o.accountName ? 'Account: ' + o.accountName : '', o.stageName ? 'Stage: ' + o.stageName : ''].filter(Boolean).join('  ·  ') }));
            } catch (e) { this.cloneOppOptions = []; this.toast('Search failed', msg(e), 'error'); }
            finally { this.cloneSearching = false; }
        }, 300);
    }
    handleClonePickOpp(event) {
        const id = event.currentTarget.dataset.id;
        const pick = this.cloneOppOptions.find((o) => o.id === id);
        if (!pick) return;
        this.cloneSelectedOpp = pick; this.cloneOppOptions = []; this.cloneSearchTerm = '';
    }
    handleCloneClearOpp() { this.cloneSelectedOpp = null; }
    get cloneSelectedOppMeta() { const o = this.cloneSelectedOpp; if (!o) return ''; return [o.accountName ? 'Account: ' + o.accountName : '', o.stageName ? 'Stage: ' + o.stageName : ''].filter(Boolean).join('  ·  '); }
    get hasCloneOppOptions() { return this.cloneOppOptions.length > 0; }
    get showCloneNoResults() { return !this.cloneSearching && !this.hasCloneOppOptions && this.cloneSearchTerm.trim().length > 1; }
    get isCloneCreateDisabled() { return this.cloneCreating || !this.cloneSelectedOpp || !this.cloneSelectedOpp.id; }
    async handleCloneCreate() {
        if (this.isCloneCreateDisabled) return;
        this.cloneCreating = true;
        const outer = this._beginLoad('Cloning quote…', 20);
        try {
            const res = await cloneQuote({ quoteId: this.quoteId, targetOpportunityId: this.cloneSelectedOpp.id });
            this._loadStep('Preparing the clone…', 50);
            this.showCloneModal = false;
            this.toast('Quote cloned', `${(res && res.newQuoteNumber) || 'New quote'} has been created as a Draft.`, 'success');
            if (res && res.sameOpportunity) {
                await setApplied({ quoteId: res.newQuoteId, applied: false });
                this._loadStep('Refreshing quotes…', 65);
                await this.loadQuotes();
                await this.openQuote({ currentTarget: { dataset: { id: res.newQuoteId } } });
            } else if (res && res.opportunityId) {
                await setApplied({ quoteId: res.newQuoteId, applied: false });
                this[NavigationMixin.Navigate]({ type: 'standard__recordPage', attributes: { recordId: res.opportunityId, objectApiName: 'Opportunity', actionName: 'view' } });
            }
        } catch (e) { this.toast('Clone failed', msg(e), 'error'); }
        finally { this.cloneCreating = false; this._endLoad(outer); }
    }

    // ------------------------------------------------------------ rates screen
    async loadRates() {
        const outer = this._beginLoad('Loading exchange rates…', 30);
        try {
            const rows = await getExchangeRates();
            this.rateRows = rows.map((r) => ({ ...r, key: r.code, isInr: r.code === 'INR', value: r.rate == null ? '' : r.rate }));
            this.ratesDirty = false;
        } catch (e) { this.toast('Rates', msg(e), 'error'); }
        finally { this._endLoad(outer); }
    }
    handleRateEdit(event) {
        const code = event.target.dataset.code;
        const v = event.target.value;
        this.rateRows = this.rateRows.map((r) => (r.code === code ? { ...r, value: v === '' ? '' : Number(v) } : r));
        this.ratesDirty = true;
    }
    async saveRates() {
        const json = {};
        this.rateRows.forEach((r) => { if (r.value !== '' && r.value != null) json[r.code] = Number(r.value); });
        this.ratesSaving = true;
        const outer = this._beginLoad('Saving exchange rates…', 35);
        try {
            await saveExchangeRates({ ratesJson: JSON.stringify(json) });
            this._loadStep('Updating the rate card…', 80);
            this.ratesDirty = false;
            this.toast('Rates submitted', 'Deploying to the rate card - live in a few seconds.', 'success');
            if (this.currencyCode) this.applyCurrency(this.currencyCode);
        } catch (e) { this.toast('Rates', msg(e), 'error'); }
        finally { this.ratesSaving = false; this._endLoad(outer); }
    }


    // ------------------------------------------------------------ rates screen: BASE RATES
    // Mirrors the domestic Quote Rate Card Manager (Department -> Type / Standard -> grid),
    // but reads/writes the International twin rows (IM_<DeveloperName>). The domestic value
    // sits beside every International cell as the reference; a card with no twin yet opens
    // pre-filled with the domestic values so the first save is one click.
    get isFxMode() { return this.rateMode !== 'base'; }
    get isBaseMode() { return this.rateMode === 'base'; }
    get fxChipCls() { return 'im-ratechip' + (this.isFxMode ? ' im-ratechip_active' : ''); }
    get baseChipCls() { return 'im-ratechip' + (this.isBaseMode ? ' im-ratechip_active' : ''); }
    async _confirmDiscard() {
        if (!this.baseDirty) return true;
        const ok = await LightningConfirm.open({ message: 'Discard unsaved International rate changes?', label: 'Unsaved changes', theme: 'warning' });
        return ok === true;
    }
    async setRateMode(event) {
        const m = event.currentTarget.dataset.mode;
        if (m === this.rateMode) return;
        if (!(await this._confirmDiscard())) return;
        this.baseDirty = false;
        this.rateMode = m;
        if (m === 'fx') this.loadRates();
    }
    /** Departments = IM-enabled products (bootstrap) that have a rate-card catalogue entry. */
    get baseDeptOptions() {
        const enabled = (this.products || []).map((p) => p.sourceTemplate);
        return Object.keys(RATE_CATALOGUE)
            .filter((d) => enabled.indexOf(d) !== -1)
            .map((d) => ({ label: d, value: d, selected: d === this.baseDept }));
    }
    get baseTypeOptions() {
        return (RATE_CATALOGUE[this.baseDept] || []).map((t) => ({ label: t.label, value: t.dev, selected: t.dev === this.baseType }));
    }
    get baseTypeDisabled() { return !this.baseDept; }
    get baseTypeDef() { return (RATE_CATALOGUE[this.baseDept] || []).find((t) => t.dev === this.baseType) || null; }
    get hasBaseGrid() { return !!this.baseCard && this.baseRows.length > 0; }
    get baseValueCaption() { const d = this.baseTypeDef; return d && d.cols ? d.cols[1] : 'Rate'; }
    get baseStatusCls() { return 'im-basestatus' + (this.baseCard && this.baseCard.imExists ? ' im-basestatus_ok' : ' im-basestatus_warn'); }
    get baseStatusText() {
        if (!this.baseCard) return '';
        const def = this.baseTypeDef;
        const dept = this.baseCard.department || (def && def.dept) || '';
        return this.baseCard.imExists
            ? 'International card saved (IM - ' + dept + '). Estimators price from these values.'
            : 'No International card yet - showing the domestic values. Estimators use the domestic card until you save.';
    }
    get baseChangedCount() { return this.baseRows.filter((r) => r.changed).length; }
    get baseSaveDisabled() { return this.baseSaving || !this.hasBaseGrid; }
    async handleBaseDept(event) {
        const v = event.target.value;
        if (!(await this._confirmDiscard())) { event.target.value = this.baseDept; return; }
        this.baseDept = v; this.baseType = ''; this.baseCard = null; this.baseRows = []; this.baseDirty = false;
    }
    async handleBaseType(event) {
        const v = event.target.value;
        if (!(await this._confirmDiscard())) { event.target.value = this.baseType; return; }
        this.baseType = v; this.baseCard = null; this.baseRows = []; this.baseDirty = false;
        if (this.baseType) this.loadBaseCard();
    }
    async loadBaseCard() {
        const def = this.baseTypeDef;
        if (!def) return;
        this.baseLoading = true;
        const outer = this._beginLoad('Loading rate card…', 30);
        try {
            const card = await getImRateCard({ developerName: def.dev });
            this.baseCard = card;
            this.baseRows = this._buildBaseRows(def, card);
            this.baseDirty = false;
        } catch (e) { this.toast('Base rates', msg(e), 'error'); this.baseCard = null; this.baseRows = []; }
        finally { this.baseLoading = false; this._endLoad(outer); }
    }
    _buildBaseRows(def, card) {
        const fmt = (v) => (v === null || v === undefined ? '' : String(v));
        if (def.flat) {
            const rows = [
                { key: 'Base_Amount__c', label: 'Base Amount', domestic: fmt(card.domesticBase) },
                { key: 'Add_On_Amount__c', label: 'Add On Amount', domestic: fmt(card.domesticAddOn) }
            ];
            const imVals = { Base_Amount__c: card.imBase, Add_On_Amount__c: card.imAddOn };
            return rows.map((r) => {
                const v = card.imExists && imVals[r.key] !== null && imVals[r.key] !== undefined ? fmt(imVals[r.key]) : r.domestic;
                return { ...r, value: v, changed: v !== r.domestic, cls: v !== r.domestic ? 'im-input im-input_base im-input_changed' : 'im-input im-input_base' };
            });
        }
        const parse = (j) => { try { const a = JSON.parse(j || '[]'); return Array.isArray(a) ? a : [a]; } catch (e) { return []; } };
        const val = (f) => (f.defaultValue !== undefined && f.defaultValue !== null ? f.defaultValue : (f.formula !== undefined ? f.formula : '0'));
        const dom = parse(card.domesticJson), im = parse(card.imJson);
        const imMap = {}; im.forEach((f) => { if (f && f.apiName) imMap[f.apiName] = val(f); });
        const seen = {}; const rows = [];
        dom.forEach((f) => {
            if (!f || !f.apiName) return;
            seen[f.apiName] = true;
            const d = fmt(val(f));
            const v = card.imExists && imMap[f.apiName] !== undefined ? fmt(imMap[f.apiName]) : d;
            rows.push({ key: f.apiName, label: (def.labels && def.labels[f.apiName]) || f.apiName, domestic: d, value: v, changed: v !== d,
                cls: v !== d ? 'im-input im-input_base im-input_changed' : 'im-input im-input_base' });
        });
        // keys only the IM card has (added later on the IM side) still show, with no domestic reference
        Object.keys(imMap).forEach((k) => {
            if (seen[k]) return;
            const v = fmt(imMap[k]);
            rows.push({ key: k, label: (def.labels && def.labels[k]) || k, domestic: '', value: v, changed: true, cls: 'im-input im-input_base im-input_changed' });
        });
        return rows;
    }
    handleBaseEdit(event) {
        const key = event.target.dataset.key; const v = event.target.value;
        this.baseRows = this.baseRows.map((r) => (r.key === key
            ? { ...r, value: v, changed: v !== r.domestic, cls: v !== r.domestic ? 'im-input im-input_base im-input_changed' : 'im-input im-input_base' }
            : r));
        this.baseDirty = true;
    }
    copyAllDomestic() {
        this.baseRows = this.baseRows.map((r) => ({ ...r, value: r.domestic, changed: false, cls: 'im-input im-input_base' }));
        this.baseDirty = true;
    }
    discardBaseChanges() { if (this.baseCard) this.baseRows = this._buildBaseRows(this.baseTypeDef, this.baseCard); this.baseDirty = false; }
    async saveBaseCard() {
        const def = this.baseTypeDef;
        if (!def || !this.baseCard) return;
        // every cell must be a number (blank = the domestic value is NOT assumed - the user decides)
        const num = (v) => { const n = Number(String(v).trim()); return String(v).trim() === '' || isNaN(n) ? null : n; };
        const bad = this.baseRows.find((r) => num(r.value) === null);
        if (bad) { this.toast('Base rates', '"' + bad.label + '" must be a number (enter 0 if it does not apply).', 'error'); return; }
        let jsonString = null, baseAmount = null, addOn = null;
        if (def.flat) {
            this.baseRows.forEach((r) => { if (r.key === 'Base_Amount__c') baseAmount = num(r.value); if (r.key === 'Add_On_Amount__c') addOn = num(r.value); });
        } else {
            jsonString = JSON.stringify(this.baseRows.map((r) => ({ apiName: r.key, defaultValue: num(r.value) })));
        }
        this.baseSaving = true;
        const outer = this._beginLoad('Saving International rate card…', 35);
        try {
            await saveImRateCard({ developerName: def.dev, jsonString, baseAmount, addOn, departmentName: def.dept || null });
            this._loadStep('Deploying the rate card…', 80);
            this.baseCard = { ...this.baseCard, imExists: true };
            this.baseDirty = false;
            this.toast('Base rates submitted', 'Deploying "IM - ' + (this.baseCard.department || def.dept || '') + '" - live in a few seconds. Open estimators pick it up on their next load.', 'success');
        } catch (e) { this.toast('Base rates', msg(e), 'error'); }
        finally { this.baseSaving = false; this._endLoad(outer); }
    }

    toast(title, message, variant) { this.dispatchEvent(new ShowToastEvent({ title, message, variant })); }
}

function codeOf(v) { return String(v || '').split(' - ')[0].trim().toUpperCase(); }
function fmtWhen(v) { if (!v) return ''; const d = new Date(v); return isNaN(d) ? '' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function msg(e) { return (e && e.body && e.body.message) || (e && e.message) || String(e); }
function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function statusStyle(status) {
    const colors = { Draft: '#6b6f7b', Approved: '#2e844a', Presented: '#fe9339', Accepted: '#2e844a', Rejected: '#c23934', Expired: '#6b6f7b', 'In Review': '#fe9339' };
    const c = colors[status] || '#6b6f7b';
    return `background-color:${c}20;color:${c};font-weight:600;padding:4px 12px;border-radius:30px;display:inline-block;`;
}
function buildRejectionTooltip(q) {
    if (!q || q.Status !== 'Rejected') return '';
    const reason = (q.Rejection_Reason__c || '').trim();
    if (!reason) return '';
    const who = q.approved_by__r ? q.approved_by__r.Name : '';
    const when = q.submition_date__c ? new Date(q.submition_date__c).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    let head = 'Rejected';
    if (who) head += ' by ' + who;
    if (when) head += ' on ' + when;
    const full = head + '\n\n' + reason;
    return full.length > 800 ? full.substring(0, 797) + '...' : full;
}
function fmtN(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }