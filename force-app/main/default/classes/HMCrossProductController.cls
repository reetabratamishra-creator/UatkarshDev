/*
* Class Name  : HMCrossProductController
* Author      : Deepanjan
* Date        : 27 September 2026
* Description : HIGH MAST CROSS PRODUCT - server side for the temporary hmQuoteTest host.
*
*   A High Mast quote with 2+ products is saved with _HM_Products in Quote_Value__c.
*   The existing classes (CreateQuoteController, HighMastSOWController,
*   HMScopeCombinedController, HighMastWeightCalcController) and their pages are NOT
*   touched; a cross-product quote is printed by the new copies
*   HighMastSOWControllerCP / HMScopeCombinedControllerCP / HighMastWeightCalcControllerCP
*   and the pages HMScopeSingleCP / HMScopeCombinedCP / HMWeightCalaculationMACP.
*
*   A High Mast quote saved in the COMPACT shape (_HM_V = 2 - a large 2+ product quote,
*   or a one-product quote too long for Quote_Value__c in the plain shape; Deepanjan,
*   28 September 2026) is read only by the CP classes, so it takes the same path here,
*   whatever its product count. The CP classes print a compact one-product quote exactly
*   as the original classes print the plain one.
*
*   [hm-stadium] A one-product STADIUM MAST quote with 2+ Man Riding Lifts or 2+ Ladders
*   With Cage takes the same path too (Deepanjan, 29 September 2026): the mapped pages
*   print lift / ladder 1 only, the CP pages print every lift and ladder.
*
*   Every method here first asks "is this a cross-product quote?". If NOT, it hands the
*   call straight to the existing CreateQuoteController method with the same arguments,
*   so every other quote (and every other department) behaves exactly as today. Only a
*   cross-product quote takes the new path, which is a line-for-line copy of the
*   existing method with the CP controller / CP pages swapped in. ("Cross-product" here
*   = what isCrossProduct() says: 2+ High Mast products, the compact shape, or - see
*   [hm-stadium] - a Stadium with 2+ lifts / ladders.)
*
*   Methods (the first three: same names and signatures as in CreateQuoteController):
*     captureQuoteTotal(quoteId)                       - APPLY: Final_Quote_Amount__c only
*     captureOfferTotal(quoteId, opportunityId)        - approval: + Opportunity.Amount + stage rule
*     finalizeQuoteAndAttachDocs(opportunityId, quoteId) - Finalize: attaches the CP pages
*     getCrossProductDocuments(quoteId)                - the document list for the host's panel
*
*   CP pages are found by name: for every Document_Template_Mapping__mdt page of the
*   department, "<Page>CP" is used when a Visualforce page with that name exists,
*   otherwise the mapped page itself. No metadata is added or changed.
*/
public class HMCrossProductController {

    // ─────────────────────────────────────────────────────────────────────────
    // Cross-product detection
    // ─────────────────────────────────────────────────────────────────────────
    @TestVisible
    private static Boolean isCrossProduct(Id quoteId) {
        if (quoteId == null) return false;
        List<Quote> qs = [SELECT Id, Quote_Value__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        if (qs.isEmpty() || String.isBlank(qs[0].Quote_Value__c)) return false;
        try {
            Map<String, Object> qv = (Map<String, Object>) JSON.deserializeUntyped(qs[0].Quote_Value__c);
            String dept = qv.get('_Saved_Template_Name') == null ? '' : String.valueOf(qv.get('_Saved_Template_Name'));
            if (!dept.containsIgnoreCase('High Mast')) return false;
            // compact shape: only the CP classes can read it (one product or more)
            if (qv.get('_HM_V') != null && String.valueOf(qv.get('_HM_V')) == '2') return true;
            // [hm-stadium] a Stadium with 2+ Man Riding Lifts or 2+ Ladders With Cage: the mapped
            // pages print lift / ladder 1 only, the CP pages print every one. Deepanjan (29th September 2026)
            if (hmStadiumCopies(qv)) return true;
            Object prods = qv.get('_HM_Products');
            return (prods instanceof List<Object>) && ((List<Object>) prods).size() > 1;
        } catch (Exception e) {
            return false;
        }
    }

    // [hm-stadium] Customized Mast / STADIUM MAST with MAN RIDING LIFT COUNT or LADDER WITH
    // CAGE COUNT above 1 (and that type ticked). Deepanjan (29th September 2026)
    @TestVisible
    private static Boolean hmStadiumCopies(Map<String, Object> qv) {
        if (qv == null) return false;
        String t = qv.get('type_of_mast') == null ? '' : String.valueOf(qv.get('type_of_mast')).trim();
        String c = qv.get('mast_customized') == null ? '' : String.valueOf(qv.get('mast_customized')).trim();
        if (!t.equalsIgnoreCase('Customized Mast') || !c.equalsIgnoreCase('STADIUM MAST')) return false;
        return (hmOn(qv.get('man_riding_lift')) && hmNum(qv.get('man_riding_lift_count')) > 1)
            || (hmOn(qv.get('ladder_with_cage')) && hmNum(qv.get('ladder_with_cage_count')) > 1);
    }
    // ticked = true / 'true' / '1' - the same reading cmBool gives the documents
    private static Boolean hmOn(Object v) {
        if (v == null) return false;
        String s = String.valueOf(v).trim();
        return s.equalsIgnoreCase('true') || s == '1';
    }
    private static Decimal hmNum(Object v) {
        if (v == null) return 0;
        try { return Decimal.valueOf(String.valueOf(v).trim()); } catch (Exception e) { return 0; }
    }

    // Same figure the existing High Mast branch of resolveOfferTotal computes, read
    // from the CP Single Scope controller (the one that knows every product).
    // Errors are swallowed and null returned, exactly as resolveOfferTotal does for every
    // department: a document controller that throws must never block the approval or
    // skip the Nurture -> Negotiation stage rule in captureOfferTotal. (Audit of 28th
    // September 2026 - this method used to let the exception through.)
    @TestVisible
    private static Decimal crossProductTotal(Id quoteId) {
        try {
            Quote q = [SELECT Id, Name, Quote_Value__c FROM Quote WHERE Id = :quoteId LIMIT 1];
            HighMastSOWControllerCP hm = new HighMastSOWControllerCP(new ApexPages.StandardController(q));
            if (hm.lineItems == null || hm.lineItems.isEmpty()) return null;
            Decimal t = 0;
            for (HighMastSOWControllerCP.LineItemWrapper w : hm.lineItems) {
                if (w.totalAmountRaw != null) t += w.totalAmountRaw.setScale(2, RoundingMode.HALF_UP);
            }
            return t <= 0 ? null : t.setScale(2, RoundingMode.HALF_UP);
        } catch (Exception ex) {
            System.debug('Offer total failed for High Mast (cross product): ' + ex.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPLY - copy of CreateQuoteController.captureQuoteTotal
    // ─────────────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void captureQuoteTotal(Id quoteId) {
        if (!isCrossProduct(quoteId)) {
            CreateQuoteController.captureQuoteTotal(quoteId);
            return;
        }
        try {
            Decimal total = crossProductTotal(quoteId);
            if (total != null) {
                update new Quote(Id = quoteId, Final_Quote_Amount__c = total);
            }
        } catch (Exception e) {
            System.debug('Quote total capture failed: ' + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPROVAL - copy of CreateQuoteController.captureOfferTotal
    // ─────────────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void captureOfferTotal(Id quoteId, Id opportunityId) {
        if (!isCrossProduct(quoteId)) {
            CreateQuoteController.captureOfferTotal(quoteId, opportunityId);
            return;
        }
        try {
            Decimal total = crossProductTotal(quoteId);

            if (total != null) {
                update new Quote(Id = quoteId, Final_Quote_Amount__c = total);
            }

            Opportunity opp = [SELECT Id, StageName, CloseDate, Customer_Journey__c
                               FROM Opportunity WHERE Id = :opportunityId LIMIT 1];
            Boolean changed = false;
            if (total != null) { opp.Amount = total; changed = true; }
            if (opp.StageName == 'Nurture' && opp.Customer_Journey__c == 'Direct Business') {
                opp.StageName = 'Negotiation'; changed = true;
            }
            if (changed) update opp;
        } catch (Exception e) {
            throw new AuraHandledException('Offer capture failed: ' + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FINALIZE - copy of CreateQuoteController.finalizeQuoteAndAttachDocs; the only
    // difference is cpUrl() on each mapped page.
    // ─────────────────────────────────────────────────────────────────────────
    @AuraEnabled
    public static void finalizeQuoteAndAttachDocs(Id opportunityId, Id quoteId) {
        if (!isCrossProduct(quoteId)) {
            CreateQuoteController.finalizeQuoteAndAttachDocs(opportunityId, quoteId);
            return;
        }
        try {
            // 1. Fetch Active Quote
            Quote activeQuote = [SELECT Id, QuoteNumber, Final_Quote_Amount__c, submition_date__c, LastModifiedDate, Name, Quote_Value__c
                                 FROM Quote
                                 WHERE Id = :quoteId LIMIT 1];

            // 2. Department from Quote_Value__c JSON
            String targetDepartment = departmentOf(activeQuote);

            // 3. Query Document Mappings
            List<Document_Template_Mapping__mdt> mappings = [SELECT Excel_VF_Page__c, PDF_VF_Page__c, Word_VF_Page__c, Template_Type__c, offer_document__c
                                                             FROM Document_Template_Mapping__mdt
                                                             WHERE Department__c = :targetDepartment];
            Set<String> cpPages = existingCpPages(mappings);

            // 4. Prepare Files and Track Offer Templates
            List<ContentVersion> filesToInsert = new List<ContentVersion>();
            Set<String> offerDocTitles = new Set<String>();

            for (Document_Template_Mapping__mdt mapRule : mappings) {
                String docNameTag = String.isNotBlank(mapRule.Template_Type__c) ? mapRule.Template_Type__c : 'Template';
                String title = docNameTag + '_' + activeQuote.QuoteNumber;

                if (mapRule.offer_document__c == true) {
                    offerDocTitles.add(title);
                }

                if (String.isNotBlank(mapRule.Excel_VF_Page__c)) {
                    filesToInsert.add(createContentVersion(cpUrl(mapRule.Excel_VF_Page__c, cpPages), activeQuote.Id, title + '.xls'));
                }
                if (String.isNotBlank(mapRule.PDF_VF_Page__c)) {
                    filesToInsert.add(createContentVersion(cpUrl(mapRule.PDF_VF_Page__c, cpPages), activeQuote.Id, title + '.pdf'));
                }
                if (String.isNotBlank(mapRule.Word_VF_Page__c)) {
                    filesToInsert.add(createContentVersion(cpUrl(mapRule.Word_VF_Page__c, cpPages), activeQuote.Id, title + '.doc'));
                }
            }

            // 5. Cleanup Previous Quote Files on Opportunity
            List<ContentDocumentLink> links = [SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = :opportunityId];
            if (!links.isEmpty()) {
                Set<Id> docIds = new Set<Id>();
                for (ContentDocumentLink link : links) {
                    docIds.add(link.ContentDocumentId);
                }

                String titleEndPattern = '%_' + activeQuote.QuoteNumber + '%';
                List<ContentDocument> oldDocs = [SELECT Id FROM ContentDocument
                                                 WHERE Id IN :docIds
                                                 AND (Title LIKE :titleEndPattern
                                                      OR Title LIKE 'Finalized_%'
                                                      OR Description = 'Generated via Quote Finalization')];
                if (!oldDocs.isEmpty()) {
                    delete oldDocs;
                }
            }

            // 6. Insert ContentVersions & Create Document Links
            List<String> offerDocIds = new List<String>();

            if (!filesToInsert.isEmpty()) {
                insert filesToInsert;

                Set<Id> insertedCvIds = new Map<Id, ContentVersion>(filesToInsert).keySet();
                List<ContentDocumentLink> newLinks = new List<ContentDocumentLink>();

                for (ContentVersion cv : [SELECT Title, ContentDocumentId, FileExtension, PathOnClient FROM ContentVersion WHERE Id IN :insertedCvIds]) {
                    newLinks.add(new ContentDocumentLink(
                        LinkedEntityId = opportunityId,
                        ContentDocumentId = cv.ContentDocumentId,
                        ShareType = 'V',
                        Visibility = 'AllUsers'
                    ));

                    Boolean isPdf = (cv.FileExtension == 'pdf' ||
                                    (cv.PathOnClient != null && cv.PathOnClient.endsWithIgnoreCase('.pdf')) ||
                                    cv.Title.endsWithIgnoreCase('.pdf'));

                    String titleWithoutExtension = cv.Title.substringBeforeLast('.');

                    if ((offerDocTitles.contains(cv.Title) || offerDocTitles.contains(titleWithoutExtension)) && isPdf) {
                        offerDocIds.add(cv.ContentDocumentId);
                    }
                }
                insert newLinks;
            }

            // 7. Update Opportunity Details and Offer Document IDs
            Date updatedCloseDate = (activeQuote.LastModifiedDate != null ? activeQuote.LastModifiedDate.date() : Date.today()).addDays(15);

            update new Opportunity(
                Id = opportunityId,
                SyncedQuoteId = activeQuote.Id,
                Amount = activeQuote.Final_Quote_Amount__c,
                StageName = 'Negotiation',
                CloseDate = updatedCloseDate,
                Final_Quote_Document_ID__c = !offerDocIds.isEmpty() ? String.join(offerDocIds, ',') : null
            );

        } catch (Exception ex) {
            throw new AuraHandledException('Finalization Error: ' + ex.getMessage());
        }
    }

    // Copy of CreateQuoteController.createContentVersion (private there).
    private static ContentVersion createContentVersion(String vfPageUrl, Id quoteId, String fileName) {
        PageReference pageRef = new PageReference(vfPageUrl);
        pageRef.getParameters().put('id', quoteId);

        Blob fileBlob;
        try {
            fileBlob = Test.isRunningTest() ? Blob.valueOf('Test Unit Blob') : pageRef.getContent();
        } catch (Exception e) {
            fileBlob = Blob.valueOf('Error parsing file content buffer: ' + e.getMessage());
        }

        return new ContentVersion(
            Title = fileName.substringBeforeLast('.'),
            PathOnClient = fileName,
            VersionData = fileBlob,
            Description = 'Generated via Quote Finalization'
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Document list for the host's "Generate Offer Document" panel on a
    // cross-product quote: every mapped page of the department, swapped to its CP
    // page, plus the Quote Reference for the downloaded file name.
    // ─────────────────────────────────────────────────────────────────────────
    public class DocRow {
        @AuraEnabled public String label;     // Template_Type__c, e.g. "Scope Combined"
        @AuraEnabled public String page;      // bare page name, e.g. "HMScopeCombinedCP"
        @AuraEnabled public String docType;   // pdf | word | excel
        @AuraEnabled public Boolean offer;    // offer_document__c
    }
    public class DocInfo {
        @AuraEnabled public Boolean crossProduct;
        @AuraEnabled public String fileName;  // Quote_Reference__c, else QuoteNumber
        @AuraEnabled public List<DocRow> docs;
    }

    @AuraEnabled
    public static DocInfo getCrossProductDocuments(Id quoteId) {
        DocInfo info = new DocInfo();
        info.docs = new List<DocRow>();
        info.crossProduct = isCrossProduct(quoteId);
        if (quoteId == null) return info;
        try {
            Quote q = [SELECT Id, Name, QuoteNumber, Quote_Reference__c, Quote_Value__c FROM Quote WHERE Id = :quoteId LIMIT 1];
            info.fileName = String.isNotBlank(q.Quote_Reference__c) ? q.Quote_Reference__c : q.QuoteNumber;
            String dept = departmentOf(q);
            List<Document_Template_Mapping__mdt> mappings = [
                SELECT Template_Type__c, PDF_VF_Page__c, Excel_VF_Page__c, Word_VF_Page__c, offer_document__c
                FROM Document_Template_Mapping__mdt
                WHERE Department__c = :dept
                ORDER BY Template_Type__c ASC
            ];
            Set<String> cpPages = existingCpPages(mappings);
            for (Document_Template_Mapping__mdt m : mappings) {
                addDoc(info, m, m.PDF_VF_Page__c, 'pdf', cpPages);
                addDoc(info, m, m.Word_VF_Page__c, 'word', cpPages);
                addDoc(info, m, m.Excel_VF_Page__c, 'excel', cpPages);
            }
        } catch (Exception e) {
            throw new AuraHandledException('Could not load the documents: ' + e.getMessage());
        }
        return info;
    }

    private static void addDoc(DocInfo info, Document_Template_Mapping__mdt m, String url, String docType, Set<String> cpPages) {
        if (String.isBlank(url)) return;
        String bare = bareName(cpUrl(url, cpPages));
        if (String.isBlank(bare)) return;
        DocRow r = new DocRow();
        r.label   = String.isNotBlank(m.Template_Type__c) ? m.Template_Type__c : 'Document';
        r.page    = bare;
        r.docType = docType;
        r.offer   = m.offer_document__c == true;
        info.docs.add(r);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // helpers
    // ─────────────────────────────────────────────────────────────────────────
    private static String departmentOf(Quote q) {
        String dept = q.Name;
        if (String.isNotBlank(q.Quote_Value__c)) {
            try {
                Map<String, Object> qv = (Map<String, Object>) JSON.deserializeUntyped(q.Quote_Value__c);
                if (qv.get('_Saved_Template_Name') != null) {
                    dept = String.valueOf(qv.get('_Saved_Template_Name'));
                }
            } catch (Exception jsonEx) {
                // Fallback to Quote.Name, same as the existing finalize
            }
        }
        return dept;
    }

    // "/apex/HMScopeCombined?x=1" -> "HMScopeCombined"
    @TestVisible
    private static String bareName(String url) {
        if (String.isBlank(url)) return null;
        String path = url.substringBefore('?');
        String bare = path.contains('/') ? path.substringAfterLast('/') : path;
        return Pattern.matches('[A-Za-z0-9_]+', bare) ? bare : null;
    }

    // lower-cased names of the "<Page>CP" pages that exist for these mappings
    private static Set<String> existingCpPages(List<Document_Template_Mapping__mdt> mappings) {
        Set<String> wanted = new Set<String>();
        for (Document_Template_Mapping__mdt m : mappings) {
            for (String u : new List<String>{ m.PDF_VF_Page__c, m.Word_VF_Page__c, m.Excel_VF_Page__c }) {
                String b = bareName(u);
                if (b != null) wanted.add(b + 'CP');
            }
        }
        Set<String> found = new Set<String>();
        if (wanted.isEmpty()) return found;
        for (ApexPage p : [SELECT Name FROM ApexPage WHERE Name IN :wanted]) {
            found.add(p.Name.toLowerCase());
        }
        return found;
    }

    // "/apex/HMScopeCombined" -> "/apex/HMScopeCombinedCP" when that page exists
    @TestVisible
    private static String cpUrl(String url, Set<String> cpPages) {
        String bare = bareName(url);
        if (bare == null || cpPages == null || !cpPages.contains((bare + 'CP').toLowerCase())) return url;
        String path  = url.substringBefore('?');
        String query = url.contains('?') ? '?' + url.substringAfter('?') : '';
        String prefix = path.substring(0, path.length() - bare.length());
        return prefix + bare + 'CP' + query;
    }
}