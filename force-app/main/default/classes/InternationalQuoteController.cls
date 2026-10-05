/**
 * InternationalQuoteController
 * ---------------------------------------------------------------------------
 * Apex backend for the International Marketing (IM) quote LWC (internationalQuote).
 *
 * Design rule: this class ADDS, it never edits. Every existing behaviour
 * (section config, blueprint payload, rate cards, transmission pricing, quote
 * reference, approval, escalation, total capture) is reached by DELEGATING to
 * the static methods already in CreateQuoteController. CreateQuoteController
 * itself is not modified.
 *
 * Product sections are NOT cloned. Each IM product points at the existing
 * department template (Quote_Template_Config__mdt row with IM_Enabled__c), so the
 * product's Accordion_Section / Section_Logic / Blueprint records are read
 * exactly as they are today. Field names, formulas, rate-card fetch: as-is.
 *
 * Setup footprint (no new metadata types):
 *   Quote_Template_Config__mdt.IM_Enabled__c  Checkbox - tick the departments
 *                                             that are products inside IM
 *   Quote.IM_Currency__c        Picklist       currency list lives in the picklist
 *   (the exchange rate itself lives only in the Quote_Value__c JSON snapshot)
 *   Quote.Final_Quote_Amount__c (existing)     offer total in the QUOTE CURRENCY
 *                                             (INR / rate), written here at save;
 *                                             INR total lives in the JSON snapshot
 *   Price_Calculator__mdt row  Department__c = 'International Marketing'
 *     JSON_Payload__c = {"USD":83.5,"EUR":90.2,...}  admin-maintained default
 *     rates, used ONLY to prefill a NEW quote (same rate-card type as every
 *     department; no new type, no new field)
 *
 * "International Marketing - Department" is deliberately NOT a
 * Quote_Template_Config row: createQuote lists every active row as a template,
 * and IM must never appear there (no cross-department mixing).
 *
 * Deepanjan / MagicWorkshop AI - September 2026
 */
public with sharing class InternationalQuoteController {

    public static final String IM_TEMPLATE_NAME   = 'International Marketing - Department';
    public static final String IM_RATE_CARD_DEPT   = 'International Marketing';    // Price_Calculator__mdt.Department__c
    public static final String IM_RATE_CARD_RECORD = 'International_Marketing';    // Price_Calculator__mdt DeveloperName (for deploy)
    // Custom permission for IM, the twin of the domestic Can_Create_Quote.
    private static final String CREATE_QUOTE_PERMISSION = 'Can_Create_International_Quote';
    // User checkboxes - IM has its own, independent of the domestic ones:
    //   IM_ACCESS_FIELD    shows the tab / component at all
    //   IM_RATES_FIELD     shows the RATES screen (exchange rates)
    //   IM_APPROVALS_FIELD shows the PENDING APPROVALS tab
    private static final String IM_ACCESS_FIELD    = 'Access_for_International_Marketing__c';
    private static final String IM_RATES_FIELD     = 'Access_to_IM_Rate_Manager__c';
    private static final String IM_APPROVALS_FIELD = 'Can_View_IM_Approvals__c';
    private static final String DENIAL_MSG =
        'You do not have permission to create an International Marketing quotation. Please contact your system administrator to get access.';
    private static final String NO_ACCESS_MSG =
        'International Marketing is not enabled for your user. Please contact your system administrator to get access.';

    // =====================================================================
    // 1. BOOTSTRAP - one call when the LWC opens
    // =====================================================================
    public class ProductConfig {
        @AuraEnabled public String  code;            // Template_Code__c (e.g. 6)
        @AuraEnabled public String  label;           // MasterLabel, also the source template
        @AuraEnabled public String  sourceTemplate;
        @AuraEnabled public String  shortLabel;      // "Transmission Tower"
    }

    public class Bootstrap {
        @AuraEnabled public Boolean             canCreate;
        @AuraEnabled public Boolean             canManageRates;   // User.Access_to_IM_Rate_Manager__c
        @AuraEnabled public Boolean             canViewApprovals; // User.Can_View_IM_Approvals__c
        @AuraEnabled public Boolean             hasImAccess;      // User.Access_for_International_Marketing__c - shows the screen at all
        @AuraEnabled public String              denialMessage;
        @AuraEnabled public Boolean             isApprovalActive;
        @AuraEnabled public String              templateName;
        @AuraEnabled public List<ProductConfig> products;
    }

    @AuraEnabled
    public static Bootstrap getBootstrap() {
        Bootstrap b = new Bootstrap();
        b.templateName     = IM_TEMPLATE_NAME;
        b.isApprovalActive = true;                   // default; refined below from the IM-enabled rows
        b.products         = new List<ProductConfig>();
        b.hasImAccess      = userFlag(IM_ACCESS_FIELD);
        b.canCreate        = FeatureManagement.checkPermission(CREATE_QUOTE_PERMISSION);
        b.canManageRates   = canManageRates();
        b.canViewApprovals = userFlag(IM_APPROVALS_FIELD);
        if (!b.hasImAccess) { b.denialMessage = NO_ACCESS_MSG; return b; }
        if (!b.canCreate)   { b.denialMessage = DENIAL_MSG;    return b; }

        // Department gate = EXACTLY createQuote's rule: getActiveTemplates() returns
        // the template labels the running user's Departments__c allows. IM shows the
        // subset of those that are IM_Enabled__c.
        Set<String> allowed = new Set<String>(CreateQuoteController.getActiveTemplates());

        // Approval routing on/off = same approval_active__c flag domestic reads per department;
        // for IM it is taken from its product rows (any product with approval on -> routing on).
        Boolean anyApproval = false;
        for (Quote_Template_Config__mdt t : [
            SELECT MasterLabel, Template_Code__c, approval_active__c
            FROM Quote_Template_Config__mdt
            WHERE Active__c = true AND IM_Enabled__c = true
            ORDER BY Template_Code__c ASC
        ]) {
            if (!allowed.contains(t.MasterLabel)) continue;
            if (t.approval_active__c == true) anyApproval = true;
            ProductConfig pc  = new ProductConfig();
            pc.code           = String.isBlank(t.Template_Code__c) ? t.MasterLabel : t.Template_Code__c;
            pc.label          = t.MasterLabel;
            pc.sourceTemplate = t.MasterLabel;
            pc.shortLabel     = t.MasterLabel.replaceAll('\\s*-\\s*Department\\s*$', '').trim();
            b.products.add(pc);
        }
        b.isApprovalActive = anyApproval;
        return b;
    }

    private static Boolean canManageRates() { return userFlag(IM_RATES_FIELD); }
    private static Boolean userFlag(String field) {
        try {
            SObject u = Database.query('SELECT ' + field + ' FROM User WHERE Id = \'' + UserInfo.getUserId() + '\' LIMIT 1');
            return u.get(field) == true;
        } catch (Exception e) { return false; }
    }

    // =====================================================================
    // 2. PRODUCT SECTIONS - the existing department config, untouched
    //    Called once per product tab. Returns the same ConfigWrapper createQuote
    //    consumes, so rendering + rate fetching work exactly as today.
    // =====================================================================
    private static void assertImAccess() {
        if (!userFlag(IM_ACCESS_FIELD)) throw new AuraHandledException(NO_ACCESS_MSG);
        if (!FeatureManagement.checkPermission(CREATE_QUOTE_PERMISSION)) throw new AuraHandledException(DENIAL_MSG);
    }

    @AuraEnabled
    public static CreateQuoteController.ConfigWrapper getProductConfiguration(String sourceTemplate) {
        assertImAccess();
        if (String.isBlank(sourceTemplate)) {
            throw new AuraHandledException('Source template is required.');
        }
        // Guard: only IM-enabled departments can be loaded through this door.
        List<Quote_Template_Config__mdt> ok = [
            SELECT Id FROM Quote_Template_Config__mdt
            WHERE MasterLabel = :sourceTemplate AND Active__c = true AND IM_Enabled__c = true LIMIT 1
        ];
        if (ok.isEmpty()) {
            throw new AuraHandledException(sourceTemplate + ' is not enabled for International Marketing.');
        }
        if (!new Set<String>(CreateQuoteController.getActiveTemplates()).contains(sourceTemplate)) {
            throw new AuraHandledException('Your user is not assigned to ' + sourceTemplate + ' (Departments).');
        }
        return CreateQuoteController.getDynamicConfiguration(sourceTemplate);
    }

    // =====================================================================
    // 2b. EXCHANGE RATE PREFILL - from the rate card's International Marketing row
    // =====================================================================
    public class RatePrefill {
        @AuraEnabled public Decimal rate;
        @AuraEnabled public String  source;   // 'last' | 'default' | ''
    }

    /** "USD - US Dollar" -> "USD"; "USD" -> "USD". The picklist may carry either. */
    public static String currencyCodeOf(String picklistValue) {
        if (String.isBlank(picklistValue)) return '';
        return picklistValue.split('\\s*-\\s*')[0].trim().toUpperCase();
    }

    @AuraEnabled
    public static RatePrefill getExchangeRatePrefill(String currencyCode) {
        RatePrefill r = new RatePrefill();
        r.source = '';
        if (String.isBlank(currencyCode)) return r;
        String code = currencyCodeOf(currencyCode);       // JSON keys and INR check use the bare code
        if (code == 'INR') { r.rate = 1; r.source = 'inr'; return r; }

        // admin default from the IM row of the rate card (Price_Calculator__mdt);
        // the rate the user finally uses is saved only inside the Quote_Value__c JSON
        try {
            List<Price_Calculator__mdt> card = [
                SELECT JSON_Payload__c FROM Price_Calculator__mdt
                WHERE Department__c = :IM_RATE_CARD_DEPT LIMIT 1
            ];
            if (!card.isEmpty() && String.isNotBlank(card[0].JSON_Payload__c)) {
                Map<String, Object> m = (Map<String, Object>) JSON.deserializeUntyped(card[0].JSON_Payload__c);
                Object v = m.get(code);
                if (v != null) { r.rate = Decimal.valueOf(String.valueOf(v)); r.source = 'default'; }
            }
        } catch (Exception e) { /* malformed JSON -> no prefill, user types the rate */ }
        return r;
    }
    // =====================================================================
    // 2c. RATE MANAGER - read / update the IM rate card row from the LWC
    //     Custom metadata cannot be updated with DML; it is DEPLOYED through the
    //     Metadata API (async, a few seconds). Only rate-manager users may call save.
    // =====================================================================
    public class RateRow { @AuraEnabled public String code; @AuraEnabled public Decimal rate; }

    @AuraEnabled
    public static List<RateRow> getExchangeRates() {
        List<RateRow> out = new List<RateRow>();
        Map<String, Object> m = readRateJson();
        // order = the currency picklist order, so the screen matches the quote dropdown
        for (Schema.PicklistEntry pe : Quote.IM_Currency__c.getDescribe().getPicklistValues()) {
            if (!pe.isActive()) continue;
            RateRow r = new RateRow();
            r.code = currencyCodeOf(pe.getValue());
            Object v = m.get(r.code);
            r.rate = (r.code == 'INR') ? 1 : (v == null ? null : Decimal.valueOf(String.valueOf(v)));
            out.add(r);
        }
        return out;
    }

    private static Map<String, Object> readRateJson() {
        try {
            List<Price_Calculator__mdt> card = [
                SELECT JSON_Payload__c FROM Price_Calculator__mdt WHERE Department__c = :IM_RATE_CARD_DEPT LIMIT 1];
            if (!card.isEmpty() && String.isNotBlank(card[0].JSON_Payload__c)) {
                return (Map<String, Object>) JSON.deserializeUntyped(card[0].JSON_Payload__c);
            }
        } catch (Exception e) {}
        return new Map<String, Object>();
    }

    /** ratesJson = {"USD":83.5,"EUR":90.2,...}. Returns the deployment job Id. */
    @AuraEnabled
    public static String saveExchangeRates(String ratesJson) {
        if (!canManageRates()) throw new AuraHandledException('You do not have International Marketing Rate Manager access.');
        Map<String, Object> m;
        try { m = (Map<String, Object>) JSON.deserializeUntyped(ratesJson); }
        catch (Exception e) { throw new AuraHandledException('Invalid rates payload.'); }
        // normalise: numeric only, INR fixed at 1
        Map<String, Decimal> clean = new Map<String, Decimal>();
        for (String k : m.keySet()) {
            Object v = m.get(k);
            if (v == null || String.valueOf(v) == '') continue;
            clean.put(k.toUpperCase(), k.toUpperCase() == 'INR' ? 1 : Decimal.valueOf(String.valueOf(v)));
        }

        Metadata.CustomMetadata md = new Metadata.CustomMetadata();
        md.fullName = 'Price_Calculator.' + IM_RATE_CARD_RECORD;
        md.label    = IM_RATE_CARD_DEPT;
        Metadata.CustomMetadataValue dept = new Metadata.CustomMetadataValue();
        dept.field = 'Department__c'; dept.value = IM_RATE_CARD_DEPT;
        Metadata.CustomMetadataValue payload = new Metadata.CustomMetadataValue();
        payload.field = 'JSON_Payload__c'; payload.value = JSON.serialize(clean);
        md.values.add(dept); md.values.add(payload);

        Metadata.DeployContainer dc = new Metadata.DeployContainer();
        dc.addMetadata(md);
        Id jobId = Metadata.Operations.enqueueDeployment(dc, null);
        return String.valueOf(jobId);
    }

    // =====================================================================
    // 2d. IM BASE RATE CARDS - International twins of the domestic
    //     Price_Calculator__mdt rows.
    //
    //     Domestic row  : DeveloperName = Crash_Barrier_Conventional, Department__c = "Conventional Type"
    //     IM twin       : DeveloperName = IM_Crash_Barrier_Conventional, Department__c = "IM - Conventional Type"
    //
    //     The domestic rows are NEVER written by anything here. Department__c
    //     stays unique, so the domestic "WHERE Department__c = :name LIMIT 1"
    //     queries can never pick up an IM row. The IM estimators read the twin
    //     first (getImPricingRates / getImRateCardJson below) and fall back to
    //     the domestic row while no twin has been saved, so nothing changes
    //     for a product until the rate manager saves its International card.
    // =====================================================================
    public static final String IM_DEPT_PREFIX = 'IM - ';
    public static final String IM_DEV_PREFIX  = 'IM_';

    /** Twin-first replacement for CreateQuoteController.getPricingRates (same shape, same base+add-on override). */
    @AuraEnabled(cacheable=true)
    public static Price_Calculator__mdt getImPricingRates(String departmentName) {
        if (String.isBlank(departmentName)) return new Price_Calculator__mdt();
        String imName = IM_DEPT_PREFIX + departmentName;
        List<Price_Calculator__mdt> im = [
            SELECT Id, Department__c, Base_Amount__c, Add_On_Amount__c,
                   tp_segment__c, fm_general_detail__c, man_riding_lift__c,
                   GST__c, rateCard__c, JSON_Payload__c
            FROM Price_Calculator__mdt WHERE Department__c = :imName LIMIT 1];
        if (im.isEmpty()) return CreateQuoteController.getPricingRates(departmentName);
        Price_Calculator__mdt calc = im[0];
        Decimal base  = calc.Base_Amount__c  != null ? calc.Base_Amount__c  : 0;
        Decimal addOn = calc.Add_On_Amount__c != null ? calc.Add_On_Amount__c : 0;
        calc.Base_Amount__c = base + addOn;   // same in-memory override the domestic method applies
        return calc;
    }

    /** Twin-first replacement for CreateQuoteController.getRateCardJson. */
    @AuraEnabled(cacheable=true)
    public static String getImRateCardJson(String departmentName) {
        if (String.isBlank(departmentName)) return null;
        String imName = IM_DEPT_PREFIX + departmentName;
        for (Price_Calculator__mdt calc : [SELECT JSON_Payload__c, rateCard__c FROM Price_Calculator__mdt WHERE Department__c = :imName LIMIT 1]) {
            return String.isNotBlank(calc.JSON_Payload__c) ? calc.JSON_Payload__c : calc.rateCard__c;
        }
        return CreateQuoteController.getRateCardJson(departmentName);
    }

    /** Which rows of the rate card have an IM twin - the estimator shows "Rates: International / Domestic" from this. */
    @AuraEnabled(cacheable=true)
    public static List<String> getImRateCardDepartments() {
        List<String> out = new List<String>();
        String pat = IM_DEPT_PREFIX + '%';
        for (Price_Calculator__mdt c : [SELECT Department__c FROM Price_Calculator__mdt WHERE Department__c LIKE :pat]) {
            if (c.Department__c != null && c.Department__c.startsWith(IM_DEPT_PREFIX)) out.add(c.Department__c.substring(IM_DEPT_PREFIX.length()));
        }
        return out;
    }

    /** One rate card as the manager screen needs it: the domestic values (reference) + the IM twin, if saved. */
    public class ImRateCard {
        @AuraEnabled public String  developerName;    // domestic DeveloperName
        @AuraEnabled public String  department;       // domestic Department__c
        @AuraEnabled public String  label;            // domestic MasterLabel
        @AuraEnabled public Boolean imExists;
        @AuraEnabled public String  domesticJson;
        @AuraEnabled public Decimal domesticBase;
        @AuraEnabled public Decimal domesticAddOn;
        @AuraEnabled public String  imJson;
        @AuraEnabled public Decimal imBase;
        @AuraEnabled public Decimal imAddOn;
    }

    @AuraEnabled
    public static ImRateCard getImRateCard(String developerName) {
        if (String.isBlank(developerName)) throw new AuraHandledException('Rate card not specified.');
        List<Price_Calculator__mdt> dom = [
            SELECT DeveloperName, MasterLabel, Department__c, JSON_Payload__c, rateCard__c, Base_Amount__c, Add_On_Amount__c
            FROM Price_Calculator__mdt WHERE DeveloperName = :developerName LIMIT 1];
        if (dom.isEmpty()) throw new AuraHandledException('No domestic Price Calculator record named ' + developerName + '.');
        ImRateCard c = new ImRateCard();
        c.developerName = dom[0].DeveloperName;
        c.department    = dom[0].Department__c;
        c.label         = dom[0].MasterLabel;
        c.domesticJson  = String.isNotBlank(dom[0].JSON_Payload__c) ? dom[0].JSON_Payload__c : dom[0].rateCard__c;
        c.domesticBase  = dom[0].Base_Amount__c;
        c.domesticAddOn = dom[0].Add_On_Amount__c;
        c.imExists = false;
        String imDev = IM_DEV_PREFIX + developerName;
        for (Price_Calculator__mdt im : [
                SELECT JSON_Payload__c, rateCard__c, Base_Amount__c, Add_On_Amount__c
                FROM Price_Calculator__mdt WHERE DeveloperName = :imDev LIMIT 1]) {
            c.imExists = true;
            c.imJson   = String.isNotBlank(im.JSON_Payload__c) ? im.JSON_Payload__c : im.rateCard__c;
            c.imBase   = im.Base_Amount__c;
            c.imAddOn  = im.Add_On_Amount__c;
        }
        return c;
    }

    /**
     * Creates / updates the IM twin of one domestic rate card. jsonString is the
     * [{apiName, defaultValue}] array (null for the flat Base / Add-on cards).
     * Deploys ONLY Price_Calculator.IM_<developerName>; the domestic row is read
     * for its label + department and never written. Returns the deployment job Id.
     */
    @AuraEnabled
    public static String saveImRateCard(String developerName, String jsonString, Decimal baseAmount, Decimal addOn, String departmentName) {
        if (!canManageRates()) throw new AuraHandledException('You do not have International Marketing Rate Manager access.');
        if (String.isBlank(developerName)) throw new AuraHandledException('Rate card not specified.');
        List<Price_Calculator__mdt> dom = [
            SELECT MasterLabel, Department__c FROM Price_Calculator__mdt WHERE DeveloperName = :developerName LIMIT 1];
        if (dom.isEmpty()) throw new AuraHandledException('No domestic Price Calculator record named ' + developerName + '.');
        // the twin is keyed on the domestic row's Department__c; a row that has none yet (the Telecom
        // cards are created by the Quote Rate Card Manager without one) takes the catalogue's name
        String domDept = String.isNotBlank(dom[0].Department__c) ? dom[0].Department__c : departmentName;
        if (String.isBlank(domDept)) throw new AuraHandledException('The domestic record ' + developerName + ' has no Department - set it in Setup first.');
        if (String.isNotBlank(jsonString)) {
            try { JSON.deserializeUntyped(jsonString); }
            catch (Exception e) { throw new AuraHandledException('Invalid rate payload.'); }
        }

        Metadata.CustomMetadata md = new Metadata.CustomMetadata();
        md.fullName = 'Price_Calculator.' + IM_DEV_PREFIX + developerName;
        md.label    = (IM_DEPT_PREFIX + dom[0].MasterLabel).left(40);

        Metadata.CustomMetadataValue dept = new Metadata.CustomMetadataValue();
        dept.field = 'Department__c'; dept.value = IM_DEPT_PREFIX + domDept;
        md.values.add(dept);
        if (jsonString != null) {                       // '' clears, null leaves the field alone
            Metadata.CustomMetadataValue payload = new Metadata.CustomMetadataValue();
            payload.field = 'JSON_Payload__c'; payload.value = jsonString;
            md.values.add(payload);
        }
        if (baseAmount != null) {
            Metadata.CustomMetadataValue b = new Metadata.CustomMetadataValue();
            b.field = 'Base_Amount__c'; b.value = baseAmount;
            md.values.add(b);
        }
        if (addOn != null) {
            Metadata.CustomMetadataValue a = new Metadata.CustomMetadataValue();
            a.field = 'Add_On_Amount__c'; a.value = addOn;
            md.values.add(a);
        }

        Metadata.DeployContainer dc = new Metadata.DeployContainer();
        dc.addMetadata(md);
        if (Test.isRunningTest()) return 'test';
        Id jobId = Metadata.Operations.enqueueDeployment(dc, null);
        return String.valueOf(jobId);
    }

    // Blueprints / transmission pricing / address: the LWC imports these straight
    // from CreateQuoteController (weightEstimatorModal already does):
    //   CreateQuoteController.fetchBlueprintPayload
    //   CreateQuoteController.getTransmissionPricing
    //   CreateQuoteController.getPriceVariationData
    //   CreateQuoteController.getOpportunityAccountAddress
    // getPricingRates / getRateCardJson are wrapped above (IM twin first).

    // =====================================================================
    // 3. QUOTE LIST for the IM tab - only IM quotes of this opportunity
    //    Quote.Name carries the template name (same convention resolveOfferTotal
    //    relies on), so the filter is on Name.
    // =====================================================================
    @AuraEnabled
    public static List<Quote> getImQuotesByOpportunity(Id opportunityId) {
        if (opportunityId == null) return new List<Quote>();
        return [
            SELECT Id, Name, QuoteNumber, Status, Quote_Reference__c, Revision_No__c,
                   Original_Quote__c, Previous_Revision__c, Final_Quote_Amount__c,
                   IM_Currency__c, ExpirationDate, Description, IsSyncing,
                   Pending_Approver__c, Pending_Approver__r.Name,
                   Approval_Submitted_By__c, Approval_Submitted_By__r.Name,
                   approved_by__c, approved_by__r.Name, submition_date__c,
                   Cloned__c, Original_Quote_Number_After_Cloned__c,
                   Approval_Due_Date__c, Rejection_Reason__c,
                   CreatedById, CreatedBy.Name, CreatedDate, LastModifiedDate,
                   Is_Draft__c, Has_Quote_Value__c
            FROM Quote
            WHERE OpportunityId = :opportunityId
              AND Name = :IM_TEMPLATE_NAME
              AND (Has_Quote_Value__c = true OR Is_Draft__c = true)
            ORDER BY CreatedDate DESC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static String getQuoteValueJson(Id quoteId) {
        return CreateQuoteController.getQuoteValueJson(quoteId);
    }

    // =====================================================================
    // 4. SAVE - insert or update the IM quote
    //    quoteValueJson is the full Quote_Value__c document built by the LWC:
    //      _Saved_Template_Name, _IM_Export, _IM_Products, _Final_Apex_Lines
    //    currencyCode is mirrored onto IM_Currency__c so list
    //    views, reports and revisions can read them without parsing JSON. The
    //    JSON snapshot stays the source of truth.
    // =====================================================================
    public class SaveResult {
        @AuraEnabled public Id     quoteId;
        @AuraEnabled public String quoteNumber;
        @AuraEnabled public String quoteReference;
        @AuraEnabled public Boolean isNew;
        @AuraEnabled public Integer lineCount;     // Quote_Line_Item__c rows written on this APPLY
        @AuraEnabled public String  lineWarning;   // set when the quote saved but its line items did not
    }

    @AuraEnabled
    public static SaveResult saveImQuote(Id quoteId, Id opportunityId, String quoteValueJson,
                                         String currencyCode, Decimal finalAmount,
                                         Date expirationDate) {
        assertImAccess();
        if (opportunityId == null && quoteId == null) {
            throw new AuraHandledException('Opportunity Id is required to create a quote.');
        }
        if (String.isBlank(quoteValueJson)) {
            throw new AuraHandledException('Quote payload is empty.');
        }
        // ONE DEPARTMENT PER QUOTE: refuse a payload whose lines span several products
        try {
            Map<String, Object> qvChk = (Map<String, Object>) JSON.deserializeUntyped(quoteValueJson);
            Set<String> depts = new Set<String>();
            if (qvChk.get('_Final_Apex_Lines') instanceof List<Object>) {
                for (Object o : (List<Object>) qvChk.get('_Final_Apex_Lines')) {
                    if (o instanceof Map<String, Object> && ((Map<String, Object>) o).get('product') != null) depts.add(String.valueOf(((Map<String, Object>) o).get('product')));
                }
            }
            if (depts.size() > 1) throw new AuraHandledException('A quote can carry only one department (' + String.join(new List<String>(depts), ' + ') + '). Create a separate International quote for the other department.');
        } catch (AuraHandledException ah) { throw ah; } catch (Exception e) { /* malformed payload is caught below */ }

        SaveResult r = new SaveResult();
        Quote q;
        if (quoteId == null) {
            q = new Quote(
                Name          = IM_TEMPLATE_NAME,
                OpportunityId = opportunityId,
                Status        = 'Draft'
            );
            r.isNew = true;
        } else {
            q = [SELECT Id, Status FROM Quote WHERE Id = :quoteId LIMIT 1];
            // Approved / finalized quotes are edited only through reopen -> revision,
            // exactly as the domestic flow; this guard mirrors that.
            if (q.Status == 'Approved' || q.Status == 'Accepted') {
                throw new AuraHandledException('This quote is ' + q.Status + '. Reopen it to edit.');
            }
            r.isNew = false;
        }

        if (expirationDate == null) {
            throw new AuraHandledException('Expiration Date is required.');
        }
        q.Quote_Value__c     = quoteValueJson;
        q.Has_Quote_Value__c = true;                 // same flag createQuote sets on APPLY; the lists filter on it
        q.Is_Draft__c        = false;                // applied = no longer a draft (domestic parity) - Deepanjan (21 Sep 2026)
        q.IM_Currency__c        = currencyCode;
        q.Final_Quote_Amount__c = finalAmount;       // total in the quote currency, per Deepanjan
        if (expirationDate != null) q.ExpirationDate = expirationDate;
        // Domestic APPLY writes exactly: Name, Quote_Value__c, Has_Quote_Value__c,
        // ExpirationDate. Revision_No__c / Cloned__c / Status are left at their
        // Salesforce defaults on a new quote, so nothing is stamped here either.

        if (r.isNew) insert q; else update q;

        // Quote_Line_Item__c records, replaced on every APPLY exactly like createQuote.
        // generateQuoteLines deletes the old rows first; if the insert then fails, the
        // savepoint puts the old rows back (the quote save above is kept).
        Savepoint linesSp = Database.setSavepoint();
        try {
            Map<String, Object> qv = (Map<String, Object>) JSON.deserializeUntyped(quoteValueJson);
            List<Map<String, Object>> items = new List<Map<String, Object>>();
            if (qv.get('_Final_Apex_Lines') instanceof List<Object>) {
                for (Object o : (List<Object>) qv.get('_Final_Apex_Lines')) {
                    if (!(o instanceof Map<String, Object>)) continue;
                    Map<String, Object> l = (Map<String, Object>) o;
                    // Quote_Line_Item__c.Name holds 80 characters; a longer line name (an MGL
                    // location, a long product description) would fail the whole insert. The
                    // full name stays in _Final_Apex_Lines, which the offer PDF reads.
                    String nm = l.get('name') == null ? '' : String.valueOf(l.get('name'));
                    // the same fields createQuote's generateQuoteLines receives (EXPENSES, UNIT LIST
                    // PRICE, DISCOUNT %, MARGIN were written blank here). Money in the quote currency
                    // like UNIT PRICE; an extra line (CB accessory / misc, HM freight) carries no
                    // margin or discount, as in createQuote. Deepanjan (29th September 2026)
                    Map<String, Object> li = new Map<String, Object>{
                        'name' => nm.abbreviate(80), 'quantity' => toDec(l.get('quantity')),
                        'unitPrice' => toDec(l.get('unitPrice')), 'unitCost' => toDec(l.get('unitCost')),
                        'weight' => toDec(l.get('weight')), 'expenses' => lineExpenses(l, false),
                        'unitListPrice' => lineListPrice(l, false), 'discount' => null
                    };
                    if (!isExtraLine(l)) {
                        Decimal mg = toDec(l.get('margin'));
                        if (mg == null) mg = 0;
                        li.put('discount', lineDiscount(l));
                        li.put('margin', mg);
                    }
                    items.add(li);
                }
            }
            CreateQuoteController.generateQuoteLines(q.Id, items);
            r.lineCount = items.size();
        } catch (Exception e) {
            // the quote itself is saved; tell the user instead of dropping the lines silently
            System.debug('IM quote lines skipped: ' + e.getMessage());
            Database.rollback(linesSp);
            r.lineCount = 0;
            r.lineWarning = 'The quote was saved, but its line items could not be created: ' + e.getMessage();
        }

        // Domestic APPLY writes Opportunity.CloseDate from the Expiration Date (Deepanjan, Aug 2026);
        // Opportunity.Amount / stage stay untouched here - those move at approval only.
        try {
            Quote qo = [SELECT OpportunityId FROM Quote WHERE Id = :q.Id LIMIT 1];
            if (qo.OpportunityId != null) update new Opportunity(Id = qo.OpportunityId, CloseDate = expirationDate);
        } catch (Exception e) { System.debug('IM CloseDate update skipped: ' + e.getMessage()); }

        Quote saved = [SELECT Id, QuoteNumber, Quote_Reference__c FROM Quote WHERE Id = :q.Id LIMIT 1];
        r.quoteId     = saved.Id;
        r.quoteNumber = saved.QuoteNumber;

        // Reference UIL/IM/<FY>/<QuoteNo> - the existing generator falls back to the
        // first letters of "International Marketing" = IM, so no change there.
        if (r.isNew || String.isBlank(saved.Quote_Reference__c)) {
            r.quoteReference = CreateQuoteController.generateQuoteReference(saved.Id, IM_TEMPLATE_NAME);
        } else {
            r.quoteReference = saved.Quote_Reference__c;
        }

        // Final_Quote_Amount__c is written above directly (converted total), so the
        // domestic captureQuoteTotal is deliberately NOT called here.

        return r;
    }


    // =====================================================================
    // 4b. DRAFT - Save as Draft before APPLY (domestic parity, 21 Sep 2026)
    //     Same Is_Draft__c field domestic createQuote uses. A draft writes ONLY
    //     Quote_Value__c + IM_Currency__c + the flag: no Expiration Date, no
    //     Final_Quote_Amount__c, no line items, no Opportunity.CloseDate, no
    //     reference - those stay APPLY's job. APPLY clears the flag.
    //     The first Save as Draft creates the record with exactly the defaults
    //     saveImQuote uses (Name = IM_TEMPLATE_NAME is how the IM list finds it).
    // =====================================================================
    /** a quote that was never applied can never go to approval (Deepanjan, 21 Sep 2026) */
    private static void assertApplied(Quote q) {
        if (q.Is_Draft__c == true || q.Has_Quote_Value__c != true) {
            throw new AuraHandledException('This quote is still a draft. Fill the Expiration Date and press Apply before sending it for approval.');
        }
    }

    @AuraEnabled
    public static SaveResult saveImDraft(Id quoteId, Id opportunityId, String quoteValueJson, String currencyCode) {
        assertImAccess();
        if (String.isBlank(quoteValueJson)) throw new AuraHandledException('Nothing to save yet.');
        SaveResult r = new SaveResult();
        Quote q;
        if (quoteId == null) {
            if (opportunityId == null) throw new AuraHandledException('Opportunity Id is required to create a quote.');
            q = new Quote(Name = IM_TEMPLATE_NAME, OpportunityId = opportunityId, Status = 'Draft');
            r.isNew = true;
        } else {
            q = [SELECT Id, Status, Is_Draft__c, CreatedById FROM Quote WHERE Id = :quoteId LIMIT 1];
            // an applied quote's Quote_Value__c is what the PDF and approval read - half-done
            // data must never land there, so only a never-applied draft takes a draft save
            if (q.Is_Draft__c != true || q.Status != 'Draft') {
                throw new AuraHandledException('Only an unapplied draft can be saved as a draft. Use Apply.');
            }
            if (q.CreatedById != UserInfo.getUserId()) {
                throw new AuraHandledException('Only the creator can save this draft.');
            }
            r.isNew = false;
        }
        q.Quote_Value__c = quoteValueJson;
        q.Is_Draft__c    = true;
        if (String.isNotBlank(currencyCode)) q.IM_Currency__c = currencyCode;
        if (r.isNew) insert q; else update q;

        Quote saved = [SELECT Id, QuoteNumber FROM Quote WHERE Id = :q.Id LIMIT 1];
        r.quoteId     = saved.Id;
        r.quoteNumber = saved.QuoteNumber;
        return r;
    }

    public class DraftInfo {
        @AuraEnabled public Id           quoteId;
        @AuraEnabled public String       quoteNumber;
        @AuraEnabled public List<String> products;      // TT / CB - the department(s) the draft holds
        @AuraEnabled public String       currencyCode;
        @AuraEnabled public Datetime     lastSaved;
        @AuraEnabled public Datetime     created;
    }

    /** The running user's own IM drafts on this opportunity - always read fresh (never cached). */
    @AuraEnabled
    public static List<DraftInfo> getMyImDrafts(Id opportunityId) {
        List<DraftInfo> out = new List<DraftInfo>();
        if (opportunityId == null) return out;
        for (Quote q : [SELECT Id, QuoteNumber, IM_Currency__c, Quote_Value__c, LastModifiedDate, CreatedDate
                        FROM Quote
                        WHERE OpportunityId = :opportunityId
                          AND Name = :IM_TEMPLATE_NAME
                          AND Is_Draft__c = true
                          AND CreatedById = :UserInfo.getUserId()
                        ORDER BY LastModifiedDate DESC]) {
            DraftInfo d = new DraftInfo();
            d.quoteId = q.Id; d.quoteNumber = q.QuoteNumber; d.currencyCode = q.IM_Currency__c;
            d.lastSaved = q.LastModifiedDate; d.created = q.CreatedDate;
            d.products = draftProducts(q.Quote_Value__c);
            out.add(d);
        }
        return out;
    }

    /** _IM_Draft_Products (written by Save as Draft), else the products that own lines */
    /**
     * PRODUCT column of the International Quotes list (Deepanjan, 26 Sep 2026): quote Id ->
     * product codes on it (TT / CB / HM), read from _IM_Products (applied quotes) or
     * _IM_Draft_Products (drafts). Kept out of getImQuotesByOpportunity so that query and
     * every caller of it stay exactly as they are; the list calls this separately and
     * simply shows a blank cell if it fails.
     */
    @AuraEnabled
    public static Map<Id, List<String>> getImQuoteProducts(Id opportunityId) {
        Map<Id, List<String>> out = new Map<Id, List<String>>();
        if (opportunityId == null) return out;
        for (Quote q : [SELECT Id, Quote_Value__c FROM Quote
                        WHERE OpportunityId = :opportunityId AND Name = :IM_TEMPLATE_NAME
                          AND (Has_Quote_Value__c = true OR Is_Draft__c = true)]) {
            List<String> codes = new List<String>();
            try {
                Map<String, String> prods = productsInQuote(q.Quote_Value__c);
                if (!prods.isEmpty()) codes.addAll(prods.keySet());
                else codes = draftProducts(q.Quote_Value__c);
            } catch (Exception e) { codes = new List<String>(); }
            out.put(q.Id, codes);
        }
        return out;
    }

    private static List<String> draftProducts(String quoteValueJson) {
        Set<String> codes = new Set<String>();
        if (String.isBlank(quoteValueJson)) return new List<String>();
        try {
            Map<String, Object> qv = (Map<String, Object>) JSON.deserializeUntyped(quoteValueJson);
            if (qv.get('_IM_Draft_Products') instanceof List<Object>) {
                for (Object o : (List<Object>) qv.get('_IM_Draft_Products')) if (o != null) codes.add(String.valueOf(o));
            }
            if (codes.isEmpty() && qv.get('_Final_Apex_Lines') instanceof List<Object>) {
                for (Object o : (List<Object>) qv.get('_Final_Apex_Lines')) {
                    if (o instanceof Map<String, Object> && ((Map<String, Object>) o).get('product') != null) codes.add(String.valueOf(((Map<String, Object>) o).get('product')));
                }
            }
        } catch (Exception e) { System.debug('draft products unreadable: ' + e.getMessage()); }
        return new List<String>(codes);
    }

    /** Draft JSON read without the client cache - getQuoteValueJson is cacheable and would hand back the previous save. */
    @AuraEnabled
    public static String getDraftValueJson(Id quoteId) {
        if (quoteId == null) return null;
        List<Quote> q = [SELECT Quote_Value__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        return q.isEmpty() ? null : q[0].Quote_Value__c;
    }

    // =====================================================================
    // 5. APPROVAL - the EXACT field writes createQuote does with updateRecord,
    //    moved server-side so one call does save + notify. Approver routing
    //    (determineApprover / Quote_approval_Matrix__mdt), notifications and
    //    escalation are the existing CreateQuoteController methods.
    // =====================================================================
    public class SubmitResult {
        @AuraEnabled public Id     approverId;
        @AuraEnabled public String notificationStatus;
        @AuraEnabled public String routingIssue;
        @AuraEnabled public List<ApprovalTrigger> triggers;
    }

    /**
     * Department used for approval routing / escalation.
     * IM does NOT get its own approval matrix: a Transmission Tower quote made in IM
     * routes through the SAME Quote_approval_Matrix__mdt rows as a domestic
     * Transmission Tower quote. The department is therefore the product's source
     * template ("Transmission Tower - Department"); with several products the one
     * carrying the largest amount decides, and the IM template name is the fallback.
     */
    @TestVisible
    private static String approvalDepartment(String quoteValueJson) {
        try {
            Map<String, Object> qv = (Map<String, Object>) JSON.deserializeUntyped(quoteValueJson);
            Map<String, Object> prods = qv.get('_IM_Products') instanceof Map<String, Object>
                ? (Map<String, Object>) qv.get('_IM_Products') : new Map<String, Object>();
            if (prods.isEmpty()) return IM_TEMPLATE_NAME;
            // amount per product from the saved lines
            Map<String, Decimal> byProduct = new Map<String, Decimal>();
            if (qv.get('_Final_Apex_Lines') instanceof List<Object>) {
                for (Object o : (List<Object>) qv.get('_Final_Apex_Lines')) {
                    if (!(o instanceof Map<String, Object>)) continue;
                    Map<String, Object> l = (Map<String, Object>) o;
                    String code = String.valueOf(l.get('product'));
                    Decimal amt = toDec(l.get('amountBase')) != null ? toDec(l.get('amountBase')) : toDec(l.get('amount'));
                    if (amt == null) amt = 0;
                    byProduct.put(code, (byProduct.containsKey(code) ? byProduct.get(code) : 0) + amt);
                }
            }
            String best; Decimal bestAmt = -1;
            for (String code : prods.keySet()) {
                Decimal amt = byProduct.containsKey(code) ? byProduct.get(code) : 0;
                if (amt > bestAmt) { bestAmt = amt; best = code; }
            }
            Object p = prods.get(best);
            String src = p instanceof Map<String, Object> ? String.valueOf(((Map<String, Object>) p).get('source_template')) : null;
            return String.isBlank(src) || src == 'null' ? IM_TEMPLATE_NAME : src;
        } catch (Exception e) { return IM_TEMPLATE_NAME; }
    }

    /**
     * The payload determineApprover expects, built exactly like createQuote does:
     *  - _Dynamic_Product_Name = the product's department label, so rules whose
     *    Product__c is that department (or ALL) match the root item;
     *  - _Saved_Table_Rows = the freshest line rows (Apex prefers _Final_Apex_Lines,
     *    but domestic sends both);
     *  - root-level Discount / Margin / NetPrice / Realization = the max over the rows,
     *    which is what a rule with those Evaluation_Metric__c values reads.
     * Money is sent in the RATE-CARD currency (…Base), so an IM quote hits the same
     * thresholds as the identical domestic quote.
     */
    @TestVisible
    private static String approvalPayload(String quoteValueJson, String dept) {
        Map<String, Object> qv;
        try { qv = (Map<String, Object>) JSON.deserializeUntyped(quoteValueJson); }
        catch (Exception e) { return quoteValueJson; }

        qv.put('_Dynamic_Product_Name', dept);

        // The domestic payload is modalSavedData itself - a FLAT bag of every field
        // (pvt_pv_margin, pvt_pv_realization, tower_project_for_type ...). A rule whose
        // Evaluation_Metric__c is one of those field names is read off that root map.
        // IM stores the same fields nested per product, so flatten them onto the root here;
        // without this no rule can ever match. Values are the rate-card ones (not converted).
        Object prodsObj = qv.get('_IM_Products');
        if (prodsObj instanceof Map<String, Object>) {
            Map<String, Object> prods = (Map<String, Object>) prodsObj;
            for (String code : prods.keySet()) {
                Object p = prods.get(code);
                if (!(p instanceof Map<String, Object>)) continue;
                Object saved = ((Map<String, Object>) p).get('saved');
                if (!(saved instanceof Map<String, Object>)) continue;
                Map<String, Object> sv = (Map<String, Object>) saved;
                if (sv.get('v') != null && String.valueOf(sv.get('v')) == '2') {
                    for (String k : new List<String>{ 'seeds', 'calc', 'inputs' }) {
                        if (sv.get(k) instanceof Map<String, Object>) qv.putAll((Map<String, Object>) sv.get(k));
                    }
                    // Telecom: approval metric fields as domestic would save them - '' when the
                    // field is hidden or its tower type has no line (see telecomImConfig
                    // _approvalView). Absent for every other product, so nothing else changes.
                    if (sv.get('approvalView') instanceof Map<String, Object>) {
                        qv.putAll((Map<String, Object>) sv.get('approvalView'));
                    }
                    // High Mast cross product: one extra item per product, named after the product
                    // (its mast type / sub-type) and carrying only its approval_* keys (PU Paint
                    // realization), so a rule whose Product__c is that mast type can read them -
                    // exactly what hmQuoteTest appends for the domestic routing. Absent elsewhere.
                    // Deepanjan (28th September 2026)
                    if (sv.get('approvalItems') instanceof List<Object>) {
                        List<Object> extra = new List<Object>();
                        for (Object it : (List<Object>) sv.get('approvalItems')) { if (it instanceof Map<String, Object>) extra.add(it); }
                        if (!extra.isEmpty()) {
                            List<Object> cur = qv.get('_Final_Apex_Lines') instanceof List<Object> ? (List<Object>) qv.get('_Final_Apex_Lines') : new List<Object>();
                            List<Object> merged = new List<Object>(cur);
                            merged.addAll(extra);
                            qv.put('_Final_Apex_Lines', merged);
                        }
                    }
                } else {
                    qv.putAll(sv);
                }
            }
        }

        // DOMESTIC ROOT NAME (Deepanjan, 29th September 2026). createQuote names the root item after
        // the value picked in the product's picklist (its dynamicProductName) - only Solar, Telecom
        // and Transmission Tower use the department label. The rules of a department whose
        // Product__c is that value (Crash Barrier "Conventional Type" / "Railway" ..., High Mast
        // "Transmission Pole") read the root through that name; with the department label on the
        // root they never could, and a quote whose lines carry no product name (accessories
        // only) found no approver at all. High Mast cross product already keeps its own name.
        if (prodsObj instanceof Map<String, Object>) {
            Map<String, Object> prods = (Map<String, Object>) prodsObj;
            if (prods.containsKey('CB') && qv.get('MBCB_Type') != null && String.isNotBlank(String.valueOf(qv.get('MBCB_Type')))) {
                qv.put('_Dynamic_Product_Name', String.valueOf(qv.get('MBCB_Type')));
            } else if (prods.containsKey('HM') && !prods.containsKey('HMC')) {
                qv.put('_Dynamic_Product_Name', 'Transmission Pole');   // tpImConfig: Standard Mast -> Transmission Pole
            }
        }

        List<Object> rows = qv.get('_Final_Apex_Lines') instanceof List<Object>
            ? (List<Object>) qv.get('_Final_Apex_Lines') : new List<Object>();
        List<Object> outRows = new List<Object>();
        Decimal maxDiscount = 0, maxMargin = 0, maxNet = 0, maxReal = 0;
        for (Object o : rows) {
            if (!(o instanceof Map<String, Object>)) continue;
            Map<String, Object> l = new Map<String, Object>((Map<String, Object>) o);
            // thresholds are set against rate-card values, not the converted ones
            Decimal upBase  = toDec(l.get('unitPriceBase'));
            Decimal amtBase = toDec(l.get('amountBase'));
            if (upBase != null)  l.put('unitPrice', upBase);
            if (amtBase != null) { l.put('amount', amtBase); l.put('netPrice', amtBase); }
            // every createQuote line carries expenses (0 when none) - a rule on it (Crash Barrier
            // "Accessory:" -> expenses) reads it; rate-card value, like the prices above
            l.put('expenses', lineExpenses(l, true));
            l.put('unitListPrice', lineListPrice(l, true));
            Decimal d = toDec(l.get('discount'));    if (d != null && d > maxDiscount) maxDiscount = d;
            // the root Margin is createQuote's max over its table rows, where an accessory / misc
            // row shows (price - cost) / price, not the 0 its line carries
            Decimal m = rowMargin(l);                if (m != null && m > maxMargin)   maxMargin   = m;
            // createQuote's extra line carries no margin / discount / realization of its own, so a
            // margin rule can never read one off an accessory named e.g. "Accessory: Railway clamp"
            if (isExtraLine(l)) { l.remove('margin'); l.remove('discount'); l.remove('realization'); }
            Decimal n = toDec(l.get('netPrice'));    if (n != null && n > maxNet)      maxNet      = n;
            Decimal r = toDec(l.get('realization')); if (r != null && r > maxReal)     maxReal     = r;
            outRows.add(l);
        }
        qv.put('_Final_Apex_Lines', outRows);
        qv.put('_Saved_Table_Rows', outRows);
        qv.put('Discount', maxDiscount);
        qv.put('Margin', maxMargin);
        qv.put('NetPrice', maxNet);
        qv.put('Realization', maxReal);
        return JSON.serialize(qv);
    }

    /**
     * Why did routing fail? Returns a readable report: the department used, the
     * submitter's role, every Quote_Approval_Matrix__mdt rule of that department and,
     * for each, whether the product matched and whether the metric key was present in
     * the payload (and with what value). Read-only, safe to call any time.
     */
    @AuraEnabled
    public static String getApprovalDebug(Id quoteId) {
        Quote q = [SELECT Id, Quote_Value__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        String dept = approvalDepartment(q.Quote_Value__c);
        String payload = approvalPayload(q.Quote_Value__c, dept);
        Map<String, Object> pm = (Map<String, Object>) JSON.deserializeUntyped(payload);

        // the same item pool determineApprover builds
        List<Map<String, Object>> items = new List<Map<String, Object>>();
        Map<String, Object> root = new Map<String, Object>();
        for (String k : pm.keySet()) root.put(k.toLowerCase(), pm.get(k));
        root.put('name', pm.get('_Dynamic_Product_Name'));
        items.add(root);
        if (pm.get('_Final_Apex_Lines') instanceof List<Object>) {
            for (Object o : (List<Object>) pm.get('_Final_Apex_Lines')) {
                if (!(o instanceof Map<String, Object>)) continue;
                Map<String, Object> low = new Map<String, Object>();
                for (String k : ((Map<String, Object>) o).keySet()) low.put(k.toLowerCase(), ((Map<String, Object>) o).get(k));
                items.add(low);
            }
        }

        User u = [SELECT UserRole.Name FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];
        String role = u.UserRole != null ? u.UserRole.Name : 'No_Role';

        List<String> out = new List<String>();
        out.add('Department used: "' + dept + '"');
        out.add('Submitter role: "' + role + '"  (rules must have Submitterlevel__c = this role or ALL)');
        out.add('Items evaluated: ' + items.size() + ' (1 root + ' + (items.size() - 1) + ' lines)');
        out.add('Root name: "' + String.valueOf(root.get('name')) + '"');
        out.add('Root keys sample: ' + String.join(new List<String>(new Set<String>(root.keySet())), ', ').abbreviate(400));

        List<Quote_Approval_Matrix__mdt> all = [
            SELECT MasterLabel, Approver__c, Min_value__c, Max_value__c, Product__c, Evaluation_Metric__c,
                   Escalation__c, Category__c, Sub_Component__c, Submitterlevel__c, Department__c
            FROM Quote_Approval_Matrix__mdt WHERE Department__c = :dept];
        // every item with the value of each metric this department's rules read, so a missing
        // name or key is visible at once (Deepanjan, 29th September 2026)
        Set<String> metrics = new Set<String>();
        for (Quote_Approval_Matrix__mdt r : all) if (r.Evaluation_Metric__c != null) metrics.add(r.Evaluation_Metric__c.toLowerCase());
        for (Integer i = 0; i < items.size(); i++) {
            Map<String, Object> it = items[i];
            List<String> vals = new List<String>();
            for (String mk : metrics) vals.add(mk + '=' + (it.containsKey(mk) ? String.valueOf(it.get(mk)) : '(none)'));
            out.add((i == 0 ? 'Root' : 'Line ' + i) + ': "' + String.valueOf(it.get('name')) + '" | ' + String.join(vals, ' | '));
        }
        out.add('Rules for this department: ' + all.size());
        for (Quote_Approval_Matrix__mdt r : all) {
            String metric = r.Evaluation_Metric__c == null ? '' : r.Evaluation_Metric__c.toLowerCase();
            Boolean levelOk = r.Submitterlevel__c == role || r.Submitterlevel__c == 'ALL';
            String prodHit = 'no';
            String metricHit = 'key not found in any item';
            for (Map<String, Object> it : items) {
                String nm = String.valueOf(it.get('name') == null ? 'ALL' : it.get('name')).replaceAll('[-\\s]', '').toLowerCase();
                String np = String.isBlank(r.Product__c) ? '' : r.Product__c.replaceAll('[-\\s]', '').toLowerCase();
                Boolean pOk = (r.Product__c == 'ALL' || nm.contains(np));
                if (pOk) prodHit = 'yes';
                if (pOk && it.containsKey(metric)) {
                    metricHit = 'value ' + String.valueOf(it.get(metric)) + ' on "' + String.valueOf(it.get('name')) + '"';
                    break;
                }
            }
            out.add('- ' + r.MasterLabel + ' | Submitterlevel=' + r.Submitterlevel__c + (levelOk ? ' (ok)' : ' (SKIPPED - not this role)')
                + ' | Product=' + r.Product__c + ' -> ' + prodHit
                + ' | Metric=' + r.Evaluation_Metric__c + ' -> ' + metricHit
                + ' | Range ' + r.Min_value__c + '..' + r.Max_value__c + ' | Approver=' + r.Approver__c);
        }
        return String.join(out, '\n');
    }

    /**
     * Which product line(s) made the approval fire. Runs the same test the routing does
     * (department, submitter level, Product contained in the item name, metric key present,
     * value inside Min..Max). Saved into the quote JSON on submit (_IM_Approval_Triggers)
     * so the submitter, the approver and a later reopen all see the same highlight.
     */
    public class ApprovalTrigger {
        @AuraEnabled public String itemName;    // the line as the summary shows it
        @AuraEnabled public String rule;        // Quote_Approval_Matrix__mdt label
        @AuraEnabled public String metric;      // margin / discount / realization / a field name
        @AuraEnabled public String value;       // the value that fell in range
        @AuraEnabled public String range;       // "min..max"
        @AuraEnabled public String approver;    // role from the rule
        @AuraEnabled public Boolean isRoot;     // matched on the department item, not a line
    }

    /** the same priority ladder CreateQuoteController.determineApprover uses to pick the winner */
    private static Integer imRulePriority(Quote_Approval_Matrix__mdt r) {
        String role = r.Approver__c == null ? '' : r.Approver__c;
        Integer p = 1;
        if (role.containsIgnoreCase('Utkarsh') || role.containsIgnoreCase('CMD') || role.containsIgnoreCase('Director')) p = 10;
        else if (role.containsIgnoreCase('HOD') || role.containsIgnoreCase('Head')) p = 5;
        if (r.Escalation__c == true) p = 20;
        return p;
    }

    public static List<ApprovalTrigger> computeApprovalTriggers(String quoteValueJson) {
        List<ApprovalTrigger> all = new List<ApprovalTrigger>();
        if (String.isBlank(quoteValueJson)) return all;
        String dept = approvalDepartment(quoteValueJson);
        String payload = approvalPayload(quoteValueJson, dept);
        Map<String, Object> pm = (Map<String, Object>) JSON.deserializeUntyped(payload);
        String role = null;
        try {
            List<User> me = [SELECT Id, UserRole.Name FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];
            role = me.isEmpty() || me[0].UserRole == null ? null : me[0].UserRole.Name;
        } catch (Exception e) { role = null; }

        List<Map<String, Object>> items = new List<Map<String, Object>>();
        Map<String, Object> root = new Map<String, Object>();
        for (String k : pm.keySet()) root.put(k.toLowerCase(), pm.get(k));
        root.put('name', pm.get('_Dynamic_Product_Name'));
        root.put('__isroot', true);
        items.add(root);
        if (pm.get('_Final_Apex_Lines') instanceof List<Object>) {
            for (Object o : (List<Object>) pm.get('_Final_Apex_Lines')) {
                if (!(o instanceof Map<String, Object>)) continue;
                Map<String, Object> low = new Map<String, Object>();
                for (String k : ((Map<String, Object>) o).keySet()) low.put(k.toLowerCase(), ((Map<String, Object>) o).get(k));
                items.add(low);
            }
        }
        List<Quote_Approval_Matrix__mdt> rules = [
            SELECT MasterLabel, Approver__c, Min_value__c, Max_value__c, Product__c, Evaluation_Metric__c, Submitterlevel__c, Escalation__c
            FROM Quote_Approval_Matrix__mdt WHERE Department__c = :dept];

        // 1. every (rule x item) that matches, with the rule's priority
        Integer highest = 0;
        Map<ApprovalTrigger, Integer> prio = new Map<ApprovalTrigger, Integer>();
        for (Quote_Approval_Matrix__mdt r : rules) {
            if (!(r.Submitterlevel__c == 'ALL' || r.Submitterlevel__c == role)) continue;
            String metric = r.Evaluation_Metric__c == null ? '' : r.Evaluation_Metric__c.toLowerCase();
            String np = String.isBlank(r.Product__c) ? '' : r.Product__c.replaceAll('[-\\s]', '').toLowerCase();
            Integer p = imRulePriority(r);
            for (Map<String, Object> it : items) {
                String nm = String.valueOf(it.get('name') == null ? 'ALL' : it.get('name'));
                String nmKey = nm.replaceAll('[-\\s]', '').toLowerCase();
                if (!(r.Product__c == 'ALL' || nmKey.contains(np))) continue;
                if (!it.containsKey(metric) || it.get(metric) == null) continue;
                Decimal v;
                try { v = Decimal.valueOf(String.valueOf(it.get(metric))); } catch (Exception e) { continue; }
                Boolean lo = r.Min_value__c == null || v >= r.Min_value__c;
                Boolean hi = r.Max_value__c == null || v <= r.Max_value__c;
                if (!(lo && hi)) continue;
                ApprovalTrigger t = new ApprovalTrigger();
                t.itemName = nm; t.rule = r.MasterLabel; t.metric = r.Evaluation_Metric__c;
                t.value = String.valueOf(v); t.range = String.valueOf(r.Min_value__c) + '..' + String.valueOf(r.Max_value__c);
                t.approver = r.Approver__c; t.isRoot = it.containsKey('__isroot');
                all.add(t); prio.put(t, p);
                if (p > highest) highest = p;
            }
        }
        // 2. only the matches at the WINNING priority decided the approver - domestic routing
        //    lets the highest approver overwrite the rest, so those lines are the trigger.
        List<ApprovalTrigger> out = new List<ApprovalTrigger>();
        for (ApprovalTrigger t : all) if (prio.get(t) == highest) out.add(t);
        return out;
    }

    @AuraEnabled
    public static List<ApprovalTrigger> getApprovalTriggers(Id quoteId) {
        Quote q = [SELECT Quote_Value__c, Status, Is_Draft__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        // The highlight explains a SUBMISSION. Before submit - a saved draft, an applied quote
        // not yet submitted, a reopened revision - there is nothing to show, and the live
        // fallback below must never run (a blank margin reads as 0 and matches a rule).
        if (q.Is_Draft__c == true || q.Status == 'Draft') return new List<ApprovalTrigger>();
        // prefer what was frozen at submit time, so the approver sees exactly what fired
        if (String.isNotBlank(q.Quote_Value__c)) {
            try {
                Map<String, Object> qv = (Map<String, Object>) JSON.deserializeUntyped(q.Quote_Value__c);
                if (qv.get('_IM_Approval_Triggers') instanceof List<Object>) {
                    List<ApprovalTrigger> saved = new List<ApprovalTrigger>();
                    for (Object o : (List<Object>) qv.get('_IM_Approval_Triggers')) {
                        saved.add((ApprovalTrigger) JSON.deserialize(JSON.serialize(o), ApprovalTrigger.class));
                    }
                    return saved;
                }
            } catch (Exception e) { System.debug('trigger read: ' + e.getMessage()); }
        }
        return computeApprovalTriggers(q.Quote_Value__c);
    }

    @AuraEnabled
    public static SubmitResult submitForApproval(Id quoteId, String message, Date dueDate) {
        if (quoteId == null) throw new AuraHandledException('Quote Id is required.');
        if (dueDate == null) throw new AuraHandledException('Please select an Approval Due Date.');
        if (dueDate < Date.today()) throw new AuraHandledException('Approval Due Date cannot be in the past.');

        Quote q = [SELECT Id, Quote_Value__c, Is_Draft__c, Has_Quote_Value__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        assertApplied(q);                            // a never-applied draft can never go to approval
        String dept = approvalDepartment(q.Quote_Value__c);
        String approver = CreateQuoteController.determineApprover(dept, approvalPayload(q.Quote_Value__c, dept));

        // freeze WHY it is going to approval - the lines that matched a rule
        List<ApprovalTrigger> triggers = computeApprovalTriggers(q.Quote_Value__c);
        String qvJson = q.Quote_Value__c;
        try {
            Map<String, Object> qv = (Map<String, Object>) JSON.deserializeUntyped(q.Quote_Value__c);
            qv.put('_IM_Approval_Triggers', (List<Object>) JSON.deserializeUntyped(JSON.serialize(triggers)));
            qvJson = JSON.serialize(qv);
        } catch (Exception e) { System.debug('trigger freeze skipped: ' + e.getMessage()); }

        Quote upd = new Quote(
            Id                       = quoteId,
            Quote_Value__c           = qvJson,
            Description              = message,
            Status                   = 'In Review',
            Approval_Submitted_By__c = UserInfo.getUserId(),
            submition_date__c        = Datetime.now(),
            Approval_Due_Date__c     = dueDate
        );
        SubmitResult r = new SubmitResult();
        r.triggers = triggers;
        if (String.isNotBlank(approver) && (approver.startsWith('005') || approver.startsWith('00G'))) {
            upd.Pending_Approver__c = approver;
            r.approverId = approver;
        } else {
            // determineApprover returns FAIL_NO_RULES_MATCHED / FAIL_NO_USER_FOR_ROLE - pass the
            // reason back so the screen can say WHY nothing was routed.
            r.routingIssue = (approver == 'FAIL_NO_USER_FOR_ROLE')
                ? 'The matching approval rule points at a role with no active user.'
                : 'No approval rule matched for ' + dept + ' (Quote Approval Matrix: Department, Submitter Level, Product, metric range).';
        }
        update upd;
        if (r.approverId != null) {
            r.notificationStatus = CreateQuoteController.sendQuoteApprovalNotification(quoteId, r.approverId, 'SUBMITTED');
        }
        return r;
    }

    @AuraEnabled
    public static String approveQuote(Id quoteId) {
        Quote q = [SELECT Id, Status, Pending_Approver__c, Approval_Submitted_By__c, OpportunityId FROM Quote WHERE Id = :quoteId LIMIT 1];
        if (q.Status != 'In Review') throw new AuraHandledException('Quote is not In Review.');
        if (q.Pending_Approver__c != UserInfo.getUserId()) throw new AuraHandledException('This quote is not pending your approval.');
        update new Quote(Id = quoteId, Status = 'Approved', approved_by__c = UserInfo.getUserId(), submition_date__c = Datetime.now());
        // Offer capture + stage rule exactly as domestic (no IM branch in resolveOfferTotal
        // yet, so Amount is untouched; Final_Quote_Amount__c was written on APPLY).
        try { CreateQuoteController.captureOfferTotal(quoteId, q.OpportunityId); } catch (Exception e) { System.debug('capture skipped: ' + e.getMessage()); }
        return CreateQuoteController.sendQuoteApprovalNotification(quoteId, q.Approval_Submitted_By__c, 'APPROVED');
    }

    /** Approvals turned off for the department -> the user approves their own quote (domestic Self Approve). */
    @AuraEnabled
    public static String selfApproveQuote(Id quoteId) {
        Quote q = [SELECT Id, Status, Approval_Submitted_By__c, OpportunityId, Is_Draft__c, Has_Quote_Value__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        if (q.Status == 'Approved') throw new AuraHandledException('Quote is already approved.');
        assertApplied(q);
        update new Quote(Id = quoteId, Status = 'Approved', approved_by__c = UserInfo.getUserId(), submition_date__c = Datetime.now());
        try { CreateQuoteController.captureOfferTotal(quoteId, q.OpportunityId); } catch (Exception e) { System.debug('capture skipped: ' + e.getMessage()); }
        Id back = q.Approval_Submitted_By__c != null ? q.Approval_Submitted_By__c : UserInfo.getUserId();
        return CreateQuoteController.sendQuoteApprovalNotification(quoteId, back, 'APPROVED');
    }

    @AuraEnabled
    public static String rejectQuote(Id quoteId, String reason) {
        if (String.isBlank(reason)) throw new AuraHandledException('Rejection Reason is required.');
        Quote q = [SELECT Id, Status, Pending_Approver__c, Approval_Submitted_By__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        if (q.Status != 'In Review') throw new AuraHandledException('Quote is not In Review.');
        if (q.Pending_Approver__c != UserInfo.getUserId()) throw new AuraHandledException('This quote is not pending your approval.');
        update new Quote(Id = quoteId, Status = 'Rejected', approved_by__c = UserInfo.getUserId(),
                         Rejection_Reason__c = reason.trim(), submition_date__c = Datetime.now());
        // notify AFTER the save so Apex reads the stored reason
        return CreateQuoteController.sendQuoteApprovalNotification(quoteId, q.Approval_Submitted_By__c, 'REJECTED');
    }

    @AuraEnabled
    public static CreateQuoteController.EscalationResult checkEscalation(Id quoteId) {
        Quote q = [SELECT Quote_Value__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        String dept = approvalDepartment(q.Quote_Value__c);
        return CreateQuoteController.checkEscalationRequired(quoteId, dept, approvalPayload(q.Quote_Value__c, dept));
    }

    @AuraEnabled
    public static void escalateQuote(Id quoteId, Id targetId) {
        if (targetId == null) throw new AuraHandledException('No escalation target found.');
        update new Quote(Id = quoteId, Status = 'In Review', Pending_Approver__c = targetId,
                         approved_by__c = UserInfo.getUserId(), submition_date__c = Datetime.now());
        CreateQuoteController.sendQuoteApprovalNotification(quoteId, targetId, 'SUBMITTED');
    }

    // =====================================================================
    // 6. OFFER DOCUMENTS - one Document_Template_Mapping__mdt row per IM
    //    product (Department__c = IM, IM_Product__c = the product's source
    //    template label). Export and Finalize use only the products that are
    //    actually in the quote.
    // =====================================================================
    public class OfferDoc {
        @AuraEnabled public String productCode;     // TT / CB / ...
        @AuraEnabled public String productLabel;    // "Transmission Tower"
        @AuraEnabled public String sourceTemplate;  // "Transmission Tower - Department"
        @AuraEnabled public String pdfPage;
        @AuraEnabled public String wordPage;
        @AuraEnabled public String excelPage;
        @AuraEnabled public String templateType;
        @AuraEnabled public Boolean isOffer;
        @AuraEnabled public String offerType;      // 'Domestic' | 'International' (blank mapping row = Domestic)
    }

    public static final String OFFER_TYPE_DOMESTIC = 'Domestic';
    /** Offer_Type__c of a mapping row, blank = Domestic (every row that existed before the picklist). */
    private static String offerTypeOf(String raw) { return String.isBlank(raw) ? OFFER_TYPE_DOMESTIC : raw.trim(); }
    /** Type of Offer chosen for a quote (Generate Documents picklist), stored in _IM_Export.offer_type; blank = Domestic. */
    private static String quoteOfferType(String quoteValueJson) {
        try {
            Map<String, Object> qv = (Map<String, Object>) JSON.deserializeUntyped(quoteValueJson);
            Object exp = qv.get('_IM_Export');
            if (exp instanceof Map<String, Object>) {
                Object t = ((Map<String, Object>) exp).get('offer_type');
                if (t != null && String.isNotBlank(String.valueOf(t))) return String.valueOf(t).trim();
            }
        } catch (Exception e) {}
        return OFFER_TYPE_DOMESTIC;
    }

    /** Remembers the Type of Offer on the quote so Finalize attaches the same format the user generated. */
    @AuraEnabled
    public static void setImOfferType(Id quoteId, String offerType) {
        if (quoteId == null) return;
        Quote q = [SELECT Id, Quote_Value__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        Map<String, Object> qv = String.isBlank(q.Quote_Value__c)
            ? new Map<String, Object>() : (Map<String, Object>) JSON.deserializeUntyped(q.Quote_Value__c);
        Map<String, Object> exp = qv.get('_IM_Export') instanceof Map<String, Object>
            ? (Map<String, Object>) qv.get('_IM_Export') : new Map<String, Object>();
        exp.put('offer_type', offerTypeOf(offerType));
        qv.put('_IM_Export', exp);
        update new Quote(Id = quoteId, Quote_Value__c = JSON.serialize(qv));
    }

    /**
     * Products saved in the quote -> {code -> the IM_Product__c value its mapping rows carry}.
     * That is the product's source template, unless the product declares its own doc_product
     * (High Mast cross product: "High Mast - Cross Product", so the Transmission Pole rows of
     * the same department are not offered on a High Mast quote and the other way round).
     * Deepanjan (28th September 2026)
     */
    private static Map<String, String> productsInQuote(String quoteValueJson) {
        Map<String, String> out = new Map<String, String>();
        if (String.isBlank(quoteValueJson)) return out;
        try {
            Map<String, Object> qv = (Map<String, Object>) JSON.deserializeUntyped(quoteValueJson);
            Object prods = qv.get('_IM_Products');
            if (prods instanceof Map<String, Object>) {
                for (String code : ((Map<String, Object>) prods).keySet()) {
                    Object p = ((Map<String, Object>) prods).get(code);
                    String src = p instanceof Map<String, Object> ? String.valueOf(((Map<String, Object>) p).get('source_template')) : null;
                    if (p instanceof Map<String, Object>) {
                        Object dp = ((Map<String, Object>) p).get('doc_product');
                        if (dp != null && String.isNotBlank(String.valueOf(dp)) && String.valueOf(dp) != 'null') src = String.valueOf(dp);
                    }
                    out.put(code, src);
                }
            }
        } catch (Exception e) {}
        return out;
    }

    /** Offer PDF pages for the products present in this quote (mapping rows with a matching IM_Product__c). */
    @AuraEnabled
    public static List<OfferDoc> getOfferDocs(Id quoteId) {
        List<OfferDoc> out = new List<OfferDoc>();
        if (quoteId == null) return out;
        Quote q = [SELECT Quote_Value__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        Map<String, String> prods = productsInQuote(q.Quote_Value__c);
        if (prods.isEmpty()) return out;
        for (Document_Template_Mapping__mdt m : [
            SELECT Template_Type__c, PDF_VF_Page__c, Word_VF_Page__c, Excel_VF_Page__c, IM_Product__c, offer_document__c, Offer_Type__c
            FROM Document_Template_Mapping__mdt
            WHERE Department__c = :IM_TEMPLATE_NAME
            ORDER BY Offer_Type__c ASC NULLS FIRST, Template_Type__c ASC
        ]) {
            if (String.isBlank(m.PDF_VF_Page__c) && String.isBlank(m.Word_VF_Page__c) && String.isBlank(m.Excel_VF_Page__c)) continue;
            // IM_Product__c blank = the row applies to every product in the quote, so a row
            // that has not been tagged yet still shows up in the Sub-Type list.
            Boolean untagged = String.isBlank(m.IM_Product__c);
            for (String code : prods.keySet()) {
                String src = prods.get(code);
                if (untagged || (src != null && src.equalsIgnoreCase(m.IM_Product__c.trim()))) {
                    OfferDoc d = new OfferDoc();
                    d.productCode = code; d.sourceTemplate = src;
                    d.productLabel = String.isBlank(src) ? '' : src.replaceAll('(?i)\\s*-\\s*department\\s*$', '').trim();
                    d.pdfPage = m.PDF_VF_Page__c; d.wordPage = m.Word_VF_Page__c; d.excelPage = m.Excel_VF_Page__c;
                    d.templateType = m.Template_Type__c; d.isOffer = m.offer_document__c == true;
                    d.offerType = offerTypeOf(m.Offer_Type__c);
                    out.add(d);
                    if (untagged) break;      // one entry only, not one per product
                }
            }
        }
        return out;
    }

    /**
     * Finalize for IM. Same steps as CreateQuoteController.finalizeQuoteAndAttachDocs
     * (that method attaches EVERY mapping row of the department, which would attach
     * a CB PDF to a TT-only quote), restricted to the products in the quote.
     * Existing method untouched.
     */
    @AuraEnabled
    public static void finalizeQuote(Id opportunityId, Id quoteId) {
        try {
            Quote activeQuote = [SELECT Id, QuoteNumber, Final_Quote_Amount__c, LastModifiedDate, Quote_Value__c
                                 FROM Quote WHERE Id = :quoteId LIMIT 1];
            Map<String, String> prods = productsInQuote(activeQuote.Quote_Value__c);
            // only the format the user generated (Type of Offer) is attached; blank rows = Domestic
            String offerType = quoteOfferType(activeQuote.Quote_Value__c);

            List<ContentVersion> filesToInsert = new List<ContentVersion>();
            Set<String> offerDocTitles = new Set<String>();
            for (Document_Template_Mapping__mdt m : [
                SELECT Template_Type__c, PDF_VF_Page__c, Excel_VF_Page__c, Word_VF_Page__c, IM_Product__c, offer_document__c, Offer_Type__c
                FROM Document_Template_Mapping__mdt WHERE Department__c = :IM_TEMPLATE_NAME
            ]) {
                if (String.isBlank(m.IM_Product__c)) continue;
                if (!offerTypeOf(m.Offer_Type__c).equalsIgnoreCase(offerType)) continue;
                Boolean inQuote = false;
                String code = '';
                for (String c : prods.keySet()) { if (prods.get(c) != null && prods.get(c).equalsIgnoreCase(m.IM_Product__c.trim())) { inQuote = true; code = c; } }
                if (!inQuote) continue;
                String tag = String.isNotBlank(m.Template_Type__c) ? m.Template_Type__c : 'Template';
                String title = tag + '_' + code + '_' + activeQuote.QuoteNumber;
                if (m.offer_document__c == true) offerDocTitles.add(title);
                if (String.isNotBlank(m.PDF_VF_Page__c))   filesToInsert.add(buildFile(m.PDF_VF_Page__c, quoteId, title + '.pdf'));
                if (String.isNotBlank(m.Excel_VF_Page__c)) filesToInsert.add(buildFile(m.Excel_VF_Page__c, quoteId, title + '.xls'));
                if (String.isNotBlank(m.Word_VF_Page__c))  filesToInsert.add(buildFile(m.Word_VF_Page__c, quoteId, title + '.doc'));
            }

            // remove this quote's previous generated files from the opportunity
            List<ContentDocumentLink> links = [SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = :opportunityId];
            if (!links.isEmpty()) {
                Set<Id> docIds = new Set<Id>();
                for (ContentDocumentLink l : links) docIds.add(l.ContentDocumentId);
                String pat = '%_' + activeQuote.QuoteNumber + '%';
                List<ContentDocument> old = [SELECT Id FROM ContentDocument WHERE Id IN :docIds
                                             AND (Title LIKE :pat OR Description = 'Generated via Quote Finalization')];
                if (!old.isEmpty()) delete old;
            }

            List<String> offerDocIds = new List<String>();
            if (!filesToInsert.isEmpty()) {
                insert filesToInsert;
                Set<Id> cvIds = new Map<Id, ContentVersion>(filesToInsert).keySet();
                List<ContentDocumentLink> newLinks = new List<ContentDocumentLink>();
                for (ContentVersion cv : [SELECT Title, ContentDocumentId, FileExtension, PathOnClient FROM ContentVersion WHERE Id IN :cvIds]) {
                    newLinks.add(new ContentDocumentLink(LinkedEntityId = opportunityId, ContentDocumentId = cv.ContentDocumentId, ShareType = 'V', Visibility = 'AllUsers'));
                    Boolean isPdf = cv.FileExtension == 'pdf' || (cv.PathOnClient != null && cv.PathOnClient.endsWithIgnoreCase('.pdf'));
                    String base = cv.Title.substringBeforeLast('.');
                    if ((offerDocTitles.contains(cv.Title) || offerDocTitles.contains(base)) && isPdf) offerDocIds.add(cv.ContentDocumentId);
                }
                insert newLinks;
            }

            Date closeDate = (activeQuote.LastModifiedDate != null ? activeQuote.LastModifiedDate.date() : Date.today()).addDays(15);
            update new Opportunity(
                Id = opportunityId,
                SyncedQuoteId = activeQuote.Id,
                Amount = activeQuote.Final_Quote_Amount__c,     // total in the quote currency - Deepanjan's call
                StageName = 'Negotiation',
                CloseDate = closeDate,
                Final_Quote_Document_ID__c = offerDocIds.isEmpty() ? null : String.join(offerDocIds, ',')
            );
        } catch (Exception ex) {
            throw new AuraHandledException('Finalization Error: ' + ex.getMessage());
        }
    }

    private static Decimal toDec(Object o) {
        if (o == null) return null;
        try { return Decimal.valueOf(String.valueOf(o)); } catch (Exception e) { return null; }
    }

    // ---- a saved line as createQuote would have built it (Deepanjan, 29th September 2026) ----
    /** an extra line: Crash Barrier accessory / misc / add-misc, High Mast freight lump sum */
    @TestVisible
    private static Boolean isExtraLine(Map<String, Object> l) {
        if (String.valueOf(l.get('isExtra')) == 'true') return true;
        String nm = l.get('name') == null ? '' : String.valueOf(l.get('name'));
        return String.valueOf(l.get('product')) == 'CB' && (nm.startsWith('Accessory: ') || nm.startsWith('Misc: ') || nm.startsWith('Add Misc: '));
    }
    /** expenses, 0 when the line has none; base = rate-card figure (approval), else the quote currency (line item) */
    @TestVisible
    private static Decimal lineExpenses(Map<String, Object> l, Boolean base) {
        Decimal v = base ? toDec(l.get('expensesBase')) : null;
        if (v == null) v = toDec(l.get('expenses'));
        if (v == null) v = 0;
        return v;
    }
    /** createQuote's unit list price: the line's list price when above 0, else its unit price */
    @TestVisible
    private static Decimal lineListPrice(Map<String, Object> l, Boolean base) {
        Decimal lp = toDec(l.get(base ? 'unitListPriceBase' : 'unitListPrice'));
        if (lp == null && !base) lp = toDec(l.get('unitListPrice'));
        if (lp != null && lp > 0) return lp;
        Decimal up = toDec(l.get(base ? 'unitPriceBase' : 'unitPrice'));
        if (up == null) up = toDec(l.get('unitPrice'));
        if (up == null) up = 0;
        return up;
    }
    /** createQuote's discount %: the one entered, else list price against unit price */
    @TestVisible
    private static Decimal lineDiscount(Map<String, Object> l) {
        Decimal d = toDec(l.get('discount'));
        if (d != null && d > 0) return d;
        Decimal lp = lineListPrice(l, false);
        Decimal up = toDec(l.get('unitPrice'));
        Decimal none = 0;
        if (lp == null || lp <= 0 || up == null) return none;
        return (((lp - up) / lp) * 100).setScale(2, RoundingMode.HALF_UP);
    }
    /** the margin createQuote's table row shows: the line's own, or (price - cost) / price on an extra line */
    @TestVisible
    private static Decimal rowMargin(Map<String, Object> l) {
        if (isExtraLine(l)) {
            Decimal up = toDec(l.get('unitPriceBase')), uc = toDec(l.get('unitCostBase'));
            if (up == null) up = toDec(l.get('unitPrice'));
            if (uc == null) uc = toDec(l.get('unitCost'));
            Decimal none = 0;
            if (up == null || up <= 0 || uc == null) return none;
            return ((up - uc) / up) * 100;
        }
        return toDec(l.get('margin'));
    }

    private static ContentVersion buildFile(String vfPageUrl, Id quoteId, String fileName) {
        PageReference ref = new PageReference(vfPageUrl);
        ref.getParameters().put('id', quoteId);
        Blob body;
        try { body = Test.isRunningTest() ? Blob.valueOf('Test') : ref.getContent(); }
        catch (Exception e) { body = Blob.valueOf('Error generating file: ' + e.getMessage()); }
        return new ContentVersion(Title = fileName.substringBeforeLast('.'), PathOnClient = fileName, VersionData = body,
                                  Description = 'Generated via Quote Finalization', FirstPublishLocationId = quoteId);
    }
    /** Draft quote: flip the applied flag inside the JSON (no revision). */
    @AuraEnabled
    public static void setApplied(Id quoteId, Boolean applied) {
        Quote q = [SELECT Id, Status, Quote_Value__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        if (q.Status == 'Approved' || q.Status == 'Accepted') {
            throw new AuraHandledException('Quote is ' + q.Status + '. Use Reopen to create a revision.');
        }
        Map<String, Object> qv = String.isBlank(q.Quote_Value__c)
            ? new Map<String, Object>() : (Map<String, Object>) JSON.deserializeUntyped(q.Quote_Value__c);
        Map<String, Object> exp = qv.get('_IM_Export') instanceof Map<String, Object>
            ? (Map<String, Object>) qv.get('_IM_Export') : new Map<String, Object>();
        exp.put('applied', applied == true);
        qv.put('_IM_Export', exp);
        Quote upd = new Quote(Id = quoteId, Quote_Value__c = JSON.serialize(qv));
        // domestic reopen also puts the record back to Draft
        if (applied != true && q.Status != 'Draft') upd.Status = 'Draft';
        // createRevision / cloneQuote copy Quote_Value__c but not this flag - without it the
        // new revision never shows in the Quotes tab (the list filters on it, like domestic).
        upd.Has_Quote_Value__c = true;
        // a revision copies Quote_Value__c but not IM_Currency__c - re-stamp it from the JSON
        Quote cur = [SELECT IM_Currency__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        if (String.isBlank(cur.IM_Currency__c) && exp.get('currency_picklist') != null) upd.IM_Currency__c = String.valueOf(exp.get('currency_picklist'));
        update upd;
    }

    /**
     * Clone = the existing CreateQuoteController.cloneQuote (copies every cloneable
     * field, Cloned__c, Original_Quote_Number_After_Cloned__c, Revision_No__c = 0,
     * fresh expiry, new reference). This wrapper only makes sure the clone shows in
     * the Quotes list and keeps the IM currency.
     */
    @AuraEnabled
    public static CreateQuoteController.CloneResult cloneQuote(Id quoteId, Id targetOpportunityId) {
        Quote src = [SELECT Id, QuoteNumber, IM_Currency__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        CreateQuoteController.CloneResult r = CreateQuoteController.cloneQuote(quoteId, targetOpportunityId);
        try {
            Quote c = [SELECT Id, Cloned__c, Original_Quote_Number_After_Cloned__c, Has_Quote_Value__c,
                              IM_Currency__c, Quote_Value__c, Revision_No__c
                       FROM Quote WHERE Id = :r.newQuoteId LIMIT 1];
            Quote fix = new Quote(Id = c.Id);
            Boolean touch = false;
            if (c.Has_Quote_Value__c != true && String.isNotBlank(c.Quote_Value__c)) { fix.Has_Quote_Value__c = true; touch = true; }
            if (c.Cloned__c != true) { fix.Cloned__c = true; touch = true; }
            if (String.isBlank(c.Original_Quote_Number_After_Cloned__c)) { fix.Original_Quote_Number_After_Cloned__c = src.QuoteNumber; touch = true; }
            if (c.Revision_No__c == null) { fix.Revision_No__c = 0; touch = true; }
            if (String.isBlank(c.IM_Currency__c) && String.isNotBlank(src.IM_Currency__c)) { fix.IM_Currency__c = src.IM_Currency__c; touch = true; }
            if (touch) update fix;
        } catch (Exception e) { System.debug('IM clone stamp skipped: ' + e.getMessage()); }
        return r;
    }

    /**
     * Revision = the existing CreateQuoteController.createRevision (Revision_No__c,
     * Previous_Revision__c, Original_Quote__c, fresh expiry, reference /Rn). This
     * wrapper only guarantees the two things the Quotes list needs and that the
     * lineage really landed: Has_Quote_Value__c (the list filters on it) and the
     * IM currency mirror. Nothing about the chain is re-implemented.
     */
    @AuraEnabled
    public static Id createRevision(Id quoteId) {
        Quote src = [SELECT Id, Revision_No__c, Original_Quote__c, IM_Currency__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        Id newId = CreateQuoteController.createRevision(quoteId);
        try {
            Quote rev = [SELECT Id, Revision_No__c, Previous_Revision__c, Original_Quote__c,
                                Has_Quote_Value__c, IM_Currency__c, Quote_Value__c
                         FROM Quote WHERE Id = :newId LIMIT 1];
            Quote fix = new Quote(Id = newId);
            Boolean touch = false;
            if (rev.Has_Quote_Value__c != true && String.isNotBlank(rev.Quote_Value__c)) { fix.Has_Quote_Value__c = true; touch = true; }
            if (rev.Previous_Revision__c == null) { fix.Previous_Revision__c = quoteId; touch = true; }
            if (rev.Original_Quote__c == null)   { fix.Original_Quote__c = (src.Original_Quote__c == null ? quoteId : src.Original_Quote__c); touch = true; }
            if (rev.Revision_No__c == null)      { fix.Revision_No__c = (src.Revision_No__c == null ? 0 : src.Revision_No__c) + 1; touch = true; }
            if (String.isBlank(rev.IM_Currency__c) && String.isNotBlank(src.IM_Currency__c)) { fix.IM_Currency__c = src.IM_Currency__c; touch = true; }
            if (touch) update fix;
        } catch (Exception e) { System.debug('IM revision stamp skipped: ' + e.getMessage()); }
        return newId;
    }

    @AuraEnabled
    public static List<Id> getSubordinateUserIds() {
        return CreateQuoteController.getSubordinateUserIds();
    }
}