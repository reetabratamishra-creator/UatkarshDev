import { LightningElement, api, track } from 'lwc';

export default class SolarTermsAndConditions extends LightningElement {
    @api savedData = {};

    @track termsData = {
        tc_subject_line: '',
        tc_advance_payment: 30,
        tc_warranty_in_months: 12,
        tc_delivery_days: '45-60',
        tc_payment_terms_picklist: '',
        tc_lc_buyer_interest_days: null,
        tc_lc_seller_interest_days: null,
        tc_vfs_seller_interest: null,
        tc_PDC_interest: null,
        tc_open_credit_days: null
    };

    paymentTermOptions = [
        { label: 'Before Dispatch', value: 'Before Dispatch' },
        { label: 'Against LC Before Dispatch', value: 'Against LC Before Dispatch' },
        { label: 'Against VFS', value: 'Against VFS' },
        { label: 'Against PDC', value: 'Against PDC' },
        { label: 'Against Open Credit', value: 'Against Open Credit' }
    ];

    connectedCallback() {
        if (this.savedData) {
            this.termsData = {
                tc_subject_line: this.savedData.tc_subject_line || '',
                tc_advance_payment: this.savedData.tc_advance_payment !== undefined ? this.savedData.tc_advance_payment : 30,
                tc_warranty_in_months: this.savedData.tc_warranty_in_months !== undefined ? this.savedData.tc_warranty_in_months : 12,
                tc_delivery_days: this.savedData.tc_delivery_days || '45-60',
                tc_payment_terms_picklist: this.savedData.tc_payment_terms_picklist || '',
                tc_lc_buyer_interest_days: this.savedData.tc_lc_buyer_interest_days || null,
                tc_lc_seller_interest_days: this.savedData.tc_lc_seller_interest_days || null,
                tc_vfs_seller_interest: this.savedData.tc_vfs_seller_interest || null,
                tc_PDC_interest: this.savedData.tc_PDC_interest || null,
                tc_open_credit_days: this.savedData.tc_open_credit_days || null
            };
        }
    }

    handleFieldChange(event) {
        const field = event.target.name;
        let value = event.target.value;
        
        if (event.target.type === 'number') {
            value = value ? parseFloat(value) : null;
        }
        
        this.termsData[field] = value;
    }

    get isAgainstLC() {
        return this.termsData.tc_payment_terms_picklist === 'Against LC Before Dispatch';
    }

    get isAgainstVFS() {
        return this.termsData.tc_payment_terms_picklist === 'Against VFS';
    }

    get isAgainstPDC() {
        return this.termsData.tc_payment_terms_picklist === 'Against PDC';
    }

    get isAgainstOpenCredit() {
        return this.termsData.tc_payment_terms_picklist === 'Against Open Credit';
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }

    handleApply() {
        this.dispatchEvent(new CustomEvent('saveconfig', { detail: this.termsData }));
    }
}