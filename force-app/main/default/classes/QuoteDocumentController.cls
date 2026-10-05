public class QuoteDocumentController {
    public Quote currentQuote { get; set; }
    
    // Parsed Data Variables for the VF Page
    public List<PebAccessory> pebAccessories { get; set; }
    public String termsRef { get; set; }
    public String termsDate { get; set; }
    public Decimal transportationFreight { get; set; }

    public QuoteDocumentController(ApexPages.StandardController stdController) {
        // 1. Get the Quote ID from the URL
        Id quoteId = stdController.getId();
        
        // 2. Fetch the Quote and the JSON Payload
        currentQuote = [SELECT Id, Name, QuoteNumber, TotalPrice, Quote_Value__c 
                        FROM Quote WHERE Id = :quoteId LIMIT 1];
        
        pebAccessories = new List<PebAccessory>();

        // 3. Parse the JSON we saved from the LWC
        if (String.isNotBlank(currentQuote.Quote_Value__c)) {
            try {
                Map<String, Object> parsedData = (Map<String, Object>) JSON.deserializeUntyped(currentQuote.Quote_Value__c);
                
                // Extract PEB specific data
                termsRef = (String) parsedData.get('peb_termsRef');
                termsDate = (String) parsedData.get('peb_termsDate');
                
                if (parsedData.get('peb_transportationFreight') != null) {
                    transportationFreight = (Decimal) parsedData.get('peb_transportationFreight');
                }

                // Extract and cast the Accessories Array
                if (parsedData.get('peb_accessories') != null) {
                    List<Object> rawAccessories = (List<Object>) parsedData.get('peb_accessories');
                    for (Object obj : rawAccessories) {
                        Map<String, Object> accMap = (Map<String, Object>) obj;
                        PebAccessory acc = new PebAccessory();
                        acc.description = (String) accMap.get('description');
                        acc.size = (String) accMap.get('size');
                        acc.quantity = (String) accMap.get('quantity');
                        acc.remark = (String) accMap.get('remark');
                        pebAccessories.add(acc);
                    }
                }
            } catch (Exception e) {
                System.debug('JSON Parsing Error: ' + e.getMessage());
            }
        }
    }

    // Wrapper class to hold accessory rows for the VF Page table
    public class PebAccessory {
        public String description { get; set; }
        public String size { get; set; }
        public String quantity { get; set; }
        public String remark { get; set; }
    }
}