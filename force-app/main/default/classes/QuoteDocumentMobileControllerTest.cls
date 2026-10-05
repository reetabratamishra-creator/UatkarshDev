/**
 * Coverage for QuoteDocumentMobileController. getContent* is unsupported in
 * test context, so the controller substitutes a fixed blob when
 * Test.isRunningTest() — the assertions here cover validation, file creation,
 * naming, and record linkage. Deepanjan (17th July 2026)
 */
@isTest
private class QuoteDocumentMobileControllerTest {

    private static Id makeQuote() {
        Opportunity opp = new Opportunity(
            Name = 'Doc Test Opp', StageName = 'Prospecting',
            CloseDate = Date.today().addDays(30));
        insert opp;
        Quote q = new Quote(Name = 'Doc Test Quote', OpportunityId = opp.Id);
        insert q;
        return q.Id;
    }

    @isTest
    static void savesPdfAndLinksToQuote() {
        Id quoteId = makeQuote();

        Test.startTest();
        Id docId = QuoteDocumentMobileController.saveQuoteDocumentToFiles(
            quoteId, '/apex/SomeQuotePdfPage', 'pdf');
        Test.stopTest();

        System.assertNotEquals(null, docId, 'ContentDocumentId expected');
        List<ContentDocumentLink> links = [
            SELECT Id FROM ContentDocumentLink
            WHERE LinkedEntityId = :quoteId AND ContentDocumentId = :docId];
        System.assertEquals(1, links.size(), 'File must be linked to the quote');
        ContentVersion cv = [
            SELECT PathOnClient FROM ContentVersion
            WHERE ContentDocumentId = :docId AND IsLatest = true LIMIT 1];
        System.assert(cv.PathOnClient.endsWith('.pdf'), 'pdf extension expected');
    }

    @isTest
    static void rejectsBadPath() {
        Id quoteId = makeQuote();
        Boolean threw = false;
        try {
            QuoteDocumentMobileController.saveQuoteDocumentToFiles(
                quoteId, 'https://evil.example/steal', 'pdf');
        } catch (AuraHandledException e) {
            threw = true;
        }
        System.assert(threw, 'non-/apex/ path must be rejected');
    }

    @isTest
    static void excelGetsXlsExtension() {
        Id quoteId = makeQuote();
        Id docId = QuoteDocumentMobileController.saveQuoteDocumentToFiles(
            quoteId, '/apex/SomeQuoteExcelPage', 'excel');
        ContentVersion cv = [
            SELECT PathOnClient FROM ContentVersion
            WHERE ContentDocumentId = :docId AND IsLatest = true LIMIT 1];
        System.assert(cv.PathOnClient.endsWith('.xls'), 'xls extension expected');
    }
}