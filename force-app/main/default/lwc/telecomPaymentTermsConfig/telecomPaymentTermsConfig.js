import { LightningElement, api, track } from 'lwc';

export default class TelecomPaymentTermsConfig extends LightningElement {
    @api savedData = {};

    @track selectPaymentTerms = '';
    @track usanceInterestBuyer = '';
    @track usanceInterestSeller = 1;

    get paymentTermsOptions() {
        return [
            { label: 'Advance', value: 'Advance' },
            { label: 'Against Delivery', value: 'Against Delivery' },
            { label: 'Against LC', value: 'Against LC' }
        ];
    }

    get isAgainstLc() { return this.selectPaymentTerms === 'Against LC'; }

    connectedCallback() {
        if (this.savedData && this.savedData._telecomPaymentTerms) {
            this.selectPaymentTerms = this.savedData._telecomPaymentTerms.select_payment_terms;
            this.usanceInterestBuyer = this.savedData._telecomPaymentTerms.usance_interest_buyer;
            this.usanceInterestSeller = this.savedData._telecomPaymentTerms.usance_interest_seller;
        } else if (this.savedData) {
            this.selectPaymentTerms = this.savedData.select_payment_terms || '';
            this.usanceInterestBuyer = this.savedData.usance_interest_buyer || '';
            this.usanceInterestSeller = this.savedData.usance_interest_seller || 1;
        }
    }

    handleChange(e) {
        const field = e.currentTarget.name;
        if (field === 'selectPaymentTerms') this.selectPaymentTerms = e.target.value;
        if (field === 'usanceInterestBuyer') this.usanceInterestBuyer = e.target.value;
        if (field === 'usanceInterestSeller') this.usanceInterestSeller = e.target.value;
    }

    handleSave() {
        this.dispatchEvent(new CustomEvent('saveconfig', {
            detail: {
                select_payment_terms: this.selectPaymentTerms,
                usance_interest_buyer: this.usanceInterestBuyer,
                usance_interest_seller: this.usanceInterestSeller
            }
        }));
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }
}