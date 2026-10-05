public class CreateLeadController {

    // Wrapper class to format the response exactly how LWC comboboxes expect it
    public class PicklistOption {
        @AuraEnabled public String label;
        @AuraEnabled public String value;

        public PicklistOption(String label, String value) {
            this.label = label;
            this.value = value;
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<PicklistOption> getLeadPicklistValues(String fieldApiName) {
        List<PicklistOption> options = new List<PicklistOption>();

        try {
            // 1. Get the Lead object describe metadata
            Schema.DescribeSObjectResult leadDescribe = Lead.SObjectType.getDescribe();
            
            // 2. Fetch the specific field using the provided API name
            Schema.SObjectField field = leadDescribe.fields.getMap().get(fieldApiName);
            
            // 3. Ensure the field exists before proceeding
            if (field != null) {
                // 4. Extract all picklist entries for that field
                List<Schema.PicklistEntry> entries = field.getDescribe().getPicklistValues();
                
                // 5. Loop through and add active values to our options list
                for (Schema.PicklistEntry entry : entries) {
                    if (entry.isActive()) {
                        options.add(new PicklistOption(entry.getLabel(), entry.getValue()));
                    }
                }
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching picklist values: ' + e.getMessage());
        }

        return options;
    }
    
    // NEW METHOD: Fetches matching users based on Department containment
    @AuraEnabled(cacheable=false) // Set to false so it always retrieves fresh records imperatively
    public static List<PicklistOption> getEligibleOwners(String selectedDepartment, String currentUserId) {
        List<PicklistOption> options = new List<PicklistOption>();
        
        if (String.isBlank(selectedDepartment)) {
            return options;
        }

        try {
            // Build the search term for containment matching
            String searchKey = '%' + selectedDepartment + '%';
            
            // Query users who belong to the department, are active, and are not the current user
            List<User> matchingUsers = [
                SELECT Id, Name 
                FROM User 
                WHERE Department LIKE :searchKey 
                AND Id != :currentUserId 
                AND IsActive = true 
                LIMIT 100
            ];

            for (User u : matchingUsers) {
                options.add(new PicklistOption(u.Name, u.Id)); // Name as Label, Id as Value
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching eligible owners: ' + e.getMessage());
        }

        return options;
    }
}