/**
 * TPImOfferController - International Marketing offer for the High Mast department's
 * TRANSMISSION POLE (the only High Mast branch offered on the International tab).
 *
 * Extension for BOTH offer pages:
 *   TPImScopeSingle   - one row per pole line with its own SUB-TOTAL (HMScopeSingle layout)
 *   TPImScopeCombined - one numbered product per pole line (HMScopeCombined layout)
 * The domestic pages (HMScopeSingle / HMScopeCombined and their controllers) are NOT touched.
 *
 * Same computation as the domestic Transmission Pole branch of HMScopeCombinedController /
 * HighMastSOWController: description text, special description add-on, per-pole freight on
 * "Per pole/Mast", the Transportation Charges row on "Lump sum", GST, totals, amount in words.
 * Only three things differ:
 *  (1) the JSON is the IM shape - the pole fields live in _IM_Products.HM.saved (v2:
 *      seeds / calc / inputs, keys c{n}_tp_* exactly as the estimator names them) and the
 *      lines in _Final_Apex_Lines (product = HM, unitPriceBase = the rate-card INR price);
 *  (2) everything is computed in INR first, then every money figure is divided by the
 *      quote's frozen exchange rate (_IM_Export.exchange_rate) - rounding happens in INR,
 *      as it always did;
 *  (3) money is grouped the international way (1,234,567.89) unless the currency is INR.
 *      GST stays 18% exactly as on the domestic offer.
 */
public class TPImOfferController {

    private static final String IM_PRODUCT_CODE = 'HM';
    private static final Integer MAX_REPEATER_COLS = 10;

    public Quote               quoteRecord      { get; set; }
    public Map<String, Object> jsonData         { get; set; }

    public String soWRef             { get; set; }
    public String soWDate            { get; set; }
    public String opportunityName    { get; set; }
    public String buyerName          { get; set; }
    public String buyerAddress       { get; set; }
    public String deliveryAddress    { get; set; }
    public String transportationType { get; set; }
    public String deliverytime       { get; set; }
    public String priceVariationdays { get; set; }
    public String quationValidity    { get; set; }
    public String warrFromDOC        { get; set; }
    public String warrFromDOD        { get; set; }
    public String mastTypeLabel      { get; set; }

    public String  currencyCode  { get; set; }   // USD / EUR / INR ...
    public String  exchangeRate  { get; set; }   // INR per 1 unit, as frozen on the quote
    public Boolean isInr         { get; set; }
    public String  gstPctLabel   { get; set; }   // "18" - same as domestic

    public List<PoleRow>      rows          { get; set; }   // every line, in offer order
    public List<ProductGroup> productGroups { get; set; }   // one numbered product per row
    public String grandTotal      { get; set; }
    public String grandTotalWords { get; set; }

    public String loggedInUser      { get; set; }
    public String loggedInUserPhone { get; set; }
    public String loggedInUserTitle { get; set; }
    public String loggedInUserEmail { get; set; }

    public String  imError    { get; set; }
    public Boolean hasImError { get { return String.isNotBlank(imError); } }

    private Decimal fxRate = 1;
    private Decimal gstPct = 18;

    public TPImOfferController(ApexPages.StandardController stdController) {
        imError = '';
        try {
            init(stdController.getId());
        } catch (Exception e) {
            imError = e.getMessage() + ' (line ' + e.getLineNumber() + ')';
            System.debug('TPImOfferController failed: ' + imError);
            if (rows == null) rows = new List<PoleRow>();
            if (productGroups == null) productGroups = new List<ProductGroup>();
        }
    }

    private void init(Id quoteId) {
        soWDate = Date.today().format();
        soWRef = 'UIL/IM/26-27/001';
        buyerName = ''; buyerAddress = ''; deliveryAddress = ''; opportunityName = '';
        mastTypeLabel = ' TRANSMISSION POLE';
        rows = new List<PoleRow>(); productGroups = new List<ProductGroup>();
        grandTotal = '0.00'; grandTotalWords = 'Zero Only';
        currencyCode = 'INR'; exchangeRate = '1'; isInr = true; gstPctLabel = '18';
        jsonData = new Map<String, Object>();

        User u = [SELECT Name, Email, MobilePhone, Title FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];
        loggedInUser = u.Name;
        loggedInUserPhone = String.isNotBlank(u.MobilePhone) ? u.MobilePhone : 'N/A';
        loggedInUserTitle = String.isNotBlank(u.Title) ? u.Title : 'N/A';
        loggedInUserEmail = String.isNotBlank(u.Email) ? u.Email : 'N/A';

        List<Quote> qs = [SELECT Id, QuoteNumber, Quote_Reference__c, Quote_Value__c, IM_Currency__c,
                                 Account.Name, Opportunity.Name
                          FROM Quote WHERE Id = :quoteId LIMIT 1];
        if (qs.isEmpty()) return;
        quoteRecord = qs[0];
        if (String.isNotBlank(quoteRecord.Quote_Reference__c)) soWRef = quoteRecord.Quote_Reference__c;
        buyerName = quoteRecord.Account != null ? quoteRecord.Account.Name : '';
        opportunityName = quoteRecord.Opportunity != null ? quoteRecord.Opportunity.Name : '';

        // ---- the IM JSON -> flat bag + lines -------------------------------------------
        List<Map<String, Object>> lines = new List<Map<String, Object>>();
        jsonData = imFlatten(quoteRecord.Quote_Value__c, lines);
        isInr = (currencyCode == 'INR');
        gstPct = 18;                                   // same as the domestic offer, whatever the currency (Deepanjan, 26 Sep 2026)
        gstPctLabel = String.valueOf(gstPct.intValue());

        Boolean useShipping = jsonData.get('override_existing_address') == true;
        buyerAddress    = buildAddress(jsonData, 'def_');
        deliveryAddress = buildAddress(jsonData, useShipping ? 'ovr_' : 'def_');
        deliverytime       = strVal(jsonData, 'tc_del_schedule', '30') + ' ' + strVal(jsonData, 'tc_del_schedule_in', 'Days');
        priceVariationdays = strVal(jsonData, 'tc_price_variation', '30');
        quationValidity    = strVal(jsonData, 'tc_quot_validity', '5');
        String wDoc = strVal(jsonData, 'tc_comm_months', '12');
        String wDod = strVal(jsonData, 'tc_del_months', '18');
        warrFromDOC = wDoc + ' (' + numberOnly(wDoc) + ')';
        warrFromDOD = wDod + ' (' + numberOnly(wDod) + ')';

        String freight = strVal(jsonData, 'freight_incoterms', 'Ex-works');
        transportationType = freight;
        Boolean perPoleFreight = false; Decimal perPoleCharge = 0;
        String transAs = strVal(jsonData, 'transportation_as', '');
        if (freight == 'F.O.R (Freight on Road)' && transAs == 'Per pole/Mast') {
            perPoleFreight = true;
            perPoleCharge = decVal(jsonData, 'transportation_charges', 0);
        }

        // ---- one row per Transmission Pole line, in the order the estimator produced them --
        Integer sl = 1;
        for (Map<String, Object> l : lines) {
            String nm = strVal(l, 'name', '');
            Integer col = itemIndexOf(nm);
            Integer seg = Pattern.compile('(?i)segment\\s*-?\\s*2').matcher(nm).find() ? 2 : 1;
            String cp  = 'c' + col + '_tp_';
            String cp2 = 'c' + col + '_tp_s2_';

            Decimal qty = decVal(l, 'quantity', 1); if (qty == 0) qty = 1;
            // INR price as the rate card produced it (the converted one is only for the screen)
            Decimal unitPrice = (l.get('unitPriceBase') != null ? decVal(l, 'unitPriceBase', 0) : decVal(l, 'unitPrice', 0)).setScale(2, RoundingMode.HALF_UP);
            Decimal weight = decVal(l, 'weight', 0);

            String descText;
            if (seg == 2) {
                descText = seg2Description(cp, cp2);
                // Special Description of the same item: printed and priced whenever it is filled
                // (the domestic gate c{n}_tp_s2_is_special_desc has no field behind it)
                String t2 = strVal(jsonData, cp2 + 'special_desc_text', '');
                Decimal sp2 = decVal(jsonData, cp2 + 'special_desc_unitPrice', 0);
                if (boolVal(jsonData, cp2 + 'is_special_desc', false) || String.isNotBlank(t2) || sp2 > 0) {
                    if (String.isNotBlank(t2)) descText += '. Special: ' + t2;
                    unitPrice = (unitPrice + sp2).setScale(2, RoundingMode.HALF_UP);
                }
            } else {
                descText = seg1Description(cp);
                // Special Description of the same item: printed and priced whenever it is filled
                // (the domestic gate c{n}_tp_is_special_desc has no field behind it)
                String t1 = strVal(jsonData, cp + 'special_desc_text', '');
                Decimal sp1 = decVal(jsonData, cp + 'special_desc_unitPrice', 0);
                if (boolVal(jsonData, cp + 'is_special_desc', false) || String.isNotBlank(t1) || sp1 > 0) {
                    if (String.isNotBlank(t1)) descText += '. Special: ' + t1;
                    unitPrice = (unitPrice + sp1).setScale(2, RoundingMode.HALF_UP);
                }
            }
            String suffix = windSpeedSuffix();
            if (String.isNotBlank(suffix)) descText += suffix;

            Decimal adjusted = perPoleFreight ? (unitPrice + perPoleCharge).setScale(2, RoundingMode.HALF_UP) : unitPrice;
            rows.add(makeRow(String.valueOf(sl++), descText, adjusted, qty, freight, weight, col, seg, nm));
        }

        // Lump sum transportation: its own row, exactly as the domestic Combined page adds it
        if (transAs.equalsIgnoreCase('Lump sum')) {
            Decimal lump = decVal(jsonData, 'transportation_charges', 0);
            if (lump > 0) rows.add(makeRow(String.valueOf(sl++), 'Transportation Charges ', lump, 1, freight, 0, 0, 0, 'Transportation Charges'));
        }

        if (rows.isEmpty()) rows.add(makeRow('1', 'Supply of TRANSMISSION POLE (please verify quote configuration).', 0, 1, freight, 0, 0, 0, ''));

        // ---- INR -> quote currency, then the printable strings -------------------------
        Decimal sumTotal = 0;
        for (PoleRow r : rows) {
            r.unitRateRaw    = fx(r.unitRateRaw);
            r.gstAmountRaw   = fx(r.gstAmountRaw);
            r.unitAmountRaw  = fx(r.unitAmountRaw);
            r.totalAmountRaw = fx(r.totalAmountRaw);
            r.unitRate    = money(r.unitRateRaw);
            r.gstAmount   = money(r.gstAmountRaw);
            r.unitAmount  = money(r.unitAmountRaw);
            r.totalAmount = money(r.totalAmountRaw);
            sumTotal += r.totalAmountRaw;

            ProductGroup pg = new ProductGroup();
            pg.slNo = r.slNo; pg.rows.add(r);
            pg.showSubTotal = !r.isTransport;
            pg.subUnitRate = r.unitRate; pg.subGstAmount = r.gstAmount; pg.subUnitAmount = r.unitAmount;
            pg.subQty = r.qty; pg.subTotalAmount = r.totalAmount;
            productGroups.add(pg);
        }
        grandTotal = money(sumTotal);
        grandTotalWords = amountInWords(sumTotal);
    }

    // =====================================================================
    // rows
    // =====================================================================
    private PoleRow makeRow(String slNo, String descText, Decimal unitRate, Decimal qty, String freight, Decimal weight, Integer col, Integer seg, String lineName) {
        Decimal rUnit = unitRate.setScale(2, RoundingMode.HALF_UP);
        Decimal gstAmt = (rUnit * gstPct / 100).setScale(2, RoundingMode.HALF_UP);
        Decimal unitAmt = rUnit + gstAmt;
        Decimal total = (unitAmt * qty).setScale(2, RoundingMode.HALF_UP);
        PoleRow r = new PoleRow();
        r.slNo = slNo;
        r.description = escapeHtml(descText);
        r.gstPct = gstPctLabel;
        r.freight = freight;
        r.qty = String.valueOf(qty.intValue());
        r.qtyRaw = qty;
        r.weight = weight;
        r.itemNo = col; r.segment = seg; r.lineName = lineName;
        r.isTransport = descText != null && descText.startsWithIgnoreCase('Transportation Charges');
        r.unitRateRaw = rUnit; r.gstAmountRaw = gstAmt; r.unitAmountRaw = unitAmt; r.totalAmountRaw = total;
        return r;
    }

    /** "Supply of 12 MTR GI Octagonal Transmission Pole, 8 Sided: Top Dia. - 200 mm, ..." - the domestic text */
    private String seg1Description(String cp) {
        Decimal height    = decVal(jsonData, cp + 'height_of_pole', 0);
        String  poleType  = strVal(jsonData, cp + 'pole_type', 'Polygonal');
        String  noOfSides = strVal(jsonData, cp + 'no_of_polygonal_side', '');
        Decimal topDia    = decVal(jsonData, cp + 'top_diameter', 0);
        Decimal botDia    = decVal(jsonData, cp + 'bottom_diameter', 0);
        Decimal segLen    = decVal(jsonData, cp + 'segment_length', 0);
        Decimal thickness = decVal(jsonData, cp + 'segment_thickness', 0);
        String  bpType    = strVal(jsonData, cp + 'bearing_plate_type', '');
        Decimal bpSize    = decVal(jsonData, cp + 'size_dia_of_bearing_plate', 0);
        Decimal bpThk     = decVal(jsonData, cp + 'thickness_of_bearing_plate', 0);
        Decimal cabDia    = decVal(jsonData, cp + 'pole_cab_dia', 0);
        Decimal cabThk    = decVal(jsonData, cp + 'pole_cab_thickness', 0);
        Decimal dan       = decVal(jsonData, cp + 'dan', 0);
        String  note      = strVal(jsonData, cp + 'note', '');
        String  extra     = extraMicron(cp + 'extra_micron', cp + 'extra_micron_value');
        if (noOfSides == '0') noOfSides = '';
        return 'Supply of ' + (height > 0 ? plain(height) + ' MTR ' : '')
            + shapeLabel(poleType, noOfSides) + ' Transmission Pole'
            + (noOfSides != '' ? ', ' + noOfSides + ' Sided' : '')
            + ': Top Dia. - ' + topDia.intValue() + ' mm, '
            + 'Bottom Dia. - ' + botDia.intValue() + ' mm'
            + (segLen > 0 ? ', Length - ' + segLen.intValue() + ' mm' : '')
            + (thickness > 0 ? ', Thickness - ' + plain(thickness) + ' mm' : '')
            + (bpType != '' ? '. ' + bearingPlateDesc(bpType, bpSize, bpThk) : '')
            + (cabDia > 0 ? '. Cable Dia: ' + cabDia.intValue() + ' mm' : '')
            + (cabThk > 0 ? ', Thickness: ' + plain(cabThk) + ' mm' : '')
            + (dan > 0 ? '. DAN: ' + dan.intValue() : '')
            + (extra != '' ? ', with ' + extra + ' micron' : '')
            + (note != '' ? '. Note: ' + note : '')
            + '.';
    }

    private String seg2Description(String cp, String cp2) {
        Decimal height    = decVal(jsonData, cp2 + 'height_of_pole', 0);
        String  poleType  = strVal(jsonData, cp2 + 'pole_type', 'Conical');
        String  noOfSides = strVal(jsonData, cp2 + 'no_of_polygonal_side', '');
        Decimal topDia    = decVal(jsonData, cp2 + 'top_diameter', 0);
        Decimal botDia    = decVal(jsonData, cp2 + 'bottom_diameter', 0);
        Decimal lenTop    = decVal(jsonData, cp + 'segment2_length_top', 0);      // the blueprint names these two without s2_
        Decimal lenBot    = decVal(jsonData, cp2 + 'length_bot', 0);
        Decimal thkTop    = decVal(jsonData, cp + 'segment2_thickness_top', 0);
        Decimal thkBot    = decVal(jsonData, cp2 + 'thickness_bot', 0);
        String  bpType    = strVal(jsonData, cp2 + 'bearing_plate_type', '');
        Decimal bpSize    = decVal(jsonData, cp2 + 'size_dia_of_bearing_plate', 0);
        Decimal bpThk     = decVal(jsonData, cp2 + 'thickness_of_bearing_plate', 0);
        Decimal cabDia    = decVal(jsonData, cp2 + 'pole_cab_dia', 0);
        Decimal cabThk    = decVal(jsonData, cp2 + 'pole_cab_thickness', 0);
        Decimal dan       = decVal(jsonData, cp2 + 'dan', 0);
        String  note      = strVal(jsonData, cp2 + 'note', '');
        String  extra     = extraMicron(cp2 + 'extra_micron', cp2 + 'extra_micron');
        if (noOfSides == '0') noOfSides = '';
        return 'Supply of ' + (height > 0 ? plain(height) + ' MTR ' : '')
            + shapeLabel(poleType, noOfSides) + ' Transmission Pole'
            + (noOfSides != '' ? ', ' + noOfSides + ' Sided' : '')
            + ': Top Dia. - ' + topDia.intValue() + ' mm, '
            + 'Bottom Dia. - ' + botDia.intValue() + ' mm'
            + (lenTop > 0 ? ', Length(Top) - ' + lenTop.intValue() + ' mm' : '')
            + (lenBot > 0 ? ', Length(Bot) - ' + lenBot.intValue() + ' mm' : '')
            + (thkTop > 0 ? ', Thickness(Top) - ' + plain(thkTop) + ' mm' : '')
            + (thkBot > 0 ? ', Thickness(Bot) - ' + plain(thkBot) + ' mm' : '')
            + (bpType != '' ? '. ' + bearingPlateDesc(bpType, bpSize, bpThk) : '')
            + (cabDia > 0 ? '. Cable Dia: ' + cabDia.intValue() + ' mm' : '')
            + (cabThk > 0 ? ', Thickness: ' + plain(cabThk) + ' mm' : '')
            + (dan > 0 ? '. DAN: ' + dan.intValue() : '')
            + (extra != '' ? ', with ' + extra + ' micron' : '')
            + (note != '' ? '. Note: ' + note : '')
            + '.';
    }

    /** "EXTRA MICRON?" is a checkbox and the value a text; the domestic text prints ", with <value> micron" */
    private String extraMicron(String flagKey, String valueKey) {
        Object flag = jsonData.get(flagKey);
        Boolean isOn = flag == true || 'true'.equalsIgnoreCase(String.valueOf(flag));
        String v = strVal(jsonData, valueKey, '');
        if (isOn && String.isNotBlank(v) && v != 'true') return v;
        if (!isOn && String.isNotBlank(v) && v != 'true' && v != 'false' && flagKey == valueKey) return v;   // segment 2: the value field shares the flag's name
        return '';
    }

    private String shapeLabel(String poleType, String noOfSides) {
        if (String.isBlank(poleType)) return 'GI Octagonal';
        String pt = poleType.trim();
        if (pt.equalsIgnoreCase('Conical')) return 'GI Conical';
        if (pt.equalsIgnoreCase('Polygonal') || pt.equalsIgnoreCase('Octagonal')) {
            String sides = String.isBlank(noOfSides) ? '8' : noOfSides.trim();
            if (sides == '8') return 'GI Octagonal';
            return 'GI ' + sides + '-Sided Polygonal';
        }
        return 'GI ' + pt;
    }

    private String bearingPlateDesc(String bpType, Decimal bpSize, Decimal bpThk) {
        String sz = String.valueOf(bpSize.intValue());
        String th = plain(bpThk);
        if (bpType != null && bpType.equalsIgnoreCase('Circular')) return 'Bearing Plate- Dia ' + sz + ' x ' + th + ' mm';
        return 'Bearing Plate- ' + sz + ' x ' + sz + ' x ' + th + ' mm';
    }

    private String windSpeedSuffix() {
        if (!'YES'.equalsIgnoreCase(strVal(jsonData, 'tp_wind_speed', 'NO'))) return '';
        String v = strVal(jsonData, 'tp_wind_speed_value', '');
        return String.isBlank(v) ? '' : ' wind speed ' + v + '.';     // the domestic suffix, verbatim
    }

    private Integer itemIndexOf(String name) {
        if (String.isBlank(name)) return 1;
        Matcher m = Pattern.compile('(?i)\\(Item\\s*(\\d+)\\)').matcher(name);
        if (m.find()) { try { Integer n = Integer.valueOf(m.group(1)); if (n >= 1 && n <= MAX_REPEATER_COLS) return n; } catch (Exception e) {} }
        return 1;
    }

    // =====================================================================
    // IM JSON
    // =====================================================================
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

    // =====================================================================
    // money
    // =====================================================================
    private Decimal fx(Decimal d) { return (d == null || fxRate == null || fxRate == 1) ? d : (d / fxRate).setScale(2, RoundingMode.HALF_UP); }

    /** INR keeps the lakh/crore grouping of the domestic offer; every other currency prints 1,234,567.89 */
    private String money(Decimal val) { return isInr ? formatINR(val) : formatIntl(val); }

    private String formatINR(Decimal val) {
        if (val == null) return '0.00';
        Decimal d = val.setScale(2, RoundingMode.HALF_UP);
        Boolean neg = d < 0; d = d.abs();
        Long whole = d.setScale(2, RoundingMode.DOWN).longValue();
        Integer paise = ((d - whole) * 100).setScale(2, RoundingMode.HALF_UP).intValue();
        if (paise >= 100) { whole += 1; paise = 0; }
        String s = String.valueOf(whole);
        String grouped;
        if (s.length() <= 3) grouped = s;
        else {
            String result = s.substring(s.length() - 3);
            String remaining = s.substring(0, s.length() - 3);
            while (remaining.length() > 2) { result = remaining.substring(remaining.length() - 2) + ',' + result; remaining = remaining.substring(0, remaining.length() - 2); }
            grouped = remaining + ',' + result;
        }
        return (neg ? '-' : '') + grouped + '.' + (paise < 10 ? '0' : '') + String.valueOf(paise);
    }

    private String formatIntl(Decimal val) {
        if (val == null) return '0.00';
        Decimal d = val.setScale(2, RoundingMode.HALF_UP);
        Boolean neg = d < 0; d = d.abs();
        Long whole = d.setScale(2, RoundingMode.DOWN).longValue();
        Integer cents = ((d - whole) * 100).setScale(2, RoundingMode.HALF_UP).intValue();
        if (cents >= 100) { whole += 1; cents = 0; }
        String s = String.valueOf(whole);
        String grouped = '';
        while (s.length() > 3) { grouped = ',' + s.substring(s.length() - 3) + grouped; s = s.substring(0, s.length() - 3); }
        grouped = s + grouped;
        return (neg ? '-' : '') + grouped + '.' + (cents < 10 ? '0' : '') + String.valueOf(cents);
    }

    private String amountInWords(Decimal amt) {
        if (amt == null) amt = 0;
        Decimal d = amt.setScale(2, RoundingMode.HALF_UP);
        Long whole = d.setScale(0, RoundingMode.DOWN).longValue();
        Long frac = ((d - whole) * 100).setScale(0, RoundingMode.HALF_UP).longValue();
        if (frac >= 100) { whole += 1; frac = 0; }
        String w = isInr ? wordsIndian(whole) : wordsIntl(whole);
        String minor = isInr ? 'Paise' : 'Cents';
        if (frac == 0) return w;
        return w.removeEnd(' Only').trim() + ' and ' + (isInr ? wordsIndian(frac) : wordsIntl(frac)).removeEnd(' Only').trim() + ' ' + minor + ' Only';
    }

    private static final String[] ONES = new String[]{ '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen' };
    private static final String[] TENS = new String[]{ '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety' };

    private String wordsIndian(Long num) {
        if (num == 0) return 'Zero Only';
        String result = '';
        Long crore = num / 10000000; num = Math.mod(num, 10000000);
        Long lakh = num / 100000;    num = Math.mod(num, 100000);
        Long thou = num / 1000;      num = Math.mod(num, 1000);
        Long hund = num / 100;       num = Math.mod(num, 100);
        if (crore > 0) result += twoD(crore) + ' Crore ';
        if (lakh > 0)  result += twoD(lakh) + ' Lakh ';
        if (thou > 0)  result += twoD(thou) + ' Thousand ';
        if (hund > 0)  result += ONES[(Integer) hund] + ' Hundred ';
        if (num > 0)   result += twoD(num) + ' ';
        return result.trim() + ' Only';
    }

    private String wordsIntl(Long num) {
        if (num == 0) return 'Zero Only';
        String result = '';
        Long billion = num / 1000000000; num = Math.mod(num, 1000000000);
        Long million = num / 1000000;    num = Math.mod(num, 1000000);
        Long thou = num / 1000;          num = Math.mod(num, 1000);
        if (billion > 0) result += threeD(billion) + ' Billion ';
        if (million > 0) result += threeD(million) + ' Million ';
        if (thou > 0)    result += threeD(thou) + ' Thousand ';
        if (num > 0)     result += threeD(num) + ' ';
        return result.trim() + ' Only';
    }

    private String threeD(Long n) {
        Long h = n / 100; Long rem = Math.mod(n, 100);
        String s = h > 0 ? ONES[(Integer) h] + ' Hundred' : '';
        if (rem > 0) s += (s == '' ? '' : ' ') + twoD(rem);
        return s;
    }

    private String twoD(Long n) {
        if (n < 0) n = 0;
        if (n < 20) return ONES[(Integer) n];
        Integer t = (Integer) (n / 10);
        if (t > 9) { Long h = n / 100; Long rem = Math.mod(n, 100); return twoD(h) + ' Hundred' + (rem > 0 ? ' ' + twoD(rem) : ''); }
        return TENS[t] + (Math.mod(n, 10) > 0 ? ' ' + ONES[(Integer) Math.mod(n, 10)] : '');
    }

    /** "12" -> "Twelve" for the warranty clause */
    private String numberOnly(String s) {
        try { return wordsIndian(Decimal.valueOf(s).longValue()).removeEnd(' Only').trim(); } catch (Exception e) { return s; }
    }

    // =====================================================================
    // helpers
    // =====================================================================
    private String buildAddress(Map<String, Object> m, String prefix) {
        if (m == null) return '';
        List<String> parts = new List<String>();
        for (String sfx : new List<String>{ 'street', 'city', 'state', 'zip', 'country' }) {
            Object v = m.get(prefix + sfx);
            if (v == null) continue;
            String s = String.valueOf(v).trim();
            if (String.isNotBlank(s) && !s.equalsIgnoreCase('Not Found') && !s.equalsIgnoreCase('null')) parts.add(s);
        }
        String out = String.join(parts, ', ');
        return String.isNotBlank(out) ? ' ' + out : '';
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
    private Boolean boolVal(Map<String, Object> m, String key, Boolean def) {
        if (m == null || !m.containsKey(key) || m.get(key) == null) return def;
        Object v = m.get(key);
        if (v instanceof Boolean) return (Boolean) v;
        return 'true'.equalsIgnoreCase(String.valueOf(v));
    }
    /** 12 -> "12", 2.5 -> "2.5" (no trailing zeros) */
    private String plain(Decimal d) {
        if (d == null) return '0';
        String s = d.setScale(3, RoundingMode.HALF_UP).toPlainString();
        if (s.contains('.')) { s = s.replaceAll('0+$', ''); s = s.replaceAll('\\.$', ''); }
        return s;
    }
    private String escapeHtml(String d) {
        if (d == null) return '';
        return d.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;');
    }

    // =====================================================================
    // wrappers
    // =====================================================================
    public class PoleRow {
        public String  slNo          { get; set; }
        public String  description   { get; set; }   // HTML-escaped, printed with escape="false" like the domestic pages
        public String  unitRate      { get; set; }
        public String  gstPct        { get; set; }
        public String  gstAmount     { get; set; }
        public String  freight       { get; set; }
        public String  unitAmount    { get; set; }
        public String  qty           { get; set; }
        public String  totalAmount   { get; set; }
        public Decimal qtyRaw        { get; set; }
        public Decimal weight        { get; set; }
        public Integer itemNo        { get; set; }
        public Integer segment       { get; set; }
        public String  lineName      { get; set; }
        public Boolean isTransport   { get; set; }
        public Decimal unitRateRaw   { get; set; }
        public Decimal gstAmountRaw  { get; set; }
        public Decimal unitAmountRaw { get; set; }
        public Decimal totalAmountRaw{ get; set; }
    }
    public class ProductGroup {
        public String        slNo           { get; set; }
        public List<PoleRow> rows           { get; set; }
        public Boolean       showSubTotal   { get; set; }
        public String        subUnitRate    { get; set; }
        public String        subGstAmount   { get; set; }
        public String        subUnitAmount  { get; set; }
        public String        subQty         { get; set; }
        public String        subTotalAmount { get; set; }
        public ProductGroup() { rows = new List<PoleRow>(); showSubTotal = true; }
    }
}