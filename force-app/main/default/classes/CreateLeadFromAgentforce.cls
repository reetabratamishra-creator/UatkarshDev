public class CreateLeadFromAgentforce {

    @InvocableMethod(label='Create Standard Lead' description='Creates a Lead record from Agentforce input')
    public static List<AgentResponse> createLeadRecord(List<AgentReq> requests) {
        List<AgentResponse> results = new List<AgentResponse>();
        List<Lead> leadsToInsert = new List<Lead>();
        
        for (AgentReq req : requests) {
            if (req.agentdata != null) {
                Lead newLead = new Lead();
                
                // 1. Standard Fields Mapping
                newLead.FirstName = req.agentdata.firstName;
                newLead.LastName = req.agentdata.lastName;
                newLead.Company = req.agentdata.companyName;
                newLead.Phone = req.agentdata.phone;
                newLead.Email = req.agentdata.email;
                newLead.LeadSource = req.agentdata.leadSource;
                
                // 2. Custom Layout & Picklist Fields Mapping
                newLead.Department_Name__c = req.agentdata.departmentName; 
                newLead.Status = req.agentdata.leadStage; 
                newLead.Product_Category__c = req.agentdata.productCategory;
                newLead.Customer_Category__c = req.agentdata.customerCategory;
                newLead.Industry = req.agentdata.industry; 
                newLead.Rating = req.agentdata.rating;     
                newLead.UOM__c = req.agentdata.uom;
                newLead.Quantity__c = req.agentdata.quantity; 
                
                // Map explicit Custom Owner ID over default routing if chosen
                if (String.isNotBlank(req.agentdata.ownerId)) {
                    newLead.OwnerId = req.agentdata.ownerId;
                }
                
                if (req.agentdata.testVariable != null) {
                    newLead.Description = 'Test Variable passed from Agentforce: ' + req.agentdata.testVariable;
                }
                
                leadsToInsert.add(newLead);
            }
        }

        try {
            if (!leadsToInsert.isEmpty()) {
                // 3. Insert the Lead records first to generate valid target IDs
                insert leadsToInsert;
                
                List<ContentDocumentLink> fileLinksToInsert = new List<ContentDocumentLink>();
                
                // Loop back to map files to their corresponding successfully created Leads
                for (Integer i = 0; i < leadsToInsert.size(); i++) {
                    Lead createdLead = leadsToInsert[i];
                    AgentRequest trackingPayload = requests[i].agentdata;
                    
                    // Link files if any were uploaded on-the-fly via the component structure
                    if (trackingPayload != null && trackingPayload.uploadedFileIds != null && !trackingPayload.uploadedFileIds.isEmpty()) {
                        for (String fileId : trackingPayload.uploadedFileIds) {
                            ContentDocumentLink link = new ContentDocumentLink();
                            link.ContentDocumentId = fileId;      // The target file ID string
                            link.LinkedEntityId = createdLead.Id;   // Attach straight to the brand new Lead ID
                            link.ShareType = 'V';                  // Assigned with Viewer access rules
                            fileLinksToInsert.add(link);
                        }
                    }
                }
                
                // 4. Batch insert link associations
                if (!fileLinksToInsert.isEmpty()) {
                    insert fileLinksToInsert;
                }
                
                for (Lead l : leadsToInsert) {
                    AgentResponse res = new AgentResponse();
                    res.message = 'Success: Lead created successfully with ID: ' + l.Id;
                    results.add(res);
                }
            }
        } catch (Exception e) {
            AgentResponse errorRes = new AgentResponse();
            errorRes.message = 'Error creating Lead: ' + e.getMessage();
            for(Integer i = 0; i < requests.size(); i++){
                results.add(errorRes);
            }
        }
        
        return results;
    }

    // Outer Request Wrapper
    public class AgentReq {
        @InvocableVariable(required=true)
        public AgentRequest agentdata;
    } 
    
    // Inner Data Wrapper with ALL required fields from the UI
    public class AgentRequest {
        
        @InvocableVariable(required=false description='Lead First Name')
        public String firstName;
        
        @InvocableVariable(required=true description='Lead Last Name')
        public String lastName;
        
        @InvocableVariable(required=true description='Lead Phone Number')
        public String phone;
        
        @InvocableVariable(required=true description='Lead Company Name')
        public String companyName;

        @InvocableVariable(required=true description='Lead Source (e.g., Website, FACEBOOK, INBOUND EMAIL)')
        public String leadSource;

        @InvocableVariable(required=true description='Department Name (e.g., High Mast & Polygonal, Steel Pipes)')
        public String departmentName;

        @InvocableVariable(required=true description='Lead Stage (e.g., Prospect)')
        public String leadStage;
        
        @InvocableVariable(required=false description='Lead Email')
        public String email;
        
        @InvocableVariable(required=false description='Product Category')
        public String productCategory;
        
        @InvocableVariable(required=false description='Customer Category')
        public String customerCategory;
        
        @InvocableVariable(required=false description='Industry')
        public String industry;
        
        @InvocableVariable(required=false description='Rating')
        public String rating;
        
        @InvocableVariable(required=false description='UOM')
        public String uom;
        
        @InvocableVariable(required=false description='Quantity')
        public Integer quantity;
        
        @InvocableVariable(required=true description='Lead Owner')
        public String ownerId;
        
        @InvocableVariable(required=false description='Array list of content document ids to map on execution')
        public List<String> uploadedFileIds;
        
        @InvocableVariable(required=false description='A test string passed directly from the Agent')
        public String testVariable; 
    } 

    // Response Wrapper
    public class AgentResponse {
        @InvocableVariable
        public String message;
    }
}