/**
 * QuoteCreation_RateControllerTest — Deepanjan (1st August 2026)
 *
 * The class had no test coverage. processRateCardCSV reads a CSV out of a
 * ContentVersion and turns each row into one branch of a ternary formula
 * string, so the tests below drive it with real uploaded files rather than
 * mocking anything: build the CSV, insert it as a File, and assert on the exact
 * formula that comes back.
 *
 * Every branch in the method is reachable from a test, so no seam was needed
 * and the controller is unchanged.
 */
@IsTest
private class QuoteCreation_RateControllerTest {

    private static final String HEADER = 'Material,Grade,Price';

    /** Uploads csvBody as a File and hands back its ContentDocumentId. */
    private static Id uploadCsv(String csvBody) {
        ContentVersion cv = new ContentVersion(
            Title        = 'Rate Card Test',
            PathOnClient = 'rate_card.csv',
            VersionData  = Blob.valueOf(csvBody)
        );
        insert cv;
        return [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;
    }

    // ══════════════════════════════════════════════════════════════════════
    // Happy path
    // ══════════════════════════════════════════════════════════════════════
    @IsTest
    static void buildsOneTernaryBranchPerRow() {
        Id docId = uploadCsv(
            HEADER + '\n' +
            'HDG MMS/Carport Structure,E350,61000\n' +
            'Pre-Galvanised,E250,54500'
        );

        Test.startTest();
        String formula = QuoteCreation_RateController.processRateCardCSV(docId, 'hdg');
        Test.stopTest();

        String expected =
            '(hdg_material == \'HDG MMS/Carport Structure\' && hdg_material_grade == \'E350\') ? 61000'
            + ' : ' +
            '(hdg_material == \'Pre-Galvanised\' && hdg_material_grade == \'E250\') ? 54500'
            + ' : 0';

        Assert.areEqual(expected, formula, 'The generated formula does not match the expected shape');
    }

    @IsTest
    static void appliesThePrefixToBothFieldNames() {
        Id docId = uploadCsv(HEADER + '\nSteel,E250,1000');

        Test.startTest();
        String formula = QuoteCreation_RateController.processRateCardCSV(docId, 'core');
        Test.stopTest();

        Assert.isTrue(formula.contains('core_material =='),
            'The prefix should drive the material field name: ' + formula);
        Assert.isTrue(formula.contains('core_material_grade =='),
            'The prefix should drive the grade field name: ' + formula);
    }

    @IsTest
    static void trimsWhitespaceAroundEveryColumn() {
        // Spaces either side of each value must not survive into the formula.
        Id docId = uploadCsv(HEADER + '\n   Steel   ,   E250   ,   1000   ');

        Test.startTest();
        String formula = QuoteCreation_RateController.processRateCardCSV(docId, 'hdg');
        Test.stopTest();

        Assert.areEqual(
            '(hdg_material == \'Steel\' && hdg_material_grade == \'E250\') ? 1000 : 0',
            formula, 'Column values should be trimmed before being written into the formula');
    }

    @IsTest
    static void stripsWindowsCarriageReturns() {
        // A file saved on Windows arrives as \r\n; the \r must be cleaned off or
        // it ends up inside the price literal and breaks the formula.
        Id docId = uploadCsv(HEADER + '\r\nSteel,E250,1000\r\n');

        Test.startTest();
        String formula = QuoteCreation_RateController.processRateCardCSV(docId, 'hdg');
        Test.stopTest();

        Assert.isFalse(formula.contains('\r'), 'No carriage return should survive: ' + formula);
        Assert.areEqual(
            '(hdg_material == \'Steel\' && hdg_material_grade == \'E250\') ? 1000 : 0',
            formula, 'CRLF line endings should produce the same formula as LF');
    }

    // ══════════════════════════════════════════════════════════════════════
    // Rows that must be skipped
    // ══════════════════════════════════════════════════════════════════════
    @IsTest
    static void skipsTheHeaderRow() {
        Id docId = uploadCsv(HEADER + '\nSteel,E250,1000');

        Test.startTest();
        String formula = QuoteCreation_RateController.processRateCardCSV(docId, 'hdg');
        Test.stopTest();

        Assert.isFalse(formula.contains('Material'),
            'Row zero is the header and must never become a branch: ' + formula);
        Assert.areEqual(1, formula.split('\\?').size() - 1,
            'Two rows in the file, one of them the header, so exactly one branch');
    }

    @IsTest
    static void skipsBlankLines() {
        Id docId = uploadCsv(
            HEADER + '\n' +
            'Steel,E250,1000\n' +
            '\n' +
            '   \n' +
            'Iron,E350,2000\n'
        );

        Test.startTest();
        String formula = QuoteCreation_RateController.processRateCardCSV(docId, 'hdg');
        Test.stopTest();

        Assert.areEqual(2, formula.split('\\?').size() - 1,
            'Blank and whitespace-only lines should not produce branches: ' + formula);
    }

    @IsTest
    static void skipsRowsWithFewerThanThreeColumns() {
        Id docId = uploadCsv(
            HEADER + '\n' +
            'Steel,E250\n' +          // missing price
            'OnlyOneColumn\n' +
            'Iron,E350,2000'
        );

        Test.startTest();
        String formula = QuoteCreation_RateController.processRateCardCSV(docId, 'hdg');
        Test.stopTest();

        Assert.areEqual(1, formula.split('\\?').size() - 1,
            'Only the complete row should have produced a branch: ' + formula);
        Assert.isTrue(formula.contains('Iron'), 'The complete row is the one that should survive');
    }

    @IsTest
    static void keepsExtraColumnsButUsesOnlyTheFirstThree() {
        Id docId = uploadCsv(HEADER + ',Notes\nSteel,E250,1000,ignore me');

        Test.startTest();
        String formula = QuoteCreation_RateController.processRateCardCSV(docId, 'hdg');
        Test.stopTest();

        Assert.isFalse(formula.contains('ignore me'),
            'Columns beyond the third should be ignored: ' + formula);
        Assert.areEqual(
            '(hdg_material == \'Steel\' && hdg_material_grade == \'E250\') ? 1000 : 0',
            formula, 'A four-column row should still yield a three-value branch');
    }

    // ══════════════════════════════════════════════════════════════════════
    // Degenerate files
    // ══════════════════════════════════════════════════════════════════════
    @IsTest
    static void headerOnlyFileReturnsTheBareFallback() {
        // No usable rows means String.join over an empty list, which is '' —
        // so the whole formula collapses to the ' : 0' tail. Worth pinning:
        // the LWC has to be able to recognise this as "nothing was imported".
        Id docId = uploadCsv(HEADER);

        Test.startTest();
        String formula = QuoteCreation_RateController.processRateCardCSV(docId, 'hdg');
        Test.stopTest();

        Assert.areEqual(' : 0', formula,
            'A file with no data rows should collapse to the bare fallback');
    }

    @IsTest
    static void alwaysEndsWithTheZeroFallback() {
        Id docId = uploadCsv(HEADER + '\nSteel,E250,1000');

        Test.startTest();
        String formula = QuoteCreation_RateController.processRateCardCSV(docId, 'hdg');
        Test.stopTest();

        Assert.isTrue(formula.endsWith(' : 0'),
            'Every formula needs the trailing default so the ternary chain terminates: ' + formula);
    }

    @IsTest
    static void handlesNullPrefixWithoutFailing() {
        // A null prefix concatenates as the text "null" rather than throwing.
        // Pinning it documents that the method does not validate its input.
        Id docId = uploadCsv(HEADER + '\nSteel,E250,1000');

        Test.startTest();
        String formula = QuoteCreation_RateController.processRateCardCSV(docId, null);
        Test.stopTest();

        Assert.isTrue(formula.contains('null_material =='),
            'A null prefix is concatenated as text, not rejected: ' + formula);
    }

    // ══════════════════════════════════════════════════════════════════════
    // Failure path
    // ══════════════════════════════════════════════════════════════════════
    @IsTest
    static void wrapsMissingFileAsAuraHandledException() {
        // No ContentVersion matches, so the query throws and the catch has to
        // convert it into something the LWC can display.
        Id ghostDocId = uploadCsv(HEADER + '\nSteel,E250,1000');
        delete [SELECT Id FROM ContentDocument WHERE Id = :ghostDocId];

        Test.startTest();
        try {
            QuoteCreation_RateController.processRateCardCSV(ghostDocId, 'hdg');
            Assert.fail('A missing file should have been reported');
        } catch (AuraHandledException e) {
            Assert.isNotNull(e, 'Expected the controller to wrap the query failure');
        } catch (Exception e) {
            Assert.fail('A raw ' + e.getTypeName() + ' leaked instead of an AuraHandledException');
        }
        Test.stopTest();
    }

    @IsTest
    static void wrapsNullDocumentIdAsAuraHandledException() {
        Test.startTest();
        try {
            QuoteCreation_RateController.processRateCardCSV(null, 'hdg');
            Assert.fail('A null document id should have been reported');
        } catch (AuraHandledException e) {
            Assert.isNotNull(e, 'Expected the controller to wrap the failure');
        } catch (Exception e) {
            Assert.fail('A raw ' + e.getTypeName() + ' leaked instead of an AuraHandledException');
        }
        Test.stopTest();
    }
}