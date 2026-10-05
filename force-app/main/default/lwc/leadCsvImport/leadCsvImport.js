import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getLeadSourceOptions from '@salesforce/apex/LeadCsvImportController.getLeadSourceOptions';
import processLeadImport from '@salesforce/apex/LeadCsvImportController.processLeadImport';
import getExistingPhones from '@salesforce/apex/LeadCsvImportController.getExistingPhones';
import getDepartmentOptions from '@salesforce/apex/LeadCsvImportController.getDepartmentOptions';

/*const DATATABLE_COLUMNS = [
    { label: 'First Name', fieldName: 'firstName', editable: true },
    { label: 'Last Name', fieldName: 'lastName', editable: true },
    { label: 'Phone', fieldName: 'phone', type: 'phone', editable: true },
    { label: 'Department Name', fieldName: 'departmentName', editable: true },
    { label: 'Email', fieldName: 'email', type: 'email', editable: true }
];*/

const REQUIRED_FIELD_KEYS = ['firstName', 'lastName', 'phone', 'departmentName'];

const MAX_CSV_ROWS = 50;

const PHONE_REGEX = /^\d{10}$/;

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Column headers that must be present in the CSV (case-insensitive, order-independent).
const REQUIRED_COLUMNS = ['First Name', 'Last Name', 'Phone', 'Department Name'];

// Optional columns - still counted toward the "exactly 5 columns" rule.
const OPTIONAL_COLUMNS = ['Email'];

const ALL_EXPECTED_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
const EXPECTED_COLUMN_COUNT = ALL_EXPECTED_COLUMNS.length;

// Maps a (lowercased, trimmed) CSV header name to the internal field key used
// by the preview datatable and the Apex wrapper.
const HEADER_TO_FIELD_KEY = {
    'first name': 'firstName',
    'last name': 'lastName',
    'phone': 'phone',
    'department name': 'departmentName',
    'email': 'email'
};

// Lead Source values for which the supporting-document upload is NOT required
// (comparison is case-insensitive).
const LEAD_SOURCES_NO_FILE_REQUIRED = ['OFFLINE CRM', 'Offline Marketing'];

/**
 * Minimal RFC-4180-ish CSV parser (no external library dependency).
 * Handles quoted fields, escaped quotes (""), and commas inside quotes.
 * Returns an array of rows, each row an array of trimmed string cells.
 */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    // Normalize line endings so \r\n and \r are treated like \n.
    const input = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (inQuotes) {
            if (char === '"') {
                if (input[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }
    // Push the last field/row if the file didn't end with a newline.
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    // Drop fully blank trailing rows (common with trailing newlines).
    return rows.filter((r) => r.some((cell) => cell && cell.trim().length > 0));
}

export default class LeadCsvImport extends LightningElement {
    // columns = DATATABLE_COLUMNS;

    // ---- Reactive state ----
    @track leadSourceOptions = [];
    selectedLeadSource = '';

    csvFileName = '';
    @track previewData = [];
    draftValues = [];
    datatableErrors = {};
    showPreview = false;

    supportingFileName = '';
    supportingFileBase64 = '';

    showErrorModal = false;
    errorModalMessage = '';

    isProcessing = false;
    showResultSummary = false;
    resultSummary = null;
    showFinishButton = false;
    existingPhoneSet = new Set();
    departmentSet = new Set();

    showWarningModal = false;
    warningModalMessage = '';

    isLeadSourcesLoaded = false;

    async connectedCallback() {
        //this.loadLeadSourceOptions();
        await Promise.all([
            this.loadLeadSourceOptions(),
            this.loadDepartmentOptions()
        ]);
    }

    get columns() {
        return [
            {
                label: 'First Name',
                fieldName: 'firstName',
                editable: !this.showResultSummary
            },
            {
                label: 'Last Name',
                fieldName: 'lastName',
                editable: !this.showResultSummary
            },
            {
                label: 'Phone',
                fieldName: 'phone',
                type: 'phone',
                editable: !this.showResultSummary
            },
            {
                label: 'Department Name',
                fieldName: 'departmentName',
                editable: !this.showResultSummary
            },
            {
                label: 'Email',
                fieldName: 'email',
                type: 'email',
                editable: !this.showResultSummary
            },
            {
                label: 'Warning',
                fieldName: 'warning',
                type: 'text',
                wrapText: true,
                editable: false,
                cellAttributes: {
                iconName: {
                        fieldName: 'warningIcon'
                    },
                    iconAlternativeText: 'Warning',
                    iconPosition: 'left'
                }
            }
        ];
    }

    async loadLeadSourceOptions() {
        try {
            const options = await getLeadSourceOptions();
            this.leadSourceOptions = (options || []).map((val) => ({ label: val, value: val }));
        } catch (error) {
            this.showToast('Error', this.extractErrorMessage(error), 'error');
        } finally {
            this.isLeadSourcesLoaded = true;
        }
    }

    async loadDepartmentOptions() {
        const result = await getDepartmentOptions();
        this.departmentSet = new Set(result);
    }

    // ---- Computed getters ----

    get isFileSectionVisible() {
        if (!this.selectedLeadSource) {
            return false;
        }
        const normalized = this.selectedLeadSource.trim().toUpperCase();
        return !LEAD_SOURCES_NO_FILE_REQUIRED.some((src) => src.trim().toUpperCase() === normalized);
    }

    get isInsertDisabled() {
        return this.isProcessing || !this.showPreview;
    }

    get rowsWithWarnings() {
        return this.previewData.filter(
            row => row.warnings && row.warnings.length > 0
        );
    }

    get validRows() {
        return this.previewData.filter(
            row => !row.warnings || row.warnings.length === 0
        );
    }

    get hasCsvFile() {
        return !!this.csvFileName;
    }

    get supportingFileRequiredLabel() {
        return this.isFileSectionVisible ? 'Supporting Document (required)' : '';
    }

    // ---- Lead Source ----

    handleLeadSourceChange(event) {
        this.selectedLeadSource = event.detail.value;
        // If the file section becomes hidden, clear any previously attached file
        // so a stale file isn't silently sent on Insert.
        if (!this.isFileSectionVisible) {
            this.supportingFileName = '';
            this.supportingFileBase64 = '';
        }
    }

    // ---- CSV Upload ----

    handleCsvFileChange(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            this.parseAndValidateCsv(reader.result, file.name);
        };
        reader.onerror = () => {
            this.openErrorModal('There was a problem reading the file. Please try again.');
        };
        reader.readAsText(file);
    }

    handleRemoveCsvFile() {
        this.resetCsvState();
    }

    async parseAndValidateCsv(text, fileName) {
        const rows = parseCsv(text);
        if (!rows || rows.length === 0) {
            this.openErrorModal('The uploaded CSV file is empty.');
            return;
        }

        const header = rows[0];
        const dataRows = rows.slice(1);

        // 1. Column count check
        if (header.length !== EXPECTED_COLUMN_COUNT) {
            this.openErrorModal(
                `The CSV must contain exactly ${EXPECTED_COLUMN_COUNT} columns. Found ${header.length}.`
            );
            return;
        }

        // Build a header-name -> column-index map (case-insensitive, trimmed)
        const normalizedHeader = header.map((h) => h.trim().toLowerCase());
        const headerIndexByFieldKey = {};
        normalizedHeader.forEach((h, idx) => {
            const fieldKey = HEADER_TO_FIELD_KEY[h];
            if (fieldKey) {
                headerIndexByFieldKey[fieldKey] = idx;
            }
        });

        // 2. Required columns present check
        const missingRequired = REQUIRED_COLUMNS.filter((col) => {
            const fieldKey = HEADER_TO_FIELD_KEY[col.trim().toLowerCase()];
            return headerIndexByFieldKey[fieldKey] === undefined;
        });
        if (missingRequired.length > 0) {
            this.openErrorModal(
                `The CSV is missing required column(s): ${missingRequired.join(', ')}.`
            );
            return;
        }
        //console.log('Data rows:', dataRows.length);
        // 3. Row limit check
        if (dataRows.length >= MAX_CSV_ROWS + 1) {
            this.openErrorModal(
                `The uploaded CSV contains ${dataRows.length} records. A maximum of ${MAX_CSV_ROWS} records can be imported at a time. Please split the file into smaller batches and try again.`
            );
            return;
        }
        if (dataRows.length === 0) {
            this.openErrorModal('The CSV does not contain any data rows.');
            return;
        }

        // Build preview data, keyed by field name rather than column position,
        // so column order in the source file doesn't matter.
        const emailIdx = headerIndexByFieldKey.email;
        this.previewData = dataRows.map((cells, i) => ({
            rowKey: `row-${i}-${Date.now()}`,
            firstName: (cells[headerIndexByFieldKey.firstName] || '').trim(),
            lastName: (cells[headerIndexByFieldKey.lastName] || '').trim(),
            phone: (cells[headerIndexByFieldKey.phone] || '').trim(),
            departmentName: (cells[headerIndexByFieldKey.departmentName] || '').trim(),
            email: emailIdx !== undefined ? (cells[emailIdx] || '').trim() : '',
            warning: '',
            warnings: []
        }));

        // Get all phone numbers from the uploaded CSV
        const phones = this.previewData
            .map(row => row.phone)
            .filter(phone => phone);

        // Query Salesforce only once
        //const existingPhones = await getExistingPhones({phones});

        // Cache them
        //this.existingPhoneSet = new Set(existingPhones);

        await this.refreshExistingPhoneSet();
        // Validate rows
        await this.validateRows();

        this.csvFileName = fileName;
        this.showPreview = true;
    }

    // ---- Datatable inline edit ----

    async handleSave(event) {
        const draftValues = event.detail.draftValues;
        const updatedRows = this.previewData.map((row) => {
            const draft = draftValues.find((d) => d.rowKey === row.rowKey);
            return draft ? { ...row, ...draft } : row;
        });
        this.previewData = updatedRows;
        this.draftValues = [];
        //this.datatableErrors = {};
        await this.refreshExistingPhoneSet();
        await this.validateRows();
    }

    async refreshExistingPhoneSet() {
        const phones = this.previewData
            .map(row => row.phone)
            .filter(phone => phone);

        const existingPhones = await getExistingPhones({ phones });

        this.existingPhoneSet = new Set(existingPhones);
    }

    // ---- Supporting file ----

    handleSupportingFileChange(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            // reader.result is a data URL: "data:<mime>;base64,<data>"
            const base64 = reader.result.split(',')[1];
            this.supportingFileBase64 = base64;
            this.supportingFileName = file.name;
        };
        reader.onerror = () => {
            this.showToast('Error', 'There was a problem reading the supporting file.', 'error');
        };
        reader.readAsDataURL(file);
    }

    handleRemoveSupportingFile() {
        this.supportingFileName = '';
        this.supportingFileBase64 = '';
    }

    // ---- Row validation before Insert ----

    /* validateRows() {
        const errors = { rows: {}, table: {} };
        let hasError = false;

        this.previewData.forEach((row) => {
            const missingFields = REQUIRED_FIELD_KEYS.filter((key) => !row[key] || !row[key].trim());
            if (missingFields.length > 0) {
                hasError = true;
                errors.rows[row.rowKey] = {
                    title: 'Missing required field(s)',
                    messages: [`Please complete: ${missingFields.join(', ')}`],
                    fieldNames: missingFields
                };
            }
        });

        if (hasError) {
            errors.table = {
                title: 'We found errors in the table.',
                messages: ['Please fix the highlighted rows before inserting.']
            };
        }

        this.datatableErrors = errors;
        return !hasError;
    } */
    validateRows() {

        const errors = {
            rows: {},
            table: {}
        };

        let hasError = false;

        // Count duplicate phone numbers inside the CSV
        const phoneCount = {};

        this.previewData.forEach(row => {
            const phone = (row.phone || '').trim();

            if (phone) {
                phoneCount[phone] = (phoneCount[phone] || 0) + 1;
            }
        });

        this.previewData = this.previewData.map(row => {

            const warnings = [];

            const missingFields = REQUIRED_FIELD_KEYS.filter(
                key => !row[key] || !row[key].trim()
            );

            if (missingFields.length > 0) {

                hasError = true;

                errors.rows[row.rowKey] = {
                    title: 'Missing required field(s)',
                    messages: [`Please complete: ${missingFields.join(', ')}`],
                    fieldNames: missingFields
                };

                warnings.push(
                    `Missing required field(s): ${missingFields.join(', ')}`
                );
            }

            // Phone validation
            if (row.phone && !/^\d{10}$/.test(row.phone.trim())) {
                warnings.push('Phone number must contain exactly 10 digits');
            }

            // Email validation
            if (row.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(row.email.trim())) {
                warnings.push('Email address is invalid');
            }

            if(row.departmentName && !this.departmentSet.has(row.departmentName.trim())){
                warnings.push('Department value is invalid');
            }

            // Duplicate phone inside CSV
            if (row.phone && phoneCount[row.phone.trim()] > 1) {
                warnings.push('Duplicate phone number found in uploaded CSV');
            }

            // Duplicate phone check from Salesforce records
            if (row.phone && this.existingPhoneSet.has(row.phone.trim())) {
                warnings.push('Lead already exists in Salesforce with this phone number');
            }

            /*return {
                ...row,
                warnings,
                warning: warnings.join(' | ')
            };*/
            return {
                ...row,
                warnings,
                warning: warnings.length > 0
                    ? warnings.join(' | ')
                    : 'Ready',

                warningIcon: warnings.length > 0
                    ? 'utility:warning'
                    : 'utility:success'
            };

        });

        if (hasError) {

            errors.table = {
                title: 'We found errors in the table.',
                messages: ['Please fix the highlighted rows before inserting.']
            };

        }

        this.datatableErrors = errors;

        /*return !this.previewData.some(
            row => row.warnings.length > 0
        );*/
        return !hasError;
    }

    // ---- Action buttons ----

    /*async handleInsert() {
        if (!this.selectedLeadSource) {
            this.showToast('Error', 'Lead Source is required.', 'error');
            return;
        }
        if (!this.validateRows()) {
            this.showToast('Error', 'Please fix the highlighted rows before inserting.', 'error');
            return;
        }
        if (this.isFileSectionVisible && !this.supportingFileBase64) {
            this.showToast('Error', 'A supporting document is required for this Lead Source.', 'error');
            return;
        }

        this.isProcessing = true;
        try {
            const leadsJson = JSON.stringify(this.previewData);
            const result = await processLeadImport({
                leadsJson,
                leadSourceValue: this.selectedLeadSource,
                fileName: this.isFileSectionVisible ? this.supportingFileName : null,
                fileBase64: this.isFileSectionVisible ? this.supportingFileBase64 : null
            });
            //console.log(result);
            //console.log(result.errors);
            //console.log(JSON.stringify(result));

            this.resultSummary = {
                totalProcessed: result.totalProcessed,
                successCount: result.successCount,
                failCount: result.failCount,
                hasFailures: result.failCount > 0,
                errors: result.errors || []
            };
            this.showResultSummary = true;
            this.showFinishButton = true;
        } catch (error) {
            console.error(error);
            this.showToast('Error', this.extractErrorMessage(error), 'error');
        } finally {
            this.isProcessing = false;
        }
    }*/

    async handleInsert() {

        if (!this.selectedLeadSource) {
            this.showToast('Error', 'Lead Source is required.', 'error');
            return;
        }

        // Required field validation
        if (!this.validateRows()) {
            this.showToast(
                'Error',
                'Please fix the highlighted required fields before inserting.',
                'error'
            );
            return;
        }

        // Supporting document validation
        if (this.isFileSectionVisible && !this.supportingFileBase64) {
            this.showToast(
                'Error',
                'A supporting document is required for this Lead Source.',
                'error'
            );
            return;
        }

        // NEW: Show confirmation if warning rows exist
        if (this.rowsWithWarnings.length > 0) {

            this.warningModalMessage =
                `${this.rowsWithWarnings.length} row(s) contain warning(s) and will be skipped.\n\n` +
                `${this.validRows.length} row(s) will be inserted.\n\n` +
                `Do you want to proceed?`;

            this.showWarningModal = true;
            return;
        }

        // No warnings -> insert everything
        await this.performInsert(this.previewData);
    }
    async performInsert(rowsToInsert) {

        this.isProcessing = true;

        try {

            const leadsJson = JSON.stringify(rowsToInsert);

            const result = await processLeadImport({

                leadsJson,
                leadSourceValue: this.selectedLeadSource,
                fileName: this.isFileSectionVisible
                    ? this.supportingFileName
                    : null,
                fileBase64: this.isFileSectionVisible
                    ? this.supportingFileBase64
                    : null

            });

            /*this.resultSummary = {
                totalProcessed: result.totalProcessed,
                successCount: result.successCount,
                failCount: result.failCount,
                hasFailures: result.failCount > 0,
                errors: result.errors || []
            };*/
            const skippedRows = this.previewData.length - rowsToInsert.length;

            this.resultSummary = {
                totalProcessed: this.previewData.length,
                successCount: result.successCount,
                failCount: result.failCount + skippedRows,
                hasFailures: (result.failCount + skippedRows) > 0,

                errors: [
                    ...(result.errors || []),

                    ...this.rowsWithWarnings.map(row => ({
                        rowKey: row.rowKey,
                        message: `CSV Row ${
                            parseInt(row.rowKey.split('-')[1], 10) + 2
                        }: ${row.warning}`
                    }))
                ]
            };

            this.showResultSummary = true;
            this.showFinishButton = true;

        }
        catch(error) {

            console.error(error);

            this.showToast(
                'Error',
                this.extractErrorMessage(error),
                'error'
            );

        }
        finally {

            this.isProcessing = false;

        }

    }

    async handleProceedInsert() {
        this.showWarningModal = false;

        await this.performInsert(
            this.validRows
        );
    }

    handleCancelWarningModal() {
        this.showWarningModal = false;
    }

    handleCancel() {
        this.resetComponent();
    }

    handleFinish() {
        this.resetComponent();
    }

    // ---- Error modal ----

    openErrorModal(message) {
        this.errorModalMessage = message;
        this.showErrorModal = true;
    }

    handleCloseErrorModal() {
        this.showErrorModal = false;
        this.errorModalMessage = '';
        // Per spec: closing the error modal resets the whole component.
        this.resetComponent();
    }

    // ---- Reset helpers ----

    resetCsvState() {
        this.csvFileName = '';
        this.previewData = [];
        this.existingPhoneSet = new Set();
        this.draftValues = [];
        this.datatableErrors = {};
        this.showPreview = false;
        this.supportingFileName = '';
        this.supportingFileBase64 = '';
        const csvInput = this.template.querySelector('[data-id="csv-file-input"]');
        if (csvInput) {
            csvInput.value = null;
        }
    }

    resetComponent() {
        this.selectedLeadSource = '';
        this.resetCsvState();
        this.showResultSummary = false;
        this.resultSummary = null;
        this.showFinishButton = false;
        this.isProcessing = false;
    }

    // ---- Utilities ----

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    extractErrorMessage(error) {
        if (error && error.body && error.body.message) {
            return error.body.message;
        }
        if (error && error.message) {
            return error.message;
        }
        return 'An unknown error occurred.';
    }
}