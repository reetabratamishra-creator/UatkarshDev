import { LightningElement, api, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import SHEETJS from '@salesforce/resourceUrl/sheetjs'; 
import { LightningAlert } from 'lightning/alert';

// Static Module Relative Path Imports
import { getCrashBarrierFields } from './crashBarrierDepartment';
import { getHdpePipeFields } from './hdpePipeDepartment';
import { getHighMastFields } from './highMastDepartment';
import { getSolarStructureFields } from './solarStructureDepartment';
import { getSteelPipeFields } from './steelPipeDepartment';
import { getSteelTubularPoleFields } from './steelTubularPoleDepartment';
import { getTransmissionTowerFields } from './transmissionTowerDepartment';

export default class QuoteRateCardHybrid extends LightningElement {
    @api recordId;

    @track valueA = '';
    @track valueB = '';
    @track optionsB = [];
    @track dynamicGridRows = [];
    
    // Error Pop-up Tracking States
    @track excelErrors = [];
    isErrorModalOpen = false;

    currentMode = 'grid'; 
    isProcessing = false;

    picklistData = {
        'Crash Barrier - Department': ['MBCB type - Conventional Type', 'MBCB type - Railway', 'MBCB type - Crash Tested', 'MBCB type - Non-Spacer Design', 'Accessories & Miscellaneous Details'],
        'HDPE Pipe - Department': ['Standard - IS 4984', 'Standard - PLB Duct'],
        'High Mast - Department': ['Standard Mast - Lighting Pole', 'Standard Mast - Transmission Pole', 'Standard Mast - Lighting Mast', 'Customized Mast - STADIUM MAST', 'Customized Mast - FLAG MAST'],
        'Solar Structure - Department': ['Unit of Measurement - Pcs', 'Unit of Measurement - Weight'],
        'Steel Pipes - Department': ['Market Type - Domestic', 'Market Type - Export'],
        'Steel Tubular Pole - Department': ['Type of Pole - Standard', 'Type of Pole - Customized'],
        'Transmission Tower - Department': ['Type of Product - Tower', 'Type of Product - Substation', 'Nuts & Bolts Details', 'Price Variation Calculation']
    };

    departmentFunctionMap = {
        'Crash Barrier - Department': getCrashBarrierFields,
        'HDPE Pipe - Department': getHdpePipeFields,
        'High Mast - Department': getHighMastFields,
        'Solar Structure - Department': getSolarStructureFields,
        'Steel Pipes - Department': getSteelPipeFields,
        'Steel Tubular Pole - Department': getSteelTubularPoleFields,
        'Transmission Tower - Department': getTransmissionTowerFields
    };

    connectedCallback() {
        loadScript(this, SHEETJS)
            .then(() => { console.log('Hybrid Engine: SheetJS Core Parser Ready.'); })
            .catch(err => { console.error('Error initializing SheetJS', err); });
    }

    get optionsA() { return Object.keys(this.picklistData).map(d => ({ label: d, value: d })); }
    get isBDisabled() { return !this.valueA; }
    get isWorkspaceActive() { return this.valueA && this.valueB; }
    get isGridActiveMode() { return this.currentMode === 'grid'; }
    get isUploadActiveMode() { return this.currentMode === 'upload'; }
    get gridModeClass() { return `slds-button slds-button_${this.currentMode === 'grid' ? 'brand' : 'neutral'}`; }
    get uploadModeClass() { return `slds-button slds-button_${this.currentMode === 'upload' ? 'brand' : 'neutral'}`; }
    get gridIconVariant() { return this.currentMode === 'grid' ? 'inverse' : ''; }
    get uploadIconVariant() { return this.currentMode === 'upload' ? 'inverse' : ''; }

    handleAChange(event) {
        this.valueA = event.detail.value;
        this.valueB = '';
        this.dynamicGridRows = [];
        this.optionsB = (this.picklistData[this.valueA] || []).map(v => ({ label: v, value: v }));
    }

    handleBChange(event) {
        this.valueB = event.detail.value;
        this.initializeWorkspaceContext();
    }

    toggleToGridMode() { this.currentMode = 'grid'; this.initializeWorkspaceContext(); }
    toggleToUploadMode() { this.currentMode = 'upload'; }

    initializeWorkspaceContext() {
        const targetFunction = this.departmentFunctionMap[this.valueA];
        if (targetFunction) {
            this.dynamicGridRows = targetFunction(this.valueB);
        } else {
            this.dynamicGridRows = [];
        }
    }

    handleGridCellChange(event) {
        const fieldName = event.target.name;
        const targetCell = this.dynamicGridRows.find(row => row.name === fieldName);
        if (targetCell) {
            targetCell.value = event.target.value;
        }
    }

    // Bulk File Interceptor Engine
    handleBulkExcelUpload(event) {
        const referenceFile = event.target.files[0];
        if (!referenceFile) return;

        this.isProcessing = true;
        this.excelErrors = []; // Reset errors before validation pass
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const extractedJson = XLSX.utils.sheet_to_json(sheet);

                if (!extractedJson || extractedJson.length === 0) {
                    throw new Error('The uploaded file structure has zero row data entries available.');
                }

                let errorsDiscovered = [];
                const rowStructureTemplate = this.dynamicGridRows.map(r => r.name);
                const validatedExcelFirstRow = extractedJson[0];

                // 1. Structure Verification (Check for missing column headers)
                rowStructureTemplate.forEach(headerField => {
                    if (!(headerField in validatedExcelFirstRow)) {
                        errorsDiscovered.push(`Missing mandatory column header: "${headerField}"`);
                    }
                });

                // 2. Row Content Integrity Verification (Data Type checks across all rows)
                if (errorsDiscovered.length === 0) {
                    extractedJson.forEach((excelRow, index) => {
                        this.dynamicGridRows.forEach(expectedField => {
                            const actualValue = excelRow[expectedField.name];
                            
                            // Check if a cell is completely blank
                            if (actualValue === undefined || actualValue === null || actualValue === '') {
                                errorsDiscovered.push(`Row ${index + 1}: Field "${expectedField.name}" cell is empty.`);
                            } 
                            // Check if a numeric field contains letters or text symbols
                            else if (expectedField.type === 'number' && isNaN(actualValue)) {
                                errorsDiscovered.push(`Row ${index + 1}: Field "${expectedField.name}" expects a number, but found text "${actualValue}".`);
                            }
                        });
                    });
                }

                // If any formatting or value errors were found, halt execution and display the error modal
                if (errorsDiscovered.length > 0) {
                    this.excelErrors = errorsDiscovered;
                    this.isErrorModalOpen = true;
                    // Clear the file input element so the user can re-upload after fixing the file
                    this.template.querySelector('#bulk-file-input').value = '';
                    return;
                }

                // If validation passes cleanly, populate the grid rows with the data from the first row of the sheet
                this.dynamicGridRows = this.dynamicGridRows.map(row => ({
                    ...row,
                    value: validatedExcelFirstRow[row.name] || ''
                }));

                this.currentMode = 'grid'; 
                this.showSystemSuccessAlert('Bulk Sheet verified and successfully parsed without formatting exceptions.');

            } catch (err) {
                this.excelErrors = [err.message];
                this.isErrorModalOpen = true;
            } finally {
                this.isProcessing = false;
            }
        };
        reader.readAsArrayBuffer(referenceFile);
    }

    closeErrorModal() {
        this.isErrorModalOpen = false;
        this.excelErrors = [];
    }

    submitGridData() {
        const validationInputs = [...this.template.querySelectorAll('lightning-input')];
        const formsAreValid = validationInputs.reduce((valid, input) => {
            input.reportValidity();
            return valid && input.checkValidity();
        }, true);

        if (!formsAreValid) return;

        const payload = {
            metaDepartment: this.valueA,
            metaSpecification: this.valueB,
            contextParentId: this.recordId,
            timestamp: new Date().toISOString(),
            dataset: this.dynamicGridRows.reduce((acc, row) => {
                acc[row.name] = row.value;
                return acc;
            }, {})
        };

        this.showSystemSuccessAlert('Dynamic Pricing Structure compiled successfully!');
        console.log('JSON Payload Output: ', JSON.stringify(payload));
    }

    async showSystemSuccessAlert(message) {
        await LightningAlert.open({
            message: message,
            theme: 'success',
            label: 'Data Sync Success',
        });
    }
}