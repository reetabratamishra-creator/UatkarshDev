import { LightningElement, api, track } from 'lwc';

export default class SolarCustomerAddress extends LightningElement {
    @api accountRecord;
    @api savedData = {};

    @track addressData = {
        ba_street: '',
        ba_city: '',
        ba_zip_code: '',
        ba_state: '',
        ba_country: '',
        ba_phone: '',
        ba_email: '',
        ba_website: ''
    };

    connectedCallback() {
        // Initialize from parent saved data or use account record fallback
        this.addressData.ba_street = this.savedData.ba_street || (this.accountRecord ? this.accountRecord.BillingStreet : '');
        this.addressData.ba_city = this.savedData.ba_city || (this.accountRecord ? this.accountRecord.BillingCity : '');
        this.addressData.ba_zip_code = this.savedData.ba_zip_code || (this.accountRecord ? this.accountRecord.BillingPostalCode : '');
        this.addressData.ba_state = this.savedData.ba_state || (this.accountRecord ? this.accountRecord.BillingState : '');
        this.addressData.ba_country = this.savedData.ba_country || (this.accountRecord ? this.accountRecord.BillingCountry : '');
        this.addressData.ba_phone = this.savedData.ba_phone || (this.accountRecord ? this.accountRecord.Phone : '');
        this.addressData.ba_email = this.savedData.ba_email || (this.accountRecord ? this.accountRecord.Email__c : '');
        this.addressData.ba_website = this.savedData.ba_website || (this.accountRecord ? this.accountRecord.Website : '');
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }

    handleApply() {
        this.dispatchEvent(new CustomEvent('saveconfig', { detail: this.addressData }));
    }
}