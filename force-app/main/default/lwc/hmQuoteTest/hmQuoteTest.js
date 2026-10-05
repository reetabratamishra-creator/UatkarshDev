import { LightningElement, api, track, wire } from 'lwc';
import { createRecord, getRecord, updateRecord, getRecordNotifyChange } from 'lightning/uiRecordApi';
import QUOTE_ID from '@salesforce/schema/Quote.Id';
import QUOTE_NUMBER_FIELD from '@salesforce/schema/Quote.QuoteNumber';
// Revision_No__c is read through the same LDS wire as QuoteNumber so the card
// updates itself when the reopen bump saves - no Apex re-fetch needed.
// Reetabrata (17th July 2026)
import REVISION_NO_FIELD from '@salesforce/schema/Quote.Revision_No__c';
import QUOTE_VALUE_FIELD from '@salesforce/schema/Quote.Quote_Value__c';
import QUOTE_VALUE_CHECKBOX_FIELD from '@salesforce/schema/Quote.Has_Quote_Value__c';
// STEEL PIPE ACCESS - Deepanjan (22nd September 2026)
import CAN_USE_SP_DOMESTIC_FIELD from '@salesforce/schema/User.Can_Use_Steel_Pipe_Domestic__c';
import CAN_USE_SP_EXPORT_FIELD from '@salesforce/schema/User.Can_Use_Steel_Pipe_Export__c';
import getActiveTemplates from '@salesforce/apex/CreateQuoteController.getActiveTemplates';
import getQuotesByOpportunity from '@salesforce/apex/CreateQuoteController.getQuotesByOpportunity';
import getMyDraftQuotes from '@salesforce/apex/CreateQuoteController.getMyDraftQuotes';
// QUOTE REVISION (Deepanjan, 19th July 2026): re-opening an Approved/Rejected
// quote clones it into a NEW record chained by Previous_Revision__c /
// Original_Quote__c instead of editing the old one.
import createRevision from '@salesforce/apex/CreateQuoteController.createRevision';
// QUOTE REFERENCE - Deepanjan (21st July 2026): builds UIL/Dept/FY/QuoteNo[/Rn]
// into Quote_Reference__c once the quote exists (QuoteNumber is assigned only
// after insert, so this runs from wiredQuote, not at create time).
import generateQuoteReference from '@salesforce/apex/CreateQuoteController.generateQuoteReference';
import getDynamicConfiguration from '@salesforce/apex/CreateQuoteController.getDynamicConfiguration';
import getOpportunityAccountAddress from '@salesforce/apex/CreateQuoteController.getOpportunityAccountAddress';
import { ShowToastEvent } from 'lightning/platformShowToastEvent'; // 👉 Required for the warning popup
import getPricingRates from '@salesforce/apex/CreateQuoteController.getPricingRates';
import generateQuoteLines from '@salesforce/apex/CreateQuoteController.generateQuoteLines';
import getCustomQuoteLines from '@salesforce/apex/CreateQuoteController.getCustomQuoteLines';
import fetchBlueprintPayload from '@salesforce/apex/CreateQuoteController.fetchBlueprintPayload';
import USER_ID from '@salesforce/user/Id';
import CAN_VIEW_RATES_FIELD from '@salesforce/schema/User.Access_to_Quote_Rate_Manager__c';
import determineApprover from '@salesforce/apex/CreateQuoteController.determineApprover';
import determineApprovalTriggers from '@salesforce/apex/CreateQuoteController.determineApprovalTriggers';
import sendQuoteApprovalNotification from '@salesforce/apex/CreateQuoteController.sendQuoteApprovalNotification';
import getSubordinateUserIds from '@salesforce/apex/CreateQuoteController.getSubordinateUserIds';
import CAN_VIEW_APPROVALS_FIELD from '@salesforce/schema/User.Can_View_Approvals__c'; // 👉 ADD THIS
import finalizeQuoteAndAttachDocs from '@salesforce/apex/HMCrossProductController.finalizeQuoteAndAttachDocs';   // [hm-cross] = CreateQuoteController's unless the quote needs the CP documents (2+ High Mast products, the compact shape, or a Stadium with 2+ lifts / ladders)
import captureOfferTotal from '@salesforce/apex/HMCrossProductController.captureOfferTotal';   // [hm-cross] same rule
// APPLY-time capture: writes only Quote.Final_Quote_Amount__c. Deepanjan (4th August 2026)
import captureQuoteTotal from '@salesforce/apex/HMCrossProductController.captureQuoteTotal';   // [hm-cross] same rule
import getCrossProductDocuments from '@salesforce/apex/HMCrossProductController.getCrossProductDocuments';   // [hm-cross]
// for Solar escalation logic
import checkEscalationRequired from '@salesforce/apex/CreateQuoteController.checkEscalationRequired';
// QUOTE CLONE - Deepanjan (7th September 2026): "Clone this Quote" on a finalized
// quote -> pick an opportunity (default: this one) -> Apex copies the record.
import cloneQuote from '@salesforce/apex/CreateQuoteController.cloneQuote';
import searchOpportunitiesForClone from '@salesforce/apex/CreateQuoteController.searchOpportunitiesForClone';
import getOpportunityForClone from '@salesforce/apex/CreateQuoteController.getOpportunityForClone';
import { NavigationMixin } from 'lightning/navigation';

/* ═══════════════════════════════════════════════════════════════════════════
   hmQuoteTest — TEMPORARY test host for the High Mast estimator / cross product.
   Deepanjan (27th September 2026)

   This is createQuote.js as it is, with only these differences (each tagged
   "hmQuoteTest"):
     1. class name;
     2. the template list is limited to High Mast;
     3. the estimator tag is c-hm-estimator instead of c-weight-estimator-modal
        (3 querySelector sites in this file + the tag in the html).
   Everything else - folder click, KIT interceptor, rate card, apply pipeline,
   line adjustments, approval, drafts, quotes list - is createQuote's own code,
   so what is tested here is exactly what merges back. Discard this bundle at
   merge; port the tagged differences into createQuote.
   ═══════════════════════════════════════════════════════════════════════════ */
export default class HmQuoteTest extends NavigationMixin(LightningElement) {   // NavigationMixin: clone into another opportunity lands there - Deepanjan (7th September 2026)

    @api recordId;
    @track currentPricingRates = {};
    @track isReadOnlyMode = false;
    // ── SAVE AS DRAFT — Deepanjan (21st September 2026) ─────────────────────────
    // A quotation can be saved half-built (no Expiration Date, no validation) with the
    // Save as Draft button: Quote_Value__c holds what was entered and Is_Draft__c
    // marks the record. Opening it from the Quotes list resumes it in edit mode.
    // APPLY clears the flag. Only a quote that has never been APPLIED can be saved as
    // a draft - after APPLY, Quote_Value__c must stay exactly as APPLY wrote it (the
    // offer PDF, cost sheet and approval all read it).
    @track draftSavedAt = '';
    @track draftPrompt = null;      // { blocking, template, drafts:[...] }
    @track isSavingDraft = false;
    @track canSaveDraft = false;    // fresh quote or resumed draft, until APPLY succeeds
    @track myDrafts = [];           // this user's drafts on this opportunity (getMyDraftQuotes)
    @track draftsLoading = false;
    @track draftsError = null;
    _creatingNew = false;
    // Approval triggers recorded at submit (Quote.Approval_Triggers__c). Handed to the
    // estimator so it can outline the field the approval rule evaluated. null on old /
    // non-approval quotes -> nothing happens anywhere. Deepanjan (20th September 2026)
    @track approvalTriggers = null;
    @track selectedNavItem = 'GENERATE_QUOTE';
    @track selectedPicklistValue = '';
    @track quotePicklistOptions = [];
    @track isQuoteCreated = false;
    @track showDocumentGenerator = false;//Abhishek saxena 06-05-2026

    @track opportunityQuotes = [];
    @track Loading = false;

    // APPLY now runs as a chain, so it gets its own mask plus a caption naming
    // the step in flight. Kept separate from Loading so nothing that already
    // reads Loading changes behaviour. Deepanjan (4th August 2026)
    @track isApplying = false;
    @track applyStepLabel = 'Saving quote...';
    @track applyProgress = 0;

    get applyBarStyle() {
        return `width: ${this.applyProgress}%;`;
    }

    // One place to move the bar, so a step can never set a label without a
    // percentage. Deepanjan (4th August 2026)
    _setApplyStep(label, percent) {
        this.applyStepLabel = label;
        this.applyProgress = percent;
    }
    @track quotesError = null;
    @track initializationStage = 'Starting...';
    @track initializationError = null;
    @track accountAddress = null;
    @track quoteNumber = null;
    @track showquotescreen = true;
    @track rows = [];

    @track customLineItems = [];
    @track authorizedApproverIds = []; // Holds the user's ID and all their subordinates
    @track isApprovalActive = false; // 👉 Tracks if the current department uses routing
    @track isSteelPipeModalOpen = false;
    @track isSolarStructureModalOpen = false;
    @track solarStructureUom = 'Weight';

// STEEL PIPE ACCESS - Deepanjan (22nd September 2026)
    // User.Can_Use_Steel_Pipe_Domestic__c / _Export__c. false = blocked until the
    // wire confirms the tick (safe-fail).
    @track canUseSteelPipeDomestic = false;
    @track canUseSteelPipeExport = false;

    @track templateSidebarWidth = 380;
    minWidth = 500;
    maxWidth = 1300;
    isResizing = false;
    startX = 0;
    startWidth = 0;
    quoteId = null;
    selectedProduct = null;

    _boundHandleResize;
    _boundStopResize;


    // UI State
    @track accordionSections = [];
    @track activeSections = [];

    // In-Memory Cache for JSON Payloads (Key: "AccordionId_ControllingValue")
    jsonLogicCache = {};
    @track modalSavedData = {};

    // ═════════════════════════════════════════════════════════════════════════
    // HIGH MAST CROSS PRODUCT - Deepanjan (27th September 2026)   [hm-cross]
    //
    // One High Mast quote may carry several products (any mix of the type_of_mast
    // values, Segment Above 5 and Octagonal Pole included). The accordion, the
    // estimator and every existing rule keep working on ONE product at a time:
    // modalSavedData is always "the product on screen" (its own keys) plus the
    // quote-level keys (Project Set-up: freight, transportation, address, T&C)
    // plus the internal _ keys. The other products are parked in hmProducts as
    // plain key/value buckets and swapped in when their chip is clicked.
    //
    // Line items of every product live together in _pendingLineItems, each line
    // tagged with its product key, so the grid, the adjustment rules (per pole /
    // lump sum transportation) and the approval routing see the whole quote.
    //
    // Saved shape (only when 2+ products): the flat JSON is product 1 as today, plus
    // _HM_Products = [{ key, type, sub, label, values, blank, nulls }] with products
    // 2..n, plus _HM_Shared = the quote-level key names at the root. Every product's
    // '' / null keys are packed by row into `blank` / `nulls` (lossless - they come
    // back exactly on load, in the host and in the Apex). When that plain shape
    // would pass 120,000 characters the same data is written COMPACT instead
    // (_HM_V = 2, see _hmCompactPayload) and read back into the plain shape the
    // moment the JSON is loaded (_hmDecodeStored here, hmDecodeV2 in the Apex).
    // A quote with one product is saved byte-for-byte
    // as before, so nothing changes for existing quotes or for the other
    // departments: every method below returns at once unless the department is
    // High Mast and the quote holds 2+ products. The one exception (28th September
    // 2026): a ONE-product High Mast quote whose JSON is longer than Quote_Value__c
    // can hold (131,072 - today that save fails) is written in the same compact shape,
    // and its documents come from the CP pages (see _hmSingleSavePayload).
    // STADIUM MAST (29th September 2026): a one-product Stadium quote with 2+ Man Riding
    // Lifts gets one KIT line per lift ([hm-kit]) and, with 2+ lifts or ladders, its
    // documents from the CP pages ([hm-stadium]); lift 1 stays KIT line 1.
    // ═════════════════════════════════════════════════════════════════════════
    @track hmProducts = null;     // [{ key, values, applied, rates }] - null outside High Mast
    hmActive = 0;                 // index of the product on screen
    hmRemoveIdx = -1;             // chip whose "Remove?" confirmation is open
    _hmToastPrefix = '';          // "Product 2 (LATCHING MAST): " while validating that product
    _hmKeyCache = null;           // { wd, rootApi, rootSecId, shared } derived from wrapperData once
    _hmSubPicks = null;           // sub-type picklist api names per type, from the Section Logic JSON
    _hmStoredCompact = false;     // the quote on screen is stored in the compact shape (its documents need the CP pages)
    _hmPendingCompact = false;    // the APPLY in progress writes the compact shape
    // Expiration Date — common to every department, mandatory on APPLY, and
    // written straight onto the Opportunity's Close Date on save.
    // Deepanjan (2nd August 2026)
    @track expirationDate = null;
    rtWidth = 0;

    // UI State
    @track accordionSections = [];
    @track activeSections = [];
    @track wrapperData;

    // In-Memory Cache for JSON Payloads (Key: "AccordionId_ControllingValue")
    jsonLogicCache = {};
    _cachedAdjustmentRules = [];
    _cachedNewItemRules = []

    // abhishek saxena 
    @track showApprovalModal = false;
    @track approvalMessage = '';
    // Reject flow - reason is mandatory and is written to Quote.Rejection_Reason__c.
    // Deepanjan (6th August 2026)
    @track showRejectModal = false;

    // ── QUOTE CLONE modal state - Deepanjan (7th September 2026) ──
    @track showCloneModal    = false;
    @track cloneSearchTerm   = '';
    @track cloneOppOptions   = [];     // search results (own, open opportunities)
    @track cloneSelectedOpp  = null;   // { id, name, stageName, accountName }
    @track cloneSearching    = false;
    @track cloneCreating     = false;
    _cloneSearchTimer        = null;
    @track rejectionReason = '';
    approvalQuoteId = null;
    @track isAwaitingDueDate = false;
    @track approvalDueDate = null;
    @track isApproverHovered = false;
    @track isHoverDropdownExpanded = false;
    _hoverTimer;
    @track isSubmitPopoverOpen = false;
    @track isExcelViewActive = false;
    @track isQuoteSaved = false;
    @track hasRateAccessFromUser = false;
    @track hasApprovalAccess = false;

    // escalation
    @track escalationRequired = false;
    @track escalationTargetId = null;

    // peb
    @track isPebQFRModalOpen = false;

    async connectedCallback() {
        const savedWidth = localStorage.getItem('templateSidebarWidth');
        if (savedWidth) { this.templateSidebarWidth = parseInt(savedWidth, 10); }
        this._boundHandleResize = this.handleResize.bind(this);
        this._boundStopResize = this.stopResize.bind(this);

        try {
            this.authorizedApproverIds = await getSubordinateUserIds();
        } catch (error) {
            console.error('Error fetching role hierarchy:', error);
            this.authorizedApproverIds = [USER_ID]; // Fallback to just themselves if it fails
        }
        this.initializeData();
        this.loadMyDrafts();   // DRAFT QUOTES tab dot - never blocks the screen - Deepanjan (21st Sep 2026)
    }

    renderedCallback() {
        const resizeHandle = this.template.querySelector('.resize-handle');
        if (resizeHandle) {
            resizeHandle.removeEventListener('mousedown', this.startResize.bind(this));
            resizeHandle.addEventListener('mousedown', this.startResize.bind(this));
            resizeHandle.removeEventListener('dblclick', this.resetWidth.bind(this));
            resizeHandle.addEventListener('dblclick', this.resetWidth.bind(this));
        }
        // [hm-cross] the offer-document panel is on screen without its list (it appeared
        // after the toggle, once the quote's products were read): ask for it, once
        if (this.isExcelViewActive && this.hmDocs === null && !this._hmDocsBusy && this.hmUseCrossDocs) this._hmLoadDocs();
    }

    disconnectedCallback() {
        document.removeEventListener('mousemove', this._boundHandleResize);
        document.removeEventListener('mouseup', this._boundStopResize);
        document.body.classList.remove('resizing');
    }

    // 👉 UPDATE THIS LINE to include both fields in the array
        @wire(getRecord, { recordId: USER_ID, fields: [CAN_VIEW_RATES_FIELD, CAN_VIEW_APPROVALS_FIELD], optionalFields: [CAN_USE_SP_DOMESTIC_FIELD, CAN_USE_SP_EXPORT_FIELD] })
    wiredUser({ error, data }) {
        if (data) {
            this.hasRateAccessFromUser = data.fields.Access_to_Quote_Rate_Manager__c.value === true;

            // 👉 ADD THIS LINE to check the new approval field safely
            this.hasApprovalAccess = data.fields.Can_View_Approvals__c ? data.fields.Can_View_Approvals__c.value === true : false;

                        // STEEL PIPE ACCESS - Deepanjan (22nd September 2026)
            const spDom = data.fields.Can_Use_Steel_Pipe_Domestic__c;
            const spExp = data.fields.Can_Use_Steel_Pipe_Export__c;
            this.canUseSteelPipeDomestic = !!(spDom && spDom.value === true);
            this.canUseSteelPipeExport   = !!(spExp && spExp.value === true);

        } else if (error) {
            console.error('Error fetching user access:', error);
        }
    }
    // Add this new getter to check for the Steel Pipes + Domestic condition
    @track isSteelPipeModalOpen = false;
    @track isExportSteelPipeModalOpen = false;
    @track isPebModalOpen = false;

    // QFR GATE: the PEB Price Calculator can only be opened once the QFR form
    // has been filled and saved (handlePebQFRSave populates _pebQFRData).
    get hasPebQFRData() {
        const data = this.modalSavedData && this.modalSavedData._pebQFRData;
        return Array.isArray(data) && data.length > 0;
    }

    // NEW: Safely passes the saved QFR data down to the child modal
    get pebQFRSavedData() {
        if (this.modalSavedData && this.modalSavedData._pebQFRData) {
            return JSON.parse(JSON.stringify(this.modalSavedData._pebQFRData));
        }
        return [];
    }

    get pebFolderIconName() {
        return this.hasPebQFRData ? 'utility:open_folder' : 'utility:lock';
    }

    get pebFolderTitle() {
        return this.hasPebQFRData
            ? 'Open PEB Configuration'
            : 'Fill out the PEB QFR form first';
    }

    get pebFolderCursorStyle() {
        return this.hasPebQFRData ? 'cursor: pointer;' : 'cursor: not-allowed;';
    }

    // Replace the old querySelector-based opener
    handlePebFolderClick() {
        if (!this.hasPebQFRData) {
            this.showToast(
                'QFR Required',
                'Please fill out the PEB Quote Request Form (QFR) before opening the Price Calculator.',
                'warning'
            );
            return;
        }
        this.isPebModalOpen = true;
    }

    closePebModal() {
        this.isPebModalOpen = false;
    }

    // Block message for a market_type value, or null when the user may use it.
    _steelPipeBlockMsg(marketType) {
        if (marketType === 'Domestic' && !this.canUseSteelPipeDomestic) {
            return 'You do not have access to Domestic Steel Pipe. Please contact your administrator.';
        }
        if (marketType === 'Export' && !this.canUseSteelPipeExport) {
            return 'You do not have access to Export Steel Pipe. Please contact your administrator.';
        }
        return null;
    }

    // Getter to pass existing data into the child modal
    get domesticPipes() {
        return this.modalSavedData?._configuredPipesDomestic || [];
    }

    get solarStructureData() {
        return this.modalSavedData?._configuredSolarStructure || {};
    }

    get showRateInDocDomestic() {
        return this.modalSavedData?._showRateInDocDomestic !== undefined ? this.modalSavedData._showRateInDocDomestic : true;
    }

    get exportPipes() {
        return this.modalSavedData?._configuredPipesExport || [];
    }

    async initializeData() {
        try {
            this.initializationStage = 'Loading templates...';
            await this.loadTemplates();

            if (this.recordId) {

                this.initializationStage = 'Loading quotes...';
                await this.loadOpportunityQuotes();
            }
        } catch (error) {
            this.initializationStage = 'Failed';
            this.initializationError = error;
        }
    }

    async loadTemplates() {
        const result = await getActiveTemplates();
        // hmQuoteTest: this host is for High Mast only
        const hmOnly = (result || []).filter(item => /high\s*mast/i.test(String(item)));
        this.quotePicklistOptions = hmOnly.map(item => ({ label: item, value: item }));
        console.log('Loaded Templates:', JSON.stringify(this.quotePicklistOptions));
    }

    async loadOpportunityQuotes() {
        this.Loading = true;
        this.quotesError = null;
        try {
            this.opportunityQuotes = await getQuotesByOpportunity({ opportunityId: this.recordId });
        } catch (error) {
            this.quotesError = error.body ? error.body.message : 'Unknown error loading quotes';
        } finally {
            this.Loading = false;
        }
    }
    //updated for escalation
    async refreshQuotes() {
        if (this.recordId) {
            await this.loadOpportunityQuotes();
            if (this.quoteId && this.isQuoteInReview) {
                await this.checkEscalationForCurrentQuote();
            }
        }
    }

    startResize(event) {
        event.preventDefault();
        this.isResizing = true;
        this.startX = event.clientX;
        this.startWidth = this.templateSidebarWidth;
        document.addEventListener('mousemove', this._boundHandleResize);
        document.addEventListener('mouseup', this._boundStopResize);
        document.body.classList.add('resizing');
    }

    handleResize(event) {
        if (!this.isResizing) return;
        event.preventDefault();
        const delta = event.clientX - this.startX;
        let newWidth = this.startWidth + delta;
        newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
        this.templateSidebarWidth = newWidth;
    }

    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
            document.removeEventListener('mousemove', this._boundHandleResize);
            document.removeEventListener('mouseup', this._boundStopResize);
            document.body.classList.remove('resizing');
            localStorage.setItem('templateSidebarWidth', this.templateSidebarWidth);
        }
    }

    resetWidth() {
        this.templateSidebarWidth = 380;
        localStorage.setItem('templateSidebarWidth', this.templateSidebarWidth);
    }

    get hasQuotes() { return this.opportunityQuotes && this.opportunityQuotes.length > 0; }
    get quotesCount() { return this.hasQuotes ? this.opportunityQuotes.length : 0; }
    get isQuoteScreenHidden() { return this.showquotescreen; }
    get isPendingApprovalsVisible() { return this.selectedNavItem === 'PENDING_APPROVALS'; }
    // 👉 UI Toggle for Approval Routing
    get isApprovalRoutingActive() {
        return this.isApprovalActive;
    }

    // ═══════════════════════════════════════════════════════════════════
    // QUOTE REVISION helpers - Deepanjan (19th July 2026)
    // ═══════════════════════════════════════════════════════════════════
    // Families render OPEN by default (thread view - Deepanjan, 20th July 2026);
    // the chevron now COLLAPSES a family instead of revealing it.
    collapsedFamilies = [];

    get currentQuoteRecord() {
        return (this.opportunityQuotes || []).find(q => q && q.Id === this.quoteId) || null;
    }

    // true when some other quote points at the current one -> it was already
    // revised, so RE-OPEN must be blocked (linear chain, no forks).
    get currentQuoteHasRevision() {
        const id = this.quoteId;
        if (!id) return false;
        return (this.opportunityQuotes || []).some(q => q && q.Previous_Revision__c === id);
    }

    // RE-OPEN safety net (Deepanjan, 20th July 2026): the main button lives
    // inside the isQuoteSaved gate, and that flag goes false on several paths -
    // which made the button vanish on Approved quotes. This getter keys off the
    // QUOTE LIST STATUS alone, so Approved/Rejected can ALWAYS be revised.
    get showReopenFallback() {
        if (this.isQuoteSaved) return false;   // main button already visible
        const q = this.currentQuoteRecord;
        return !!(q && (q.Status === 'Approved' || q.Status === 'Rejected'));
    }

    get reopenBlockTitle() {
        return this.currentQuoteHasRevision
            ? 'Already revised - open the latest revision to make changes.'
            : 'Re-open this quote for editing';
    }

    get isRevisionChild() {
        const q = this.currentQuoteRecord;
        return !!(q && q.Original_Quote__c);
    }

    // The family root's number, shown small above the quote name on revisions.
    get originalQuoteNumber() {
        const q = this.currentQuoteRecord;
        if (!q || !q.Original_Quote__c) return '';
        const root = (this.opportunityQuotes || []).find(x => x && x.Id === q.Original_Quote__c);
        return root ? root.QuoteNumber : '';
    }

    // Families for the Quotes tab: one MAIN row per family (latest revision),
    // older versions nested under a chevron. Grouping key = Original_Quote__c
    // (blank on R0 = its own Id), so one filterless pass builds every family.
    get familyQuotes() {
        const rows = this.formattedQuotes || [];
        const byRoot = new Map();
        rows.forEach(q => {
            if (!q) return;
            const root = q.Original_Quote__c || q.Id;
            if (!byRoot.has(root)) byRoot.set(root, []);
            byRoot.get(root).push(q);
        });

        const families = [];
        byRoot.forEach((members, root) => {
            members.sort((a, b) => (Number(b.Revision_No__c) || 0) - (Number(a.Revision_No__c) || 0));
            const head = { ...members[0] };
            const older = members.slice(1).map(v => ({
                ...v,
                revLabel: 'R' + (Number(v.Revision_No__c) || 0),
                originalTag: (Number(v.Revision_No__c) || 0) === 0 ? 'ORIGINAL' : ''
            }));
            head.rootId = root;
            head.revNo = Number(head.Revision_No__c) || 0;
            head.revBadge = head.revNo > 0 ? 'R' + head.revNo : '';
            head.hasOlder = older.length > 0;
            head.versionChip = older.length > 0 ? (members.length + ' versions') : '';
            head.isExpanded = !this.collapsedFamilies.includes(root);
            head.chevronIcon = head.isExpanded ? 'utility:chevrondown' : 'utility:chevronright';
            // Thread labels: family head wears a LATEST tag, the R0 row ORIGINAL.
            head.latestTag = older.length > 0 ? 'LATEST' : '';
            head.olderVersions = older;
            families.push(head);
        });

        // newest family first, same feel as the old CreatedDate DESC list
        families.sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate));
        return families;
    }

    toggleFamily(event) {
        event.stopPropagation();
        const root = event.currentTarget.dataset.root;
        this.collapsedFamilies = this.collapsedFamilies.includes(root)
            ? this.collapsedFamilies.filter(r => r !== root)
            : [...this.collapsedFamilies, root];
    }

    get formattedQuotes() {
        // 1. Safety check to prevent errors if data hasn't loaded yet
        if (!this.opportunityQuotes || !Array.isArray(this.opportunityQuotes)) {
            return [];
        }

        return this.opportunityQuotes.map(quote => {
            if (!quote) return null;

            // 2. Format the submission date specifically for the blue popover
            const subDate = quote.submition_date__c ? new Date(quote.submition_date__c).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'N/A';

            return {
                ...quote,

                // 👉 NEW: Popover & Approver Fields
                showApprovalPopover: (quote.Id === this.hoveredQuoteId && quote.Status === 'Approved'),
                uiSubmissionDate: subDate,
                ApprovedByName: quote.Approved_by__r ? quote.Approved_by__r.Name : 'System (Self-Approved)',

                // 👇 YOUR EXISTING LOGIC (Kept exactly the same)
                isOwner: (quote.CreatedById === USER_ID && quote.Status === 'Draft'),

                formattedDate: quote.CreatedDate ? new Date(quote.CreatedDate).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                }) : '',

                formattedExpiryDate: quote.ExpirationDate ? new Date(quote.ExpirationDate).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                }) : '',

                                // Approver column: who it is waiting on while In Review, who approved it once
                // Approved; both names already come back from getQuotesByOpportunity.
                // Deepanjan (18th September 2026)
                approverName: (quote.Pending_Approver__r && quote.Pending_Approver__r.Name)
                    ? quote.Pending_Approver__r.Name
                    : ((quote.approved_by__r && quote.approved_by__r.Name) ? quote.approved_by__r.Name : '—'),

                // Amount comes from Final_Quote_Amount__c, the figure APPLY captures
                // off the quote's own totals. GrandTotal is the standard
                // QuoteLineItem roll-up, and these quotes have no QuoteLineItems, so
                // it was always 0.00 and every row in the list read zero.
                // Deepanjan (12th August 2026)
                formattedAmount: Number(quote.Final_Quote_Amount__c)
                    ? `${Number(quote.Final_Quote_Amount__c).toLocaleString('en-US', {
                        minimumFractionDigits: 2, maximumFractionDigits: 2
                    })}` : '0.00',

                // Whoever pressed Submit, for the Pending Approvals table. The child
                // component reads quote.submitterName; nothing set it, so the column
                // rendered blank. Approval_Submitted_By__r.Name is the right source
                // (a manager can submit a quote somebody else built) with the creator
                // as fallback for quotes submitted before that field was stamped.
                // Deepanjan (12th August 2026)
                submitterName: (quote.Approval_Submitted_By__r && quote.Approval_Submitted_By__r.Name)
                    || (quote.CreatedBy && quote.CreatedBy.Name)
                    || 'System',

                // The deadline the approver is working to, for the Pending
                // Approvals table. That table used to show the submission date,
                // which tells the approver nothing actionable - what matters is
                // when the decision is due. Date-only, so no time component.
                // Deepanjan (12th August 2026)
                uiApprovalDueDate: quote.Approval_Due_Date__c
                    ? new Date(quote.Approval_Due_Date__c).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric'
                    }) : 'N/A',

                statusStyle: this.getStatusStyle(quote.Status),
                isDraft: quote.Is_Draft__c === true,   // DRAFT badge - Deepanjan (21st Sep 2026)

                // Rejection reason, shown as a help icon beside the Rejected
                // badge. Without this the submitter only ever sees the word
                // "Rejected" - the reason lived in the record and the
                // notification, and the notification disappears once dismissed.
                // Deepanjan (7th August 2026)
                hasRejectionReason: quote.Status === 'Rejected' &&
                    !!(quote.Rejection_Reason__c && String(quote.Rejection_Reason__c).trim()),
                rejectionTooltip: this.buildRejectionTooltip(quote, subDate)
            };
        }).filter(Boolean); // Safely filters out any null values
    }
    // Text behind the help icon next to a Rejected badge: who rejected it,
    // when, and why. Kept to one string so the markup stays a single
    // <lightning-helptext>. Deepanjan (7th August 2026)
    buildRejectionTooltip(quote, subDate) {
        if (!quote || quote.Status !== 'Rejected') return '';
        const reason = (quote.Rejection_Reason__c || '').trim();
        if (!reason) return '';
        const who = quote.Approved_by__r ? quote.Approved_by__r.Name : '';
        let head = 'Rejected';
        if (who) head += ' by ' + who;
        if (subDate && subDate !== 'N/A') head += ' on ' + subDate;
        const full = head + '\n\n' + reason;
        return full.length > 800 ? full.substring(0, 797) + '...' : full;
    }

    // 👉 1. Checks if the message is completely empty or just spaces
    get isSubmitDisabled() {
        return !this.approvalMessage || this.approvalMessage.trim().length === 0;
    }

    // 👉 2. Greys out the button if disabled, or makes it blue if active
    get submitPopoverButtonStyle() {
        if (this.isSubmitDisabled) {
            return "width: 100%; padding: 8px; border: 1px solid #ecebea; background: #f9f9f9; color: #c9c7c5; font-weight: bold; font-size: 13px; cursor: not-allowed; border-radius: 2px;";
        }
        return "width: 100%; padding: 8px; border: 1px solid #d4dad6; background: white; color: #0176d3; font-weight: bold; font-size: 13px; cursor: pointer; border-radius: 2px;";
    }
    //Added by abhishek sxena 02-06-2026
    get isCurrentQuoteOwner() {
        // If we are viewing an existing quote from the list
        if (this.quoteId && this.opportunityQuotes && this.opportunityQuotes.length > 0) {
            const currentQuote = this.opportunityQuotes.find(q => q.Id === this.quoteId);
            if (currentQuote) {
                return currentQuote.CreatedById === USER_ID;
            }
        }
        // If the quote was just created right now in this session, the active user is the owner
        return true;
    }

    // Getter to evaluate if THIS SPECIFIC QUOTE is the one that is syncing/finalized
    get isQuoteAlreadyFinalized() {
        if (!this.quoteId || !this.opportunityQuotes) return false;
        // Find the quote currently open on the screen
        const activeQuote = this.opportunityQuotes.find(q => q.Id === this.quoteId);
        if (activeQuote) {
            return activeQuote.IsSyncing === true;
        }
        return false;
    }

    // Dynamic button visibility renderer
    get showFinalizeQuoteButton() {
        if (!this.quoteId || !this.opportunityQuotes) return false;

        const activeQuote = this.opportunityQuotes.find(q => q.Id === this.quoteId);
        const isApproved = activeQuote ? activeQuote.Status === 'Approved' : false;
        const isFinalized = this.isQuoteAlreadyFinalized;

        // Render the button only if the active quote is Approved AND it is not the syncing one
        return isApproved && !isFinalized;
    }

    // 3. ADD THE CLICK HANDLER FUNCTION (Put this near your other click handlers like "handleApproveQuote()")
    async handleFinalizeQuote() {
        // Turn on the full screen spinner immediately when clicked
        this.Loading = true;
        try {
            if (!this.quoteId || !this.recordId) {
                throw new Error('Missing tracking parameters (Quote ID or Opportunity ID).');
            }
            // Call Apex to process files and transition stage
            await finalizeQuoteAndAttachDocs({
                opportunityId: this.recordId,
                quoteId: this.quoteId
            });
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Quote has been successfully finalized!',
                    variant: 'success'
                })
            );
            // Refresh database data stream to update IsSyncing and hide the button
            await this.refreshQuotes();

        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Finalization Error',
                    message: error.body ? error.body.message : error.message,
                    variant: 'error'
                })
            );
            console.error('Finalization Exception Trace:', error);
        } finally {
            // Automatically turns off the spinner once processing completes or fails
            this.Loading = false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // QUOTE CLONE - Deepanjan (7th September 2026)
    // Button: only on the finalized (IsSyncing) quote. Modal: the current
    // opportunity is pre-selected; the search box lists the running user's own
    // OPEN opportunities by name (Apex filters owner + IsClosed). Create -> Apex
    // cloneQuote -> toast; same opportunity refreshes the list, another one
    // navigates there so the user lands on the new quote's home.
    // ═══════════════════════════════════════════════════════════════════════
            get showCloneQuoteButton() {
        // Approved OR finalized (IsSyncing). Self-guarded so it never throws while the
        // quote list is still loading. Deepanjan (16th September 2026)
        if (!this.quoteId) return false;
        const q = (this.opportunityQuotes || []).find(x => x.Id === this.quoteId);
        return !!(q && (q.Status === 'Approved' || q.IsSyncing === true));
    }

    // Second line under the selected opportunity: account and stage.
    get cloneSelectedOppMeta() {
        const o = this.cloneSelectedOpp;
        if (!o) return '';
        const parts = [];
        if (o.accountName) parts.push(`Account: ${o.accountName}`);
        if (o.stageName)   parts.push(`Stage: ${o.stageName}`);
        return parts.join('  ·  ');
    }

    // Dropdown opens while searching, or when there is something to show.
    get showCloneDropdown() {
        return this.cloneSearching || this.hasCloneOppOptions || this.showCloneNoResults;
    }

    get cloneComboboxClass() {
        return 'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click'
             + (this.showCloneDropdown ? ' slds-is-open' : '');
    }

    get hasCloneOppOptions() {
        return Array.isArray(this.cloneOppOptions) && this.cloneOppOptions.length > 0;
    }

    get showCloneNoResults() {
        return !this.cloneSearching && !this.hasCloneOppOptions
            && this.cloneSearchTerm && this.cloneSearchTerm.trim().length > 0;
    }

    get isCloneCreateDisabled() {
        return this.cloneCreating || !this.cloneSelectedOpp || !this.cloneSelectedOpp.id;
    }

    async handleOpenCloneModal() {
        this.cloneSearchTerm  = '';
        this.cloneOppOptions  = [];
        this.cloneSelectedOpp = null;
        this.showCloneModal   = true;
        try {
            const cur = await getOpportunityForClone({ opportunityId: this.recordId });
            if (cur) this.cloneSelectedOpp = cur;
        } catch (e) {
            // Default is a convenience; the user can still search.
            console.warn('Clone: could not preload current opportunity', e);
        }
    }

    closeCloneModal() {
        if (this.cloneCreating) return;
        this.showCloneModal = false;
        clearTimeout(this._cloneSearchTimer);
    }

    handleCloneSearchChange(event) {
        const term = event.target.value || '';
        this.cloneSearchTerm = term;
        clearTimeout(this._cloneSearchTimer);
        if (term.trim().length < 2) {
            this.cloneOppOptions = [];
            this.cloneSearching  = false;
            return;
        }
        this.cloneSearching = true;
        this._cloneSearchTimer = setTimeout(async () => {
            try {
                const rows = await searchOpportunitiesForClone({ searchTerm: term.trim() });
                // Guard against a stale response overtaking a newer keystroke.
                if (this.cloneSearchTerm === term) this.cloneOppOptions = rows || [];
            } catch (e) {
                this.cloneOppOptions = [];
                this.showToast('Search failed', (e && e.body && e.body.message) || e.message, 'error');
            } finally {
                this.cloneSearching = false;
            }
        }, 300);
    }

    handleClonePickOpp(event) {
        const id = event.currentTarget.dataset.id;
        const pick = (this.cloneOppOptions || []).find(o => o.id === id);
        if (!pick) return;
        this.cloneSelectedOpp = pick;
        this.cloneOppOptions  = [];
        this.cloneSearchTerm  = '';
    }

    handleCloneClearOpp() {
        this.cloneSelectedOpp = null;
    }

    async handleCloneCreate() {
        if (this.isCloneCreateDisabled) return;
        this.cloneCreating = true;
        try {
            const res = await cloneQuote({ quoteId: this.quoteId, targetOpportunityId: this.cloneSelectedOpp.id });
            this.showCloneModal = false;
            const label = (res && res.newQuoteNumber) ? res.newQuoteNumber : 'New quote';
            this.showToast('Quote cloned', `${label} has been created as a Draft.`, 'success');
            if (res && res.sameOpportunity) {
                await this.refreshQuotes();
            } else if (res && res.opportunityId) {
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: { recordId: res.opportunityId, objectApiName: 'Opportunity', actionName: 'view' }
                });
            }
        } catch (e) {
            this.showToast('Clone failed', (e && e.body && e.body.message) || e.message, 'error');
        } finally {
            this.cloneCreating = false;
        }
    }

    // Dynamically changes the text on the button based on the active view
    get toggleButtonLabel() {
        return this.isExcelViewActive ? 'Back to Quote Details' : 'Generate Offer Document';
    }
    get isQuoteInReview() {
        // Find the active quote in your opportunityQuotes list
        const activeQuote = this.opportunityQuotes.find(q => q.Id === this.quoteId);
        return activeQuote ? activeQuote.Status === 'In Review' : false;
    }
    get isQuoteApproved() {
        // Find the active quote in your opportunityQuotes list
        const activeQuote = this.opportunityQuotes.find(q => q.Id === this.quoteId);
        return activeQuote ? activeQuote.Status === 'Approved' : false;
    }

        // Offer document may be VIEWED any time after save, but DOWNLOADED only once the
    // quote is Approved or finalized. Handed to c-quote-excel-generator. Deepanjan (18th September 2026)
    get canDownloadOffer() {
        const q = (this.opportunityQuotes || []).find(x => x && x.Id === this.quoteId);
        return !!(q && (q.Status === 'Approved' || q.IsSyncing === true));
    }
    // 👉 STRICT APPROVAL BUTTON VISIBILITY
    // 👉 STRICT APPROVAL BUTTON VISIBILITY (15-Char Safe)
    // updated for escalation(05-08)
    get showApproveButton() {
        if (!this.quoteId || !this.opportunityQuotes) return false;
        const activeQuote = this.opportunityQuotes.find(q => q.Id === this.quoteId);
        if (!activeQuote || activeQuote.Status !== 'In Review' || !activeQuote.Pending_Approver__c) {
            return false;
        }
        if (activeQuote.Pending_Approver__c !== USER_ID) return false;

        // If escalation is required and current user is NOT the final target, hide Approve
        if (this.escalationRequired && this.escalationTargetId && this.escalationTargetId !== USER_ID) {
            return false;
        }
        return true;
    }

    get showEscalateButton() {
        if (!this.quoteId || !this.opportunityQuotes) return false;
        const activeQuote = this.opportunityQuotes.find(q => q.Id === this.quoteId);
        if (!activeQuote || activeQuote.Status !== 'In Review' || !activeQuote.Pending_Approver__c) {
            return false;
        }
        if (activeQuote.Pending_Approver__c !== USER_ID) return false;

        // Show Escalate ONLY when escalation is required AND current user is not the target
        return this.escalationRequired === true && this.escalationTargetId && this.escalationTargetId !== USER_ID;
    }
    // 👉 CONTROLS "EDIT / RE-OPEN" BUTTON VISIBILITY
    get canEditQuote() {
        // 1. If it's a brand new quote that hasn't been saved yet, they can edit it
        if (!this.quoteId || !this.opportunityQuotes) return true;

        const activeQuote = this.opportunityQuotes.find(q => q.Id === this.quoteId);
        if (!activeQuote) return true;

        // 2. STRICT SECURITY: The edit button is ONLY visible if the quote 
        // is 'Draft' (not submitted yet) or 'Rejected'. 
        // It disappears completely for 'In Review' and 'Approved'.
        return activeQuote.Status === 'Draft' || activeQuote.Status === 'Rejected' || activeQuote.Status === 'Approved';
    }

    // 👉 FILTER QUOTES AWAITING CURRENT USER OR SUBORDINATES (15-Char Safe)
    // 👉 X-RAY DEBUGGER: FILTER QUOTES AWAITING CURRENT USER
    // 👉 THE FLOODGATE TEST: Shows ALL quotes and logs the raw data to the console
    // 👉 STRICT ROLE HIERARCHY SECURITY (Admin Bypass Removed)
    get pendingApprovalQuotes() {
        if (!this.formattedQuotes || this.formattedQuotes.length === 0) {
            return [];
        }

        // Break the data out of the LWC Proxy Security so the UI can read it
        const readableQuotes = JSON.parse(JSON.stringify(this.formattedQuotes));

        // Strict Filter: 1-to-1 match on User ID only. Hierarchy ignored.
        return readableQuotes.filter(quote => {
            return quote.Status === 'In Review' &&
                quote.Pending_Approver__c != null &&
                quote.Pending_Approver__c === USER_ID; // 👉 LOCK: Exact match only
        });
    }

    // Drives the red dot on the PENDING APPROVALS tab. The markup already
    // referenced this getter but it was never defined, so the badge could never
    // render - undefined is falsy. Deepanjan (6th August 2026)
    get hasPendingApprovals() {
        return this.pendingApprovalQuotes.length > 0;
    }

    // Whoever pressed Submit on the active quote, read from
    // Approval_Submitted_By__c. Approve/reject notifications go back to them,
    // NOT to CreatedById - a manager can submit a quote somebody else built.
    get activeQuoteSubmitter() {
        const q = (this.opportunityQuotes || []).find(x => x.Id === this.quoteId);
        return q ? q.Approval_Submitted_By__c : null;
    }

    // Fire-and-forget custom notification. Never allowed to fail the approval
    // it is reporting on, so it always resolves.
    //
    // No self-recipient guard: when the same person creates the quote and
    // approves it, they are BOTH the submitter and the approver, and they still
    // want the alert. Deepanjan (6th August 2026)
    notifyApproval(quoteId, recipientId, kind) {
        if (!quoteId || !recipientId) {
            console.warn('Notification skipped - missing quoteId or recipientId', { quoteId, recipientId, kind });
            return Promise.resolve();
        }
        return sendQuoteApprovalNotification({ quoteId, recipientId, kind })
            .then(status => {
                // 'SENT' | 'NO_NOTIFICATION_TYPE' | 'QUOTE_NOT_FOUND' | 'FAILED: ...'
                console.log('Approval notification [' + kind + '] ->', recipientId, ':', status);
                return status;
            })
            .catch(err => { console.error('Approval notification failed', err); });
    }

    // 👉 RENAMED HANDLER: Executes the Approval
    handleApproveQuote() {
        // Guard: if escalation is required and this user is not the target, block
        if (this.escalationRequired && this.escalationTargetId && this.escalationTargetId !== USER_ID) {
            this.showToast('Action Required', 'This quote must be escalated before it can be approved.', 'warning');
            return;
        }
        this.Loading = true;
        // Read the submitter BEFORE refreshQuotes() replaces the list.
        const submitterId = this.activeQuoteSubmitter;
        const approvedQuoteId = this.quoteId;
        const fields = {
            Id: this.quoteId,
            Status: 'Approved',
            // Stamps the actual user who clicked the button (e.g., Utkarsh Ji), 
            // even if the quote was originally assigned to the HOD below him!
            approved_by__c: USER_ID,
            submition_date__c: new Date().toISOString()
        };

        // Same masked progress chain as APPLY: the save, the offer capture, the
        // notification and the refresh each need the one before it committed, so
        // they run in sequence behind the blur instead of racing.
        // Deepanjan (7th August 2026)
        this.isApplying = true;
        this._setApplyStep('Approving quote...', 20);
        this._runApprovalChain([
            ['Capturing offer total...', 55, () => this.captureTotals()],
            ['Notifying submitter...', 80, () => this.notifyApproval(approvedQuoteId, submitterId, 'APPROVED')],
            ['Refreshing quotes...', 92, () => this.refreshQuotes()]
        ], () => updateRecord({ fields }), 'Quote approved successfully!', 'Approval failed.');
    }

    /* Shared driver for Submit / Approve / Reject so all three behave exactly
       like APPLY: one masked, sequential chain with a named step and a moving
       bar. `first` is the DML that must land before anything else runs; each
       later step is [label, percent, fn]. A step that throws stops the chain and
       raises the error toast, exactly as the old .catch() blocks did. The mask
       and Loading are always released in finally. Deepanjan (7th August 2026) */
    async _runApprovalChain(steps, first, successMsg, failMsg) {
        try {
            await first();
            this.showToast('Success', successMsg, 'success');

            for (const [label, pct, fn] of steps) {
                this._setApplyStep(label, pct);
                await fn();
            }

            this._setApplyStep('Done', 100);
            await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
            this.showToast('Error', failMsg, 'error');
            console.error(error);
        } finally {
            this.Loading = false;
            this.isApplying = false;
            this.applyProgress = 0;
        }
    }

    //escalation
    async handleEscalateQuote() {
        this.Loading = true;
        try {
            if (!this.escalationTargetId) {
                throw new Error('No escalation target found.');
            }
            const fields = {
                Id: this.quoteId,
                Status: 'In Review',
                Pending_Approver__c: this.escalationTargetId,
                approved_by__c: USER_ID,
                submition_date__c: new Date().toISOString()
            };
            await updateRecord({ fields });
            this.showToast('Success', 'Quote escalated for final approval.', 'success');
            this.escalationRequired = false;
            this.escalationTargetId = null;
            await this.refreshQuotes();
        } catch (error) {
            this.showToast('Error', error.body ? error.body.message : error.message, 'error');
            console.error(error);
        } finally {
            this.Loading = false;
        }
    }

    // Offer total + stage rule, run after either approval path.
    // Deepanjan (3rd August 2026)
    captureTotals() {
        // Returns the promise so the approval chain can await it. It still swallows
        // its own errors, so awaiting can never fail an approval.
        // Deepanjan (7th August 2026)
        return captureOfferTotal({ quoteId: this.quoteId, opportunityId: this.recordId })
            .catch(error => {
                console.error('Offer capture failed', error);
            });
    }

    // 👉 HANDLES REJECTIONS
    // Both Reject buttons still call this. It no longer writes anything - it
    // opens the reason modal, and confirmRejectQuote() does the update once a
    // reason has been typed. Deepanjan (6th August 2026)
    handleRejectQuote() {
        this.rejectionReason = '';
        this.showRejectModal = true;
    }

    handleRejectionReasonChange(event) {
        this.rejectionReason = event.target.value;
    }

    closeRejectModal() {
        this.showRejectModal = false;
        this.rejectionReason = '';
    }

    get isRejectConfirmDisabled() {
        return !this.rejectionReason || this.rejectionReason.trim().length === 0;
    }

    confirmRejectQuote() {
        if (this.isRejectConfirmDisabled) {
            this.showToast('Error', 'Rejection Reason is required.', 'error');
            return;
        }
        // Captured before refreshQuotes() swaps the list out from under us.
        const submitterId = this.activeQuoteSubmitter;
        const rejectedQuoteId = this.quoteId;

        this.Loading = true;
        const fields = {
            Id: this.quoteId,
            Status: 'Rejected',
            // Stamps the manager who rejected it
            approved_by__c: USER_ID,
            Rejection_Reason__c: this.rejectionReason.trim(),
            submition_date__c: new Date().toISOString()
        };

        // Close the modal first so the progress mask is what the user sees.
        this.showRejectModal = false;
        this.rejectionReason = '';

        this.isApplying = true;
        this._setApplyStep('Rejecting quote...', 25);
        this._runApprovalChain([
            // Notify AFTER the save so Apex reads the stored reason.
            ['Notifying submitter...', 70, () => this.notifyApproval(rejectedQuoteId, submitterId, 'REJECTED')],
            ['Refreshing quotes...', 92, () => this.refreshQuotes()]
        ], () => updateRecord({ fields }), 'Quote has been rejected.', 'Rejection failed.');
    }
    // Current revision, rendered next to QUOTE NAME. "R0" is the original version,
    // "R1", "R2"... after each Approved|Rejected -> Draft reopen.
    //
    // Why this stopped showing: the old getter read Revision_No__c off
    // this.opportunityQuotes, the Apex list from getQuotesByOpportunity. That list is
    // fetched once and is NOT refreshed by handleReopenQuote's updateRecord(), and the
    // SOQL may not even select the field - so the number was stale or blank. Reading it
    // from the LDS wire instead means the cache pushes the new value the instant the
    // bump saves. The Apex list stays as a fallback for the frame before the wire
    // resolves. Reetabrata (17th July 2026)
    revisionNo = 0;

    get revisionLabel() {
        let n = Number(this.revisionNo) || 0;
        if (!n) {
            const q = (this.opportunityQuotes || []).find(x => x && x.Id === this.quoteId);
            n = q ? (Number(q.Revision_No__c) || 0) : 0;
        }
        return 'R' + n;
    }

    get approverName() {
        if (!this.opportunityQuotes || !this.quoteId) return 'Approver';

        const activeQuote = this.opportunityQuotes.find(q => q.Id === this.quoteId);
        console.log('DEBUG - Active Quote Data:', JSON.parse(JSON.stringify(activeQuote)));
        console.log('DEBUG - Approver Object:', activeQuote ? activeQuote.approved_by__c : 'No Quote Found');
        // Check if the relationship object and Name exist
        if (activeQuote && activeQuote.approved_by__c && activeQuote.approved_by__r.Name) {
            return activeQuote.approved_by__r.Name;
        }
        return 'System (Self-Approved)';
    }
    // 👉 Gets the Creator's Name to display as the Submitter
    get submitterName() {
        if (!this.opportunityQuotes || !this.quoteId) return 'System';

        const activeQuote = this.opportunityQuotes.find(q => q && q.Id === this.quoteId);

        if (activeQuote && activeQuote.CreatedBy && activeQuote.CreatedBy.Name) {
            return activeQuote.CreatedBy.Name;
        }
        return 'System';
    }
    get formattedSubmissionDate() {
        if (!this.opportunityQuotes || !this.quoteId) return 'N/A';

        const activeQuote = this.opportunityQuotes.find(q => q.Id === this.quoteId);

        // Note: Using the exact spelling from your Apex query (submition_date__c)
        if (activeQuote && activeQuote.submition_date__c) {
            return new Date(activeQuote.submition_date__c).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }
        return 'N/A';
    }
    get isStandardViewActive() {
        return !this.isExcelViewActive;
    }
    get hoverDropdownIcon() {
        return this.isHoverDropdownExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get approvalComments() {
        if (!this.opportunityQuotes || !this.quoteId) return 'No comments provided.';
        const activeQuote = this.opportunityQuotes.find(q => q && q.Id === this.quoteId);
        return activeQuote && activeQuote.Description ? activeQuote.Description : 'No comments provided.';
    }

    get totalQuotesAmount() {
        if (!this.hasQuotes) return '0.00';
        const total = this.opportunityQuotes.reduce((sum, quote) => sum + (Number(quote.GrandTotal) || 0), 0);
        return `${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    get toggleViewIcon() {
        // 'utility:table' = Grid/Sheet icon (to switch to Excel View)
        // 'utility:edit' = Pen icon (to switch back to Quote/Line Item View)
        return this.isExcelViewActive ? 'utility:edit' : 'utility:table';
    }

    getStatusStyle(status) {
        const colors = { 'Draft': '#6b6f7b', 'Approved': '#2e844a', 'Presented': '#fe9339', 'Accepted': '#2e844a', 'Rejected': '#c23934', 'Expired': '#6b6f7b' };
        const color = colors[status] || '#6b6f7b';
        return `background-color: ${color}20; color: ${color}; font-weight: 500; padding: 4px 12px; border-radius: 30px; display: inline-block;`;
    }
    get canViewRates() {
        return this.hasRateAccessFromUser;
    }

    get templateSidebarStyle() { return `width: ${this.templateSidebarWidth}px;`; }
    get contentAreaStyle() { return `width: calc(100% - ${this.templateSidebarWidth}px);`; }
    get isGenerateQuoteVisible() { return this.selectedNavItem === 'GENERATE_QUOTE'; }
    get isCustomerDetailsVisible() { return this.selectedNavItem === 'CUSTOMER_DETAILS'; }
    get isQuotesVisible() { return this.selectedNavItem === 'QUOTES'; }
    get isRatesVisible() { return this.selectedNavItem === 'RATES'; }
    get showSelectionScreen() { return !this.isQuoteCreated; }
    get sidebarTitle() { return this.isQuoteCreated ? this.selectedPicklistValue : 'TEMPLATE SELECTION'; }
    get generateQuoteClass() { return this.selectedNavItem === 'GENERATE_QUOTE' ? 'nav-item active' : 'nav-item'; }
    get customerDetailsClass() { return this.selectedNavItem === 'CUSTOMER_DETAILS' ? 'nav-item active' : 'nav-item'; }
    get quotesClass() { return this.selectedNavItem === 'QUOTES' ? 'nav-item active' : 'nav-item'; }

    get ratesClass() { return this.selectedNavItem === 'RATES' ? 'nav-item active' : 'nav-item'; }

    get pendingApprovalsClass() { return this.selectedNavItem === 'PENDING_APPROVALS' ? 'nav-item active' : 'nav-item'; }

    get isDomesticOrExport() {
        return this.selectedPicklistValue === 'Steel Pipes - Department';
    }

    get showStandardColumns() {
        return !(this.selectedPicklistValue && this.selectedPicklistValue.toUpperCase().includes('PEB'));
    }

    @api
    get tableRows() { return this.rows; }
    set tableRows(value) { this.rows = value ? [...value] : []; }

    handleNavClick(event) {
        this.selectedNavItem = event.currentTarget.dataset.id;
        this.isQuoteCreated = false;
        this.approvalTriggers = null;   // leaving a quote drops its marks - Deepanjan (20th Sep 2026)
        this.selectedPicklistValue = '';
        if ((this.selectedNavItem === 'QUOTES' || this.selectedNavItem === 'PENDING_APPROVALS') && this.recordId) {
            //if (this.selectedNavItem === 'QUOTES' && this.recordId) {
            this.refreshQuotes();
        }
        if (this.selectedNavItem === 'DRAFTS') {
            this.loadMyDrafts();   // DRAFT QUOTES tab - Deepanjan (21st Sep 2026)
        }
    }

    handlePicklistChange(event) {
        this.selectedPicklistValue = event.detail.value;
    }

    async handleCreateClick() {
        this.isQuoteCreated = true;
        // Fresh screen starts blank; the open-quote path restores it right
        // after this call returns.
        this.expirationDate = null;
        this.Loading = true;
        this.showquotescreen = true;

        ////Abhishek saxena 06-05-2026
        if (this.isReadOnlyMode) {
            this.showDocumentGenerator = true;
        } else {
            this.showDocumentGenerator = false;
        }
        //End

        try {
            this.initializationStage = 'Loading Configuration...';

            console.log('Selected Template:', this.selectedPicklistValue);
            // 👉 FETCH BOTH CONFIG AND DATABASE RATES
            const [configData] = await Promise.all([
                getDynamicConfiguration({ templateName: this.selectedPicklistValue })
            ]);

            // 👉 THE CRITICAL FIX: Save the Apex result to the class variable so handleFolderClick can see it!
            this.wrapperData = configData;

            if (configData && configData.canCreate === false) {
                this.showToast(
                    'Access Denied',
                    (configData && configData.denialMessage) ||
                    'You do not have permission to create a quotation. Please contact your system administrator.',
                    'error'
                );
                this.showquotescreen = false;
                this.isQuoteCreated = false;
                this.showDocumentGenerator = false;
                this.Loading = false;
                this.initializationStage = '';
                return;
            }

            this.isApprovalActive = configData.isApprovalActive || false;

            this._hmInitFromMemory();      // [hm-cross] buckets from the saved JSON (or one bucket)
            // [hm-cross] viewQuote ran the approval check before the products were read; with
            // 2+ products it runs again now, over every product (one product: no second call)
            if (this._hmMulti() && this.isReadOnlyMode && this.quoteId) this.checkEscalationForCurrentQuote();

            this._buildQuoteScreen(configData);   // [hm-cross] the build below, unchanged, now callable on a product switch
            if (!this.isReadOnlyMode) {
                this.createQuoteRecord();
            }

        } catch (error) {
            console.error('Error fetching template configuration:', error);
            this.initializationStage = 'Failed';
            this.showToast('Error', (error && error.body && error.body.message) || 'Could not load the quote configuration.', 'error');
            this.showquotescreen = false;
            this.isQuoteCreated = false;
        } finally {
            this.Loading = false;
        }
    }

    // [hm-cross] Body of handleCreateClick from "1. Build the JSON Cache" to the
    // active-sections line, moved here verbatim so a product switch can rebuild the
    // accordion from memory. Nothing inside changed. Deepanjan (27th September 2026)
    _buildQuoteScreen(configData) {
            // 1. Build the JSON Cache safely
            this.jsonLogicCache = {};
            this._cachedAdjustmentRules = [];
            this._cachedNewItemRules = [];
            if (configData.logicRules) {
                configData.logicRules.forEach(rule => {
                    const ctrlVal = rule.Controlling_Value__c || '';
                    const cacheKey = `${rule.Accordion_Section__c}_${ctrlVal}`;
                    this.jsonLogicCache[cacheKey] = rule.JSON_Payload__c;

                    // This makes sure the engine knows what a "Lump Sum" is before the modal opens!
                    if (rule.JSON_Payload__c) {
                        try {
                            const parsed = JSON.parse(rule.JSON_Payload__c);
                            if (parsed._lineItemAdjustments) this._cachedAdjustmentRules.push(...parsed._lineItemAdjustments);
                            if (parsed._newLineItemGenerators) this._cachedNewItemRules.push(...parsed._newLineItemGenerators);
                        } catch (e) { }
                    }
                });
            }

            // 2. Build the Accordions and their Fields
            this.accordionSections = configData.sections.map(sec => {
                let fields = [];

                // 👉 SCENARIO A: PRESERVED EXACTLY AS IT WAS. 
                // If there is a root picklist, do what we have always done.
                if (sec.First_Field_API_Name__c) {
                    let rootFieldOptions = [];
                    if (sec.First_Field_Options__c) {
                        rootFieldOptions = sec.First_Field_Options__c.split(';').map(opt => ({ label: opt.trim(), value: opt.trim() }));
                    }

                    const isRootRequired = sec.First_Field_Required__c || false;

                    // 1. Grab the saved value if we are viewing an existing quote
                    let rootValue = this.modalSavedData[sec.First_Field_API_Name__c] !== undefined ? this.modalSavedData[sec.First_Field_API_Name__c] : '';

                    if (sec.MasterLabel && (sec.MasterLabel.includes('QRF') || sec.MasterLabel.includes('QFR')) && this.hasPebQFRData) {
                        rootValue = 'PEB QRF'; // Changed from 'QFR' to 'PEB QRF'
                    }

                    fields.push({
                        id: `${sec.Id}-root`,
                        apiName: sec.First_Field_API_Name__c,
                        label: sec.First_Field_Label__c,
                        value: rootValue, // 👉 PRE-FILLS THE DATA
                        sequence: `${sec.Sequence_No__c}.1`,
                        isVisible: true,
                        isFirstField: true,
                        isPicklist: true,
                        hasFolderIcon: false,
                        isRequired: isRootRequired,
                        rowClass: isRootRequired && !rootValue ? 'config-row required-row' : 'config-row',
                        options: rootFieldOptions
                    });

                    // 👉 CRITICAL FIX: If we loaded a saved quote, we must instantly inject the child JSON!
                    if (rootValue) {
                        const exactCacheKey = `${sec.Id}_${rootValue}`;
                        const wildcardCacheKey = `${sec.Id}_*`;
                        const jsonString = this.jsonLogicCache[exactCacheKey] || this.jsonLogicCache[wildcardCacheKey];

                        if (jsonString) {
                            try {
                                const parsedConfig = JSON.parse(jsonString);
                                let visibleCount = 2;
                                const newFields = parsedConfig.fields.map((f, idx) => ({

                                    ...f,
                                    id: `${sec.Id}-json-${idx}`,
                                    // 👉 THE FIX: Inline check to swap the label without breaking your structure!
                                    label: (f.type === 'folder' && f.labelFormat) ? f.labelFormat.replace('{value}', rootValue) : f.label,
                                    // 👉 PRE-FILL THE CHILD DATA
                                    value: this.modalSavedData[f.apiName] !== undefined ? this.modalSavedData[f.apiName] : (f.defaultValue !== undefined && f.defaultValue !== null ? f.defaultValue : ''),
                                    isVisible: true,
                                    isFirstField: false,
                                    isPicklist: f.type === 'picklist',
                                    isNumber: f.type === 'number',
                                    isText: f.type === 'text',
                                    isCheckbox: f.type === 'checkbox',
                                    isPebComponent: f.type === 'custom_peb_lwc',
                                    isDomesticComponent: f.type === 'custom_domestic_lwc',
                                    isExportComponent: f.type === 'custom_export_lwc',
                                    isSolarComponent: f.type === 'custom_solar_lwc',
                                    isDate: f.type === 'date',
                                    hasFolderIcon: f.type === 'folder',
                                    iconClass: f.iconColor ? `folder-icon-${f.iconColor}` : 'folder-icon-blue',
                                    iconName: 'utility:open_folder',
                                    isRequired: f.required || false,
                                    rowClass: f.required ? 'config-row required-row' : 'config-row',
                                    options: f.options ? f.options.map(opt => ({ label: opt, value: opt })) : [],
                                    sequence: `${sec.Sequence_No__c}.${visibleCount++}`
                                }));
                                fields = [...fields, ...newFields];
                            } catch (e) { }
                        }
                    }
                }
                // 👉 SCENARIO B: NO ROOT PICKLIST
                else {
                    const exactCacheKey = `${sec.Id}_default`;
                    const wildcardCacheKey = `${sec.Id}_*`;
                    const nullCacheKey = `${sec.Id}_`;

                    const jsonString = this.jsonLogicCache[exactCacheKey] || this.jsonLogicCache[wildcardCacheKey] || this.jsonLogicCache[nullCacheKey];

                    if (jsonString) {
                        try {
                            const parsedConfig = JSON.parse(jsonString);
                            let visibleCount = 1;

                            fields = parsedConfig.fields.map((f, idx) => ({
                                ...f,
                                id: `${sec.Id}-json-${idx}`,
                                // 👉 PRE-FILL THE DATA
                                value: this.modalSavedData[f.apiName] !== undefined ? this.modalSavedData[f.apiName] : (f.defaultValue !== undefined && f.defaultValue !== null ? f.defaultValue : ''),
                                isVisible: true,
                                isFirstField: false,
                                isPicklist: f.type === 'picklist',
                                isNumber: f.type === 'number',
                                isText: f.type === 'text',
                                isCheckbox: f.type === 'checkbox',
                                isPebComponent: f.type === 'custom_peb_lwc',
                                isDomesticComponent: f.type === 'custom_domestic_lwc',
                                isExportComponent: f.type === 'custom_export_lwc',
                                isSolarComponent: f.type === 'custom_solar_lwc',
                                isDate: f.type === 'date',
                                hasFolderIcon: f.type === 'folder',
                                iconClass: f.iconColor ? `folder-icon-${f.iconColor}` : 'folder-icon-blue',
                                iconName: 'utility:open_folder',
                                isRequired: f.required || false,
                                rowClass: f.required ? 'config-row required-row' : 'config-row',
                                options: f.options ? f.options.map(opt => ({ label: opt, value: opt })) : [],
                                sequence: `${sec.Sequence_No__c}.${visibleCount++}`
                            }));
                        } catch (e) { }
                    }
                }

                return {
                    id: sec.Id,
                    name: sec.MasterLabel,
                    label: `${sec.Sequence_No__c}. ${sec.MasterLabel}`,
                    sequenceNo: sec.Sequence_No__c,
                    controllingField: sec.Controlling_Field__c,
                    controllingValue: sec.Controlling_Value__c,
                    isVisible: !sec.Controlling_Field__c,
                    fields: fields
                };
            });

            // ========================================================
            // 👉 THE FIX: INITIAL FIELD VISIBILITY ENGINE
            // Hides dependent fields perfectly when loading a saved quote
            // ========================================================
            this.accordionSections.forEach(sec => {
                let visibleCount = 1;
                sec.fields.forEach(f => {
                    // Root fields are always visible
                    if (f.isFirstField) {
                        f.isVisible = true;
                    }
                    // Evaluate dependent fields
                    else if (f.controllingField) {
                        const parentApiNames = f.controllingField.includes(',')
                            ? f.controllingField.split(',').map(s => s.trim())
                            : [f.controllingField];

                        let isFieldVisible = false;

                        // Adding context to handle evaluation based on controlling operator - rajeev 17-05-2026
                        const fieldOperator = f.controllingOperator || 'OR';
                        let fieldMatchCount = 0;

                        for (const rawApiName of parentApiNames) {
                            const isNegated = rawApiName.startsWith('!');
                            const apiName = isNegated ? rawApiName.substring(1) : rawApiName;

                            let parentHasValue = false;
                            let rawParentValue = '';

                            // 1. Check saved memory first
                            if (this.modalSavedData && this.modalSavedData[apiName] !== undefined && this.modalSavedData[apiName] !== '') {
                                const val = this.modalSavedData[apiName];
                                parentHasValue = (val === true) || (val !== '' && val !== null && val !== false);
                                rawParentValue = (val === null || val === undefined) ? '' : String(val);
                            }
                            // 2. Fallback to checking the screen layout
                            else {
                                let parent = null;
                                for (const s of this.accordionSections) {
                                    parent = s.fields.find(p => p.apiName === apiName);
                                    if (parent) break;
                                }
                                if (parent) {
                                    parentHasValue = parent.type === 'checkbox' ? parent.value === true : (parent.value !== '' && parent.value !== null && parent.value !== undefined);
                                    rawParentValue = parent.value ? String(parent.value) : '';
                                }
                            }

                            // Evaluate rules
                            if (isNegated && !parentHasValue) {
                                //isFieldVisible = true;
                                //break;
                                fieldMatchCount++;
                                if (fieldOperator === 'OR') {
                                    isFieldVisible = true;
                                    break;
                                }

                            } else if (!isNegated && parentHasValue) {
                                const controllingValues = f.controllingValues || ['*'];
                                const safeParentValue = rawParentValue.toLowerCase();
                                const safeControllingValues = controllingValues.map(v => String(v).toLowerCase());

                                const matchedNum = safeControllingValues.some(cv => {
                                    if (cv.startsWith('>=')) {
                                        return !isNaN(Number(rawParentValue)) && Number(rawParentValue) >= Number(cv.substring(2));
                                    }
                                    return false;
                                });

                                if (safeControllingValues.includes('*') || matchedNum || safeControllingValues.includes(safeParentValue)) {
                                    isFieldVisible = true;
                                    if (f.hasFolderIcon && f.labelFormat) {
                                        f.label = f.labelFormat.replace('{value}', rawParentValue);
                                    }
                                    fieldMatchCount++;
                                    if (fieldOperator === 'OR') {
                                        isFieldVisible = true;
                                        break;
                                    }
                                    //break;
                                }
                            }
                        }

                        // ← NEW: AND final evaluation after loop completes
                        if (fieldOperator === 'AND') {
                            isFieldVisible = fieldMatchCount === parentApiNames.length;
                        }
                        f.isVisible = isFieldVisible;
                    }
                    else {
                        f.isVisible = true; // No controlling field = always visible
                    }

                    // Apply UI classes and sequence numbering
                    if (f.isRequired && !f.value && !f.hasFolderIcon) {
                        f.rowClass = 'config-row required-row';
                    } else {
                        f.rowClass = 'config-row';
                    }
                    if (f.isVisible) {
                        f.sequence = `${sec.sequenceNo}.${visibleCount++}`;
                    }
                });
            });
            // ========================================================

            // OFF-SCREEN FIELD MEMORY (b) - Deepanjan (5th September 2026)
            // A quote saved before the fix may still carry a stale controlling key
            // (e.g. mast_standard from a mast type since changed). Drop it BEFORE the
            // section engine reads memory, so KIT CODE is not resurrected on reopen.
            this._forgetStaleControllingKeys();

            // 👉 RUN VISIBILITY ENGINE BASED ON SAVED DATA (Section Level)
            this.accordionSections.forEach(globalSec => {
                if (globalSec.controllingField) {
                    const controllingFieldsArray = globalSec.controllingField.split(',').map(s => s.trim());
                    let isConditionMet = false;

                    // Adding context to handle evaluation based on controlling operator - rajeev 17-05-2026
                    const operator = globalSec.controllingOperator || 'OR';
                    let matchCount = 0; //  track match for and operator

                    for (let targetApiName of controllingFieldsArray) {
                        // Check if the saved data has the answer required to unlock this section
                        if (this.modalSavedData && this.modalSavedData[targetApiName] !== undefined && this.modalSavedData[targetApiName] !== '') {
                            const modalVal = String(this.modalSavedData[targetApiName]);
                            const isMatch = !globalSec.controllingValue ||
                                globalSec.controllingValue === '*' ||
                                globalSec.controllingValue.split(',').map(v => v.trim()).includes(modalVal);

                            if (isMatch) {
                                //isConditionMet = true; break; 
                                matchCount++;
                                if (operator === 'OR') {
                                    isConditionMet = true;
                                    break;
                                }
                            }
                        }
                    }

                    // AND: every field must match
                    if (operator === 'AND') {
                        isConditionMet = matchCount === controllingFieldsArray.length;
                    }

                    globalSec.isVisible = isConditionMet;
                }
            });

            // Expand only the visible sections
            this.activeSections = this.accordionSections.filter(sec => sec.isVisible).map(sec => sec.name);
    }

    // =========================================================================
    // Creating Quote
    // =========================================================================

    createQuoteRecord() {
        // A quote that already has its record (a draft being resumed) must not get a
        // second one - quoteId would jump to an empty record and every later save
        // would land there. The CREATE button always clears quoteId first (see
        // handleCreateNewQuote), so a genuinely new quote still gets its record.
        // Deepanjan (21st September 2026)
        if (this.quoteId) return;

        const initialName = this.selectedPicklistValue || 'New Quote';

        const recordInput = {
            apiName: 'Quote',
            fields: {
                Name: initialName,
                OpportunityId: this.recordId
            }
        };

        createRecord(recordInput)
            .then(result => {
                this.quoteId = result.id; // ✅ triggers @wire
                console.log('Quote Id:', this.quoteId);
            })
            .catch(error => {
                console.error('Error:', JSON.stringify(error, null, 2));
            });
    }

    @wire(getRecord, { recordId: '$quoteId', fields: [QUOTE_NUMBER_FIELD, REVISION_NO_FIELD] })
    wiredQuote({ data, error }) {
        if (data) {
            this.quoteNumber = data.fields.QuoteNumber.value;
            // LDS keeps this in sync: handleReopenQuote's updateRecord() writes
            // Revision_No__c, the cache notifies this wire, revisionLabel re-renders.
            // Reetabrata (17th July 2026)
            this.revisionNo = data.fields.Revision_No__c
                ? (Number(data.fields.Revision_No__c.value) || 0)
                : 0;
            console.log('Quote Number:', this.quoteNumber, '| Revision:', this.revisionNo);

            // QUOTE REFERENCE - Deepanjan (21st July 2026): now that QuoteNumber
            // exists, stamp Quote_Reference__c once. Guarded by a flag so the wire
            // re-firing (e.g. on revision bump) doesn't spam DML; a revision gets
            // its own reference from createRevision on the server anyway.
            if (this.quoteNumber && !this._refStamped && !this._isSaving) {
                this._refStamped = true;
                generateQuoteReference({
                    quoteId: this.quoteId,
                    department: this.selectedPicklistValue
                })
                    .then(ref => { console.log('Quote Reference:', ref); })
                    .catch(err => {
                        this._refStamped = false;   // allow a retry on next wire tick
                        console.error('generateQuoteReference error:', JSON.stringify(err));
                    });
            }
        } else if (error) {
            console.error(error);
        }
    }


    // =========================================================================
    // OFF-SCREEN FIELD MEMORY - Deepanjan (5th September 2026)
    //
    // THE BUG. type_of_mast = Standard Mast, mast_standard = Lighting Mast: the KIT
    // CODE accordion unlocks (its Controlling_Field is mast_standard, mast_customized,
    // type_of_mast). Change type_of_mast to Octagonal Pole. SCENARIO 1 swaps the
    // Weight Estimator's JSON fields - mast_standard is REMOVED from the screen - but
    // handleFieldValueChange had already written modalSavedData.mast_standard =
    // 'Lighting Mast' and nothing ever removes it. The section engine's CHECK 2
    // ("is the field hiding inside our saved Modal memory?") then finds that stale
    // value and keeps KIT CODE open for a mast that has no KIT.
    //
    // It is worse than a screen leak. The Back/Save scrape only ADDS keys, so the stale
    // mast_standard is persisted into Quote_Value__c, and HighMastSOWController reads
    // mast_standard BEFORE mast_standard_pole - an Octagonal quote can be routed
    // through the High Mast offer builder. And on reopen the load-time engine reads
    // only modalSavedData, so KIT comes back even after the user had "fixed" it.
    //
    // THE FIX: a field that leaves the screen leaves the memory.
    //  (a) Live: when SCENARIO 1 removes the old sub-config's fields, drop their keys -
    //      only fields that actually carried a value on screen, so a key some modal
    //      wrote under the same name is never touched.
    //  (b) Load: self-heal quotes saved before this fix - drop a key only when it is a
    //      CONTROLLING field of some accordion, is not on screen now, and is an
    //      on-screen field of a sibling sub-config. That is exactly the class of key
    //      that leaks; modal-owned keys never qualify.
    //
    // GATED to the High Mast department. Every department shares this engine; for the
    // others nothing changes until they have been checked. In High Mast the on-screen
    // sub-config fields are only the three picklists (mast_standard, mast_customized,
    // mast_standard_pole) plus folders, none shared with any blueprint key - verified
    // against every Section Logic and Blueprint record on 5 Sep 2026.
    // =========================================================================
    _offScreenPurgeEnabled() {
        return this.selectedPicklistValue === 'High Mast - Department';
    }

    /** (a) Live purge. `removedFields` are the field objects SCENARIO 1 just took off
     *  the screen. Returns the api names actually dropped. */
    _forgetRemovedFields(removedFields) {
        if (!this._offScreenPurgeEnabled() || !this.modalSavedData || !removedFields) return [];
        const dropped = [];
        removedFields.forEach(f => {
            if (!f || !f.apiName || f.isFirstField || f.hasFolderIcon || f.type === 'header') return;
            const v = f.value;
            if (v === undefined || v === null || v === '') return;   // never held a screen value -> not ours to drop
            if (Object.prototype.hasOwnProperty.call(this.modalSavedData, f.apiName)) {
                delete this.modalSavedData[f.apiName];
                dropped.push(f.apiName);
            }
        });
        if (dropped.length) this.modalSavedData = { ...this.modalSavedData };
        return dropped;
    }

    /** (b) Load-time self-heal. See the note above for the three conditions. */
    _forgetStaleControllingKeys() {
        if (!this._offScreenPurgeEnabled() || !this.modalSavedData || !this.jsonLogicCache) return [];
        // every controlling api name any accordion depends on
        const controlling = new Set();
        (this.accordionSections || []).forEach(sec => {
            if (sec.controllingField) {
                sec.controllingField.split(',').map(x => x.trim()).filter(Boolean).forEach(a => controlling.add(a));
            }
        });
        if (controlling.size === 0) return [];
        // everything currently on screen
        const onScreen = new Set();
        (this.accordionSections || []).forEach(sec => (sec.fields || []).forEach(f => { if (f && f.apiName) onScreen.add(f.apiName); }));
        // on-screen (top-level, non-folder) field names of every sub-config
        const subConfigFields = new Set();
        Object.keys(this.jsonLogicCache).forEach(k => {
            try {
                const cfg = JSON.parse(this.jsonLogicCache[k]);
                (cfg && Array.isArray(cfg.fields) ? cfg.fields : []).forEach(f => {
                    if (f && f.apiName && f.type !== 'folder' && f.type !== 'header') subConfigFields.add(f.apiName);
                });
            } catch (e) { /* not JSON - skip */ }
        });
        const dropped = [];
        controlling.forEach(api => {
            if (onScreen.has(api)) return;
            if (!subConfigFields.has(api)) return;
            if (Object.prototype.hasOwnProperty.call(this.modalSavedData, api)) {
                delete this.modalSavedData[api];
                dropped.push(api);
            }
        });
        if (dropped.length) this.modalSavedData = { ...this.modalSavedData };
        return dropped;
    }

    // =========================================================================
    // MODULAR JSON INJECTION & MULTI-SECTION VISIBILITY ENGINE
    // =========================================================================
    handleFieldValueChange(event) {
        console.log('Field Value Changed:', event.detail.value);
        this.isQuoteSaved = false;
        const fieldApiName = event.currentTarget.dataset.name;
        const sectionId = event.currentTarget.dataset.section;
        const selectedValue = event.detail.value;
        this.selectedProduct = selectedValue; // Store selected product for folder click context

                // STEEL PIPE ACCESS - Deepanjan (22nd September 2026): Market type Domestic/Export
        // is refused without the matching User checkbox; combobox goes back, nothing runs.
        if (this.selectedPicklistValue === 'Steel Pipes - Department' && fieldApiName === 'market_type') {
            const spBlock = this._steelPipeBlockMsg(selectedValue);
            if (spBlock) {
                this.showToast('Access Denied', spBlock, 'error');
                const prev = this.modalSavedData[fieldApiName];
                event.target.value = (prev === undefined || prev === null) ? '' : prev;
                return;
            }
        }

        /// 👉 INTERCEPT 'QFR' VALUE TO OPEN MODAL
        if (selectedValue === 'QFR') {
            this.isPebQFRModalOpen = true;
        }
        this.modalSavedData[fieldApiName] = selectedValue;

        this.modalSavedData = { ...this.modalSavedData };

        const sectionIndex = this.accordionSections.findIndex(sec => sec.id === sectionId);

        if (sectionIndex !== -1) {
            let section = this.accordionSections[sectionIndex];
            let fields = section.fields;

            const fieldIndex = fields.findIndex(f => f.apiName === fieldApiName);
            if (fieldIndex !== -1) {

                const changedField = fields[fieldIndex];
                changedField.value = selectedValue;

                // SCENARIO 1: The Root Field changed. Inject the JSON!
                if (changedField.isFirstField) {

                    // OFF-SCREEN FIELD MEMORY (a) - Deepanjan (5th September 2026)
                    const __removedFields = fields.filter(f => !f.isFirstField);
                    fields = fields.filter(f => f.isFirstField); // Clear old JSON fields
                    const exactCacheKey = `${sectionId}_${selectedValue}`;
                    const wildcardCacheKey = `${sectionId}_*`;
                    const jsonString = this.jsonLogicCache[exactCacheKey] || this.jsonLogicCache[wildcardCacheKey];

                    if (jsonString) {
                        try {
                            const parsedConfig = JSON.parse(jsonString);

                            const newFields = parsedConfig.fields.map((f, idx) => ({
                                ...f,
                                id: `${sectionId}-json-${idx}`,
                                value: '',
                                isVisible: false,
                                isFirstField: false,
                                isPicklist: f.type === 'picklist',
                                isNumber: f.type === 'number',
                                isText: f.type === 'text',
                                isPebComponent: f.type === 'custom_peb_lwc',
                                hasFolderIcon: f.type === 'folder',
                                iconClass: f.iconColor ? `folder-icon-${f.iconColor}` : 'folder-icon-blue',
                                iconName: 'utility:open_folder',
                                isRequired: f.required || false,
                                rowClass: f.required ? 'config-row required-row' : 'config-row',
                                options: f.options ? f.options.map(opt => ({ label: opt, value: opt })) : []
                            }));

                            fields = [...fields, ...newFields];
                        } catch (e) {
                            console.error('Invalid JSON Payload:', e);
                        }
                    }

                    // OFF-SCREEN FIELD MEMORY (a) - Deepanjan (5th September 2026)
                    // The old sub-config's fields are off the screen now; their keys go too,
                    // so the section engine below evaluates against what the user can see.
                    this._forgetRemovedFields(__removedFields);
                }

                // SCENARIO 2: Re-Evaluate Dependency Rules (Inside the current section)
                let visibleCount = 1;

                fields.forEach(f => {
                    if (f.isFirstField) {
                        f.isVisible = true;
                    }
                    else if (f.controllingField) {
                        const parent = fields.find(p => p.apiName === f.controllingField);

                        if (parent && parent.isVisible && parent.value) {
                            if (f.controllingValues.includes('*') || f.controllingValues.includes(parent.value)) {
                                f.isVisible = true;
                                if (f.hasFolderIcon && f.labelFormat) {
                                    f.label = f.labelFormat.replace('{value}', parent.value);
                                }
                            } else {
                                f.isVisible = false;
                                f.value = '';
                            }
                        } else {
                            f.isVisible = false;
                            f.value = '';
                        }
                    }

                    // 👉 DYNAMIC RED LINE LOGIC
                    if (f.isRequired && !f.value && !f.hasFolderIcon) {
                        f.rowClass = 'config-row required-row';
                    } else {
                        f.rowClass = 'config-row';
                    }

                    if (f.isVisible) {
                        f.sequence = `${section.sequenceNo}.${visibleCount++}`;
                    }
                });

                // Update Array to trigger LWC Reactivity for this section
                section.fields = fields;

                // ========================================================
                // SCENARIO 3: GLOBAL SECTION VISIBILITY EVALUATION
                // ========================================================
                let newlyRevealedSections = [];

                this.accordionSections.forEach(globalSec => {
                    if (globalSec.controllingField) {

                        const controllingFieldsArray = globalSec.controllingField.split(',').map(s => s.trim());
                        let isConditionMet = false;

                        // Adding context to handle evaluation based on controlling operator - rajeev 17-05-2026
                        const operator = globalSec.controllingOperator || 'OR';
                        let matchCount = 0; //  track match for and operator

                        for (let targetApiName of controllingFieldsArray) {
                            let targetFieldObj = null;
                            for (let s of this.accordionSections) {
                                targetFieldObj = s.fields.find(f => f.apiName === targetApiName);
                                if (targetFieldObj) break;
                            }

                            let fieldMatched = false;

                            // CHECK 1: Is the field directly on the screen?
                            if (targetFieldObj && targetFieldObj.isVisible && targetFieldObj.value) {
                                const isMatch = !globalSec.controllingValue ||
                                    globalSec.controllingValue === '*' ||
                                    globalSec.controllingValue.split(',').map(v => v.trim()).includes(targetFieldObj.value);

                                if (isMatch) {
                                    fieldMatched = true
                                    //isConditionMet = true;
                                    //break;
                                }
                            }
                            // CHECK 2: Is the field hiding inside our saved Modal memory?
                            else if (this.modalSavedData && this.modalSavedData[targetApiName]) {
                                const modalVal = String(this.modalSavedData[targetApiName]);
                                const isMatch = !globalSec.controllingValue ||
                                    globalSec.controllingValue === '*' ||
                                    globalSec.controllingValue.split(',').map(v => v.trim()).includes(modalVal);

                                if (isMatch) {
                                    //isConditionMet = true;
                                    //break;
                                    fieldMatched = true
                                }
                            }

                            if (fieldMatched) {
                                matchCount++;
                                if (operator === 'OR') {
                                    isConditionMet = true;
                                    break;
                                }
                            }
                        }

                        // AND: every field in the array must have matched
                        if (operator === 'AND') {
                            isConditionMet = matchCount === controllingFieldsArray.length;
                        }

                        if (isConditionMet) {
                            if (!globalSec.isVisible) {
                                globalSec.isVisible = true;
                                newlyRevealedSections.push(globalSec.name);
                            }
                        } else {
                            globalSec.isVisible = false;
                        }
                    }
                });

                this.accordionSections = [...this.accordionSections];

                // Auto-expand newly unlocked sections!
                if (newlyRevealedSections.length > 0) {
                    this.activeSections = [...this.activeSections, ...newlyRevealedSections];
                }
            }
        }
        this._applyDynamicLineItemAdjustments();

        // TRANSMISSION TOWER ONLY - no-op for every other department/field.
        // modalSavedData[fieldApiName] was already written at the top of this
        // method, so the recompute sees the NEW value.
        this._triggerTowerCascade(fieldApiName);
    }

    // handle Cross Json accessibility for Transmisison Tower - Rajeev 08-05-2-26
    crossPriceVariationContext(processedConfig) {

        // GUARD: exits instantly for Tower, Substation, Kit Code, Address modals
        if (!processedConfig || !processedConfig.requiresCrossModalData) {
            return processedConfig;
        }

        // TRACK 1: Merge all modalSavedData into savedData
        // so formula engines that read savedData directly also get access
        processedConfig.savedData = {
            ...this.modalSavedData,
            ...(processedConfig.savedData || {})
        };

        // TRACK 2: Collect virtual hidden fields from modalSavedData
        const virtualFields = [];

        // ✅ forEach only COLLECTS — no section injection inside here
        Object.keys(this.modalSavedData).forEach(key => {

            // Skip internal keys like _Saved_Template_Name, _pendingLineItems
            if (key.startsWith('_')) return;

            const val = this.modalSavedData[key];

            // Skip empty values
            if (val === undefined || val === null) return;

            // Skip keys already declared as real fields in this modal
            // so PV Factor's own fields are never overwritten
            let existsInModal = false;
            if (processedConfig.modalFields) {
                for (const sec of processedConfig.modalFields) {
                    if (sec.fields && sec.fields.some(f => f.apiName === key)) {
                        existsInModal = true;
                        break;
                    }
                }
            }
            if (existsInModal) return;

            // Add to virtual fields array
            virtualFields.push({
                apiName: key,
                label: '',
                type: 'hidden',
                value: val,
                defaultValue: val,
                isVisible: false,
                readOnly: true,
                colSpan: 0
            });
        }); // ✅ forEach ends here — all keys collected

        // ✅ Section injection is OUTSIDE forEach — runs once after all keys collected
        if (virtualFields.length > 0) {
            const virtualSection = {
                id: '__cross_modal_context__',
                label: '',
                expanded: false,
                isVisible: false,
                showRequired: false,
                fields: virtualFields,
                controllingField: '__virtual_never_visible__',
                controllingValues: [
                    '__virtual_never_match__'
                ]
            };

            // Prepend so formula evaluator sees pvt_*, pvs_* before PV Factor formulas run
            processedConfig.modalFields = [
                virtualSection,
                ...processedConfig.modalFields
            ];
        }

        return processedConfig; // ✅ Returns the enriched config to handleFolderClick
    }

    collectAllAPIs() {
        const apiDefaults = {};
        const registerField = (field) => {
            if (!field || !field.apiName || field.type === 'header') return;
            if (!(field.apiName in apiDefaults)) {
                apiDefaults[field.apiName] = field.type === 'checkbox' ? false : null;
            }
            // Recurse into nested folder modal configs
            if (field.modalConfigsByValue) {
                Object.values(field.modalConfigsByValue).forEach(cfg => {
                    if (cfg.modalFields) {
                        cfg.modalFields.forEach(sec => {
                            if (sec.fields) sec.fields.forEach(registerField);
                        });
                    }
                });
            }
        };
        this.accordionSections.forEach(sec => {
            if (sec.fields) sec.fields.forEach(registerField);
        });

        return apiDefaults;
    }

    // 👉 NEW: Added 'async' keyword here
    async handleFolderClick(event) {
        const folderApiName = event.currentTarget.dataset.name;
        const sectionId = event.currentTarget.dataset.section;

        // show feedback immediately, before any heavy work - Reetabrata (8th July)
        this.Loading = true;
        await new Promise(requestAnimationFrame);
        // 👉 DOMESTIC STEEL PIPE INTERCEPT
        // Fires when Steel Pipes department + any folder field is clicked while Domestic is selected
        if (this.selectedPicklistValue === 'Steel Pipes - Department' &&
            (folderApiName === 'steel_pipes_folder' || folderApiName === 'sp_details_folder')) {

            let currentSection = this.accordionSections.find(sec => sec.id === sectionId);
            let rootField = currentSection ? currentSection.fields.find(f => f.isFirstField) : null;
            let rootValue = rootField ? this.modalSavedData[rootField.apiName] : null;

            console.log('[Domestic] folderApiName:', folderApiName, '| rootValue:', rootValue);

                        // STEEL PIPE ACCESS - Deepanjan (22nd September 2026)
            const spBlock = this._steelPipeBlockMsg(rootValue);
            if (spBlock) {
                this.showToast('Access Denied', spBlock, 'error');
                this.Loading = false;
                return;
            }

            if (rootValue === 'Domestic') {
                this.isSteelPipeModalOpen = true;
                this.Loading = false;
                return;
            } else if (rootValue === 'Export') {
                this.isExportSteelPipeModalOpen = true;
                this.Loading = false;
                return;
            }
        }

        // 👉 SOLAR STRUCTURE INTERCEPT
        // Fires when any folder field is clicked while Solar Structure is selected
        if ((this.selectedPicklistValue === 'Solar Structure - Department' ||
            this.selectedPicklistValue === 'SOLAR STRUCTURE' ||
            (this.selectedPicklistValue && this.selectedPicklistValue.toUpperCase().includes('SOLAR STRUCTURE'))) &&
            folderApiName === 'solar_structure_folder') {

            let currentSection = this.accordionSections.find(sec => String(sec.id) === String(sectionId));
            let rootField = currentSection ? currentSection.fields.find(f => f.isFirstField) : null;
            let rootValue = rootField ? this.modalSavedData[rootField.apiName] : null;

            this.solarStructureUom = this.modalSavedData['uom'] ||
                this.modalSavedData['unit_of_measurement'] ||
                rootValue ||
                'Weight';

            this.isSolarStructureModalOpen = true;
            this.Loading = false;
            return;
        }

        // ═══════════════════════════════════════════════════════════════
        // 👉 PEB COST ESTIMATOR INTERCEPT
        // Fires when the PEB folder is clicked and the root field value 
        // is exactly 'Peb Cost Estimator'
        // ═══════════════════════════════════════════════════════════════
        // Note: Variables renamed to pebSection/pebUserSelectedValue to prevent 
        // duplicate declaration errors with the generic folder logic below.
        const pebSection = this.accordionSections.find(sec => sec.id === sectionId);
        let pebUserSelectedValue = 'default';
        if (pebSection) {
            const pebFolderField = pebSection.fields.find(f => f.apiName === folderApiName);
            if (pebFolderField && pebFolderField.controllingField) {
                const pebParentField = pebSection.fields.find(p => p.apiName === pebFolderField.controllingField);
                pebUserSelectedValue = pebParentField && pebParentField.value ? pebParentField.value : null;
            }
        }

        // 👉 PEB QFR INTERCEPT
        // Replace 'peb_qfr_folder' with the exact API name of the folder field in your JSON
        if (folderApiName === 'peb_qrf_folder') {   // fixed: qrf, not qfr
            this.isPebQFRModalOpen = true;
            this.Loading = false;
            return;
        }

        /*if (pebUserSelectedValue === 'Peb Cost Estimator') {
            console.log('[PEB] Opening PEB Cost Estimator Modal for value:', pebUserSelectedValue);
            this.isPebModalOpen = true;
            this.Loading = false;
            return; // Stops execution here so it doesn't try to open a standard JSON modal
        }*/

        // =========================================================
        // 👉 NEW SAFELY WRAPPED KIT CODE INTERCEPTOR 
        // =========================================================
        if (folderApiName === 'lm_kit_code_folder') {
            try {

                this.Loading = true;
                await Promise.resolve();

                // STADIUM MAST: the KIT belongs to the Man Riding Lift - Deepanjan (8th
                // September 2026). The KIT accordion stays on screen (it is metadata-driven
                // by mast type), but with Man Riding Lift unticked - e.g. a Ladder With
                // Cage-only quote - the folder does not open. Same Stadium test as
                // _validateKitRequiredFinal: only a Stadium estimator saves man_riding_lift.
                {
                    const sd = this.modalSavedData || {};
                    if (Object.prototype.hasOwnProperty.call(sd, 'man_riding_lift')) {
                        const mrl = sd.man_riding_lift;
                        if (!(mrl === true || String(mrl).toLowerCase() === 'true')) {
                            this.showToast(
                                'KIT Code Details',
                                'KIT Code Details applies to the Man Riding Lift only. Tick Man Riding Lift in the Stadium Mast Estimator to fill in the KIT.',
                                'warning'
                            );
                            this.Loading = false;
                            return;
                        }
                    }
                }

                // 1. Process the saved data safely
                const structuredData = this.normalizeEstimatorPayload(this.modalSavedData || {});

                // 👉 SMALL, SELF-CONTAINED FIX — only fires when this department has NO real
                // repeater lines (r1_/r2_...). Departments that already generate real
                // repeater data (Lighting Mast, etc.) are completely untouched, because
                // structuredData.lines.length will already be > 0 for them.

                const h = structuredData.header || {};
                if (h.mrl_height_of_mast || h.mrl_no_of_segment) {
                    // Write under the EXACT key names the shared blueprint formula expects,
                    // directly onto modalSavedData so the child modal's _lastValues bridge sees them.
                    this.modalSavedData.r1_lm_height_of_mast = h.mrl_height_of_mast;
                    this.modalSavedData.r1_lm_no_of_segment = h.mrl_no_of_segment;
                    this.modalSavedData.r1_lm_quantity = h.mrl_quantity;

                    structuredData.lines = [{
                        _lineIndex: 1,
                        lm_height_of_mast: h.mrl_height_of_mast,
                        lm_no_of_segment: h.mrl_no_of_segment,
                        lm_quantity: h.mrl_quantity
                    }];
                }
                // [hm-kit] STADIUM MAST with several Man Riding Lifts: one KIT line per lift.
                // The block above bridges lift 1 into row 1, as before; lift k (m<k>_mrl_)
                // is bridged into row k the same way, so KIT line k reads lift k's own
                // height, segments and quantity. With one lift the result is what the block
                // above built. Deepanjan (29th September 2026)
                {
                    const __hmLifts = this._hmStadiumLifts(this.modalSavedData);
                    if (__hmLifts) {
                        this._hmBridgeStadiumLifts(__hmLifts);
                        structuredData.lines = __hmLifts.map(l => ({
                            _lineIndex: l.k,
                            lm_height_of_mast: l.height,
                            lm_no_of_segment: l.seg,
                            lm_quantity: l.qty
                        }));
                    }
                }


                // ═══════════════════════════════════════════════════════════════════════
                // KIT CONFIG OF THE *CLICKED* ACCORDION. Reetabrata (15th July 2026)
                // More than one KIT accordion can exist (the shared one, and a type-specific one
                // such as LCLM) and they all expose a folder named lm_kit_code_folder. The old
                // lookup took the FIRST match, so clicking a type-specific KIT could open the
                // shared config. Resolve it from the section that was actually clicked instead.
                //
                // A KIT config may declare MAST HEIGHT as a plain user input (no "formula" on its
                // lm_mast_height template) rather than deriving it from General Details. Only then
                // is the General-Details height NOT a prerequisite. The shared KIT keeps its
                // formula, so __kitHeightIsInput stays false for it and nothing changes.
                // ═══════════════════════════════════════════════════════════════════════
                let __kitFolderObj = null;
                const __clickedSec = this.accordionSections.find(s => String(s.id) === String(sectionId));
                if (__clickedSec && __clickedSec.fields) {
                    __kitFolderObj = __clickedSec.fields.find(f => f.apiName === 'lm_kit_code_folder');
                }
                const __kitDef = __kitFolderObj && __kitFolderObj.modalConfigsByValue
                    ? __kitFolderObj.modalConfigsByValue['default'] : null;
                const __kitMH = __kitDef && (__kitDef.lineTemplateFields || []).find(f => f.apiName === 'lm_mast_height');
                const __kitHeightIsInput = __kitMH ? !__kitMH.formula : false;

                /*
                 * MAST HEIGHT UNIT BRIDGE.
                 *
                 * Every KIT formula - the 26 in the accordion's own config and the 11 in
                 * the shared blueprint - reads lm_mast_height in DECIMETRES: it divides
                 * by 10, and its short/tall branch tests `< 250` (= 25 metres). The
                 * shared KIT feeds that by deriving lm_mast_height as
                 * `r{n}_lm_height_of_mast * 10`, so the formulas get 500 for a 50 m mast.
                 *
                 * LCLM instead exposes MAST HEIGHT as a plain user input and the client
                 * types METRES (17, not 170). Rather than fork the blueprint and rewrite
                 * 37 formulas - which would either touch the shared blueprint that
                 * Lighting Mast, Latching, Stadium and Custom Lightning all rely on, or
                 * mean maintaining two copies of the same maths forever - the typed
                 * value is scaled at the one point where it enters a formula.
                 *
                 * The field itself still stores and shows exactly what the user typed,
                 * so reopening the quote shows 17, not 170.
                 *
                 * Only runs when the KIT config declares MAST HEIGHT as an input
                 * (__kitHeightIsInput). The shared KIT keeps its formula, so this is a
                 * no-op for every other mast type. Deepanjan (10th August 2026)
                 */
                const __scaleKitHeight = (formula, prefix) => {
                    if (!__kitHeightIsInput || !formula) return formula;
                    const token = `${prefix}_lm_mast_height`;
                    // Idempotent: a formula that already carries the scaled form is left
                    // alone, so a second pass can never turn x10 into x100.
                    if (formula.indexOf(`(${token} * 10)`) !== -1) return formula;
                    // Whole-token match only, so a longer name that merely starts with
                    // this token is never touched.
                    const re = new RegExp('(?<![\\w$])' + token + '(?![\\w$])', 'g');
                    return formula.replace(re, `(${token} * 10)`);
                };

                let validLines = structuredData.lines.filter(line => {
                    return (
                        (line.lm_height_of_mast !== undefined && line.lm_height_of_mast !== null && line.lm_height_of_mast !== '')
                    );
                });

                // MAST HEIGHT is typed inside the KIT, so build one line even with no mast row.
                if (__kitHeightIsInput && validLines.length === 0) {   // Reetabrata (15th July 2026)
                    validLines = [{ _lineIndex: 1 }];
                }

                if (!validLines || validLines.length === 0) {
                    this.showToast('Action Required', 'Please enter at least one Height of Mast in General Details first.', 'warning');
                    this.Loading = false;
                    return;
                }

                if (!validLines || validLines.length === 0) {
                    this.showToast('Action Required', 'Please enter at least one Height of Mast in General Details first.', 'warning');
                    this.Loading = false;
                    return;
                }


                // 2. Find folder config
                // Use the folder from the clicked accordion when we resolved it above, so the
                // right KIT config is used when several KIT accordions exist. Falls back to the
                // original first-match scan. Reetabrata (15th July 2026)
                let folderConfigObj = __kitFolderObj;
                if (!folderConfigObj) {
                    for (let sec of this.accordionSections) {
                        if (sec.fields) {
                            folderConfigObj = sec.fields.find(f => f.apiName === 'lm_kit_code_folder');
                            if (folderConfigObj) break;
                        }
                    }
                }

                let lineTemplateFields = [];
                let modalTitle = "KIT CODE DETAILS - LIGHTING MAST";
                let baseModalFields = [];

                if (folderConfigObj && folderConfigObj.modalConfigsByValue && folderConfigObj.modalConfigsByValue['default']) {
                    const defConfig = folderConfigObj.modalConfigsByValue['default'];
                    modalTitle = defConfig.title || modalTitle;
                    lineTemplateFields = defConfig.lineTemplateFields || [];
                    if (defConfig.modalFields && Array.isArray(defConfig.modalFields)) {
                        baseModalFields = JSON.parse(JSON.stringify(defConfig.modalFields));
                    }
                }

                // 👉 CHANGE 1: Split regular fields from cloneFrom defs
                const regularFields = lineTemplateFields.filter(f => !f.cloneFrom);
                const cloneFromDefs = lineTemplateFields.filter(f => f.cloneFrom);

                // 👉 CHANGE 2: Fetch blueprint with sanitization
                let rawBlueprintJson = {};
                if (cloneFromDefs.length > 0) {
                    let kitBlueprintId = null;
                    if (this.wrapperData && this.wrapperData.logicRules) {
                        for (let rule of this.wrapperData.logicRules) {
                            if (rule.Blueprint_Library__c && rule.JSON_Payload__c &&
                                rule.JSON_Payload__c.includes('lm_kit_code_folder')) {
                                kitBlueprintId = rule.Blueprint_Library__c;
                                break;
                            }
                        }
                        if (!kitBlueprintId) {
                            for (let rule of this.wrapperData.logicRules) {
                                if (rule.Blueprint_Library__c && rule.Controlling_Value__c === 'default') {
                                    kitBlueprintId = rule.Blueprint_Library__c;
                                    break;
                                }
                            }
                        }
                    }

                    if (kitBlueprintId) {
                        try {
                            // PERF: custom-metadata blueprints are static for the life of the tab.
                            // Cache the Apex round-trip so re-opening the KIT modal is instant.
                            // - Reetabrata (9th July 2026)
                            if (!this._kitBlueprintCache) this._kitBlueprintCache = {};
                            const raw = (kitBlueprintId in this._kitBlueprintCache)
                                ? this._kitBlueprintCache[kitBlueprintId]
                                : (this._kitBlueprintCache[kitBlueprintId] = await fetchBlueprintPayload({ blueprintId: kitBlueprintId }));
                            if (raw) {
                                let cleanRaw;
                                if (typeof raw === 'string') {
                                    // 👉 Sanitize bad control characters before parsing
                                    cleanRaw = raw
                                        .replace(/\t/g, '    ')
                                        .replace(/\r\n/g, ' ')
                                        .replace(/\r/g, ' ')
                                        .replace(/\n/g, ' ')
                                        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
                                    rawBlueprintJson = JSON.parse(cleanRaw);
                                } else {
                                    rawBlueprintJson = JSON.parse(JSON.stringify(raw));
                                }
                                console.log('✅ Blueprint keys:', Object.keys(rawBlueprintJson));
                            }
                        } catch (fetchErr) {
                            console.error('Blueprint fetch error:', fetchErr.message);
                        }
                    }
                }

                const regularApiNames = regularFields.map(f => f.apiName).filter(Boolean);

                let dynamicModalConfig = {
                    title: modalTitle,
                    modalFields: baseModalFields,
                    blueprints: {}
                };

                // =========================================================
                // PERF: everything below is loop-invariant. It used to be rebuilt for every
                // field of every line: the apiName list, the descending-length sort, and a
                // fresh RegExp per apiName. Same rewrite rules, same order, computed once.
                // - Reetabrata (9th July 2026)
                // =========================================================
                const _escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (!this._kitReCache) this._kitReCache = new Map();
                const _kitRe = (apiName) => {
                    let r = this._kitReCache.get(apiName);
                    if (!r) {
                        r = new RegExp(`(?<!r\\d+_)\\b${_escapeRe(apiName)}\\b`, 'g');
                        this._kitReCache.set(apiName, r);
                    }
                    return r;
                };
                const _TOKENS = /[A-Za-z_$][A-Za-z0-9_$]*/g;
                // Only apiNames that actually occur in a formula can change it; the rest are no-op
                // replaces. Scan the formula once and rewrite just those, still longest-first.
                const _rewriteFormula = (formula, nameSet, prefix) => {
                    const toks = formula.match(_TOKENS) || [];
                    const present = [];
                    const seen = new Set();
                    for (const t of toks) {
                        if (seen.has(t) || !nameSet.has(t)) continue;
                        seen.add(t);
                        present.push(t);
                    }
                    present.sort((a, b) => b.length - a.length);
                    for (const apiName of present) {
                        formula = formula.replace(_kitRe(apiName), `${prefix}_${apiName}`);
                    }
                    return formula;
                };
                // Serialise each template once; JSON.parse of a cached string beats stringify+parse.
                const _regularTpl = regularFields.map(f => JSON.stringify(f));
                const _regularNameSet = new Set(regularApiNames);
                // Per-blueprint scratch, keyed locally so the shared accordion config is never mutated.
                // PERF: local scratch so the shared accordion config is never mutated. - Reetabrata (9th July 2026)
                const _bpCache = new Map();   // blueprintKey -> { nameSet, tpl }

                // 3. Loop over validLines
                validLines.forEach((line, index) => {
                    const lineIndex = line._lineIndex;
                    const prefix = `kit_line_${lineIndex}`;

                    // 👉 YOUR EXACT WORKING LOGIC — only on regularFields now
                    let generatedFields = regularFields.map((tmpl, ti) => {
                        // PERF: pre-serialised template, cloned from a cached string. - Reetabrata (9th July 2026)
                        let newField = JSON.parse(_regularTpl[ti]);

                        newField.apiName = `${prefix}_${tmpl.apiName}`;

                        if (tmpl.mapFrom && line[tmpl.mapFrom] !== undefined && line[tmpl.mapFrom] !== '') {
                            newField.defaultValue = line[tmpl.mapFrom];
                        }

                        if (tmpl.apiName === 'lm_mast_height') {
                            // Derive from the mast row ONLY when the metadata declares MAST HEIGHT
                            // derived. A KIT config that omits the formula wants it typed by the
                            // user, so leave it a plain input. Reetabrata (15th July 2026)
                            if (tmpl.formula) {
                                newField.formula = `r${lineIndex}_lm_height_of_mast * 10`;
                            }
                        } else if (tmpl.apiName === 'lm_qty_of_hm') {
                            newField.formula = `r${lineIndex}_lm_quantity`;
                        } else if (tmpl.apiName === 'no_of_segment_select') {
                            newField.formula = `r${lineIndex}_lm_no_of_segment`;
                        } else if (tmpl.apiName === 'lm_ring_dia') {
                            newField.formula = `(r${lineIndex}_lm_ring_diameter )`;
                        } else if (newField.formula) {
                            // PERF: single formula scan, same longest-first rewrite. - Reetabrata (9th July 2026)
                            newField.formula = _rewriteFormula(newField.formula, _regularNameSet, prefix);
                            newField.formula = __scaleKitHeight(newField.formula, prefix);
                        }

                        if (newField.controllingField) {
                            newField.controllingField = `${prefix}_${newField.controllingField}`;
                        }

                        if (newField.controllingFields) {
                            newField.controllingFields = newField.controllingFields.map(cf => `${prefix}_${cf}`);
                        }

                        return newField;
                    });

                    // Push main line section
                    dynamicModalConfig.modalFields.push({
                        id: `kit_line_${lineIndex}`,
                        name: `Line ${index + 1}`,
                        label: `Line ${index + 1}`,
                        expanded: index === 0,
                        fields: generatedFields
                    });

                    // 👉 CHANGE 3: Process blueprint cloneFrom fields
                    cloneFromDefs.forEach(cloneDef => {
                        const blueprintKey = cloneDef.cloneFrom;
                        const rawFields = rawBlueprintJson[blueprintKey];

                        if (!rawFields || rawFields.length === 0) {
                            console.warn('No blueprint fields for key:', blueprintKey);
                            return;
                        }

                        const blueprintApiNames = rawFields.map(f => f.apiName).filter(Boolean);
                        // PERF: built once per blueprint key instead of once per field. - Reetabrata (9th July 2026)
                        let bp = _bpCache.get(blueprintKey);
                        if (!bp) {
                            bp = {
                                nameSet: new Set([...blueprintApiNames, ...regularApiNames]),
                                tpl: rawFields.map(f => JSON.stringify(f))
                            };
                            _bpCache.set(blueprintKey, bp);
                        }
                        const allNameSet = bp.nameSet;
                        const rawTpl = bp.tpl;

                        const rewrittenFields = rawFields.map((tmpl, ti) => {
                            // PERF: pre-serialised template, cloned from a cached string. - Reetabrata (9th July 2026)
                            let newField = JSON.parse(rawTpl[ti]);

                            // Prefix apiName
                            newField.apiName = `${prefix}_${tmpl.apiName}`;

                            // Prefix controllingField
                            if (newField.controllingField) {
                                newField.controllingField = `${prefix}_${tmpl.controllingField}`;
                            }

                            // Rewrite formula — same pattern as regular fields
                            if (newField.formula) {
                                // PERF: single formula scan, same longest-first rewrite. - Reetabrata (9th July 2026)
                                newField.formula = _rewriteFormula(newField.formula, allNameSet, prefix);
                                newField.formula = __scaleKitHeight(newField.formula, prefix);
                            }

                            return newField;
                        });

                        dynamicModalConfig.modalFields.push({
                            id: `${prefix}_${blueprintKey}`,
                            // This blueprint section carries the KIT price for 3/4/5-segment lines
                            // (lm_3_kit_unit_price); the 1/2-segment prices sit in the `${prefix}` section
                            // above. The metadata gives this section label:'' on purpose - it is a BOM
                            // continuation, not a titled block - but the modal's line-item builder skips a
                            // section whose label is empty (it would render a nameless "{Modal} - " row),
                            // so no KIT line item was ever produced for 3/4/5-segment quotes.
                            //
                            // Joining the `${prefix}` group fixes that without giving the section a visible
                            // title: the group keeps "Line N" as its name and gains these fields, so one
                            // KIT line item is emitted whatever the segment count. A hidden section is
                            // dropped before grouping, so a 1/2-segment line is untouched.
                            // Reetabrata (16th July 2026)
                            lineItemGroup: prefix,
                            label: cloneDef.label || '',
                            expanded: cloneDef.expanded !== false,
                            // 👉 Show this section only when no_of_segment_select is 3, 4, or 5
                            controllingField: `${prefix}_no_of_segment_select`,
                            controllingValues: ['3', '4', '5'],
                            fields: rewrittenFields
                        });

                        console.log(`✅ Blueprint "${blueprintKey}" injected for line ${lineIndex} — ${rewrittenFields.length} fields`);
                    });
                });

                // 4. Open the modal
                const modal = this.template.querySelector('c-hm-estimator')   /* hmQuoteTest */;
                if (modal) {
                    if (this.isReadOnlyMode && dynamicModalConfig.modalFields) {
                        dynamicModalConfig.modalFields.forEach(sec => {
                            if (sec.fields) sec.fields.forEach(f => f.readOnly = true);
                        });
                    }
                    dynamicModalConfig.savedData = this.modalSavedData;
                    dynamicModalConfig.approvalTriggers = this._hmApprovalTriggers();   // field-level approval mark - Deepanjan (20th Sep 2026); this product's marks only [hm-cross]

                    dynamicModalConfig.department = this.selectedPicklistValue;

                    this.Loading = false;
                    modal.openModal(dynamicModalConfig).catch(e => console.error('Modal Open Failed', e));
                }

            } catch (err) {
                console.error('🚨 Error generating Kit Code Modal:', err.message);
                this.Loading = false;
            }

            return;
        }
        // 👉 END OF NEW KIT CODE INTERCEPTOR
        const section = this.accordionSections.find(sec => sec.id === sectionId);

        if (section) {
            const folderField = section.fields.find(f => f.apiName === folderApiName);

            if (folderField) {
                let userSelectedValue = 'default';

                if (folderField.controllingField) {
                    const parentField = section.fields.find(p => p.apiName === folderField.controllingField);
                    userSelectedValue = parentField && parentField.value ? parentField.value : null;
                }

                if (userSelectedValue) {
                    let configStr = null;
                    let blueprintIdToPass = null;

                    // ========================================================
                    // 👉 THE BULLETPROOF FIX: Safely parse the JSON to verify
                    // it is a true Modal Configuration and not a Folder!
                    // ========================================================
                    let directMatch = null;
                    if (this.wrapperData && this.wrapperData.logicRules) {
                        for (let rule of this.wrapperData.logicRules) {
                            if (rule.Controlling_Value__c === userSelectedValue && rule.JSON_Payload__c) {
                                try {
                                    let parsed = JSON.parse(rule.JSON_Payload__c);
                                    // A valid Modal JSON has "modalFields" at its root. 
                                    // A folder JSON has "fields" at its root.
                                    if (parsed.modalFields !== undefined) {
                                        directMatch = rule;
                                        break;
                                    }
                                } catch (e) {
                                    // Ignore parse errors from other unrelated rules
                                }
                            }
                        }
                    }

                    if (directMatch) {
                        configStr = directMatch.JSON_Payload__c;
                        if (directMatch.Blueprint_Library__c) {
                            blueprintIdToPass = directMatch.Blueprint_Library__c;
                        }
                    }
                    // ========================================================
                    // SCENARIO B: Nested JSON (Your Customized & Conventional Setup)
                    // ========================================================
                    else if (folderField.modalConfigsByValue) {
                        const inlineConfig = folderField.modalConfigsByValue[userSelectedValue] || folderField.modalConfigsByValue["default"];

                        if (inlineConfig) {
                            configStr = JSON.stringify(inlineConfig);
                        }

                        const parentRecord = this.wrapperData && this.wrapperData.logicRules
                            ? this.wrapperData.logicRules.find(rule => rule.JSON_Payload__c && rule.JSON_Payload__c.includes(folderApiName))
                            : null;

                        if (parentRecord && parentRecord.Blueprint_Library__c) {
                            blueprintIdToPass = parentRecord.Blueprint_Library__c;
                        }
                    }

                    // ========================================================
                    // 3. PROCESS ADDRESS TAGS (@@) AND OPEN MODAL
                    // ========================================================
                    if (configStr) {
                        if (configStr.includes('@@')) {
                            if (!this.accountAddress && this.recordId) {
                                this.Loading = true;
                                try {
                                    this.accountAddress = await getOpportunityAccountAddress({ opportunityId: this.recordId });
                                } catch (error) {
                                    console.error('Error fetching address on demand:', error);
                                    this.accountAddress = {};
                                } finally {
                                    this.Loading = false;
                                }
                            }

                            const contextData = this.accountAddress || {};
                            Object.keys(contextData).forEach(key => {
                                const searchTag = new RegExp(`@@${key}@@`, 'g');
                                const replacementValue = contextData[key] ? contextData[key] : 'Not Found';
                                configStr = configStr.replace(searchTag, replacementValue);
                            });
                            configStr = configStr.replace(/@@[a-zA-Z0-9_]+@@/g, 'Not Found');
                        }

                        let processedConfig = JSON.parse(configStr);

                        if (blueprintIdToPass) {
                            processedConfig.blueprintId = blueprintIdToPass;
                        }

                        let dynamicProductName = '';

                        if (userSelectedValue && userSelectedValue !== 'default') {
                            dynamicProductName = userSelectedValue;
                            // Pressure-IS 4984 / Non pressure-IS 4984 (28-Jul): both
                            // share the SINGLE 'IS 4984' rate card ... 
                            if (dynamicProductName.indexOf('IS 4984') >= 0) {
                                dynamicProductName = 'IS 4984';
                            }
                        }

                        if (this.selectedPicklistValue === 'Solar Structure - Department') {
                            // ⚠️ IMPORTANT: This must match the exact 'MasterLabel' of your metadata record!
                            dynamicProductName = 'Solar Structure - Department';
                        }
                        else if (this.selectedPicklistValue === 'Telecom Tower - Department') {
                            dynamicProductName = 'Telecom Tower - Department';
                        }

                        else if (this.selectedPicklistValue === 'Transmission Tower - Department') {
                            dynamicProductName = 'Transmission Tower - Department';
                        }

                        this.modalSavedData._Dynamic_Product_Name = dynamicProductName;

                        this.Loading = true;
                        try {
                            if (dynamicProductName) {
                                console.log(`[Pricing Engine] Fetching Metadata for Product: ${dynamicProductName}`);
                                let pricingRecord = await getPricingRates({ departmentName: dynamicProductName });

                                // logic for tranmission
                                if (dynamicProductName == 'Transmission Tower - Department') {
                                    const modalTitle = String(processedConfig.title || '').toUpperCase();
                                    let transmissionModal;
                                    if (modalTitle.includes('SUBSTATION')) {
                                        transmissionModal = 'Type of Product - Substation';
                                    }
                                    else if (modalTitle.includes('NUTS')) {
                                        transmissionModal = 'Nuts & Bolts Details';
                                    }
                                    else if (modalTitle.includes('TOWER')) {
                                        transmissionModal = 'Type of Product - Tower';
                                    }
                                    else transmissionModal = dynamicProductName;
                                    console.log('[Pricing Engine] TT modal identified:', processedConfig.title, '->', transmissionModal);
                                    pricingRecord = await getPricingRates({ departmentName: transmissionModal });
                                }

                                // logic for telecom tower - based on modal choice
                                if (dynamicProductName == 'Telecom Tower - Department') {
                                    const modalTitle = String(processedConfig.title || '').toUpperCase();
                                    let telecomModal;
                                    if (modalTitle.includes('SIGNALLING')) {
                                        telecomModal = 'Tubular Signalling Tower';
                                    }
                                    else if (modalTitle.includes('TUBULAR')) {
                                        telecomModal = 'Tubular Tower';
                                    }
                                    else if (modalTitle.includes('ANGULAR')) {
                                        telecomModal = 'Angular Tower';
                                    }
                                    else telecomModal = dynamicProductName;
                                    console.log('[Pricing Engine] Telecom modal identified:', processedConfig.title, '->', telecomModal);
                                    pricingRecord = await getPricingRates({ departmentName: telecomModal });
                                }

                                console.log(`[Pricing Engine] pricing record stringify`, JSON.stringify(pricingRecord));
                                this.currentPricingRates = pricingRecord;
                                processedConfig.baseRates = pricingRecord || {};

                                // =====================================================================
                                // 🌍 UNIVERSAL DYNAMIC RATES INTEGRATION (Solar, Poles, Telecom, etc.)
                                // =====================================================================
                                if (pricingRecord && pricingRecord.JSON_Payload__c) {
                                    try {
                                        let dynamicFields = JSON.parse(pricingRecord.JSON_Payload__c);
                                        if (!Array.isArray(dynamicFields)) {
                                            dynamicFields = [dynamicFields];
                                        }

                                        // 🛑 THE SILVER BULLET: Inject rates directly into global math memory BEFORE modal opens!
                                        dynamicFields.forEach(df => {
                                            if (df.apiName && df.defaultValue !== undefined) {
                                                this.modalSavedData[df.apiName] = Number(df.defaultValue);
                                            }
                                        });

                                        processedConfig.modalFields.forEach(section => {
                                            if (section.fields) {
                                                section.fields.forEach((field, fIndex) => {
                                                    // A. Check Regular Fields
                                                    const dynamicMatch = dynamicFields.find(df => df.apiName === field.apiName);
                                                    if (dynamicMatch) {
                                                        let mergedField = { ...field, ...dynamicMatch };
                                                        if (dynamicMatch.defaultValue !== undefined) {
                                                            mergedField.value = dynamicMatch.defaultValue;
                                                            if (mergedField.formula === '0' || mergedField.formula === 0) {
                                                                mergedField.formula = String(dynamicMatch.defaultValue);
                                                            }
                                                        }
                                                        section.fields[fIndex] = mergedField;
                                                    }

                                                    // B. Check inside Column-Repeaters (Solar Grids)
                                                    if ((field.type === 'column-repeater' || field.type === 'sub-section' || field.type === 'grid-repeater') && field.fields) {
                                                        field.fields.forEach((nestedField, nestedIndex) => {
                                                            const nestedDynMatch = dynamicFields.find(df => df.apiName === nestedField.apiName);
                                                            if (nestedDynMatch) {
                                                                let mergedNestedField = { ...nestedField, ...nestedDynMatch };

                                                                // Apply the same value/formula override logic to nested fields
                                                                if (nestedDynMatch.defaultValue !== undefined) {
                                                                    mergedNestedField.value = nestedDynMatch.defaultValue;
                                                                    if (mergedNestedField.formula === '0' || mergedNestedField.formula === 0) {
                                                                        mergedNestedField.formula = String(nestedDynMatch.defaultValue);
                                                                    }
                                                                }
                                                                field.fields[nestedIndex] = mergedNestedField;
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    } catch (parseErr) {
                                        console.error('🚨 Failed to parse Dynamic Rates from Metadata:', parseErr);
                                    }
                                }
                            } else {
                                console.log(`[Pricing Engine] No specific sub-product selected. Skipping pricing fetch.`);
                                processedConfig.baseRates = {};
                            }
                        } catch (err) {
                            console.error(`[Pricing Engine] Error fetching rates`, err);
                            processedConfig.baseRates = {};
                        } finally {
                            this.Loading = false;
                        }

                        console.log('Fetched Pricing Rates:', JSON.stringify(this.currentPricingRates));
                        console.log('Opening Modal with Config:', processedConfig);

                        const modal = this.template.querySelector('c-hm-estimator')   /* hmQuoteTest */;
                        if (modal) {
                            // 👉 INJECT READ-ONLY STATE FOR STANDARD FOLDERS
                            if (this.isReadOnlyMode && processedConfig.modalFields) {
                                processedConfig.modalFields.forEach(sec => {
                                    if (sec.fields) {
                                        sec.fields.forEach(f => f.readOnly = true);
                                    }
                                });
                            }

                            // 👉 ADD THIS LINE: Hand the massive saved JSON to the child modal!
                            processedConfig.savedData = this.modalSavedData;
                            processedConfig.approvalTriggers = this._hmApprovalTriggers();   // field-level approval mark - Deepanjan (20th Sep 2026); this product's marks only [hm-cross]

                            // 👉 Give opted-in modals access to all Tower/Substation api values.
                            // For every other modal this returns processedConfig unchanged instantly.
                            processedConfig = this.crossPriceVariationContext(processedConfig);

                            // collect all api for all modals whether opned or not to avoid undefined error
                            processedConfig.preRegisterApis = this.collectAllAPIs();

                            processedConfig.department = this.selectedPicklistValue;

                            modal.openModal(processedConfig);
                        }
                    }
                }
            }
        }
    }


    // ── HDPE INSPECTION FLAG helpers — Deepanjan (28th July 2026) ────────────
    // Department check: the chosen template for HDPE quotes carries 'HDPE'
    // ('HDPE_Pipe_Department'); the saved Standard value is the belt-and-braces
    // fallback when this save runs on a reopened quote.
    _isHdpeDepartment() {
        const tpl = (this.selectedPicklistValue || '').toUpperCase();
        if (tpl.indexOf('HDPE') >= 0) return true;
        const std = this.modalSavedData ? this.modalSavedData.Standard : null;
        return typeof std === 'string' &&
            ['IS 4984', 'Pressure-IS 4984', 'Non pressure-IS 4984', 'PLB Duct', 'Pipe & Duct']
                .indexOf(std) >= 0;
    }

    // TRUE when any standard's Inspection & Commission value is > 0:
    //   IS 4984 (incl. Pressure / Non pressure): is_Inspection_Commission
    //   PLB Duct:                                Inspection_Commission
    //   Pipe & Duct:                             p_ / d_Inspection_Commission
    _hdpeHasInspection() {
        const keys = ['is_Inspection_Commission', 'Inspection_Commission',
            'p_Inspection_Commission', 'd_Inspection_Commission'];
        const d = this.modalSavedData || {};
        for (const k of keys) {
            const v = parseFloat(d[k]);
            if (!isNaN(v) && v > 0) return true;
        }
        return false;
    }

    // Child mode saves into the quote JSON, not the Opportunity, so the
    // calculator has to be handed its own last payload back on reopen.
    // Deepanjan (5th August 2026)
    get pebSavedPayload() {
        return (this.modalSavedData && this.modalSavedData._pebPayload) || null;
    }


    handlePebSave(event) {
        const payload = event.detail.payload;
        if (!payload) {
            this.showToast('Error', 'No PEB data received.', 'error');
            return;
        }

        const t = payload.totals || {};
        const specialItems = payload.specialItems || [];

        this.modalSavedData = {
            ...this.modalSavedData,
            _pebPayload: payload,
            _buildingDescription: payload._buildingDescription || this.modalSavedData._buildingDescription,
            _Dynamic_Product_Name: 'PEB',
            // Numeric values so Quote_Approval_Matrix__mdt can evaluate Min/Max
            peb_marginPercent: t.marginPercent || 0,
            peb_hasSpecialItems: specialItems.length > 0 ? 1 : 0,
            peb_benchmarkFailed: t.needsUtkarshApproval ? 1 : 0,
            peb_hasErectionOrSheeting: t.peb_hasErectionOrSheeting || 0
        };

        this.isQuoteSaved = false;
        this.isPebModalOpen = false;
        this.showToast('Success', 'PEB configuration saved.', 'success');
    }


    // =========================================================
    // 👉 PEB MODULE DATA EXTRACTOR & SAVER
    // =========================================================
    async handlePebApply() {
        this.modalSavedData = this.modalSavedData || {};
        let newLines = [];

        // 1. EXTRACT ACCESSORIES FROM JSON KEYS (Rows 1 to 10)
        for (let i = 1; i <= 10; i++) {
            let accessory = this.modalSavedData[`acc_section_accessories_input_${i}`];

            if (accessory) { // If the user selected an accessory in this row
                let remark = this.modalSavedData[`acc_section_remark_input_${i}`] || '';
                let length = this.modalSavedData[`acc_section_length_input_${i}`] || '';

                // Build the item name for the table
                let itemName = `PEB Acc: ${accessory}`;
                if (length) itemName += ` (Size: ${length})`;
                if (remark) itemName += ` - ${remark}`;

                newLines.push({
                    id: `peb_acc_${i}_${Date.now()}`,
                    name: itemName,
                    itemName: itemName,
                    quantity: 1, // Defaulting to 1, update if you added a quantity key
                    unitPrice: 0,
                    unitCost: 0,
                    uom: 'EA',
                    _modalSource: 'PEB_MODULE'
                });
            }
        }

        // 2. EXTRACT BUYOUT ITEMS FROM JSON KEYS (Rows 1 to 10)
        for (let i = 1; i <= 10; i++) {
            let buyoutDesc = this.modalSavedData[`buyout_desc_input_${i}`];

            if (buyoutDesc) { // If the user typed a Buyout item in this row
                let qty = this.modalSavedData[`buyout_qty_input_${i}`] || 1;
                let rate = this.modalSavedData[`buyout_rate_input_${i}`] || 0;

                newLines.push({
                    id: `peb_buyout_${i}_${Date.now()}`,
                    name: `PEB Buyout: ${buyoutDesc}`,
                    itemName: `PEB Buyout: ${buyoutDesc}`,
                    quantity: parseInt(qty) || 1,
                    unitPrice: parseFloat(rate) || 0,
                    unitCost: parseFloat(rate) || 0,
                    uom: 'EA',
                    _modalSource: 'PEB_MODULE'
                });
            }
        }

        // If nothing was found, alert the user and stop
        if (newLines.length === 0) {
            this.showToast('Warning', 'No accessories or buyout items were found in the form!', 'warning');
            return;
        }

        // 3. 👉 UPDATE THE LWC UI GRID INSTANTLY
        // Remove old PEB lines to prevent duplicates, then add the new ones
        const existingUiRows = (this.rows || []).filter(r => r._modalSource !== 'PEB_MODULE');
        this.rows = [...existingUiRows, ...newLines];
        this.modalSavedData._Saved_Table_Rows = this.rows;

        // 4. 👉 UPDATE THE APEX QUEUE
        const existingApexLines = (this.modalSavedData._Final_Apex_Lines || []).filter(r => r._modalSource !== 'PEB_MODULE');
        this.modalSavedData._Final_Apex_Lines = [...existingApexLines, ...newLines];

        // 5. 👉 INSTANTLY SAVE TO SALESFORCE DATABASE
        if (this.quoteId) {
            this.Loading = true;
            try {
                let savePromises = [
                    updateRecord({ fields: { Id: this.quoteId, Quote_Value__c: JSON.stringify(this.modalSavedData), Has_Quote_Value__c: true } }),
                    generateQuoteLines({ quoteId: this.quoteId, parsedLineItems: this.modalSavedData._Final_Apex_Lines })
                ];

                await Promise.all(savePromises);

                this.showToast('Success', `Successfully generated ${newLines.length} PEB items!`, 'success');
                this.isQuoteSaved = true;

            } catch (error) {
                console.error('Error saving PEB data:', error);
                this.showToast('Error', 'Failed to generate Salesforce Line Items.', 'error');
            } finally {
                this.Loading = false;
            }
        }
    }

    // handler to calculate number of times nuts & bolts should render 
    _resolveLineItemMultiplier(modalConfig) {
        console.log('inside _resolveLineItemMultiplier method');
        const cfg = modalConfig?.lineItemMultiplierConfig;
        if (!cfg) return [];

        const mode = cfg.mode || 'flat';

        console.log('modalSavedData has data:', JSON.stringify(this.modalSavedData, null, 2));

        const _resolveFlat = (flatCfg) => {
            if (!flatCfg?.sources?.length) return [];

            return flatCfg.sources
                .filter(src => {
                    // ✅ FIX: Check BOTH Tower modal AND Nuts & Bolts modal fields
                    const value = this.modalSavedData[src.apiName];
                    console.log(`Checking flat source "${src.apiName}": ${value}`);
                    return value == true;
                })
                .map(src => src.label);
        };

        const cartesianProduct = (arrays) => {
            return arrays.reduce((acc, group) => {
                if (!acc.length) return group;
                const res = [];
                acc.forEach(a => {
                    group.forEach(b => {
                        res.push(`${a} | ${b}`);
                    });
                });
                return res;
            }, []);
        };

        const _resolveCartesian = (cartesianCfg) => {
            const groups = cartesianCfg?.groups || [];
            if (!groups.length) return [];

            const activesPerGroup = groups.map(group => {
                const activeLabels = (group.sources || [])
                    .filter(src => Boolean(this.modalSavedData[src.apiName]))
                    .map(src => src.label);

                return activeLabels;
            });

            console.log('****line 1286 ', activesPerGroup);

            // Any empty group = no valid combination
            if (activesPerGroup.some(g => g.length === 0)) {
                console.log('❌ Cartesian: At least one group has NO active sources');
                return [];
            }

            // N-way cartesian product
            return cartesianProduct(activesPerGroup);
        };

        if (mode === 'flat') {
            const result = _resolveFlat(cfg);
            console.log('Flat mode result:', result);
            return result;
        }

        if (mode === 'cartesian') {
            const result = _resolveCartesian(cfg);
            console.log('Cartesian mode result:', result);
            return result;
        }

        if (mode === 'combined') {
            const flatLabels = _resolveFlat(cfg.flat);
            const cartesianLabels = _resolveCartesian(cfg.cartesian);
            const merged = [...flatLabels, ...cartesianLabels];
            console.log('Combined mode result:', merged);
            return merged;
        }

        console.warn(`[lineItemMultiplier] Unknown mode: "${mode}"`);
        return [];
    }

    handleModalApply(event) {
        const { values, lineItems, modalConfig, isComplete, parentPushes } = event.detail;

        // 👉 1. SAVE MODAL DATA TO MEMORY FIRST (So the engine can read it!)
        this.modalSavedData = { ...this.modalSavedData, ...values };
        // [hm-kit] Stadium, once the KIT has been opened: a lift's height / segments /
        // quantity changed, or a lift added / removed in the estimator -> the KIT rows
        // follow now, so the KIT recompute below prices each lift with its new figures
        // and a removed lift's KIT line drops off, as a removed Lighting Mast row does.
        {
            const __hmLifts = this._hmStadiumLifts(this.modalSavedData);
            if (__hmLifts && this._hmStadiumBridged()) this._hmBridgeStadiumLifts(__hmLifts);
        }

        // Remember every applied modal's config so we can recompute it later when a
        // value it depends on is filled in a DIFFERENT modal.
        if (modalConfig && modalConfig.title) {
            // 👉 THE FIX: Only cache standard JSON modals for recalculation. 
            // This prevents custom LWC data from being wiped out!
            if (modalConfig.modalFields || modalConfig.blueprints) {
                if (!this._appliedModalConfigs) this._appliedModalConfigs = {};
                let cfgClone;
                try { cfgClone = JSON.parse(JSON.stringify(modalConfig)); }
                catch (e) { cfgClone = null; }
                if (cfgClone) {
                    delete cfgClone.savedData;   // savedData is passed fresh at recompute time
                    this._appliedModalConfigs[modalConfig.title] = cfgClone;
                }
            }
        }

        this.isQuoteSaved = false;


        // =========================================================
        // 👉 NEW: AUTO-POPULATE PARENT SCREEN FIELDS & TRIGGER FIELD VISIBILITY
        // (100% Isolated: Does not interfere with any existing logic below)
        // =========================================================
        if (modalConfig && modalConfig.modalFields) {
            let screenUpdated = false;

            // 1. Deep clone the array so LWC is forced to detect the change!
            let newAccordionSections = JSON.parse(JSON.stringify(this.accordionSections));

            // 👉 STEP A: Scan modalFields for pushToParentApiName (existing logic)
            modalConfig.modalFields.forEach(modalSec => {
                if (modalSec.fields) {
                    modalSec.fields.forEach(modalField => {
                        if (modalField.pushToParentApiName && values[modalField.apiName] !== undefined) {
                            const targetParentApiName = modalField.pushToParentApiName;
                            const pushedValue = values[modalField.apiName];
                            newAccordionSections.forEach(parentSec => {
                                if (parentSec.fields) {
                                    parentSec.fields.forEach(parentField => {
                                        if (parentField.apiName === targetParentApiName) {
                                            parentField.value = pushedValue;
                                            this.modalSavedData[targetParentApiName] = pushedValue;
                                            screenUpdated = true;
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });

            // 👉 STEP B (NEW): Also scan Blueprint sections for pushToParentApiName
            // Blueprint fields are not in modalFields but ARE in modalConfig.blueprints
            if (modalConfig.blueprints) {
                Object.values(modalConfig.blueprints).forEach(blueprintSectionFields => {
                    if (!Array.isArray(blueprintSectionFields)) return;
                    blueprintSectionFields.forEach(bpField => {
                        // Blueprint fields may be column-repeater containers
                        const subFields = bpField.fields ? bpField.fields : [bpField];
                        subFields.forEach(subField => {
                            if (subField.pushToParentApiName && values[subField.apiName] !== undefined) {
                                const targetParentApiName = subField.pushToParentApiName;
                                const pushedValue = values[subField.apiName];
                                newAccordionSections.forEach(parentSec => {
                                    if (parentSec.fields) {
                                        parentSec.fields.forEach(parentField => {
                                            if (parentField.apiName === targetParentApiName) {
                                                parentField.value = pushedValue;
                                                this.modalSavedData[targetParentApiName] = pushedValue;
                                                screenUpdated = true;
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    });
                });
            }
            // Step C: Safely re-evaluate field visibility within sections if we changed something

            if (screenUpdated) {
                newAccordionSections.forEach(sec => {
                    let visibleCount = 1;
                    if (sec.fields) {
                        sec.fields.forEach(f => {
                            if (f.isFirstField) {
                                f.isVisible = true;
                            } else if (f.controllingField) {
                                // Find parent field in the same section
                                const parent = sec.fields.find(p => p.apiName === f.controllingField);

                                // Or find in modalSavedData if it's cross-section
                                let parentValue = parent && parent.isVisible ? parent.value : this.modalSavedData[f.controllingField];

                                if (parentValue) {
                                    if (f.controllingValues.includes('*') || f.controllingValues.includes(parentValue)) {
                                        f.isVisible = true;
                                        if (f.hasFolderIcon && f.labelFormat) {
                                            f.label = f.labelFormat.replace('{value}', parentValue);
                                        }
                                    } else {
                                        f.isVisible = false;
                                    }
                                } else {
                                    f.isVisible = false;
                                }
                            } else {
                                f.isVisible = true; // No controlling field = always visible
                            }

                            // Re-apply Red Line logic & sequence numbers
                            if (f.isRequired && !f.value && !f.hasFolderIcon) {
                                f.rowClass = 'config-row required-row';
                            } else {
                                f.rowClass = 'config-row';
                            }

                            if (f.isVisible) {
                                f.sequence = `${sec.sequenceNo}.${visibleCount++}`;
                            }
                        });
                    }
                });

                // 2. Assign the deep clone back to force UI Render
                this.accordionSections = newAccordionSections;
            }
        }


        // 👉 2. HANDLE LINE ITEMS (Pass to Generic Engine)
        if (lineItems && lineItems.length > 0) {

            // ✅ Tag each line with its source modal so we can replace only that source
            const modalSource = modalConfig?.title || 'unknown';

            const existingItems = this.modalSavedData._pendingLineItems || [];

            // Keep lines from OTHER modals, replace lines from THIS modal
            const keptItems = existingItems.filter(li => li._modalSource !== modalSource || this._hmOtherProduct(li));   // [hm-cross] another product's lines are never replaced

            // handling Transmission Tower Nuts & Bots Multiple rendering - rajeev 20-05-26
            const activeLabels = this._resolveLineItemMultiplier(modalConfig);

            if (modalConfig?.lineItemMultiplierConfig && activeLabels.length === 0) {
                const modalSource = modalConfig?.title || 'unknown';
                const existingItems = this.modalSavedData._pendingLineItems || [];
                this.modalSavedData._pendingLineItems = existingItems.filter(
                    li => li._modalSource !== modalSource || this._hmOtherProduct(li)   // [hm-cross]
                );
                this._applyDynamicLineItemAdjustments();
                return;
            }

            const finalLineItems = activeLabels.length > 0
                ? activeLabels.flatMap(suffix =>
                    lineItems.map(line => ({ ...line, itemName: `${line.itemName} [${suffix}]` }))
                )
                : lineItems;

            this.modalSavedData._pendingLineItems = [
                ...keptItems,
                ...finalLineItems.map(line => ({
                    ...line,
                    _modalSource: modalSource,  // ✅ tag for future replace
                    _baseUnitPrice: line.unitPrice || 0,
                    _baseUnitCost: line.unitCost || 0
                }))
            ];

            this._hmTagPending();   // [hm-cross] the new lines belong to the product on screen

        }

        this._applyDynamicLineItemAdjustments();

        // ═════════════════════════════════════════════════════════════════════════
        // ADDRESS BOOK WRITE-BACK - SWITCHED OFF. Deepanjan (12th August 2026)
        //
        // The Account write-back that used to sit here is gone: the address now lives on
        // Address_Book__c, and the ovr_* values already ride into the saved quote JSON
        // with the normal modal save just above, which is what the offer document reads.
        //
        // TO SWITCH ON, uncomment this block. That is all - there is no Apex side and no
        // new import, because updateRecord is already imported at the top of this file
        // and getOpportunityAccountAddress already returns the Id of the address book
        // record it used.
        //
        // updateRecord goes through the UI API, so field level security and any
        // validation rule on Address_Book__c are enforced for the running user and come
        // back as a real error message instead of being silently ignored. State__c and
        // Country__c are restricted picklists and the modal fields are free text, so a
        // value that is not on the picklist surfaces in the catch below.
        //
        // PHONE IS NOT SAVED - Address_Book__c has no phone field.
        // ═════════════════════════════════════════════════════════════════════════
        //
        /*if (modalConfig && modalConfig.title === 'CUSTOMER ADDRESS DETAILS'
            && values['override_existing_address'] === true
            && this.accountAddress && this.accountAddress.AddressBookId) {

            const fields = { Id: this.accountAddress.AddressBookId };
            if (values['ovr_street']) fields.Street__c = String(values['ovr_street']);
            if (values['ovr_city']) fields.City__c = String(values['ovr_city']);
            if (values['ovr_zip']) fields.PIN__c = String(values['ovr_zip']);
            if (values['ovr_state']) fields.State__c = String(values['ovr_state']);
            if (values['ovr_country']) fields.Country__c = String(values['ovr_country']);

            if (Object.keys(fields).length > 1) {
                updateRecord({ fields })
                    .then(() => {
                        this.showToast('Address Book', 'Address book updated.', 'success');
                        this.accountAddress = null;   // drop the cache so the next open re-reads it
                    })
                    .catch(error => {
                        // The UI API puts the real reason in output.errors (validation
                        // rules) and output.fieldErrors (required, FLS, restricted
                        // picklist), keyed by field. error.body.message on its own is
                        // the generic "An error occurred while trying to update the
                        // record" line, which tells the user nothing.
                        // Deepanjan (12th August 2026)
                        const body = (error && error.body) || {};
                        const output = body.output || {};
                        const msgs = [];

                        (output.errors || []).forEach(e => {
                            if (e && e.message) msgs.push(e.message);
                        });
                        Object.keys(output.fieldErrors || {}).forEach(field => {
                            (output.fieldErrors[field] || []).forEach(e => {
                                if (e && e.message) {
                                    msgs.push((e.fieldLabel || field) + ': ' + e.message);
                                }
                            });
                        });

                        const msg = msgs.length ? msgs.join(' | ')
                            : (body.message || 'Could not update the address book record.');
                        this.showToast('Address Book', msg, 'error');
                    });
            }
        }*/

        // =========================================================
        // RUN VISIBILITY ENGINE
        // =========================================================
        let newlyRevealedSections = [];
        let structureChanged = false;

        this.accordionSections.forEach(globalSec => {
            if (globalSec.controllingField) {
                let isConditionMet = false;
                const controllingFieldsArray = globalSec.controllingField.split(',').map(s => s.trim());

                // Adding context to handle evaluation based on controlling operator - rajeev 17-05-2026
                const operator = globalSec.controllingOperator || 'OR';
                let matchCount = 0; //  track match for and operator

                for (let targetApiName of controllingFieldsArray) {
                    let targetFieldObj = null;
                    for (let s of this.accordionSections) {
                        targetFieldObj = s.fields.find(f => f.apiName === targetApiName);
                        if (targetFieldObj) break;
                    }

                    let fieldMatched = false;

                    if (targetFieldObj && targetFieldObj.isVisible && targetFieldObj.value) {
                        const isMatch = !globalSec.controllingValue || globalSec.controllingValue === '*' || globalSec.controllingValue.split(',').map(v => v.trim()).includes(String(targetFieldObj.value));
                        if (isMatch) {
                            //isConditionMet = true; break; 
                            fieldMatched = true;
                        }
                    }
                    else if (this.modalSavedData && this.modalSavedData[targetApiName] !== undefined && this.modalSavedData[targetApiName] !== '') {
                        const modalVal = String(this.modalSavedData[targetApiName]);
                        const isMatch = !globalSec.controllingValue || globalSec.controllingValue === '*' || globalSec.controllingValue.split(',').map(v => v.trim()).includes(modalVal);
                        if (isMatch) {
                            //isConditionMet = true; break; 
                            fieldMatched = true;
                        }
                    }

                    if (fieldMatched) {
                        matchCount++;
                        if (operator === 'OR') {
                            isConditionMet = true;
                            break;
                        }
                    }
                }

                // AND: every field must match
                if (operator === 'AND') {
                    isConditionMet = matchCount === controllingFieldsArray.length;
                }

                if (isConditionMet) {
                    if (!globalSec.isVisible) {
                        globalSec.isVisible = true;
                        newlyRevealedSections.push(globalSec.name);
                        structureChanged = true;
                    }
                } else {
                    if (globalSec.isVisible) {
                        globalSec.isVisible = false;
                        structureChanged = true;
                    }
                }
            }
        });

        if (structureChanged) {
            this.accordionSections = [...this.accordionSections];
        }
        if (newlyRevealedSections.length > 0) {
            this.activeSections = [...this.activeSections, ...newlyRevealedSections];
        }

        // 👉 RUN THE ACCESSORY EXTRACTOR
        // Extract all the accessories/buyouts from the flat JSON keys
        let flatAccessories = this.extractAccessoriesAsLineItems(this.modalSavedData);

        // 👉 INJECT THEM INTO THE APEX QUEUE (Filtering out old ones to prevent duplicates)
        const existingApexLines = (this.modalSavedData._Final_Apex_Lines || []).filter(r => r._modalSource !== 'ACCESSORY_EXTRACTOR');
        this.modalSavedData._Final_Apex_Lines = [...existingApexLines, ...flatAccessories];

        // 👉 INJECT THEM INTO THE SCREEN GRID
        const existingUiRows = (this.rows || []).filter(r => r._modalSource !== 'ACCESSORY_EXTRACTOR');
        this.rows = [...existingUiRows, ...flatAccessories];
        this.modalSavedData._Saved_Table_Rows = this.rows;


        // Live cross-modal refresh: recompute every applied modal against the freshly
        // merged data so the table reflects cross-modal dependencies immediately.
        // Deferred so the just-applied child modal finishes _resetModal() first, and
        // only when 2+ modals exist (nothing to cross-recompute with a single one).
        // TRANSMISSION TOWER ONLY: this key can also be entered inside a modal.
        // When it is, force the cascade even if only ONE modal has been applied
        // so far (the normal gate needs 2+). False for every other department.
        const __ttForced =
            this.selectedPicklistValue === this._TT_DEPARTMENT &&
            values &&
            this._TT_CASCADE_TRIGGER_APIS.some(a => a in values);

        if (this._appliedModalConfigs &&
            (Object.keys(this._appliedModalConfigs).length >= 2 || __ttForced)) {
            Promise.resolve().then(() => this._recomputeAllAppliedModals());
        }
    }

    // =========================================================
    // 👉 MASTER EXTRACTOR FOR FLAT JSON ACCESSORIES
    // =========================================================
    extractAccessoriesAsLineItems(data) {
        if (!data) return [];
        if (this.selectedPicklistValue === 'Crash Barrier - Department') {
            return [];
        }
        let extractedLines = [];

        // Helper to format the line item exactly as Apex needs it
        const createLine = (name, qty, rate, uom) => {
            let numericQty = parseInt(qty) || 1;
            let numericRate = parseFloat(rate) || 0;
            return {
                id: `ext_acc_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                name: name,
                itemName: name,
                weight: 0,
                quantity: numericQty,
                unitPrice: numericRate,
                unitCost: numericRate,
                netPrice: numericRate,
                listPrice: numericRate,
                cost: numericRate,
                margin: 0,
                unitListPrice: numericRate,
                discount: 0,
                expenses: 0,
                uom: uom || 'EA',
                billable: false,
                _modalSource: 'ACCESSORY_EXTRACTOR' // Tag to prevent duplicates
            };
        };

        // 1. Extract PEB & Crash Barrier "Accessories Details"
        for (let i = 1; i <= 10; i++) {
            let cbSuffix = i === 1 ? '' : i; // Crash barrier uses _input, _input2, _input3...
            let pebSuffix = `_${i}`;         // PEB uses _input_1, _input_2...

            let accName = data[`acc_section_accessories_input${cbSuffix}`] || data[`acc_section_accessories_input${pebSuffix}`];
            if (accName) {
                let qty = data[`acc_section_quantity_no_input${cbSuffix}`] || data[`acc_section_width_input${pebSuffix}`] || 1;
                let rate = data[`acc_section_rate_input${cbSuffix}`] || data[`acc_section_rate_input${pebSuffix}`] || 0;
                let remark = data[`acc_section_remark_input${cbSuffix}`] || data[`acc_section_remark_input${pebSuffix}`] || '';
                let uom = data[`acc_section_uom_input${cbSuffix}`] || data[`acc_section_uom_input${pebSuffix}`] || 'EA';

                let fullName = remark ? `Accessory: ${accName} - ${remark}` : `Accessory: ${accName}`;
                extractedLines.push(createLine(fullName, qty, rate, uom));
            }
        }

        // 2. 👉 FIX: Extract PEB "Buyout Items" using the NEW JSON keys
        for (let i = 1; i <= 10; i++) {
            let buyoutName = data[`buyout_section_accessories_input_${i}`];

            if (buyoutName) {
                let size = data[`buyout_section_length_input_${i}`] || '';
                // In your JSON, "Quantity (Nos)" aligns with "width_input"
                let qty = data[`buyout_section_width_input_${i}`] || 1;
                let remark = data[`buyout_section_remark_input_${i}`] || '';
                let rate = 0; // Add rate here if you put it back in the JSON later

                let fullName = `Buyout: ${buyoutName}`;
                if (size) fullName += ` (Size: ${size})`;
                if (remark) fullName += ` - ${remark}`;

                extractedLines.push(createLine(fullName, qty, rate, 'EA'));
            }
        }

        // 3. Extract Crash Barrier "Miscellaneous Details"
        for (let i = 1; i <= 10; i++) {
            let name = data[`misc_section_desc_input${i}`];
            if (name) {
                let qty = data[`misc_section_quantityNo_input${i}`] || 1;
                let rate = data[`misc_section_rate_input${i}`] || 0;
                let remark = data[`misc_section_remark_input${i}`] || '';
                let uom = data[`misc_section_uom_input${i}`] || 'EA';

                let fullName = remark ? `Misc: ${name} - ${remark}` : `Misc: ${name}`;
                extractedLines.push(createLine(fullName, qty, rate, uom));
            }
        }

        // 4. Extract Crash Barrier "Additional Miscellaneous"
        for (let i = 1; i <= 10; i++) {
            let name = data[`add_misc_desc_${i}`];
            if (name) {
                let qty = data[`add_misc_qty_${i}`] || 1;
                let rate = data[`add_misc_rate_${i}`] || 0;
                let uom = data[`add_misc_unit_${i}`] || 'EA';
                extractedLines.push(createLine(`Addl Misc: ${name}`, qty, rate, uom));
            }
        }

        return extractedLines;
    }



    handleCancel() {
        console.log('Modal closed');
    }

        // Today as yyyy-mm-dd in the USER'S local time — feeds the date input's min and the
    // APPLY check. Local getters on purpose: toISOString() is UTC, so between 00:00 and
    // 05:30 IST it would still say "yesterday". Deepanjan (16th September 2026)
    get expirationMinDate() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    handleExpirationDateChange(event) {
        this.expirationDate = event.target.value;
    }

    async handleApplyParent() {

        // Expiration Date is mandatory for every department.
        if (!this.expirationDate) {
            this.showToast('Required', 'Please enter the Expiration Date.', 'error');
            return;
        }

                // ...and can never be in the past. Both sides are yyyy-mm-dd strings, so a plain
        // string compare is a correct date compare. Deepanjan (16th September 2026)
        if (this.expirationDate < this.expirationMinDate) {
            this.showToast('Invalid Date', 'Expiration Date cannot be earlier than today.', 'error');
            return;
        }

                // STEEL PIPE ACCESS - Deepanjan (22nd September 2026): a quote whose Market type
        // this user may not use (e.g. someone else's quote reopened) cannot be APPLIED.
        if (this.selectedPicklistValue === 'Steel Pipes - Department') {
            const spBlock = this._steelPipeBlockMsg(this.modalSavedData && this.modalSavedData.market_type);
            if (spBlock) {
                this.showToast('Access Denied', spBlock, 'error');
                return;
            }
        }

        // [hm-cross] 2+ High Mast products: the cross-product rules first (a type on every
        // product, no duplicate type, a line item on every product), then every product in
        // turn gets the same checks the product on screen gets below. The failing product is
        // left on screen. One product: nothing runs here.
        if (this._hmMulti() && !this._hmValidateAllProducts()) {
            return;
        }

        // 👉 1. RUN THE VALIDATION ENGINE FIRST!
        if (!this.validateRequiredFields()) {
            return; // 🛑 STOPS THE SAVE IF VALIDATION FAILS
        }

        // KIT CODE DETAILS IS MANDATORY - Deepanjan (5th September 2026). validateRequiredFields
        // deliberately skips folder buttons, so a mast type whose KIT accordion is on screen
        // could be applied without the KIT ever being opened. High Mast only; see the note
        // on _validateKitRequiredFinal.
        if (!this._validateKitRequiredFinal()) {
            return;
        }

        // 👉 Cross-modal refresh: recompute every applied modal against the latest
        // combined data BEFORE we scrape/serialize, so cross-modal fields (e.g. pole
        // payment term depending on Terms & Conditions) are correct in the saved JSON
        // and in the generated line items.
        this._recomputeAllAppliedModals();

        if (!this._validateTowerSubstationInterestFinal()) {
            return;
        }

        if (!this._validateTelecomInterestFinal()) {
            return;
        }

        this.isQuoteCreated = true;
        console.log('Back button clicked');

        // 1. Save the Template Name
        this.modalSavedData._Saved_Template_Name = this.selectedPicklistValue;
        this.modalSavedData._Expiration_Date = this.expirationDate;

        // 2. Scrape the Parent Screen Fields (Type of Mast, etc.)
        this.accordionSections.forEach(sec => {
            if (sec.fields) {
                sec.fields.forEach(f => {
                    if (f.type !== 'header' && f.value !== undefined && f.value !== null && f.value !== '') {
                        this.modalSavedData[f.apiName] = f.value;
                    }
                });
            }
        });

        // =========================================================
        // 👉 THE FIX: SMART DYNAMIC NAME LOGIC
        // Extracts the actual mast type, ignoring things like "Ex-works"
        // =========================================================
        let finalQuoteName = this.selectedPicklistValue;
        let actualProductType = '';



        // Check the JSON for the standard or customized mast name
        if (this.modalSavedData.mast_standard) {
            actualProductType = this.modalSavedData.mast_standard;
        } else if (this.modalSavedData.mast_customized) {
            actualProductType = this.modalSavedData.mast_customized;
        }

        if (actualProductType) {
            finalQuoteName = `${this.selectedPicklistValue} / ${actualProductType}`;
        }

        // Save it so it loads correctly on refresh
        this.modalSavedData._Saved_Product_Name = finalQuoteName;

        // [hm-cross] 2+ products: the name lists them all (short form, capped at the 255-char field limit)
        if (this._hmMulti()) {
            finalQuoteName = this._hmQuoteName();
            this.modalSavedData._Saved_Product_Name = finalQuoteName;
        }

        // =========================================================
        // 👉 THE FIX: CREATE THE TABLE ROW (PRESERVING MODAL LINES!)
        // =========================================================
        const finalRow = {
            id: this.quoteId,
            name: finalQuoteName || 'N/A',
            billable: this.modalSavedData.Billable__c || false,
            quantity: this.modalSavedData.Quantity__c || 1,
            uom: this.modalSavedData.UOM__c || 'EA',
            unitCost: this.modalSavedData.Unit_Cost__c || 0,
            unitPrice: this.modalSavedData.Unit_Price__c || 0,
            unitListPrice: this.modalSavedData.Unit_List_Price__c || 0,
            expenses: this.modalSavedData.Expenses__c || 0,
            discount: this.modalSavedData.Discount__c || 0,
            netPrice: this.modalSavedData.Net_Price__c || 0,
            listPrice: this.modalSavedData.List_Price__c || 0,
            cost: this.modalSavedData.Cost__c || 0,
            margin: this.modalSavedData.Margin__c || 0,
            startDate: this.modalSavedData.Start_Date__c || '',
            endDate: this.modalSavedData.End_Date__c || '',
            weeks: this.modalSavedData.Weeks__c || 0
        };

        // SAFELY COMBINE: Grab any rows the Modal just made, filter out duplicates, and put the Main row on top!
        let existingModalRows = this.modalSavedData._Saved_Table_Rows || [];
        existingModalRows = existingModalRows.filter(row => row.id !== this.quoteId);

        if (existingModalRows.length > 0) {
            this.rows = [...existingModalRows]; // Modal rows are the source of truth
        } else {
            this.rows = [finalRow]; // No modal data? Show the parent summary row
        }
        this.modalSavedData._Saved_Table_Rows = this.rows;

        // =====================================================================
        // HDPE TRANSPORTATION GUARD (29th July 2026): "Trans.in offer?"
        // (freight_incoterms_hdpe) is readOnly+formula-driven from the Standard
        // folder's Type of Transportation, but the engine still lets the user
        // overtype it in Project Set-up Details. Recompute the SAME rule the
        // Section Logic formula uses (any of the four modal fields = F.O.R ->
        // F.O.R, else Ex-works) and BLOCK Apply on a mismatch. Static, HDPE-
        // gated, validates only when a transportation was actually chosen in
        // the folder - other departments and legacy quotes are untouched.
        // Deepanjan (29th July 2026)
        // =====================================================================
        const hdpeGuardTemplate = this.selectedPicklistValue || this.modalSavedData._Saved_Template_Name || '';
        const hdpeGuardStandard = this.modalSavedData.Standard || '';
        const hdpeGuardActive = hdpeGuardTemplate.includes('HDPE') ||
            hdpeGuardStandard.includes('IS 4984') ||
            hdpeGuardStandard === 'PLB Duct' ||
            hdpeGuardStandard === 'Pipe & Duct';
        if (hdpeGuardActive) {
            const FOR_VAL = 'F.O.R (Freight on Road)';
            const transChoices = [
                this.modalSavedData.is_Type_of_transportation,
                this.modalSavedData.Type_of_transportation,
                this.modalSavedData.p_Type_of_transportation,
                this.modalSavedData.d_Type_of_transportation
            ];
            const anyTransportationChosen = transChoices.some(v => v);
            if (anyTransportationChosen) {
                const expectedTransInOffer = transChoices.some(v => v === FOR_VAL) ? FOR_VAL : 'Ex-works';
                const actualTransInOffer = this.modalSavedData.freight_incoterms_hdpe;
                if (actualTransInOffer && actualTransInOffer !== expectedTransInOffer) {
                    this.showToast(
                        'Error',
                        `"Trans.in offer?" must be "${expectedTransInOffer}" as per the Type of Transportation selected under the Standard. Please correct it and apply again.`,
                        'error'
                    );
                    return;
                }
            }
        }

        // =========================================================
        // 3. NOW send EVERYTHING to Salesforce safely
        // =========================================================
        // [hm-cross] one product: this IS modalSavedData, exactly as before (compact only when that
        // would not fit at all). 2+ products: product 1 flat at the root plus _HM_Products (the
        // compact shape when that would be too long). Quote_Value__c holds 131,072 characters; a
        // quote still too long even compact stops here with a clear message instead of a generic
        // "Failed to save quote".
        const __hmPayload = this._hmSavePayload();
        const __hmQuoteJson = JSON.stringify(__hmPayload);
        this._hmPendingCompact = !!(__hmPayload && __hmPayload._HM_V === 2);
        if ((this._hmMulti() || this._hmPendingCompact) && __hmQuoteJson.length > 131072) {   // the field limit (128 KB); a one-product quote that fits: exactly as before, no new stop
            this.showToast('Quote too large',
                `The saved quote data is ${Math.round(__hmQuoteJson.length / 1024)} KB; the limit is 128 KB. Remove a product or reduce the rows and apply again.`,
                'error');
            return;
        }

        const fields = {
            Id: this.quoteId,
            Name: finalQuoteName,
            [QUOTE_VALUE_FIELD.fieldApiName]: __hmQuoteJson,   // [hm-cross]
            [QUOTE_VALUE_CHECKBOX_FIELD.fieldApiName]: true,
            Is_Draft__c: false      // applied = no longer a draft - Deepanjan (21st Sep 2026)
        };

        // ── EXPIRATION DATE — Deepanjan (12th August 2026) ───────────────────
        // The date the user picks on screen went only to Opportunity.CloseDate
        // and into the saved JSON as _Expiration_Date; Quote.ExpirationDate was
        // never written on APPLY. That is why the quote list showed no Expiry
        // for Draft rows - the only thing that had ever set the field was the
        // approval submission, writing its due date there.
        //
        // The due date now lives in its own Approval_Due_Date__c, so this field
        // belongs to the user's expiration date alone and the two no longer
        // overwrite each other.
        if (this.expirationDate) {
            fields.ExpirationDate = this.expirationDate;
        }
        // ── HDPE INSPECTION FLAG — Deepanjan (28th July 2026) ────────────────
        // Reporting needs to know which HDPE quotations carry inspection.
        // Any Inspection & Commission % > 0 in the saved data (any standard)
        // ticks Quote.Included_Inspection_Charges_For_HDPE__c; otherwise it is
        // explicitly set FALSE, so clearing the value and re-applying unticks
        // it. Included in this same updateRecord payload - no trigger, no
        // extra Apex, and only for the HDPE department.
        if (this._isHdpeDepartment()) {
            fields.Included_Inspection_Charges_For_HDPE__c = this._hdpeHasInspection();
        }
        const recordInput = { fields };

        this.Loading = true; // Turn on spinner
        this.isApplying = true;
        this._setApplyStep('Saving quote...', 10);

        // block wired reference-stamp DML from racing this save (UNABLE_TO_LOCK_ROW). Deepanjan 22-Jul-2026
        this._isSaving = true;

        // ── SEQUENTIAL SAVE CHAIN ────────────────────────────────────────────
        // Each step needs the previous one committed. The line items are rebuilt
        // from the quote that was just written, and captureQuoteTotal re-reads
        // Quote_Value__c from the DATABASE, so it can only run once the quote
        // save has landed - running them together (the old Promise.all) meant the
        // total could be read off the PREVIOUS save. Deepanjan (4th August 2026)
        try {
            // 1. The quote itself
            await updateRecord(recordInput);
            this._hmStoredCompact = this._hmPendingCompact;   // [hm-cross] which documents this quote needs from now on
            this.canSaveDraft = false;      // DRAFT: applied - the draft button goes away - Deepanjan (21st Sep 2026)
            this.draftSavedAt = '';
            this.loadMyDrafts();            // an applied draft leaves the Draft Quotes tab

            // 2. Expiration Date -> Opportunity Close Date. updateRecord works on
            //    any object, so this needs no Apex. Deepanjan (2nd August 2026)
            if (this.recordId && this.expirationDate) {
                this._setApplyStep('Updating opportunity...', 45);
                await updateRecord({ fields: { Id: this.recordId, CloseDate: this.expirationDate } });
            }

            // 3. Line items
            if (this.modalSavedData._Final_Apex_Lines && this.modalSavedData._Final_Apex_Lines.length > 0 && this.quoteId) {
                this._setApplyStep('Generating line items...', 60);
                await generateQuoteLines({
                    quoteId: this.quoteId,
                    parsedLineItems: this.modalSavedData._Final_Apex_Lines
                });
            }

            this._setApplyStep('Quote saved', 70);

            console.log('Quote and Line Items updated successfully!');
            this.showToast('Success', 'Quote saved successfully!', 'success');
            this.isReadOnlyMode = true;

            this.showDocumentGenerator = true;//Abhishek saxena 06-05-2026
            this.isQuoteSaved = true;

            // 4. Stamp Quote Reference AFTER the save has committed (not from the
            //    wire mid-save) to avoid the row-lock race. Deepanjan 22-Jul-2026
            //    Its own catch: the quote is already saved, so a failed stamp must
            //    never surface as a save failure.
            if (this.quoteNumber && !this._refStamped) {
                this._setApplyStep('Stamping quote reference...', 80);
                this._refStamped = true;
                try {
                    const ref = await generateQuoteReference({
                        quoteId: this.quoteId,
                        department: this.selectedPicklistValue
                    });
                    console.log('Quote Reference:', ref);
                } catch (refErr) {
                    this._refStamped = false;
                    console.error('generateQuoteReference error:', JSON.stringify(refErr));
                }
            }

            // 5. Offer total - LAST, because the Apex reads the saved JSON back.
            //    Apply writes ONLY Quote.Final_Quote_Amount__c; Opportunity.Amount
            //    and the stage rule stay on approval. Same reasoning as step 4 for
            //    the inner catch. Deepanjan (4th August 2026)
            this._setApplyStep('Capturing offer total...', 90);
            try {
                await captureQuoteTotal({ quoteId: this.quoteId });
                getRecordNotifyChange([{ recordId: this.quoteId }]);
            } catch (capErr) {
                console.error('Quote total capture failed', JSON.stringify(capErr));
            }

            // Clean up memory
            //delete this.modalSavedData._pendingLineItems;

            // Let the bar reach the end before the mask drops, otherwise the
            // last step never renders. Deepanjan (4th August 2026)
            this._setApplyStep('Done', 100);
            await new Promise(resolve => setTimeout(resolve, 250));

        } catch (error) {
            console.error('Update failed', error);
            this.showToast('Error', 'Failed to save quote.', 'error');
        } finally {
            this.Loading = false; // Turn off spinner safely
            this.isApplying = false;
            this.applyProgress = 0;
            this._isSaving = false;
        }
    }

    handleBack() { this.isQuoteCreated = false; this.approvalTriggers = null; }   // marks belong to the quote just left - Deepanjan (20th Sep 2026)

    viewQuote(event) {
        const selectedQuoteId = event.currentTarget.dataset.id;
        const selectedQuote = this.opportunityQuotes.find(q => q.Id === selectedQuoteId);
        this.approvalTriggers = null;
        try {
            if (selectedQuote && selectedQuote.Approval_Triggers__c) {
                const parsed = JSON.parse(selectedQuote.Approval_Triggers__c);
                if (parsed && Array.isArray(parsed.items)) this.approvalTriggers = parsed;
            }
        } catch (e) { this.approvalTriggers = null; }

        if (selectedQuote) {

            this.quoteId = selectedQuote.Id; // 👉 THIS TELLS THE APP TO USE THE EXISTING QUOTE ID!
            getCustomQuoteLines({ quoteId: this.quoteId })
                .then(fetchedLines => {
                    if (fetchedLines && this.rows.length === 0) {
                        this.rows = fetchedLines.map(line => {
                            return {
                                id: line.Id,
                                name: line.Name || 'N/A',
                                billable: false,
                                quantity: line.Quantity__c || 0,
                                uom: line.UOM__c || 'EA',
                                unitCost: line.UNIT_COST__c || 0,
                                unitPrice: line.UNIT_PRICE__c || 0,
                                unitListPrice: line.UNIT_LIST_PRICE__c || 0,
                                expenses: line.EXPENSES__c || 0,
                                discount: line.Discount_Percentage__c || 0,
                                netPrice: line.NET_PRICE__c || 0,
                                listPrice: line.UNIT_LIST_PRICE__c || 0,
                                cost: line.COST__c || 0,
                                margin: line.MARGIN__c || 0,
                                startDate: '',
                                endDate: '',
                                weeks: 0
                            };
                        });
                    }
                })
                .catch(e => console.error('Error loading lines', e));

            // 1. Rehydrate the saved JSON data
            if (selectedQuote.Quote_Value__c) {
                try {
                    this.modalSavedData = JSON.parse(selectedQuote.Quote_Value__c);
                    this.modalSavedData = this._hmDecodeStored(this.modalSavedData);   // [hm-cross] compact JSON (2+ products, or one very large product) -> plain shape; any other JSON untouched

                    // 👉 THE FIX: Restore the exact table rows we dynamically generated and saved!
                    this.rows = this.modalSavedData._Saved_Table_Rows || [];

                } catch (e) {
                    this.modalSavedData = {};
                    this.rows = [];
                }
            } else {
                this.modalSavedData = {};
                this.rows = [];
            }

            // 👉 Grab the saved template name
            this.selectedPicklistValue = this.modalSavedData._Saved_Template_Name || this.quotePicklistOptions[0].value;

            // 2. Lock the UI and redirect
            this.isReadOnlyMode = true;
            this.selectedNavItem = 'GENERATE_QUOTE';

            this.showDocumentGenerator = true;//Abhishek saxena 06-05-2026
            this.isQuoteSaved = true;

            // DRAFT: never applied, so nothing to lock - open it for editing. quoteId is
            // already this quote's Id (set above), so createQuoteRecord will not make a
            // second record. Deepanjan (21st September 2026)
            this.draftSavedAt = '';
            this.canSaveDraft = false;
            // Only the user who saved the draft resumes it for editing; anyone else
            // opens it read-only, like any other quote.
            if (selectedQuote.Is_Draft__c === true && selectedQuote.CreatedById === USER_ID) {
                this.isReadOnlyMode = false;
                this.showDocumentGenerator = false;
                this.isQuoteSaved = false;
                this.canSaveDraft = true;
            }

            // [hm-cross] nothing of the quote viewed before carries over: its products (read
            // by the approval check below) and its document list are rebuilt for this quote
            this.hmProducts = null;
            this.hmActive = 0;
            this.hmDocs = null;
            this._hmStoredCompact = !!(this.modalSavedData && this.modalSavedData.__hmCompact);   // read again by _hmInitFromMemory

            // 3. Rebuild the accordion screen
            this.handleCreateClick();

            // Must come AFTER handleCreateClick - that call blanks the field.
            this.expirationDate = this.modalSavedData._Expiration_Date || null;
            // 👉 Check if this quote requires escalation to Ed
            this.checkEscalationForCurrentQuote();
        }
        this.isExcelViewActive = false; // Add this to reset the view!
    }
    editQuote(event) { window.open(`/lightning/r/Quote__c/${event.currentTarget.dataset.id}/edit`, '_blank'); }
    copyQuote(event) { }

    // ── CREATE button — Deepanjan (21st September 2026) ──────────────────────────
    // Same department already in draft on this opportunity -> toast, and no new quote
    // (the prompt lets the user open the draft). Another department in draft ->
    // inform; the user may open it or carry on with the new quote.
    async handleCreateNewQuote() {
        const templateName = this.selectedPicklistValue;
        if (!templateName || this._creatingNew) return;
        this._creatingNew = true;
        try {
            // Straight from the server: after a page refresh the Quotes list has not been
            // loaded yet (it loads only when the Quotes tab is opened), so it cannot be
            // trusted here.
            const fresh = await this.loadMyDrafts();
            if (fresh === null) {
                // The check itself failed - do not stop the user from working.
                console.warn('Draft check failed; continuing with a new quotation.');
                this._startFreshQuote(templateName);
                return;
            }
            const drafts = this._findDrafts();
            const same = drafts.filter(d => d.dept === templateName);
            if (same.length) {
                this.showToast('Draft already exists',
                    `You already have a ${templateName} quotation in draft (${same[0].QuoteNumber}). Open it to continue.`, 'warning');
                this.draftPrompt = { blocking: true, template: templateName, drafts: same };
                return;
            }
            if (drafts.length) {
                this.draftPrompt = { blocking: false, template: templateName, drafts };
                return;                  // "Create new" in the prompt calls _startFreshQuote
            }
            this._startFreshQuote(templateName);
        } finally {
            this._creatingNew = false;
        }
    }

    // What the CREATE button used to do (handleCreateClick), with the record and draft
    // state cleared first so nothing from a previously opened quote carries over.
    _startFreshQuote(templateName) {
        this.quoteId = null;             // createQuoteRecord will make this quote's own record
        this.canSaveDraft = true;
        this.draftSavedAt = '';
        this.selectedPicklistValue = templateName;
        this._hmFreshQuote();            // [hm-cross] 2+ products were on screen: only the product on screen carries over
        this.handleCreateClick();
    }

    // The current user's drafts on this opportunity, as last fetched by loadMyDrafts
    // (getMyDraftQuotes filters by opportunity, Is_Draft__c and CreatedById).
    _findDrafts() {
        return Array.isArray(this.myDrafts) ? this.myDrafts : [];
    }

    // Returns the list, or null when the call failed.
    async loadMyDrafts() {
        if (!this.recordId) { this.myDrafts = []; return this.myDrafts; }
        this.draftsLoading = true;
        this.draftsError = null;
        try {
            const res = await getMyDraftQuotes({ opportunityId: this.recordId });
            const fmt = d => d ? new Date(d).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '';
            this.myDrafts = (res || []).map(d => ({
                Id: d.Id, QuoteNumber: d.QuoteNumber || '', dept: d.dept || '',
                savedAt: fmt(d.lastModified), createdAt: fmt(d.createdDate)
            }));
            return this.myDrafts;
        } catch (error) {
            this.draftsError = (error && error.body && error.body.message) ? error.body.message : 'Could not load draft quotations.';
            console.error('getMyDraftQuotes failed:', JSON.stringify(error));
            return null;
        } finally {
            this.draftsLoading = false;
        }
    }

    // viewQuote looks the quote up in opportunityQuotes, which may not be loaded yet
    // (fresh page, Draft Quotes tab) - load it first.
    async _openQuoteById(id) {
        const has = () => (this.opportunityQuotes || []).some(q => q && q.Id === id);
        if (!has()) await this.loadOpportunityQuotes();
        if (!has()) {
            this.showToast('Not found', 'This draft could not be opened. Refresh and try again.', 'error');
            return;
        }
        this.viewQuote({ currentTarget: { dataset: { id } } });
    }

    // ── Draft Quotes tab ──
    get isDraftsVisible() { return this.selectedNavItem === 'DRAFTS'; }
    get draftsNavClass() { return this.selectedNavItem === 'DRAFTS' ? 'nav-item active' : 'nav-item'; }
    get hasMyDrafts() { return Array.isArray(this.myDrafts) && this.myDrafts.length > 0; }
    get myDraftsCount() { return this.hasMyDrafts ? this.myDrafts.length : 0; }
    handleDraftsRefresh() { this.loadMyDrafts(); }
    handleOpenDraftRow(event) { this._openQuoteById(event.currentTarget.dataset.id); }

    handleDraftOpen(event) {
        const id = event.currentTarget.dataset.id;
        this.draftPrompt = null;
        if (id) this._openQuoteById(id);
    }
    handleDraftCreateNew() {
        const t = this.draftPrompt ? this.draftPrompt.template : this.selectedPicklistValue;
        this.draftPrompt = null;
        this._startFreshQuote(t);
    }
    closeDraftPrompt() { this.draftPrompt = null; }
    get draftPromptOpen() { return !!this.draftPrompt; }
    get draftPromptBlocking() { return !!(this.draftPrompt && this.draftPrompt.blocking); }
    get draftPromptDrafts() { return this.draftPrompt ? this.draftPrompt.drafts : []; }
    get draftPromptTitle() { return this.draftPromptBlocking ? 'Draft already exists' : 'A draft is in progress'; }
    get draftPromptMessage() {
        if (!this.draftPrompt) return '';
        return this.draftPromptBlocking
            ? `You already have a ${this.draftPrompt.template} quotation in draft on this opportunity. Open it to continue - a second one cannot be created.`
            : `You have a quotation for another department still in draft on this opportunity. You can open it, or continue with a new ${this.draftPrompt.template} quotation.`;
    }

    // ── Save as Draft button ──
    get showSaveDraftButton() { return !this.isReadOnlyMode && this.canSaveDraft; }
    get saveDraftLabel() { return this.isSavingDraft ? 'SAVING...' : 'SAVE AS DRAFT'; }

    async handleSaveAsDraft() {
        if (this.isReadOnlyMode || !this.canSaveDraft || this.isSavingDraft || this._isSaving) return;
        if (!this.quoteId) {
            this.showToast('Please wait', 'The quotation is still being set up. Try again in a moment.', 'warning');
            return;
        }
        this.isSavingDraft = true;
        try {
            const snapshot = { ...this._hmSavePayload(this.rows) };   // [hm-cross] = modalSavedData unless 2+ High Mast products
            snapshot._Saved_Template_Name = this.selectedPicklistValue;   // resume + draft check need the department
            if (!snapshot._HM_Lines) snapshot._Saved_Table_Rows = this.rows;   // grid comes back as it was ([hm-cross] compact shape: already inside _HM_Lines)
            if (this.expirationDate) snapshot._Expiration_Date = this.expirationDate;
            // [hm-cross] same size stop as APPLY: 2+ products, or one product written compact
            if ((this._hmMulti() || snapshot._HM_V === 2) && JSON.stringify(snapshot).length > 131072) {   // the field limit (128 KB)
                this.showToast('Quote too large',
                    `The draft data is ${Math.round(JSON.stringify(snapshot).length / 1024)} KB; the limit is 128 KB. Remove a product or reduce the rows and save again.`,
                    'error');
                return;
            }
            await updateRecord({ fields: {
                Id: this.quoteId,
                Quote_Value__c: JSON.stringify(snapshot),
                Is_Draft__c: true
            } });
            this._hmStoredCompact = snapshot._HM_V === 2;   // [hm-cross] which documents this quote needs from now on
            this.draftSavedAt = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            this.showToast('Saved as Draft', 'You can continue this quotation later from the Quotes list.', 'success');
            this.refreshQuotes();
            this.loadMyDrafts();        // Draft Quotes tab + its dot
        } catch (error) {
            const msg = (error && error.body && error.body.message) ? error.body.message : 'Could not save the draft.';
            this.showToast('Error', msg, 'error');
            console.error('Save as Draft failed:', JSON.stringify(error));
        } finally {
            this.isSavingDraft = false;
        }
    }

    createQuoteFromTemplate(event) {
        const templateName = event.currentTarget.dataset.template;
        this.selectedPicklistValue = templateName;
        this.approvalTriggers = null;   // a fresh quote never inherits the last viewed quote's marks - Deepanjan (20th Sep 2026)
        this.selectedNavItem = 'GENERATE_QUOTE';
        this.handleCreateClick();
    }

    retryLoading() {
        this.initializationError = null;
        this.initializeData();
    }

    // =========================================================
    // HELPER: Groups flat payload into Line Items
    // =========================================================
    normalizeEstimatorPayload(flatPayload) {
        const result = { header: {}, lines: [] };
        if (!flatPayload) return result;

        const linesMap = {};

        Object.keys(flatPayload).forEach(key => {
            const value = flatPayload[key];
            const repeaterMatch = key.match(/^[cr](\d+)_(.+)$/); // Finds r1_, c1_, etc.

            if (repeaterMatch) {
                const index = repeaterMatch[1];
                const cleanApiName = repeaterMatch[2];

                if (!linesMap[index]) {
                    linesMap[index] = { _lineIndex: Number(index) };
                }
                linesMap[index][cleanApiName] = value;
            } else {
                result.header[key] = value;
            }
        });

        result.lines = Object.values(linesMap)
            .filter(line => {
                // Only keep lines that have actual data
                return Object.keys(line).some(k => k !== '_lineIndex' && line[k] !== '' && line[k] !== null && line[k] !== false);
            })
            .sort((a, b) => a._lineIndex - b._lineIndex)
            .map((line, idx) => {
                return { ...line, uiLineNumber: idx + 1 };
            });

        return result;
    }

    // =========================================================
    // HELPER: Generic Toast Notification
    // =========================================================
    showToast(title, message, variant = 'info') {
        if (this._hmToastPrefix) message = this._hmToastPrefix + message;   // [hm-cross] "Product 2 (LATCHING MAST): ..."
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    // =========================================================
    // 👉 PARENT VALIDATION ENGINE
    // Automatically checks only visible and required fields!
    // =========================================================
    // Resolve a human-readable label for a field, never the raw apiName until
    // every option is exhausted. (CQ fields normally carry their own label.)
    _prettyLabel(sec, field) {
        if (field.label && field.label.trim() !== '') return field.label.trim();
        const hdr = sec.fields.find(f =>
            f.apiName === field.apiName + '_header' && f.label && f.label.trim() !== '');
        if (hdr) return hdr.label.trim();
        const idx = sec.fields.indexOf(field);
        for (let i = idx - 1; i >= 0; i--) {
            const f = sec.fields[i];
            if (f.type === 'header' && f.label && f.label.trim() !== '') return f.label.trim();
        }
        return field.apiName;
    }

    validateRequiredFields() {
        let missingFields = [];

        this.accordionSections.forEach(sec => {
            // Only check sections that are currently visible
            if (sec.isVisible) {
                sec.fields.forEach(field => {
                    // Only check fields that are visible, required, and are NOT a folder button
                    if (field.isVisible && field.isRequired && !field.hasFolderIcon) {
                        if (field.value === '' || field.value === null || field.value === undefined) {
                            // 👉 Show a human label, never the raw apiName
                            missingFields.push(this._prettyLabel(sec, field));
                        }
                    }

                    // 👉 Positive-value guard: min-flagged field (e.g. Full Vehicle Freight)
                    //    must not hold 0 / negative / below-min. Label may be blank on
                    //    some inputs, so fall back to apiName for the message.
                    if (field.isVisible && !field.hasFolderIcon &&
                        field.min !== null && field.min !== undefined) {
                        const raw = field.value;
                        if (raw !== '' && raw !== null && raw !== undefined) {
                            const num = parseFloat(raw);
                            if (isNaN(num) || num < Number(field.min)) {
                                const lbl = this._prettyLabel(sec, field);
                                missingFields.push(`${lbl} (must be ≥ ${field.min})`);
                            }
                        }
                    }
                });
            }
        });

        if (missingFields.length > 0) {
            // Clean up the list to remove any duplicates
            let uniqueFields = [...new Set(missingFields)];

            // Show the red toast error with the exact missing field labels
            this.showToast(
                'Validation Error',
                `Please fill in all required fields: ${uniqueFields.join(', ')}`,
                'error'
            );
            return false; // Tells the apply function to STOP
        }
        return true; // Everything is good, proceed!
    }

    // transmission final check logic

    // =========================================================================
    // KIT CODE DETAILS IS MANDATORY - Deepanjan (5th September 2026)
    //
    // When a KIT accordion (KIT_Code_Details or KIT_Code_Details_LCLM) is on screen
    // for the chosen mast type, the quote cannot be applied until the KIT has been
    // filled in and applied. The parent-screen validateRequiredFields() cannot express
    // this: it skips folder buttons on purpose, and the KIT folder has no value.
    //
    // WHAT "FILLED" MEANS. The KIT modal's own APPLY refuses to close until every
    // visible required input on every line is set. This check asks for the subset of
    // those that are ALWAYS on the line - required, typed by the user (no formula, not
    // read-only), no controllingField, not one of the four the KIT interceptor turns
    // into formulas (lm_mast_height, lm_qty_of_hm, no_of_segment_select, lm_ring_dia).
    // If those are present for every KIT line the modal was applied; if any is blank
    // it was never opened (or a mast row was added afterwards). It never asks for more
    // than the modal itself would, so a KIT the modal accepted always passes here.
    //
    // WHICH LINES. Exactly the KIT interceptor's rule in handleFolderClick: one line per
    // General-Details row with a Height of Mast; a Stadium mrl_ header is row 1; a KIT
    // whose MAST HEIGHT is typed inside the KIT (LCLM - no formula on the lm_mast_height
    // template) always has line 1, which is why LCLM could be applied with no mast row
    // and no KIT at all.
    //
    // GATED to the High Mast department. Read-only mode is never blocked.
    // Reads the SAME metadata the interceptor reads (the folder's modalConfigsByValue),
    // so a change to which KIT fields are required needs no code change here.
    // =========================================================================
    _validateKitRequiredFinal() {
        if (this.isReadOnlyMode) return true;
        if (this.selectedPicklistValue !== 'High Mast - Department') return true;

        const d = this.modalSavedData || {};

        // STADIUM MAST: the KIT is mandatory only WITH Man Riding Lift - Deepanjan
        // (8th September 2026). The KIT accessory feeds the Man Riding Lift; a Stadium
        // quote with only Ladder With Cage (MRL unticked) has no mrl_ header, so the
        // rule below would find no KIT line and block Apply for a KIT that is not
        // wanted. A Stadium estimator (normal or Segment Above 5) is the only recipe
        // that saves the man_riding_lift toggle, so its presence identifies Stadium;
        // any other mast type falls through unchanged.
        if (Object.prototype.hasOwnProperty.call(d, 'man_riding_lift')) {
            const mrl = d.man_riding_lift;
            if (!(mrl === true || String(mrl).toLowerCase() === 'true')) return true;
        }
        const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
        const INTERCEPTOR_DERIVED = new Set(['lm_mast_height', 'lm_qty_of_hm', 'no_of_segment_select', 'lm_ring_dia']);

        const kitSections = (this.accordionSections || []).filter(sec =>
            sec.isVisible && Array.isArray(sec.fields) &&
            sec.fields.some(f => f.apiName === 'lm_kit_code_folder' && f.isVisible !== false));

        for (const sec of kitSections) {
            const folder = sec.fields.find(f => f.apiName === 'lm_kit_code_folder');
            const def = folder && folder.modalConfigsByValue ? folder.modalConfigsByValue['default'] : null;
            const tpl = (def && Array.isArray(def.lineTemplateFields)) ? def.lineTemplateFields : [];
            // EVERY required input on the line - including the ones that only show once
            // their controlling field allows it (e.g. cable type / winch / power tool /
            // wire rope behind no_of_segment_select >= 1). For those the same condition
            // the KIT modal uses is evaluated against the line's saved values, so the set
            // demanded here is exactly the set the modal's own Apply demanded.
            // Deepanjan (5th September 2026)
            const requiredTpl = tpl.filter(f => f && f.apiName && f.required && !f.formula && !f.readOnly
                                                && !f.cloneFrom && !INTERCEPTOR_DERIVED.has(f.apiName));
            if (requiredTpl.length === 0) continue;
            const ctrlAllows = (f, n) => {
                if (!f.controllingField) return true;
                const parentVal = d[`kit_line_${n}_${f.controllingField}`];
                if (isBlank(parentVal)) return false;                       // parent unset -> field hidden -> not asked
                const cvs = (f.controllingValues || ['*']).map(v => String(v).trim());
                if (cvs.includes('*')) return true;
                const pv = String(parentVal).trim();
                return cvs.some(cv => {
                    if (cv.startsWith('>=')) { const t = Number(cv.substring(2)); const v = Number(pv); return !isNaN(v) && !isNaN(t) && v >= t; }
                    return cv.toLowerCase() === pv.toLowerCase();
                });
            };

            // Human label, never the raw api name - same convention as _prettyLabel(): the
            // field's own label, else the nearest header above it in the template (e.g.
            // KIT_realization has label "" but sits under the "REALIZATION" header), else
            // the api name spelled out ("KIT_realization" -> "KIT Realization").
            const labelOf = (api) => {
                const idx = tpl.findIndex(f => f.apiName === api);
                const t = idx >= 0 ? tpl[idx] : null;
                if (t && t.label && String(t.label).trim() !== '') return String(t.label).trim();
                for (let i = idx - 1; i >= 0; i--) {
                    const f = tpl[i];
                    if (f && f.type === 'header' && f.label && String(f.label).trim() !== '') return String(f.label).trim();
                }
                return String(api).replace(/^lm_/, '').split('_').filter(Boolean)
                    .map(w => (w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
            };
            const lineIdx = this._kitLineIndexes(def);

            // No KIT line at all means the Weight Estimator has no mast row yet - the KIT
            // interceptor itself refuses to open in that state ("Please enter at least one
            // Height of Mast in General Details first"). A mast type that shows the KIT
            // accordion needs the KIT, so this is a block, not a pass: without it a
            // Lighting Mast quote with nothing filled in sailed straight through.
            // Deepanjan (5th September 2026)
            if (lineIdx.length === 0) {
                this.showToast(
                    'KIT Code Details Required',
                    `${sec.name || 'KIT CODE DETAILS'} is mandatory for this mast type. `
                    + 'Please open the KIT folder, fill it in and Apply, then try again.',
                    'error'
                );
                return false;
            }

            for (const n of lineIdx) {
                const requiredApis = requiredTpl.filter(f => ctrlAllows(f, n)).map(f => f.apiName);
                const missing = requiredApis.filter(api => isBlank(d[`kit_line_${n}_${api}`]));
                if (missing.length > 0) {
                    this.showToast(
                        'KIT Code Details Required',
                        `${sec.name || 'KIT CODE DETAILS'} is mandatory for this mast type. `
                        + `Line ${n} is missing: ${missing.map(labelOf).join(', ')}. `
                        + 'Please open the KIT folder, fill it in and Apply, then try again.',
                        'error'
                    );
                    return false;
                }
            }
        }
        return true;
    }

    // [hm-kit] STADIUM MAST (Customized Mast) with Man Riding Lift ticked: the lifts the
    // KIT is for, in lift order - [{ k, height, seg, qty }]. Lift 1 is the mrl_ block;
    // lift k (2..10) is its copy m<k>_mrl_, which the Stadium JSON shows for MAN RIDING
    // LIFT COUNT >= k. A lift counts once it has a height or a segment count - the test
    // the KIT has always used for lift 1. null for every other mast type (and for a
    // Stadium without Man Riding Lift), so their KIT path is untouched.
    // Deepanjan (29th September 2026)
    _hmStadiumLifts(d) {
        const sd = d || {};
        if (!Object.prototype.hasOwnProperty.call(sd, 'man_riding_lift')) return null;
        const on = sd.man_riding_lift;
        if (!(on === true || String(on).toLowerCase() === 'true')) return null;
        if (String(sd.type_of_mast || '').trim().toLowerCase() !== 'customized mast') return null;
        if (String(sd.mast_customized || '').trim().toUpperCase() !== 'STADIUM MAST') return null;
        let n = parseInt(sd.man_riding_lift_count, 10);
        if (!(n >= 1)) n = 1;
        if (n > 10) n = 10;
        const lifts = [];
        for (let k = 1; k <= n; k++) {
            const p = k === 1 ? 'mrl_' : `m${k}_mrl_`;
            const height = sd[p + 'height_of_mast'];
            const seg = sd[p + 'no_of_segment'];
            if (height || seg) lifts.push({ k, height, seg, qty: sd[p + 'quantity'] });
        }
        return lifts;
    }
    // [hm-kit] lift k -> row k under the key names the KIT formulas read (the lift-1 bridge
    // of the KIT interceptor, for every lift). A row whose lift is gone is blanked, so its
    // KIT line prices to nothing and leaves the quote on the next recompute.
    _hmBridgeStadiumLifts(lifts) {
        const d = this.modalSavedData;
        const keep = new Set(lifts.map(l => l.k));
        lifts.forEach(l => {
            d[`r${l.k}_lm_height_of_mast`] = l.height;
            d[`r${l.k}_lm_no_of_segment`] = l.seg;
            d[`r${l.k}_lm_quantity`] = l.qty;
        });
        for (let k = 1; k <= 10; k++) {
            if (keep.has(k)) continue;
            ['lm_height_of_mast', 'lm_no_of_segment', 'lm_quantity'].forEach(f => {
                if (d[`r${k}_${f}`] !== undefined && d[`r${k}_${f}`] !== '') d[`r${k}_${f}`] = '';
            });
        }
    }
    // [hm-kit] the KIT has bridged this Stadium before (only the bridge writes r<n>_lm_ keys
    // on a Stadium quote) - until then an estimator Apply writes nothing new.
    _hmStadiumBridged() {
        const d = this.modalSavedData || {};
        return Object.keys(d).some(k => /^r([1-9]|10)_lm_(height_of_mast|no_of_segment|quantity)$/.test(k));
    }

    /** The KIT line numbers that exist for the current masts - the same rule the KIT
     *  interceptor in handleFolderClick uses to build them. */
    _kitLineIndexes(def) {
        const structured = this.normalizeEstimatorPayload(this.modalSavedData || {});
        const h = structured.header || {};
        let lines;
        if (h.mrl_height_of_mast || h.mrl_no_of_segment) {
            lines = [{ _lineIndex: 1 }];                             // Stadium: mrl_ header is row 1
        } else {
            lines = (structured.lines || []).filter(l =>
                l.lm_height_of_mast !== undefined && l.lm_height_of_mast !== null && l.lm_height_of_mast !== '');
        }
        // [hm-kit] Stadium: one KIT line per Man Riding Lift (lift 1 alone = [1], as above)
        const __hmLifts = this._hmStadiumLifts(this.modalSavedData);
        if (__hmLifts) lines = __hmLifts.map(l => ({ _lineIndex: l.k }));
        const mh = def && Array.isArray(def.lineTemplateFields)
            ? def.lineTemplateFields.find(f => f.apiName === 'lm_mast_height') : null;
        const heightIsInput = mh ? !mh.formula : false;
        if (lines.length === 0 && heightIsInput) lines = [{ _lineIndex: 1 }];   // LCLM
        return lines.map(l => l._lineIndex).filter(i => i !== undefined && i !== null);
    }

    _validateTowerSubstationInterestFinal() {
        const d = this.modalSavedData || {};

        const normalise = (v) => String(v || '').trim().toUpperCase().replace(/\s+/g, ' ');
        const towerBasis = normalise(d['pvt_price_basics']);
        const substationBasis = normalise(d['pvs_price_model']);

        const towerPrefix =
            towerBasis === 'FIRM' ? 'pvt_firm_' :
                towerBasis === 'PRICE VARIATION' ? 'pvt_pv_' : null;
        const substationPrefix =
            substationBasis === 'FIRM' ? 'pvs_firm_' :
                substationBasis === 'PRICE VARIATION' ? 'pvs_pv_' : null;

        // Either side isn't on this quote / hasn't picked a Price Basis yet -
        // nothing to reconcile. No-op for every other department.
        if (!towerPrefix || !substationPrefix) return true;

        const readBool = (apiName) => {
            const v = d[apiName];
            return v === true || v === 'true';
        };

        const towerInterestOn = readBool(`${towerPrefix}interest_component`);
        const substationInterestOn = readBool(`${substationPrefix}interest_component`);

        if (towerInterestOn === substationInterestOn) return true;

        const onSide = towerInterestOn ? 'Tower' : 'Substation';
        const offSide = towerInterestOn ? 'Substation' : 'Tower';

        this.showToast(
            'Payment Terms Mismatch',
            `${onSide} has "Interest Component (as per respective payment terms)?" checked, but `
            + `${offSide} does not. Both Tower and Substation must use the same Interest `
            + 'Component setting before this quote can be saved. Please open the one that '
            + 'doesn\'t match, correct the checkbox, Apply it, and try again.',
            'error'
        );
        return false;
    }

    // this ensures that each modal angular, tubular, & tubular signalling should have same 
    // same payments terms details - rajeev 14 sep
    _validateTelecomInterestFinal() {
        if (this.isReadOnlyMode) return true;
        if (this.selectedPicklistValue !== 'Telecom Tower - Department') return true;

        const d = this.modalSavedData || {};
        const PRODUCTS = [
            { name: 'Angular',            pfx: 'agl_' },
            { name: 'Tubular',            pfx: 'tub_' },
            { name: 'Tubular Signalling', pfx: 'tsg_' }
        ];

        // A product is on the quote only if it produced a line item.
        const lines = Array.isArray(d._pendingLineItems) ? d._pendingLineItems : [];
        const hasLines = (name) => lines.some(li => {
            if (!li) return false;
            if (String(li._modalSource || '').trim() === name) return true;
            // fallback for lines saved before _modalSource was tagged
            const nm = String(li.itemName || li.name || '').trim();
            return nm === name || nm.indexOf(name + ' - ') === 0;
        });

        // Accepts the gate as a checkbox (true) or as a Yes/No picklist.
        const GATE_ON = ['true', 'yes', 'y', '1'];
        const gateOn = (v) => (v === true || v === 1)
            ? true
            : GATE_ON.indexOf(String(v === undefined || v === null ? '' : v).trim().toLowerCase()) >= 0;

        const parts = PRODUCTS.filter(p => hasLines(p.name))
                              .map(p => ({ name: p.name, on: gateOn(d[p.pfx + 'payment_terms_req']) }));

        if (parts.length < 2) return true;   // single product - nothing to reconcile

        const on  = parts.filter(p => p.on).map(p => p.name);
        const off = parts.filter(p => !p.on).map(p => p.name);
        if (on.length === 0 || off.length === 0) return true;   // all on, or all off

        const onVerb  = on.length > 1 ? 'have' : 'has';
        const offVerb = off.length > 1 ? 'do' : 'does';
        this.showToast(
            'Telecom Tower - Interest Component Mismatch',
            `${on.join(', ')} ${onVerb} "Interest Component (as per respective payment terms)?" `
            + `ticked, but ${off.join(', ')} ${offVerb} not. Every tower type on this quote must use `
            + 'the same setting. Please open the one that does not match, correct it, Apply it, and '
            + 'try again.',
            'error'
        );
        return false;
    }

    // =========================================================
    // 👉 GENERIC LINE ITEM ADJUSTMENT ENGINE (Metadata-Driven)
    // =========================================================

    // =========================================================
    // 👉 CROSS-MODAL RECOMPUTE ORCHESTRATOR
    // Re-runs every applied modal headlessly against the fully-merged modalSavedData,
    // so fields depending on OTHER modals (e.g. d1_pole_payment_term -> Terms &
    // Conditions) become correct, then rebuilds the line-item arrays.
    // =========================================================

    _TT_DEPARTMENT = 'Transmission Tower - Department';
    _TT_CASCADE_TRIGGER_APIS = ['tower_project_for_transportation_addition'];
    _ttCascadePending = false;

    _isTowerCascadeTrigger(apiName) {
        return this.selectedPicklistValue === this._TT_DEPARTMENT &&
            !!apiName &&
            this._TT_CASCADE_TRIGGER_APIS.includes(apiName);
    }

    _triggerTowerCascade(apiName) {
        if (!this._isTowerCascadeTrigger(apiName)) return;

        // Nothing applied yet -> nothing to recompute.
        if (!this._appliedModalConfigs ||
            Object.keys(this._appliedModalConfigs).length === 0) return;

        // Collapse rapid toggles into a single run.
        if (this._ttCascadePending) return;
        this._ttCascadePending = true;

        // Microtask so LWC finishes the current render pass (and any child
        // modal finishes _resetModal) before recomputeHeadless swaps the
        // child's accordionSections in and out.
        Promise.resolve().then(() => {
            this._ttCascadePending = false;
            try {
                this._recomputeAllAppliedModals();
            } catch (e) {
                console.error('[TT Cascade] recompute error:', e);
            }
        });
    }


    _recomputeAllAppliedModals() {
        try {
            if (!this._appliedModalConfigs) return;
            const titles = Object.keys(this._appliedModalConfigs);
            if (titles.length === 0) return;

            const modal = this.template.querySelector('c-hm-estimator')   /* hmQuoteTest */;
            if (!modal || typeof modal.recomputeHeadless !== 'function') return;

            // 2 passes resolve derived->derived chains that cross modal boundaries;
            // the common "derived depends on a raw input in another modal" case needs 1.
            for (let pass = 0; pass < 2; pass++) {
                titles.forEach(title => {
                    const cfg = this._appliedModalConfigs[title];
                    if (!cfg) return;

                    const res = modal.recomputeHeadless(cfg, this.modalSavedData);
                    if (!res) return;

                    // 1. merge recomputed field values into the single source of truth
                    if (res.values) {
                        this.modalSavedData = { ...this.modalSavedData, ...res.values };
                    }
                    if (res.parentPushes) {
                        Object.keys(res.parentPushes).forEach(pApi => {
                            this.modalSavedData[pApi] = res.parentPushes[pApi];
                        });
                    }

                    // 2. replace this source's pending line items (multiplier-aware,
                    //    mirrors handleModalApply exactly so N&B cartesian etc. is intact)
                    const activeLabels = this._resolveLineItemMultiplier(cfg);
                    const existing = this.modalSavedData._pendingLineItems || [];
                    const kept = existing.filter(li => li._modalSource !== title || this._hmOtherProduct(li));   // [hm-cross]

                    if (cfg.lineItemMultiplierConfig && activeLabels.length === 0) {
                        this.modalSavedData._pendingLineItems = kept;
                    } else {
                        const items = res.lineItems || [];
                        const finalItems = activeLabels.length > 0
                            ? activeLabels.flatMap(suffix =>
                                items.map(line => ({ ...line, itemName: `${line.itemName} [${suffix}]` })))
                            : items;

                        this.modalSavedData._pendingLineItems = [
                            ...kept,
                            ...finalItems.map(line => ({
                                ...line,
                                _modalSource: title,
                                _baseUnitPrice: line.unitPrice || 0,
                                _baseUnitCost: line.unitCost || 0
                            }))
                        ];
                    }
                    this._hmTagPending();   // [hm-cross]
                });
            }

            // rebuild _Final_Apex_Lines + _Saved_Table_Rows + this.rows
            this._applyDynamicLineItemAdjustments();
        } catch (e) {
            console.error('_recomputeAllAppliedModals error:', e);
        }
    }

    _applyDynamicLineItemAdjustments() {

        this._hmOrderPending();   // [hm-cross] lines grouped in product order (no-op for one product)

        // 👉 THE "CORE" INTERCEPTOR
        // Because "Core" quotes skip pending lines and go straight to Final lines, 
        // we intercept the global discount here and apply it directly to the pre-built arrays!
        if (this.modalSavedData) {
            let globalDiscount = Number(this.modalSavedData.discount) || 0;

            if (globalDiscount > 0) {
                // 1. Force the discount onto the Apex Database Lines
                if (this.modalSavedData._Final_Apex_Lines && this.modalSavedData._Final_Apex_Lines.length > 0) {
                    this.modalSavedData._Final_Apex_Lines.forEach(line => {
                        if (!line.discount || line.discount === 0) {
                            // Only apply discount to items that have a price (skip Freight/Insurance)
                            let lPrice = Number(line.unitListPrice) || Number(line.unitPrice) || 0;
                            if (lPrice > 0) {
                                line.discount = globalDiscount;
                                line.unitListPrice = lPrice;
                                line.unitPrice = lPrice * (1 - (globalDiscount / 100)); // Calculate Net Price
                            }
                        }
                    });
                }

                // 2. Force the discount onto the UI Table Rows
                if (this.modalSavedData._Saved_Table_Rows && this.modalSavedData._Saved_Table_Rows.length > 0) {
                    this.modalSavedData._Saved_Table_Rows.forEach(row => {
                        if (!row.discount || row.discount === 0) {
                            let lPrice = Number(row.listPrice) || Number(row.unitListPrice) || Number(row.unitPrice) || Number(row.netPrice) || 0;
                            if (lPrice > 0) {
                                row.discount = globalDiscount;
                                let netPrice = lPrice * (1 - (globalDiscount / 100)); // Calculate Net Price
                                row.listPrice = lPrice;
                                row.unitListPrice = lPrice;
                                row.netPrice = netPrice;
                                row.unitPrice = netPrice;
                            }
                        }
                    });
                }
            }
        }

        // 1. If they haven't opened the modal yet, just use an empty array!
        let pendingItems = (this.modalSavedData._pendingLineItems || []).filter(line => {
            const n = (line.itemName || line.name || '').trim().toLowerCase();
            return !n.startsWith('accessory:')
                && !n.startsWith('misc:')
                && !n.startsWith('addl misc:');
        });

        const adjRules = this._cachedAdjustmentRules || [];
        const newRules = this._cachedNewItemRules || [];

        let finalApexLines = [];
        let uiChildRows = [];

        // 2. Adjust existing items (If they used the modal)
        pendingItems.forEach((line, index) => {
            let currentPrice = line._baseUnitPrice !== undefined ? line._baseUnitPrice : line.unitPrice;
            let currentCost = line._baseUnitCost !== undefined ? line._baseUnitCost : line.unitCost;
            let finalListPrice = (line.listPrice && line.listPrice > 0) ? line.listPrice : currentPrice;

            console.log(`Final List Price`, finalListPrice);

            // 👉 THE MISSING LINE: We must define currentName before we can check it!
            let currentName = line.itemName || line.name || 'N/A';

            let calculatedDiscount = 0;

            // 👉 Prefer the discount value entered directly against the line (e.g. hdg_discount /
            // galv_discount, captured via isDiscount) over deriving it from list vs. net price.
            const enteredDiscountAmount = Number(line.discount) || 0;
            if (enteredDiscountAmount > 0) {
                calculatedDiscount = enteredDiscountAmount;
                console.log(`Using entered discount amount for Line ${index + 1}:`, calculatedDiscount);
            } else {
                // Formula: ((List - Net) / List) * 100
                let rawDiscount = ((finalListPrice - currentPrice) / finalListPrice) * 100;
                console.log(`Raw discount for Line ${index + 1}:`, rawDiscount);
                calculatedDiscount = Math.round(rawDiscount * 100) / 100;
            }

            if ((calculatedDiscount === 0 || isNaN(calculatedDiscount)) && this.modalSavedData && this.modalSavedData.discount !== undefined && this.modalSavedData.discount !== '') {
                calculatedDiscount = Number(this.modalSavedData.discount);
            }
            let matchedWord = null;

            // let currentMargin = Number(line.margin) || 0;

            // If the margin is showing as 0, but we have a valid Cost and Price, deduce the margin!
            /* if (currentMargin === 0 && currentCost > 0 && currentPrice > 0) {
                 // Formula: Margin % = (1 - (Cost / Price)) * 100
                 let rawMargin = (1 - (currentCost / currentPrice)) * 100;
                 
                 // Round to nearest whole number to ensure 2.999% cleanly becomes 3%
                 currentMargin = Math.round(rawMargin); 
             }*/
            const hasExplicitMargin =
                Object.prototype.hasOwnProperty.call(line, 'margin') &&
                line.margin !== null &&
                line.margin !== undefined &&
                String(line.margin).trim() !== '';

            let currentMargin = hasExplicitMargin
                ? (Number(line.margin) || 0)
                : 0;

            if (!hasExplicitMargin && currentCost > 0 && currentPrice > 0) {
                let rawMargin = (1 - (currentCost / currentPrice)) * 100;
                currentMargin = Math.round(rawMargin);
            }




            adjRules.forEach(rule => {
                // 👉 UPGRADED: Smart Array Targeter
                if (rule.targetItemNameIncludes) {
                    // Convert to array (handles both single Strings and Arrays from JSON seamlessly)
                    const targetWords = Array.isArray(rule.targetItemNameIncludes)
                        ? rule.targetItemNameIncludes
                        : [rule.targetItemNameIncludes];

                    // Check if the current row name includes ANY of the target words
                    const isMatch = targetWords.some(word =>
                        currentName.toLowerCase().includes(String(word).toLowerCase())
                    );

                    matchedWord = targetWords.find(word =>
                        currentName.toLowerCase().includes(String(word).toLowerCase())
                    );



                    if (!isMatch) return; // Safely skips if none of the words matched!
                }
                //Abhishek saxena
                if (rule.targetItemNameIncludes) {
                    const targetWords = Array.isArray(rule.targetItemNameIncludes) ? rule.targetItemNameIncludes : [rule.targetItemNameIncludes];
                    const isMatch = targetWords.some(word => currentName.toLowerCase().includes(String(word).toLowerCase()));
                    if (!isMatch) return;
                }
                //End
                const savedValue = this.modalSavedData[rule.conditionField];


                if (String(savedValue) === String(rule.conditionValue)) {
                    const charge = Number(this.modalSavedData[rule.chargeField]) || 0;

                    if (charge !== 0) {
                        let gstValue = rule.applyGST ? (Number(this.currentPricingRates?.GST__c) || 1) : 1;
                        let rawAdjustment = charge * gstValue;
                        console.log(`Raw adjustment for line ${index + 1}:`, rawAdjustment);
                        // 👉 NEW: resolve weight — prefer line.weight, else pull from the grid via item index
                        if (rule.multiplyByWeight) {
                            let lineWeight = Number(line.weight) || 0;

                            if (lineWeight <= 0 && rule.weightFieldByTarget && matchedWord) {
                                const itemMatch = currentName.match(/\(Item\s*(\d+)\)/i);
                                const itemIndex = itemMatch ? itemMatch[1] : null;
                                const fieldSuffix = rule.weightFieldByTarget[matchedWord];

                                if (itemIndex && fieldSuffix) {
                                    const weightKey = `${rule.weightFieldPrefix || 'c'}${itemIndex}_${fieldSuffix}`;
                                    lineWeight = Number(this.modalSavedData[weightKey]) || 0;
                                }
                            }

                            if (lineWeight > 0) {
                                console.log(`Applying weight multiplier for line ${index + 1}: ${lineWeight}`);
                                rawAdjustment = rawAdjustment * lineWeight;
                            }
                        }

                        if (rule.divideByQuantity) rawAdjustment = rawAdjustment / (Number(line.quantity) || 1);


                        const adjustment = Math.round(rawAdjustment * 1000) / 1000;
                        if (adjustment > 0) {
                            const fieldsToAdjust = rule.applyTo || ['unitPrice', 'unitCost'];
                            if (fieldsToAdjust.includes('unitPrice')) currentPrice = Math.round((currentPrice + adjustment) * 1000) / 1000;
                            if (fieldsToAdjust.includes('unitCost')) currentCost = Math.round((currentCost + adjustment) * 1000) / 1000;
                        }
                    }
                }
            });
            if (this.isDomesticOrExport) {
                // The Smart Naming Trick: Combine specs for the Database Name
                let descriptiveName = currentName;
                if (line.designation && line.designation !== '') {
                    descriptiveName = `${line.designation} | ${line.size_nb} | ${line.standard_spec_grade} | ${line.pipe_class}`;
                }

                // Apex Payload (No custom fields needed!)
                finalApexLines.push({
                    name: descriptiveName,
                    weight: line.weight || 0,
                    quantity: line.quantity || 1,
                    realization: line.realization || 0,
                    unitPrice: currentPrice,
                    unitCost: currentCost,
                    unitListPrice: finalListPrice,
                    expenses: line.expenses || 0,
                    discount: calculatedDiscount,
                    margin: currentMargin,
                    added_up: line.added_up || '',
                    tolerance: line.tolerance || ''
                });

                // HTML Screen Payload
                uiChildRows.push({
                    id: `temp_${index}`,
                    name: descriptiveName,
                    billable: false,
                    quantity: line.quantity || 1,
                    uom: line.uom || 'EA',
                    realization: line.realization || '',
                    unitCost: currentCost, unitPrice: currentPrice,
                    unitListPrice: finalListPrice,
                    discount: calculatedDiscount,
                    expenses: line.expenses || 0,
                    netPrice: currentPrice,
                    listPrice: finalListPrice,
                    cost: currentCost,
                    margin: currentMargin,
                    added_up: line.added_up || '',
                    tolerance: line.tolerance || '',
                    startDate: '',
                    endDate: '',
                    weeks: 0,

                    // 👉 Here is your JSON data! This automatically saves into the database's JSON blob.
                    designation: line.designation || '',
                    size_nb: line.size_nb || '',
                    pipe_class: line.pipe_class || '',
                    standard_spec_grade: line.standard_spec_grade || '',
                    end_finish: line.end_finish || '',
                    rate: line.rate || 0,
                    gst: line.gst || 0,
                    price_per_uom: line.price_per_uom || 0,
                    total_price: line.total_price || 0,
                    special_description_header: line.special_description_header || '',
                    special_description: line.special_description || '',
                    shape: line.shape || '',
                    reflect_in_offer_doc: line.reflect_in_offer_doc || 'Yes',

                    // Export Fields
                    od: line.od || 0,
                    wall_thickness: line.wall_thickness || 0,
                    grade: line.grade || '',
                    pipe_length: line.pipe_length || 0,
                    total_pieces: line.total_pieces || 0,
                    kg_per_meter: line.kg_per_meter || 0,
                    total_meters: line.total_meters || 0,
                    total_weight: line.total_weight || 0,
                    price_input_type: line.price_input_type || '',
                    currency_code: line.currency_code || 'USD',
                    price_fc: line.price_fc || 0,
                    total_fob_fc: line.total_fob_fc || 0,
                    total_fob_inr: line.total_fob_inr || 0,
                    freight_type: line.freight_type || ''
                });
            }

            else {
                // THIS IS FOR APEX 
                finalApexLines.push({
                    name: currentName,
                    weight: line.weight || 0,
                    quantity: line.quantity || 1,
                    realization: line.realization || '',
                    unitPrice: currentPrice,
                    unitCost: currentCost,
                    unitListPrice: finalListPrice,
                    expenses: line.expenses || 0,
                    discount: calculatedDiscount,
                    margin: currentMargin,
                    added_up: line.added_up || '',
                    tolerance: line.tolerance || '',
                    _SolarCustomApproval: line._SolarCustomApproval
                });

                // THIS IS FOR THE SCREEN
                uiChildRows.push({
                    id: `temp_${index}`,
                    name: currentName,
                    billable: false,
                    quantity: line.quantity || 1,
                    uom: 'EA',
                    realization: line.realization || '',
                    unitCost: currentCost,
                    unitPrice: currentPrice,
                    unitListPrice: finalListPrice,
                    discount: calculatedDiscount,
                    expenses: line.expenses || 0,
                    netPrice: currentPrice,
                    listPrice: finalListPrice,
                    cost: currentCost,
                    margin: currentMargin,
                    added_up: line.added_up || '',
                    tolerance: line.tolerance || '',
                    startDate: '',
                    endDate: '',
                    weeks: 0,
                    _SolarCustomApproval: line._SolarCustomApproval
                });
            }
        });

        // 3. Generate Brand New Items (e.g., Lump Sum Freight)
        let startingExtraId = uiChildRows.length;

        newRules.forEach((rule, ruleIdx) => {
            const savedValue = this.modalSavedData[rule.conditionField];
            // 👉 ADD DIAGNOSTIC LOGS:
            console.log(`\n🔍 Evaluating New Item Rule ${ruleIdx + 1}/${newRules.length}:`);
            console.log(`   conditionField: "${rule.conditionField}"`);
            console.log(`   savedValue: "${savedValue}" (type: ${typeof savedValue})`);
            console.log(`   conditionValue: "${rule.conditionValue}"`);
            console.log(`   chargeField: "${rule.chargeField}"`);
            console.log(`   charge: ${Number(this.modalSavedData[rule.chargeField]) || 0}`);

            const isMatch = (rule.conditionValue === '*')
                ? (savedValue !== undefined && savedValue !== null && savedValue !== '' && savedValue !== 0)
                : (String(savedValue) === String(rule.conditionValue));

            console.log(`   Match result: ${isMatch}`);
            // If the user picked "Lump Sum", trigger this!
            if (isMatch) {
                const charge = Number(this.modalSavedData[rule.chargeField]) || 0;

                if (charge > 0) {
                    let gstValue = rule.applyGST ? (Number(this.currentPricingRates?.GST__c) || 1) : 1;
                    const totalCharge = Math.round(charge * gstValue * 1000) / 1000;

                    let newUnitPrice = 0, newUnitCost = 0, newExpenses = 0;
                    const applyTo = rule.applyTo || ['expenses', 'unitPrice', 'unitCost'];

                    if (applyTo.includes('unitPrice')) newUnitPrice = totalCharge;
                    if (applyTo.includes('unitCost')) newUnitCost = totalCharge;
                    if (applyTo.includes('expenses')) newExpenses = totalCharge;

                    const newName = rule.itemName || 'Additional Charge';

                    // 👉 FIX: Make Transit Insurance a printable Line Item
                    let finalUom = 'EA';
                    if (newName.includes('Transit Insurance')) {
                        newUnitPrice = totalCharge;
                        newUnitCost = totalCharge;
                        newExpenses = 0;
                        finalUom = 'Lump Sum'; // Bypasses the VF hide rule
                    }

                    const newItemListPrice = newUnitPrice;

                    // SEND THIS TO APEX
                    finalApexLines.push({
                        name: newName,
                        weight: 0,
                        quantity: 1,
                        unitPrice: newUnitPrice,
                        unitCost: newUnitCost,
                        unitListPrice: newItemListPrice,
                        expenses: newExpenses
                    });

                    // SHOW THIS ON THE SCREEN
                    uiChildRows.push({
                        id: `temp_extra_${startingExtraId + ruleIdx}`,
                        name: newName,
                        billable: false,
                        quantity: 1,
                        uom: 'EA',
                        unitCost: newUnitCost,
                        unitPrice: newUnitPrice,
                        unitListPrice: newUnitPrice,
                        expenses: newExpenses,
                        discount: 0,
                        netPrice: newUnitPrice,
                        listPrice: newItemListPrice,
                        cost: newUnitCost,
                        margin: 0,
                        startDate: '',
                        endDate: '',
                        weeks: 0,
                        // 👉 ADDED FIELDS TO PREVENT BLANK COLUMNS IN STEEL PIPES UI
                        designation: newName,
                        size_nb: 'NA',
                        pipe_class: 'NA',
                        standard_spec_grade: 'NA',
                        end_finish: 'NA',
                        rate: totalCharge,
                        gst: rule.applyGST ? Number((totalCharge * ((Number(this.currentPricingRates?.GST__c) || 18) / 100)).toFixed(2)) : 0,
                        price_per_uom: totalCharge,
                        total_price: totalCharge
                    });
                }
            }
        });


        // =======================================================
        // 👉 CRASH BARRIER: ACC, MISC & ADD-MISC EXTRACTOR
        // Prevents duplicates by strictly separating API keys
        // =======================================================

        if (this.selectedPicklistValue === 'Crash Barrier - Department') {

            // Helper function to handle math and pushing arrays cleanly
            const pushCrashBarrierItem = (name, qty, rate, uom, rowIdPrefix) => {
                const calculatedUnitPrice = rate;
                const calculatedUnitListPrice = rate;
                const calculatedUnitCost = rate > 0 ? Math.max(0, rate * 0.8) : 0; // Example: 80% cost factor

                const calculatedNetPrice = calculatedUnitPrice * qty;
                const calculatedListPrice = calculatedUnitListPrice * qty;
                const calculatedTotalCost = calculatedUnitCost * qty;

                // Push to Salesforce Data Array
                finalApexLines.push({
                    quoteId: this.recordId,
                    name: name,
                    sectionName: name,
                    billable: false,
                    quantity: qty,
                    unitPrice: calculatedUnitPrice,
                    unitCost: calculatedUnitCost,
                    unitListPrice: calculatedUnitListPrice,
                    expenses: 0
                });

                // Push to Visual UI Array
                uiChildRows.push({
                    id: `temp_${rowIdPrefix}_${Date.now()}`,
                    name: name,
                    billable: false,
                    quantity: qty,
                    uom: uom,
                    unitPrice: calculatedUnitPrice,
                    unitListPrice: calculatedUnitListPrice,
                    unitCost: calculatedUnitCost,
                    netPrice: calculatedNetPrice,
                    listPrice: calculatedListPrice,
                    cost: calculatedTotalCost,
                    discount: 0,
                    margin: calculatedNetPrice > 0 ? ((calculatedNetPrice - calculatedTotalCost) / calculatedNetPrice) * 100 : 0,
                    expenses: 0,
                    startDate: '',
                    endDate: '',
                    weeks: 0
                });
            };

            // ---------------------------------------------------
            // 1. PROCESS ACCESSORIES
            // ---------------------------------------------------
            const accSuffixes = ['', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
            accSuffixes.forEach((suffix, index) => {
                const accName = this.modalSavedData[`acc_section_accessories_input${suffix}`];
                if (accName && String(accName).trim() !== '') {
                    const rate = Number(this.modalSavedData[`acc_section_rate_input${suffix}`]) || 0;
                    const qty = Number(this.modalSavedData[`acc_section_quantity_no_input${suffix}`]) || 1;
                    const uom = this.modalSavedData[`acc_section_uom_input${suffix}`] || 'EA';
                    const remark = this.modalSavedData[`acc_section_remark_input${suffix}`];

                    const displayName = remark ? `Accessory: ${accName} (${remark})` : `Accessory: ${accName}`;
                    pushCrashBarrierItem(displayName, qty, rate, uom, `cb_acc_${index}`);
                }
            });

            // ---------------------------------------------------
            // 2. PROCESS MISCELLANEOUS DETAILS
            // ---------------------------------------------------
            const miscSuffixes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
            miscSuffixes.forEach((suffix, index) => {
                // 👉 THE FIX: Changed to "desc_input" to match your JSON perfectly!
                const miscName = this.modalSavedData[`misc_section_desc_input${suffix}`];

                if (miscName && String(miscName).trim() !== '') {
                    const rate = Number(this.modalSavedData[`misc_section_rate_input${suffix}`]) || 0;
                    // 👉 THE FIX: Changed to "quantityNo_input" to match your JSON!
                    const qty = Number(this.modalSavedData[`misc_section_quantityNo_input${suffix}`]) || 1;
                    const uom = this.modalSavedData[`misc_section_uom_input${suffix}`] || 'EA';
                    const remark = this.modalSavedData[`misc_section_remark_input${suffix}`];

                    const displayName = remark ? `Misc: ${miscName} (${remark})` : `Misc: ${miscName}`;
                    pushCrashBarrierItem(displayName, qty, rate, uom, `cb_misc_${index}`);
                }
            });

            // ---------------------------------------------------
            // 3. PROCESS ADDITIONAL MISCELLANEOUS
            // ---------------------------------------------------
            const addMiscSuffixes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
            addMiscSuffixes.forEach((suffix, index) => {
                const addMiscName = this.modalSavedData[`add_misc_desc_${suffix}`];
                if (addMiscName && String(addMiscName).trim() !== '') {
                    const rate = Number(this.modalSavedData[`add_misc_rate_${suffix}`]) || 0;
                    const qty = Number(this.modalSavedData[`add_misc_qty_${suffix}`]) || 1;
                    const uom = this.modalSavedData[`add_misc_unit_${suffix}`] || 'EA';

                    const displayName = `Add Misc: ${addMiscName}`;
                    pushCrashBarrierItem(displayName, qty, rate, uom, `cb_addmisc_${index}`);
                }
            });
        }


        // =======================================================
        // 👉 UPGRADED: ACCESSORIES & MISC GRID EXTRACTOR
        // Now includes full CPQ Math (Net Price, List Price, Cost)
        // =======================================================

        // 1. Process Accessories Grid 



        // ── HDPE PIPE ACCESSORIES EXTRACTOR ──────────────────────────────
        // Reads rows 1-10 from the Accessories_Details_HDPE modal.
        // Fields per row:  item_name_input{N}, product_category_input{N},
        //   acc_PE_Grade_select_input{N}, acc_Pressure_rating_select_input{N},
        //   acc_Diameter_Size_input{N}, uom_input{N}, quantity_input{N}, rate_input{N}
        // ─────────────────────────────────────────────────────────────────
        const hdpeAccRows = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        hdpeAccRows.forEach((n, index) => {
            const itemName = this.modalSavedData[`item_name_input${n}`];
            if (!itemName || String(itemName).trim() === '') return; // skip empty rows

            const productCategory = this.modalSavedData[`product_category_input${n}`] || '';
            const peGrade = this.modalSavedData[`acc_PE_Grade_select_input${n}`] || '';
            const pressureRating = this.modalSavedData[`acc_Pressure_rating_select_input${n}`] || '';
            const diameterSize = this.modalSavedData[`acc_Diameter_Size_input${n}`] || '';
            const uom = this.modalSavedData[`uom_input${n}`] || 'EA';
            const quantity = Number(this.modalSavedData[`quantity_input${n}`]) || 1;
            const rate = Number(this.modalSavedData[`rate_input${n}`]) || 0;

            // Build a descriptive name that includes all spec info
            // e.g. "Accessory: Coupler | PLB Duct | PE 63 | PN 2 | 90mm"
            const specParts = [peGrade, pressureRating, diameterSize]
                .filter(v => v && v.trim() !== '')
                .join(' | ');
            const displayName = specParts
                ? `Accessory: ${itemName} | ${productCategory} | ${specParts}`
                : `Accessory: ${itemName} | ${productCategory}`;

            // CPQ math — same pattern as crash barrier accessories
            const calculatedUnitPrice = rate;
            const calculatedUnitListPrice = rate;
            const calculatedUnitCost = rate > 0 ? Math.max(0, rate - 2) : 0;
            const calculatedNetPrice = calculatedUnitPrice * quantity;
            const calculatedListPrice = calculatedUnitListPrice * quantity;
            const calculatedTotalCost = calculatedUnitCost * quantity;

            finalApexLines.push({
                quoteId: this.recordId,
                name: displayName,
                sectionName: displayName,
                billable: false,
                quantity: quantity,
                unitPrice: calculatedUnitPrice,
                unitCost: calculatedUnitCost,
                unitListPrice: calculatedUnitListPrice,
                expenses: 0
            });

            uiChildRows.push({
                id: `temp_hdpe_acc_${n}`,
                name: displayName,
                billable: false,
                quantity: quantity,
                uom: uom,
                unitPrice: calculatedUnitPrice,
                unitListPrice: calculatedUnitListPrice,
                unitCost: calculatedUnitCost,
                netPrice: calculatedNetPrice,
                listPrice: calculatedListPrice,
                cost: calculatedTotalCost,
                discount: 0,
                margin: 0,
                expenses: 0,
                startDate: '',
                endDate: '',
                weeks: 0
            });
        });
        // ── END HDPE PIPE ACCESSORIES EXTRACTOR ──────────────────────────



        // 2. Process Miscellaneous Grid 


        let totalFreight = 0;

        // 1. Sum up the freight from all configured structures using the saved memory
        for (let i = 1; i <= 10; i++) {
            totalFreight += Number(this.modalSavedData[`c${i}_hdg_freight`]) || 0;
            totalFreight += Number(this.modalSavedData[`c${i}_galv_freight`]) || 0;
        }

        // 2. If freight exists, push a brand-new line item!
        if (totalFreight > 0) {
            let freightName = 'Freight & Transportation Charges';

            // Add to Apex save payload
            finalApexLines.push({
                Name: freightName,
                billable: false,
                quantity: 1,
                unitPrice: totalFreight,
                unitCost: totalFreight,
                unitListPrice: totalFreight,
                expenses: totalFreight // Tracking freight as an expense
            });

            // Add to UI screen array
            uiChildRows.push({
                id: 'auto_freight_line_' + Date.now(),
                name: freightName,
                billable: false,
                quantity: 1,
                uom: 'Lot',
                unitPrice: totalFreight,
                unitListPrice: totalFreight,
                unitCost: totalFreight,
                netPrice: totalFreight,
                listPrice: totalFreight,
                cost: totalFreight,
                discount: 0,
                margin: 0,
                expenses: totalFreight,
                startDate: '',
                endDate: '',
                weeks: 0
            });
        }


        // 4. Save the finalized arrays!
        this.modalSavedData._Final_Apex_Lines = finalApexLines;

        let parentRow = this.rows.find(r => r.id === this.quoteId);
        this.rows = parentRow ? [parentRow, ...uiChildRows] : uiChildRows;

        this.modalSavedData._Saved_Table_Rows = this.rows;

        this._hmTagLines();   // [hm-cross] carry the product key onto the Apex lines and grid rows
    }


    handleApprovalMessageChange(event) {
        this.approvalMessage = event.target.value;
    }



    // Toggles the new popover open and closed
    toggleSubmitPopover(event) {
        // Prevent the hover logic from glitching if clicked rapidly
        if (event) event.stopPropagation();

        this.approvalQuoteId = this.quoteId;
        this.isSubmitPopoverOpen = !this.isSubmitPopoverOpen;

        // Clear old messages when opening
        if (this.isSubmitPopoverOpen) {
            this.approvalMessage = '';
        }
    }

    // Captures the text typed into the textarea
    /* handleApprovalMessageChange(event) {
         this.approvalMessage = event.target.value;
     }*/

    // Triggered when they click the light blue SUBMIT button inside the popover
    confirmSubmitForApproval() {

        if (this.isSubmitDisabled) {
            this.showToast('Required', 'Please enter a submit message.', 'error');
            return;
        }
        
        // 1. Close the popover
        this.isSubmitPopoverOpen = false;

        // 2. Trigger the next step (Due Date Selection)
        this.isAwaitingDueDate = true;
        this.Loading = true;

        this.showToast('Info', 'Message captured. Please select a Due Date.', 'info');
        this.Loading = false;
    }
    handleDueDateChange(event) {
        this.approvalDueDate = event.target.value;
    }
    // 3. Triggered by the final "Submit" button next to the Date Picker
    async finalSubmitForApproval() {
        if (!this.approvalDueDate) {
            this.showToast('Error', 'Please select an Approval Due Date.', 'error');
            return;
        }

        const selectedDate = new Date(this.approvalDueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            this.showToast('Error', 'Approval Due Date cannot be in the past.', 'error');
            return;
        }

        this.Loading = true;
        // Same masked chain as APPLY. Deepanjan (7th August 2026)
        this.isApplying = true;
        this._setApplyStep('Finding the approver...', 15);

        try {
            // 1. Build the payload Apex actually needs: it does per-item product-name
            // matching (rule.Product__c vs item name) AND per-item metric evaluation.
            // A flat {Discount, Margin, NetPrice} object has no product name on it at all,
            // so Apex was defaulting itemName to 'ALL' and any rule with a specific
            // Product Category (e.g. 'Railway') could never match.
            const rowsForApproval = (this.rows && this.rows.length > 0) ? this.rows : [];

            const approvalPayload = {
                ...(this.modalSavedData || {}),          // <-- carries every d1_* field, incl. d1_bp_ms_gi_added_up
                _Dynamic_Product_Name: (this.modalSavedData && this.modalSavedData._Dynamic_Product_Name) || 'ALL',
                _Saved_Table_Rows: rowsForApproval        // override with the freshest rows
            };
            this._hmApprovalPayload(approvalPayload);   // [hm-cross] the other products' approval_* keys ride along

            // Keep maxMetrics for backward compatibility / fallback root-level check
            let maxMetrics = { Discount: 0, Margin: 0, NetPrice: 0, Realization: 0 };
            rowsForApproval.forEach(row => {
                if ((Number(row.discount) || 0) > maxMetrics.Discount) maxMetrics.Discount = Number(row.discount);
                if ((Number(row.margin) || 0) > maxMetrics.Margin) maxMetrics.Margin = Number(row.margin);
                if ((Number(row.netPrice) || 0) > maxMetrics.NetPrice) maxMetrics.NetPrice = Number(row.netPrice);

                if ((Number(row.realization) || 0) > maxMetrics.Realization) maxMetrics.Realization = Number(row.realization);
            });
            Object.assign(approvalPayload, maxMetrics);
            this._hmRootMetrics(approvalPayload, rowsForApproval, maxMetrics);   // [hm-cross] 2+ products: the root's figures are its own product's

            // 2. Call Apex with the EXACT parameters it expects now
            const approverTarget = await determineApprover({
                department: this.selectedPicklistValue,
                itemsJson: JSON.stringify(approvalPayload) // Sending the full JSON object
            });

            // 2b. Record which lines (and which metric) the approval rules matched, so the
            //     estimator can outline that field for the reviewer. Same payload as
            //     determineApprover; routing above is untouched. Never blocks submission.
            //     Deepanjan (20th September 2026)
            let approvalTriggersJson = null;
            try {
                const raw = await determineApprovalTriggers({
                    department: this.selectedPicklistValue,
                    itemsJson: JSON.stringify(approvalPayload)
                });
                if (raw) { const parsed = JSON.parse(raw); if (parsed && Array.isArray(parsed.items)) approvalTriggersJson = raw; }
            } catch (trigErr) {
                console.warn('Approval triggers not recorded:', trigErr);
            }

            // 3. Map the inputs to standard Quote fields
            const fields = {
                Id: this.approvalQuoteId,
                Description: this.approvalMessage,
                // ExpirationDate is NO LONGER written here. It used to carry the
                // approval due date, which overwrote the expiration date the user had
                // set on screen - so the list's Expiry column showed the due date on
                // submitted quotes and nothing at all on drafts. The due date has its
                // own Approval_Due_Date__c below; ExpirationDate now belongs solely to
                // the user's expiration date, written on APPLY.
                // Deepanjan (12th August 2026)
                Status: 'In Review',
                // Who to send the approve/reject answer back to.
                // Deepanjan (6th August 2026)
                Approval_Submitted_By__c: USER_ID,
                // The date the quote was actually SENT for approval. This was never
                // stamped here before - submition_date__c was only written by
                // approve / reject / escalate, so the submission date was lost.
                submition_date__c: new Date().toISOString(),
                // Dedicated home for the due date. Anything that needs the approval
                // deadline reads this field; ExpirationDate is the user's expiration
                // date and is no longer touched here. Deepanjan (12th August 2026)
                Approval_Due_Date__c: this.approvalDueDate,
                // Which lines/metric triggered it - overwritten on every submit, kept after decision.
                Approval_Triggers__c: approvalTriggersJson
            };

            // 4. SAFEGUARD: Only append if it's a valid Salesforce User ID
            if (approverTarget && (approverTarget.startsWith('005') || approverTarget.startsWith('00G'))) {
                fields.Pending_Approver__c = approverTarget;
            } else {
                // 👉 THIS WILL PRINT THE EXACT REASON IT FAILED IN YOUR BROWSER CONSOLE!
                console.warn('⚠️ No valid approver ID found from Metadata. Apex Returned:', approverTarget);
                this.showToast('Warning', 'No valid approver found. Quote submitted without routing.', 'warning');
            }

            this._setApplyStep('Submitting quote...', 50);
            await updateRecord({ fields: fields });

            if (fields.Pending_Approver__c) {
                this._setApplyStep('Notifying approver...', 78);
                await this.notifyApproval(this.approvalQuoteId, fields.Pending_Approver__c, 'SUBMITTED');
            }

            this.showToast('Success', 'Quote successfully submitted for approval!', 'success');
            this.isAwaitingDueDate = false;
            this.approvalMessage = '';
            this.approvalDueDate = null;
            this._setApplyStep('Refreshing quotes...', 92);
            await this.refreshQuotes();

            this._setApplyStep('Done', 100);
            await new Promise(resolve => setTimeout(resolve, 250));

        } catch (error) {
            console.error('Approval Submission Error:', error);
            this.showToast('Error', 'Failed to submit quote for approval.', 'error');
        } finally {
            this.Loading = false;
            this.isApplying = false;
            this.applyProgress = 0;
        }
    }
    handleSelfApprove() {
        // Guard: if escalation is required and this user is not the target, block
        if (this.escalationRequired && this.escalationTargetId && this.escalationTargetId !== USER_ID) {
            this.showToast('Action Required', 'This quote must be escalated before it can be approved.', 'warning');
            return;
        }
        this.Loading = true;
        const submitterId = this.activeQuoteSubmitter;
        const approvedQuoteId = this.quoteId;
        const fields = {
            Id: this.quoteId,
            Status: 'Approved',
            approved_by__c: USER_ID,
            submition_date__c: new Date().toISOString()
        };

        this.isApplying = true;
        this._setApplyStep('Approving quote...', 20);
        this._runApprovalChain([
            ['Capturing offer total...', 55, () => captureOfferTotal({
                quoteId: this.quoteId,
                opportunityId: this.recordId
            }).catch(err => {
                // Capture must never fail the approval itself.
                console.error('Offer capture failed', JSON.stringify(err));
            })],
            ['Notifying submitter...', 80, () => this.notifyApproval(approvedQuoteId, submitterId, 'APPROVED')],
            ['Refreshing quotes...', 92, () => this.refreshQuotes()]
        ], () => updateRecord({ fields }), 'Quote approved successfully!', 'Approval failed.');
    }

    handleApproverHoverEnter() {
        // If the mouse comes back, cancel the closing timer!
        clearTimeout(this._hoverTimer);
        this.isApproverHovered = true;
    }

    // Triggered when mouse leaves
    handleApproverHoverLeave() {
        // Don't close immediately. Wait 300 milliseconds first.
        this._hoverTimer = setTimeout(() => {
            this.isApproverHovered = false;
            this.isHoverDropdownExpanded = false; // Auto-close the accordion
        }, 300); // 300ms is the sweet spot for UI hover delays
    }

    toggleHoverDropdown(event) {
        event.stopPropagation();
        this.isHoverDropdownExpanded = !this.isHoverDropdownExpanded;
    }

    handleReopenForEdit(event) {
        // Prevent the hover popup from acting weird when clicked
        if (event) {
            event.stopPropagation();
        }

        this.Loading = true;

        // ═══ QUOTE REVISION - Deepanjan (19th July 2026) ═══════════════════
        // Approved/Rejected -> a NEW revision record is created via Apex and the
        // UI switches to it; the old quote is never touched again (its history
        // survives). Linear chain: a quote that already has a revision is
        // blocked. A quote still in Draft keeps the old unlock path below.
        const __rq = this.opportunityQuotes.find(q => q && q.Id === this.quoteId);
        if (__rq && (__rq.Status === 'Approved' || __rq.Status === 'Rejected')) {
            if (this.currentQuoteHasRevision) {
                this.Loading = false;
                this.showToast('Already Revised',
                    'This quote already has a newer revision. Open the latest revision to make changes.', 'warning');
                return;
            }
            createRevision({ quoteId: this.quoteId })
                .then(newId => {
                    // Same JSON is already on screen; only the target record changes,
                    // so every save from here on lands on the new revision.
                    this.quoteId = newId;
                    this.isReadOnlyMode = false;
                    this.showDocumentGenerator = false;
                    this.isQuoteSaved = false;
                    this.showToast('Revision Created',
                        'A new revision has been created. You are now editing it; the previous version is preserved.', 'success');
                    this.refreshQuotes();
                })
                .catch(error => {
                    const msg = (error && error.body && error.body.message)
                        ? error.body.message : 'Failed to create the revision.';
                    this.showToast('Error', msg, 'error');
                    console.error('createRevision error:', JSON.stringify(error));
                })
                .finally(() => { this.Loading = false; });
            return;
        }
        // ═══ end revision branch - Draft quotes continue on the old path ═══

        // 1. Prepare fields to update in Salesforce
        const fields = {
            Id: this.quoteId,
            Status: 'Draft' // Per your request, moves it back to In Review
        };

        // QUOTE VERSIONING: the revision number bumps ONLY on the
        // Approved/Rejected -> Draft transition. A quote that is already in Draft
        // (reopened earlier, edited, saved, never resubmitted) reopens again WITHOUT
        // a bump - the Status field itself is the guard, no extra flag needed.
        // Approve / Reject / Reopen all happen through this LWC's buttons only, so
        // this is the single place the transition can occur. Reetabrata (17th July 2026)
        const __curQuote = this.opportunityQuotes.find(q => q && q.Id === this.quoteId);
        if (__curQuote && (__curQuote.Status === 'Approved' || __curQuote.Status === 'Rejected')) {
            fields.Revision_No__c = (Number(__curQuote.Revision_No__c) || 0) + 1;
        }

        // 2. Save to database
        updateRecord({ fields })
            .then(() => {
                this.showToast('Success', 'Quote re-opened for editing!', 'success');

                // 👉 3. INSTANT UI UNLOCK
                // This instantly re-enables all fields in your HTML sidebar
                this.isReadOnlyMode = false;

                // Hide the document generator since the quote is no longer finalized
                this.showDocumentGenerator = false;

                this.isQuoteSaved = false;

                // 4. Update the local data so the UI switches away from the "Approved" state
                const activeQuote = this.opportunityQuotes.find(q => q && q.Id === this.quoteId);
                if (activeQuote) {
                    activeQuote.Status = 'Draft';
                    this.opportunityQuotes = [...this.opportunityQuotes]; // Force screen redraw
                }

                // 5. Fetch fresh data in the background
                this.refreshQuotes();
            })
            .catch(error => {
                this.showToast('Error', 'Failed to re-open quote.', 'error');
                console.error('Re-open error:', error);
            })
            .finally(() => {
                this.Loading = false;
            });
    }
    // Handles the hover color change for the Re-Open button
    handleButtonHover(event) {
        if (!event.target.disabled) {
            event.target.style.backgroundColor = '#f3f3f3';
        }
    }

    // Reverts the color when the mouse leaves
    handleButtonOut(event) {
        if (!event.target.disabled) {
            event.target.style.backgroundColor = 'white';
        }
    }
    // Show 'Generate Offer Document' in the saved-but-not-yet-approved state too,
    // alongside Self Approve. The existing post-approval button is untouched, so the
    // old flow continues after approval. Reetabrata (13th July 2026)
    get showGenerateOfferButtonPreApproval() {   // Reetabrata (13th July 2026)
        // Only when a quote is actually saved and NOT yet approved. After approval the
        // original {isQuoteApproved} button takes over (unchanged).
        return this.isQuoteSaved && !this.isQuoteApproved;
    }

    get showCostSheetButton() {   // Reetabrata (13th July 2026)
        // Only when a quote is actually saved and NOT yet approved. After approval the
        // original {isQuoteApproved} button takes over (unchanged).
        // [hm-cross] not on a 2+ product / compact High Mast quote: the cost sheet reads the
        // saved JSON as one plain product and would print product 1 only (or nothing).
        return this.isQuoteSaved && !(this._hmMulti() || this._hmStoredCompact);   // [hm-stadium] a Stadium with 2+ lifts keeps its cost sheet
    }
    get hmCostSheetNote() { return (this._hmMulti() || this._hmStoredCompact) && this.isQuoteSaved; }   // [hm-cross] [hm-stadium] 2+ products / compact only

    // ═════════════════════════════════════════════════════════════════════════
    // HIGH MAST CROSS PRODUCT - Deepanjan (27th September 2026)   [hm-cross]
    // See the note on hmProducts at the top of the class.
    // ═════════════════════════════════════════════════════════════════════════
    _hmOn() { return this.selectedPicklistValue === 'High Mast - Department'; }
    _hmMulti() { return this._hmOn() && Array.isArray(this.hmProducts) && this.hmProducts.length > 1; }
    _hmActiveKey() { const p = Array.isArray(this.hmProducts) ? this.hmProducts[this.hmActive] : null; return p ? p.key : null; }
    _hmNewKey() { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36); }

    // ── which keys are the product's and which are the quote's ──────────────
    // Read from the loaded metadata, never from a list: the accordion that carries
    // the product root picklist (lowest sequence, no controlling field - type_of_mast
    // in High Mast) and every root-less accordion (KIT, Mid Hinge accessories) are
    // the PRODUCT; any other accordion with its own root picklist (Project Set-up:
    // freight_incoterms) is the QUOTE, with every field its Section Logic and its
    // folder modals (address, terms & conditions) declare. Cached per wrapperData.
    _hmKeys() {
        const wd = this.wrapperData;
        if (this._hmKeyCache && this._hmKeyCache.wd === wd) return this._hmKeyCache;
        const secs = (wd && Array.isArray(wd.sections)) ? wd.sections : [];
        const rules = (wd && Array.isArray(wd.logicRules)) ? wd.logicRules : [];
        let root = null;
        secs.forEach(sec => {
            if (!sec.First_Field_API_Name__c || sec.Controlling_Field__c) return;
            if (!root || Number(sec.Sequence_No__c) < Number(root.Sequence_No__c)) root = sec;
        });
        const shared = new Set();
        const walk = (fields) => (Array.isArray(fields) ? fields : []).forEach(f => {
            if (!f) return;
            if (f.apiName) shared.add(f.apiName);
            if (f.fields) walk(f.fields);
            if (f.modalConfigsByValue) Object.keys(f.modalConfigsByValue).forEach(k => {
                const cfg = f.modalConfigsByValue[k];
                (cfg && Array.isArray(cfg.modalFields) ? cfg.modalFields : []).forEach(ms => walk(ms && ms.fields));
            });
        });
        secs.forEach(sec => {
            if (!sec.First_Field_API_Name__c || (root && sec.Id === root.Id)) return;
            shared.add(sec.First_Field_API_Name__c);
            rules.filter(r => r.Accordion_Section__c === sec.Id && r.JSON_Payload__c).forEach(r => {
                try { walk(JSON.parse(r.JSON_Payload__c).fields); } catch (e) { /* not a folder payload */ }
            });
        });
        this._hmKeyCache = { wd, rootApi: root ? root.First_Field_API_Name__c : 'type_of_mast', rootSecId: root ? root.Id : null, shared };
        return this._hmKeyCache;
    }

    // modalSavedData -> { shared, internal, values }. A __cleared / __manual flag
    // follows the field it belongs to.
    _hmSplit(mem) {
        const keys = this._hmKeys();
        const out = { shared: {}, internal: {}, values: {} };
        Object.keys(mem || {}).forEach(k => {
            const v = mem[k];
            if (k === '_Dynamic_Product_Name') { out.values[k] = v; return; }   // the product the last folder belonged to - one per product
            if (k.charAt(0) === '_') { if (!/^_HM_(Products|Shared|V|T|Lines)$/.test(k)) out.internal[k] = v; return; }
            const base = k.replace(/__(cleared|manual)$/, '');
            if (keys.shared.has(base)) out.shared[k] = v; else out.values[k] = v;
        });
        return out;
    }

    // Product label from its own values: "Standard Mast / Lighting Mast",
    // "Segment Above 5 / Lighting Mast", "Octagonal Pole / Mid Hinge Pole", "Latching Mast".
    _hmLabelOf(values) {
        const keys = this._hmKeys();
        const v = values || {};
        const type = v[keys.rootApi];
        if (!type) return '';
        let sub = '';
        // the sub-type picklists of this type's sub-config (mast_standard, mast_customized,
        // mast_standard_pole, seg5_mast_type), parsed once per type - this runs on every render
        if (!this._hmSubPicks) this._hmSubPicks = {};
        const ck = `${keys.rootSecId}_${type}`;
        if (!(ck in this._hmSubPicks)) {
            let picks = [];
            const cfgStr = keys.rootSecId ? (this.jsonLogicCache[ck] || this.jsonLogicCache[`${keys.rootSecId}_*`]) : null;
            if (cfgStr) {
                try { picks = (JSON.parse(cfgStr).fields || []).filter(f => f && f.type === 'picklist' && f.apiName).map(f => f.apiName); }
                catch (e) { picks = []; }
            }
            this._hmSubPicks[ck] = picks;
        }
        const pick = this._hmSubPicks[ck].find(api => v[api] !== undefined && v[api] !== null && String(v[api]) !== '');
        if (pick) sub = String(v[pick]);
        return sub ? `${type} / ${sub}` : String(type);
    }
    _hmProductLabels() {
        return (this.hmProducts || []).map((p, i) => this._hmLabelOf(i === this.hmActive ? this.modalSavedData : p.values));
    }
    _hmQuoteName() {
        const short = this._hmProductLabels().map(l => { const i = l.indexOf(' / '); return i >= 0 ? l.slice(i + 3) : l; });
        let name = `${this.selectedPicklistValue} / ${short.join(' + ')}`;
        if (name.length > 255) name = name.slice(0, 252) + '...';
        return name;
    }

    // LOSSLESS compaction. A key whose value is '' or null is taken out of `values`
    // and its NAME is written into `blank` / `nulls` instead, packed by row: the ten
    // r1_..r10_ (c1_.., kit_line_1_..) copies of one blank field become a single
    // "3,4,5,...:r~_lm_height_of_mast;r~_lm_quantity" entry. _hmExpand() (and the Apex
    // hmProductMaps) put every one of them back with the same value, so a restored
    // product has exactly the keys it was saved with - nothing is dropped, only
    // written shorter. A key with an unusual character is simply kept as it is.
    _hmCompact(values) {
        const v = values || {};
        const out = { values: {}, blank: [], nulls: [] };
        Object.keys(v).forEach(k => {
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
        keys.forEach(k => {
            const m = /^(r|c|kit_line_)(\d+)_(.+)$/.exec(k);
            if (m) {
                const t = `${m[1]}~_${m[3]}`;
                if (!groups.has(t)) groups.set(t, []);
                groups.get(t).push(m[2]);
            } else {
                plain.push(k);
            }
        });
        const byNums = new Map();
        groups.forEach((nums, t) => {
            const key = nums.join(',');
            if (!byNums.has(key)) byNums.set(key, []);
            byNums.get(key).push(t);
        });
        const parts = [];
        byNums.forEach((ts, nums) => parts.push(`${nums}:${ts.join(';')}`));
        return [...parts, ...plain].join('|');
    }
    _hmUnpackKeys(packed) {
        const outKeys = [];
        String(packed || '').split('|').forEach(e => {
            if (!e) return;
            const i = e.indexOf(':');
            if (i < 0) { outKeys.push(e); return; }
            const nums = e.slice(0, i).split(',');
            e.slice(i + 1).split(';').forEach(t => nums.forEach(n => { if (t && n) outKeys.push(t.replace('~', n)); }));
        });
        return outKeys;
    }
    // saved product record (or product 1's root keys + its record) -> the full key set
    _hmExpand(values, rec) {
        const out = { ...(values || {}) };
        // a packed name is put back only where the key is absent - a value that is really
        // there (e.g. the root edited after it was packed) always wins over the packed list
        const has = k => Object.prototype.hasOwnProperty.call(out, k);
        this._hmUnpackKeys(rec && rec.blank).forEach(k => { if (!has(k)) out[k] = ''; });
        this._hmUnpackKeys(rec && rec.nulls).forEach(k => { if (!has(k)) out[k] = null; });
        return out;
    }

    // ── buckets ──────────────────────────────────────────────────────────────
    // Called by handleCreateClick once the configuration is loaded and before the
    // accordion is built from memory. Old flat JSON -> one bucket, memory untouched.
    _hmInitFromMemory() {
        this.hmRemoveIdx = -1;
        this._hmToastPrefix = '';
        this._hmSubPicks = null;
        if (!this._hmOn()) { this.hmProducts = null; this.hmActive = 0; this._hmStoredCompact = false; return; }
        let mem = this.modalSavedData || {};
        // a compact (_HM_V = 2) JSON not yet read back (viewQuote already does it) -> plain shape
        const plain = this._hmDecodeStored(mem);
        if (plain !== mem) {
            mem = plain;
            this.modalSavedData = plain;
            if (Array.isArray(plain._Saved_Table_Rows)) this.rows = plain._Saved_Table_Rows;
        }
        this._hmStoredCompact = !!(mem && mem.__hmCompact);   // read back from the compact shape (one product or more)
        const saved = Array.isArray(mem._HM_Products) ? mem._HM_Products.filter(p => p && typeof p === 'object') : [];
        if (saved.length > 1) {
            const { shared, internal, values } = this._hmSplit(mem);   // product 1 is the root itself
            this.hmProducts = saved.map((p, i) => ({
                key: p.key || ('p' + (i + 1)),
                values: this._hmExpand(i === 0 ? values : p.values, p),      // every packed '' / null key back
                applied: {}, rates: null
            }));
            this.hmActive = 0;
            this.modalSavedData = { ...shared, ...internal, ...this.hmProducts[0].values };
            this._appliedModalConfigs = {};
        } else {
            this.hmProducts = [{ key: 'p1', values: {}, applied: this._appliedModalConfigs || {}, rates: this.currentPricingRates || null }];
            this.hmActive = 0;
            if (['_HM_Products', '_HM_Shared', '_HM_V', '_HM_T', '_HM_Lines'].some(k => mem[k] !== undefined)) {
                const c = { ...mem };
                delete c._HM_Products; delete c._HM_Shared; delete c._HM_V; delete c._HM_T; delete c._HM_Lines;
                this.modalSavedData = c;
            }
        }
    }

    // Park the product on screen in its bucket. The same scrape APPLY does first, so a
    // default left untouched on the accordion is not lost while another product is up.
    _hmStash() {
        if (!Array.isArray(this.hmProducts)) return;
        const p = this.hmProducts[this.hmActive];
        if (!p) return;
        (this.accordionSections || []).forEach(sec => (sec.fields || []).forEach(f => {
            if (f && f.type !== 'header' && f.apiName && f.value !== undefined && f.value !== null && f.value !== '') {
                this.modalSavedData[f.apiName] = f.value;
            }
        }));
        p.values = this._hmSplit(this.modalSavedData).values;
        p.applied = this._appliedModalConfigs || {};
        p.rates = this.currentPricingRates || null;
    }

    // Bring a bucket on screen: its keys over the quote-level keys, then the accordion
    // rebuilt from memory exactly as a reopened quote is.
    _hmRestore(idx) {
        const p = Array.isArray(this.hmProducts) ? this.hmProducts[idx] : null;
        if (!p) return;
        const { shared, internal } = this._hmSplit(this.modalSavedData);
        this.hmActive = idx;
        this.hmRemoveIdx = -1;
        this.modalSavedData = { ...shared, ...internal, ...p.values };
        this._appliedModalConfigs = p.applied || {};
        this.currentPricingRates = p.rates || this.currentPricingRates;   // a product with no rates yet keeps the last known ones (GST)
        // the estimator merges savedData over what it remembers from the last open - that
        // memory must not leak one product's keys into the next (see forgetMemory there)
        const modal = this.template.querySelector('c-hm-estimator');
        if (modal && typeof modal.forgetMemory === 'function') modal.forgetMemory();
        try { this._buildQuoteScreen(this.wrapperData); }
        catch (e) { console.error('[hm-cross] screen rebuild failed', e); }
    }

    // ── line items ───────────────────────────────────────────────────────────
    _hmOtherProduct(li) {
        if (!this._hmMulti()) return false;
        return !!li && li._hmKey !== undefined && li._hmKey !== this._hmActiveKey();
    }
    _hmTagPending() {
        if (!this._hmMulti()) return;
        const key = this._hmActiveKey();
        const list = this.modalSavedData && this.modalSavedData._pendingLineItems;
        if (!key || !Array.isArray(list)) return;
        list.forEach(li => { if (li && li._hmKey === undefined) li._hmKey = key; });
    }
    _hmOrderPending() {
        if (!this._hmMulti()) return;
        const list = this.modalSavedData && this.modalSavedData._pendingLineItems;
        if (!Array.isArray(list) || list.length < 2) return;
        const order = new Map(this.hmProducts.map((p, i) => [p.key, i]));
        const rank = li => (li && order.has(li._hmKey)) ? order.get(li._hmKey) : this.hmProducts.length;
        let changed = false;
        const sorted = list.map((li, i) => ({ li, i }))
            .sort((a, b) => (rank(a.li) - rank(b.li)) || (a.i - b.i))
            .map((x, i) => { if (list[i] !== x.li) changed = true; return x.li; });
        if (changed) this.modalSavedData._pendingLineItems = sorted;
    }
    // _Final_Apex_Lines[i] and the grid row for it are built from pending line i in
    // _applyDynamicLineItemAdjustments (one push per pending line, extra rules after);
    // the grid may still carry the parent summary row in front.
    _hmTagLines() {
        if (!this._hmMulti()) return;
        const pending = (this.modalSavedData._pendingLineItems || []).filter(line => {
            const n = (line.itemName || line.name || '').trim().toLowerCase();
            return !n.startsWith('accessory:') && !n.startsWith('misc:') && !n.startsWith('addl misc:');
        });
        const apex = this.modalSavedData._Final_Apex_Lines || [];
        const rows = this.rows || [];
        const off = rows.length - apex.length;
        pending.forEach((li, i) => {
            if (apex[i]) apex[i]._hmKey = li._hmKey;
            if (off >= 0 && rows[i + off]) rows[i + off]._hmKey = li._hmKey;
        });
    }
    // Approval marks for the product on screen: a hit names a line and its ordinal
    // (k-th line with that name across the whole quote), so hits are mapped back to
    // the product that owns that line. Quote-level (root) hits are kept.
    _hmApprovalTriggers() {
        const t = this.approvalTriggers;
        if (!this._hmMulti() || !t || !Array.isArray(t.items)) return t;
        const key = this._hmActiveKey();
        const seen = {};
        const owner = {};
        (this.modalSavedData._Final_Apex_Lines || []).forEach(l => {
            const n = String(l && l.name || '');
            seen[n] = (seen[n] || 0) + 1;
            owner[n + '#' + seen[n]] = l ? l._hmKey : undefined;
        });
        const items = t.items.filter(h => {
            if (!h || h.root) return true;
            const o = owner[String(h.n || '') + '#' + (Number(h.o) || 0)];
            return o === undefined || o === key;
        });
        return { ...t, items };
    }

    // The approval matrix evaluates the quote-level item and every line item. The quote-
    // level item of a one-product quote is that product: all its keys (approval_* - PU
    // Paint realization - included), named by its _Dynamic_Product_Name, with the highest
    // discount / margin / net price / realization of the grid. With 2+ products only the
    // product on screen is that item, so every product is added as one more item, built
    // exactly as its own quote-level item would be if it were alone on the quote: the
    // quote-level keys and its own keys, its _Dynamic_Product_Name, the highest discount /
    // margin / net price / realization of ITS grid rows. The matrix then sees each product
    // as it would alone, and the highest level wins, as today. Nothing is written back;
    // the saved quote is untouched. One-product quotes are not touched at all.
    // (Apex: determineApprover / determineApprovalTriggers read these as ordinary line
    // items - no Apex change.)
    // The root item of the approval payload is named after the product on screen
    // (_Dynamic_Product_Name), so on a 2+ product quote its highest figures come from that
    // product's grid rows and the shared (untagged) rows only - what it would carry alone
    // on the quote. `metrics` names the figures the caller put on the root (the same keys
    // are recomputed, nothing is added). One product: nothing changes.
    _hmRootMetrics(payload, rows, metrics) {
        if (!this._hmMulti() || !payload || !metrics) return;
        const key = this._hmActiveKey();
        const field = { Discount: 'discount', Margin: 'margin', NetPrice: 'netPrice', Realization: 'realization' };
        const names = Object.keys(metrics).filter(m => field[m]);
        names.forEach(m => { payload[m] = 0; });
        (Array.isArray(rows) ? rows : []).forEach(row => {
            if (!row || (row._hmKey !== undefined && row._hmKey !== key)) return;
            names.forEach(m => {
                const v = Number(row[field[m]]) || 0;
                if (v > payload[m]) payload[m] = v;
            });
        });
    }

    // CREATE after a 2+ product quote was on screen (see _startFreshQuote): createQuote
    // keeps the product on screen in memory for the new quote, as it does after a
    // one-product quote; the other products' lines go, the products / documents state is
    // cleared, and the kept lines lose their product tag (one product again).
    _hmFreshQuote() {
        const key = (Array.isArray(this.hmProducts) && this.hmProducts.length > 1) ? this._hmActiveKey() : null;
        this.hmProducts = null;
        this.hmActive = 0;
        this.hmDocs = null;
        this._hmStoredCompact = false;
        const d = this.modalSavedData;
        if (!key || !d) return;
        const mine = x => !x || x._hmKey === undefined || x._hmKey === key;
        const plain = x => { if (x && x._hmKey !== undefined) { const c = { ...x }; delete c._hmKey; return c; } return x; };
        ['_pendingLineItems', '_Final_Apex_Lines', '_Saved_Table_Rows'].forEach(n => {
            if (Array.isArray(d[n])) d[n] = d[n].filter(mine).map(plain);
        });
        if (Array.isArray(this.rows)) this.rows = this.rows.filter(mine).map(plain);
    }

    _hmApprovalPayload(payload) {
        if (!this._hmMulti() || !payload) return payload;
        const shared = this._hmSplit(this.modalSavedData).shared;
        const rows = Array.isArray(this.rows) ? this.rows : [];
        const extra = [];
        this.hmProducts.forEach((p, i) => {
            const v = (i === this.hmActive ? this._hmSplit(this.modalSavedData).values : p.values) || {};
            // a blank value is skipped by the matrix (and an object is never a metric), so
            // only filled scalar keys ride along - the item stays small on a big quote
            const item = {};
            [shared, v].forEach(src => Object.keys(src).forEach(k => {
                const x = src[k];
                if (x === '' || x === null || x === undefined || typeof x === 'object') return;
                item[k] = x;
            }));
            item._hmApproval = true;
            item.name = v._Dynamic_Product_Name || 'ALL';
            const mm = { Discount: 0, Margin: 0, NetPrice: 0, Realization: 0 };
            rows.forEach(row => {
                if (!row || row._hmKey !== p.key) return;
                if ((Number(row.discount) || 0) > mm.Discount) mm.Discount = Number(row.discount);
                if ((Number(row.margin) || 0) > mm.Margin) mm.Margin = Number(row.margin);
                if ((Number(row.netPrice) || 0) > mm.NetPrice) mm.NetPrice = Number(row.netPrice);
                if ((Number(row.realization) || 0) > mm.Realization) mm.Realization = Number(row.realization);
            });
            Object.assign(item, mm);
            extra.push(item);
        });
        payload._Final_Apex_Lines = [...(payload._Final_Apex_Lines || []), ...extra];
        return payload;
    }

    // ── Generate Offer Document on a cross-product quote ─────────────────────
    // The shared c-quote-excel-generator opens the department's mapped pages, which
    // print one product from the plain JSON. A cross-product quote (and a one-product
    // quote stored compact) shows this panel instead: the same
    // mapped documents, served by their CP pages (HMScopeSingleCP ...), with the same
    // rule - Preview any time through the common QuoteOfferPreview viewer (no file
    // reaches the browser), Download only once the quote is Approved / finalized,
    // through the common QuoteOfferOpen page.
    @track hmDocs = null;            // null = loading; [] = none
    hmDocsFile = '';
    hmPreviewUrl = '';
    hmPreviewTitle = '';
    _hmDocsBusy = false;             // [hm-cross] a document-list request is out
    _hmDocsReq = 0;                  // [hm-cross] the latest document-list request
    _hmEscSeq = 0;                   // [hm-cross] the latest approval (escalation) check
    get hmUseCrossDocs() { return this._hmMulti() || this._hmStoredCompact || this._hmStadiumCopies(); }   // 2+ products, a compact one-product quote, or [hm-stadium] a Stadium with 2+ lifts / ladders
    // [hm-stadium] Customized Mast / STADIUM MAST with 2+ Man Riding Lifts or 2+ Ladders With
    // Cage (the same test HMCrossProductController.isCrossProduct makes on the saved quote)
    _hmStadiumCopies() {
        if (!this._hmOn()) return false;   // [hm-cross] High Mast only
        const d = this.modalSavedData || {};
        const on = v => v === true || String(v).trim().toLowerCase() === 'true' || String(v).trim() === '1';   // [hm-cross] a tick saved as 1 counts
        if (String(d.type_of_mast || '').trim().toLowerCase() !== 'customized mast') return false;
        if (String(d.mast_customized || '').trim().toUpperCase() !== 'STADIUM MAST') return false;
        return (on(d.man_riding_lift) && Number(d.man_riding_lift_count) > 1)
            || (on(d.ladder_with_cage) && Number(d.ladder_with_cage_count) > 1);
    }
    get hmDocsLoading() { return this.hmDocs === null; }
    get hmHasDocs() { return Array.isArray(this.hmDocs) && this.hmDocs.length > 0; }
    get hmDocRows() {
        return (this.hmDocs || []).map((d, i) => ({
            key: 'hmdoc' + i, label: d.label, page: d.page, docType: d.docType || 'pdf',
            isPdf: (d.docType || 'pdf') === 'pdf',
            downloadLabel: (d.docType || 'pdf') === 'pdf' ? 'Download PDF' : ((d.docType === 'word') ? 'Download Word' : 'Download Excel')
        }));
    }
    get hmCannotDownload() { return !this.canDownloadOffer; }
    get hmDocsHint() {
        return this.canDownloadOffer ? '' : 'Download is available after approval - preview only for now';
    }
    get hmPreviewOpen() { return !!this.hmPreviewUrl; }
    async _hmLoadDocs() {
        const qid = this.quoteId;   // an answer for a quote no longer on screen is dropped
        const req = ++this._hmDocsReq;   // only the latest request clears the busy flag
        this._hmDocsBusy = true;
        this.hmDocs = null;
        try {
            const r = await getCrossProductDocuments({ quoteId: qid });
            if (qid !== this.quoteId) return;
            this.hmDocs = (r && Array.isArray(r.docs)) ? r.docs : [];
            this.hmDocsFile = (r && r.fileName) || this.quoteNumber || '';
        } catch (e) {
            if (qid !== this.quoteId) return;
            this.hmDocs = [];
            this.showToast('Error', (e && e.body && e.body.message) || 'Could not load the documents.', 'error');
        } finally {
            if (req === this._hmDocsReq) this._hmDocsBusy = false;
        }
    }
    handleHmDocPreview(event) {
        const page = event.currentTarget.dataset.page;
        if (!this.quoteId || !/^[A-Za-z0-9_]+$/.test(page || '')) return;
        this.hmPreviewTitle = event.currentTarget.dataset.label || 'Preview';
        this.hmPreviewUrl = `/apex/QuoteOfferPreview?id=${encodeURIComponent(this.quoteId)}&page=${page}`;
    }
    handleHmDocPreviewClose() { this.hmPreviewUrl = ''; }
    handleHmDocDownload(event) {
        if (!this.canDownloadOffer) {
            this.showToast('Not yet', 'The document can be downloaded once the quote is approved.', 'warning');
            return;
        }
        const ds = event.currentTarget.dataset;
        if (!this.quoteId || !/^[A-Za-z0-9_]+$/.test(ds.page || '')) return;
        const fn = `${this.hmDocsFile || 'Quote'} ${ds.label || ''}`.trim();
        window.open(`/apex/QuoteOfferOpen?id=${encodeURIComponent(this.quoteId)}&page=${ds.page}`
            + `&type=${encodeURIComponent(ds.type || 'pdf')}&fn=${encodeURIComponent(fn)}`, '_blank');
    }

    // ── the product strip ────────────────────────────────────────────────────
    get hmShowStrip() { return this._hmOn() && Array.isArray(this.hmProducts); }
    get hmCanAdd() { return this.hmShowStrip && !this.isReadOnlyMode; }
    get hmProductChips() {
        if (!this.hmShowStrip) return [];
        const many = this.hmProducts.length > 1;
        return this.hmProducts.map((p, i) => {
            const active = i === this.hmActive;
            const label = this._hmLabelOf(active ? this.modalSavedData : p.values);
            return {
                key: p.key, idx: i, no: i + 1,
                label: label || 'Select Type of Mast',
                cls: 'pt-chip hm-chip' + (active ? ' pt-chip-active' : ''),
                isActive: active,
                confirming: this.hmRemoveIdx === i,
                canRemove: !this.isReadOnlyMode && many
            };
        });
    }
    handleHmSelectProduct(event) {
        const idx = Number(event.currentTarget.dataset.idx);
        if (!Array.isArray(this.hmProducts) || isNaN(idx) || idx === this.hmActive || !this.hmProducts[idx]) return;
        this._hmStash();
        this._hmRestore(idx);
    }
    handleHmAddProduct() {
        if (!this.hmCanAdd) return;
        const keys = this._hmKeys();
        if (!this.modalSavedData[keys.rootApi]) {
            this.showToast('Select the current product first', 'Choose the Type of Mast for the product on screen before adding another one.', 'warning');
            return;
        }
        this.isQuoteSaved = false;
        this._hmStash();
        this.hmProducts = [...this.hmProducts, { key: this._hmNewKey(), values: {}, applied: {}, rates: null }];
        this._hmTagPending();                      // lines applied so far belong to the product that was alone until now
        this._hmRestore(this.hmProducts.length - 1);
    }
    handleHmRemoveAsk(event) { this.hmRemoveIdx = Number(event.currentTarget.dataset.idx); }
    handleHmRemoveCancel() { this.hmRemoveIdx = -1; }
    handleHmRemoveConfirm(event) {
        const idx = Number(event.currentTarget.dataset.idx);
        this.hmRemoveIdx = -1;
        if (!Array.isArray(this.hmProducts) || this.hmProducts.length < 2 || !this.hmProducts[idx] || this.isReadOnlyMode) return;
        this.isQuoteSaved = false;
        this._hmStash();
        const gone = this.hmProducts[idx];
        const cur = this.hmProducts[this.hmActive];
        const rest = this.hmProducts.filter((p, i) => i !== idx);
        let pending = (this.modalSavedData._pendingLineItems || []).filter(li => !li || li._hmKey !== gone.key);
        if (rest.length === 1) pending = pending.map(li => { if (li && li._hmKey !== undefined) { const c = { ...li }; delete c._hmKey; return c; } return li; });   // back to the plain single-product shape
        this.modalSavedData._pendingLineItems = pending;
        this.hmProducts = rest;
        const next = rest.indexOf(cur) >= 0 ? rest.indexOf(cur) : Math.max(0, idx - 1);
        this.hmActive = next;
        this._hmRestore(next);
        this._applyDynamicLineItemAdjustments();
    }

    // ── APPLY: every product must pass what the product on screen passes ─────
    // Runs the same validateRequiredFields / KIT check / cross-modal recompute on each
    // product in turn (each is brought on screen for it, so the messages point at
    // real fields), then the original product comes back. On a failure the failing
    // product stays on screen. Plus the cross-product rules: a type on every product,
    // no two products with the same type + sub-type, a line item on every product.
    _hmValidateAllProducts() {
        const origin = this.hmActive;
        const keys = this._hmKeys();
        const labels = this._hmProductLabels();
        const seen = new Set();
        for (let i = 0; i < this.hmProducts.length; i++) {
            const p = this.hmProducts[i];
            const v = i === origin ? this.modalSavedData : p.values;
            const show = () => { if (this.hmActive !== i) { this._hmStash(); this._hmRestore(i); } };
            if (!v[keys.rootApi]) {
                show();
                this.showToast('Validation Error', `Product ${i + 1} has no Type of Mast. Select one or remove the product.`, 'error');
                return false;
            }
            const sig = labels[i].toLowerCase();
            if (seen.has(sig)) {
                show();
                this.showToast('Validation Error', `Product ${i + 1} (${labels[i]}) is the same type as an earlier product. Add its rows to that product instead, or remove this one.`, 'error');
                return false;
            }
            seen.add(sig);
            const hasLine = (this.modalSavedData._pendingLineItems || []).some(li => li && li._hmKey === p.key);
            if (!hasLine) {
                show();
                this.showToast('Validation Error', `Product ${i + 1} (${labels[i]}) has no line item yet. Open its estimator folder, fill it in and Apply.`, 'error');
                return false;
            }
        }
        for (let i = 0; i < this.hmProducts.length; i++) {
            if (this.hmActive !== i) { this._hmStash(); this._hmRestore(i); }
            this._hmToastPrefix = `Product ${i + 1} (${labels[i]}): `;
            let ok = false;
            try { ok = this.validateRequiredFields() && this._validateKitRequiredFinal(); }
            finally { this._hmToastPrefix = ''; }
            if (!ok) return false;
            this._recomputeAllAppliedModals();
        }
        if (this.hmActive !== origin) { this._hmStash(); this._hmRestore(origin); }
        return true;
    }

    // ── save shape ───────────────────────────────────────────────────────────
    // gridRows: Save as Draft passes the grid rows it stores as _Saved_Table_Rows.
    _hmSavePayload(gridRows) {
        if (!this._hmMulti()) return this._hmSingleSavePayload(gridRows);
        this._hmStash();
        const { shared, internal } = this._hmSplit(this.modalSavedData);
        if (Array.isArray(gridRows)) internal._Saved_Table_Rows = gridRows;
        const keys = this._hmKeys();
        // Product 1 stays flat at the root (its '' / null keys packed into _HM_Products[0]);
        // products 2..n carry their own keys under _HM_Products, packed the same way;
        // _HM_Shared names the quote-level keys at the root so the Apex controllers can
        // lift them under each product without knowing the metadata.
        const packed = this.hmProducts.map(p => this._hmCompact(p.values));
        const payload = { ...shared, ...internal, ...packed[0].values };
        payload._HM_Products = this.hmProducts.map((p, i) => {
            const label = this._hmLabelOf(p.values);
            const j = label.indexOf(' / ');
            const rec = { key: p.key, type: p.values[keys.rootApi] || '', sub: j >= 0 ? label.slice(j + 3) : '', label };
            if (i > 0) rec.values = packed[i].values;
            if (packed[i].blank) rec.blank = packed[i].blank;
            if (packed[i].nulls) rec.nulls = packed[i].nulls;
            return rec;
        });
        payload._HM_Shared = Object.keys(shared);
        // Too big for the plain shape (10 rows on several products): the compact shape -
        // the same data, nothing dropped, read back into this plain shape on load.
        const plainLen = JSON.stringify(payload).length;
        if (plainLen <= 120000) return payload;
        const compact = this._hmCompactPayload(shared, internal, this.hmProducts);
        return JSON.stringify(compact).length < plainLen ? compact : payload;
    }

    // One product (or not High Mast): modalSavedData itself, exactly as before - unless the
    // JSON that would be written (APPLY: modalSavedData; Save as Draft: + the template name,
    // the grid rows and the expiration date it adds) is longer than Quote_Value__c holds
    // (131,072), where today's save fails. Only then the same data goes in the compact shape
    // with one product; it reads back exactly like a 2+ product one.
    _hmSingleSavePayload(gridRows) {
        if (!this._hmOn() || !Array.isArray(this.hmProducts) || this.hmProducts.length !== 1) return this.modalSavedData;
        const asWritten = Array.isArray(gridRows)
            ? { ...this.modalSavedData, _Saved_Template_Name: this.selectedPicklistValue, _Saved_Table_Rows: gridRows,
                ...(this.expirationDate ? { _Expiration_Date: this.expirationDate } : {}) }
            : this.modalSavedData;
        if (JSON.stringify(asWritten).length <= 131072) return this.modalSavedData;
        const { shared, internal, values } = this._hmSplit(this.modalSavedData);
        if (Array.isArray(gridRows)) internal._Saved_Table_Rows = gridRows;
        return this._hmCompactPayload(shared, internal, [{ key: this.hmProducts[0].key || 'p1', values }]);
    }

    // ── compact save shape (_HM_V = 2) ───────────────────────────────────────
    // The plain shape repeats every key name for every row and every line
    // (r1_lm_height_of_mast ... r10_lm_height_of_mast, and each line item three times
    // over: _pendingLineItems, _Final_Apex_Lines, _Saved_Table_Rows). Written compact:
    //   root          the quote-level keys and every other internal key, as always
    //   _HM_T         row-key templates shared by all products, front-coded: "12:height"
    //                 = the first 12 characters of the entry before + "height"; a
    //                 template is a row key with ~ for the row number ("r~_lm_height")
    //   _HM_Products  [{ key, type, sub, label, v }] - EVERY product (product 1 too):
    //                 v.p = its other keys exactly as they are,
    //                 v.g = [[ rows, templates, [column, ...] ], ...]: rows "1-10" or
    //                 "1,3,5-7", templates "0-170" or [0, 4, 9] (indexes into _HM_T), a
    //                 column = the rows' values in row order (trailing '' left off) | one
    //                 value for every row | { c: n } = the n-th value list written before
    //   _HM_Lines     { k: key names, s: repeated strings (front-coded),
    //                   p | a | r: { n: line count, g: [[ keys, lines, [column, ...] ], ...],
    //                   x: [[line, anything that is not a key/value line]] } }
    //                 for the three lists; keys / lines like templates above; a column =
    //                 the values | { u: one value for all } | { l: [value, count, ...] }
    //                 runs | { f: [...] } front-coded text | { r: [list, key, offset] } the
    //                 same values as that key of list 0 p / 1 a / 2 r at line + offset;
    //                 a value "~5" = s[5], and a real value starting with ~ is "~~..."
    // _hmDecodeStored() here and hmDecodeV2() in the three CP controllers turn it back into
    // exactly the plain shape the moment the JSON is read, so nothing after that sees any
    // difference - same keys, same values, same line order. Only ever written when the
    // plain shape would not fit comfortably: for 2+ products, or for one product too
    // large for Quote_Value__c (see _hmSingleSavePayload).
    _hmLineKeys() { return [['p', '_pendingLineItems'], ['a', '_Final_Apex_Lines'], ['r', '_Saved_Table_Rows']]; }
    _hmIsPrim(x) { return x === null || ['string', 'number', 'boolean'].includes(typeof x); }
    _hmIsObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }

    // front coding: "k:rest", k = characters shared with the entry before
    _hmFront(list) {
        let prev = '';
        return list.map(x => {
            let k = 0;
            const m = Math.min(prev.length, x.length);
            while (k < m && prev.charCodeAt(k) === x.charCodeAt(k)) k++;
            prev = x;
            return k + ':' + x.substring(k);
        });
    }
    _hmUnfront(list) {
        let prev = '';
        return (Array.isArray(list) ? list : []).map(e => {
            const t = String(e);
            const i = t.indexOf(':');
            const cur = (i > 0 && /^[0-9]{1,9}$/.test(t.substring(0, i)))
                ? prev.substring(0, Math.min(Number(t.substring(0, i)), prev.length)) + t.substring(i + 1)
                : t;
            prev = cur;
            return cur;
        });
    }
    // [0,1,2,3,7] -> "0-3,7"
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
        if (Array.isArray(x)) return x.filter(v => Number.isInteger(v) && v >= 0 && v <= 2147483647);
        const out = [];
        if (x !== null && typeof x === 'object') return out;
        String(x === null || x === undefined ? '' : x).split(',').forEach(part => {
            const m = /^([0-9]{1,9})-([0-9]{1,9})$/.exec(part);
            if (m) { for (let i = Number(m[1]); i <= Number(m[2]) && out.length < 100000; i++) out.push(i); }
            else if (/^[0-9]{1,9}$/.test(part)) out.push(Number(part));
        });
        return out;
    }
    _hmUnpackRows(x) {
        const out = [];
        if (x !== null && typeof x === 'object') return out;
        String(x === null || x === undefined ? '' : x).split(',').forEach(part => {
            const m = /^([0-9]{1,9})-([0-9]{1,9})$/.exec(part);
            if (m) { for (let i = Number(m[1]); i <= Number(m[2]) && out.length < 100000; i++) out.push(String(i)); }
            else if (part) out.push(part);
        });
        return out;
    }

    // list: [{ key, values }] - the products in order
    _hmCompactPayload(shared, internal, list) {
        const keys = this._hmKeys();
        const lineNames = this._hmLineKeys().map(l => l[1]);
        const rest = {};
        Object.keys(internal).forEach(k => { if (!(lineNames.includes(k) && Array.isArray(internal[k]))) rest[k] = internal[k]; });
        const enc = this._hmEncodeValues(list.map(p => p.values));
        const payload = { ...shared, ...rest, _HM_V: 2, _HM_T: enc.T, _HM_Lines: this._hmEncodeLines(internal) };
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
        // row keys r<n>_ / c<n>_ / kit_line_<n>_ are packed by row as before. A key that is
        // a numbered copy of a block - <letters><n>_<rest>, e.g. the Stadium lift copies
        // m2_mrl_... to m10_mrl_... and l2_lwc_... to l10_lwc_... - is packed the same way
        // when <letters>~_<rest> is there for 2+ copies (a lone one stays as it is). The
        // readers need nothing new: they already rebuild any template, "m~_mrl_x" + 7 ->
        // m7_mrl_x, exactly as "r~_x" + 7 -> r7_x. Deepanjan (29th September 2026)
        const plainKey = k => /^[A-Za-z0-9_]+$/.test(k);
        const rowKey = k => (plainKey(k) ? /^(r|c|kit_line_)(\d+)_(.+)$/.exec(k) : null);
        const copyKey = k => (plainKey(k) ? /^([A-Za-z]+)(\d+)_(.+)$/.exec(k) : null);
        const prods = list.map(values => {
            const v = values || {};
            const p = {};
            const byTpl = new Map();
            const copies = new Map();
            Object.keys(v).forEach(k => {
                if (v[k] === undefined || rowKey(k)) return;
                const c = copyKey(k);
                if (c) copies.set(`${c[1]}~_${c[3]}`, (copies.get(`${c[1]}~_${c[3]}`) || 0) + 1);
            });
            Object.keys(v).forEach(k => {
                if (v[k] === undefined) return;
                let m = rowKey(k);
                if (!m) { const c = copyKey(k); if (c && copies.get(`${c[1]}~_${c[3]}`) >= 2) m = c; }
                if (!m) { p[k] = v[k]; return; }
                const t = `${m[1]}~_${m[3]}`;
                if (!byTpl.has(t)) byTpl.set(t, { rows: [], vals: [] });
                byTpl.get(t).rows.push(m[2]);
                byTpl.get(t).vals.push(v[k]);
            });
            const groups = new Map();
            byTpl.forEach((e, t) => {
                if (!tIdx.has(t)) { tIdx.set(t, T.length); T.push(t); }
                const canon = e.rows.every(r => /^(0|[1-9][0-9]{0,8})$/.test(r));
                const rs = canon ? this._hmRanges(e.rows.map(Number)) : e.rows.join(',');
                if (!groups.has(rs)) groups.set(rs, { rs, ts: [], cols: [] });
                groups.get(rs).ts.push(tIdx.get(t));
                groups.get(rs).cols.push(e.vals);
            });
            const o = {};
            if (Object.keys(p).length) o.p = p;
            if (groups.size) {
                o.g = [...groups.values()].map(g => [g.rs, this._hmPackInts(g.ts), g.cols.map(vals => {
                    if (this._hmIsPrim(vals[0]) && vals.every(x => x === vals[0])) return vals[0];
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

    // [v, v, ...] (one per product) -> [values, values, ...]
    _hmDecodeValues(vList, Tf) {
        const T = this._hmUnfront(Tf);
        const groupsOf = enc => (this._hmIsObj(enc) && Array.isArray(enc.g) ? enc.g : [])
            .filter(gr => Array.isArray(gr) && gr.length >= 3 && Array.isArray(gr[2]));
        // every value list in writing order - a { c: n } column repeats the n-th one
        const colList = [];
        vList.forEach(enc => groupsOf(enc).forEach(gr => {
            const ts = this._hmUnpackInts(gr[1]);
            for (let j = 0; j < ts.length && j < gr[2].length; j++) if (Array.isArray(gr[2][j])) colList.push(gr[2][j]);
        }));
        return vList.map(enc => {
            const out = {};
            if (!this._hmIsObj(enc)) return out;
            if (this._hmIsObj(enc.p)) Object.keys(enc.p).forEach(k => { out[k] = enc.p[k]; });
            groupsOf(enc).forEach(gr => {
                const rows = this._hmUnpackRows(gr[0]);
                const ts = this._hmUnpackInts(gr[1]);
                const cols = gr[2];
                for (let j = 0; j < ts.length && j < cols.length; j++) {
                    let c = cols[j];
                    if (this._hmIsObj(c)) {
                        if (!(Number.isInteger(c.c) && c.c >= 0 && c.c < colList.length)) continue;
                        c = colList[c.c];
                    }
                    if (ts[j] >= T.length) continue;
                    const t = T[ts[j]];
                    rows.forEach((n, r) => { out[t.split('~').join(n)] = Array.isArray(c) ? (r < c.length ? c[r] : '') : c; });
                }
            });
            return out;
        });
    }

    _hmEncodeLines(internal) {
        const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
        const lists = this._hmLineKeys().map(([, name]) => (Array.isArray(internal[name]) ? internal[name] : null));
        const K = [];
        const kIdx = new Map();
        const keyOf = k => { if (!kIdx.has(k)) { kIdx.set(k, K.length); K.push(k); } return kIdx.get(k); };
        const enc = lists.map((arr, L) => {
            if (!arr) return null;
            const groups = new Map();
            const raw = [];
            arr.forEach((o, li) => {
                if (!this._hmIsObj(o)) { raw.push([li, o === undefined ? null : o]); return; }
                const ks = Object.keys(o).filter(k => o[k] !== undefined);
                const sig = ks.map(keyOf).join(',');
                if (!groups.has(sig)) groups.set(sig, { keys: ks, idx: [], cols: ks.map(() => []) });
                const g = groups.get(sig);
                g.idx.push(li);
                ks.forEach((k, j) => g.cols[j].push(o[k]));
            });
            const gl = [...groups.values()];
            // each column: the same values as a key of a list written before (or of an
            // earlier column of this group), one value for all, or the values themselves
            gl.forEach(g => {
                g.spec = g.cols.map((vals, j) => {
                    const n = g.idx.length;
                    if (n > 1 && this._hmIsPrim(vals[0])) {
                        for (let Y = 0; Y <= L; Y++) {
                            const ya = lists[Y];
                            if (!ya) continue;
                            for (const off of (Y < L ? [0, 1, -1] : [0])) {
                                const first = ya[g.idx[0] + off];
                                if (!this._hmIsObj(first)) continue;
                                const cand = Y < L ? [g.keys[j], ...Object.keys(first).filter(k => k !== g.keys[j])] : g.keys.slice(0, j);
                                for (const k2 of cand) {
                                    if (!has(first, k2) || first[k2] !== vals[0]) continue;
                                    let ok = true;
                                    for (let r = 1; r < n && ok; r++) {
                                        const yo = ya[g.idx[r] + off];
                                        ok = this._hmIsObj(yo) && has(yo, k2) && yo[k2] === vals[r];
                                    }
                                    if (ok) return { ref: off ? [Y, keyOf(k2), off] : [Y, keyOf(k2)] };
                                }
                            }
                        }
                    }
                    if (n > 1 && this._hmIsPrim(vals[0]) && vals.every(x => x === vals[0])) return { uni: vals[0] };
                    return { arr: vals };
                });
            });
            return { n: arr.length, groups: gl, raw };
        });
        // strings that repeat among the values still written out -> s, as "~index"
        const cnt = new Map();
        const count = x => { if (typeof x === 'string' && x.length >= 4) cnt.set(x, (cnt.get(x) || 0) + 1); };
        enc.forEach(e => e && e.groups.forEach(g => g.spec.forEach(sp => { if (sp.arr) sp.arr.forEach(count); else if ('uni' in sp) count(sp.uni); })));
        const S = [...cnt.keys()].filter(x => cnt.get(x) >= 2).sort();
        const sIdx = new Map(S.map((x, i) => [x, i]));
        const ev = x => (typeof x !== 'string' ? x : sIdx.has(x) ? '~' + sIdx.get(x) : (x.charAt(0) === '~' ? '~' + x : x));
        const out = { k: K, s: this._hmFront(S) };
        enc.forEach((e, L) => {
            if (!e) return;
            const o = {
                n: e.n,
                g: e.groups.map(g => [this._hmPackInts(g.keys.map(k => kIdx.get(k))), this._hmPackInts(g.idx), g.spec.map(sp => {
                    if (sp.ref) return { r: sp.ref };
                    if ('uni' in sp) return { u: ev(sp.uni) };
                    // the shortest of: the values, runs of equal values, front-coded text
                    const cands = [sp.arr.map(ev)];
                    if (sp.arr.every(x => this._hmIsPrim(x))) {
                        const runs = [];
                        for (let i = 0; i < sp.arr.length;) {
                            let j = i;
                            while (j + 1 < sp.arr.length && sp.arr[j + 1] === sp.arr[i]) j++;
                            runs.push(ev(sp.arr[i]), j - i + 1);
                            i = j + 1;
                        }
                        cands.push({ l: runs });
                    }
                    if (sp.arr.every(x => typeof x === 'string')) cands.push({ f: this._hmFront(sp.arr) });
                    return cands.reduce((a, b) => (JSON.stringify(b).length < JSON.stringify(a).length ? b : a));
                })])
            };
            if (e.raw.length) o.x = e.raw;
            out[this._hmLineKeys()[L][0]] = o;
        });
        return out;
    }

    _hmDecodeLines(enc) {
        const out = {};
        if (!this._hmIsObj(enc)) return out;
        const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
        const K = Array.isArray(enc.k) ? enc.k : [];
        const S = this._hmUnfront(enc.s);
        const dv = x => {
            if (typeof x !== 'string' || x.charAt(0) !== '~') return x;
            if (x.charAt(1) === '~') return x.substring(1);
            if (!/^~[0-9]{1,9}$/.test(x)) return x;
            const i = Number(x.substring(1));
            return i < S.length ? S[i] : x;
        };
        const lists = [null, null, null];
        this._hmLineKeys().forEach(([code, name], L) => {
            const e = enc[code];
            if (!this._hmIsObj(e)) return;
            const n = (Number.isInteger(e.n) && e.n > 0 && e.n <= 100000) ? e.n : 0;
            const arr = [];
            for (let i = 0; i < n; i++) arr.push({});
            lists[L] = arr;
            (Array.isArray(e.g) ? e.g : []).forEach(gr => {
                if (!Array.isArray(gr) || gr.length < 3 || !Array.isArray(gr[2])) return;
                const kis = this._hmUnpackInts(gr[0]);
                const lis = this._hmUnpackInts(gr[1]);
                const cols = gr[2];
                for (let j = 0; j < kis.length && j < cols.length; j++) {
                    if (kis[j] >= K.length || typeof K[kis[j]] !== 'string') continue;
                    const key = K[kis[j]];
                    const c = cols[j];
                    let vals = null;
                    let ref = null;
                    if (Array.isArray(c)) vals = c.map(dv);
                    else if (this._hmIsObj(c) && Array.isArray(c.r)) ref = c.r;
                    else if (this._hmIsObj(c) && Array.isArray(c.l)) {
                        vals = [];
                        for (let i = 0; i + 1 < c.l.length && vals.length < lis.length; i += 2) {
                            const cntI = (Number.isInteger(c.l[i + 1]) && c.l[i + 1] > 0) ? c.l[i + 1] : 0;
                            const v = dv(c.l[i]);
                            for (let t = 0; t < cntI && vals.length < lis.length; t++) vals.push(v);
                        }
                    }
                    else if (this._hmIsObj(c) && Array.isArray(c.f)) vals = this._hmUnfront(c.f);
                    else if (this._hmIsObj(c)) { if (!has(c, 'u')) continue; const v = dv(c.u); vals = lis.map(() => v); }
                    else { const v = dv(c); vals = lis.map(() => v); }
                    lis.forEach((li, r) => {
                        if (li >= n) return;
                        const o = arr[li];
                        if (ref) {
                            const Y = ref[0];
                            const k2 = ref[1];
                            const off = Number.isInteger(ref[2]) ? ref[2] : 0;
                            const ya = (Number.isInteger(Y) && Y >= 0 && Y <= 2) ? lists[Y] : null;
                            const yo = ya ? ya[li + off] : undefined;
                            if (this._hmIsObj(yo) && Number.isInteger(k2) && k2 >= 0 && k2 < K.length && typeof K[k2] === 'string' && has(yo, K[k2])) o[key] = yo[K[k2]];
                        } else if (r < vals.length) {
                            o[key] = vals[r];
                        }
                    });
                }
            });
            (Array.isArray(e.x) ? e.x : []).forEach(xr => {
                if (Array.isArray(xr) && xr.length >= 2 && Number.isInteger(xr[0]) && xr[0] >= 0 && xr[0] < n) arr[xr[0]] = xr[1];
            });
            out[name] = arr;
        });
        return out;
    }

    // Saved JSON -> the plain shape. Anything that is not a compact (_HM_V = 2) quote is
    // returned as it is (the same object), so every other quote loads exactly as before.
    _hmDecodeStored(mem) {
        if (!mem || typeof mem !== 'object' || Number(mem._HM_V) !== 2 || !Array.isArray(mem._HM_Products)) return mem;
        const out = {};
        Object.keys(mem).forEach(k => { if (!/^_HM_(Products|Shared|V|T|Lines)$/.test(k)) out[k] = mem[k]; });
        Object.assign(out, this._hmDecodeLines(mem._HM_Lines));
        const vals = this._hmDecodeValues(mem._HM_Products.map(p => (this._hmIsObj(p) ? p.v : undefined)), mem._HM_T);
        out._HM_Products = mem._HM_Products.map((p, i) => {
            if (!this._hmIsObj(p)) return p;
            const rec = { ...p };
            delete rec.v;
            if (i === 0) Object.assign(out, vals[i]);
            else rec.values = vals[i];
            return rec;
        });
        if (mem._HM_Shared !== undefined) out._HM_Shared = mem._HM_Shared;
        Object.defineProperty(out, '__hmCompact', { value: true });   // not enumerable: never saved, never copied
        return out;
    }

    // ─── PRODUCT TYPE SWITCHER (cross product) — Deepanjan (20th September 2026) ──────
    // A cross-product quote carries several product types, but the accordion shows
    // only the type the root picklist is on - and in read-only (review) mode that
    // picklist is disabled, so a reviewer could never reach the other types. This row
    // lists every type that owns at least one line on the quote; clicking one switches
    // the root picklist exactly the way the user would (same handler, same payload
    // swap) and scrolls to the accordion. Shown only in read-only mode and only when
    // the quote holds two or more types. No approval logic, no Apex, no new field;
    // nothing is ever saved from here (Approve/Reject write Status only).
    //
    // SELF-CHECK — the code decides on its own whether a quote gets this row; no
    // department list, no metadata flag. Deepanjan (22nd September 2026)
    //  1. A product type is a value of an accordion's ROOT picklist (First Field). Only
    //     Section Logic rules of that SAME accordion whose Controlling_Value__c is one of
    //     the root's own options are counted - so 'default' (HM ITEMS / KIT Code), '*'
    //     rules, Project Set-up, Accessories and Nuts & Bolts can never become a chip.
    //  2. The quote must really carry lines of 2+ of those types. A department that
    //     allows one product per quote never gets there, so the row never shows.
    //  3. Switching must lose nothing: every type's child payload (the same
    //     jsonLogicCache entry handleFieldValueChange loads) may hold folders only. If a
    //     type has a picklist/input under the root (High Mast: Standard Mast -> Type of
    //     Mast - Standard), switching would blank it, so the row is not shown at all.
    //  The root is the accordion the lines actually belong to (Telecom's product root
    //  sits in accordion 2, after Sales Region), not simply the first root on screen.
    get productTypeChips() {
        const plan = this._ptPlan();
        if (!plan) return [];
        const current = plan.root.f.value || '';
        return plan.types.map(t => ({
            key: t, type: t,
            label: `${t} · ${plan.count[t]}`,
            cls: t === current ? 'pt-chip pt-chip-active' : 'pt-chip'
        }));
    }
    get hasProductTypeChips() { return this.isReadOnlyMode && !this._hmMulti() && this.productTypeChips.length > 0; }   // [hm-cross] 2+ High Mast products: the product strip, not this row

    // Returns { root: { sec, f }, types: [...], count: { type: lines } } or null.
    // Deepanjan (22nd September 2026)
    _ptPlan() {
        const lines = (this.modalSavedData && Array.isArray(this.modalSavedData._pendingLineItems))
            ? this.modalSavedData._pendingLineItems : [];
        if (lines.length === 0) return null;
        let best = null;
        (this.accordionSections || []).forEach(sec => {
            const f = (sec && Array.isArray(sec.fields)) ? sec.fields.find(x => x && x.isFirstField) : null;
            if (!f) return;
            const opts = (Array.isArray(f.options) ? f.options : [])
                .map(o => String(o && o.value !== undefined ? o.value : o).trim())
                .filter(Boolean);
            if (opts.length < 2) return;
            const map = this._ptTitleMap(sec.id, new Set(opts));
            if (map.length === 0) return;
            const count = {};
            lines.forEach(l => {
                const t = this._ptTypeForTitle(l && l._modalSource, map);
                if (t) count[t] = (count[t] || 0) + 1;
            });
            const types = opts.filter(o => count[o]);          // root picklist order
            if (types.length < 2) return;
            if (!types.every(t => this._ptSwitchIsLossless(sec.id, t))) return;
            if (!best || types.length > best.types.length) best = { root: { sec, f }, types, count };
        });
        return best;
    }

    // True when the root value loads folders only, so a switch blanks nothing.
    // Same cache lookup as handleFieldValueChange. Deepanjan (22nd September 2026)
    _ptSwitchIsLossless(secId, value) {
        const json = this.jsonLogicCache[`${secId}_${value}`] || this.jsonLogicCache[`${secId}_*`];
        if (!json) return false;
        let p; try { p = JSON.parse(json); } catch (e) { return false; }
        const fields = (p && Array.isArray(p.fields)) ? p.fields : [];
        return fields.length > 0 && fields.every(x => x && x.type === 'folder');
    }

    handleProductTypeClick(event) {
        const type = event.currentTarget.dataset.type;
        const plan = this._ptPlan();                                    // Deepanjan (22nd September 2026)
        const r = plan ? plan.root : null;                              // the root the chips came from
        if (!type || !r || plan.types.indexOf(type) === -1) return;
        if (r.f.value !== type) {
            const wasSaved = this.isQuoteSaved;
            this.handleFieldValueChange({
                detail: { value: type },
                currentTarget: { dataset: { name: r.f.apiName, section: r.sec.id } }
            });
            if (this.isReadOnlyMode) this.isQuoteSaved = wasSaved;   // that handler clears it; nothing is saved in read-only
        }
        const el = this.template.querySelector('.accordion-wrapper');
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    _ptRootField() {
        for (const sec of (this.accordionSections || [])) {
            const f = (sec.fields || []).find(x => x && x.isFirstField);
            if (f) return { sec, f };
        }
        return null;
    }
    _ptCurrentRootValue() { const r = this._ptRootField(); return r ? (r.f.value || '') : ''; }

    // Modal title -> root picklist value. Every department keeps its product modals in
    // Section Logic records keyed by Controlling_Value__c; a line's _modalSource is that
    // modal's title. Handles both payload shapes handleFolderClick handles (root-level
    // modalFields with a title, and folder.modalConfigsByValue[*].title).
    // secId / opts (optional): only rules of that accordion whose Controlling_Value__c is
    // one of its root options. Deepanjan (22nd September 2026)
    _ptTitleMap(secId, opts) {
        const map = [];
        const rules = (this.wrapperData && Array.isArray(this.wrapperData.logicRules)) ? this.wrapperData.logicRules : [];
        rules.forEach(rule => {
            if (!rule || !rule.JSON_Payload__c || !rule.Controlling_Value__c || rule.Controlling_Value__c === '*') return;
            if (secId !== undefined && rule.Accordion_Section__c !== secId) return;
            if (opts && !opts.has(String(rule.Controlling_Value__c).trim())) return;
            let p; try { p = JSON.parse(rule.JSON_Payload__c); } catch (e) { return; }
            const titles = [];
            if (p && p.modalFields !== undefined && p.title) titles.push(p.title);
            ((p && Array.isArray(p.fields)) ? p.fields : []).forEach(f => {
                if (f && f.modalConfigsByValue) Object.keys(f.modalConfigsByValue).forEach(k => {
                    const c = f.modalConfigsByValue[k]; if (c && c.title) titles.push(c.title);
                });
            });
            titles.forEach(t => map.push({ title: String(t).trim().toUpperCase(), root: String(rule.Controlling_Value__c).trim() }));   // trimmed = the root option value - Deepanjan (22nd September 2026)
        });
        return map;
    }
    _ptTypeForTitle(title, map) {
        const up = String(title || '').trim().toUpperCase();
        if (!up) return null;
        const hit = map.find(m => m.title === up);
        return hit ? hit.root : null;
    }

    // Surface cost-sheet status as a toast. Reetabrata (13th July 2026)
    handleCostSheetToast(event) {   // Reetabrata (13th July 2026)
        const { msg, variant } = event.detail || {};
        this.dispatchEvent(new ShowToastEvent({
            title: variant === 'success' ? 'Cost Sheets' : 'Cost Sheets',
            message: msg,
            variant: variant || 'info'
        }));
    }

    handleToggleExcelGenerator() {
        this.isExcelViewActive = !this.isExcelViewActive;
        if (this.isExcelViewActive && this.hmUseCrossDocs) this._hmLoadDocs();   // [hm-cross]
    }
    // 👉 Catches the custom event from the Child LWC
    handleChildReviewQuote(event) {
        const quoteIdToReview = event.detail.quoteId;

        // We can reuse your existing viewQuote logic by creating a mock event 
        // that matches what viewQuote expects (event.currentTarget.dataset.id)
        const mockEvent = {
            currentTarget: {
                dataset: {
                    id: quoteIdToReview
                }
            }
        };

        // Trigger your existing method to load the quote and switch the UI
        this.viewQuote(mockEvent);
    }

    closeSteelPipeModal() {
        this.isSteelPipeModalOpen = false;
    }

    handleSteelPipeSave(event) {
        const configuredPipes = event.detail.pipes || [];
        const lumpSumVal = event.detail.lumpSumValue || 0;

        // Save back to memory so it re-opens with the same values
        this.modalSavedData = {
            ...this.modalSavedData,
            _configuredPipesDomestic: configuredPipes,
            _showRateInDocDomestic: event.detail.showRateInDoc
        };

        // Format the lines precisely for your central engine
        const lineItems = configuredPipes.map((pipe, idx) => {
            return {
                itemName: `Steel Pipe ${idx + 1}: ${pipe.steel_type} ${pipe.pipe_designation} ${pipe.standard}`,
                weight: pipe.totalWeight,
                quantity: pipe.quantity,
                realization: 0,
                unitPrice: pipe.pricePerUom,
                unitCost: pipe.quotedPrice || 0,
                listPrice: 0,
                steel_type: pipe.steel_type,
                designation: pipe.pipe_designation,
                size_nb: pipe.size_nb,
                pipe_class: pipe.pipe_class,
                standard_spec_grade: pipe.standard,
                end_finish: pipe.end_finish,
                uom: pipe.uom,
                rate: pipe.rateRsMtr,
                gst: pipe.gst,
                price_per_uom: pipe.pricePerUom,
                quoted_price: pipe.quotedPrice || 0,
                total_price: pipe.totalPrice,
                discount: pipe.discount,
                special_description_header: pipe.special_description_header,
                special_description: pipe.special_description,
                shape: pipe.shape,
                reflect_in_offer_doc: pipe.reflectInOfferDocToggle === false ? 'No' : 'Yes'
            };
        });

        // Pass to the master apply engine just like the hardcoded version does
        this.handleModalApply({
            detail: {
                modalConfig: { title: 'DOMESTIC PIPE CONFIGURATION' },
                lineItems: lineItems,
                values: {}
            }
        });

        this.isSteelPipeModalOpen = false;
    }



    /**
     * Maps every populated row in the PEB calculator to a quote line item.
     * This is the PEB equivalent of the Steel-Pipe map() block.
     */


    closeExportSteelPipeModal() {
        this.isExportSteelPipeModalOpen = false;
    }

    openSolarStructureModal() {
        this.isSolarStructureModalOpen = true;
    }

    closeSolarStructureModal() {
        this.isSolarStructureModalOpen = false;
    }

    handleSolarStructureSave(event) {
        const finalData = event.detail; // { Department__c: ..., Unit_Of_Measurement__c: ..., Lines: [] }

        // Save back to memory so it re-opens with the same values
        this.modalSavedData = {
            ...this.modalSavedData,
            _configuredSolarStructure: finalData
        };

        // Format the lines precisely for the central engine
        const lineItems = finalData.Lines.map((line, idx) => {
            return {
                itemName: `Solar Structure ${idx + 1}: ${line.Category__c} - ${line.Material__c}`,
                weight: line.Total_Weight__c,
                quantity: line.Quantity__c,
                realization: 0,
                unitPrice: line.Unit_Price__c,
                unitCost: 0,
                listPrice: 0,
                uom: finalData.Unit_Of_Measurement__c || 'EA',
                price_per_uom: line.Unit_Price__c,
                quoted_price: line.Unit_Price__c,
                total_price: line.Unit_Price__c * line.Quantity__c,
                discount: line.Discount__c || 0,
                special_description: line.Description__c,
                _SolarCustomApproval: line._SolarCustomApproval
            };
        });

        // Pass to the master apply engine just like the hardcoded version does
        this.handleModalApply({
            detail: {
                modalConfig: { title: 'SOLAR STRUCTURE CONFIGURATION' },
                lineItems: lineItems,
                values: {}
            }
        });

        this.isSolarStructureModalOpen = false;
    }

    handleExportSteelPipeSave(event) {
        const configuredPipes = event.detail.pipes || [];

        // Save back to memory so it re-opens with the same values
        this.modalSavedData = { ...this.modalSavedData, _configuredPipesExport: configuredPipes };

        // Format the lines precisely for your central engine
        const lineItems = configuredPipes.map((pipe, idx) => {
            return {
                itemName: `Export Steel Pipe ${idx + 1}: ${pipe.designation} ${pipe.standardSpecGrade}`,
                weight: pipe.totalWeight,
                quantity: pipe.totalPieces,
                realization: 0,
                unitPrice: pipe.pricePerPiece || pipe.pricePerMeter || 0,
                unitCost: 0,
                listPrice: 0,
                designation: pipe.designation,
                standard_spec_grade: pipe.standardSpecGrade,
                manual_standard: pipe.manualStandard,
                grade: pipe.grade,
                size_nb: pipe.sizeNb,

                // 👉 THE FIX: Added && pipe.seriesShape !== 'NA' so it outputs the actual Wall Thickness number
                pipe_class: (pipe.seriesShape !== 'Manual' && pipe.seriesShape !== 'NA') ? pipe.seriesShape : (pipe.wallThickness ? pipe.wallThickness : ''),

                od: pipe.od,
                shape: pipe.seriesShape,
                wall_thickness: pipe.wallThickness,
                schedule: pipe.schedule,
                end_finish: pipe.endFinish,
                pipe_length: pipe.pipeLength,
                total_pieces: pipe.totalPieces,
                kg_per_meter: pipe.kgPerMeter,
                total_meters: pipe.totalMeters,
                total_weight: pipe.totalWeight,
                price_input_type: pipe.priceInputType,
                currency_code: pipe.currencyCode,
                exchange_rate: pipe.exchangeRate,
                price_fc: pipe.priceFc,
                price_per_piece: pipe.pricePerPiece,
                price_per_meter: pipe.pricePerMeter,
                total_fob_fc: pipe.totalFobFc,
                total_fob_inr: pipe.totalFobInr,
                freight_type: pipe.freightType,
                reflect_in_offer_doc: 'Yes',
                rate: pipe.priceFc,
                gst: 0,
                price_per_uom: pipe.pricePerPiece,
                total_price: pipe.totalFobFc
            };
        });

        // Pass to the master apply engine just like the hardcoded version does
        this.handleModalApply({
            detail: {
                modalConfig: { title: 'EXPORT PIPE CONFIGURATION' },
                lineItems: lineItems,
                values: {}
            }
        });

        this.isExportSteelPipeModalOpen = false;
    }
    //escalation
    async checkEscalationForCurrentQuote() {
        const hmSeq = (this._hmEscSeq = (this._hmEscSeq || 0) + 1);   // [hm-cross] only the latest check sets the result
        if (!this.quoteId || !this.isQuoteInReview) {
            this.escalationRequired = false;
            this.escalationTargetId = null;
            return;
        }
        try {
            const rowsForApproval = (this.rows && this.rows.length > 0) ? this.rows : [];
            const approvalPayload = {
                ...(this.modalSavedData || {}),
                _Dynamic_Product_Name: (this.modalSavedData && this.modalSavedData._Dynamic_Product_Name) || 'ALL',
                _Saved_Table_Rows: rowsForApproval
            };
            this._hmApprovalPayload(approvalPayload);   // [hm-cross]
            let maxMetrics = { Discount: 0, Margin: 0, NetPrice: 0 };
            rowsForApproval.forEach(row => {
                if ((Number(row.discount) || 0) > maxMetrics.Discount) maxMetrics.Discount = Number(row.discount);
                if ((Number(row.margin) || 0) > maxMetrics.Margin) maxMetrics.Margin = Number(row.margin);
                if ((Number(row.netPrice) || 0) > maxMetrics.NetPrice) maxMetrics.NetPrice = Number(row.netPrice);
            });
            Object.assign(approvalPayload, maxMetrics);
            this._hmRootMetrics(approvalPayload, rowsForApproval, maxMetrics);   // [hm-cross] 2+ products: the root's figures are its own product's

            const result = await checkEscalationRequired({
                quoteId: this.quoteId,
                department: this.selectedPicklistValue,
                itemsJson: JSON.stringify(approvalPayload)
            });

            if (hmSeq !== this._hmEscSeq) return;   // [hm-cross] a newer check has started meanwhile
            this.escalationRequired = result.required === 'true';
            this.escalationTargetId = result.targetId || null;
        } catch (e) {
            if (hmSeq !== this._hmEscSeq) return;   // [hm-cross] a newer check has started meanwhile
            console.error('Escalation check failed', e);
            this.escalationRequired = false;
            this.escalationTargetId = null;
        }
    }

    // Opens the QFR Modal (Triggered when 'QFR' is selected)
    openPebQFRModal() {
        this.isPebQFRModalOpen = true;
    }

    // Closes the QFR Modal (Mirrors closeSteelPipeModal)
    closePebQFRModal() {
        this.isPebQFRModalOpen = false;
    }

    handlePebQFRSave(event) {
        const qfrData = event.detail;

        if (!qfrData || qfrData.length === 0) {
            this.showToast('Warning', 'No QFR data received.', 'warning');
            return;
        }

        // 1. Save the raw JSON to modalSavedData
        this.modalSavedData = {
            ...this.modalSavedData,
            _pebQFRData: qfrData,
            _Dynamic_Product_Name: 'PEB QFR'
        };

        // 2. Create the Line Item for the Quote
        const lineItem = {
            itemName: 'PEB Quote Request Form (QRF)',
            name: 'PEB Quote Request Form (QRF)',
            quantity: 1,
            unitPrice: 0,
            unitCost: 0,
            listPrice: 0,
            netPrice: 0,
            uom: 'EA',
            _modalSource: 'PEB_QFR_MODULE'
        };

        // 3. Inject into the Central Line Item Engine
        this.handleModalApply({
            detail: {
                modalConfig: { title: 'PEB QFR CONFIGURATION' },
                lineItems: [lineItem],
                values: { _pebQFRData: qfrData },
                isComplete: true,
                parentPushes: {}
            }
        });

        // 4. Close Modal & Notify User
        this.isPebQFRModalOpen = false;
        this.showToast('Success', 'PEB QFR saved and added to Quote!', 'success');
    }
}