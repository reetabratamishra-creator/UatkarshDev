import { LightningElement, api, track } from 'lwc';

export default class CrashBarrierTerms extends LightningElement {
    @api savedData = {};

    @track terms = {
        tc_validity_days: 5,
        tc_special_note: '',
        tc_payment_terms_picklist: 'Advance',
        tc_no_of_days_interest_free_credit: '0',
        tc_usance_period: null
    };

    paymentTermsOptions = [
        { label: 'Advance', value: 'Advance' },
        { label: 'Against LC', value: 'Against LC' },
        { label: 'Against BG', value: 'Against BG' },
        { label: 'Against Open Credit', value: 'Against Open Credit' }
    ];

    interestFreeOptions = [
        { label: '0', value: '0' },
        { label: '15', value: '15' },
        { label: '30', value: '30' },
        { label: '45', value: '45' },
        { label: '60', value: '60' },
        { label: '75', value: '75' },
        { label: '90', value: '90' },
        { label: '120', value: '120' },
        { label: '150', value: '150' },
        { label: '180', value: '180' }
    ];

    connectedCallback() {
        if (this.savedData) {
            Object.keys(this.terms).forEach(key => {
                if (this.savedData[key] !== undefined) {
                    this.terms[key] = this.savedData[key];
                }
            });
        }
    }

    get showInterestFreeCredit() {
        const pt = this.terms.tc_payment_terms_picklist;
        return pt === 'Against LC' || pt === 'Against BG' || pt === 'Against Open Credit';
    }

    get showUsancePeriod() {
        return this.terms.tc_payment_terms_picklist === 'Against LC';
    }

    handleChange(event) {
        const field = event.target.dataset.field;
        this.terms[field] = event.target.value;
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }

    handleSave() {
        this.dispatchEvent(new CustomEvent('saveconfig', {
            detail: { ...this.terms }
        }));
    }
}