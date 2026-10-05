public without sharing class OpportunityStageCloseController {

    private static final String CJ_DIRECT = 'Direct Business';
    private static final String CJ_DEALER = 'Refer to Dealer';
    private static final String STAGE_NURTURE = 'Nurture';
    private static final String STAGE_NEGOTIATION = 'Negotiation';
    private static final String STAGE_CLOSED_WON = 'Closed Won';
    private static final String STAGE_CLOSED_LOST = 'Closed Lost';
    private static final String WON = 'Closed Won';
    private static final String LOST = 'Closed Lost';
    private static final String PO_REQUIRED = 'PO is required';

    public class ContextResult {
        @AuraEnabled public Id opportunityId;
        @AuraEnabled public String opportunityName;
        @AuraEnabled public String stageName;
        @AuraEnabled public String customerJourney;
        @AuraEnabled public Decimal amount;
        @AuraEnabled public String departmentNameForBackend;
        @AuraEnabled public Boolean hasOpenTasks;
        @AuraEnabled public Boolean hasFutureEvents;
        @AuraEnabled public Boolean hasOpenVisits;
        @AuraEnabled public Integer openTaskCount;
        @AuraEnabled public Integer futureEventCount;
        @AuraEnabled public Integer openVisitCount;
        @AuraEnabled public String previousStage;
        @AuraEnabled public Boolean validCustomerJourney;
        @AuraEnabled public String validationMessage;

        public ContextResult() {}
    }

    public class CloseResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String message;
        @AuraEnabled public String closedStage;
        @AuraEnabled public String customerJourney;
        @AuraEnabled public String previousStage;
        @AuraEnabled public Integer completedTaskCount;
        @AuraEnabled public Integer updatedEventCount;
        @AuraEnabled public Integer unscheduledVisitCount;
        @AuraEnabled public Boolean quoteCreated;
        @AuraEnabled public Boolean orderCreated;
    }

    @AuraEnabled(cacheable=true)
    public static ContextResult getContext(Id recordId) {
        if (recordId == null) {
            throw new AuraHandledException('Opportunity Id is required.');
        }

        Opportunity opp = [
            SELECT Id,
                   Name,
                   StageName,
                   Customer_Journey__c,
                   Amount,
                   AccountId,
                   Notes__c,
                   DepartmentName_For_Backend__c
            FROM Opportunity
            WHERE Id = :recordId
            LIMIT 1
        ];

        Datetime nowValue = System.now();

        Integer taskCount = [
            SELECT COUNT()
            FROM Task
            WHERE WhatId = :opp.Id
              AND Status = 'Open'
        ];

        Integer eventCount = [
            SELECT COUNT()
            FROM Event
            WHERE WhatId = :opp.Id
              AND StartDateTime > :nowValue
        ];

        Integer visitCount = [
            SELECT COUNT()
            FROM Task_Log__c
            WHERE Opportunity__c = :opp.Id
              AND Is_schedule__c = true
        ];

        ContextResult result = new ContextResult();
        result.opportunityId = opp.Id;
        result.opportunityName = opp.Name;
        result.stageName = opp.StageName;
        result.customerJourney = opp.Customer_Journey__c;
        result.amount = opp.Amount;
        result.departmentNameForBackend = opp.DepartmentName_For_Backend__c;
        result.previousStage = opp.StageName;
        result.openTaskCount = taskCount;
        result.futureEventCount = eventCount;
        result.openVisitCount = visitCount;
        result.hasOpenTasks = taskCount > 0;
        result.hasFutureEvents = eventCount > 0;
        result.hasOpenVisits = visitCount > 0;
        result.validCustomerJourney = opp.Customer_Journey__c == CJ_DIRECT || opp.Customer_Journey__c == CJ_DEALER;
        result.validationMessage = result.validCustomerJourney
            ? null
            : 'Please fill up Customer Journey to change stage';
        return result;
    }

    @AuraEnabled
    public static CloseResult executeClose(
        Id recordId,
        String outcome,
        Decimal expectedDealValue,
        String lostReason,
        String remarks,
        String poUploadRequirement,
        List<String> contentDocumentIds
    ) {
        if (recordId == null) {
            throw new AuraHandledException('Opportunity Id is required.');
        }

        Savepoint sp = Database.setSavepoint();

        try {
            Opportunity opp = [
                SELECT Id,
                       Name,
                       StageName,
                       Customer_Journey__c,
                       Amount,
                       AccountId,
                       Notes__c,
                       DepartmentName_For_Backend__c
                FROM Opportunity
                WHERE Id = :recordId
                LIMIT 1
                FOR UPDATE
            ];

            if (opp.Customer_Journey__c != CJ_DIRECT && opp.Customer_Journey__c != CJ_DEALER) {
                throw new AuraHandledException('Please fill up Customer Journey to change stage');
            }

            String previousStage = opp.StageName;
            Datetime nowValue = System.now();
            Date todayValue = Date.today();
            String runningUserFullName = UserInfo.getFirstName() + ' ' + UserInfo.getLastName();

            // The Flow retrieves these three collections before the screen is shown.
            // Keep the same snapshot semantics rather than re-querying after the Opportunity update.
            List<Task> openTasks = [
                SELECT Id, Status, Description
                FROM Task
                WHERE WhatId = :opp.Id
                  AND Status = 'Open'
            ];
            List<Event> futureEvents = [
                SELECT Id, StartDateTime, Description
                FROM Event
                WHERE WhatId = :opp.Id
                  AND StartDateTime > :nowValue
            ];
            List<Task_Log__c> openVisits = [
                SELECT Id, Is_schedule__c
                FROM Task_Log__c
                WHERE Opportunity__c = :opp.Id
                  AND Is_schedule__c = true
            ];

            // Exact Flow stage/customer-journey branching.
            Boolean opportunityNeedsUpdate = false;
            Boolean quoteMustBeCreated = false;
            Boolean orderMustBeCreated = false;
            String successMessage;

            if (opp.Customer_Journey__c == CJ_DIRECT) {
                if (previousStage == STAGE_NURTURE) {
                    // Flow presents only Closed Lost for Nurture.
                    validateRequired(outcome, LOST, 'Please select Closed Lost.');
                    validateLostReason(lostReason, true);
                    validateRequired(remarks, null, 'Remarks is required.');

                    opp.Closed_By_User__c = runningUserFullName;
                    opp.Closed_Lost_Date_Time__c = nowValue;
                    opp.Lost_Reason__c = lostReason;
                    opp.Notes__c = appendNotes(opp.Notes__c, remarks);
                    opp.StageName = STAGE_CLOSED_LOST;
                    opp.Stage_Lost_From__c = STAGE_NURTURE;
                    opportunityNeedsUpdate = true;
                    successMessage = 'Your Opportunity has been moved to Closed Lost with Lost Reason';
                } else if (previousStage == STAGE_NEGOTIATION) {
                    validateRequired(outcome, null, 'Please select an outcome.');

                    if (outcome == LOST) {
                        validateLostReason(lostReason, false);
                        validateRequired(remarks, null, 'Remarks is required.');

                        opp.Closed_By_User__c = runningUserFullName;
                        opp.Closed_Lost_Date_Time__c = nowValue;
                        opp.Lost_Reason__c = lostReason;
                        opp.Notes__c = appendNotes(opp.Notes__c, remarks);
                        opp.StageName = STAGE_CLOSED_LOST;
                        opp.Stage_Lost_From__c = STAGE_NEGOTIATION;
                        opportunityNeedsUpdate = true;
                        successMessage = 'Your Opportunity has been moved to Closed Lost with Lost Reason';
                    } else if (outcome == WON) {
                        validateRequired(expectedDealValue, 'Expected Deal Value is required.');

                        // PO dropdown controls the upload validation in the Flow only.
                        // The Flow always creates Quote + Order for Direct Business / Negotiation / Won.
                        if (PO_REQUIRED.equals(poUploadRequirement)) {
                            validateFiles(recordId, contentDocumentIds);
                        }

                        opp.Amount = expectedDealValue;
                        opp.Closed_By_User__c = runningUserFullName;
                        opp.Closed_Won_Day_Time__c = nowValue;
                        opp.StageName = STAGE_CLOSED_WON;
                        opp.Stage_Qualified_From__c = previousStage;
                        opportunityNeedsUpdate = true;
                        quoteMustBeCreated = true;
                        orderMustBeCreated = true;
                        successMessage = 'Your Opportunity has been moved to Closed Won. PO has been Uploaded with Order and Quote Creation.';
                    } else {
                        throw new AuraHandledException('Please select an outcome.');
                    }
                }
                // For other stages, the Flow's Update Opportunity decision uses its default path:
                // no Opportunity stage update, but related activities are still cleaned up below.
            } else {
                // Refer to Dealer: Won/Lost is always presented.
                validateRequired(outcome, null, 'Please select an outcome.');

                if (outcome == LOST) {
                    validateLostReason(lostReason, false);
                    validateRequired(remarks, null, 'Remarks is required.');

                    opp.Closed_By_User__c = runningUserFullName;
                    opp.Closed_Lost_Date_Time__c = nowValue;
                    opp.Lost_Reason__c = lostReason;
                    opp.Notes__c = appendNotes(opp.Notes__c, remarks);
                    opp.StageName = STAGE_CLOSED_LOST;
                    // Preserve the Flow exactly, including its value of Negotiation for Refer to Dealer loss.
                    opp.Stage_Lost_From__c = STAGE_NEGOTIATION;
                    opportunityNeedsUpdate = true;
                    successMessage = 'Your Opportunity has been moved to Closed Lost with Lost Reason';
                } else if (outcome == WON) {
                    validateRequired(expectedDealValue, 'Expected Deal Value is required.');
                    validateRequired(poUploadRequirement, null, 'PO upload requirement is required.');

                    if (PO_REQUIRED.equals(poUploadRequirement)) {
                        validateFiles(recordId, contentDocumentIds);
                        orderMustBeCreated = true;
                    }

                    opp.Amount = expectedDealValue;
                    opp.Closed_By_User__c = runningUserFullName;
                    opp.Closed_Won_Day_Time__c = nowValue;
                    opp.Refer_to_Dealer_PO_upload__c = poUploadRequirement;
                    opp.StageName = STAGE_CLOSED_WON;
                    opp.Stage_Qualified_From__c = previousStage;
                    opportunityNeedsUpdate = true;
                    successMessage = 'Your Opportunity has been moved to Closed Won.';
                } else {
                    throw new AuraHandledException('Please select an outcome.');
                }
            }

            if (opportunityNeedsUpdate) {
                update opp;
            }

            Boolean quoteCreated = false;
            Boolean orderCreated = false;

            if (quoteMustBeCreated) {
                String departmentName = String.isBlank(opp.DepartmentName_For_Backend__c)
                    ? ''
                    : opp.DepartmentName_For_Backend__c;
                Quote quoteRecord = new Quote(
                    Name = departmentName + ' Quote',
                    OpportunityId = opp.Id
                );
                insert quoteRecord;
                quoteCreated = true;
            }

            if (orderMustBeCreated) {
                Order orderRecord = new Order(
                    AccountId = opp.AccountId,
                    EffectiveDate = todayValue,
                    Status = 'Draft'
                );
                insert orderRecord;
                orderCreated = true;
            }

            // Flow cleanup sequence: open Tasks -> future Events -> scheduled Task Logs.
            for (Task taskRecord : openTasks) {
                taskRecord.Status = 'Completed';
                taskRecord.Description = 'This Task has been closed as, related Opportunity has been Closed.';
            }
            if (!openTasks.isEmpty()) {
                update openTasks;
            }

            for (Event eventRecord : futureEvents) {
                eventRecord.StartDateTime = nowValue;
                eventRecord.Description = 'This Event has been closed as related Opportunity has been Closed.';
            }
            if (!futureEvents.isEmpty()) {
                update futureEvents;
            }

            for (Task_Log__c visitRecord : openVisits) {
                visitRecord.Is_schedule__c = false;
            }
            if (!openVisits.isEmpty()) {
                update openVisits;
            }

            CloseResult result = new CloseResult();
            result.success = true;
            result.message = successMessage;
            result.closedStage = opportunityNeedsUpdate ? opp.StageName : previousStage;
            result.customerJourney = opp.Customer_Journey__c;
            result.previousStage = previousStage;
            result.completedTaskCount = openTasks.size();
            result.updatedEventCount = futureEvents.size();
            result.unscheduledVisitCount = openVisits.size();
            result.quoteCreated = quoteCreated;
            result.orderCreated = orderCreated;
            return result;
        } catch (AuraHandledException ex) {
            Database.rollback(sp);
            throw ex;
        } catch (Exception ex) {
            Database.rollback(sp);
            throw new AuraHandledException(ex.getMessage());
        }
    }

    private static String appendNotes(String existingNotes, String remarks) {
        if (String.isBlank(existingNotes)) {
            return remarks;
        }
        return existingNotes + '-' + remarks;
    }

    private static void validateRequired(String actualValue, String expectedValue, String message) {
        if (String.isBlank(actualValue) || (expectedValue != null && actualValue != expectedValue)) {
            throw new AuraHandledException(message);
        }
    }

    private static void validateRequired(Decimal actualValue, String message) {
        if (actualValue == null) {
            throw new AuraHandledException(message);
        }
    }

    private static void validateLostReason(String value, Boolean nurture) {
        validateRequired(value, null, 'Lost Reason is required.');

        Set<String> allowed = nurture
            ? new Set<String>{
                'Customer details not received',
                'Not responding',
                'Purchased from Other Brands',
                'Internal Problem',
                'Future Prospect',
                'Price Enquiry',
                'Existing Customer',
                'Out of Service Area',
                'Minimum Quantity not met'
            }
            : new Set<String>{
                'Not responding',
                'Purchased from Other Brands',
                'Internal Problem',
                'Future Prospect',
                'Rate Issue',
                'Tender lost'
            };

        if (!allowed.contains(value)) {
            throw new AuraHandledException('Invalid Lost Reason.');
        }
    }

    private static void validateFiles(Id opportunityId, List<String> contentDocumentIds) {
        if (contentDocumentIds == null || contentDocumentIds.isEmpty()) {
            throw new AuraHandledException('PO is required to proceed.');
        }

        Set<Id> requestedDocumentIds = new Set<Id>();
        for (String documentIdValue : contentDocumentIds) {
            if (!String.isBlank(documentIdValue)) {
                try {
                    requestedDocumentIds.add((Id) documentIdValue);
                } catch (Exception ignored) {
                    // Leave invalid IDs out; the final size check below handles them.
                }
            }
        }

        if (requestedDocumentIds.isEmpty()) {
            throw new AuraHandledException('PO is required to proceed.');
        }

        Integer linkedCount = [
            SELECT COUNT()
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :opportunityId
              AND ContentDocumentId IN :requestedDocumentIds
        ];

        if (linkedCount == 0) {
            throw new AuraHandledException('PO is required to proceed.');
        }
    }
}