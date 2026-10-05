import { LightningElement, track, api } from 'lwc';

export default class TelecomProjectSetupConfig extends LightningElement {
    @api savedData = {};
    @api folderApiName = '';

    get isForDetails1() { return this.folderApiName === 'tele_for_details1'; }
    get isForDetails2() { return this.folderApiName === 'tele_for_details_2'; }
    get isTermsCondition() { return this.folderApiName === 'tele_terms_condition'; }
    get isCustomerAddress() { return this.folderApiName === 'tele_customer_address'; }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }
    @track rpt_location_1;
    @track rpt_rate_per_ton_1;
    @track rpt_location_2;
    @track rpt_rate_per_ton_2;
    @track rpt_location_3;
    @track rpt_rate_per_ton_3;
    @track rpt_location_4;
    @track rpt_rate_per_ton_4;
    @track rpt_location_5;
    @track rpt_rate_per_ton_5;
    @track rpt_location_6;
    @track rpt_rate_per_ton_6;
    @track rpt_location_7;
    @track rpt_rate_per_ton_7;
    @track rpt_location_8;
    @track rpt_rate_per_ton_8;
    @track rpt_location_9;
    @track rpt_rate_per_ton_9;
    @track rpt_location_10;
    @track rpt_rate_per_ton_10;
    @track mgl_location_1;
    @track mgl_description_of_the_tower_1;
    @track mgl_vehicle_loadability_1;
    @track mgl_minimum_guranteed_freight_1;
    @track mgl_location_2;
    @track mgl_description_of_the_tower_2;
    @track mgl_vehicle_loadability_2;
    @track mgl_minimum_guranteed_freight_2;
    @track mgl_location_3;
    @track mgl_description_of_the_tower_3;
    @track mgl_vehicle_loadability_3;
    @track mgl_minimum_guranteed_freight_3;
    @track mgl_location_4;
    @track mgl_description_of_the_tower_4;
    @track mgl_vehicle_loadability_4;
    @track mgl_minimum_guranteed_freight_4;
    @track mgl_location_5;
    @track mgl_description_of_the_tower_5;
    @track mgl_vehicle_loadability_5;
    @track mgl_minimum_guranteed_freight_5;
    @track mgl_location_6;
    @track mgl_description_of_the_tower_6;
    @track mgl_vehicle_loadability_6;
    @track mgl_minimum_guranteed_freight_6;
    @track mgl_location_7;
    @track mgl_description_of_the_tower_7;
    @track mgl_vehicle_loadability_7;
    @track mgl_minimum_guranteed_freight_7;
    @track mgl_location_8;
    @track mgl_description_of_the_tower_8;
    @track mgl_vehicle_loadability_8;
    @track mgl_minimum_guranteed_freight_8;
    @track mgl_location_9;
    @track mgl_description_of_the_tower_9;
    @track mgl_vehicle_loadability_9;
    @track mgl_minimum_guranteed_freight_9;
    @track mgl_location_10;
    @track mgl_description_of_the_tower_10;
    @track mgl_vehicle_loadability_10;
    @track mgl_minimum_guranteed_freight_10;
    @track terms_payment_terms_vlue = '10% advance & 90% payment via RTGS OR LC (LC Usance in buyer account) (LOT WISE) Before Dispatch';
    @track terms_offer_validity_value = 30;
    @track terms_special_terms_checkbox;
    @track terms_heading1;
    @track terms_content1;
    @track terms_heading2;
    @track terms_content2;
    @track terms_heading3;
    @track terms_content3;
    @track rpt_unitcost1;
    @track rpt_unitcost2;
    @track rpt_unitcost3;
    @track rpt_unitcost4;
    @track rpt_unitcost5;
    @track rpt_unitcost6;
    @track rpt_unitcost7;
    @track rpt_unitcost8;
    @track rpt_unitcost9;
    @track rpt_unitcost10;
    @track mgl_unitcost1;
    @track mgl_unitcost2;
    @track mgl_unitcost3;
    @track mgl_unitcost4;
    @track mgl_unitcost5;
    @track mgl_unitcost6;
    @track mgl_unitcost7;
    @track mgl_unitcost8;
    @track mgl_unitcost9;
    @track mgl_unitcost10;

    // Getters for visibility and options

    get is_rpt_lineitems1_visible() {
        const vals = [this.rpt_location_1];
        return vals.some(val => ['*'].includes(val));
    }

    get is_rpt_lineitems2_visible() {
        const vals = [this.rpt_location_2];
        return vals.some(val => ['*'].includes(val));
    }

    get is_rpt_lineitems3_visible() {
        const vals = [this.rpt_location_3];
        return vals.some(val => ['*'].includes(val));
    }

    get is_rpt_lineitems4_visible() {
        const vals = [this.rpt_location_4];
        return vals.some(val => ['*'].includes(val));
    }

    get is_rpt_lineitems5_visible() {
        const vals = [this.rpt_location_5];
        return vals.some(val => ['*'].includes(val));
    }

    get is_rpt_lineitems6_visible() {
        const vals = [this.rpt_location_6];
        return vals.some(val => ['*'].includes(val));
    }

    get is_rpt_lineitems7_visible() {
        const vals = [this.rpt_location_7];
        return vals.some(val => ['*'].includes(val));
    }

    get is_rpt_lineitems8_visible() {
        const vals = [this.rpt_location_8];
        return vals.some(val => ['*'].includes(val));
    }

    get is_rpt_lineitems9_visible() {
        const vals = [this.rpt_location_9];
        return vals.some(val => ['*'].includes(val));
    }

    get is_rpt_lineitems10_visible() {
        const vals = [this.rpt_location_10];
        return vals.some(val => ['*'].includes(val));
    }

    get is_mgl_lineitems1_visible() {
        const vals = [this.mgl_location_1];
        return vals.some(val => ['*'].includes(val));
    }

    get is_mgl_lineitems2_visible() {
        const vals = [this.mgl_location_2];
        return vals.some(val => ['*'].includes(val));
    }

    get is_mgl_lineitems3_visible() {
        const vals = [this.mgl_location_3];
        return vals.some(val => ['*'].includes(val));
    }

    get is_mgl_lineitems4_visible() {
        const vals = [this.mgl_location_4];
        return vals.some(val => ['*'].includes(val));
    }

    get is_mgl_lineitems5_visible() {
        const vals = [this.mgl_location_5];
        return vals.some(val => ['*'].includes(val));
    }

    get is_mgl_lineitems6_visible() {
        const vals = [this.mgl_location_6];
        return vals.some(val => ['*'].includes(val));
    }

    get is_mgl_lineitems7_visible() {
        const vals = [this.mgl_location_7];
        return vals.some(val => ['*'].includes(val));
    }

    get is_mgl_lineitems8_visible() {
        const vals = [this.mgl_location_8];
        return vals.some(val => ['*'].includes(val));
    }

    get is_mgl_lineitems9_visible() {
        const vals = [this.mgl_location_9];
        return vals.some(val => ['*'].includes(val));
    }

    get is_mgl_lineitems10_visible() {
        const vals = [this.mgl_location_10];
        return vals.some(val => ['*'].includes(val));
    }

    get is_terms_heading1_visible() {
        const vals = [this.terms_special_terms_checkbox];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_terms_content1_visible() {
        const vals = [this.terms_special_terms_checkbox];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_terms_heading2_visible() {
        const vals = [this.terms_special_terms_checkbox];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_terms_content2_visible() {
        const vals = [this.terms_special_terms_checkbox];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_terms_heading3_visible() {
        const vals = [this.terms_special_terms_checkbox];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_terms_content3_visible() {
        const vals = [this.terms_special_terms_checkbox];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    handleFieldChange(event) {
        const field = event.target.dataset.field;
        let val = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        if (event.target.type === 'number' && val) val = parseFloat(val);
        this[field] = val;
        this.calculateFormulas();
    }

    calculateFormulas() {
        // Evaluate all formulas
        let rpt_location_1 = this.rpt_location_1 || 0;
        let rpt_rate_per_ton_1 = this.rpt_rate_per_ton_1 || 0;
        let rpt_location_2 = this.rpt_location_2 || 0;
        let rpt_rate_per_ton_2 = this.rpt_rate_per_ton_2 || 0;
        let rpt_location_3 = this.rpt_location_3 || 0;
        let rpt_rate_per_ton_3 = this.rpt_rate_per_ton_3 || 0;
        let rpt_location_4 = this.rpt_location_4 || 0;
        let rpt_rate_per_ton_4 = this.rpt_rate_per_ton_4 || 0;
        let rpt_location_5 = this.rpt_location_5 || 0;
        let rpt_rate_per_ton_5 = this.rpt_rate_per_ton_5 || 0;
        let rpt_location_6 = this.rpt_location_6 || 0;
        let rpt_rate_per_ton_6 = this.rpt_rate_per_ton_6 || 0;
        let rpt_location_7 = this.rpt_location_7 || 0;
        let rpt_rate_per_ton_7 = this.rpt_rate_per_ton_7 || 0;
        let rpt_location_8 = this.rpt_location_8 || 0;
        let rpt_rate_per_ton_8 = this.rpt_rate_per_ton_8 || 0;
        let rpt_location_9 = this.rpt_location_9 || 0;
        let rpt_rate_per_ton_9 = this.rpt_rate_per_ton_9 || 0;
        let rpt_location_10 = this.rpt_location_10 || 0;
        let rpt_rate_per_ton_10 = this.rpt_rate_per_ton_10 || 0;
        let mgl_location_1 = this.mgl_location_1 || 0;
        let mgl_description_of_the_tower_1 = this.mgl_description_of_the_tower_1 || 0;
        let mgl_vehicle_loadability_1 = this.mgl_vehicle_loadability_1 || 0;
        let mgl_minimum_guranteed_freight_1 = this.mgl_minimum_guranteed_freight_1 || 0;
        let mgl_location_2 = this.mgl_location_2 || 0;
        let mgl_description_of_the_tower_2 = this.mgl_description_of_the_tower_2 || 0;
        let mgl_vehicle_loadability_2 = this.mgl_vehicle_loadability_2 || 0;
        let mgl_minimum_guranteed_freight_2 = this.mgl_minimum_guranteed_freight_2 || 0;
        let mgl_location_3 = this.mgl_location_3 || 0;
        let mgl_description_of_the_tower_3 = this.mgl_description_of_the_tower_3 || 0;
        let mgl_vehicle_loadability_3 = this.mgl_vehicle_loadability_3 || 0;
        let mgl_minimum_guranteed_freight_3 = this.mgl_minimum_guranteed_freight_3 || 0;
        let mgl_location_4 = this.mgl_location_4 || 0;
        let mgl_description_of_the_tower_4 = this.mgl_description_of_the_tower_4 || 0;
        let mgl_vehicle_loadability_4 = this.mgl_vehicle_loadability_4 || 0;
        let mgl_minimum_guranteed_freight_4 = this.mgl_minimum_guranteed_freight_4 || 0;
        let mgl_location_5 = this.mgl_location_5 || 0;
        let mgl_description_of_the_tower_5 = this.mgl_description_of_the_tower_5 || 0;
        let mgl_vehicle_loadability_5 = this.mgl_vehicle_loadability_5 || 0;
        let mgl_minimum_guranteed_freight_5 = this.mgl_minimum_guranteed_freight_5 || 0;
        let mgl_location_6 = this.mgl_location_6 || 0;
        let mgl_description_of_the_tower_6 = this.mgl_description_of_the_tower_6 || 0;
        let mgl_vehicle_loadability_6 = this.mgl_vehicle_loadability_6 || 0;
        let mgl_minimum_guranteed_freight_6 = this.mgl_minimum_guranteed_freight_6 || 0;
        let mgl_location_7 = this.mgl_location_7 || 0;
        let mgl_description_of_the_tower_7 = this.mgl_description_of_the_tower_7 || 0;
        let mgl_vehicle_loadability_7 = this.mgl_vehicle_loadability_7 || 0;
        let mgl_minimum_guranteed_freight_7 = this.mgl_minimum_guranteed_freight_7 || 0;
        let mgl_location_8 = this.mgl_location_8 || 0;
        let mgl_description_of_the_tower_8 = this.mgl_description_of_the_tower_8 || 0;
        let mgl_vehicle_loadability_8 = this.mgl_vehicle_loadability_8 || 0;
        let mgl_minimum_guranteed_freight_8 = this.mgl_minimum_guranteed_freight_8 || 0;
        let mgl_location_9 = this.mgl_location_9 || 0;
        let mgl_description_of_the_tower_9 = this.mgl_description_of_the_tower_9 || 0;
        let mgl_vehicle_loadability_9 = this.mgl_vehicle_loadability_9 || 0;
        let mgl_minimum_guranteed_freight_9 = this.mgl_minimum_guranteed_freight_9 || 0;
        let mgl_location_10 = this.mgl_location_10 || 0;
        let mgl_description_of_the_tower_10 = this.mgl_description_of_the_tower_10 || 0;
        let mgl_vehicle_loadability_10 = this.mgl_vehicle_loadability_10 || 0;
        let mgl_minimum_guranteed_freight_10 = this.mgl_minimum_guranteed_freight_10 || 0;
        let terms_payment_terms_vlue = this.terms_payment_terms_vlue || 0;
        let terms_offer_validity_value = this.terms_offer_validity_value || 0;
        let terms_special_terms_checkbox = this.terms_special_terms_checkbox || 0;
        let terms_heading1 = this.terms_heading1 || 0;
        let terms_content1 = this.terms_content1 || 0;
        let terms_heading2 = this.terms_heading2 || 0;
        let terms_content2 = this.terms_content2 || 0;
        let terms_heading3 = this.terms_heading3 || 0;
        let terms_content3 = this.terms_content3 || 0;
        let rpt_unitcost1 = this.rpt_unitcost1 || 0;
        let rpt_unitcost2 = this.rpt_unitcost2 || 0;
        let rpt_unitcost3 = this.rpt_unitcost3 || 0;
        let rpt_unitcost4 = this.rpt_unitcost4 || 0;
        let rpt_unitcost5 = this.rpt_unitcost5 || 0;
        let rpt_unitcost6 = this.rpt_unitcost6 || 0;
        let rpt_unitcost7 = this.rpt_unitcost7 || 0;
        let rpt_unitcost8 = this.rpt_unitcost8 || 0;
        let rpt_unitcost9 = this.rpt_unitcost9 || 0;
        let rpt_unitcost10 = this.rpt_unitcost10 || 0;
        let mgl_unitcost1 = this.mgl_unitcost1 || 0;
        let mgl_unitcost2 = this.mgl_unitcost2 || 0;
        let mgl_unitcost3 = this.mgl_unitcost3 || 0;
        let mgl_unitcost4 = this.mgl_unitcost4 || 0;
        let mgl_unitcost5 = this.mgl_unitcost5 || 0;
        let mgl_unitcost6 = this.mgl_unitcost6 || 0;
        let mgl_unitcost7 = this.mgl_unitcost7 || 0;
        let mgl_unitcost8 = this.mgl_unitcost8 || 0;
        let mgl_unitcost9 = this.mgl_unitcost9 || 0;
        let mgl_unitcost10 = this.mgl_unitcost10 || 0;
        try { rpt_unitcost1 = Number(rpt_rate_per_ton_1 || 0); this.rpt_unitcost1 = rpt_unitcost1; } catch(e) { console.error(e); this.rpt_unitcost1 = 0; }
        try { rpt_unitcost2 = Number(rpt_rate_per_ton_2 || 0); this.rpt_unitcost2 = rpt_unitcost2; } catch(e) { console.error(e); this.rpt_unitcost2 = 0; }
        try { rpt_unitcost3 = Number(rpt_rate_per_ton_3 || 0); this.rpt_unitcost3 = rpt_unitcost3; } catch(e) { console.error(e); this.rpt_unitcost3 = 0; }
        try { rpt_unitcost4 = Number(rpt_rate_per_ton_4 || 0); this.rpt_unitcost4 = rpt_unitcost4; } catch(e) { console.error(e); this.rpt_unitcost4 = 0; }
        try { rpt_unitcost5 = Number(rpt_rate_per_ton_5 || 0); this.rpt_unitcost5 = rpt_unitcost5; } catch(e) { console.error(e); this.rpt_unitcost5 = 0; }
        try { rpt_unitcost6 = Number(rpt_rate_per_ton_6 || 0); this.rpt_unitcost6 = rpt_unitcost6; } catch(e) { console.error(e); this.rpt_unitcost6 = 0; }
        try { rpt_unitcost7 = Number(rpt_rate_per_ton_1 || 0); this.rpt_unitcost7 = rpt_unitcost7; } catch(e) { console.error(e); this.rpt_unitcost7 = 0; }
        try { rpt_unitcost8 = Number(rpt_rate_per_ton_8 || 0); this.rpt_unitcost8 = rpt_unitcost8; } catch(e) { console.error(e); this.rpt_unitcost8 = 0; }
        try { rpt_unitcost9 = Number(rpt_rate_per_ton_1 || 0); this.rpt_unitcost9 = rpt_unitcost9; } catch(e) { console.error(e); this.rpt_unitcost9 = 0; }
        try { rpt_unitcost10 = Number(rpt_rate_per_ton_10 || 0); this.rpt_unitcost10 = rpt_unitcost10; } catch(e) { console.error(e); this.rpt_unitcost10 = 0; }
        try { mgl_unitcost1 = Number(mgl_minimum_guranteed_freight_1 || 0); this.mgl_unitcost1 = mgl_unitcost1; } catch(e) { console.error(e); this.mgl_unitcost1 = 0; }
        try { mgl_unitcost2 = Number(mgl_minimum_guranteed_freight_2 || 0); this.mgl_unitcost2 = mgl_unitcost2; } catch(e) { console.error(e); this.mgl_unitcost2 = 0; }
        try { mgl_unitcost3 = Number(mgl_minimum_guranteed_freight_3 || 0); this.mgl_unitcost3 = mgl_unitcost3; } catch(e) { console.error(e); this.mgl_unitcost3 = 0; }
        try { mgl_unitcost4 = Number(mgl_minimum_guranteed_freight_4 || 0); this.mgl_unitcost4 = mgl_unitcost4; } catch(e) { console.error(e); this.mgl_unitcost4 = 0; }
        try { mgl_unitcost5 = Number(mgl_minimum_guranteed_freight_5 || 0); this.mgl_unitcost5 = mgl_unitcost5; } catch(e) { console.error(e); this.mgl_unitcost5 = 0; }
        try { mgl_unitcost6 = Number(mgl_minimum_guranteed_freight_6 || 0); this.mgl_unitcost6 = mgl_unitcost6; } catch(e) { console.error(e); this.mgl_unitcost6 = 0; }
        try { mgl_unitcost7 = Number(mgl_minimum_guranteed_freight_7 || 0); this.mgl_unitcost7 = mgl_unitcost7; } catch(e) { console.error(e); this.mgl_unitcost7 = 0; }
        try { mgl_unitcost8 = Number(mgl_minimum_guranteed_freight_8 || 0); this.mgl_unitcost8 = mgl_unitcost8; } catch(e) { console.error(e); this.mgl_unitcost8 = 0; }
        try { mgl_unitcost9 = Number(mgl_minimum_guranteed_freight_9 || 0); this.mgl_unitcost9 = mgl_unitcost9; } catch(e) { console.error(e); this.mgl_unitcost9 = 0; }
        try { mgl_unitcost10 = Number(mgl_minimum_guranteed_freight_10 || 0); this.mgl_unitcost10 = mgl_unitcost10; } catch(e) { console.error(e); this.mgl_unitcost10 = 0; }
    }
    
    handleSave() {
        let payload = {};
        for(let key of Object.keys(this)) {
            if(key.startsWith('is_')) continue;
            payload[key] = this[key];
        }
        
        let lines = [];
        
        if (this.isForDetails1) {
            for(let i=1; i<=10; i++) {
                let loc = this['rpt_location_'+i];
                let qty = this['rpt_unit_quantity'+i] || 1;
                let cost = this['rpt_unitcost'+i] || 0;
                if(loc) {
                    lines.push({
                        Category__c: 'Per Metric Ton Rate',
                        Material__c: loc,
                        Quantity__c: qty,
                        Base_Rate__c: cost,
                        Net_Rate__c: cost,
                        Total_Amount__c: qty * cost
                    });
                }
            }
        } else if (this.isForDetails2) {
            for(let i=1; i<=10; i++) {
                let loc = this['mgl_location_'+i];
                let qty = this['mgl_unit_quantity'+i] || 1;
                let cost = this['mgl_unitcost'+i] || 0;
                if(loc) {
                    lines.push({
                        Category__c: 'Minimum Guaranteed Loadability',
                        Material__c: loc,
                        Quantity__c: qty,
                        Base_Rate__c: cost,
                        Net_Rate__c: cost,
                        Total_Amount__c: qty * cost
                    });
                }
            }
        }
        
        this.dispatchEvent(new CustomEvent('save', { detail: { folderApiName: this.folderApiName, Lines: lines, payload: payload } }));
    }
}