/**
 * TPImWeightCalcController - International Marketing "Weight Calculation" sheet for
 * the High Mast department's TRANSMISSION POLE (page TPImWeightCalc).
 *
 * Copy of the Transmission Pole section of HighMastWeightCalcController (HMWeightCalaculationMA):
 * one spec block per pole line (item / segment) read from the c{n}_tp_* / c{n}_tp_s2_* keys the
 * estimator saved, then the Weight & Costing summary. Weights are what the estimator computed;
 * Unit Price / Unit Cost are printed in the quote currency (INR figure / frozen exchange rate).
 * The domestic page and controller are NOT touched.
 */
public class TPImWeightCalcController {

    private static final String IM_PRODUCT_CODE = 'HM';
    private static final Integer MAX_REPEATER_COLS = 10;

    public Quote               quoteRecord  { get; set; }
    public Map<String, Object> jsonData     { get; set; }
    public String  soWRef        { get; set; }
    public String  soWDate       { get; set; }
    public String  currencyCode  { get; set; }
    public String  exchangeRate  { get; set; }
    public Boolean isInr         { get; set; }
    public String  windSpeed     { get; set; }
    public List<TPRow> tpRowList { get; set; }
    public String  imError       { get; set; }
    public Boolean hasImError    { get { return String.isNotBlank(imError); } }

    private Decimal fxRate = 1;

    public TPImWeightCalcController(ApexPages.StandardController stdController) {
        imError = '';
        try {
            init(stdController.getId());
        } catch (Exception e) {
            imError = e.getMessage() + ' (line ' + e.getLineNumber() + ')';
            if (tpRowList == null) tpRowList = new List<TPRow>();
        }
    }

    private void init(Id quoteId) {
        soWDate = Date.today().format();
        soWRef = 'UIL/IM/26-27/001';
        currencyCode = 'INR'; exchangeRate = '1'; isInr = true; windSpeed = '';
        tpRowList = new List<TPRow>();
        jsonData = new Map<String, Object>();

        List<Quote> qs = [SELECT Id, QuoteNumber, Quote_Reference__c, Quote_Value__c, IM_Currency__c FROM Quote WHERE Id = :quoteId LIMIT 1];
        if (qs.isEmpty()) return;
        quoteRecord = qs[0];
        if (String.isNotBlank(quoteRecord.Quote_Reference__c)) soWRef = quoteRecord.Quote_Reference__c;

        List<Map<String, Object>> lines = new List<Map<String, Object>>();
        jsonData = imFlatten(quoteRecord.Quote_Value__c, lines);
        isInr = (currencyCode == 'INR');
        if ('YES'.equalsIgnoreCase(strVal(jsonData, 'tp_wind_speed', 'NO'))) windSpeed = strVal(jsonData, 'tp_wind_speed_value', '');

        Integer idx = 1;
        for (Map<String, Object> l : lines) {
            String nm = strVal(l, 'name', 'Transmission Pole Item');
            Integer col = itemIndexOf(nm);
            Boolean seg2 = Pattern.compile('(?i)segment\\s*-?\\s*2').matcher(nm).find();
            TPRow tp = new TPRow();
            tp.rowIndex = idx++;
            tp.itemName = nm;
            tp.isSeg2 = seg2;
            tp.quantity  = fmt(decVal(l, 'quantity', 1));
            tp.weight    = fmt(decVal(l, 'weight', 0));
            Decimal up = l.get('unitPriceBase') != null ? decVal(l, 'unitPriceBase', 0) : decVal(l, 'unitPrice', 0);
            Decimal uc = l.get('unitCostBase')  != null ? decVal(l, 'unitCostBase', 0)  : decVal(l, 'unitCost', 0);
            tp.unitPrice = fmt(fx(up));
            tp.unitCost  = fmt(fx(uc));
            String cp = 'c' + col + '_tp_' + (seg2 ? 's2_' : '');
            fillSpec(tp, cp, 'c' + col + '_tp_');
            tpRowList.add(tp);
        }
        if (tpRowList.isEmpty()) {
            TPRow tp = new TPRow(); tp.rowIndex = 1; tp.itemName = 'Transmission Pole (please verify quote configuration)';
            tp.quantity = '0'; tp.weight = '0'; tp.unitPrice = '0'; tp.unitCost = '0'; tp.isSeg2 = false;
            fillSpec(tp, 'c1_tp_', 'c1_tp_');
            tpRowList.add(tp);
        }
    }

    private void fillSpec(TPRow tp, String cp, String cp1) {
        tp.poleType         = strVal(jsonData, cp + 'pole_type', 'Polygonal');
        tp.height           = num(cp + 'height_of_pole');
        tp.topDia           = num(cp + 'top_diameter');
        tp.botDia           = num(cp + 'bottom_diameter');
        tp.noOfSides        = strVal(jsonData, cp + 'no_of_polygonal_side', '');
        tp.segLength        = num(cp + 'segment_length');
        tp.thickness        = num(cp + 'segment_thickness');
        tp.bearingPlateType = strVal(jsonData, cp + 'bearing_plate_type', '');
        tp.bpSize           = num(cp + 'size_dia_of_bearing_plate');
        tp.bpThickness      = num(cp + 'thickness_of_bearing_plate');
        tp.poleCabDia       = num(cp + 'pole_cab_dia');
        tp.poleCabThickness = num(cp + 'pole_cab_thickness');
        tp.dan              = num(cp + 'dan');
        tp.note             = strVal(jsonData, cp + 'note', '');
        Object em = jsonData.get(cp + 'extra_micron');
        Boolean emOn = em == true || 'true'.equalsIgnoreCase(String.valueOf(em));
        String emVal = strVal(jsonData, cp + 'extra_micron_value', '');
        tp.extraMicron      = emOn ? (String.isNotBlank(emVal) ? emVal : 'Yes') : 'No';
        tp.specialText      = strVal(jsonData, cp + 'special_desc_text', '');
        Decimal spUp = decVal(jsonData, cp + 'special_desc_unitPrice', null);
        tp.specialUnitPrice = spUp == null ? '' : fmt(fx(spUp));
        tp.realization      = num(cp + 'realization');
        tp.realizationOnPrice = num(cp + 'total_realization_on_segment_price');
        tp.basePrice        = num(cp + 'base_price');
        // segment-2 pole: the two "top" figures are saved under the segment-1 prefix (blueprint naming)
        tp.lenTop  = num(cp1 + 'segment2_length_top');
        tp.lenBot  = num(cp + 'length_bot');
        tp.thkTop  = num(cp1 + 'segment2_thickness_top');
        tp.thkBot  = num(cp + 'thickness_bot');
        tp.overlap = num(cp + 'overlap');
    }

    private Integer itemIndexOf(String name) {
        if (String.isBlank(name)) return 1;
        Matcher m = Pattern.compile('(?i)\\(Item\\s*(\\d+)\\)').matcher(name);
        if (m.find()) { try { Integer n = Integer.valueOf(m.group(1)); if (n >= 1 && n <= MAX_REPEATER_COLS) return n; } catch (Exception e) {} }
        return 1;
    }

    private Map<String, Object> imFlatten(String quoteValueJson, List<Map<String, Object>> linesOut) {
        Map<String, Object> flat = new Map<String, Object>();
        if (String.isBlank(quoteValueJson)) return flat;
        Map<String, Object> qv = (Map<String, Object>) JSON.deserializeUntyped(quoteValueJson);
        Map<String, Object> exp = qv.get('_IM_Export') instanceof Map<String, Object> ? (Map<String, Object>) qv.get('_IM_Export') : new Map<String, Object>();
        String cur = exp.get('currency') == null ? (quoteRecord != null && String.isNotBlank(quoteRecord.IM_Currency__c) ? quoteRecord.IM_Currency__c : 'INR') : String.valueOf(exp.get('currency'));
        currencyCode = cur.split('\\s*-\\s*')[0].trim().toUpperCase();
        Object r = exp.get('exchange_rate');
        if (r != null) { try { fxRate = Decimal.valueOf(String.valueOf(r)); } catch (Exception e) { fxRate = 1; } }
        if (fxRate == null || fxRate <= 0) fxRate = 1;
        exchangeRate = fxRate.setScale(4).toPlainString().replaceAll('0+$', '').replaceAll('\\.$', '');
        Object prods = qv.get('_IM_Products');
        if (prods instanceof Map<String, Object>) {
            Object p = ((Map<String, Object>) prods).get(IM_PRODUCT_CODE);
            if (p instanceof Map<String, Object>) {
                Object saved = ((Map<String, Object>) p).get('saved');
                if (saved instanceof Map<String, Object>) {
                    Map<String, Object> sv = (Map<String, Object>) saved;
                    if (sv.get('v') != null && String.valueOf(sv.get('v')) == '2') {
                        for (String k : new List<String>{ 'seeds', 'calc', 'inputs' }) {
                            if (sv.get(k) instanceof Map<String, Object>) flat.putAll((Map<String, Object>) sv.get(k));
                        }
                    } else { flat.putAll(sv); }
                }
            }
        }
        if (qv.get('_Final_Apex_Lines') instanceof List<Object>) {
            for (Object o : (List<Object>) qv.get('_Final_Apex_Lines')) {
                if (!(o instanceof Map<String, Object>)) continue;
                Map<String, Object> l = (Map<String, Object>) o;
                if (String.valueOf(l.get('product')) != IM_PRODUCT_CODE) continue;
                linesOut.add(l);
            }
        }
        return flat;
    }

    private Decimal fx(Decimal d) { return (d == null || fxRate == null || fxRate == 1) ? d : (d / fxRate).setScale(2, RoundingMode.HALF_UP); }
    private String num(String key) { Decimal d = decVal(jsonData, key, null); return d == null ? '' : fmt(d); }
    private String fmt(Decimal d) {
        if (d == null) return '';
        String s = d.setScale(2, RoundingMode.HALF_UP).toPlainString();
        if (s.endsWith('.00')) s = s.substring(0, s.length() - 3);
        return s;
    }
    private String strVal(Map<String, Object> m, String key, String def) {
        if (m == null || !m.containsKey(key) || m.get(key) == null) return def;
        String v = String.valueOf(m.get(key)).trim();
        return String.isNotBlank(v) ? v : def;
    }
    private Decimal decVal(Map<String, Object> m, String key, Decimal def) {
        if (m == null || !m.containsKey(key) || m.get(key) == null) return def;
        try { String s = String.valueOf(m.get(key)).trim(); return String.isBlank(s) ? def : Decimal.valueOf(s); } catch (Exception e) { return def; }
    }

    public class TPRow {
        public Integer rowIndex         { get; set; }
        public String  itemName         { get; set; }
        public Boolean isSeg2           { get; set; }
        public String  poleType         { get; set; }
        public String  height           { get; set; }
        public String  topDia           { get; set; }
        public String  botDia           { get; set; }
        public String  noOfSides        { get; set; }
        public String  segLength        { get; set; }
        public String  thickness        { get; set; }
        public String  lenTop           { get; set; }
        public String  lenBot           { get; set; }
        public String  thkTop           { get; set; }
        public String  thkBot           { get; set; }
        public String  overlap          { get; set; }
        public String  bearingPlateType { get; set; }
        public String  bpSize           { get; set; }
        public String  bpThickness      { get; set; }
        public String  poleCabDia       { get; set; }
        public String  poleCabThickness { get; set; }
        public String  dan              { get; set; }
        public String  note             { get; set; }
        public String  extraMicron      { get; set; }
        public String  specialText      { get; set; }
        public String  specialUnitPrice { get; set; }
        public String  realization      { get; set; }
        public String  realizationOnPrice { get; set; }
        public String  basePrice        { get; set; }
        public String  weight           { get; set; }
        public String  quantity         { get; set; }
        public String  unitPrice        { get; set; }
        public String  unitCost         { get; set; }
    }
}