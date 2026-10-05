/**
 * QuoteDocumentMobileController — Deepanjan (17th July 2026)
 *
 * Mobile-only export path for quoteExcelGenerator. The Salesforce mobile app's
 * webview cannot window.open a VF page (blocked/blank) and rendering the VF
 * page in an iframe was crash-reloading the app, so on phones the LWC calls
 * this instead: render the same VF page server-side, save the result as a
 * Salesforce File linked to the quote, and return the ContentDocumentId so the
 * LWC can open the app's NATIVE file previewer (which has download/share).
 *
 * Desktop never calls this class.
 *
 * Notes:
 *  - getContent()/getContentAsPDF() count as callouts (API 44+), so they run
 *    BEFORE any DML in this transaction — order below is deliberate.
 *  - vfPagePath is validated against /apex/<Name> before use; the id parameter
 *    is appended server-side from the quoteId argument, so the client can never
 *    make this fetch an arbitrary URL.
 */
public with sharing class QuoteDocumentMobileController {

    @AuraEnabled
    public static Id saveQuoteDocumentToFiles(Id quoteId, String vfPagePath, String format) {
        if (quoteId == null) {
            throw new AuraHandledException('Quote Id is required.');
        }

        // ── validate the VF path shape: "/apex/PageName" only ────────────────
        String path = vfPagePath == null ? '' : vfPagePath.trim();
        if (!Pattern.matches('^/apex/[A-Za-z0-9_]+$', path)) {
            throw new AuraHandledException('Invalid document page.');
        }

        // ── render the page (callout — must precede all DML) ─────────────────
        PageReference pg = new PageReference(path + '?id=' + String.valueOf(quoteId));
        Blob body;
        try {
            if (Test.isRunningTest()) {
                // getContent* is not supported in test context
                body = Blob.valueOf('TEST-DOCUMENT-BODY');
            } else if (format == 'pdf') {
                body = pg.getContentAsPDF();
            } else {
                body = pg.getContent();
            }
        } catch (Exception e) {
            throw new AuraHandledException('Document rendering failed: ' + e.getMessage());
        }

        // ── file name: QuoteNumber + revision when available ─────────────────
        String ext = format == 'excel' ? 'xls' : (format == 'word' ? 'doc' : 'pdf');
        String quoteNumber = String.valueOf(quoteId);
        Decimal revisionNo = 0;
        try {
            // Revision_No__c may not exist in every org this ships to; the
            // dynamic query keeps the class deployable either way.
            SObject q = Database.query(
                'SELECT QuoteNumber' +
                (revisionFieldExists() ? ', Revision_No__c' : '') +
                ' FROM Quote WHERE Id = :quoteId LIMIT 1');
            quoteNumber = (String) q.get('QuoteNumber');
            if (revisionFieldExists() && q.get('Revision_No__c') != null) {
                revisionNo = (Decimal) q.get('Revision_No__c');
            }
        } catch (Exception ignored) { /* fall back to the Id-based name */ }

        String title = 'Quote_' + quoteNumber
            + (revisionNo > 0 ? '_R' + String.valueOf(revisionNo.intValue()) : '')
            + '_' + Datetime.now().format('yyyyMMdd_HHmm');

        // ── save as a File on the quote ──────────────────────────────────────
        ContentVersion cv = new ContentVersion(
            Title        = title,
            PathOnClient = title + '.' + ext,
            VersionData  = body,
            FirstPublishLocationId = quoteId   // creates the ContentDocumentLink too
        );
        insert cv;

        cv = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];
        return cv.ContentDocumentId;
    }

    private static Boolean revisionFieldExists() {
        return Schema.SObjectType.Quote.fields.getMap().containsKey('revision_no__c');
    }
}