public with sharing class InvocableLeadDuplicxateCheck {

    public class Request {
        // Lead Details===============
        @InvocableVariable
        public String FirstName ;
        @InvocableVariable
        public String LastName ;
        @InvocableVariable
        public String Phone;
        @InvocableVariable
        public String Email;
               
    }

    @InvocableMethod(label='Get Duplicate Lead' description='Get Duplicate Lead')
    public static List<InvokeLeadResponse> InvocableDuplicateRecordCheck(List<Request> requests) {

        Request request = requests[0];
        Boolean duplicateLead;
        
        String errorMessage;
        List<Lead> existingLeadList = new List<Lead>();
        
        List<InvokeLeadResponse> result = new List<InvokeLeadResponse>();
        
        Lead creatNewLead = new Lead();
        creatNewLead.FirstName = request.FirstName;
        creatNewLead.LastName = request.LastName;
        creatNewLead.Phone = request.Phone;
        creatNewLead.Email = request.Email;
        
       
        List<Lead> duplicateLeadList = findDuplicateRecords(creatNewLead);
        if(!duplicateLeadList.isEmpty())
        {
            existingLeadList.addAll(duplicateLeadList);
            duplicateLead = true;
        }
        else
        {
            duplicateLead = false;
        }
        

        InvokeLeadResponse response = new InvokeLeadResponse();
        response.duplicateLead =existingLeadList;
        response.foundDuplicateLead = duplicateLead;
        result.add(response);
        return result;
    }

    public class  InvokeLeadResponse {
        @InvocableVariable
        public List<Lead> duplicateLead;
        @InvocableVariable
        public Boolean foundDuplicateLead;
       
    }

    // Method for checking Duplicate
    public static List<SObject> findDuplicateRecords(Lead newLead){
        List<Lead> leadList = new List<Lead>();
        
        leadList.add(newLead);
        
        List<Datacloud.FindDuplicatesResult > findDuplicatesResult = Datacloud.FindDuplicates.findDuplicates(leadList);
        Datacloud.DuplicateResult duplicateResult = findDuplicatesResult.get(0).getDuplicateResults().get(0);
        Datacloud.MatchResult matchResult = duplicateResult.getMatchResults()[0];
        List<Datacloud.MatchRecord> matchRecords = matchResult.getMatchRecords();
        
        List<SObject> duplicates = new List<SObject>();
        
        for(Datacloud.MatchRecord matchRecord : matchRecords){
            SObject duplicate = matchRecord.getRecord();
            duplicates.add(duplicate);
        }
        
        return duplicates;
    }
}