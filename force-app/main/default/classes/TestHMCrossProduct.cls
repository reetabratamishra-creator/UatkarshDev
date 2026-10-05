/*
* Class Name  : TestHMCrossProduct
* Author      : Deepanjan
* Date        : 27 September 2026
* Description : Tests for the High Mast cross product classes -
*               HighMastSOWControllerCP, HMScopeCombinedControllerCP,
*               HighMastWeightCalcControllerCP and HMCrossProductController.
*
*               Data comes from the existing TestHighMastDataFactory (not changed):
*               every factory mast quote is run through each CP controller (the
*               single-product path, identical to the original controllers), and one
*               extra quote is built that joins several factory quotes into ONE
*               cross-product quote (_HM_Products), which drives the per-product loop.
*               The same quote is also saved in the COMPACT shape (_HM_V = 2, written
*               by createQuote when a 2+ product quote is large); every CP controller
*               must print exactly the same from it. A one-product factory quote is
*               saved compact too (what the host writes when a one-product quote is too
*               long for Quote_Value__c): the CP controllers must print it exactly as the
*               ORIGINAL controllers print the plain quote.
*               [hm-stadium] A Stadium with 3 Man Riding Lifts and 2 Ladders With Cage
*               must print every lift and ladder (each lift with its own KIT line) in all
*               three CP documents, lift 1 exactly as a one-lift quote prints it, and must
*               take the CP pages; a one-lift, one-ladder Stadium keeps the mapped pages.
*               Deepanjan (29 September 2026)
*/
@IsTest
private class TestHMCrossProduct {

    private static final String CROSS_NAME = 'HMCP Cross Product Quote';
    private static final String COMPACT_NAME = 'HMCP Cross Product Quote Compact';
    private static final String COMPACT_SINGLE_NAME = 'HMCP One Product Quote Compact';

    @TestSetup
    static void makeData() {
        TestHighMastDataFactory.setupAll();

        // Join the factory quotes into one cross-product quote. Product 1 is the
        // first payload itself (flat at the root, as createQuote saves it); every
        // next payload becomes an entry of _HM_Products with its own keys, and its
        // lines are tagged with its key and appended to the root lists.
        List<String> names = TestHighMastDataFactory.allMastQuoteNames();
        List<Quote> src = [SELECT Id, Name, Quote_Value__c, OpportunityId
                           FROM Quote WHERE Name IN :names ORDER BY Name];
        Map<String, Object> root = null;
        List<Object> prods = new List<Object>();
        List<Object> allLines = new List<Object>();
        List<Object> allRows = new List<Object>();
        Id oppId = null;
        Quote one = null;   // the first payload that parses (product 1); also the one-product compact quote below

        for (Quote q : src) {
            if (String.isBlank(q.Quote_Value__c)) continue;
            Map<String, Object> m;
            try { m = (Map<String, Object>) JSON.deserializeUntyped(q.Quote_Value__c); }
            catch (Exception e) { continue; }
            oppId = q.OpportunityId;
            String key = 'p' + String.valueOf(prods.size() + 1);

            List<Object> lines = tagged(m.get('_Final_Apex_Lines'), key);
            List<Object> rows  = tagged(m.get('_Saved_Table_Rows'), key);

            Map<String, Object> rec = new Map<String, Object>{
                'key'   => key,
                'type'  => m.get('type_of_mast') == null ? '' : String.valueOf(m.get('type_of_mast')),
                'sub'   => '',
                'label' => q.Name
            };
            if (root == null) {
                root = m;
                one = q;
            } else {
                Map<String, Object> vals = new Map<String, Object>();
                for (String k : m.keySet()) if (!k.startsWith('_')) vals.put(k, m.get(k));
                rec.put('values', vals);
            }
            // stay well inside the Quote_Value__c length
            Map<String, Object> trial = root.clone();
            List<Object> trialProds = prods.clone(); trialProds.add(rec);
            trial.put('_HM_Products', trialProds);
            if (prods.size() >= 2 && JSON.serialize(trial).length() + JSON.serialize(allLines).length()
                                     + JSON.serialize(lines).length() + JSON.serialize(allRows).length()
                                     + JSON.serialize(rows).length() > 110000) {
                break;
            }
            prods.add(rec);
            allLines.addAll(lines);
            allRows.addAll(rows);
        }
        System.assert(root != null && prods.size() >= 2, 'The factory must give at least two mast payloads');

        root.put('_Final_Apex_Lines', allLines);
        root.put('_Saved_Table_Rows', allRows);
        root.put('_HM_Products', prods);
        root.put('_HM_Shared', new List<Object>{ 'freight_incoterms', 'transportation_as', 'transportation_charges' });
        root.put('_Saved_Template_Name', 'High Mast - Department');
        insert new Quote(Name = CROSS_NAME, OpportunityId = oppId, Quote_Value__c = JSON.serialize(root));

        String compact = JSON.serialize(toCompact(root));
        System.assert(compact.length() < 131072, 'the compact test quote fits Quote_Value__c');
        insert new Quote(Name = COMPACT_NAME, OpportunityId = oppId, Quote_Value__c = compact);

        // one product, compact: the first factory quote, same data (Description = its name)
        // (one = the quote product 1 came from - a payload that parses, see the loop above)
        Map<String, Object> oneRoot = (Map<String, Object>) JSON.deserializeUntyped(one.Quote_Value__c);
        if (oneRoot.get('_Saved_Template_Name') == null) oneRoot.put('_Saved_Template_Name', 'High Mast - Department');
        oneRoot.put('_HM_Products', new List<Object>{ new Map<String, Object>{
            'key' => 'p1', 'type' => oneRoot.get('type_of_mast') == null ? '' : String.valueOf(oneRoot.get('type_of_mast')),
            'sub' => '', 'label' => one.Name } });
        oneRoot.put('_HM_Shared', new List<Object>());
        insert new Quote(Name = COMPACT_SINGLE_NAME, Description = one.Name, OpportunityId = one.OpportunityId,
                         Quote_Value__c = JSON.serialize(toCompact(oneRoot)));
    }

    // The compact shape (_HM_V = 2) of a plain cross-product root, in its simplest valid
    // form: templates written whole ("0:" + template), one group per row-key family,
    // one group per line. createQuote writes it tighter; the reader is the same.
    private static Map<String, Object> toCompact(Map<String, Object> plain) {
        Pattern rowKey = Pattern.compile('(r|c|kit_line_)([0-9]+)_(.+)');
        Pattern ident = Pattern.compile('[A-Za-z0-9_]+');
        Set<String> shared = new Set<String>();
        for (Object k : (List<Object>) plain.get('_HM_Shared')) shared.add(String.valueOf(k));
        List<String> lineNames = new List<String>{ '_pendingLineItems', '_Final_Apex_Lines', '_Saved_Table_Rows' };
        List<String> codes = new List<String>{ 'p', 'a', 'r' };

        Map<String, Object> outM = new Map<String, Object>();
        Map<String, Object> first = new Map<String, Object>();
        for (String k : plain.keySet()) {
            if (k == '_HM_Products' || lineNames.contains(k)) continue;
            if ((k.startsWith('_') && k != '_Dynamic_Product_Name') || shared.contains(k)) outM.put(k, plain.get(k));
            else first.put(k, plain.get(k));
        }

        List<Object> tpl = new List<Object>();
        Map<String, Integer> tIdx = new Map<String, Integer>();
        List<Object> prodsOut = new List<Object>();
        List<Object> prods = (List<Object>) plain.get('_HM_Products');
        for (Integer i = 0; i < prods.size(); i++) {
            Map<String, Object> rec = ((Map<String, Object>) prods[i]).clone();
            Map<String, Object> vals = (i == 0) ? first : (Map<String, Object>) rec.remove('values');
            Map<String, Object> plainKeys = new Map<String, Object>();
            Map<String, List<String>> rowsOf = new Map<String, List<String>>();
            Map<String, List<Object>> valsOf = new Map<String, List<Object>>();
            for (String k : vals.keySet()) {
                Matcher mt = rowKey.matcher(k);
                if (!ident.matcher(k).matches() || !mt.matches()) { plainKeys.put(k, vals.get(k)); continue; }
                String t = mt.group(1) + '~_' + mt.group(3);
                if (!tIdx.containsKey(t)) { tIdx.put(t, tpl.size()); tpl.add('0:' + t); }
                if (!rowsOf.containsKey(t)) { rowsOf.put(t, new List<String>()); valsOf.put(t, new List<Object>()); }
                rowsOf.get(t).add(mt.group(2));
                valsOf.get(t).add(vals.get(k));
            }
            List<Object> groups = new List<Object>();
            for (String t : rowsOf.keySet()) {
                groups.add(new List<Object>{ String.join(rowsOf.get(t), ','), new List<Object>{ tIdx.get(t) }, new List<Object>{ valsOf.get(t) } });
            }
            rec.put('v', new Map<String, Object>{ 'p' => plainKeys, 'g' => groups });
            prodsOut.add(rec);
        }

        List<Object> keyNames = new List<Object>();
        Map<String, Integer> kIdx = new Map<String, Integer>();
        Map<String, Object> lines = new Map<String, Object>{ 'k' => keyNames, 's' => new List<Object>() };
        for (Integer c = 0; c < 3; c++) {
            if (!(plain.get(lineNames[c]) instanceof List<Object>)) continue;
            List<Object> arr = (List<Object>) plain.get(lineNames[c]);
            List<Object> groups = new List<Object>();
            List<Object> raw = new List<Object>();
            for (Integer li = 0; li < arr.size(); li++) {
                if (!(arr[li] instanceof Map<String, Object>)) { raw.add(new List<Object>{ li, arr[li] }); continue; }
                Map<String, Object> o = (Map<String, Object>) arr[li];
                List<Object> ks = new List<Object>();
                List<Object> cols = new List<Object>();
                for (String k : o.keySet()) {
                    if (!kIdx.containsKey(k)) { kIdx.put(k, keyNames.size()); keyNames.add(k); }
                    ks.add(kIdx.get(k));
                    Object v = o.get(k);
                    if (v instanceof String && ((String) v).startsWith('~')) v = '~' + (String) v;
                    cols.add(new List<Object>{ v });
                }
                groups.add(new List<Object>{ ks, new List<Object>{ li }, cols });
            }
            Map<String, Object> e = new Map<String, Object>{ 'n' => arr.size(), 'g' => groups };
            if (!raw.isEmpty()) e.put('x', raw);
            lines.put(codes[c], e);
        }

        outM.put('_HM_V', 2);
        outM.put('_HM_T', tpl);
        outM.put('_HM_Lines', lines);
        outM.put('_HM_Products', prodsOut);
        return outM;
    }

    private static List<Object> tagged(Object raw, String key) {
        List<Object> outL = new List<Object>();
        if (!(raw instanceof List<Object>)) return outL;
        for (Object o : (List<Object>) raw) {
            if (o instanceof Map<String, Object>) {
                Map<String, Object> l = ((Map<String, Object>) o).clone();
                l.put('_hmKey', key);
                outL.add(l);
            }
        }
        return outL;
    }

    private static Quote crossQuote() {
        return [SELECT Id, Name, Quote_Value__c, OpportunityId FROM Quote WHERE Name = :CROSS_NAME LIMIT 1];
    }

    private static Quote compactQuote() {
        return [SELECT Id, Name, Quote_Value__c, OpportunityId FROM Quote WHERE Name = :COMPACT_NAME LIMIT 1];
    }

    private static Quote compactSingle() {
        return [SELECT Id, Name, Description, Quote_Value__c, OpportunityId FROM Quote WHERE Name = :COMPACT_SINGLE_NAME LIMIT 1];
    }

    private static Integer productCount() {
        Map<String, Object> m = (Map<String, Object>) JSON.deserializeUntyped(crossQuote().Quote_Value__c);
        return ((List<Object>) m.get('_HM_Products')).size();
    }

    // ── single-product path: every factory mast type, each CP controller ──────
    @IsTest
    static void sowCpEveryMastType() {
        Test.startTest();
        for (String n : TestHighMastDataFactory.allMastQuoteNames()) {
            Quote q = TestHighMastDataFactory.quoteNamed(n);
            HighMastSOWControllerCP ctl = new HighMastSOWControllerCP(TestHighMastDataFactory.stdCtrl(q.Id));
            System.assertNotEquals(null, ctl.lineItems, 'lineItems for ' + n);
            System.assertNotEquals(null, ctl.lineGroups, 'lineGroups for ' + n);
        }
        Test.stopTest();
    }

    @IsTest
    static void combinedCpEveryMastType() {
        Test.startTest();
        for (String n : TestHighMastDataFactory.allMastQuoteNames()) {
            Quote q = TestHighMastDataFactory.quoteNamed(n);
            HMScopeCombinedControllerCP ctl = new HMScopeCombinedControllerCP(TestHighMastDataFactory.stdCtrl(q.Id));
            System.assertNotEquals(null, ctl.productGroups, 'productGroups for ' + n);
        }
        Test.stopTest();
    }

    @IsTest
    static void weightCpEveryMastType() {
        Test.startTest();
        for (String n : TestHighMastDataFactory.allMastQuoteNames()) {
            Quote q = TestHighMastDataFactory.quoteNamed(n);
            HighMastWeightCalcControllerCP ctl = new HighMastWeightCalcControllerCP(TestHighMastDataFactory.stdCtrl(q.Id));
            System.assertEquals(1, ctl.sheets.size(), 'one sheet for a single-product quote ' + n);
        }
        Test.stopTest();
    }

    // ── cross-product path ─────────────────────────────────────────────────────
    @IsTest
    static void sowCpCrossProduct() {
        Quote q = crossQuote();
        Test.startTest();
        HighMastSOWControllerCP ctl = new HighMastSOWControllerCP(TestHighMastDataFactory.stdCtrl(q.Id));
        Test.stopTest();
        System.assert(!ctl.lineItems.isEmpty(), 'a cross-product quote prints line items');
        for (HighMastSOWControllerCP.LineGroupWrapper g : ctl.lineGroups) {
            System.assertNotEquals(null, g.subLabel, 'every line item names its product in the SUB-TOTAL');
        }
    }

    @IsTest
    static void combinedCpCrossProduct() {
        Quote q = crossQuote();
        Test.startTest();
        HMScopeCombinedControllerCP ctl = new HMScopeCombinedControllerCP(TestHighMastDataFactory.stdCtrl(q.Id));
        Test.stopTest();
        System.assert(!ctl.productGroups.isEmpty(), 'a cross-product quote prints product groups');
        for (HMScopeCombinedControllerCP.ProductGroupWrapper g : ctl.productGroups) {
            System.assertNotEquals(null, g.subLabel, 'every product group carries its own SUB-TOTAL label');
        }
    }

    @IsTest
    static void weightCpCrossProduct() {
        Quote q = crossQuote();
        Integer n = productCount();
        Test.startTest();
        HighMastWeightCalcControllerCP ctl = new HighMastWeightCalcControllerCP(TestHighMastDataFactory.stdCtrl(q.Id));
        Test.stopTest();
        System.assertEquals(n, ctl.sheets.size(), 'one weight sheet per product');
        System.assert(ctl.sheets[1].productPrefix.startsWith('PRODUCT 2 OF '), 'sheet 2 is titled with its product');
    }

    // ── compact shape (_HM_V = 2): the same documents as the plain shape ────────
    @IsTest
    static void sowCpCompactSameAsPlain() {
        Quote plainQ = crossQuote();
        Quote compactQ = compactQuote();
        Integer n = productCount();
        Test.startTest();
        HighMastSOWControllerCP a = new HighMastSOWControllerCP(TestHighMastDataFactory.stdCtrl(plainQ.Id));
        HighMastSOWControllerCP b = new HighMastSOWControllerCP(TestHighMastDataFactory.stdCtrl(compactQ.Id));
        Test.stopTest();
        System.assertEquals(JSON.serialize(a.lineItems), JSON.serialize(b.lineItems), 'same line items');
        System.assertEquals(JSON.serialize(a.lineGroups), JSON.serialize(b.lineGroups), 'same SUB-TOTAL groups');
        System.assertEquals(false, b.jsonData.containsKey('_HM_V'), 'compact markers are gone after reading');
        for (Integer i = 0; i < n; i++) {
            Map<String, Object> ma = a.hmProductMap(a.jsonData, i);
            Map<String, Object> mb = b.hmProductMap(b.jsonData, i);
            ma.remove('_pendingLineItems');   // read by no Apex; the compact reader does not keep it
            System.assertEquals(ma, mb, 'product ' + (i + 1) + ' reads the same keys and values');
        }
    }

    @IsTest
    static void combinedCpCompactSameAsPlain() {
        Quote plainQ = crossQuote();
        Quote compactQ = compactQuote();
        Test.startTest();
        HMScopeCombinedControllerCP a = new HMScopeCombinedControllerCP(TestHighMastDataFactory.stdCtrl(plainQ.Id));
        HMScopeCombinedControllerCP b = new HMScopeCombinedControllerCP(TestHighMastDataFactory.stdCtrl(compactQ.Id));
        Test.stopTest();
        System.assertEquals(JSON.serialize(a.mastGroups), JSON.serialize(b.mastGroups), 'same mast groups');
        System.assertEquals(JSON.serialize(a.productGroups), JSON.serialize(b.productGroups), 'same product groups');
    }

    @IsTest
    static void weightCpCompactSameAsPlain() {
        Quote plainQ = crossQuote();
        Quote compactQ = compactQuote();
        Test.startTest();
        HighMastWeightCalcControllerCP a = new HighMastWeightCalcControllerCP(TestHighMastDataFactory.stdCtrl(plainQ.Id));
        HighMastWeightCalcControllerCP b = new HighMastWeightCalcControllerCP(TestHighMastDataFactory.stdCtrl(compactQ.Id));
        Test.stopTest();
        System.assertEquals(JSON.serialize(a.sheets), JSON.serialize(b.sheets), 'same weight sheets');
    }

    // One product saved compact: the CP classes print it exactly as the ORIGINAL classes
    // print the same quote saved plain.
    @IsTest
    static void compactSinglePrintsLikeTheOriginal() {
        Quote c = compactSingle();
        Quote p = [SELECT Id, Name FROM Quote WHERE Name = :c.Description LIMIT 1];
        Test.startTest();
        HighMastSOWController o1 = new HighMastSOWController(TestHighMastDataFactory.stdCtrl(p.Id));
        HighMastSOWControllerCP c1 = new HighMastSOWControllerCP(TestHighMastDataFactory.stdCtrl(c.Id));
        HMScopeCombinedController o2 = new HMScopeCombinedController(TestHighMastDataFactory.stdCtrl(p.Id));
        HMScopeCombinedControllerCP c2 = new HMScopeCombinedControllerCP(TestHighMastDataFactory.stdCtrl(c.Id));
        HighMastWeightCalcController o3 = new HighMastWeightCalcController(TestHighMastDataFactory.stdCtrl(p.Id));
        HighMastWeightCalcControllerCP c3 = new HighMastWeightCalcControllerCP(TestHighMastDataFactory.stdCtrl(c.Id));
        Test.stopTest();
        System.assertEquals(JSON.serialize(o1.lineItems), JSON.serialize(c1.lineItems), 'Single Scope: same rows');
        System.assertEquals(o1.grandTotal, c1.grandTotal, 'Single Scope: same total');
        System.assertEquals(o1.grandTotalWords, c1.grandTotalWords);
        System.assertEquals(o2.grandTotal, c2.grandTotal, 'Combined: same total');
        System.assertEquals(o2.grandTotalWords, c2.grandTotalWords);
        System.assertEquals(JSON.serialize(o3.rowDataList), JSON.serialize(c3.rowDataList), 'Weight: same rows');
        System.assertEquals(JSON.serialize(o3.lpRowList), JSON.serialize(c3.lpRowList));
        System.assertEquals(o3.mastTypeTitle, c3.mastTypeTitle);
        System.assertEquals(1, c3.sheets.size(), 'one product: one sheet');
        System.assertEquals(true, HMCrossProductController.isCrossProduct(c.Id), 'a compact one-product quote takes the CP pages');
        System.assertEquals(false, HMCrossProductController.isCrossProduct(p.Id), 'the plain one-product quote does not');
    }

    // Every part of the compact reader, on a hand-written quote: templates (front-coded),
    // row ranges, one-value columns, trailing '' left off, a repeated value list ({c}),
    // front-coded text ({f}), runs ({l}), one value ({u}), repeated strings ("~0"), an
    // escaped "~~", references to another list ({r}) and to the same list, with an offset,
    // and a line that is not a key/value map (x).
    @IsTest
    static void compactReaderExact() {
        String js = '{"q":"Q","_Saved_Template_Name":"High Mast - Department","_HM_V":2,"_HM_Shared":["q"],'
            + '"_HM_T":["0:r~_lm_height","6:qty","0:kit_line_~_name"],'
            + '"_HM_Products":[{"key":"p1","type":"A","sub":"","label":"A","v":{"p":{"type_of_mast":"A","blank_one":"","null_one":null,"tilde":"~x"},'
            + '"g":[["1-3",[0,1],[["10","~x"],"5"]],["2,05",[2],[["n2","n5"]]]]}},'
            + '{"key":"p2","type":"B","sub":"","label":"B","v":{"p":{"type_of_mast":"B"},"g":[["1-3",[0],[{"c":0}]],["4",[2],[null]]]}}],'
            + '"_HM_Lines":{"k":["name","_hmKey","unitPrice","qty","grp","id"],"s":["0:LONG STRING ONE","12:TWO"],'
            + '"p":{"n":4,"g":[["0-4","0-3",[{"f":["0:ITEM A1","6:2","6:3","0:OTHER"]},{"u":"p1"},[100,200,300,400],{"l":[1,3,2,1]},{"l":["~0",2,"~~t",2]}]]]},'
            + '"a":{"n":5,"g":[["0-3","0-3",[{"r":[0,0]},{"r":[0,1]},{"r":[0,2]},{"r":[1,2]}]]],"x":[[4,{"name":"Transportation"}]]},'
            + '"r":{"n":5,"g":[["5",[0],[["PARENT"]]],["5,0,4,3",[1,2,3,4],[["t1","t2","t3","t4"],{"r":[1,0,-1]},{"r":[0,4,-1]},{"r":[0,3,-1]}]]]}}}';
        Map<String, Object> root = (Map<String, Object>) JSON.deserializeUntyped(js);
        Quote single = TestHighMastDataFactory.quoteNamed(TestHighMastDataFactory.allMastQuoteNames()[0]);
        HighMastSOWControllerCP ctl = new HighMastSOWControllerCP(TestHighMastDataFactory.stdCtrl(single.Id));

        Test.startTest();
        ctl.hmDecodeV2(root);
        Map<String, Object> p1 = ctl.hmProductMap(root, 0);
        Map<String, Object> p2 = ctl.hmProductMap(root, 1);
        Integer sizeAfter = root.size();
        ctl.hmDecodeV2(root);                               // a second call changes nothing
        Test.stopTest();

        System.assertEquals(sizeAfter, root.size());
        System.assert(!root.containsKey('_HM_V') && !root.containsKey('_HM_T') && !root.containsKey('_HM_Lines'), 'markers removed');
        // product 1 = the root
        System.assertEquals('A', root.get('type_of_mast'));
        System.assertEquals('10', root.get('r1_lm_height'));
        System.assertEquals('~x', root.get('r2_lm_height'), 'product values are never unescaped');
        System.assertEquals('', root.get('r3_lm_height'), 'a trailing blank comes back');
        System.assertEquals('5', root.get('r1_lm_qty'));
        System.assertEquals('5', root.get('r3_lm_qty'));
        System.assertEquals('n2', root.get('kit_line_2_name'));
        System.assertEquals('n5', root.get('kit_line_05_name'), 'row numbers kept as written');
        System.assertEquals('', root.get('blank_one'));
        System.assert(root.containsKey('null_one') && root.get('null_one') == null, 'a null value comes back as null');
        // product 2, unpacked when its turn comes
        System.assertEquals('B', p2.get('type_of_mast'));
        System.assertEquals('10', p2.get('r1_lm_height'), '{c: 0} repeats the first value list');
        System.assertEquals('~x', p2.get('r2_lm_height'));
        System.assertEquals('', p2.get('r3_lm_height'));
        System.assert(p2.containsKey('kit_line_4_name') && p2.get('kit_line_4_name') == null);
        System.assertEquals('Q', p2.get('q'), 'quote-level keys under every product');
        System.assertEquals(2, p2.get('_HM_Index'));
        System.assertEquals('', p1.get('transportation_as'), 'lump sum line on the last product only');
        // lines
        List<Object> a = (List<Object>) root.get('_Final_Apex_Lines');
        List<Object> r = (List<Object>) root.get('_Saved_Table_Rows');
        System.assertEquals(5, a.size());
        System.assertEquals(5, r.size());
        Map<String, Object> a0 = (Map<String, Object>) a[0];
        Map<String, Object> a3 = (Map<String, Object>) a[3];
        System.assertEquals('ITEM A1', a0.get('name'), '{f} front-coded text via {r}');
        System.assertEquals('p1', a0.get('_hmKey'), '{u} via {r}');
        System.assertEquals(100, a0.get('unitPrice'));
        System.assertEquals(100, a0.get('qty'), 'a reference to an earlier column of the same list');
        System.assertEquals('OTHER', a3.get('name'));
        System.assertEquals(400, a3.get('qty'));
        System.assertEquals('Transportation', ((Map<String, Object>) a[4]).get('name'), 'x: a line written whole');
        System.assertEquals('PARENT', ((Map<String, Object>) r[0]).get('id'));
        System.assertEquals('ITEM A1', ((Map<String, Object>) r[1]).get('name'), 'a reference with an offset');
        System.assertEquals('OTHER', ((Map<String, Object>) r[4]).get('name'));
        System.assertEquals('LONG STRING ONE', ((Map<String, Object>) r[1]).get('grp'), 'a repeated string ("~0") in a run');
        System.assertEquals('LONG STRING ONE', ((Map<String, Object>) r[2]).get('grp'));
        System.assertEquals('~t', ((Map<String, Object>) r[3]).get('grp'), '"~~t" is the text "~t"');
        System.assertEquals(1, ((Map<String, Object>) r[1]).get('qty'), 'runs {l}');
        System.assertEquals(2, ((Map<String, Object>) r[4]).get('qty'));
        System.assertEquals(4, ((List<Object>) p1.get('_Final_Apex_Lines')).size(), 'product 1: its own lines');
        System.assertEquals(1, ((List<Object>) p2.get('_Final_Apex_Lines')).size(), 'last product: the untagged line');
        // _pendingLineItems is read only for the references (no Apex reads it)
        Map<String, Object> enc = (Map<String, Object>) JSON.deserializeUntyped(js);
        Map<String, Object> probe = new Map<String, Object>();
        ctl.hmDecodeLines(enc.get('_HM_Lines'), probe);
        System.assertEquals(false, probe.containsKey('_pendingLineItems'));
        System.assertEquals(2, probe.size(), '_Final_Apex_Lines and _Saved_Table_Rows');
        // plain JSON is left alone
        Map<String, Object> plainRoot = new Map<String, Object>{ 'x' => 1, '_HM_Products' => new List<Object>() };
        ctl.hmDecodeV2(plainRoot);
        System.assertEquals(2, plainRoot.size());
        ctl.hmDecodeV2(null);
    }

    // ── HMCrossProductController ───────────────────────────────────────────────
    @IsTest
    static void detection() {
        Quote cross = crossQuote();
        Quote single = TestHighMastDataFactory.quoteNamed(TestHighMastDataFactory.allMastQuoteNames()[0]);
        System.assertEquals(true, HMCrossProductController.isCrossProduct(cross.Id));
        System.assertEquals(true, HMCrossProductController.isCrossProduct(compactQuote().Id), 'the compact shape is a cross-product quote too');
        System.assertEquals(false, HMCrossProductController.isCrossProduct(single.Id));
        System.assertEquals(false, HMCrossProductController.isCrossProduct(null));
    }

    @IsTest
    static void captureQuoteTotalBothPaths() {
        Quote cross = crossQuote();
        Quote single = TestHighMastDataFactory.quoteNamed(TestHighMastDataFactory.allMastQuoteNames()[0]);
        Test.startTest();
        HMCrossProductController.captureQuoteTotal(cross.Id);
        HMCrossProductController.captureQuoteTotal(single.Id);   // handed to CreateQuoteController
        Test.stopTest();
        Decimal expected = HMCrossProductController.crossProductTotal(cross.Id);
        Quote after = [SELECT Final_Quote_Amount__c FROM Quote WHERE Id = :cross.Id];
        if (expected != null) {
            System.assertEquals(expected, after.Final_Quote_Amount__c, 'APPLY writes the cross-product total');
        }
    }

    @IsTest
    static void captureOfferTotalBothPaths() {
        Quote cross = crossQuote();
        Quote single = TestHighMastDataFactory.quoteNamed(TestHighMastDataFactory.allMastQuoteNames()[0]);
        Test.startTest();
        // An org validation rule on Opportunity may refuse the stage/amount update;
        // either way the method must end in a handled state.
        try { HMCrossProductController.captureOfferTotal(cross.Id, cross.OpportunityId); }
        catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }
        try { HMCrossProductController.captureOfferTotal(single.Id, single.OpportunityId); }
        catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }
        Test.stopTest();
    }

    @IsTest
    static void finalizeBothPaths() {
        Quote cross = crossQuote();
        Test.startTest();
        try { HMCrossProductController.finalizeQuoteAndAttachDocs(cross.OpportunityId, cross.Id); }
        catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }
        try { HMCrossProductController.finalizeQuoteAndAttachDocs(null, null); }   // handed to CreateQuoteController
        catch (AuraHandledException e) { System.assertNotEquals(null, e.getMessage()); }
        Test.stopTest();
    }

    @IsTest
    static void documentList() {
        Quote cross = crossQuote();
        Test.startTest();
        HMCrossProductController.DocInfo info = HMCrossProductController.getCrossProductDocuments(cross.Id);
        HMCrossProductController.DocInfo none = HMCrossProductController.getCrossProductDocuments(null);
        Test.stopTest();
        System.assertEquals(true, info.crossProduct);
        System.assertNotEquals(null, info.docs);
        // every mapped High Mast page is served by its CP copy (the CP pages ship with this class)
        for (HMCrossProductController.DocRow d : info.docs) {
            if (d.page != null && (d.page.startsWith('HMScope') || d.page.startsWith('HMWeight'))) {
                System.assert(d.page.endsWith('CP'), 'the CP page is listed, not ' + d.page);
            }
        }
        System.assertEquals(false, none.crossProduct);
        System.assertEquals(0, none.docs.size());
    }

    @IsTest
    static void pageNameHelpers() {
        Set<String> cp = new Set<String>{ 'hmscopesinglecp' };
        System.assertEquals('/apex/HMScopeSingleCP', HMCrossProductController.cpUrl('/apex/HMScopeSingle', cp));
        System.assertEquals('/apex/HMScopeSingleCP?x=1', HMCrossProductController.cpUrl('/apex/HMScopeSingle?x=1', cp));
        System.assertEquals('/apex/HMScopeCombined', HMCrossProductController.cpUrl('/apex/HMScopeCombined', cp));
        System.assertEquals('HMScopeSingle', HMCrossProductController.bareName('/apex/HMScopeSingle?id=1'));
        System.assertEquals(null, HMCrossProductController.bareName('/apex/bad page'));
        System.assertEquals(null, HMCrossProductController.bareName(null));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ORIGINAL vs CP on the SAME plain one-product quote (audit of 28th September 2026).
    // For every factory mast type, every value the page prints must be identical:
    // the CP classes may only ADD (the product labels), never change a figure, a text
    // or a row. The CP pages print grp.subLabel / grp.accLabel / prod.subLabel where the
    // originals print mastTypeLabel / accessoriesLabel, so those are checked against the
    // original's labels; the Weight CP page prints the same fields from sheets[0].
    // The factory list is split in three (index mod 3) to stay inside the SOQL limit.
    // ═════════════════════════════════════════════════════════════════════════
    private static final Set<String> CP_LABELS = new Set<String>{ 'subLabel', 'accLabel' };

    private static List<String> slice(Integer k) {
        List<String> all = TestHighMastDataFactory.allMastQuoteNames();
        List<String> out = new List<String>();
        for (Integer i = 0; i < all.size(); i++) {
            if (Math.mod(i, 3) == k) out.add(all[i]);
        }
        return out;
    }

    private static Object dropKeys(Object u, Set<String> drop) {
        if (u instanceof Map<String, Object>) {
            Map<String, Object> m = (Map<String, Object>) u;
            Map<String, Object> o = new Map<String, Object>();
            for (String k : m.keySet()) {
                if (!drop.contains(k)) o.put(k, dropKeys(m.get(k), drop));
            }
            return o;
        }
        if (u instanceof List<Object>) {
            List<Object> o = new List<Object>();
            for (Object x : (List<Object>) u) o.add(dropKeys(x, drop));
            return o;
        }
        return u;
    }

    // the same data with the CP-only label properties taken out
    private static String withoutLabels(Object o) {
        return JSON.serialize(dropKeys(JSON.deserializeUntyped(JSON.serialize(o)), CP_LABELS));
    }

    private static void sowParity(Integer k) {
        for (String n : slice(k)) {
            Quote q = TestHighMastDataFactory.quoteNamed(n);
            HighMastSOWController o = new HighMastSOWController(TestHighMastDataFactory.stdCtrl(q.Id));
            HighMastSOWControllerCP c = new HighMastSOWControllerCP(TestHighMastDataFactory.stdCtrl(q.Id));
            String w = ' - ' + n;
            System.assertEquals(JSON.serialize(o.lineItems), JSON.serialize(c.lineItems), 'lineItems' + w);
            System.assertEquals(withoutLabels(o.lineGroups), withoutLabels(c.lineGroups), 'lineGroups' + w);
            if (c.lineGroups != null) {
                for (HighMastSOWControllerCP.LineGroupWrapper g : c.lineGroups) {
                    System.assertEquals(o.mastTypeLabel, g.subLabel, 'SUB-TOTAL label' + w);
                }
            }
            System.assertEquals(o.mastTypeLabel, c.mastTypeLabel, 'mastTypeLabel' + w);
            System.assertEquals(o.grandTotal, c.grandTotal, 'grandTotal' + w);
            System.assertEquals(o.grandTotalWords, c.grandTotalWords, 'grandTotalWords' + w);
            System.assertEquals(o.subTotalUnitRate, c.subTotalUnitRate, 'subTotalUnitRate' + w);
            System.assertEquals(o.subTotalGST, c.subTotalGST, 'subTotalGST' + w);
            System.assertEquals(o.subTotalUnit, c.subTotalUnit, 'subTotalUnit' + w);
            System.assertEquals(o.subTotalAmount, c.subTotalAmount, 'subTotalAmount' + w);
            System.assertEquals(o.transportationType, c.transportationType, 'transportationType' + w);
            System.assertEquals(o.buyerName, c.buyerName, 'buyerName' + w);
            System.assertEquals(o.buyerAddress, c.buyerAddress, 'buyerAddress' + w);
            System.assertEquals(o.deliveryAddress, c.deliveryAddress, 'deliveryAddress' + w);
            System.assertEquals(o.deliverytime, c.deliverytime, 'deliverytime' + w);
            System.assertEquals(o.opportunityName, c.opportunityName, 'opportunityName' + w);
            System.assertEquals(o.priceVariationdays, c.priceVariationdays, 'priceVariationdays' + w);
            System.assertEquals(o.quationValidity, c.quationValidity, 'quationValidity' + w);
            System.assertEquals(o.soWDate, c.soWDate, 'soWDate' + w);
            System.assertEquals(o.soWRef, c.soWRef, 'soWRef' + w);
            System.assertEquals(o.warrFromDOC, c.warrFromDOC, 'warrFromDOC' + w);
            System.assertEquals(o.warrFromDOD, c.warrFromDOD, 'warrFromDOD' + w);
            System.assertEquals(o.loggedInUser, c.loggedInUser, 'loggedInUser' + w);
            System.assertEquals(o.loggedInUserEmail, c.loggedInUserEmail, 'loggedInUserEmail' + w);
            System.assertEquals(o.loggedInUserPhone, c.loggedInUserPhone, 'loggedInUserPhone' + w);
            System.assertEquals(o.loggedInUserTitle, c.loggedInUserTitle, 'loggedInUserTitle' + w);
        }
    }

    private static void combinedParity(Integer k) {
        for (String n : slice(k)) {
            Quote q = TestHighMastDataFactory.quoteNamed(n);
            HMScopeCombinedController o = new HMScopeCombinedController(TestHighMastDataFactory.stdCtrl(q.Id));
            HMScopeCombinedControllerCP c = new HMScopeCombinedControllerCP(TestHighMastDataFactory.stdCtrl(q.Id));
            String w = ' - ' + n;
            System.assertEquals(withoutLabels(o.mastGroups), withoutLabels(c.mastGroups), 'mastGroups' + w);
            System.assertEquals(withoutLabels(o.productGroups), withoutLabels(c.productGroups), 'productGroups' + w);
            if (c.mastGroups != null) {
                for (HMScopeCombinedControllerCP.MastGroupWrapper g : c.mastGroups) {
                    System.assertEquals(o.mastTypeLabel, g.subLabel, 'group mast label' + w);
                    System.assertEquals(o.accessoriesLabel, g.accLabel, 'group accessories label' + w);
                }
            }
            if (c.productGroups != null) {
                for (HMScopeCombinedControllerCP.ProductGroupWrapper g : c.productGroups) {
                    if (g.showSubTotal == true) System.assertEquals(o.mastTypeLabel, g.subLabel, 'SUB-TOTAL label' + w);
                }
            }
            System.assertEquals(o.mastTypeLabel, c.mastTypeLabel, 'mastTypeLabel' + w);
            System.assertEquals(o.accessoriesLabel, c.accessoriesLabel, 'accessoriesLabel' + w);
            System.assertEquals(o.grandTotal, c.grandTotal, 'grandTotal' + w);
            System.assertEquals(o.grandTotalWords, c.grandTotalWords, 'grandTotalWords' + w);
            System.assertEquals(o.subTotalUnitRate, c.subTotalUnitRate, 'subTotalUnitRate' + w);
            System.assertEquals(o.subTotalGST, c.subTotalGST, 'subTotalGST' + w);
            System.assertEquals(o.subTotalUnit, c.subTotalUnit, 'subTotalUnit' + w);
            System.assertEquals(o.subTotalAmount, c.subTotalAmount, 'subTotalAmount' + w);
            System.assertEquals(o.transportationType, c.transportationType, 'transportationType' + w);
            System.assertEquals(o.buyerName, c.buyerName, 'buyerName' + w);
            System.assertEquals(o.buyerAddress, c.buyerAddress, 'buyerAddress' + w);
            System.assertEquals(o.deliveryAddress, c.deliveryAddress, 'deliveryAddress' + w);
            System.assertEquals(o.deliverytime, c.deliverytime, 'deliverytime' + w);
            System.assertEquals(o.opportunityName, c.opportunityName, 'opportunityName' + w);
            System.assertEquals(o.priceVariationdays, c.priceVariationdays, 'priceVariationdays' + w);
            System.assertEquals(o.quationValidity, c.quationValidity, 'quationValidity' + w);
            System.assertEquals(o.soWDate, c.soWDate, 'soWDate' + w);
            System.assertEquals(o.soWRef, c.soWRef, 'soWRef' + w);
            System.assertEquals(o.warrFromDOC, c.warrFromDOC, 'warrFromDOC' + w);
            System.assertEquals(o.warrFromDOD, c.warrFromDOD, 'warrFromDOD' + w);
            System.assertEquals(o.loggedInUser, c.loggedInUser, 'loggedInUser' + w);
            System.assertEquals(o.loggedInUserEmail, c.loggedInUserEmail, 'loggedInUserEmail' + w);
            System.assertEquals(o.loggedInUserPhone, c.loggedInUserPhone, 'loggedInUserPhone' + w);
            System.assertEquals(o.loggedInUserTitle, c.loggedInUserTitle, 'loggedInUserTitle' + w);
        }
    }

    private static void weightParity(Integer k) {
        for (String n : slice(k)) {
            Quote q = TestHighMastDataFactory.quoteNamed(n);
            HighMastWeightCalcController o = new HighMastWeightCalcController(TestHighMastDataFactory.stdCtrl(q.Id));
            HighMastWeightCalcControllerCP c = new HighMastWeightCalcControllerCP(TestHighMastDataFactory.stdCtrl(q.Id));
            String w = ' - ' + n;
            System.assertEquals(1, c.sheets.size(), 'one sheet for one product' + w);
            HighMastWeightCalcControllerCP.WeightSheet s = c.sheets[0];
            System.assertEquals('', s.productPrefix, 'no product prefix on a one-product quote' + w);
            System.assertEquals(o.mastTypeTitle, s.mastTypeTitle, 'mastTypeTitle' + w);
            System.assertEquals(JSON.serialize(o.rowDataList), JSON.serialize(s.rowDataList), 'rowDataList' + w);
            System.assertEquals(JSON.serialize(o.lpRowList), JSON.serialize(s.lpRowList), 'lpRowList' + w);
            System.assertEquals(JSON.serialize(o.lpDisplayList), JSON.serialize(s.lpDisplayList), 'lpDisplayList' + w);
            System.assertEquals(JSON.serialize(o.tpRowList), JSON.serialize(s.tpRowList), 'tpRowList' + w);
            System.assertEquals(JSON.serialize(o.mhpRowList), JSON.serialize(s.mhpRowList), 'mhpRowList' + w);
            System.assertEquals(JSON.serialize(o.fmAccessoryList), JSON.serialize(s.fmAccessoryList), 'fmAccessoryList' + w);
            System.assertEquals(JSON.serialize(o.fmAdditionalList), JSON.serialize(s.fmAdditionalList), 'fmAdditionalList' + w);
            System.assertEquals(o.isLightingPole, s.isLightingPole, 'isLightingPole' + w);
            System.assertEquals(o.isTransmissionPole, s.isTransmissionPole, 'isTransmissionPole' + w);
            System.assertEquals(o.isFlagMast, s.isFlagMast, 'isFlagMast' + w);
            System.assertEquals(o.hasAdditionalAcc, s.hasAdditionalAcc, 'hasAdditionalAcc' + w);
            System.assertEquals(o.accRate, s.accRate, 'accRate' + w);
            System.assertEquals(o.accRealization, s.accRealization, 'accRealization' + w);
            System.assertEquals(o.accRealizationAmount, s.accRealizationAmount, 'accRealizationAmount' + w);
            System.assertEquals(o.accTotalRate, s.accTotalRate, 'accTotalRate' + w);
            System.assertEquals(o.hasSpecialItem, s.hasSpecialItem, 'hasSpecialItem' + w);
            System.assertEquals(o.siType, s.siType, 'siType' + w);
            System.assertEquals(o.siDescription, s.siDescription, 'siDescription' + w);
            System.assertEquals(o.siValue, s.siValue, 'siValue' + w);
            System.assertEquals(o.hasFmAccessory, s.hasFmAccessory, 'hasFmAccessory' + w);
            System.assertEquals(o.hasFmAdditional, s.hasFmAdditional, 'hasFmAdditional' + w);
            System.assertEquals(o.fmAcTotal, s.fmAcTotal, 'fmAcTotal' + w);
            System.assertEquals(o.fmAddTotal, s.fmAddTotal, 'fmAddTotal' + w);
            System.assertEquals(o.soWDate, c.soWDate, 'soWDate' + w);
            System.assertEquals(o.soWRef, c.soWRef, 'soWRef' + w);
        }
    }

    @IsTest static void sowOriginalVsCp0() { Test.startTest(); sowParity(0); Test.stopTest(); }
    @IsTest static void sowOriginalVsCp1() { Test.startTest(); sowParity(1); Test.stopTest(); }
    @IsTest static void sowOriginalVsCp2() { Test.startTest(); sowParity(2); Test.stopTest(); }
    @IsTest static void combinedOriginalVsCp0() { Test.startTest(); combinedParity(0); Test.stopTest(); }
    @IsTest static void combinedOriginalVsCp1() { Test.startTest(); combinedParity(1); Test.stopTest(); }
    @IsTest static void combinedOriginalVsCp2() { Test.startTest(); combinedParity(2); Test.stopTest(); }
    @IsTest static void weightOriginalVsCp0() { Test.startTest(); weightParity(0); Test.stopTest(); }
    @IsTest static void weightOriginalVsCp1() { Test.startTest(); weightParity(1); Test.stopTest(); }
    @IsTest static void weightOriginalVsCp2() { Test.startTest(); weightParity(2); Test.stopTest(); }

    // ── [hm-stadium] STADIUM MAST: several Man Riding Lifts / Ladders With Cage ─────────
    // Deepanjan (29th September 2026). Lift k is m<k>_mrl_ (lift 1 mrl_), ladder k is
    // l<k>_lwc_ (ladder 1 lwc_), lift k's KIT is kit_line_k - the keys the Stadium
    // estimator and createQuote save. Every copy must print as its own line item /
    // product / weight row, every lift with its own KIT, and lift 1 exactly as a
    // one-lift quote prints it.
    private static void stadiumBlock(Map<String, Object> m, String p, Boolean isMrl, Integer ht) {
        m.put(p + 'no_of_segment', '3');
        m.put(p + 'segment_height', String.valueOf(ht - 1));
        m.put(p + 'head_frame_height', '1');
        m.put(p + 'height_of_mast', String.valueOf(ht));
        m.put(p + 'quantity', '1');
        m.put(p + 'top_dia', '150');
        m.put(p + 'bottom_dia', '450');
        m.put(p + 'top_segment_length', '7000');
        m.put(p + 'top_segment_thickness', '4');
        m.put(p + 'middle_segment_length', '7000');
        m.put(p + 'middle_segment_thickness', '5');
        m.put(p + 'bottom_length', '7000');
        m.put(p + 'bottom_thickness', '6');
        m.put(p + 'bp_diameter', '650');
        m.put(p + 'bp_thickness', '32');
        m.put(p + 'bp_pcd', '550');
        m.put(p + 'fb_diameter', '30');
        m.put(p + 'fb_length', '1200');
        m.put(p + 'fb_no_of_bolt', '12');
        m.put(p + 'fb_quantity', '1');
        m.put(p + 'foundation_unit_price', '25000');
        m.put(p + 'foundation_weight', '150');
        if (isMrl) {
            m.put(p + 'man_riding_unit_price', String.valueOf(300000 + ht));
            m.put(p + 'man_riding_total_weight', '2500');
            m.put(p + 'man_riding_base_price', '110');
            m.put(p + 'man_riding_unit_cost', '280000');
            m.put(p + 'mast_acc_foundation_unit_price', '60000');
            m.put(p + 'mast_acc_quantity', '1');
            m.put(p + 'mast_acc_description', 'Lift ' + String.valueOf(ht));
        } else {
            m.put(p + 'ladder_cage_unit_price', String.valueOf(200000 + ht));
            m.put(p + 'ladder_cage_weight', '1800');
            m.put(p + 'ladder_cage_base_price', '110');
            m.put(p + 'ladder_cage_unit_cost', '180000');
            m.put(p + 'acc_description', 'Ladder ' + String.valueOf(ht));
            m.put(p + 'acc_weight', '120');
            m.put(p + 'unit_price', '15000');
        }
    }

    private static void stadiumKitLine(Map<String, Object> m, Integer k, Integer ht) {
        String kp = 'kit_line_' + String.valueOf(k) + '_';
        m.put(kp + 'lm_mast_height', String.valueOf(ht * 10));
        m.put(kp + 'no_of_segment_select', '3');
        m.put(kp + 'lm_qty_of_hm', '1');
        m.put(kp + 'lm_type_of_winch', 'E=350 kg');
        m.put(kp + 'lm_type_of_power_tool', 'G=Motor,3PH');
        m.put(kp + 'lm_type_of_wire_rope', '5=5mm dia');
        m.put(kp + 'lm_cable_type', 'T=2.5 SQmm 5Core');
        m.put(kp + 'lm_no_of_cable', '1=Single cable');
        m.put(kp + 'lm_3_kit_unit_price', String.valueOf(40000 + ht));
        m.put(kp + 'lm_3_kit_base_price', '38000');
    }

    private static Quote stadiumQuote(String name, Integer lifts, Integer ladders) {
        Map<String, Object> m = new Map<String, Object>{
            'type_of_mast' => 'Customized Mast',
            'mast_customized' => 'STADIUM MAST',
            'man_riding_lift' => true,
            'man_riding_lift_count' => String.valueOf(lifts),
            'ladder_with_cage' => true,
            'ladder_with_cage_count' => String.valueOf(ladders),
            'freight_incoterms' => 'Ex-works',
            '_Saved_Template_Name' => 'High Mast - Department',
            '_Final_Apex_Lines' => new List<Object>(),
            '_Saved_Table_Rows' => new List<Object>()
        };
        for (Integer k = 1; k <= lifts; k++) {
            stadiumBlock(m, k == 1 ? 'mrl_' : 'm' + String.valueOf(k) + '_mrl_', true, 20 + k);
            stadiumKitLine(m, k, 20 + k);
        }
        for (Integer k = 1; k <= ladders; k++) {
            stadiumBlock(m, k == 1 ? 'lwc_' : 'l' + String.valueOf(k) + '_lwc_', false, 15 + k);
        }
        Quote src = [SELECT OpportunityId FROM Quote WHERE OpportunityId != null LIMIT 1];
        Quote q = new Quote(Name = name, OpportunityId = src.OpportunityId, Quote_Value__c = JSON.serialize(m));
        insert q;
        return q;
    }

    private static Integer countContaining(List<String> texts, String needle) {
        Integer n = 0;
        for (String t : texts) if (t != null && t.contains(needle)) n++;
        return n;
    }

    @IsTest
    static void stadiumLiftsSingleScope() {
        Quote many = stadiumQuote('HMCP Stadium 3 lifts 2 ladders', 3, 2);
        Quote one  = stadiumQuote('HMCP Stadium 1 lift 1 ladder', 1, 1);
        Test.startTest();
        HighMastSOWControllerCP a = new HighMastSOWControllerCP(TestHighMastDataFactory.stdCtrl(many.Id));
        HighMastSOWControllerCP b = new HighMastSOWControllerCP(TestHighMastDataFactory.stdCtrl(one.Id));
        Test.stopTest();
        List<String> da = new List<String>();
        for (HighMastSOWControllerCP.LineItemWrapper w : a.lineItems) da.add(w.description);
        List<String> db = new List<String>();
        for (HighMastSOWControllerCP.LineItemWrapper w : b.lineItems) db.add(w.description);
        System.assertEquals(5, countContaining(da, 'STADIUM MAST FABRICATED PART'), '3 lifts + 2 ladders: 5 mast lines');
        System.assertEquals(2, countContaining(db, 'STADIUM MAST FABRICATED PART'), '1 lift + 1 ladder: 2 mast lines');
        System.assertEquals(3, countContaining(da, 'STADIUM MAST ACCESSORIES'), 'every lift prints its own KIT line');
        System.assertEquals(1, countContaining(db, 'STADIUM MAST ACCESSORIES'), 'one lift: one KIT line');
        System.assertEquals(3, countContaining(da, 'Manrider System'), 'every lift prints its own Manrider System');
        System.assertEquals(1, countContaining(da, 'Manrider System - Lift 22'), 'lift 2 reads its own m2_mrl_ keys');
        System.assertEquals(1, countContaining(da, 'Ladder 17'), 'ladder 2 reads its own l2_lwc_ keys');
        System.assertEquals(db[0], da[0], 'lift 1 prints the same line whatever the lift count');
    }

    @IsTest
    static void stadiumLiftsCombinedScope() {
        Quote many = stadiumQuote('HMCP Stadium 3 lifts 2 ladders', 3, 2);
        Quote one  = stadiumQuote('HMCP Stadium 1 lift 1 ladder', 1, 1);
        Test.startTest();
        HMScopeCombinedControllerCP a = new HMScopeCombinedControllerCP(TestHighMastDataFactory.stdCtrl(many.Id));
        HMScopeCombinedControllerCP b = new HMScopeCombinedControllerCP(TestHighMastDataFactory.stdCtrl(one.Id));
        Test.stopTest();
        List<String> ga = new List<String>();
        for (HMScopeCombinedControllerCP.MastGroupWrapper g : a.mastGroups) ga.add(g.descMast);
        List<String> gb = new List<String>();
        for (HMScopeCombinedControllerCP.MastGroupWrapper g : b.mastGroups) gb.add(g.descMast);
        System.assertEquals(5, countContaining(ga, 'STADIUM MAST FABRICATED PART'), 'each lift / ladder is its own line item');
        System.assertEquals(2, countContaining(gb, 'STADIUM MAST FABRICATED PART'), '1 lift + 1 ladder: 2 line items');
        System.assertEquals(3, countContaining(ga, 'STADIUM MAST ACCESSORIES'), 'every lift carries its own KIT');
        System.assertEquals(gb[0], ga[0], 'lift 1 prints the same line item whatever the lift count');
    }

    @IsTest
    static void stadiumLiftsWeightSheet() {
        Quote many = stadiumQuote('HMCP Stadium 3 lifts 2 ladders', 3, 2);
        Test.startTest();
        HighMastWeightCalcControllerCP a = new HighMastWeightCalcControllerCP(TestHighMastDataFactory.stdCtrl(many.Id));
        Test.stopTest();
        List<HighMastWeightCalcControllerCP.RowData> rows = a.sheets[0].rowDataList;
        System.assertEquals(5, rows.size(), 'a weight row per lift and per ladder');
        System.assertEquals('22', rows[1].mastHeight, 'row 2 is lift 2');
        System.assertEquals(true, rows[0].showCosting, 'lift 1 has its KIT costing');
        System.assertEquals(true, rows[1].showCosting, 'lift 2 has its KIT costing (kit_line_2)');
        System.assert(rows[1].codeNoTitle.startsWith('MAN RIDING LIFT 2 - '), 'lift 2 page names its lift: ' + rows[1].codeNoTitle);
        System.assert(!rows[0].codeNoTitle.startsWith('MAN RIDING LIFT'), 'lift 1 keeps the original title: ' + rows[0].codeNoTitle);
        System.assertEquals(true, rows[2].showCosting, 'lift 3 has its KIT costing (kit_line_3)');
        System.assertEquals(false, rows[3].showCosting, 'ladders carry no KIT');
        System.assertEquals('LADDER WITH CAGE 2', rows[4].codeNoTitle, 'row 5 is ladder 2');
    }

    @IsTest
    static void stadiumLiftsUseTheCpDocuments() {
        Quote many = stadiumQuote('HMCP Stadium 3 lifts 2 ladders', 3, 2);
        Quote one  = stadiumQuote('HMCP Stadium 1 lift 1 ladder', 1, 1);
        Test.startTest();
        Boolean manyCp = HMCrossProductController.isCrossProduct(many.Id);
        Boolean oneCp  = HMCrossProductController.isCrossProduct(one.Id);
        Decimal total  = HMCrossProductController.crossProductTotal(many.Id);
        Test.stopTest();
        System.assertEquals(true, manyCp, '3 lifts: the CP pages print it');
        System.assertEquals(false, oneCp, '1 lift + 1 ladder: the mapped pages, as before');
        System.assert(total != null && total > 0, 'the offer total comes from the CP Single Scope (every lift)');
    }

    // [hm-stadium] the routing rule itself: a ticked type with a count above 1, read as the
    // documents read a tick (true / 'true' / '1')
    @IsTest
    static void stadiumCopiesRule() {
        Map<String, Object> m = new Map<String, Object>{
            'type_of_mast' => 'Customized Mast', 'mast_customized' => 'STADIUM MAST',
            'man_riding_lift' => false, 'man_riding_lift_count' => '3',
            'ladder_with_cage' => true, 'ladder_with_cage_count' => '2'
        };
        System.assertEquals(true, HMCrossProductController.hmStadiumCopies(m), '2 ladders, no lift: the CP pages');
        m.put('ladder_with_cage', false);
        System.assertEquals(false, HMCrossProductController.hmStadiumCopies(m), 'counts above 1 but neither type ticked: the mapped pages');
        m.put('man_riding_lift', '1');
        System.assertEquals(true, HMCrossProductController.hmStadiumCopies(m), 'a tick saved as 1 counts, as the documents read it');
        m.put('man_riding_lift_count', 'x');
        System.assertEquals(false, HMCrossProductController.hmStadiumCopies(m), 'a count that is not a number is no count');
        m.put('man_riding_lift_count', '3');
        m.put('mast_customized', 'FLAG MAST');
        System.assertEquals(false, HMCrossProductController.hmStadiumCopies(m), 'not a Stadium: the mapped pages');
        System.assertEquals(false, HMCrossProductController.hmStadiumCopies(null), 'no JSON');
    }

    // [hm-stadium] lift 1 left without segments: lifts 2..n and the ladders still print, and the
    // weight sheet does not fail on lift 1 (it has no row to cost)
    @IsTest
    static void stadiumLiftOneWithoutSegments() {
        Quote q = stadiumQuote('HMCP Stadium lift 1 empty', 3, 2);
        Map<String, Object> m = (Map<String, Object>) JSON.deserializeUntyped(q.Quote_Value__c);
        m.put('mrl_no_of_segment', '0');
        update new Quote(Id = q.Id, Quote_Value__c = JSON.serialize(m));
        Test.startTest();
        HighMastWeightCalcControllerCP w = new HighMastWeightCalcControllerCP(TestHighMastDataFactory.stdCtrl(q.Id));
        HighMastSOWControllerCP s = new HighMastSOWControllerCP(TestHighMastDataFactory.stdCtrl(q.Id));
        Test.stopTest();
        List<HighMastWeightCalcControllerCP.RowData> rows = w.sheets[0].rowDataList;
        System.assertEquals(4, rows.size(), 'lifts 2-3 and ladders 1-2');
        System.assertEquals('22', rows[0].mastHeight, 'the first row is lift 2');
        System.assertEquals(true, rows[0].showCosting, 'lift 2 keeps its own KIT costing (kit_line_2)');
        List<String> ds = new List<String>();
        for (HighMastSOWControllerCP.LineItemWrapper x : s.lineItems) ds.add(x.description);
        System.assertEquals(4, countContaining(ds, 'STADIUM MAST FABRICATED PART'), 'lifts 2-3 and ladders 1-2');
        System.assertEquals(2, countContaining(ds, 'STADIUM MAST ACCESSORIES'), 'lifts 2-3 each print their own KIT line');
    }

    // A document controller that throws must not block the offer capture: the total is
    // null and the stage rule still runs, exactly as CreateQuoteController does it.
    @IsTest
    static void crossProductTotalNeverThrows() {
        Test.startTest();
        Decimal t = HMCrossProductController.crossProductTotal(null);
        Test.stopTest();
        System.assertEquals(null, t, 'no quote: null, no exception');
    }
}