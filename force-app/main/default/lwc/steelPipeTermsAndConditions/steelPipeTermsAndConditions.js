import { LightningElement, api, track } from 'lwc';

export default class SteelPipeTermsAndConditions extends LightningElement {
    @api savedTerms = {};

    @track termsData = {
        tc_offer_validity: "2 days from the date of offer and further revalidation is subjected to our prior written confirmation.",
        tc_delivery_schedule: "READY STOCK",
        tc_price_variation: "Yes",
        tc_payment_terms: "30% advance against P.O. & remaining on the readiness of materials, prior to dispatch.",
        tc_transportation: "INCLUDED",
        tc_vehicle_load: "(+/-) 0.5% weight tolerance may be there in total vehicle load.",
        tc_tolerance: "All dimensional tolerance like OD & Wall Thickness (+/-) shall be as per applicable IS specification.",
        tc_inspection: "Inspection Charges & Expenses: Extra.",
        tc_pre_dispatch_inspection: "Pre Dispatch Inspection at our plant",
        Note: "1.The delivery schedule offered or committed is merely an indicative time of delivery which is not firm and the same may vary or change depending upon various factors. Therefore the company does not assume any liability in the form of late delivery charges or penalty for having failed to maintain the time schedule."
    };

    yesNoOptions = [
        { label: 'Yes', value: 'Yes' },
        { label: 'No', value: 'No' }
    ];

    transportationOptions = [
        { label: 'INCLUDED', value: 'INCLUDED' },
        { label: 'EXCLUDED', value: 'EXCLUDED' }
    ];

    connectedCallback() {
        if (this.savedTerms && Object.keys(this.savedTerms).length > 0) {
            this.termsData = { ...this.termsData, ...this.savedTerms };
        }
    }

    handleFieldChange(event) {
        const fieldName = event.target.name;
        this.termsData[fieldName] = event.target.value;
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }

    handleApply() {
        this.dispatchEvent(new CustomEvent('saveconfig', {
            detail: this.termsData
        }));
        this.dispatchEvent(new CustomEvent('closemodal'));
    }
}