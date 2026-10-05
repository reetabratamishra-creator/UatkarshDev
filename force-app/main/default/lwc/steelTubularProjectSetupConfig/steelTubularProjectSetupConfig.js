import { LightningElement, track, api } from 'lwc';

export default class SteelTubularProjectSetupConfig extends LightningElement {
    @api savedData = {};
    @api folderApiName = '';

    get isCustomerAddress() { return this.folderApiName === 'customer_address_folder'; }
    get isTermsCondition() { return this.folderApiName === 'terms_and_conditions_folder'; }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }
    @track tc_payment_terms_pct = 30;
    @track tc_validity_days = 7;
    @track tc_consignment_start = 30;
    @track tc_consignment_end = 40;
    @track tc_gst = 'inclusive';
    @track tc_price_variation;
    @track tc_payment_terms_picklist;
    @track tc_lc_buyer_interest_days;
    @track tc_lc_seller_interest_days;
    @track tc_lc_interest_days;
    @track tc_vfs_seller_interest;
    @track tc_vfs_interest_days;
    @track tc_open_credit_days;

    // Getters for visibility and options
    get tc_gst_options() { return [{label: 'inclusive', value: 'inclusive'}, {label: 'exclusive', value: 'exclusive'}]; }
    get tc_payment_terms_picklist_options() { return [{label: 'Before Dispatch', value: 'Before Dispatch'}, {label: 'Against LC Before Dispatch', value: 'Against LC Before Dispatch'}, {label: 'Against VFS', value: 'Against VFS'}, {label: 'Against PDC', value: 'Against PDC'}, {label: 'Against Open Credit', value: 'Against Open Credit'}]; }

    get is_tc_lc_buyer_interest_days_visible() {
        const vals = [this.tc_payment_terms_picklist];
        return vals.some(val => ['Against LC Before Dispatch'].includes(val) || (['', null, 'null'].includes(val) && ['Against LC Before Dispatch'].some(v=>!v || v==='null')));
    }

    get is_tc_lc_seller_interest_days_visible() {
        const vals = [this.tc_payment_terms_picklist];
        return vals.some(val => ['Against LC Before Dispatch'].includes(val) || (['', null, 'null'].includes(val) && ['Against LC Before Dispatch'].some(v=>!v || v==='null')));
    }

    get is_tc_lc_interest_days_visible() {
        const vals = [this.tc_payment_terms_picklist];
        return vals.some(val => ['Against LC Before Dispatch'].includes(val) || (['', null, 'null'].includes(val) && ['Against LC Before Dispatch'].some(v=>!v || v==='null')));
    }

    get is_tc_vfs_seller_interest_visible() {
        const vals = [this.tc_payment_terms_picklist];
        return vals.some(val => ['Against VFS'].includes(val) || (['', null, 'null'].includes(val) && ['Against VFS'].some(v=>!v || v==='null')));
    }

    get is_tc_vfs_interest_days_visible() {
        const vals = [this.tc_payment_terms_picklist];
        return vals.some(val => ['Against VFS'].includes(val) || (['', null, 'null'].includes(val) && ['Against VFS'].some(v=>!v || v==='null')));
    }

    get is_tc_open_credit_days_visible() {
        const vals = [this.tc_payment_terms_picklist];
        return vals.some(val => ['Against Open Credit'].includes(val) || (['', null, 'null'].includes(val) && ['Against Open Credit'].some(v=>!v || v==='null')));
    }

    connectedCallback() {
        if (this.savedData) {
            for (let key in this.savedData) {
                if (this[key] !== undefined) {
                    this[key] = this.savedData[key];
                }
            }
        }
    }

    handleFieldChange(event) {
        const field = event.target.dataset.field;
        let val = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        if (event.target.type === 'number' && val) val = parseFloat(val);
        this[field] = val;
        this.calculateFormulas();
    }

    calculateFormulas() {
        let tc_payment_terms_pct = this.tc_payment_terms_pct || 0;
        let tc_validity_days = this.tc_validity_days || 0;
        let tc_consignment_start = this.tc_consignment_start || 0;
        let tc_consignment_end = this.tc_consignment_end || 0;
        let tc_gst = this.tc_gst || 0;
        let tc_price_variation = this.tc_price_variation || 0;
        let tc_payment_terms_picklist = this.tc_payment_terms_picklist || 0;
        let tc_lc_buyer_interest_days = this.tc_lc_buyer_interest_days || 0;
        let tc_lc_seller_interest_days = this.tc_lc_seller_interest_days || 0;
        let tc_lc_interest_days = this.tc_lc_interest_days || 0;
        let tc_vfs_seller_interest = this.tc_vfs_seller_interest || 0;
        let tc_vfs_interest_days = this.tc_vfs_interest_days || 0;
        let tc_open_credit_days = this.tc_open_credit_days || 0;
    }
    
    handleSave() {
        let payload = {};
        for(let key of Object.keys(this)) {
            if(key.startsWith('is_')) continue;
            payload[key] = this[key];
        }
        
        let lines = [];
        this.dispatchEvent(new CustomEvent('save', { detail: { folderApiName: this.folderApiName, Lines: lines, payload: payload } }));
    }
}