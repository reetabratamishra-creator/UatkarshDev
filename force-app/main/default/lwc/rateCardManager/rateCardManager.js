import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getPriceCalculatorDepartments from '@salesforce/apex/QuoteRateCardController.getPriceCalculatorDepartments';
import getRateCardJson from '@salesforce/apex/CreateQuoteController.getRateCardJson';
import savePriceCalculatorMetadata from '@salesforce/apex/QuoteRateCardController.savePriceCalculatorMetadata';

export default class RateCardManager extends LightningElement {
    
    @track departmentOptions = [];
    @track selectedDepartmentDevName = '';
    @track selectedDepartment__c = '';
    
    @track ratesData = null; // null means no department selected yet
    @track weightsData = null; // To hold WEIGHT_MAP data
    @track isLoading = false;
    originalParsedData = null; // Store the full JSON to preserve non-rate sections

    // 1. Fetch available departments on load
    @wire(getPriceCalculatorDepartments)
    wiredDepartments({ error, data }) {
        if (data) {
            this.departmentOptions = data; // already mapped to label, value, department
        } else if (error) {
            this.showToast('Error', 'Failed to load departments', 'error');
            console.error('Error fetching departments:', error);
        }
    }

    // 2. Handle Dropdown Change
    handleDepartmentChange(event) {
        this.selectedDepartmentDevName = event.detail.value;
        // Find the corresponding Department__c value for the selected developer name
        const selectedOption = this.departmentOptions.find(opt => opt.value === this.selectedDepartmentDevName);
        if(selectedOption) {
            this.selectedDepartment__c = selectedOption.department;
            this.fetchRateCard(this.selectedDepartment__c);
        }
    }

    // 3. Fetch existing JSON for the selected department
    fetchRateCard(department__c) {
        this.isLoading = true;
        this.ratesData = null;
        this.weightsData = null;

        getRateCardJson({ departmentName: department__c })
            .then(result => {
                let parsedData = {};
                if (result) {
                    try {
                        parsedData = typeof result === 'string' ? JSON.parse(result) : result;
                    } catch (e) {
                        console.error('Failed to parse existing rate card JSON. Raw string:', result);
                        console.error(e);
                        this.showToast('Error', 'Failed to parse rate card JSON. Check console for raw string.', 'error');
                    }
                }
                
                this.originalParsedData = parsedData; // Save original
                
                // Determine if we are using the new nested structure (baseRates) or flat structure
                let ratesObj = parsedData;
                if (parsedData.sections || parsedData.baseRates !== undefined || parsedData.BASE_RATES !== undefined) {
                    ratesObj = parsedData.baseRates || parsedData.BASE_RATES || {};
                }

                // Convert object dictionary into an array for the data grid
                this.ratesData = Object.keys(ratesObj).map((key, index) => {
                    return {
                        id: `row-${Date.now()}-${index}`,
                        configKey: key,
                        rate: ratesObj[key]
                    };
                });

                // Extract WEIGHT_MAP if it exists
                let weightsObj = parsedData.weightMap || parsedData.WEIGHT_MAP;
                if (weightsObj) {
                    this.weightsData = Object.keys(weightsObj).map((key, index) => {
                        return {
                            id: `wrow-${Date.now()}-${index}`,
                            configKey: key,
                            weight: weightsObj[key]
                        };
                    });
                }
            })
            .catch(error => {
                this.showToast('Error', 'Failed to fetch Rate Card for this department.', 'error');
                console.error('Fetch error:', error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // 4. Handle Input Changes in the Grid
    handleRowChange(event) {
        const index = event.target.dataset.index;
        const field = event.target.dataset.field;
        const val = event.target.value;

        let updatedRow = { ...this.ratesData[index] };

        if (field === 'rate') {
            if (val && val.trim() !== '' && !isNaN(val)) {
                updatedRow[field] = parseFloat(val);
            } else {
                updatedRow[field] = val ? val : null;
            }
        } else {
            updatedRow[field] = val;
        }

        this.ratesData[index] = updatedRow;
    }

    handleWeightRowChange(event) {
        const index = event.target.dataset.index;
        const field = event.target.dataset.field;
        const val = event.target.value;

        let updatedRow = { ...this.weightsData[index] };

        if (field === 'weight') {
            if (val && val.trim() !== '' && !isNaN(val)) {
                updatedRow[field] = parseFloat(val);
            } else {
                updatedRow[field] = val ? val : null;
            }
        } else {
            updatedRow[field] = val;
        }

        this.weightsData[index] = updatedRow;
    }

    // 5. Add a blank row
    addRow() {
        if (!this.ratesData) this.ratesData = [];
        this.ratesData.push({
            id: `row-${Date.now()}`,
            configKey: '',
            rate: null
        });
    }

    addWeightRow() {
        if (!this.weightsData) this.weightsData = [];
        this.weightsData.push({
            id: `wrow-${Date.now()}`,
            configKey: '',
            weight: null
        });
    }

    // 6. Delete a row
    deleteRow(event) {
        const index = event.target.dataset.index;
        this.ratesData.splice(index, 1);
    }

    deleteWeightRow(event) {
        const index = event.target.dataset.index;
        this.weightsData.splice(index, 1);
    }

    // 7. Save back to Salesforce via Apex
    saveRates() {
        if(!this.selectedDepartmentDevName) {
            this.showToast('Warning', 'Please select a department first.', 'warning');
            return;
        }

        // Validate base rates
        for(let i=0; i<this.ratesData.length; i++) {
            const row = this.ratesData[i];
            if(!row.configKey || row.configKey.trim() === '') {
                this.showToast('Validation Error', `Base Rate Row ${i+1} is missing a Configuration Key.`, 'error');
                return;
            }
            if(row.rate === null || row.rate === undefined || row.rate === '') {
                this.showToast('Validation Error', `Base Rate Row ${i+1} has an invalid Rate.`, 'error');
                return;
            }
        }

        // Validate weights
        if(this.weightsData) {
            for(let i=0; i<this.weightsData.length; i++) {
                const row = this.weightsData[i];
                if(!row.configKey || row.configKey.trim() === '') {
                    this.showToast('Validation Error', `Weight Map Row ${i+1} is missing a Configuration Key.`, 'error');
                    return;
                }
                if(row.weight === null || row.weight === undefined || row.weight === '') {
                    this.showToast('Validation Error', `Weight Map Row ${i+1} has an invalid Weight.`, 'error');
                    return;
                }
            }
        }

        this.isLoading = true;

        let updatedRatesObj = {};
        this.ratesData.forEach(row => {
            updatedRatesObj[row.configKey.trim()] = row.rate;
        });

        let updatedWeightsObj = {};
        if(this.weightsData) {
            this.weightsData.forEach(row => {
                updatedWeightsObj[row.configKey.trim()] = row.weight;
            });
        }

        // Determine how to reconstruct the full JSON
        let jsonToSave = {};
        if (this.originalParsedData && (this.originalParsedData.sections || this.originalParsedData.baseRates !== undefined || this.originalParsedData.BASE_RATES !== undefined)) {
            // New structure: preserve everything else, replace baseRates and weightMap
            jsonToSave = { ...this.originalParsedData };
            if (this.originalParsedData.BASE_RATES !== undefined) {
                jsonToSave.BASE_RATES = updatedRatesObj;
            } else {
                jsonToSave.baseRates = updatedRatesObj;
            }
            
            if(this.weightsData) {
                if (this.originalParsedData.WEIGHT_MAP !== undefined) {
                    jsonToSave.WEIGHT_MAP = updatedWeightsObj;
                } else if (this.originalParsedData.weightMap !== undefined) {
                    jsonToSave.weightMap = updatedWeightsObj;
                } else {
                    jsonToSave.WEIGHT_MAP = updatedWeightsObj;
                }
            }
        } else {
            // Old structure: the root object IS the rates object
            jsonToSave = updatedRatesObj;
        }

        const jsonString = JSON.stringify(jsonToSave, null, 2);

        savePriceCalculatorMetadata({ 
            developerName: this.selectedDepartmentDevName, 
            jsonString: jsonString 
        })
        .then(() => {
            this.showToast('Success', 'Rates and Weights queued for deployment. It may take a minute to apply.', 'success');
        })
        .catch(error => {
            this.showToast('Error', 'Failed to save: ' + (error.body ? error.body.message : error.message), 'error');
            console.error('Save error:', error);
        })
        .finally(() => {
            this.isLoading = false;
        });
    }

    // Utility: Toast messages
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}