public class SteelPipesWordMHTMLController {
    private static final String BOUNDARY = '----=_NextPart_WordReport_001';

    public Quote   quoteRecord { get; private set; }
    public String  mhtmlContent { get; set; }

    public SteelPipesWordMHTMLController(ApexPages.StandardController stdController) {
        if (!Test.isRunningTest()) {
            stdController.addFields(new List<String>{
                'QuoteNumber', 'Quote_Value__c', 'CreatedDate', 'ContactId'
            });
        }
        buildReport(stdController.getId());
    }

    private void buildReport(Id quoteId) {
        quoteRecord = [
            SELECT Id, Name, QuoteNumber, Quote_Value__c, CreatedDate,
                Account.Name, Account.BillingStreet, Account.BillingCity,
                Account.BillingState, Account.BillingPostalCode, Account.Phone, Account.Email__c,
                Contact.Name, Contact.Phone, Contact.Email, Contact.MobilePhone,
                BillingStreet, BillingCity, BillingState, BillingPostalCode
            FROM Quote WHERE Id = :quoteId LIMIT 1
        ];

        // ── Logo ──────────────────────────────────────────────────────────────
        String logoBase64    = '';
        String logoMimeType  = 'image/png';
        try {
            StaticResource sr = [SELECT Body, ContentType FROM StaticResource WHERE Name = 'UtkarshLogo' LIMIT 1];
            logoBase64   = formatBase64ForMime(EncodingUtil.base64Encode(sr.Body));
            logoMimeType = sr.ContentType;
        } catch(Exception e) {
            System.debug('Logo static resource not found: ' + e.getMessage());
        }

        // ── Offer Number & Date ───────────────────────────────────────────────
        Integer createdMonth = quoteRecord.CreatedDate.month();
        Integer createdYear  = quoteRecord.CreatedDate.year();
        Integer fyStart      = (createdMonth >= 4) ? createdYear : createdYear - 1;
        String  fyLabel      = fyShort(fyStart) + '-' + fyShort(fyStart + 1);
        String  offerNumber  = 'UIL/STEEL/' + quoteRecord.QuoteNumber + '/' + fyLabel;
        String  todayDate    = Date.today().format();

        // ── Company / Contact ─────────────────────────────────────────────────
        String addr = '';
        if (quoteRecord.Account != null) {
            List<String> parts = new List<String>();
            if (String.isNotBlank(quoteRecord.Account.BillingStreet))     parts.add(quoteRecord.Account.BillingStreet);
            if (String.isNotBlank(quoteRecord.Account.BillingCity))       parts.add(quoteRecord.Account.BillingCity);
            if (String.isNotBlank(quoteRecord.Account.BillingState))      parts.add(quoteRecord.Account.BillingState);
            if (String.isNotBlank(quoteRecord.Account.BillingPostalCode)) parts.add(quoteRecord.Account.BillingPostalCode);
            addr = String.join(parts, ', ');
        }
        String contactName  = (quoteRecord.Contact != null && quoteRecord.Contact.Name  != null) ? quoteRecord.Contact.Name  : '';
        String contactEmail = '';
        if (quoteRecord.Contact != null && String.isNotBlank(quoteRecord.Contact.Email)) {
            contactEmail = quoteRecord.Contact.Email;
        } else if (quoteRecord.Account != null && String.isNotBlank(quoteRecord.Account.Email__c)) {
            contactEmail = quoteRecord.Account.Email__c;
        }
        String contactNo    = '';
        if (quoteRecord.Contact != null && String.isNotBlank(quoteRecord.Contact.Phone)) {
            contactNo = quoteRecord.Contact.Phone;
        } else if (quoteRecord.Account != null && quoteRecord.Account.Phone != null) {
            contactNo = quoteRecord.Account.Phone;
        }
        String accountName = (quoteRecord.Account != null && quoteRecord.Account.Name != null) ? quoteRecord.Account.Name : '';

        // ── Parse JSON ────────────────────────────────────────────────────────
        Map<String, Object>        jsonData          = new Map<String, Object>();
        List<Map<String, Object>>  standardLineItems = new List<Map<String, Object>>();
        List<Map<String, Object>>  specialLineItems  = new List<Map<String, Object>>();
        List<String>               specialHeaderCols = new List<String>();
        Decimal totalAmount        = 0;
        Decimal standardTotalAmount = 0;
        String  quoteNotes         = '';
        
        Boolean isExport = false;
        String exportCurrency = '';
        Decimal totalExportFobFc = 0.00;
        Decimal totalExportFobInr = 0.00;

        if (String.isNotBlank(quoteRecord.Quote_Value__c)) {
            try {
                jsonData = (Map<String, Object>) JSON.deserializeUntyped(quoteRecord.Quote_Value__c);

                List<String> requiredKeys = new List<String>{
                    'market_type','tc_offer_validity','tc_delivery_period','tc_price_variation',
                    'tc_payment_terms','tc_vehicle_load','tc_qty_tolerance','tc_tolerance',
                    'tc_inspection','tc_pre_dispatch_inspection','tc_work_address','tc_gst_tin_number'
                };
                for (String k : requiredKeys) {
                    if (!jsonData.containsKey(k) || jsonData.get(k) == null) jsonData.put(k, '-');
                }

                // Transportation
                String transportText = 'Included';
                if (jsonData.containsKey('freight_steel_pipes') && jsonData.get('freight_steel_pipes') != null) {
                    if (String.valueOf(jsonData.get('freight_steel_pipes')).trim().equalsIgnoreCase('Ex-works')) {
                        transportText = 'Excluded';
                    }
                }
                jsonData.put('tc_transportation', transportText);

                // Notes
                if (jsonData.containsKey('Note') && jsonData.get('Note') != null) {
                    quoteNotes = String.valueOf(jsonData.get('Note'));
                }

                // Line items
                if (jsonData.containsKey('_Saved_Table_Rows')) {
                    List<Object> rawRows = (List<Object>) jsonData.get('_Saved_Table_Rows');
                    Integer slNo     = 1;
                    Integer colIndex = 1;

                    for (Object rowObj : rawRows) {
                        Map<String, Object> row = (Map<String, Object>) rowObj;

                        String spHeader = row.get('special_description_header') != null ? String.valueOf(row.get('special_description_header')).trim() : '';
                        
                        // We now use static columns for Length and Special Description instead of dynamic headers
                        if (specialHeaderCols.isEmpty()) {
                            specialHeaderCols.add('Length');
                            specialHeaderCols.add('Special Description');
                        }

                        String std      = s(row.get('standard_spec_grade'));
                        String pClass   = s(row.get('pipe_class'));
                        String customThk = s(row.get('custom_thickness'));
                        String shapeVal = s(row.get('shape'));

                        String displayClassThk;
                        if (std.contains('IS 1239') || std.contains('10577')) {
                            displayClassThk = String.isNotBlank(shapeVal) ? shapeVal : pClass;
                        } else {
                            Decimal thkVal = 0;
                            if (String.isNotBlank(customThk)) { try { thkVal = Decimal.valueOf(customThk); } catch(Exception ex){} }
                            displayClassThk = (thkVal > 0) ? customThk : pClass;
                        }

                        String reflectInDoc = row.get('reflect_in_offer_doc') != null ? String.valueOf(row.get('reflect_in_offer_doc')) : 'Yes';
                        if (!reflectInDoc.equalsIgnoreCase('Yes')) displayClassThk = '-';

                        Decimal qty   = d(row.get('quantity'));
                        Decimal rate  = d(row.get('rate'));
                        Decimal total = row.get('total_price') != null ? d(row.get('total_price')) : (qty * rate);
                        
                        // Copying precise math from PDF controller
                        Decimal unitGst = row.get('gst') != null ? d(row.get('gst')) : 0.0;
                        Decimal gstPercentage = (rate > 0) ? (unitGst / rate) * 100.0 : 0.0;
                        gstPercentage = gstPercentage.setScale(0, System.RoundingMode.HALF_UP);
                        
                        Decimal pdf_rate = rate; // They want to see the base Rate per Kg without discount
                        Decimal pdf_base_total = 0.0;
                        Decimal pdf_gst_amount = 0.0;
                        Decimal pdf_total_price = 0.0;
                        
                        if (row.get('price_per_uom') != null) {
                            Decimal unitPrice = d(row.get('price_per_uom'));
                            
                            pdf_base_total = (unitPrice * qty).setScale(2, System.RoundingMode.HALF_UP);
                            pdf_gst_amount = (unitGst * qty).setScale(2, System.RoundingMode.HALF_UP);
                            pdf_total_price = row.get('total_price') != null ? d(row.get('total_price')) : (pdf_base_total + pdf_gst_amount);
                        } else {
                            Decimal discountPercent = row.get('discount') != null ? d(row.get('discount')) : 0.0;
                            Decimal discountedRate = rate * (1 - (discountPercent / 100.0));
                            discountedRate = discountedRate.setScale(2, System.RoundingMode.HALF_UP);
                            
                            Decimal baseTotal = 0.0;
                            if (gstPercentage > 0) {
                                baseTotal = total / (1 + (gstPercentage / 100.0));
                            } else {
                                baseTotal = total;
                            }
                            baseTotal = baseTotal.setScale(2, System.RoundingMode.HALF_UP);
                            
                            Decimal gstAmount = total - baseTotal;
                            
                            pdf_rate = discountedRate;
                            pdf_base_total = baseTotal;
                            pdf_gst_amount = gstAmount;
                            pdf_total_price = total;
                        }
                        String uom = row.get('uom') != null ? s(row.get('uom')) : '-';

                        totalAmount  += total; // We probably want this to be pdf_total_price but let's leave as is for now

                        String cHeader = jsonData.containsKey('c' + colIndex + '_Header') ? s(jsonData.get('c' + colIndex + '_Header')) : '';
                        String cValue  = jsonData.containsKey('c' + colIndex + '_Value')  ? s(jsonData.get('c' + colIndex + '_Value'))  : '';

                        String sizeVal = s(row.get('size_nb'));
                        if (String.isNotBlank(sizeVal)) {
                            sizeVal = sizeVal.replaceAll('(?i)mm', '').trim();
                            if (std.containsIgnoreCase('IS 3589') || std.containsIgnoreCase('IS 1239') || std.containsIgnoreCase('IS 1161')) {
                                sizeVal += '(NB)';
                            } else if (!std.containsIgnoreCase('IS 4923')) {
                                sizeVal += '(OD)';
                            }
                        }

                        Map<String, Object> pr = new Map<String, Object>{
                            'SlNo'                   => slNo++,
                            'designation'            => s(row.get('designation')),
                            'standard_spec_grade'    => std,
                            'display_class_thickness'=> displayClassThk,
                            'size_nb'                => sizeVal,
                            'end_finish'             => s(row.get('end_finish')),
                            'quantity'               => qty,
                            'rate'                   => rate,
                            'total_price'            => total,
                            'special_description_header' => spHeader,
                            'special_description'    => s(row.get('special_description'))
                        ,
                            'pdf_rate'               => pdf_rate,
                            'pdf_base_total'         => pdf_base_total,
                            'pdf_gst_amount'         => pdf_gst_amount,
                            'pdf_total_price'        => pdf_total_price,
                            'uom'                    => uom
                        };
                        
                        // Export Fields
                        String pit = s(row.get('price_input_type'));
                        String cc = s(row.get('currency_code'));
                        Decimal pfc = d(row.get('price_fc'));
                        Decimal tfc = d(row.get('total_fob_fc'));
                        Decimal tfinr = d(row.get('total_fob_inr'));
                        
                        pr.put('od', d(row.get('od')));
                        pr.put('wall_thickness', d(row.get('wall_thickness')));
                        pr.put('grade', s(row.get('grade')));
                        pr.put('pipe_length', d(row.get('pipe_length')));
                        pr.put('kg_per_meter', d(row.get('kg_per_meter')));
                        Decimal total_pieces = d(row.get('total_pieces'));
                        Decimal total_weight = d(row.get('total_weight'));
                        pr.put('total_pieces', total_pieces);
                        pr.put('total_meters', d(row.get('total_meters')));
                        pr.put('total_weight', total_weight);
                        pr.put('price_fc', pfc);
                        pr.put('total_fob_fc', tfc);
                        pr.put('total_fob_inr', tfinr);
                        
                        Decimal price_per_mt_fc = total_weight > 0 ? (tfc / total_weight) : 0.00;
                        Decimal price_per_piece_fc = total_pieces > 0 ? (tfc / total_pieces) : 0.00;
                        pr.put('price_per_mt_fc', price_per_mt_fc);
                        pr.put('price_per_piece_fc', price_per_piece_fc);
                        
                        if (String.isNotBlank(pit)) {
                            isExport = true;
                            if (String.isBlank(exportCurrency) && String.isNotBlank(cc)) {
                                exportCurrency = cc;
                            }
                            totalExportFobFc += tfc;
                            totalExportFobInr += tfinr;
                        }

                        if (String.isNotBlank(cHeader) && String.isNotBlank(cValue)) {
                            pr.put('customHeader', cHeader);
                            pr.put('customValue',  cValue);
                            specialLineItems.add(pr);
                        } else {
                            standardTotalAmount += total;
                            standardLineItems.add(pr);
                        }
                        colIndex++;
                    }

                    // Build specialValuesList aligned with our static columns (Length and Special Description)
                    for (Map<String, Object> row : standardLineItems) {
                        List<String> sVals = new List<String>();
                        String lengthVal = s(row.get('special_description_header'));
                        String descVal   = s(row.get('special_description'));
                        
                        sVals.add(String.isNotBlank(lengthVal) ? lengthVal : '-');
                        sVals.add(String.isNotBlank(descVal)   ? descVal   : '-');
                        
                        row.put('specialValuesList', sVals);
                    }
                }
            } catch(Exception e) {
                System.debug('Error parsing JSON: ' + e.getMessage());
            }
        }

        // ── Build HTML ────────────────────────────────────────────────────────
        String html = buildHtml(
            offerNumber, todayDate, accountName, addr, contactName, contactNo, contactEmail,
            standardLineItems, specialLineItems, specialHeaderCols,
            standardTotalAmount, totalAmount, 
            isExport, exportCurrency, totalExportFobFc, totalExportFobInr,
            jsonData, quoteNotes
        );

        // ── Wrap in MHTML ─────────────────────────────────────────────────────
        String crlf  = '\r\n';
        String mhtml = 'MIME-Version: 1.0' + crlf
            + 'Content-Type: multipart/related; type="text/html"; boundary="' + BOUNDARY + '"' + crlf + crlf
            + '--' + BOUNDARY + crlf
            + 'Content-Type: text/html; charset="UTF-8"' + crlf + crlf
            + html + crlf;

        if (String.isNotBlank(logoBase64)) {
            mhtml += '--' + BOUNDARY + crlf
                  + 'Content-Type: ' + logoMimeType + crlf
                  + 'Content-Transfer-Encoding: base64' + crlf
                  + 'Content-ID: <logo@utkarshsteel>' + crlf + crlf
                  + logoBase64 + crlf;
        }

        mhtml += '--' + BOUNDARY + '--';
        mhtmlContent = mhtml;
    }

    // ── HTML Builder ──────────────────────────────────────────────────────────
    // Uses ONE unified table (same as old QuoteOfferExcel.page) so that T&C
    // colspan values naturally align with the data table columns.
    // Logo added to the header row using rowspan.
    private String buildHtml(
        String offerNumber, String todayDate, String accountName, String addr,
        String contactName, String contactNo, String contactEmail,
        List<Map<String, Object>> stdRows, List<Map<String, Object>> spRows,
        List<String> spHeaders, Decimal stdTotal, Decimal grandTotal,
        Boolean isExport, String exportCurrency, Decimal totalExportFobFc, Decimal totalExportFobInr,
        Map<String, Object> jd, String notes
    ) {
        Integer extraCols = spHeaders.size();
        Integer totalCols = 9 + extraCols;
        Integer leftCols  = totalCols - 3; // logo occupies rightmost 3 cols in header rows

        String css = '<style>'
            + '@page Section1 { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 36.0pt 36.0pt 36.0pt 36.0pt; } div.Section1 { page: Section1; } body{font-family:sans-serif;font-size:10px;}'
            + 'table{border-collapse:collapse; table-layout:fixed; width:100%; word-wrap:break-word;}'
            + 'th,td{border:1px solid black;padding:5px;text-align:left; word-wrap:break-word;}'
            + '.header-text{text-align:center;font-size:12px;font-weight:bold;}'
            + '.bg-green{background-color:#92D050;font-weight:bold;}'
            + '.text-center{text-align:center;}'
            + '.text-right{text-align:right;}'
            + '.no-border{border:none!important;}'
            + '</style>';

        String h = '<!DOCTYPE html><html><head>' + css + '</head><body><div class="Section1">';

        
        // ── TABLE 1: HEADER (COMPANY TITLE & LOGO) ──────────────────────────
        h += '<table width="100%" border="0" cellspacing="0" cellpadding="4" style="border-collapse:collapse; font-size:10pt; margin-bottom:20px;">';
        h += '<tr>';
        h += '<td style="border:none; text-align:center; width:80%; vertical-align:middle;">'
           + '<h2 style="margin:2px 0; font-size:16pt;">UTKARSH INDIA LIMITED</h2>'
           + '<p style="margin:2px 0;">Corporate Office: Arrjavv Square, 4th Floor, 95A, E.M. Bypass, Kolkata - 700010</p>'
           + '<h3 style="margin:2px 0; font-size:14pt;">QUOTATION FOR STEEL PIPES</h3>'
           + '</td>';
        h += '<td style="border:none; text-align:right; width:20%; vertical-align:middle;">'
           + '<img src="cid:logo@utkarshsteel" width="130" alt="Utkarsh Logo"/>'
           + '</td>';
        h += '</tr>';
        h += '</table>';

        // ── TABLE 2: QUOTE DETAILS ──────────────────────────────────────────
        h += '<table width="100%" border="0" cellspacing="0" cellpadding="4" style="border-collapse:collapse; font-size:10pt; margin-bottom:20px;">';
        h += '<tr>'
           + '<td style="border:none; font-weight:bold; width:50%;">Offer No. ' + esc(offerNumber) + '</td>'
           + '<td style="border:none; font-weight:bold; width:50%; text-align:right;">Date - ' + esc(todayDate) + '</td>'
           + '</tr>';
        h += '<tr>'
           + '<td style="border:none; font-weight:bold; vertical-align:top;">'
           +   'Name of the Company - ' + esc(accountName) + '<br/>'
           +   'Address - ' + esc(addr) + '<br/>'
           +   'Kind Attention - ' + esc(contactName) + '<br/>'
           +   'Contact No - ' + esc(contactNo)
           + '</td>'
           + '<td style="border:none; font-weight:bold; text-align:right; vertical-align:top;">'
           +   'Mail - ' + esc(contactEmail)
           + '</td>'
           + '</tr>';
        h += '</table>';

        // ── TABLE 3: SCHEDULE OF MATERIAL ───────────────────────────────────
        if (!stdRows.isEmpty() || !spRows.isEmpty()) {
            h += '<h3 style="text-decoration:underline; margin-bottom:5px;">SCHEDULE OF MATERIAL</h3>';
            h += '<table width="100%" border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse; font-size:10pt; border:1px solid windowtext; margin-bottom:20px;">';

            if (isExport) {
                // ==========================================
                // EXPORT TABLE (15 Columns)
                // ==========================================
                totalCols = 15;
                
                if (!stdRows.isEmpty()) {
                    h += '<tr style="background-color:#FFFF00;">';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Item No.</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Finish</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Size</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Grade</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">End Finish</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">OD (mm)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">WT (mm)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Length (M)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Weight (kg/m)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Total Pieces</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Total Qty (Mtr.)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Total Weight (MT)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Price (' + esc(exportCurrency) + '/MT)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Price (' + esc(exportCurrency) + '/Piece)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Total (' + esc(exportCurrency) + ') (FOB Kolkata)</th>';
                    h += '</tr>';

                    for (Map<String, Object> row : stdRows) {
                        h += '<tr>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(row.get('SlNo'))) + '</td>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(row.get('designation'))) + '</td>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(row.get('size_nb'))) + '</td>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(row.get('standard_spec_grade'))) + ' - ' + esc(s(row.get('grade'))) + '</td>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(row.get('end_finish'))) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('od'), 2) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('wall_thickness'), 2) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('pipe_length'), 2) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('kg_per_meter'), 3) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('total_pieces'), 0) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('total_meters'), 2) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('total_weight'), 3) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('price_per_mt_fc'), 2) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('price_per_piece_fc'), 2) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('total_fob_fc'), 2) + '</td>';
                        h += '</tr>';
                    }

                    h += '<tr>'
                       + '<td colspan="14" style="text-align:right; border:1px solid windowtext; font-weight:bold;">Sub Total:</td>'
                       + '<td style="text-align:right; border:1px solid windowtext; font-weight:bold;">' + fmt(totalExportFobFc, 2) + '</td>'
                       + '</tr>';
                }

                for (Map<String, Object> spRow : spRows) {
                    String spHdr = s(spRow.get('customHeader'));
                    h += '<tr><td colspan="15" style="border:none; height:15px;"></td></tr>';
                    h += '<tr><td colspan="15" style="border:none;">'
                       + '<h3 style="text-decoration:underline;margin-bottom:5px;margin-top:0px;">SPECIAL ITEM - ' + esc(spHdr) + '</h3>'
                       + '</td></tr>';

                    h += '<tr style="background-color:#f2f2f2;">';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Item No.</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Finish</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Size</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Grade</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">End Finish</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">OD (mm)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">WT (mm)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Length (M)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Weight (kg/m)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Total Pieces</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Total Qty (Mtr.)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Total Weight (MT)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Price (' + esc(exportCurrency) + '/MT)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Price (' + esc(exportCurrency) + '/Piece)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Total (' + esc(exportCurrency) + ') (FOB Kolkata)</th>';
                    h += '</tr>';

                    h += '<tr>';
                    h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(spRow.get('SlNo'))) + '</td>';
                    h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(spRow.get('designation'))) + '</td>';
                    h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(spRow.get('size_nb'))) + '</td>';
                    h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(spRow.get('standard_spec_grade'))) + ' - ' + esc(s(spRow.get('grade'))) + '</td>';
                    h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(spRow.get('end_finish'))) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('od'), 2) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('wall_thickness'), 2) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('pipe_length'), 2) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('kg_per_meter'), 3) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('total_pieces'), 0) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('total_meters'), 2) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('total_weight'), 3) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('price_per_mt_fc'), 2) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('price_per_piece_fc'), 2) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('total_fob_fc'), 2) + '</td>';
                    h += '</tr>';
                }

                if (!spRows.isEmpty()) {
                    h += '<tr><td colspan="15" style="border:none; height:15px;"></td></tr>';
                    h += '<tr>'
                       + '<td colspan="13" style="text-align:right; border:none; font-weight:bold; font-size:12px;">OVERALL GRAND TOTAL:</td>'
                       + '<td style="text-align:right; border:1px solid windowtext; font-weight:bold; font-size:12px; background-color:#FFFF00;">' + fmt(totalExportFobFc, 2) + '</td>'
                       + '<td style="text-align:right; border:1px solid windowtext; font-weight:bold; font-size:12px; background-color:#FFFF00;">' + fmt(totalExportFobInr, 2) + '</td>'
                       + '</tr>';
                }

            } else {
                // ==========================================
                // DOMESTIC TABLE (13 Columns)
                // ==========================================
                if (!stdRows.isEmpty()) {
                    h += '<tr style="background-color:#FFFF00;">';
                    h += '<th style="text-align:center; border:1px solid windowtext;">SL No</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Pipe / Designation</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Size(NB)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Thickness(mm/Standard)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Quantity in UOM</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">UOM</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">End Finish</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">IS Specification</th>';
                    for (String col : spHeaders) {
                        String addStyle = col.equalsIgnoreCase('Special Description') ? ' white-space:nowrap; width:100px;' : '';
                        h += '<th style="text-align:center; border:1px solid windowtext;' + addStyle + '">' + esc(col) + '</th>';
                    }
                    h += '<th style="text-align:center; border:1px solid windowtext;">Rate per Kg</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Total</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">GST @18%</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Total Price</th>';
                    h += '</tr>';

                    for (Map<String, Object> row : stdRows) {
                        h += '<tr>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(row.get('SlNo'))) + '</td>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(row.get('designation'))) + '</td>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(row.get('size_nb'))) + '</td>';
                        String dct = s(row.get('display_class_thickness'));
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + (String.isBlank(dct) ? '-' : esc(dct)) + '</td>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + fmt((Decimal) row.get('quantity'), 0) + '</td>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(row.get('uom'))) + '</td>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(row.get('end_finish'))) + '</td>';
                        h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(row.get('standard_spec_grade'))) + '</td>';
                        List<Object> sValsObj = (List<Object>) row.get('specialValuesList');
                        if (sValsObj != null) {
                            for (Object sv : sValsObj) {
                                h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(sv)) + '</td>';
                            }
                        }
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('pdf_rate'), 2) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('pdf_base_total'), 2) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('pdf_gst_amount'), 2) + '</td>';
                        h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) row.get('pdf_total_price'), 2) + '</td>';
                        h += '</tr>';
                    }

                    h += '<tr>'
                       + '<td colspan="' + (8 + extraCols) + '" style="text-align:right; border:1px solid windowtext; font-weight:bold;">Sub Total:</td>'
                       + '<td style="text-align:right; border:1px solid windowtext; font-weight:bold;">' + fmt(stdTotal, 2) + '</td>'
                       + '</tr>';
                }

                for (Map<String, Object> spRow : spRows) {
                    String spHdr = s(spRow.get('customHeader'));
                    h += '<tr><td colspan="' + totalCols + '" style="border:none; height:15px;"></td></tr>';
                    h += '<tr><td colspan="' + totalCols + '" style="border:none;">'
                       + '<h3 style="text-decoration:underline;margin-bottom:5px;margin-top:0px;">SPECIAL ITEM - ' + esc(spHdr) + '</h3>'
                       + '</td></tr>';

                    h += '<tr style="background-color:#f2f2f2;">';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Sl. No.</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Designation</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Standard / Spec / Grade</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Class/ Thickness</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Size / NB</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">End Finish</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext; background-color:#e6f2ff; white-space:nowrap; width:100px;">' + esc(spHdr) + '</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Qty (Meters)</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Rate per Kg</th>';
                    h += '<th style="text-align:center; border:1px solid windowtext;">Total</th>';
                    if (extraCols > 1) {
                        h += '<td colspan="' + (extraCols - 1) + '" style="border:none;"></td>';
                    }
                    h += '</tr>';

                    h += '<tr>';
                    h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(spRow.get('SlNo'))) + '</td>';
                    h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(spRow.get('designation'))) + '</td>';
                    h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(spRow.get('standard_spec_grade'))) + '</td>';
                    String dct2 = s(spRow.get('display_class_thickness'));
                    h += '<td style="text-align:center; border:1px solid windowtext;">' + (String.isBlank(dct2) ? '-' : esc(dct2)) + '</td>';
                    h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(spRow.get('size_nb'))) + '</td>';
                    h += '<td style="text-align:center; border:1px solid windowtext;">' + esc(s(spRow.get('end_finish'))) + '</td>';
                    h += '<td style="text-align:center; border:1px solid windowtext; font-weight:bold;">' + esc(s(spRow.get('customValue'))) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('quantity'), 0) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('rate'), 2) + '</td>';
                    h += '<td style="text-align:right; border:1px solid windowtext;">' + fmt((Decimal) spRow.get('total_price'), 2) + '</td>';
                    if (extraCols > 1) {
                        h += '<td colspan="' + (extraCols - 1) + '" style="border:none;"></td>';
                    }
                    h += '</tr>';

                    h += '<tr>'
                       + '<td colspan="' + (8 + 1) + '" style="text-align:right; border:1px solid windowtext; font-weight:bold;">Sub Total:</td>'
                       + '<td style="text-align:right; border:1px solid windowtext; font-weight:bold;">' + fmt((Decimal) spRow.get('total_price'), 2) + '</td>';
                    if (extraCols > 1) {
                        h += '<td colspan="' + (extraCols - 1) + '" style="border:none;"></td>';
                    }
                    h += '</tr>';
                }

                if (!spRows.isEmpty()) {
                    h += '<tr><td colspan="' + totalCols + '" style="border:none; height:15px;"></td></tr>';
                    h += '<tr>'
                       + '<td colspan="' + (8 + extraCols) + '" style="text-align:right; border:none; font-weight:bold; font-size:12pt;">OVERALL GRAND TOTAL:</td>'
                       + '<td style="text-align:right; border:2px solid windowtext; font-weight:bold; font-size:12pt; background-color:#FFFF00;">' + fmt(grandTotal, 2) + '</td>'
                       + '</tr>';
                }
            }

            h += '</table>';
        }

        // ── TABLE 4: COMMERCIAL TERMS ───────────────────────────────────────
        h += '<h3 style="text-decoration:underline;margin-bottom:5px;">COMMERCIAL TERMS &amp; CONDITIONS</h3>';
        h += '<table width="100%" border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse; font-size:10pt; border:1px solid windowtext; margin-bottom:20px;">';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">Offer Validity</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_offer_validity'))) + '</td></tr>';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">Delivery Period</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_delivery_period'))) + '</td></tr>';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">Payment Terms</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_payment_terms'))) + '</td></tr>';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">Price Variation Clause</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_price_variation'))) + '</td></tr>';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">Transportation</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_transportation'))) + '</td></tr>';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">Vehicle Load</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_vehicle_load'))) + '</td></tr>';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">Qty Tolerance</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_qty_tolerance'))) + '</td></tr>';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">Tolerance</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_tolerance'))) + '</td></tr>';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">Inspection</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_inspection'))) + '</td></tr>';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">Pre Dispatch Inspection</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_pre_dispatch_inspection'))) + '</td></tr>';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">Work Address</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_work_address'))) + '</td></tr>';
        h += '<tr><td style="width:30%; background-color:#92D050; font-weight:bold; border:1px solid windowtext;">GST TIN Number</td><td style="width:70%; border:1px solid windowtext;">' + escHtml(s(jd.get('tc_gst_tin_number'))) + '</td></tr>';
        h += '</table>';

        if (String.isNotBlank(notes)) {
            h += '<div style="margin-top:20px;"><b>Notes / Remarks:</b><br/>' + escHtml(notes) + '</div>';
        }

        h += '</div></body></html>';
        return h;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    // ── Helpers ───────────────────────────────────────────────────────────────
    // tcRow: allow <br/> tags through so T&C multi-line values render correctly in Excel
    private String tcRow(String label, String val) {
        return '<tr><td style="background-color:#92D050; font-weight:bold; border:1px solid windowtext;">' + esc(label) + '</td><td style="border:1px solid windowtext;">' + escHtml(val) + '</td></tr>';
    }

    private String td(String content, String cssClass) {
        return '<td class="' + cssClass + '">' + esc(content) + '</td>';
    }

    private String esc(String v) {
        if (v == null) return '';
        return v.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
    }

    // escHtml: escape but preserve <br/> and <br> tags (used for T&C values)
    private String escHtml(String v) {
        if (v == null) return '';
        // Temporarily protect <br/> and <br> before escaping
        String safe = v.replace('<br/>', '~~~BR~~~').replace('<br />', '~~~BR~~~').replace('<br>', '~~~BR~~~');
        safe = esc(safe);
        // Restore as real HTML line breaks
        return safe.replace('~~~BR~~~', '<br/>');
    }

    private String s(Object o) {
        return o != null ? String.valueOf(o) : '';
    }

    private Decimal d(Object o) {
        if (o == null) return 0;
        try { return Decimal.valueOf(String.valueOf(o)); } catch(Exception e) { return 0; }
    }

    private String fmt(Decimal v, Integer decimals) {
        if (v == null) v = 0;
        return v.setScale(decimals, System.RoundingMode.HALF_UP).format();
    }

    private String fyShort(Integer year) {
        String y = String.valueOf(year);
        return y.substring(y.length() - 2);
    }

    // Split base64 into 76-char lines as required by MIME spec
    private String formatBase64ForMime(String b64) {
        String result = '';
        Integer lineLen = 76;
        for (Integer i = 0; i < b64.length(); i += lineLen) {
            Integer endIdx = Math.min(i + lineLen, b64.length());
            result += b64.substring(i, endIdx) + '\r\n';
        }
        return result;
    }
}