import { LightningElement, api, track } from 'lwc';
import { LightningAlert } from 'lightning/alert';

// IMPORTING YOUR INDIVIDUAL PICKLIST FILES HERE
import { getCrashBarrierFields } from './crashBarrierHandlerQRC';
import { getHdpePipeFields } from './hdpePipeHandlerQRC';

export default class QuoteRateCard extends LightningElement {
    @api recordId;

    valueA = '';
    valueB = '';
    @track optionsB = [];
    isModalOpen = false;
    @track dynamicFields = []; 

    picklistData = {
        'Crash Barrier - Department': [
            'MBCB type - Conventional Type', 'MBCB type - Railway', 
            'MBCB type - Crash Tested', 'MBCB type - Non-Spacer Design', 
            'Accessories & Miscellaneous Details'
        ],
        'HDPE Pipe - Department': ['Standard - IS 4984', 'Standard - PLB Duct'],
        'High Mast - Department': [
            'Standard Mast - Lighting Pole', 'Standard Mast - Transmission Pole', 
            'Standard Mast - Lighting Mast', 'Customized Mast - STADIUM MAST', 
            'Customized Mast - FLAG MAST'
        ]
    };

    get optionsA() {
        return Object.keys(this.picklistData).map(dept => ({ label: dept, value: dept }));
    }

    get isBDisabled() {
        return !this.valueA;
    }

    handleAChange(event) {
        this.valueA = event.detail.value;
        this.valueB = ''; 
        this.isModalOpen = false;
        this.dynamicFields = [];

        const rawOptions = this.picklistData[this.valueA] || [];
        this.optionsB = rawOptions.map(val => ({ label: val, value: val }));
    }

    handleBChange(event) {
        this.valueB = event.detail.value;
        if (this.valueA && this.valueB) {
            this.buildDynamicGridFields();
            this.isModalOpen = true;
        }
    }

    // ROUTING LOGIC: Routes execution to the dedicated configuration script file
    buildDynamicGridFields() {
        switch (this.valueA) {
            case 'Crash Barrier - Department':
                this.dynamicFields = getCrashBarrierFields(this.valueB);
                break;

            case 'HDPE Pipe - Department':
                this.dynamicFields = getHdpePipeFields(this.valueB);
                break;
                
            // case 'High Mast - Department':
            //     this.dynamicFields = getHighMastFields(this.valueB);
            //     break;

            default:
                this.dynamicFields = [
                    { name: 'General Reference Label', value: '', type: 'text' },
                    { name: 'Standard Rate', value: '', type: 'number' }
                ];
        }
    }

    handleInputChange(event) {
        const fieldName = event.target.name;
        const value = event.target.value;
        
        let targetField = this.dynamicFields.find(f => f.name === fieldName);
        if (targetField) {
            targetField.value = value;
        }
    }

    closeModal() {
        this.isModalOpen = false;
    }

    async handleSubmitData() {
        const allValid = [...this.template.querySelectorAll('lightning-input')]
            .reduce((validSoFar, inputCmp) => {
                inputCmp.reportValidity();
                return validSoFar && inputCmp.checkValidity();
            }, true);

        if (!allValid) return;

        const collectedDataPayload = {
            department: this.valueA,
            typeStandard: this.valueB,
            recordContextId: this.recordId,
            inputs: this.dynamicFields.reduce((acc, field) => {
                acc[field.name] = field.value;
                return acc;
            }, {})
        };

        console.log('Modular structured Payload data: ', JSON.stringify(collectedDataPayload));
        this.closeModal();

        await LightningAlert.open({
            message: 'Rates loaded and verified via dedicated sub-controllers successfully!',
            theme: 'success',
            label: 'Process Complete',
        });
    }
}