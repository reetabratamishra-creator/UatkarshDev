@isTest
public class LeadConversionProcessTest {

    @TestSetup
    static void setupData() {
        Lead testLead = new Lead(
            FirstName = 'Test',
            LastName  = 'Lead',
            Company   = 'Test Company',
            Status    = 'Open - Not Contacted',
            Email     = 'test@example.com',
            Phone     = '9876543210'
        );
        insert testLead;
    }

    @isTest
    static void testConvertLead_Success() {

        Lead testLead = [SELECT Id FROM Lead WHERE LastName = 'Lead' LIMIT 1];

        LeadConversionProcess.Input input = new LeadConversionProcess.Input();
        input.leadId = testLead.Id;

        List<LeadConversionProcess.Input> inputs = new List<LeadConversionProcess.Input>{ input };

        Test.startTest();
        List<LeadConversionProcess.Output> results = LeadConversionProcess.convertLead(inputs);
        Test.stopTest();

        System.assertEquals(1, results.size());

        LeadConversionProcess.Output res = results[0];

        System.assertEquals('Success', res.status, 'Conversion should succeed: ' + res.status);
        System.assertNotEquals(null, res.accountId,     'Account should be created');
        System.assertNotEquals(null, res.contactId,     'Contact should be created');
        System.assertNotEquals(null, res.opportunityId, 'Opportunity should be created');

        Opportunity opp = [
            SELECT Id, Lead__c
            FROM Opportunity
            WHERE Id = :res.opportunityId
        ];
        System.assertEquals(testLead.Id, opp.Lead__c, 'Lead lookup should be set on Opportunity');
    }

    @isTest
    static void testConvertLead_InvalidLead() {

        // Best Practice: Insert a real Lead and convert it once, then attempt
        // to convert it again — Salesforce handles this gracefully with a
        // proper error rather than throwing an internal exception.
        Lead alreadyConverted = [SELECT Id FROM Lead WHERE LastName = 'Lead' LIMIT 1];

        LeadStatus convertedStatus = [
            SELECT MasterLabel 
            FROM LeadStatus 
            WHERE IsConverted = true 
            LIMIT 1
        ];

        // First conversion — make it a real already-converted lead
        Database.LeadConvert lc = new Database.LeadConvert();
        lc.setLeadId(alreadyConverted.Id);
        lc.setConvertedStatus(convertedStatus.MasterLabel);
        Database.convertLead(lc);

        // Now attempt to convert the same (already converted) lead via our method
        LeadConversionProcess.Input input = new LeadConversionProcess.Input();
        input.leadId = alreadyConverted.Id;

        List<LeadConversionProcess.Input> inputs = new List<LeadConversionProcess.Input>{ input };

        Test.startTest();
        List<LeadConversionProcess.Output> results = LeadConversionProcess.convertLead(inputs);
        Test.stopTest();

        System.assertEquals(1, results.size());

        LeadConversionProcess.Output res = results[0];

        System.assert(
            res.status != null &&
            (res.status.startsWith('Failed') || res.status.startsWith('Error')),
            'Should return failure or error for already-converted lead, got: ' + res.status
        );
    }
}