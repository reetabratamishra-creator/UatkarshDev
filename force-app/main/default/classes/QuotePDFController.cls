public class QuotePDFController {
    public Quote quoteRecord { get; set; }
    public Map<String, Object> jsonData { get; set; }
    public List<Map<String, Object>> lineItems { get; set; }
    public Decimal totalAmount { get; set; }
    public String todayDate { get; set; }

    public QuotePDFController(ApexPages.StandardController stdController) {
        quoteRecord = [SELECT Id, Name, Quote_Value__c FROM Quote WHERE Id = :stdController.getId()];
        totalAmount = 0.00;
        lineItems = new List<Map<String, Object>>();
        todayDate = Date.today().format();
        jsonData = new Map<String, Object>();

        if (String.isNotBlank(quoteRecord.Quote_Value__c)) {
            try {
                jsonData = (Map<String, Object>) JSON.deserializeUntyped(quoteRecord.Quote_Value__c);

                if (jsonData.containsKey('_Saved_Table_Rows')) {
                    List<Object> rawRows = (List<Object>) jsonData.get('_Saved_Table_Rows');
                    Integer slNo = 1;
                    
                    for (Object rowObj : rawRows) {
                        Map<String, Object> row = (Map<String, Object>) rowObj;
                        
                        // Ignore the parent summary row
                        if (String.valueOf(row.get('id')) != String.valueOf(quoteRecord.Id)) {
                            row.put('SlNo', slNo++);
                            
                            // Calculate Line Total safely
                            Decimal qty = row.get('quantity') != null ? Decimal.valueOf(String.valueOf(row.get('quantity'))) : 1;
                            Decimal price = row.get('unitPrice') != null ? Decimal.valueOf(String.valueOf(row.get('unitPrice'))) : 0;
                            row.put('lineTotal', qty * price);
                            
                            totalAmount += (qty * price);
                            lineItems.add(row);
                        }
                    }
                }
            } catch (Exception e) {
                System.debug('JSON Parse Error: ' + e.getMessage());
            }
        }

        // 👉 SAFETY NET: Ensure all keys exist so Visualforce never crashes!
        ensureKey('Contact_Person', 'Balindra Kushwaha');
        ensureKey('Contact_Number', '8001611112');
        ensureKey('Email', 'balindra.ssml@shyamsteel.industries');
        ensureKey('tc_offer_validity', '2 days from the date of offer and further revalidation is subjected to our prior written confirmation.');
        ensureKey('tc_delivery_schedule', 'READY STOCK');
        ensureKey('tc_price_variation', 'Rates offered are variable.\nWe will try to complete the delivery within offered time.');
        ensureKey('tc_payment_terms', '30% advance against P.O. & remaining on readiness of materials.');
        ensureKey('tc_transportation', 'INCLUDED');
        ensureKey('tc_vehicle_load', '(+/-) 0.5% weight tolerance may be there in total vehicle load.');
        ensureKey('tc_tolerance', 'All dimensional tolerance like OD & Wall Thickness (+/-) shall be as per applicable IS specification.');
        ensureKey('tc_inspection', 'Inspection Charges & Expenses: Extra.');
        ensureKey('tc_pre_dispatch_inspection', 'Pre Dispatch Inspection at our plant');
    }

    // Helper method to inject defaults if the JSON is missing the data
    private void ensureKey(String key, String defaultValue) {
        if (!jsonData.containsKey(key) || jsonData.get(key) == null || String.isBlank(String.valueOf(jsonData.get(key)))) {
            jsonData.put(key, defaultValue);
        }
    }
}