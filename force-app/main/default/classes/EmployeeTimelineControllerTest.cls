@isTest
public class EmployeeTimelineControllerTest {

    @TestSetup
    static void setupData() {
        // Create an Employee
        Employee__c emp = new Employee__c(
            Current_Status__c = 'OUT'
        );
        insert emp;

        // Create Punch Records
        Punch_Record__c punchUser = new Punch_Record__c(
            User__c = UserInfo.getUserId(),
            Punch_Time__c = System.now()
        );
        insert punchUser;

        Punch_Record__c punchEmp = new Punch_Record__c(
            Employee__c = emp.Id,
            Punch_Time__c = System.now()
        );
        insert punchEmp;

        // Create Account/Site
        Account acc = new Account(
            Name = 'Test Account',
            Location__Latitude__s = 12.9716,
            Location__Longitude__s = 77.5946
        );
        insert acc;

        // Create Lead
        Lead ld = new Lead(
            FirstName = 'John',
            LastName = 'Doe',
            Company = 'Test Company',
            Status = 'Open - Not Contacted',
            Email = 'john.doe@example.com',
            Phone = '9876543210',
            Location__Latitude__s = 12.9720,
            Location__Longitude__s = 77.5950,
            Customer_Category__c = 'EPC',
            Product_Category__c = 'solar tubes',
            Department_Name__c = 'Solar Structure',
            UOM__c = 'Metric Ton',
            Quantity__c = 1
        );
        insert ld;

        // Create Opportunity
        Opportunity opp = new Opportunity(
            Name = 'Test Opportunity',
            AccountId = acc.Id,
            StageName = 'Qualification',
            CloseDate = Date.today().addDays(30),
            Location__Latitude__s = 12.9710,
            Location__Longitude__s = 77.5940
        );
        insert opp;
    }

    @isTest
    static void testGetEmployeeTimeline() {
        Employee__c emp = [SELECT Id FROM Employee__c LIMIT 1];
        Punch_Record__c prUser = [SELECT Id FROM Punch_Record__c WHERE User__c = :UserInfo.getUserId() LIMIT 1];
        Punch_Record__c prEmp = [SELECT Id FROM Punch_Record__c WHERE Employee__c = :emp.Id LIMIT 1];

        // Insert Task Logs
        Task_Log__c log1 = new Task_Log__c(
            Punch_Record__c = prUser.Id,
            Reason_for_Visit__c = 'Test User Visit',
            IsCheckout__c = false
        );
        insert log1;

        Task_Log__c log2 = new Task_Log__c(
            Employee__c = emp.Id,
            Punch_Record__c = prEmp.Id,
            Reason_for_Visit__c = 'Test Emp Visit',
            IsCheckout__c = false
        );
        insert log2;

        Test.startTest();
        // 1. Get timeline by User Id
        List<EmployeeTimelineController.TimelineItemDTO> timelineUser = EmployeeTimelineController.getEmployeeTimeline(UserInfo.getUserId(), 10);
        // 2. Get timeline by Employee Id
        List<EmployeeTimelineController.TimelineItemDTO> timelineEmp = EmployeeTimelineController.getEmployeeTimeline(emp.Id, 10);
        // 3. Get timeline with null Id
        List<EmployeeTimelineController.TimelineItemDTO> timelineNull = EmployeeTimelineController.getEmployeeTimeline(null, 10);
        Test.stopTest();

        System.assertEquals(1, timelineUser.size(), 'Should return 1 item for User');
        System.assertEquals('Test User Visit', timelineUser[0].description);
        System.assertEquals(1, timelineEmp.size(), 'Should return 1 item for Employee');
        System.assertEquals('Test Emp Visit', timelineEmp[0].description);
        System.assertEquals(0, timelineNull.size(), 'Should return empty list for null input');
    }

    @isTest
    static void testAddEmployeeTimelineItem() {
        Employee__c emp = [SELECT Id FROM Employee__c LIMIT 1];
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Lead ld = [SELECT Id FROM Lead LIMIT 1];
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];

        String fakeSelfie = 'data:image/jpeg;base64,' + EncodingUtil.base64Encode(Blob.valueOf('SELFIE_DATA'));

        Test.setMock(HttpCalloutMock.class, new MapboxCheckInMock());
        Test.startTest();
        // 1. Add item with Lead ID
        EmployeeTimelineController.TimelineItemDTO item1 = EmployeeTimelineController.addEmployeeTimelineItem(
            UserInfo.getUserId(), 'Visit Lead', null, 12.9716, 77.5946, 
            'Follow up', 'Leads', 'Intro Meeting', '', '', '', '', '', false, fakeSelfie, ld.Id, null, null
        );

        // 2. Add item with Account ID
        EmployeeTimelineController.TimelineItemDTO item2 = EmployeeTimelineController.addEmployeeTimelineItem(
            UserInfo.getUserId(), 'Visit Acc', null, 12.9716, 77.5946, 
            'Follow up', 'NoEnquiry', 'Intro Meeting', '', '', '', '', '', false, null, null, acc.Id, null
        );

        // 3. Add item with Opportunity ID
        EmployeeTimelineController.TimelineItemDTO item3 = EmployeeTimelineController.addEmployeeTimelineItem(
            UserInfo.getUserId(), 'Visit Opp', null, 12.9716, 77.5946, 
            'Follow up', 'Opps', 'Intro Meeting', '', '', '', '', '', false, null, null, null, opp.Id
        );

        // 4. Add item with Employee Id (non-user path)
        EmployeeTimelineController.TimelineItemDTO itemEmp = EmployeeTimelineController.addEmployeeTimelineItem(
            emp.Id, 'Visit Emp', null, 12.9716, 77.5946, 
            'Follow up', 'NoEnquiry', 'Intro Meeting', '', '', '', '', '', false, null, null, acc.Id, null
        );

        // 5. Add item using Legacy clientId logic (clientId is Account)
        EmployeeTimelineController.TimelineItemDTO itemLegacyAcc = EmployeeTimelineController.addEmployeeTimelineItem(
            UserInfo.getUserId(), 'Visit Legacy Acc', acc.Id, 12.9716, 77.5946, 
            'Follow up', 'NoEnquiry', 'Intro Meeting', '', '', '', '', '', false, null, null, null, null
        );

        // 6. Add item using Legacy clientId logic (clientId is Opportunity)
        EmployeeTimelineController.TimelineItemDTO itemLegacyOpp = EmployeeTimelineController.addEmployeeTimelineItem(
            UserInfo.getUserId(), 'Visit Legacy Opp', opp.Id, 12.9716, 77.5946, 
            'Follow up', 'Opps', 'Intro Meeting', '', '', '', '', '', false, null, null, null, null
        );

        // 7. Add item using Legacy clientId logic (clientId is Lead)
        EmployeeTimelineController.TimelineItemDTO itemLegacyLead = EmployeeTimelineController.addEmployeeTimelineItem(
            UserInfo.getUserId(), 'Visit Legacy Lead', ld.Id, 12.9716, 77.5946, 
            'Follow up', 'Leads', 'Intro Meeting', '', '', '', '', '', false, null, null, null, null
        );

        // 8. Exception case - Employee Id null
        try {
            EmployeeTimelineController.addEmployeeTimelineItem(
                null, 'Fail', null, null, null, '', '', '', '', '', '', '', '', false, null, null, null, null
            );
            System.assert(false, 'Should have thrown exception for null Employee Id');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Employee Id is required'));
        }

        // 9. Exception case - No punch record
        try {
            // Delete punch records
            delete [SELECT Id FROM Punch_Record__c];
            EmployeeTimelineController.addEmployeeTimelineItem(
                UserInfo.getUserId(), 'Fail', null, null, null, '', '', '', '', '', '', '', '', false, null, null, null, null
            );
            System.assert(false, 'Should have thrown exception for no punch record');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('No punch record found'));
        }

        Test.stopTest();

        System.assertNotEquals(null, item1.id);
        System.assertEquals('Intro Meeting', item1.description);
        System.assertEquals('John Doe', item1.clientName);

        System.assertNotEquals(null, item2.id);
        System.assertEquals('Test Account', item2.clientName);

        System.assertNotEquals(null, item3.id);
        System.assertEquals('Test Opportunity', item3.clientName);

        System.assertNotEquals(null, itemEmp.id);
        System.assertNotEquals(null, itemLegacyAcc.id);
        System.assertNotEquals(null, itemLegacyOpp.id);
        System.assertNotEquals(null, itemLegacyLead.id);
    }

    @isTest
    static void testGetNearbyClients() {
        Test.startTest();
        List<EmployeeTimelineController.ClientOptionDTO> clients = EmployeeTimelineController.getNearbyClients(12.9716, 77.5946, 10);
        Test.stopTest();

        System.assert(clients.size() > 0, 'Should find nearby Account, Opp, or Lead');
        System.assertNotEquals(null, clients[0].id);
        System.assertNotEquals(null, clients[0].name);
        System.assertNotEquals(null, clients[0].distanceKm);

        // Verify exception for null inputs
        try {
            EmployeeTimelineController.getNearbyClients(null, null, 10);
            System.assert(false, 'Exception expected');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Latitude and longitude are required'));
        }
    }

    @isTest
    static void testTaskDetails() {
        Punch_Record__c pr = [SELECT Id FROM Punch_Record__c WHERE User__c = :UserInfo.getUserId() LIMIT 1];
        Lead ld = [SELECT Id FROM Lead LIMIT 1];

        Task_Log__c log = new Task_Log__c(
            Punch_Record__c = pr.Id,
            Lead__c = ld.Id,
            Latitude__c = 12.9716,
            Longitude__c = 77.5946
        );
        insert log;

        Test.startTest();
        // 1. TaskDetails within 100m (lat/long match exactly)
        List<EmployeeTimelineController.TaskValues> details1 = EmployeeTimelineController.taskDetails(log.Id, 12.9716, 77.5946);
        // 2. TaskDetails outside 100m (distance is > 0.1km)
        List<EmployeeTimelineController.TaskValues> details2 = EmployeeTimelineController.taskDetails(log.Id, 13.9716, 77.5946);
        Test.stopTest();

        System.assertEquals(1, details1.size());
        System.assertEquals('John Doe', details1[0].customerName);
        System.assertEquals('EPC', details1[0].customerCategory);
        System.assertEquals(false, details1[0].is100mOutside);

        System.assertEquals(1, details2.size());
        System.assertEquals(true, details2[0].is100mOutside);
    }

    @isTest
    static void testUpdateTaskLegacy() {
        Punch_Record__c pr = [SELECT Id FROM Punch_Record__c WHERE User__c = :UserInfo.getUserId() LIMIT 1];
        Task_Log__c log = new Task_Log__c(
            Punch_Record__c = pr.Id,
            IsCheckout__c = false
        );
        insert log;

        String fileContent = EncodingUtil.base64Encode(Blob.valueOf('PDF_CONTENT'));
        String selfieContent = EncodingUtil.base64Encode(Blob.valueOf('SELFIE_CONTENT'));

        Test.startTest();
        // Successful update with files and selfie
        EmployeeTimelineController.updateTask(
            log.Id, 'Follow up', 'Yes', 'Enquiry generation', 'Follow up call',
            Date.today().addDays(5), 'Test MOM', selfieContent, 12.9716, 77.5946,
            'testDoc.pdf', fileContent, 'test justification'
        );

        // TaskId null exception
        try {
            EmployeeTimelineController.updateTask(null, '', '', '', '', null, '', '', null, null, '', '', '');
            System.assert(false, 'Exception expected');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('TaskId is null'));
        }

        // MOM required exception
        try {
            EmployeeTimelineController.updateTask(log.Id, '', '', '', '', null, '', '', null, null, '', '', '');
            System.assert(false, 'Exception expected');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('MOM is required'));
        }

        // Invalid file type exception
        try {
            EmployeeTimelineController.updateTask(
                log.Id, 'Follow up', 'Yes', 'Enquiry generation', 'Follow up call',
                Date.today().addDays(5), 'Test MOM', selfieContent, 12.9716, 77.5946,
                'testDoc.exe', fileContent, 'test justification'
            );
            System.assert(false, 'Exception expected');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Invalid file type'));
        }
        Test.stopTest();

        Task_Log__c updatedLog = [SELECT MOM__c, IsCheckout__c, Justification__c FROM Task_Log__c WHERE Id = :log.Id];
        System.assertEquals('Test MOM', updatedLog.MOM__c);
        System.assertEquals(true, updatedLog.IsCheckout__c);
        System.assertEquals('test justification', updatedLog.Justification__c);
    }

    @isTest
    static void testOwnedLeadsAndOpps() {
        Test.startTest();
        List<Lead> leads = EmployeeTimelineController.getOwnedLeads();
        List<Opportunity> opps = EmployeeTimelineController.getOwnedOpportunities();
        Test.stopTest();

        System.assert(leads.size() > 0);
        System.assert(opps.size() > 0);
    }

    @isTest
    static void testNearbyAccountsAndAllAccounts() {
        Test.startTest();
        List<EmployeeTimelineController.ClientOptionDTO> nearbyAccs = EmployeeTimelineController.getNearbyAccounts(12.9716, 77.5946);
        List<EmployeeTimelineController.ClientOptionDTO> allAccs = EmployeeTimelineController.getAllAccounts();
        Test.stopTest();

        System.assert(nearbyAccs.size() > 0);
        System.assert(allAccs.size() > 0);

        try {
            EmployeeTimelineController.getNearbyAccounts(null, null);
            System.assert(false, 'Exception expected');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Latitude and longitude are required'));
        }
    }

    @isTest
    static void testCreateAccountAndContact() {
        Account parentAcc = [SELECT Id FROM Account LIMIT 1];

        Test.startTest();
        Id newAccId = EmployeeTimelineController.createAccountOrSite('New Child Account', parentAcc.Id, 12.9716, 77.5946, null, null);
        EmployeeTimelineController.createContactForAccount('Jane', 'Smith', 'jane.smith@example.com', '1234567890', newAccId);
        Test.stopTest();

        Account newAcc = [SELECT Name, ParentId, Location__Latitude__s FROM Account WHERE Id = :newAccId];
        System.assertEquals('New Child Account', newAcc.Name);
        System.assertEquals(parentAcc.Id, newAcc.ParentId);
        System.assertEquals(12.9716, newAcc.Location__Latitude__s);

        Contact c = [SELECT FirstName, LastName, Email, AccountId FROM Contact WHERE AccountId = :newAccId LIMIT 1];
        System.assertEquals('Jane', c.FirstName);
        System.assertEquals('Smith', c.LastName);
    }

    @isTest
    static void testUpdateTaskWithDisposition_MarkLost() {
        Punch_Record__c pr = [SELECT Id FROM Punch_Record__c WHERE User__c = :UserInfo.getUserId() LIMIT 1];
        Lead ld = [SELECT Id FROM Lead LIMIT 1];
        Task_Log__c log = new Task_Log__c(
            Punch_Record__c = pr.Id,
            Lead__c = ld.Id,
            IsCheckout__c = false
        );
        insert log;

        Test.startTest();
        EmployeeTimelineController.CheckoutResult res = EmployeeTimelineController.updateTaskWithDisposition(
            log.Id, 'Follow up', 'Yes', 'Only information', 'Future Prospect', Date.today().addDays(5),
            'MOM details', '', 12.9716, 77.5946, null, null, null,
            'Mark Lead as Lost', 'Price too high', 'POCFirst', 'POCLast', 'poc@example.com', '1112223333', null, null
        );
        Test.stopTest();

        System.assertEquals('Success', res.status);
        Lead updatedLead = [SELECT Status FROM Lead WHERE Id = :ld.Id];
        System.assertEquals('Closed - Lost', updatedLead.Status);
    }

    @isTest
    static void testUpdateTaskWithDisposition_ConvertLead() {
        Punch_Record__c pr = [SELECT Id FROM Punch_Record__c WHERE User__c = :UserInfo.getUserId() LIMIT 1];
        Lead ld = [SELECT Id FROM Lead LIMIT 1];
        Task_Log__c log = new Task_Log__c(
            Punch_Record__c = pr.Id,
            Lead__c = ld.Id,
            IsCheckout__c = false
        );
        insert log;

        Test.startTest();
        EmployeeTimelineController.CheckoutResult res = EmployeeTimelineController.updateTaskWithDisposition(
            log.Id, 'Follow up', 'Yes', 'Enquiry generation', 'Enquiry Received', Date.today().addDays(5),
            'MOM details convert', '', 12.9716, 77.5946, null, null, null,
            'Convert Lead', '', 'POCFirst', 'POCLast', 'poc@example.com', '1112223333', null, null
        );
        Test.stopTest();

        System.assertEquals('Success', res.status);
        System.assertNotEquals(null, res.redirectId, 'Should redirect to the newly created Opportunity');
    }

    @isTest
    static void testUpdateTaskWithDisposition_EditOpp() {
        Punch_Record__c pr = [SELECT Id FROM Punch_Record__c WHERE User__c = :UserInfo.getUserId() LIMIT 1];
        Opportunity opp = [SELECT Id FROM Opportunity LIMIT 1];
        Task_Log__c log = new Task_Log__c(
            Punch_Record__c = pr.Id,
            Opportunity__c = opp.Id,
            IsCheckout__c = false
        );
        insert log;

        Test.startTest();
        EmployeeTimelineController.CheckoutResult res = EmployeeTimelineController.updateTaskWithDisposition(
            log.Id, 'Follow up', 'No', 'Only information', 'Plant Visit', Date.today().addDays(5),
            'MOM details opp', '', 12.9716, 77.5946, null, null, null,
            'Edit Opportunity', '', '', '', '', '', null, null
        );
        Test.stopTest();

        System.assertEquals('Success', res.status);
        System.assertEquals(opp.Id, res.redirectId);
    }

    @isTest
    static void testUpdateTaskWithDisposition_CreateLeadAndOpportunity() {
        Punch_Record__c pr = [SELECT Id FROM Punch_Record__c WHERE User__c = :UserInfo.getUserId() LIMIT 1];
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Task_Log__c log = new Task_Log__c(
            Punch_Record__c = pr.Id,
            Account__c = acc.Id,
            IsCheckout__c = false
        );
        insert log;

        Test.startTest();
        // 1. Create Lead from Checkout
        EmployeeTimelineController.CheckoutResult resLead = EmployeeTimelineController.updateTaskWithDisposition(
            log.Id, 'Follow up', 'No', 'Enquiry generation', 'Enquiry Received', Date.today().addDays(5),
            'MOM create lead', '', 12.9716, 77.5946, null, null, null,
            'Create Lead', '', '', '', '', '', '1234567890', 'www.example.com'
        );

        // Reset check-out state to allow another test call
        log.IsCheckout__c = false;
        update log;

        // 2. Create Opportunity from Checkout
        EmployeeTimelineController.CheckoutResult resOpp = EmployeeTimelineController.updateTaskWithDisposition(
            log.Id, 'Follow up', 'No', 'Enquiry generation', 'Enquiry Received', Date.today().addDays(5),
            'MOM create opp', '', 12.9716, 77.5946, null, null, null,
            'Create Opportunity', '', '', '', '', '', null, null
        );
        Test.stopTest();

        System.assertEquals('Success', resLead.status);
        System.assertNotEquals(null, resLead.redirectId);
        Lead newLead = [SELECT Company, Status, Phone, Website FROM Lead WHERE Id = :resLead.redirectId];
        System.assertEquals('Test Account', newLead.Company);

        System.assertEquals('Success', resOpp.status);
        System.assertNotEquals(null, resOpp.redirectId);
        Opportunity newOpp = [SELECT Name, AccountId FROM Opportunity WHERE Id = :resOpp.redirectId];
        System.assertEquals(acc.Id, newOpp.AccountId);

        // Verify remaining account details were updated
        Account updatedAcc = [SELECT Phone, Website FROM Account WHERE Id = :acc.Id];
        System.assertEquals('1234567890', updatedAcc.Phone);
        System.assertEquals('www.example.com', updatedAcc.Website);
    }

    @isTest
    static void testPicklistMethods() {
        Test.startTest();
        List<String> reasonOptions = EmployeeTimelineController.getReasonForVisitOptions();
        List<String> pocOptions = EmployeeTimelineController.getPOCPicVal();
        List<String> outcomeOptions = EmployeeTimelineController.getVisitOutcomePicVal();
        List<String> nextActionOptions = EmployeeTimelineController.getNextActionPicVal();
        Test.stopTest();

        System.assertNotEquals(null, reasonOptions);
        System.assertNotEquals(null, pocOptions);
        System.assertNotEquals(null, outcomeOptions);
        System.assertNotEquals(null, nextActionOptions);
    }

    @isTest
    static void testLeadRealtimeAssociationAndTaskLogging() {
        Lead ld = [SELECT Id, Account__c FROM Lead LIMIT 1];
        Account acc = [SELECT Id FROM Account LIMIT 1];

        // Ensure initially they are not associated
        ld.Account__c = null;
        update ld;

        Test.setMock(HttpCalloutMock.class, new MapboxCheckInMock());
        Test.startTest();
        // Check-in
        EmployeeTimelineController.TimelineItemDTO checkinItem = EmployeeTimelineController.addEmployeeTimelineItem(
            UserInfo.getUserId(), 'Visit Lead with Account', null, 12.9716, 77.5946, 
            'Follow up', 'Leads', 'Discussion', '', '', '', '', '', false, null, ld.Id, acc.Id, null
        );

        // Verify Lead is associated in real-time
        Lead updatedLead = [SELECT Id, Account__c FROM Lead WHERE Id = :ld.Id];
        System.assertEquals(acc.Id, updatedLead.Account__c, 'Lead should be associated with Account in realtime');

        // Verify standard Task is created under Lead
        List<Task> checkinTasks = [SELECT Id, Subject, Status, WhoId, Description FROM Task WHERE WhoId = :ld.Id AND Status = 'In Progress'];
        System.assertEquals(1, checkinTasks.size(), 'A standard Task should be created under the Lead with status In Progress');
        System.assertEquals('Visit - Check-In', checkinTasks[0].Subject);

        // Check-out
        EmployeeTimelineController.CheckoutResult checkoutRes = EmployeeTimelineController.updateTaskWithDisposition(
            checkinItem.id, 'Follow up', 'No', 'Only information', 'Future Prospect', Date.today().addDays(5),
            'Check-out MOM', '', 12.9716, 77.5946, null, null, null,
            'No Action', '', '', '', '', '', null, null
        );
        Test.stopTest();

        System.assertEquals('Success', checkoutRes.status);

        // Verify standard Task is completed and has MOM
        List<Task> completedTasks = [SELECT Id, Subject, Status, Description FROM Task WHERE WhoId = :ld.Id AND Status = 'Completed'];
        System.assertEquals(1, completedTasks.size(), 'The standard Task should be updated to Completed');
        System.assert(completedTasks[0].Description.contains('Check-out MOM'), 'Task description should contain MOM');
    }

    @isTest
    static void testAddEmployeeTimelineItem_WFH_WFO() {
        Id runningUserId = UserInfo.getUserId();
        
        // 1. Create approved request
        Punch_Record__c wfh = new Punch_Record__c(
            User__c = runningUserId,
            Is_WFH_Request__c = true,
            WFH_Request_Date__c = Date.today(),
            WFH_Approval_Status__c = 'Approved'
        );
        insert wfh;

        // 2. Create shift punch in
        Punch_Record__c punch = new Punch_Record__c(
            User__c = runningUserId,
            Action__c = 'IN',
            Status__c = 'IN',
            Punch_Time__c = System.now(),
            Punch_Type__c = 'WFH'
        );
        insert punch;

        Test.startTest();
        // 3. Call check-in with category and request link
        EmployeeTimelineController.TimelineItemDTO result = EmployeeTimelineController.addEmployeeTimelineItemWithCategory(
            runningUserId, 'WFH Work from home session', null, 12.9716, 77.5946,
            'First time visit', 'Leads', 'Discussion', '', '', '', '', '', false, null, null, null, null, null,
            'WFH', wfh.Id
        );
        
        // 4. Retrieve WFH/WFO approved requests list
        List<Punch_Record__c> approvedReqs = EmployeeTimelineController.getApprovedWfhWfoRequestsToday(runningUserId);
        Test.stopTest();

        System.assertNotEquals(null, result, 'Check-in result should not be null');
        System.assertEquals(1, approvedReqs.size(), 'Should find today\'s approved WFH request');

        Task_Log__c log = [SELECT Id, Visit_Category__c, Punch_Record__c FROM Task_Log__c WHERE Id = :result.id LIMIT 1];
        System.assertEquals('WFH', log.Visit_Category__c, 'Visit Category should be WFH');
        System.assertEquals(wfh.Id, log.Punch_Record__c, 'Punch Record lookup should point to the WFH request');
    }

    @isTest
    static void testOpportunityAndSiteCheckInAndCheckout() {
        Id runningUserId = UserInfo.getUserId();

        // 1. Create Parent Account
        Account parentAcc = new Account(Name = 'Parent Corporate Account', Phone = '1234567890', Email__c = 'parent@test.com');
        insert parentAcc;

        // 2. Create child Account (Site)
        Account childSite = new Account(Name = 'Sub-Site Alpha', ParentId = parentAcc.Id);
        insert childSite;

        // 3. Create Opportunity linked to Account
        Opportunity opp = new Opportunity(
            Name = 'Big Solar Project Opportunity',
            AccountId = parentAcc.Id,
            StageName = 'Nurture',
            CloseDate = Date.today().addDays(30),
            OwnerId = runningUserId
        );
        insert opp;

        // 4. Active Market Visit punch + state (required for check-in)
        Punch_Record__c punch = new Punch_Record__c(
            User__c = runningUserId,
            Action__c = 'IN',
            Status__c = 'IN',
            Punch_Time__c = System.now(),
            Punch_Type__c = 'Market Visit'
        );
        insert punch;

        User_Punch_State__c state = new User_Punch_State__c(
            User__c = runningUserId,
            Current_Status__c = 'IN',
            Punch_In_Record__c = punch.Id,
            Last_Punch_Time__c = System.now()
        );
        insert state;

        Test.setMock(HttpCalloutMock.class, new MapboxCheckInMock());
        Test.startTest();

        // 5. Test searchOpportunities
        List<Opportunity> opps1 = EmployeeTimelineController.searchOpportunities('Big');
        System.assertEquals(1, opps1.size(), 'Should find the created opportunity by name');
        List<Opportunity> opps2 = EmployeeTimelineController.searchOpportunities('12345');
        System.assertEquals(1, opps2.size(), 'Should find opportunity by account phone');

        // 6. Test getEligibleSites
        List<Account> sites = EmployeeTimelineController.getEligibleSites(parentAcc.Id, 12.9716, 77.5946);
        System.assertEquals(1, sites.size(), 'Should return child site account (lacking address coordinates)');

        // 7. Test checkAddressBook (should be empty/not found initially)
        Map<String, Object> abRes = EmployeeTimelineController.checkAddressBook(parentAcc.Id, 12.9716, 77.5946);
        System.assertEquals(false, abRes.get('found'));

        // 8. Check-in against Opportunity + Account (creates Address_Book__c via Mapbox)
        EmployeeTimelineController.TimelineItemDTO resultAccCheckin = EmployeeTimelineController.addEmployeeTimelineItemWithCategory(
            runningUserId, 'Check-in to Parent Acc', null, 12.9716, 77.5946,
            'First time visit', 'Opps', 'Discussion', '', '', '', '', '', false, null, null, parentAcc.Id, opp.Id, null,
            'Market Visit', null
        );

        Task_Log__c createdLog = [
            SELECT Address_Book__c, Address__c
            FROM Task_Log__c
            WHERE Id = :resultAccCheckin.id
            LIMIT 1
        ];
        System.assertNotEquals(null, createdLog.Address_Book__c, 'Task Log should link Address Book');

        Address_Book__c createdAb = [
            SELECT PIN__c, City__c, Street__c, Account__c, Opportunity__c, latitude__c, longitude__c
            FROM Address_Book__c
            WHERE Id = :createdLog.Address_Book__c
            LIMIT 1
        ];
        System.assertEquals(parentAcc.Id, createdAb.Account__c);
        System.assertEquals(opp.Id, createdAb.Opportunity__c);
        System.assertEquals('713154', createdAb.PIN__c);
        System.assertEquals('Memari', createdAb.City__c);

        // 9. Re-check address book (should find Address_Book__c within 200m)
        Map<String, Object> abRes2 = EmployeeTimelineController.checkAddressBook(parentAcc.Id, 12.9716, 77.5946);
        System.assertEquals(true, abRes2.get('found'), 'Should find matching Address Book entry now');
        Id addressBookId = (Id) abRes2.get('addressBookId');
        System.assertEquals(createdAb.Id, addressBookId);

        // 10. Call check-in against Opportunity + Site option (updates Site coordinates)
        EmployeeTimelineController.TimelineItemDTO resultSiteCheckin = EmployeeTimelineController.addEmployeeTimelineItemWithCategory(
            runningUserId, 'Check-in to Site Acc', null, 12.9717, 77.5947,
            'First time visit', 'Opps', 'Discussion', '', '', '', '', '', false, null, null, childSite.Id, opp.Id, null,
            'Market Visit', null
        );

        // Verify Site coordinates were updated
        Account updatedSite = [SELECT Location__Latitude__s, Location__Longitude__s FROM Account WHERE Id = :childSite.Id];
        System.assertEquals(12.9717, updatedSite.Location__Latitude__s);

        // 11. Test getContactsForAccount (initially empty)
        List<Contact> contactsEmpty = EmployeeTimelineController.getContactsForAccount(parentAcc.Id);
        System.assertEquals(0, contactsEmpty.size());

        // 12. Checkout and create new Contact
        EmployeeTimelineController.CheckoutResult checkoutRes = EmployeeTimelineController.updateTaskWithDisposition(
            resultAccCheckin.id, 'Follow up', 'Yes', 'Only information', 'Future Prospect', Date.today().addDays(5),
            'Check-out MOM', '', 12.9716, 77.5946, null, null, null,
            'No Action', '', 'Alice', 'Smith', 'alice@test.com', '9998887776', '', '', 'new'
        );
        System.assertEquals('Success', checkoutRes.status);

        // Verify Contact was created under parent Account
        List<Contact> parentContacts = EmployeeTimelineController.getContactsForAccount(parentAcc.Id);
        System.assertEquals(1, parentContacts.size(), 'Contact should be created');
        System.assertEquals('Alice Smith', parentContacts[0].Name);

        // 13. Checkout again on site using the existing contact selection
        EmployeeTimelineController.CheckoutResult checkoutRes2 = EmployeeTimelineController.updateTaskWithDisposition(
            resultSiteCheckin.id, 'Follow up', 'Yes', 'Only information', 'Future Prospect', Date.today().addDays(5),
            'Check-out Site MOM', '', 12.9717, 77.5947, null, null, null,
            'No Action', '', '', '', '', '', '', '', parentContacts[0].Id
        );
        System.assertEquals('Success', checkoutRes2.status);

        Test.stopTest();
    }

    private class MapboxCheckInMock implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setStatusCode(200);
            res.setBody(
                '{'
                + '"type":"FeatureCollection",'
                + '"features":[{'
                + '"type":"Feature",'
                + '"properties":{'
                + '"feature_type":"postcode",'
                + '"full_address":"713154, Memari, West Bengal, India",'
                + '"name":"713154",'
                + '"context":{'
                + '"locality":{"name":"Merua"},'
                + '"place":{"name":"Memari"},'
                + '"region":{"name":"West Bengal"},'
                + '"country":{"name":"India"},'
                + '"postcode":{"name":"713154"}'
                + '}'
                + '}'
                + '}]'
                + '}'
            );
            return res;
        }
    }

    @isTest
    static void testSearchAccounts() {
        // 1. Create a corporate Account (Parent)
        Account acc = new Account(Name = 'Utkarsh Solar Corporate', Phone = '9876543210', Email__c = 'corp@utkarsh.com');
        insert acc;

        // 2. Create a child Account (Site)
        Account site = new Account(Name = 'Utkarsh Site Delhi', ParentId = acc.Id);
        insert site;

        Test.startTest();

        // Test searching parent account by name
        List<Account> resName = EmployeeTimelineController.searchAccounts('Utkarsh');
        System.assertEquals(1, resName.size(), 'Should find the parent account by name');
        System.assertEquals(acc.Id, resName[0].Id);

        // Test searching parent account by phone
        List<Account> resPhone = EmployeeTimelineController.searchAccounts('98765');
        System.assertEquals(1, resPhone.size(), 'Should find the parent account by phone number');

        // Test searching with blank searchKey (should return up to 50 parent accounts)
        List<Account> resBlank = EmployeeTimelineController.searchAccounts('');
        System.assertNotEquals(0, resBlank.size(), 'Should return parent accounts list');

        Test.stopTest();
    }

    @isTest
    static void testNewCheckoutFeatures() {
        // 1. Get picklist options
        List<String> options = EmployeeTimelineController.getCustomerCategoryOptions();
        System.assertNotEquals(null, options);

        // 2. Setup task log for checkout
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Punch_Record__c pr = [SELECT Id FROM Punch_Record__c WHERE User__c = :UserInfo.getUserId() LIMIT 1];
        Task_Log__c log = new Task_Log__c(
            Punch_Record__c = pr.Id,
            Account__c = acc.Id,
            IsCheckout__c = false
        );
        insert log;

        Test.startTest();
        // Test Checkout with Customer Category and Lead creation
        EmployeeTimelineController.CheckoutResult res = EmployeeTimelineController.updateTaskWithDisposition(
            log.Id, 'Follow up', 'Yes', 'Only information', 'Future Prospect', Date.today().addDays(5),
            'Check-out MOM', '', 12.9716, 77.5946, null, null, null,
            'Create Lead', '', '', '', '', '', '9998887776', 'newlead@test.com', 'Lead Contact Name',
            'new', 'Call', 'EPC'
        );
        Test.stopTest();

        System.assertEquals('Success', res.status);
        System.assertNotEquals(null, res.redirectId);

        // Verify Lead fields
        Lead createdLd = [SELECT LastName, Phone, Email, Company, Customer_Category__c FROM Lead WHERE Id = :res.redirectId];
        System.assertEquals('Lead Contact Name', createdLd.LastName);
        System.assertEquals('9998887776', createdLd.Phone);
        System.assertEquals('newlead@test.com', createdLd.Email);
        System.assertEquals('EPC', createdLd.Customer_Category__c);

        // Verify Call Task was created
        List<Task> callTasks = [SELECT Subject, ActivityDate FROM Task WHERE Subject = 'Call' AND WhoId = :res.redirectId];
        System.assertEquals(1, callTasks.size());
    }

    @isTest
    static void testNewCheckoutFeaturesEvent() {
        // Setup task log for checkout
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Punch_Record__c pr = [SELECT Id FROM Punch_Record__c WHERE User__c = :UserInfo.getUserId() LIMIT 1];
        Task_Log__c log = new Task_Log__c(
            Punch_Record__c = pr.Id,
            Account__c = acc.Id,
            IsCheckout__c = false
        );
        insert log;

        Test.startTest();
        // Test Checkout with Event creation
        EmployeeTimelineController.CheckoutResult res = EmployeeTimelineController.updateTaskWithDisposition(
            log.Id, 'Follow up', 'Yes', 'Only information', 'Future Prospect', Date.today().addDays(5),
            'Check-out MOM', '', 12.9716, 77.5946, null, null, null,
            'Create Lead', '', '', '', '', '', '9998887776', 'newlead@test.com', 'Lead Contact Name',
            'new', 'Event', 'EPC'
        );
        Test.stopTest();

        System.assertEquals('Success', res.status);
        
        // Verify Event was created
        List<Event> events = [SELECT Subject FROM Event WHERE Subject = 'Meeting' AND WhoId = :res.redirectId];
        System.assertEquals(1, events.size());
    }
}