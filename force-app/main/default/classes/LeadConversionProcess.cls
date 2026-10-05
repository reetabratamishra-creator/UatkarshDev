public class LeadConversionProcess {

    public class Input {
        @InvocableVariable(required=true)
        public Id leadId;

        // Optional Account Id
        @InvocableVariable
        public Id accId;
    }

    public class Output {
        @InvocableVariable public Id accountId;
        @InvocableVariable public Id contactId;
        @InvocableVariable public Id opportunityId;
        @InvocableVariable public String status;
    }

    @InvocableMethod(label='Convert Lead')
    public static List<Output> convertLead(List<Input> inputs) {

        List<Output> results = new List<Output>();

        // Extract Lead Ids
        List<Id> leadIds = new List<Id>();
        for (Input inp : inputs) {
            if (inp.leadId != null) {
                leadIds.add(inp.leadId);
            }
        }

        // Get converted status
        LeadStatus convertStatus = [
            SELECT MasterLabel
            FROM LeadStatus
            WHERE IsConverted = true
            LIMIT 1
        ];

        // Get Record Types
        Map<String, Schema.RecordTypeInfo> accRTs =
            Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName();

        Id accountRecordTypeId = accRTs.containsKey('End_Customer')
            ? accRTs.get('End_Customer').getRecordTypeId()
            : null;

        Map<String, Schema.RecordTypeInfo> oppRTs =
            Schema.SObjectType.Opportunity.getRecordTypeInfosByDeveloperName();

        Id opportunityRecordTypeId = oppRTs.containsKey('Master_Opportunity')
            ? oppRTs.get('Master_Opportunity').getRecordTypeId()
            : null;

        // Get Leads
        Map<Id, Lead> leadMap = new Map<Id, Lead>(
            [
                SELECT Id, Department_Name__c, Company, Name, City, State, Country, Customer_Category__c
                FROM Lead
                WHERE Id IN :leadIds
            ]
        );

        // Bulk update lists
        List<Account> accountsToUpdate = new List<Account>();
        List<Opportunity> oppsToUpdate = new List<Opportunity>();

        for (Input inp : inputs) {

            Output out = new Output();

            try {

                Lead ldCheck = leadMap.get(inp.leadId);
                if (ldCheck != null) {
                    Boolean needsUpdate = false;
                    if (String.isBlank(ldCheck.City)) {
                        ldCheck.City = 'Unknown';
                        needsUpdate = true;
                    }
                    if (String.isBlank(ldCheck.State)) {
                        ldCheck.State = 'Bihar';
                        needsUpdate = true;
                    }
                    if (String.isBlank(ldCheck.Country)) {
                        ldCheck.Country = 'India';
                        needsUpdate = true;
                    }
                    if (String.isBlank(ldCheck.Customer_Category__c)) {
                        ldCheck.Customer_Category__c = 'EPC';
                        needsUpdate = true;
                    }
                    if (String.isBlank(ldCheck.Company)) {
                        ldCheck.Company = 'Unknown';
                        needsUpdate = true;
                    }
                    if (needsUpdate) {
                        update ldCheck;
                    }
                }

                Database.LeadConvert lc = new Database.LeadConvert();
                lc.setLeadId(inp.leadId);
                lc.setConvertedStatus(convertStatus.MasterLabel);
                lc.setDoNotCreateOpportunity(false);

                // =========================================
                // If Account Id is provided
                // use existing account
                // =========================================
                if (inp.accId != null) {
                    lc.setAccountId(inp.accId);
                }

                Database.LeadConvertResult lcr = Database.convertLead(lc);

                if (lcr.isSuccess()) {

                    out.accountId = lcr.getAccountId();
                    out.contactId = lcr.getContactId();
                    out.opportunityId = lcr.getOpportunityId();

                    Lead ld = leadMap.get(inp.leadId);

                    // Build Opportunity Name
                    String oppName = '';

                    if (ld != null) {

                        String dept =
                            ld.Department_Name__c != null
                            ? ld.Department_Name__c
                            : '';

                        String accName =
                            ld.Company != null
                            ? ld.Company
                            : '';

                        String custName =
                            ld.Name != null
                            ? ld.Name
                            : '';

                        oppName =
                            dept + ' - ' +
                            accName + ' - ' +
                            custName;
                    }

                    // =========================================
                    // Update Account Record Type
                    // ONLY when new account is created
                    // =========================================
                    if (
                        inp.accId == null &&
                        out.accountId != null &&
                        accountRecordTypeId != null
                    ) {

                        accountsToUpdate.add(
                            new Account(
                                Id = out.accountId,
                                RecordTypeId = accountRecordTypeId
                            )
                        );
                    }

                    // Opportunity update
                    if (out.opportunityId != null) {

                        Opportunity opp = new Opportunity(
                            Id = out.opportunityId,
                            Name = oppName,
                            Lead__c = inp.leadId
                        );

                        if (opportunityRecordTypeId != null) {
                            opp.RecordTypeId = opportunityRecordTypeId;
                        }

                        oppsToUpdate.add(opp);
                    }

                    out.status = 'Success';

                } else {

                    String errMsg = '';

                    for (Database.Error err : lcr.getErrors()) {
                        errMsg += err.getMessage() + ' | ';
                    }

                    out.status = 'Failed: ' + errMsg;
                }

            } catch (Exception e) {

                out.status = 'Error: ' + e.getMessage();
            }

            results.add(out);
        }

        // Bulk Update Accounts
        if (!accountsToUpdate.isEmpty()) {
            update accountsToUpdate;
        }

        // Bulk Update Opportunities
        if (!oppsToUpdate.isEmpty()) {
            update oppsToUpdate;
        }

        return results;
    }
}