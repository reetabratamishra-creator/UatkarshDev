import { LightningElement, api, track } from 'lwc';

export default class CrashBarrierCustomerAddress extends LightningElement {
    @api savedData = {};
    @api accountAddress = {};

    @track address = {
        ba_street: '',
        ba_city: '',
        ba_zip_code: '',
        ba_state: '',
        ba_country: '',
        ba_phone: '',
        ba_email: '',
        ba_website: '',
        has_transportation_address: false,
        sa_street: '',
        sa_city: '',
        sa_zip_code: '',
        sa_state: '',
        sa_country: ''
    };

    connectedCallback() {
        // Pre-fill from Account if available
        if (this.accountAddress) {
            this.address.ba_street = this.accountAddress.BillingStreet || '';
            this.address.ba_city = this.accountAddress.BillingCity || '';
            this.address.ba_zip_code = this.accountAddress.BillingPostalCode || '';
            this.address.ba_state = this.accountAddress.BillingState || '';
            this.address.ba_country = this.accountAddress.BillingCountry || '';
            this.address.ba_phone = this.accountAddress.Phone || '';
            this.address.ba_email = this.accountAddress.Email__c || '';
            this.address.ba_website = this.accountAddress.Website || '';
        }

        // Override with saved data
        if (this.savedData) {
            Object.keys(this.address).forEach(key => {
                if (this.savedData[key] !== undefined) {
                    this.address[key] = this.savedData[key];
                }
            });
        }
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        if (field === 'has_transportation_address') {
            this.address[field] = event.target.checked;
        } else {
            this.address[field] = event.target.value;
        }
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }

    handleSave() {
        this.dispatchEvent(new CustomEvent('saveconfig', {
            detail: { ...this.address }
        }));
    }
}