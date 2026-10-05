public class TelecomDocumentController {
    
    public Quote quoteRecord { get; set; }
    public Map<String, Object> jsonData { get; set; }
    public Decimal totalAmount { get; set; }
    public String quoteNumber {get; set;}
    public String todayDate { get; set; }
    public String quoteAccount { get; set; }
    
    public List<TowerGroup> towerDetailGroups { get; private set; }
    public List<MGLRow> mglRows { get; private set; }
    public List<RPTRow> rptRows { get; private set; }
    public Boolean hasTowerGroups { get; private set; }
    public Boolean hasMGLRows { get; private set; }
    public Boolean hasRPTRows { get; private set; }
    public Boolean isMGLForType {get; set;}
    public Boolean isRPTForType {get; set;}
    public Boolean isBOMNotAvailable {get; set;}
    public Boolean isBOMAvailable {get; set;}
    
    public String logoBase64 { get; set; }
    public String currentUser { get; set; }
    public String currentUserPhone { get; set; }
    public String currentUserEmail { get; set; }
    public Boolean hasForIncoterms { get; set; }
    public Boolean hasExIncoterms { get; set; }
    public String incotermsVal { get; set; }
    
    // Payments terms details
    public Decimal tcOfferValidity { get; set; }
    public Decimal tcMonthDays { get; set; }
    public String tcDeliveryDetail { get; set; }
    public String tcPaymentDetails { get; set; }
    public Decimal tcPriceValidity { get; set; }
    
    // Margin flags (OR across the products that actually rendered a table)
    public boolean isActualMargin { get; set; }
    public boolean isBOMMargin { get; set; }
    
    public List<TowerGroup> getTowerTables() {
        return towerDetailGroups;
    }
    
    public class TowerGroup {
        public String subType { get; set; }
        public List<TowerRow> rows { get; set; }
        public boolean showTable { get; set; }   
        
        public TowerGroup() { 
            rows = new List<TowerRow>(); 
        }
    }
    
    public class MGLRow {
        public String  location  { get; set; }  
        public String  descriptionOfTower { get; set; }  
        public String vehicleLoadability { get; set; } 
        public String minimumGuaranteedFreight { get; set; }
    }
    
    public class RPTRow {
        public Integer slNo { get; set; } 
        public String  location { get; set; } 
        public String ratePerTon { get; set; }
    }
    
    public class TowerRow {
        public Integer slNo { get; set; }  
        public String  description { get; set; }   
        public String  hsnCode { get; set; }  
        public Decimal towerWeight { get; set; }  
        public Integer quantity { get; set; } 
        public String  uom { get; set; }  
        public String ratePerMT { get; set; }  
        public String unitRate { get; set; }  
        public String totalBasicRate { get; set; }   
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Cross-product configuration
    // Line-item name format: "{tower_type} - {product_name} - {gsm} GSM[ (AWT)]"
    // ─────────────────────────────────────────────────────────────────────
    private static final List<String> gsmList = new List<String>{ '610', '900', '1000' };
    
    // Table rendering order: Angular → Tubular → Tubular Signalling
    private static final List<String> PRODUCT_ORDER =
        new List<String>{ 'Angular', 'Tubular', 'Tubular Signalling' };
    
    // Uniform JSON prefix per product (all field suffixes are identical across products)
    private static final Map<String, String> PRODUCT_PREFIX = new Map<String, String>{
        'Angular'            => 'agl_',
        'Tubular'            => 'tub_',
        'Tubular Signalling' => 'tsg_'
    };
    
    // Parsed longest-label-first so "Tubular Signalling - " never matches as "Tubular - "
    private static final List<String> PRODUCT_PARSE_ORDER =
        new List<String>{ 'Tubular Signalling', 'Tubular', 'Angular' };
    
    private static final String HSN_CODE    = '73082011';
    private static final String DEFAULT_UOM = 'SET';
    
    /** One saved line whose name matched the product format. */
    private class ParsedLine {
        Map<String, Object> line;
        String  towerType;
        String  productName;
        String  gsm;
        Boolean isAWT;
    }
    
    public TelecomDocumentController(ApexPages.StandardController stdController){
        totalAmount = 0.00;
        todayDate = Date.today().format();
        jsonData = new Map<String, Object>();
        
        List<Quote> quotes = [SELECT Id, Name, Quote_Value__c, QuoteNumber, AccountId, Quote_Reference__c 
                      FROM Quote 
                      WHERE Id = :stdController.getId() LIMIT 1];
        User u = [SELECT Id, Name, Phone, Email FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];
        currentUser = u.Name;
        currentUserPhone = u.Phone;
        currentUserEmail = u.Email;
        
        if (!quotes.isEmpty()){
            quoteRecord = quotes[0];
            quoteNumber = quotes[0].Quote_Reference__c;
            if(!String.isEmpty(quotes[0].AccountId))
                quoteAccount = [SELECT ID, Name FROM Account WHERE Id = :quotes[0].AccountId].Name;
            if (String.isNotBlank(quoteRecord.Quote_Value__c)){
                try{
                    jsonData = (Map<String, Object>) JSON.deserializeUntyped(quoteRecord.Quote_Value__c);
                    buildTable();
                }
                catch(Exception ex){
                    ApexPages.addMessage(new ApexPages.Message(
                        ApexPages.Severity.ERROR,
                        'Failed to parse Quote JSON: ' + ex.getMessage()
                    ));
                }
            }
        }
        else {
            ApexPages.addMessage(new ApexPages.Message(
                ApexPages.Severity.ERROR, 
                'Quote record not found for this page.'
            ));
        }
        
        try {
            List<StaticResource> sr = [ SELECT Body, ContentType FROM StaticResource WHERE  Name = 'UtkarshHeader' LIMIT  1];
            if (!sr.isEmpty()) {
                String mime = String.isNotBlank(sr[0].ContentType)
                              ? sr[0].ContentType
                              : 'image/png';
                logoBase64 = 'data:' + mime + ';base64,'
                           + EncodingUtil.base64Encode(sr[0].Body);
            } else {
                logoBase64 = '';
            }
        } catch (Exception logoEx) {
            logoBase64 = '';
        }
        
        initSafetyKeys();
    }
    
    private void initSafetyKeys(){
        if (isMGLForType     == null) isMGLForType     = false;
        if (isRPTForType     == null) isRPTForType     = false;
        if (isBOMAvailable   == null) isBOMAvailable   = false;
        if (isBOMNotAvailable== null) isBOMNotAvailable= false;
        if (hasTowerGroups   == null) hasTowerGroups   = false;
        if (hasMGLRows       == null) hasMGLRows       = false;
        if (hasRPTRows       == null) hasRPTRows       = false;
        if (isActualMargin   == null) isActualMargin   = false;
        if (isBOMMargin      == null) isBOMMargin      = false;
        if (hasForIncoterms  == null) hasForIncoterms  = false;
        if (hasExIncoterms   == null) hasExIncoterms   = false;
     
        if (towerDetailGroups == null) towerDetailGroups = new List<TowerGroup>();
        if (mglRows == null) mglRows = new List<MGLRow>();
        if (rptRows == null) rptRows = new List<RPTRow>();
     
        if (totalAmount  == null) totalAmount  = 0.00;
        if (todayDate    == null) todayDate    = Date.today().format();
        if (quoteNumber  == null) quoteNumber  = '';
        if (quoteAccount == null) quoteAccount = '';
        if (incotermsVal == null) incotermsVal = 'Ex-works';
    }
    
    public void buildTable(){
        List<Object> lines = (List<Object>) jsonData.get('_Saved_Table_Rows');
        if (lines == null || lines.isEmpty()) return;
        
        towerDetailGroups = new List<TowerGroup>();
        mglRows = new List<MGLRow>();
        rptRows = new List<RPTRow>();
        
        isMGLForType = (gs(jsonData.get('tele_for_type'), '') == 'Minimum Guaranteed Loadability');
        isRPTForType = (gs(jsonData.get('tele_for_type'), '') == 'Per Metric Ton');
        incotermsVal = gs(jsonData.get('Incoterms'), '');
        hasForIncoterms = (incotermsVal == 'F.O.R');
        hasExIncoterms  = (incotermsVal == 'Ex-works');
        
        tcOfferValidity  = gd(jsonData, 'terms_offer_validity_value');
        tcMonthDays      = gd(jsonData, 'terms_offer_month_days');
        tcDeliveryDetail = gs(jsonData.get('terms_offer_delivery_details'), '');
        tcPriceValidity  = gd(jsonData, 'terms_offer_price_validity');
        tcPaymentDetails = gs(jsonData.get('terms_payment_terms'), '');
        
        if (String.isBlank(incotermsVal)) incotermsVal = 'Ex-works';
        
        towerDetailGroups = buildProductTables(lines);
        buildMglAndRptRows(lines);
        
        hasTowerGroups = !towerDetailGroups.isEmpty();
        hasMGLRows     = !mglRows.isEmpty();
        hasRPTRows     = !rptRows.isEmpty();
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Product tables (Angular → Tubular → Tubular Signalling)
    // ─────────────────────────────────────────────────────────────────────
    private List<TowerGroup> buildProductTables(List<Object> lines) {
        List<TowerGroup> groups = new List<TowerGroup>();
        
        // Parse each line once, keeping the saved order.
        List<ParsedLine> parsedLines = new List<ParsedLine>();
        for (Object lineObj : lines) {
            Map<String, Object> line = (Map<String, Object>) lineObj;
            ParsedLine p = parseProductLine(gs(line.get('name'), ''));
            if (p == null) continue;   // MGL / RPT / anything not a product line
            p.line = line;
            parsedLines.add(p);
        }
        if (parsedLines.isEmpty()) return groups;
        
        //System.debug('****line 239 parsed items details' + parsedLines);
        
        isBOMMargin    = false;
        isActualMargin = false;
        Boolean anyBomNotAvailable = false;
        Boolean anyBomAvailable    = false;
        
        for (String towerType : PRODUCT_ORDER) {
            String pfx = PRODUCT_PREFIX.get(towerType);
            
            Map<String, List<Integer>> bomIdxByName = buildProductIndex(pfx + 'product_details');
            Map<String, List<Integer>> awtIdxByName = buildProductIndex(pfx + 'awt_product_details');
            Set<String> usedRows = new Set<String>();   // "<gsm>|<B|A>|<idx>"
            
            Boolean bomMarginOn = gb(jsonData.get(pfx + 'margin_checkbox'),     false);
            Boolean awtMarginOn = gb(jsonData.get(pfx + 'margin_awt_checkbox'), false);
            Boolean rendered    = false;
            
            for (String gsm : gsmList) {
                if (!gb(jsonData.get(pfx + 'gsm_' + gsm), true)) continue;
                
                TowerGroup bomGrp = new TowerGroup();
                bomGrp.subType    = towerType + ' - ' + gsm + ' GSM (Rate as per BOM)';
                bomGrp.showTable  = bomMarginOn;
                
                TowerGroup awtGrp = new TowerGroup();
                awtGrp.subType    = towerType + ' - ' + gsm + ' GSM (Rate as per Actual Weight)';
                awtGrp.showTable  = awtMarginOn;
                
                for (ParsedLine p : parsedLines) {
                    if (p.towerType != towerType || p.gsm != gsm) continue;
                    
                    Integer idx = pickRowIndex(p, pfx, (p.isAWT ? awtIdxByName : bomIdxByName), usedRows);
                    TowerRow r  = buildProductRow(p, pfx, idx);
                    if (p.isAWT) { r.slNo = awtGrp.rows.size() + 1; awtGrp.rows.add(r); }
                    else         { r.slNo = bomGrp.rows.size() + 1; bomGrp.rows.add(r); }
                }
                
                if (!bomGrp.rows.isEmpty()) { groups.add(bomGrp); rendered = true; }
                if (!awtGrp.rows.isEmpty()) { groups.add(awtGrp); rendered = true; }
            }
            
            if (rendered) {
                isBOMMargin    = isBOMMargin    || bomMarginOn;
                isActualMargin = isActualMargin || awtMarginOn;
                String matList = gs(jsonData.get(pfx + 'material_list'), '');
                if (matList == 'BOM Not Availabel') anyBomNotAvailable = true;
                if (matList == 'BOM Availabel')     anyBomAvailable    = true;
            }
        }
        
        // "Not available" wins so the page never prints both price notes.
        isBOMNotAvailable = anyBomNotAvailable;
        isBOMAvailable    = anyBomAvailable && !anyBomNotAvailable;
        
        //System.debug('***line 294 bom availability ' + isBOMNotAvailable + ' ' + isBOMAvailable + ' ' + anyBomAvailable + ' ' + anyBomNotAvailable);
        
        return groups;
    }
    
    /**
     * "{tower_type} - {product_name} - {gsm} GSM[ (AWT)]" -> ParsedLine, else null.
     * Tolerates extra whitespace, casing, and ' - ' inside the product name.
     */
    private ParsedLine parseProductLine(String rawName) {
        if (String.isBlank(rawName)) return null;
        String n = rawName.trim();
        String nLower = n.toLowerCase();
        
        String towerType = null;
        for (String t : PRODUCT_PARSE_ORDER) {
            if (nLower.startsWith(t.toLowerCase() + ' - ')) { towerType = t; break; }
        }
        if (towerType == null) return null;
        
        String rem = n.substring(towerType.length() + 3).trim();
        
        Boolean isAWT = false;
        Integer parenIdx = rem.toUpperCase().lastIndexOf('(AWT)');
        if (parenIdx >= 0 && rem.toUpperCase().substring(parenIdx).trim() == '(AWT)') {
            isAWT = true;
            rem = rem.substring(0, parenIdx).trim();
        }
        
        Integer lastDash = rem.lastIndexOf(' - ');
        if (lastDash < 0) return null;
        
        String productName = rem.substring(0, lastDash).trim();
        String gsmPart     = rem.substring(lastDash + 3).trim();
        if (!gsmPart.toUpperCase().endsWith('GSM')) return null;
        String gsmDigits   = gsmPart.replaceAll('[^0-9]', '');
        
        if (String.isBlank(productName) || !gsmList.contains(gsmDigits)) return null;
        
        ParsedLine p   = new ParsedLine();
        p.towerType    = towerType;
        p.productName  = productName;
        p.gsm          = gsmDigits;
        p.isAWT        = isAWT;
        return p;
    }
    
    /** product name (normalised) -> every row index carrying that name, in row order. */
    private Map<String, List<Integer>> buildProductIndex(String fieldPfx) {
        Map<String, List<Integer>> idxMap = new Map<String, List<Integer>>();
        Integer idx = 1;
        while (jsonData.containsKey(fieldPfx + idx)) {
            String name = normName(gs(jsonData.get(fieldPfx + idx), ''));
            if (String.isNotBlank(name)) {
                if (!idxMap.containsKey(name)) idxMap.put(name, new List<Integer>());
                idxMap.get(name).add(idx);
            }
            idx++;
        }
        return idxMap;
    }
    
    private static String normName(String s) {
        return s == null ? '' : s.trim().toLowerCase();
    }
     
    /**
     * Row index for a line. When two rows share the same product name, prefers the unused row
     * matching both basic rate and quantity, then basic rate, then the first unused row.
     * Returns null if the line names a product row that no longer exists.
     */
    private Integer pickRowIndex(ParsedLine p, String pfx, Map<String, List<Integer>> idxByName, Set<String> usedRows) {
        List<Integer> candidates = idxByName.get(normName(p.productName));
        if (candidates == null || candidates.isEmpty()) return null;
        
        String  rowPfx    = pfx + (p.isAWT ? 'awt_' : '');
        String  bucket    = p.gsm + '|' + (p.isAWT ? 'A' : 'B') + '|';
        Decimal linePrice = gd(p.line, 'unitPrice');
        Integer lineQty   = gi(p.line.get('quantity'));
        
        Integer exact = null, byRate = null, firstFree = null;
        for (Integer idx : candidates) {
            if (usedRows.contains(bucket + idx)) continue;
            if (firstFree == null) firstFree = idx;
            if (gd(jsonData, rowPfx + 'basic_rate' + idx + '_' + p.gsm) == linePrice) {
                if (byRate == null) byRate = idx;
                if (gi(jsonData.get(rowPfx + 'quantity' + idx)) == lineQty) { exact = idx; break; }
            }
        }
        
        Integer chosen = (exact != null) ? exact : ((byRate != null) ? byRate : firstFree);
        if (chosen != null) usedRows.add(bucket + chosen);
        return chosen;
    }
    
    /** Row values from the JSON row data; falls back to the saved line when they are missing. */
    private TowerRow buildProductRow(ParsedLine p, String pfx, Integer idx) {
        TowerRow r    = new TowerRow();
        r.hsnCode     = HSN_CODE;
        r.description = p.productName;
        r.quantity    = gi(p.line.get('quantity'));
        r.uom         = DEFAULT_UOM;
        
        Decimal unitPrice = gd(p.line, 'unitPrice');
        String  rowPfx    = pfx + (p.isAWT ? 'awt_' : '');
        
        if (idx == null) {
            // Line names a product row that no longer exists (renamed/deleted after creation).
            r.towerWeight    = null;
            r.ratePerMT      = '';
            r.unitRate       = fmtNum(unitPrice);
            r.totalBasicRate = fmtNum(unitPrice * r.quantity);
            return r;
        }
        
        r.towerWeight = gd(jsonData, rowPfx + 'tower_weight' + idx);
        r.ratePerMT   = fmtNum(gd(jsonData, rowPfx + 'rate_per_mt' + idx + '_' + p.gsm));
        
        Decimal basicRate = gd(jsonData, rowPfx + 'basic_rate' + idx + '_' + p.gsm);
        if (basicRate == 0) {
            // Stored rate blank/zero - fall back to the saved line values.
            r.unitRate       = fmtNum(unitPrice);
            r.totalBasicRate = fmtNum(unitPrice * r.quantity);
        } else {
            r.unitRate       = fmtNum(basicRate);
            r.totalBasicRate = fmtNum(gd(jsonData, rowPfx + 'total_value' + idx + '_' + p.gsm));
        }
        return r;
    }
    
    private void buildMglAndRptRows(List<Object> lines){
        Integer mglIdx = 1;
        Integer rptIdx = 1;
        
        for (Object lineObj : lines){
            Map<String, Object> line = (Map<String, Object>) lineObj;
            String rawName = gs(line.get('name'), '');
            if (String.isBlank(rawName)) continue;
            
            Integer d1 = rawName.indexOf(' - ');
            if (d1 < 0) continue;
            String tableType = rawName.substring(0, d1).trim();
            
            if (tableType == 'MINIMUM GUARANTEED LOADABILITY') {
                String loc = gs(jsonData.get('mgl_location_' + mglIdx), '');
                if (String.isNotBlank(loc)) {
                    MGLRow r                    = new MGLRow();
                    r.location                  = loc;
                    r.descriptionOfTower        = gs(jsonData.get('mgl_description_of_the_tower_' + mglIdx), '');
                    r.vehicleLoadability        = fmtNum(gd(jsonData, 'mgl_vehicle_loadability_'        + mglIdx));
                    r.minimumGuaranteedFreight  = fmtNum(gd(jsonData, 'mgl_minimum_guranteed_freight_'  + mglIdx));
                    mglRows.add(r);
                }
                mglIdx++; 
            } 
            else if (tableType == 'PER METRIC TON RATE') {
                String loc = gs(jsonData.get('rpt_location_' + rptIdx), '');
                if (String.isNotBlank(loc)) {
                    RPTRow r     = new RPTRow();
                    r.slNo       = gi(jsonData.get('rpt_sl_no' + rptIdx)); 
                    r.location   = loc;
                    r.ratePerTon = fmtNum(gd(jsonData, 'rpt_rate_per_ton_' + rptIdx));
                    rptRows.add(r);
                }
                rptIdx++;
            }
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // utility methods (unchanged)
    // ─────────────────────────────────────────────────────────────────────
    private static Decimal gd(Map<String, Object> m, String key) {
        if (m == null) return 0;
        Object v = m.get(key);
        if (v == null) return 0;
        try { return Decimal.valueOf(String.valueOf(v).trim()); }
        catch (Exception e) { return 0; }
    }
    
    private static Integer gi(Object v) {
        if (v == null) return 0;
        try {
            String s = String.valueOf(v);
            if (s.contains('.')) s = s.substringBefore('.');
            return Integer.valueOf(s);
        } catch (Exception e) { return 0; }
    }
    
    private static String gs(Object v, String def) {
        if (v == null) return def;
        String s = String.valueOf(v);
        return (s == 'null' || s.trim().length() == 0) ? def : s;
    }
    
    private static Boolean gb(Object v, Boolean def) {
        if (v == null) return def;
        if (v instanceof Boolean) return (Boolean) v;
        String s = String.valueOf(v).trim().toLowerCase();
        if (s == 'true')  return true;
        if (s == 'false') return false;
        return def;
    }
    
    private String fmtNum(Decimal d) {
        if (d == null) return '0';
    
        Boolean neg = (d < 0);
        Decimal absD = neg ? -d : d;
        absD = absD.setScale(2, RoundingMode.HALF_UP);
    
        Long wholePart = absD.longValue();
        Integer decPart = ((absD - wholePart) * 100).intValue();
    
        String wholeStr = indianComma(wholePart);
        String result;
    
        if (decPart == 0) {
            result = wholeStr;
        } else {
            String decStr = String.valueOf(decPart);
            if (decStr.length() < 2) decStr = '0' + decStr;
            if (decStr.endsWith('0')) decStr = decStr.substring(0, 1);
            result = wholeStr + '.' + decStr;
        }
    
        return (neg ? '-' : '') + result;
    }
    
    private String indianComma(Long n) {
        if (n == null) return '0';
        Boolean neg = (n < 0);
        String  s   = String.valueOf(Math.abs(n));
        String  res = '';
        Integer len = s.length();
        if (len <= 3) {
            res = s;
        } else {
            res = s.substring(len - 3);
            s   = s.substring(0, len - 3);
            len = s.length();
            while (len > 2) {
                res = s.substring(len - 2) + ',' + res;
                s   = s.substring(0, len - 2);
                len = s.length();
            }
            if (len > 0) res = s + ',' + res;
        }
        return (neg ? '-' : '') + res;
    }
}