public class QuoteCreation_RateController {
    @AuraEnabled
    public static String processRateCardCSV(Id contentDocumentId, String prefix) {
        try {
            // 1. Get the file data
            ContentVersion cv = [SELECT VersionData FROM ContentVersion 
                                 WHERE ContentDocumentId = :contentDocumentId 
                                 AND IsLatest = true LIMIT 1];
            
            // 2. Convert to string and split into rows
            String csvAsString = cv.VersionData.toString();
            List<String> lines = csvAsString.split('\n');
            
            List<String> conditions = new List<String>();
            
            // 3. Loop through rows (skip row 0 because it is the header)
            for(Integer i = 1; i < lines.size(); i++) {
                String line = lines[i].replaceAll('\r', ''); // Clean carriage returns
                if(String.isBlank(line)) continue;
                
                List<String> columns = line.split(',');
                
                if(columns.size() >= 3) {
                    String material = columns[0].trim();
                    String grade = columns[1].trim();
                    String price = columns[2].trim();
                    
                    // 👉 BUILD THE TERNARY CONDITION
                    // Example: (hdg_material == 'HDG MMS/Carport Structure' && hdg_material_grade == 'E350') ? 61000
                    String condition = '(' + prefix + '_material == \'' + material + '\' && ' + prefix + '_material_grade == \'' + grade + '\') ? ' + price;
                    
                    conditions.add(condition);
                }
            }
            
            // 4. Join them all together with ' : ' and cap it off with ' : 0'
            String finalFormula = String.join(conditions, ' : ') + ' : 0';
            
            // NOTE: Here you would typically write the DML statement to save this 
            // finalFormula to your Custom Metadata, Document, or Quote Template record.
            
            return finalFormula;
            
        } catch (Exception e) {
            throw new AuraHandledException('Error processing CSV: ' + e.getMessage());
        }
    }

}