/**
 * QuotePDFControllerTest — Deepanjan (1st August 2026)
 *
 * The class had no test coverage. It is a Visualforce standard-controller
 * extension whose whole job runs in the constructor, so every test here builds
 * a Quote, wraps it in an ApexPages.StandardController and inspects the
 * properties the VF page will read.
 *
 * Two behaviours are worth pinning because the page depends on them:
 *   - the row whose id equals the Quote Id is a summary row and is dropped
 *   - ensureKey() backfills twelve terms-and-conditions defaults, so the page
 *     can render even when the LWC saved nothing
 *
 * Every branch is reachable from a test, so the controller is unchanged.
 */
@IsTest
private class QuotePDFControllerTest {

    /** Inserts an Opportunity and a Quote carrying the given JSON payload. */
    private static Quote makeQuote(String quoteValueJson) {
        Opportunity opp = new Opportunity(
            Name = 'PDF Test Opp', StageName = 'Prospecting',
            CloseDate = Date.today().addDays(30));
        insert opp;

        Quote q = new Quote(
            Name = 'PDF Test Quote',
            OpportunityId = opp.Id,
            Quote_Value__c = quoteValueJson
        );
        insert q;
        return q;
    }

    private static QuotePDFController controllerFor(Quote q) {
        return new QuotePDFController(new ApexPages.StandardController(q));
    }

    // ══════════════════════════════════════════════════════════════════════
    // Line items and totals
    // ══════════════════════════════════════════════════════════════════════
    @IsTest
    static void buildsLineItemsAndSumsTheTotal() {
        Quote q = makeQuote(
            '{"_Saved_Table_Rows":[' +
            '{"id":"row_1","name":"Pole A","quantity":5,"unitPrice":1000},' +
            '{"id":"row_2","name":"Pole B","quantity":2,"unitPrice":250.50}' +
            ']}');

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        Assert.areEqual(2, ctrl.lineItems.size(), 'Both rows should have become line items');
        // 5 * 1000 + 2 * 250.50
        Assert.isTrue(ctrl.totalAmount == 5501, 'Total should be the sum of qty * unitPrice');

        Assert.areEqual(1, ctrl.lineItems[0].get('SlNo'), 'Serial numbers start at one');
        Assert.areEqual(2, ctrl.lineItems[1].get('SlNo'), 'Serial numbers increment per row');
        Assert.isTrue((Decimal) ctrl.lineItems[0].get('lineTotal') == 5000,
            'lineTotal should be qty * unitPrice for the first row');
    }

    @IsTest
    static void dropsTheParentSummaryRow() {
        // The row whose id matches the Quote Id is the parent summary and must
        // not be printed or counted.
        Quote q = makeQuote('{"_Saved_Table_Rows":[]}');
        String json =
            '{"_Saved_Table_Rows":[' +
            '{"id":"' + q.Id + '","name":"SUMMARY","quantity":99,"unitPrice":9999},' +
            '{"id":"row_1","name":"Pole A","quantity":5,"unitPrice":1000}' +
            ']}';
        update new Quote(Id = q.Id, Quote_Value__c = json);

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        Assert.areEqual(1, ctrl.lineItems.size(), 'The summary row should have been skipped');
        Assert.areEqual('Pole A', String.valueOf(ctrl.lineItems[0].get('name')),
            'The surviving row should be the real line item');
        Assert.isTrue(ctrl.totalAmount == 5000,
            'The summary row must not contribute to the total');
    }

    @IsTest
    static void defaultsMissingQuantityToOneAndMissingPriceToZero() {
        Quote q = makeQuote(
            '{"_Saved_Table_Rows":[' +
            '{"id":"row_1","name":"No Qty","unitPrice":400},' +
            '{"id":"row_2","name":"No Price","quantity":7}' +
            ']}');

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        Assert.isTrue((Decimal) ctrl.lineItems[0].get('lineTotal') == 400,
            'A missing quantity should default to one');
        Assert.isTrue((Decimal) ctrl.lineItems[1].get('lineTotal') == 0,
            'A missing unit price should default to zero');
        Assert.isTrue(ctrl.totalAmount == 400, 'Only the priced row contributes to the total');
    }

    @IsTest
    static void readsNumbersHeldAsStrings() {
        // The LWC sometimes serialises these as strings; Decimal.valueOf on the
        // string form is what keeps that working.
        Quote q = makeQuote(
            '{"_Saved_Table_Rows":[{"id":"row_1","quantity":"3","unitPrice":"150.25"}]}');

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        Assert.isTrue(ctrl.totalAmount == 450.75,
            'String-encoded numbers should still be totalled correctly');
    }

    // ══════════════════════════════════════════════════════════════════════
    // Empty, missing and malformed payloads
    // ══════════════════════════════════════════════════════════════════════
    @IsTest
    static void handlesBlankQuoteValue() {
        Quote q = makeQuote(null);

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        Assert.areEqual(0, ctrl.lineItems.size(), 'No payload means no line items');
        Assert.isTrue(ctrl.totalAmount == 0, 'The total should stay at zero');
        Assert.isNotNull(ctrl.jsonData, 'jsonData must still be initialised for the page');
    }

    @IsTest
    static void handlesPayloadWithoutSavedTableRows() {
        Quote q = makeQuote('{"some_other_key":"value"}');

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        Assert.areEqual(0, ctrl.lineItems.size(), 'No _Saved_Table_Rows key means no line items');
        Assert.areEqual('value', String.valueOf(ctrl.jsonData.get('some_other_key')),
            'Other keys in the payload should still be available to the page');
    }

    @IsTest
    static void swallowsMalformedJson() {
        // A parse failure is logged and ignored so the page still renders with
        // defaults rather than throwing at the user.
        Quote q = makeQuote('{ this is not valid json');

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        Assert.areEqual(0, ctrl.lineItems.size(), 'A broken payload should yield no line items');
        Assert.isNotNull(ctrl.jsonData, 'jsonData must survive a parse failure');
        Assert.isNotNull(ctrl.jsonData.get('tc_transportation'),
            'The defaults must still be applied after a parse failure');
    }

    @IsTest
    static void swallowsUnparseableNumbers() {
        // Decimal.valueOf on a non-numeric string throws inside the loop; the
        // outer catch means the page renders instead of erroring out.
        Quote q = makeQuote(
            '{"_Saved_Table_Rows":[{"id":"row_1","quantity":"not-a-number","unitPrice":100}]}');

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        Assert.isNotNull(ctrl.jsonData, 'The controller should survive a bad numeric value');
        Assert.isNotNull(ctrl.jsonData.get('tc_payment_terms'),
            'Defaults are applied after the catch, so they must still be present');
    }

    // ══════════════════════════════════════════════════════════════════════
    // ensureKey defaults
    // ══════════════════════════════════════════════════════════════════════
    @IsTest
    static void backfillsEveryTermsAndConditionsDefault() {
        Quote q = makeQuote('{}');

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        // The page reads all twelve of these directly, so a missing one is a
        // blank cell in the PDF.
        List<String> required = new List<String>{
            'Contact_Person', 'Contact_Number', 'Email',
            'tc_offer_validity', 'tc_delivery_schedule', 'tc_price_variation',
            'tc_payment_terms', 'tc_transportation', 'tc_vehicle_load',
            'tc_tolerance', 'tc_inspection', 'tc_pre_dispatch_inspection'
        };
        for (String key : required) {
            Assert.isTrue(ctrl.jsonData.containsKey(key), 'Missing default for ' + key);
            Assert.isTrue(String.isNotBlank(String.valueOf(ctrl.jsonData.get(key))),
                'Default for ' + key + ' should not be blank');
        }
    }

    @IsTest
    static void keepsSuppliedValuesInsteadOfDefaults() {
        Quote q = makeQuote(
            '{"Contact_Person":"Deepanjan","tc_transportation":"EXCLUDED"}');

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        Assert.areEqual('Deepanjan', String.valueOf(ctrl.jsonData.get('Contact_Person')),
            'A supplied value must never be overwritten by the default');
        Assert.areEqual('EXCLUDED', String.valueOf(ctrl.jsonData.get('tc_transportation')),
            'A supplied value must never be overwritten by the default');
    }

    @IsTest
    static void replacesNullAndBlankValuesWithDefaults() {
        // ensureKey treats a present-but-empty value as missing, which is what
        // stops the PDF printing an empty terms line.
        Quote q = makeQuote(
            '{"Contact_Person":null,"tc_transportation":"","tc_inspection":"   "}');

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        Assert.areEqual('Balindra Kushwaha', String.valueOf(ctrl.jsonData.get('Contact_Person')),
            'A null value should be replaced by the default');
        Assert.areEqual('INCLUDED', String.valueOf(ctrl.jsonData.get('tc_transportation')),
            'An empty string should be replaced by the default');
        Assert.areEqual('Inspection Charges & Expenses: Extra.',
            String.valueOf(ctrl.jsonData.get('tc_inspection')),
            'A whitespace-only value should be replaced by the default');
    }

    // ══════════════════════════════════════════════════════════════════════
    // Simple properties
    // ══════════════════════════════════════════════════════════════════════
    @IsTest
    static void exposesQuoteAndFormattedDate() {
        Quote q = makeQuote('{}');

        Test.startTest();
        QuotePDFController ctrl = controllerFor(q);
        Test.stopTest();

        Assert.areEqual(q.Id, ctrl.quoteRecord.Id, 'The controller should hold the quote it was given');
        Assert.areEqual('PDF Test Quote', ctrl.quoteRecord.Name, 'Quote name should be queried');
        Assert.areEqual(Date.today().format(), ctrl.todayDate,
            'todayDate should be today in the running user locale format');
    }
}