import { LightningElement, track, api } from 'lwc';

export default class TransmissionTowerConfig extends LightningElement {
    @api savedData = {};
    @api estimatorType;
    @track selectedType = 'Tower';

    get hasEstimatorType() {
        return !!this.estimatorType;
    }
    
    get modalTitle() {
        return this.selectedType === 'Substation' ? 'Substation Estimator' : 
                (this.selectedType === 'Nuts & Bolts' ? 'Nuts & Bolts Estimator' : 
                (this.selectedType === 'Price Variation Calculation' ? 'Price Variation Calculation' : 'Transmission Tower Estimator'));
    }

    get typeOptions() {
        return [
            { label: 'Tower', value: 'Tower' },
            { label: 'Substation', value: 'Substation' },
            { label: 'Nuts & Bolts', value: 'Nuts & Bolts' },
            { label: 'Price Variation Calculation', value: 'Price Variation Calculation' }
        ];
    }
    
    get isTower() { return this.selectedType === 'Tower'; }
    get isSubstation() { return this.selectedType === 'Substation'; }
    get isNutsAndBolts() { return this.selectedType === 'Nuts & Bolts'; }
    get isPriceVariation() { return this.selectedType === 'Price Variation Calculation'; }

    handleTypeChange(event) {
        this.selectedType = event.detail.value;
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }
    @track pvt_price_basics;
    @track pvt_price_module;
    @track pvt_price_variable_month;
    @track pvt_price_variable_year;
    @track pvt_ms_quantity_pv;
    @track pvt_ht_quantity_pv;
    @track pvt_ms_quantity_firm;
    @track pvt_ht_quantity_firm;
    @track pvt_pv_zinc_consumption_space;
    @track pvt_pv_610_gsm_label;
    @track pvt_pv_610_gsm;
    @track pvt_pv_900_gsm_label;
    @track pvt_pv_900_gsm;
    @track pvt_pv_1000_gsm_label;
    @track pvt_pv_1000_gsm;
    @track pvt_pv_proto;
    @track pvt_pv_interest_component;
    @track pvt_pv_margin;
    @track pvt_pv_additional_pricing;
    @track pvt_firm_610_gsm_label;
    @track pvt_firm_610_gsm;
    @track pvt_firm_900_gsm_label;
    @track pvt_firm_900_gsm;
    @track pvt_firm_1000_gsm_label;
    @track pvt_firm_1000_gsm;
    @track pvt_firm_proto;
    @track pvt_firm_interest_component;
    @track pvt_firm_margin;
    @track pvt_firm_additional_pricing;
    @track pvs_price_model;
    @track pvs_price_module;
    @track pvs_price_variable_month;
    @track pvs_price_variable_year;
    @track pvs_gantry_structure;
    @track pvs_equipment_structure;
    @track pvs_composite_structure;
    @track pvs_gantry_structure_ms_quantity1;
    @track pvs_equipment_structure_ms_quantity2;
    @track pvs_composite_structure_ms_quantity3;
    @track pvs_gantry_structure_ht_quantity1;
    @track pvs_equipment_structure_ht_quantity2;
    @track pvs_composite_structure_ht_quantity3;
    @track sp_1;
    @track sp_2;
    @track sp_3;
    @track sp_4;
    @track pvs_pv_610_gsm_label;
    @track pvs_pv_610_gsm;
    @track pvs_pv_900_gsm_label;
    @track pvs_pv_900_gsm;
    @track pvs_pv_1000_gsm_label;
    @track pvs_pv_1000_gsm;
    @track pvs_pv_proto;
    @track pvs_pv_interest_component;
    @track pvs_pv_margin;
    @track pvs_pv_additional_pricing;
    @track pvs_firm_610_gsm_label;
    @track pvs_firm_610_gsm;
    @track pvs_firm_900_gsm_label;
    @track pvs_firm_900_gsm;
    @track pvs_firm_1000_gsm_label;
    @track pvs_firm_1000_gsm;
    @track pvs_firm_proto;
    @track pvs_firm_interest_component;
    @track pvs_firm_margin;
    @track pvs_firm_additional_pricing;
    @track pvs_type_of_grade;
    @track pvs_proto_assembly_testing;
    @track pvs_type_5_6;
    @track pvs_type_6_8;
    @track pvs_type_8_8;
    @track pvs_foundation_bolt_checkbox;
    @track pvs_ms_template_without_galvanization_checkbox;
    @track pvs_price_of_proto_assembly;
    @track pvs_type_5_6_margin;
    @track pvs_type_5_6_quantity;
    @track pvs_type_6_8_margin;
    @track pvs_type_6_8_quantity;
    @track pvs_type_8_8_margin;
    @track pvs_type_8_8_quantity;
    @track pvs_detail_foundation_bolt_margin;
    @track pvs_detail_foundation_bolt_quantity;
    @track pvs_detail_ms_template_margin_pv;
    @track pvs_detail_ms_template_quantity_pv;
    @track pvs_detail_ms_template_margin_firm;
    @track pvs_detail_ms_template_quantity_firm;
    @track pv_formula;
    @track pv_base_month;
    @track pv_base_year;
    @track pvt_pv_avg_of_blooms;
    @track pvt_pv_rm_cost;
    @track pvt_pv_zinc_value;
    @track pvt_pv_zinc_value_610;
    @track pvt_pv_zinc_value_900;
    @track pvt_pv_zinc_value_1000;
    @track pvt_pv_proto_required;
    @track pvt_pv_scrap_value;
    @track pvt_pv_prevailing_rate_of_bank_interest;
    @track pvt_pv_market_price;
    @track pvt_pv_no_of_days;
    @track pvt_firm_zinc_value;
    @track pvt_firm_zinc_value_610;
    @track pvt_firm_zinc_value_900;
    @track pvt_firm_zinc_value_1000;
    @track pvt_firm_scrap_value;
    @track pvt_firm_proto_required;
    @track pvt_firm_prevailing_rate_of_bank_interest;
    @track pvt_firm_market_price;
    @track pvt_firm_no_of_days;
    @track pvt_pv_ms610_gsm_unit_price;
    @track pvt_pv_ms610_gsm_unit_cost;
    @track pvt_pv_ms610_gsm_quantity;
    @track pvt_pv_ht610_gsm_unit_price;
    @track pvt_pv_ht610_gsm_unit_cost;
    @track pvt_pv_ht610_gsm_quantity;
    @track pvt_pv_ms900_gsm_unit_price;
    @track pvt_pv_ms900_gsm_unit_cost;
    @track pvt_pv_ms900_gsm_quantity;
    @track pvt_pv_ht900_gsm_unit_price;
    @track pvt_pv_ht900_gsm_unit_cost;
    @track pvt_pv_ht900_gsm_quantity;
    @track pvt_pv_ms1000_gsm_unit_price;
    @track pvt_pv_ms1000_gsm_unit_cost;
    @track pvt_pv_ms1000_gsm_quantity;
    @track pvt_pv_ht1000_gsm_unit_price;
    @track pvt_pv_ht1000_gsm_unit_cost;
    @track pvt_pv_ht1000_gsm_quantity;
    @track pvt_firm_ms610_gsm_unit_price;
    @track pvt_firm_ms610_gsm_unit_cost;
    @track pvt_firm_ms610_gsm_quantity;
    @track pvt_firm_ht610_gsm_unit_price;
    @track pvt_firm_ht610_gsm_unit_cost;
    @track pvt_firm_ht610_gsm_quantity;
    @track pvt_firm_ms900_gsm_unit_price;
    @track pvt_firm_ms900_gsm_unit_cost;
    @track pvt_firm_ms900_gsm_quantity;
    @track pvt_firm_ht900_gsm_unit_price;
    @track pvt_firm_ht900_gsm_unit_cost;
    @track pvt_firm_ht900_gsm_quantity;
    @track pvt_firm_ms1000_gsm_unit_price;
    @track pvt_firm_ms1000_gsm_unit_cost;
    @track pvt_firm_ms1000_gsm_quantity;
    @track pvt_firm_ht1000_gsm_unit_price;
    @track pvt_firm_ht1000_gsm_unit_cost;
    @track pvt_firm_ht1000_gsm_quantity;
    @track pvt_N5_N12;
    @track pvt_O5_O12;
    @track pvt_P5_P12;
    @track pvt_T6_T13;
    @track pvt_U6_U13;
    @track pvt_V6_V13;
    @track pvt_AW22;
    @track pvt_AO31;
    @track pvt_C19;
    @track pvt_G61;
    @track pvt_G60;
    @track pvt_pv_bank_interest;
    @track pvt_firm_bank_interest;
    @track pvs_pv_avg_of_blooms;
    @track pvs_pv_rm_cost;
    @track pvs_pv_cost_of_production;
    @track pvs_pv_zinc_value;
    @track pvs_pv_zinc_value_610;
    @track pvs_pv_zinc_value_900;
    @track pvs_pv_zinc_value_1000;
    @track pvs_pv_cost_of_production_gantry;
    @track pvs_pv_cost_of_production_equipment;
    @track pvs_pv_cost_of_production_composite;
    @track pvs_pv_proto_required;
    @track pvs_pv_scrap_value;
    @track pvs_pv_prevailing_rate_of_bank_interest;
    @track pvs_pv_market_price;
    @track pvs_pv_no_of_days;
    @track pvs_firm_zinc_value;
    @track pvs_firm_zinc_value_610;
    @track pvs_firm_zinc_value_900;
    @track pvs_firm_zinc_value_1000;
    @track pvs_firm_cost_of_production;
    @track pvs_firm_cost_of_production_gantry;
    @track pvs_firm_cost_of_production_equipment;
    @track pvs_firm_cost_of_production_composite;
    @track pvs_firm_scrap_value;
    @track pvs_firm_proto_required;
    @track pvs_firm_prevailing_rate_of_bank_interest;
    @track pvs_firm_market_price;
    @track pvs_firm_no_of_days;
    @track pvs_pv_gantry_ms610_unit_price;
    @track pvs_pv_gantry_ms610_unit_cost;
    @track pvs_pv_gantry_ms610_gsm_quantity;
    @track pvs_pv_gantry_ht610_unit_price;
    @track pvs_pv_gantry_ht610_unit_cost;
    @track pvs_pv_gantry_ht610_quantity;
    @track pvs_pv_gantry_ms900_unit_price;
    @track pvs_pv_gantry_ms900_unit_cost;
    @track pvs_pv_gantry_ms900_gsm_quantity;
    @track pvs_pv_gantry_ht900_unit_price;
    @track pvs_pv_gantry_ht900_unit_cost;
    @track pvs_pv_gantry_ht900_quantity;
    @track pvs_pv_gantry_ms1000_unit_price;
    @track pvs_pv_gantry_ms1000_unit_cost;
    @track pvs_pv_gantry_ms1000_gsm_quantity;
    @track pvs_pv_gantry_ht1000_unit_price;
    @track pvs_pv_gantry_ht1000_unit_cost;
    @track pvs_pv_gantry_ht1000_quantity;
    @track pvs_pv_equipment_ms610_unit_price;
    @track pvs_pv_equipment_ms610_unit_cost;
    @track pvs_pv_equipment_ms610_gsm_quantity;
    @track pvs_pv_equipment_ht610_unit_price;
    @track pvs_pv_equipment_ht610_unit_cost;
    @track pvs_pv_equipment_ht610_quantity;
    @track pvs_pv_equipment_ms900_unit_price;
    @track pvs_pv_equipment_ms900_unit_cost;
    @track pvs_pv_equipment_ms900_gsm_quantity;
    @track pvs_pv_equipment_ht900_unit_price;
    @track pvs_pv_equipment_ht900_unit_cost;
    @track pvs_pv_equipment_ht900_quantity;
    @track pvs_pv_equipment_ms1000_unit_price;
    @track pvs_pv_equipment_ms1000_unit_cost;
    @track pvs_pv_equipment_ms1000_gsm_quantity;
    @track pvs_pv_equipment_ht1000_unit_price;
    @track pvs_pv_equipment_ht1000_unit_cost;
    @track pvs_pv_equipment_ht1000_quantity;
    @track pvs_pv_composite_ms610_unit_price;
    @track pvs_pv_composite_ms610_unit_cost;
    @track pvs_pv_composite_ms610_gsm_quantity;
    @track pvs_pv_composite_ht610_unit_price;
    @track pvs_pv_composite_ht610_unit_cost;
    @track pvs_pv_composite_ht610_quantity;
    @track pvs_pv_composite_ms900_unit_price;
    @track pvs_pv_composite_ms900_unit_cost;
    @track pvs_pv_composite_ms900_gsm_quantity;
    @track pvs_pv_composite_ht900_unit_price;
    @track pvs_pv_composite_ht900_unit_cost;
    @track pvs_pv_composite_ht900_quantity;
    @track pvs_pv_composite_ms1000_unit_price;
    @track pvs_pv_composite_ms1000_unit_cost;
    @track pvs_pv_composite_ms1000_gsm_quantity;
    @track pvs_pv_composite_ht1000_unit_price;
    @track pvs_pv_composite_ht1000_unit_cost;
    @track pvs_pv_composite_ht1000_quantity;
    @track pvs_firm_gantry_ms610_unit_price;
    @track pvs_firm_gantry_ms610_unit_cost;
    @track pvs_firm_gantry_ms610_gsm_quantity;
    @track pvs_firm_gantry_ht610_unit_price;
    @track pvs_firm_gantry_ht610_unit_cost;
    @track pvs_firm_gantry_ht610_quantity;
    @track pvs_firm_gantry_ms900_unit_price;
    @track pvs_firm_gantry_ms900_unit_cost;
    @track pvs_firm_gantry_ms900_gsm_quantity;
    @track pvs_firm_gantry_ht900_unit_price;
    @track pvs_firm_gantry_ht900_unit_cost;
    @track pvs_firm_gantry_ht900_quantity;
    @track pvs_firm_gantry_ms1000_unit_price;
    @track pvs_firm_gantry_ms1000_unit_cost;
    @track pvs_firm_gantry_ms1000_gsm_quantity;
    @track pvs_firm_gantry_ht1000_unit_price;
    @track pvs_firm_gantry_ht1000_unit_cost;
    @track pvs_firm_gantry_ht1000_quantity;
    @track pvs_firm_equipment_ms610_unit_price;
    @track pvs_firm_equipment_ms610_unit_cost;
    @track pvs_firm_equipment_ms610_gsm_quantity;
    @track pvs_firm_equipment_ht610_unit_price;
    @track pvs_firm_equipment_ht610_unit_cost;
    @track pvs_firm_equipment_ht610_quantity;
    @track pvs_FIRM_equipment_ms900_unit_price;
    @track pvs_FIRM_equipment_ms900_unit_cost;
    @track pvs_firm_equipment_ms900_gsm_quantity;
    @track pvs_firm_equipment_ht900_unit_price;
    @track pvs_firm_equipment_ht900_unit_cost;
    @track pvs_firm_equipment_ht900_quantity;
    @track pvs_firm_equipment_ms1000_unit_price;
    @track pvs_firm_equipment_ms1000_unit_cost;
    @track pvs_firm_equipment_ms1000_gsm_quantity;
    @track pvs_firm_equipment_ht1000_unit_price;
    @track pvs_firm_equipment_ht1000_unit_cost;
    @track pvs_firm_equipment_ht1000_quantity;
    @track pvs_firm_composite_ms610_unit_price;
    @track pvs_firm_composite_ms610_unit_cost;
    @track pvs_firm_composite_ms610_gsm_quantity;
    @track pvs_firm_composite_ht610_unit_price;
    @track pvs_firm_composite_ht610_unit_cost;
    @track pvs_firm_composite_ht610_quantity;
    @track pvs_firm_composite_ms900_unit_price;
    @track pvs_firm_composite_ms900_unit_cost;
    @track pvs_firm_composite_ms900_gsm_quantity;
    @track pvs_firm_composite_ht900_unit_price;
    @track pvs_firm_composite_ht900_unit_cost;
    @track pvs_firm_composite_ht900_quantity;
    @track pvs_firm_composite_ms1000_unit_price;
    @track pvs_firm_composite_ms1000_unit_cost;
    @track pvs_firm_composite_ms1000_gsm_quantity;
    @track pvs_firm_composite_ht1000_unit_price;
    @track pvs_firm_composite_ht1000_unit_cost;
    @track pvs_firm_composite_ht1000_quantity;
    @track AE27;
    @track AE70;
    @track AE113;
    @track AE41;
    @track AE84;
    @track AE127;
    @track AE55;
    @track AE98;
    @track AE141;
    @track AM27;
    @track AM70;
    @track AM113;
    @track AM41;
    @track AM84;
    @track AM127;
    @track AM55;
    @track AM98;
    @track AM141;
    @track pvs_BJ34;
    @track pvs_BT29;
    @track pvs_G61;
    @track pvs_G60;
    @track pvs_type_5_6_price_unit;
    @track pvs_type_5_6_price_cost;
    @track pvs_type_6_8_price_unit;
    @track pvs_type_6_8_price_cost;
    @track pvs_type_8_8_price_unit;
    @track pvs_type_8_8_price_cost;
    @track pvs_detail_foundation_bolt_price_unit;
    @track pvs_detail_foundation_bolt_price_cost;
    @track pvs_detail_ms_template_price_pv;
    @track pvs_detail_ms_template_price_pv_gantry;
    @track pvs_detail_ms_template_price_pv_equipment;
    @track pvs_detail_ms_template_price_pv_composite;
    @track pvs_detail_ms_template_price_firm;
    @track pvs_detail_ms_template_price_firm_gantry;
    @track pvs_detail_ms_template_price_firm_equipment;
    @track pvs_detail_ms_template_price_firm_composite;
    @track pvf_ms;
    @track pvf_ht;
    @track pvf_blooms;
    @track pvf_billets;
    @track pvf_zinc;
    @track pvf_consumer_price_index;

    // Getters for visibility and options
    get pvt_price_basics_options() { return [{label: 'Price Variation', value: 'Price Variation'}, {label: 'FIRM', value: 'FIRM'}]; }

    get is_pvt_price_module_visible() {
        const vals = [this.pvt_price_basics];
        return vals.some(val => ['Price Variation'].includes(val) || (['', null, 'null'].includes(val) && ['Price Variation'].some(v=>!v || v==='null')));
    }
    get pvt_price_module_options() { return [{label: 'IEEMA', value: 'IEEMA'}, {label: 'PGCIL', value: 'PGCIL'}]; }

    get is_pvt_price_variable_month_visible() {
        const vals = [this.pvt_price_basics];
        return vals.some(val => ['Price Variation'].includes(val) || (['', null, 'null'].includes(val) && ['Price Variation'].some(v=>!v || v==='null')));
    }
    get pvt_price_variable_month_options() { return [{label: 'January', value: 'January'}, {label: 'February', value: 'February'}, {label: 'March', value: 'March'}, {label: 'April', value: 'April'}, {label: 'May', value: 'May'}, {label: 'June', value: 'June'}, {label: 'July', value: 'July'}, {label: 'August', value: 'August'}, {label: 'September', value: 'September'}, {label: 'October', value: 'October'}, {label: 'November', value: 'November'}, {label: 'December', value: 'December'}]; }

    get is_pvt_price_variable_year_visible() {
        const vals = [this.pvt_price_basics];
        return vals.some(val => ['Price Variation'].includes(val) || (['', null, 'null'].includes(val) && ['Price Variation'].some(v=>!v || v==='null')));
    }
    get pvt_price_variable_year_options() { return [{label: '2016', value: '2016'}, {label: '2017', value: '2017'}, {label: '2018', value: '2018'}, {label: '2019', value: '2019'}, {label: '2020', value: '2020'}, {label: '2021', value: '2021'}, {label: '2022', value: '2022'}, {label: '2023', value: '2023'}, {label: '2024', value: '2024'}, {label: '2025', value: '2025'}]; }

    get is_pvt_ms_quantity_pv_visible() {
        const vals = [this.pvt_price_basics];
        return vals.some(val => ['Price Variation'].includes(val) || (['', null, 'null'].includes(val) && ['Price Variation'].some(v=>!v || v==='null')));
    }

    get is_pvt_ht_quantity_pv_visible() {
        const vals = [this.pvt_price_basics];
        return vals.some(val => ['Price Variation'].includes(val) || (['', null, 'null'].includes(val) && ['Price Variation'].some(v=>!v || v==='null')));
    }

    get is_pvt_ms_quantity_firm_visible() {
        const vals = [this.pvt_price_basics];
        return vals.some(val => ['FIRM'].includes(val) || (['', null, 'null'].includes(val) && ['FIRM'].some(v=>!v || v==='null')));
    }

    get is_pvt_ht_quantity_firm_visible() {
        const vals = [this.pvt_price_basics];
        return vals.some(val => ['FIRM'].includes(val) || (['', null, 'null'].includes(val) && ['FIRM'].some(v=>!v || v==='null')));
    }

    get is_pvt_pv_tower_visible() {
        const vals = [this.pvt_price_basics];
        return vals.some(val => ['Price Variation'].includes(val));
    }
get is_pvt_pv_zinc_value_610_visible() { return false; }
get is_pvt_pv_zinc_value_900_visible() { return false; }
get is_pvt_pv_zinc_value_1000_visible() { return false; }
    get pvt_pv_proto_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_pvt_pv_proto_required_visible() {
        const vals = [this.pvt_pv_proto];
        return vals.some(val => ['YES'].includes(val) || (['', null, 'null'].includes(val) && ['YES'].some(v=>!v || v==='null')));
    }
get is_pvt_pv_part_c_visible() { return false; }
get is_pvt_pv_interest_component_visible() { return false; }
get is_pvt_pv_prevailing_rate_of_bank_interest_visible() { return false; }
get is_pvt_pv_market_price_visible() { return false; }
get is_pvt_pv_no_of_days_visible() { return false; }

    get is_pvt_firm_visible() {
        const vals = [this.pvt_price_basics];
        return vals.some(val => ['FIRM'].includes(val));
    }
get is_pvt_firm_zinc_value_610_visible() { return false; }
get is_pvt_firm_zinc_value_900_visible() { return false; }
get is_pvt_firm_zinc_value_1000_visible() { return false; }
    get pvt_firm_proto_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_pvt_firm_proto_required_visible() {
        const vals = [this.pvt_firm_proto];
        return vals.some(val => ['YES'].includes(val) || (['', null, 'null'].includes(val) && ['YES'].some(v=>!v || v==='null')));
    }
get is_pvt_firm_part_c_visible() { return false; }
get is_pvt_firm_interest_component_visible() { return false; }
get is_pvt_firm_prevailing_rate_of_bank_interest_visible() { return false; }
get is_pvt_firm_market_price_visible() { return false; }
get is_pvt_firm_no_of_days_visible() { return false; }

    get is_pvt_pv_ms610_gsm_visible() {
        const vals = [this.pvt_pv_610_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_pv_ht610_gsm_visible() {
        const vals = [this.pvt_pv_610_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_pv_ms900_gsm_visible() {
        const vals = [this.pvt_pv_900_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_pv_ht900_gsm_visible() {
        const vals = [this.pvt_pv_900_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_pv_ms1000_gsm_visible() {
        const vals = [this.pvt_pv_1000_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_pv_ht1000_gsm_visible() {
        const vals = [this.pvt_pv_1000_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_firm_ms610_gsm_visible() {
        const vals = [this.pvt_firm_610_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_firm_ht610_gsm_visible() {
        const vals = [this.pvt_firm_610_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_firm_ms900_gsm_visible() {
        const vals = [this.pvt_firm_900_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_firm_ht900_gsm_visible() {
        const vals = [this.pvt_firm_900_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_firm_ms1000_gsm_visible() {
        const vals = [this.pvt_firm_1000_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_firm_ht1000_gsm_visible() {
        const vals = [this.pvt_firm_1000_gsm];
        return vals.some(val => ['true'].includes(val));
    }

    get is_pvt_formula_block_visible() {
        const vals = [this.pvt_price_basics];
        return vals.some(val => ['*'].includes(val));
    }
get is_pvt_N5_N12_visible() { return false; }
get is_pvt_O5_O12_visible() { return false; }
get is_pvt_P5_P12_visible() { return false; }
get is_pvt_T6_T13_visible() { return false; }
get is_pvt_U6_U13_visible() { return false; }
get is_pvt_V6_V13_visible() { return false; }
get is_pvt_AW22_visible() { return false; }
get is_pvt_AO31_visible() { return false; }
get is_pvt_C19_visible() { return false; }
get is_pvt_G61_visible() { return false; }
get is_pvt_G60_visible() { return false; }
get is_pvt_pv_bank_interest_visible() { return false; }
get is_pvt_firm_bank_interest_visible() { return false; }
get is_pvt_pv_CPI_visible() { return false; }
    get pvs_price_model_options() { return [{label: 'Price Variation', value: 'Price Variation'}, {label: 'Firm', value: 'Firm'}]; }

    get is_pvs_price_module_visible() {
        const vals = [this.pvs_price_model];
        return vals.some(val => ['Price Variation'].includes(val) || (['', null, 'null'].includes(val) && ['Price Variation'].some(v=>!v || v==='null')));
    }
    get pvs_price_module_options() { return [{label: 'IEEMA', value: 'IEEMA'}, {label: 'PGCIL', value: 'PGCIL'}]; }

    get is_pvs_price_variable_month_visible() {
        const vals = [this.pvs_price_model];
        return vals.some(val => ['Price Variation'].includes(val) || (['', null, 'null'].includes(val) && ['Price Variation'].some(v=>!v || v==='null')));
    }
    get pvs_price_variable_month_options() { return [{label: 'January', value: 'January'}, {label: 'February', value: 'February'}, {label: 'March', value: 'March'}, {label: 'April', value: 'April'}, {label: 'May', value: 'May'}, {label: 'June', value: 'June'}, {label: 'July', value: 'July'}, {label: 'August', value: 'August'}, {label: 'September', value: 'September'}, {label: 'October', value: 'October'}, {label: 'November', value: 'November'}, {label: 'December', value: 'December'}]; }

    get is_pvs_price_variable_year_visible() {
        const vals = [this.pvs_price_model];
        return vals.some(val => ['Price Variation'].includes(val) || (['', null, 'null'].includes(val) && ['Price Variation'].some(v=>!v || v==='null')));
    }
    get pvs_price_variable_year_options() { return [{label: '2016', value: '2016'}, {label: '2017', value: '2017'}, {label: '2018', value: '2018'}, {label: '2019', value: '2019'}, {label: '2020', value: '2020'}, {label: '2021', value: '2021'}, {label: '2022', value: '2022'}, {label: '2023', value: '2023'}, {label: '2024', value: '2024'}, {label: '2025', value: '2025'}]; }

    get is_pvs_substation_type_visible() {
        const vals = [this.pvs_price_model];
        return vals.some(val => ['*'].includes(val));
    }

    get is_pvs_pv_visible() {
        const vals = [this.pvs_price_model];
        return vals.some(val => ['Price Variation'].includes(val));
    }

    get is_sp_1_visible() {
        const vals = [this.pvs_price_module];
        return vals.some(val => ['PGCIL', '', ].includes(val) || (['', null, 'null'].includes(val) && ['PGCIL', '', ].some(v=>!v || v==='null')));
    }

    get is_pvs_pv_billets_visible() {
        const vals = [this.pvs_price_module];
        return vals.some(val => ['IEEMA'].includes(val) || (['', null, 'null'].includes(val) && ['IEEMA'].some(v=>!v || v==='null')));
    }

    get is_pvs_pv_avg_of_blooms_visible() {
        const vals = [this.pvs_price_module];
        return vals.some(val => ['IEEMA'].includes(val) || (['', null, 'null'].includes(val) && ['IEEMA'].some(v=>!v || v==='null')));
    }

    get is_sp_2_visible() {
        const vals = [this.pvs_price_module];
        return vals.some(val => ['PGCIL'].includes(val) || (['', null, 'null'].includes(val) && ['PGCIL'].some(v=>!v || v==='null')));
    }

    get is_sp_3_visible() {
        const vals = [this.pvs_price_module];
        return vals.some(val => ['PGCIL'].includes(val) || (['', null, 'null'].includes(val) && ['PGCIL'].some(v=>!v || v==='null')));
    }
get is_pvs_pv_zinc_value_610_visible() { return false; }
get is_pvs_pv_zinc_value_900_visible() { return false; }
get is_pvs_pv_zinc_value_1000_visible() { return false; }
get is_pvs_pv_cost_of_production_gantry_visible() { return false; }
get is_pvs_pv_cost_of_production_equipment_visible() { return false; }
get is_pvs_pv_cost_of_production_composite_visible() { return false; }
    get pvs_pv_proto_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_pvs_pv_proto_required_visible() {
        const vals = [this.pvs_pv_proto];
        return vals.some(val => ['YES'].includes(val) || (['', null, 'null'].includes(val) && ['YES'].some(v=>!v || v==='null')));
    }
get is_pvs_pv_part_c_visible() { return false; }
get is_pvs_pv_interest_component_visible() { return false; }
get is_pvs_pv_prevailing_rate_of_bank_interest_visible() { return false; }
get is_pvs_pv_market_price_visible() { return false; }
get is_pvs_pv_no_of_days_visible() { return false; }

    get is_pvs_firm_visible() {
        const vals = [this.pvs_price_model];
        return vals.some(val => ['Firm'].includes(val));
    }
get is_pvs_firm_zinc_value_610_visible() { return false; }
get is_pvs_firm_zinc_value_900_visible() { return false; }
get is_pvs_firm_zinc_value_1000_visible() { return false; }
    get pvs_firm_proto_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_pvs_firm_proto_required_visible() {
        const vals = [this.pvs_firm_proto];
        return vals.some(val => ['YES'].includes(val) || (['', null, 'null'].includes(val) && ['YES'].some(v=>!v || v==='null')));
    }

    get is_pvs_pv_gantry_ms610_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_pv_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_gantry_ht610_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_pv_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_gantry_ms900_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_pv_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_gantry_ht900_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_pv_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_gantry_ms1000_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_pv_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_gantry_ht1000_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_pv_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_equipment_ms610_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_pv_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_equipment_ht610_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_pv_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_equipment_ms900_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_pv_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_equipment_ht900_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_pv_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_equipment_ms1000_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_pv_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_equipment_ht1000_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_pv_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_composite_ms610_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_pv_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_composite_ht610_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_pv_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_composite_ms900_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_pv_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_composite_ht900_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_pv_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_composite_ms1000_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_pv_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_pv_composite_ht1000_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_pv_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_gantry_ms610_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_firm_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_gantry_ht610_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_firm_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_gantry_ms900_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_firm_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_gantry_ht900_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_firm_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_gantry_ms1000_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_firm_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_gantry_ht1000_visible() {
        const vals = [this.pvs_gantry_structure, this.pvs_firm_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_equipment_ms610_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_firm_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_equipment_ht610_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_firm_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_equipment_ms900_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_firm_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_equipment_ht900_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_firm_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_equipment_ms1000_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_firm_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_equipment_ht1000_visible() {
        const vals = [this.pvs_equipment_structure, this.pvs_firm_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_composite_ms610_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_firm_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_composite_ht610_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_firm_610_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_composite_ms900_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_firm_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_composite_ht900_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_firm_900_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_composite_ms1000_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_firm_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_firm_composite_ht1000_visible() {
        const vals = [this.pvs_composite_structure, this.pvs_firm_1000_gsm];
        return vals.some(val => [true].includes(val));
    }

    get is_pvs_formula_block_visible() {
        const vals = [this.pvs_price_model];
        return vals.some(val => ['*'].includes(val));
    }
get is_AE27_visible() { return false; }
get is_AE70_visible() { return false; }
get is_AE113_visible() { return false; }
get is_AE41_visible() { return false; }
get is_AE84_visible() { return false; }
get is_AE127_visible() { return false; }
get is_AE55_visible() { return false; }
get is_AE98_visible() { return false; }
get is_AE141_visible() { return false; }
get is_AM27_visible() { return false; }
get is_AM70_visible() { return false; }
get is_AM113_visible() { return false; }
get is_AM41_visible() { return false; }
get is_AM84_visible() { return false; }
get is_AM127_visible() { return false; }
get is_AM55_visible() { return false; }
get is_AM98_visible() { return false; }
get is_AM141_visible() { return false; }
get is_pvt_C19_visible() { return false; }
get is_pvs_pv_CPI_visible() { return false; }

    get is_pvs_details_type_of_grade_visible() {
        const vals = [this.pvs_type_of_grade];
        if ('some' === 'every') {
            return vals.every(val => ['true'].includes(String(val)));
        }
        return vals.some(val => ['true'].includes(String(val)));
    }

    get is_pvs_foundation_bolt_visible() {
        const vals = [this.pvs_type_of_grade];
        if ('some' === 'every') {
            return vals.every(val => ['true'].includes(String(val)));
        }
        return vals.some(val => ['true'].includes(String(val)));
    }

    get is_pvs_ms_template_without_galvanization_visible() {
        const vals = [this.pvs_type_of_grade];
        if ('some' === 'every') {
            return vals.every(val => ['true'].includes(String(val)));
        }
        return vals.some(val => ['true'].includes(String(val)));
    }

    get is_pvs_proto_assembly_testing_section_visible() {
        const vals = [this.pvs_proto_assembly_testing];
        if ('some' === 'every') {
            return vals.every(val => ['true'].includes(String(val)));
        }
        return vals.some(val => ['true'].includes(String(val)));
    }

    get is_pvs_details_type_of_grade_5_6_visible() {
        const vals = [this.pvs_type_5_6];
        if ('some' === 'every') {
            return vals.every(val => ['true'].includes(String(val)));
        }
        return vals.some(val => ['true'].includes(String(val)));
    }

    get is_pvs_details_type_of_grade_6_8_visible() {
        const vals = [this.pvs_type_6_8];
        if ('some' === 'every') {
            return vals.every(val => ['true'].includes(String(val)));
        }
        return vals.some(val => ['true'].includes(String(val)));
    }

    get is_pvs_details_type_of_grade_8_8_visible() {
        const vals = [this.pvs_type_8_8];
        if ('some' === 'every') {
            return vals.every(val => ['true'].includes(String(val)));
        }
        return vals.some(val => ['true'].includes(String(val)));
    }

    get is_pvs_detail_foundation_bolt_visible() {
        const vals = [this.pvs_foundation_bolt_checkbox];
        if ('some' === 'every') {
            return vals.every(val => ['true'].includes(String(val)));
        }
        return vals.some(val => ['true'].includes(String(val)));
    }

    get is_pvs_detail_ms_template_pv_visible() {
        const vals = [this.pvs_ms_template_without_galvanization_checkbox, this.pvs_pv_price_variation_active];
        if ('every' === 'every') {
            return vals.every(val => ['true'].includes(String(val)));
        }
        return vals.some(val => ['true'].includes(String(val)));
    }
get is_pvs_detail_ms_template_price_pv_gantry_visible() { return false; }
get is_pvs_detail_ms_template_price_pv_equipment_visible() { return false; }
get is_pvs_detail_ms_template_price_pv_composite_visible() { return false; }

    get is_pvs_detail_ms_template_firm_visible() {
        const vals = [this.pvs_ms_template_without_galvanization_checkbox, this.pvs_pv_firm_active];
        if ('every' === 'every') {
            return vals.every(val => ['true'].includes(String(val)));
        }
        return vals.some(val => ['true'].includes(String(val)));
    }
get is_pvs_detail_ms_template_price_firm_gantry_visible() { return false; }
get is_pvs_detail_ms_template_price_firm_equipment_visible() { return false; }
get is_pvs_detail_ms_template_price_firm_composite_visible() { return false; }
    get pv_formula_options() { return [{label: 'IEEMA - P = Po/100 {9 + 35(SBLR/SBLRo) + 27(SBIR/SBIRo) + 13(ZN/ZNo) + 16(W/Wo)}', value: 'IEEMA - P = Po/100 {9 + 35(SBLR/SBLRo) + 27(SBIR/SBIRo) + 13(ZN/ZNo) + 16(W/Wo)}'}, {label: 'PGCIL - EC1 = ECo [0.15 + 0.52 × (A / Ao) + 0.10 × (B / Bo) + 0.23 × (L / Lo)] − ECo', value: 'PGCIL - EC1 = ECo [0.15 + 0.52 × (A / Ao) + 0.10 × (B / Bo) + 0.23 × (L / Lo)] − ECo'}]; }

    get is_pv_base_month_visible() {
        const vals = [this.pv_formula];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }
    get pv_base_month_options() { return [{label: 'January', value: 'January'}, {label: 'February', value: 'February'}, {label: 'March', value: 'March'}, {label: 'April', value: 'April'}, {label: 'May', value: 'May'}, {label: 'June', value: 'June'}, {label: 'July', value: 'July'}, {label: 'August', value: 'August'}, {label: 'September', value: 'September'}, {label: 'October', value: 'October'}, {label: 'November', value: 'November'}, {label: 'December', value: 'December'}]; }

    get is_pv_base_year_visible() {
        const vals = [this.pv_formula];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }
    get pv_base_year_options() { return [{label: '2016', value: '2016'}, {label: '2017', value: '2017'}, {label: '2018', value: '2018'}, {label: '2019', value: '2019'}, {label: '2020', value: '2020'}, {label: '2021', value: '2021'}, {label: '2022', value: '2022'}, {label: '2023', value: '2023'}, {label: '2024', value: '2024'}, {label: '2025', value: '2025'}, {label: '2026', value: '2026'}]; }

    get is_pv_blooms_visible() {
        const vals = [this.pv_formula];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_pv_billets_visible() {
        const vals = [this.pv_formula];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_pv_zinc_visible() {
        const vals = [this.pv_formula];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_pv_consumer_price_index_visible() {
        const vals = [this.pv_formula];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    
    connectedCallback() {
        if (this.estimatorType) {
            this.selectedType = this.estimatorType;
        }
        if (this.savedData) {
            for (let key in this.savedData) {
                if (key !== 'selectedType') {
                    this[key] = this.savedData[key];
                }
            }
            // Explicit fallbacks for known required vars if they weren't in savedData yet
            this.Incoterms = this.savedData.incoterms || 'Ex-works';
            this.tower_project_for_transportation_addition = this.savedData.tower_project_for_transportation_addition || 'NO';
            this.pvt_G60 = this.savedData.pvt_G60 || 0;
            this.pvt_G61 = this.savedData.pvt_G61 || 0;
            this.pvss_G60 = this.savedData.pvss_G60 || 0;
            this.pvss_G61 = this.savedData.pvss_G61 || 0;
            this.pvs_G60 = this.savedData.pvs_G60 || 0;
            this.pvs_G61 = this.savedData.pvs_G61 || 0;
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
        // Evaluate all formulas
        let pvt_price_basics = this.pvt_price_basics || 0;
        let pvt_price_module = this.pvt_price_module || 0;
        let pvt_price_variable_month = this.pvt_price_variable_month || 0;
        let pvt_price_variable_year = this.pvt_price_variable_year || 0;
        let pvt_ms_quantity_pv = this.pvt_ms_quantity_pv || 0;
        let pvt_ht_quantity_pv = this.pvt_ht_quantity_pv || 0;
        let pvt_ms_quantity_firm = this.pvt_ms_quantity_firm || 0;
        let pvt_ht_quantity_firm = this.pvt_ht_quantity_firm || 0;
        let pvt_pv_zinc_consumption_space = this.pvt_pv_zinc_consumption_space || 0;
        let pvt_pv_610_gsm_label = this.pvt_pv_610_gsm_label || 0;
        let pvt_pv_610_gsm = this.pvt_pv_610_gsm || 0;
        let pvt_pv_900_gsm_label = this.pvt_pv_900_gsm_label || 0;
        let pvt_pv_900_gsm = this.pvt_pv_900_gsm || 0;
        let pvt_pv_1000_gsm_label = this.pvt_pv_1000_gsm_label || 0;
        let pvt_pv_1000_gsm = this.pvt_pv_1000_gsm || 0;
        let pvt_pv_proto = this.pvt_pv_proto || 0;
        let pvt_pv_interest_component = this.pvt_pv_interest_component || 0;
        let pvt_pv_margin = this.pvt_pv_margin || 0;
        let pvt_pv_additional_pricing = this.pvt_pv_additional_pricing || 0;
        let pvt_firm_610_gsm_label = this.pvt_firm_610_gsm_label || 0;
        let pvt_firm_610_gsm = this.pvt_firm_610_gsm || 0;
        let pvt_firm_900_gsm_label = this.pvt_firm_900_gsm_label || 0;
        let pvt_firm_900_gsm = this.pvt_firm_900_gsm || 0;
        let pvt_firm_1000_gsm_label = this.pvt_firm_1000_gsm_label || 0;
        let pvt_firm_1000_gsm = this.pvt_firm_1000_gsm || 0;
        let pvt_firm_proto = this.pvt_firm_proto || 0;
        let pvt_firm_interest_component = this.pvt_firm_interest_component || 0;
        let pvt_firm_margin = this.pvt_firm_margin || 0;
        let pvt_firm_additional_pricing = this.pvt_firm_additional_pricing || 0;
        let pvs_price_model = this.pvs_price_model || 0;
        let pvs_price_module = this.pvs_price_module || 0;
        let pvs_price_variable_month = this.pvs_price_variable_month || 0;
        let pvs_price_variable_year = this.pvs_price_variable_year || 0;
        let pvs_gantry_structure = this.pvs_gantry_structure || 0;
        let pvs_equipment_structure = this.pvs_equipment_structure || 0;
        let pvs_composite_structure = this.pvs_composite_structure || 0;
        let pvs_gantry_structure_ms_quantity1 = this.pvs_gantry_structure_ms_quantity1 || 0;
        let pvs_equipment_structure_ms_quantity2 = this.pvs_equipment_structure_ms_quantity2 || 0;
        let pvs_composite_structure_ms_quantity3 = this.pvs_composite_structure_ms_quantity3 || 0;
        let pvs_gantry_structure_ht_quantity1 = this.pvs_gantry_structure_ht_quantity1 || 0;
        let pvs_equipment_structure_ht_quantity2 = this.pvs_equipment_structure_ht_quantity2 || 0;
        let pvs_composite_structure_ht_quantity3 = this.pvs_composite_structure_ht_quantity3 || 0;
        let sp_1 = this.sp_1 || 0;
        let sp_2 = this.sp_2 || 0;
        let sp_3 = this.sp_3 || 0;
        let sp_4 = this.sp_4 || 0;
        let pvs_pv_610_gsm_label = this.pvs_pv_610_gsm_label || 0;
        let pvs_pv_610_gsm = this.pvs_pv_610_gsm || 0;
        let pvs_pv_900_gsm_label = this.pvs_pv_900_gsm_label || 0;
        let pvs_pv_900_gsm = this.pvs_pv_900_gsm || 0;
        let pvs_pv_1000_gsm_label = this.pvs_pv_1000_gsm_label || 0;
        let pvs_pv_1000_gsm = this.pvs_pv_1000_gsm || 0;
        let pvs_pv_proto = this.pvs_pv_proto || 0;
        let pvs_pv_interest_component = this.pvs_pv_interest_component || 0;
        let pvs_pv_margin = this.pvs_pv_margin || 0;
        let pvs_pv_additional_pricing = this.pvs_pv_additional_pricing || 0;
        let pvs_firm_610_gsm_label = this.pvs_firm_610_gsm_label || 0;
        let pvs_firm_610_gsm = this.pvs_firm_610_gsm || 0;
        let pvs_firm_900_gsm_label = this.pvs_firm_900_gsm_label || 0;
        let pvs_firm_900_gsm = this.pvs_firm_900_gsm || 0;
        let pvs_firm_1000_gsm_label = this.pvs_firm_1000_gsm_label || 0;
        let pvs_firm_1000_gsm = this.pvs_firm_1000_gsm || 0;
        let pvs_firm_proto = this.pvs_firm_proto || 0;
        let pvs_firm_interest_component = this.pvs_firm_interest_component || 0;
        let pvs_firm_margin = this.pvs_firm_margin || 0;
        let pvs_firm_additional_pricing = this.pvs_firm_additional_pricing || 0;
        let pvs_type_of_grade = this.pvs_type_of_grade || 0;
        let pvs_proto_assembly_testing = this.pvs_proto_assembly_testing || 0;
        let pvs_type_5_6 = this.pvs_type_5_6 || 0;
        let pvs_type_6_8 = this.pvs_type_6_8 || 0;
        let pvs_type_8_8 = this.pvs_type_8_8 || 0;
        let pvs_foundation_bolt_checkbox = this.pvs_foundation_bolt_checkbox || 0;
        let pvs_ms_template_without_galvanization_checkbox = this.pvs_ms_template_without_galvanization_checkbox || 0;
        let pvs_price_of_proto_assembly = this.pvs_price_of_proto_assembly || 0;
        let pvs_type_5_6_margin = this.pvs_type_5_6_margin || 0;
        let pvs_type_5_6_quantity = this.pvs_type_5_6_quantity || 0;
        let pvs_type_6_8_margin = this.pvs_type_6_8_margin || 0;
        let pvs_type_6_8_quantity = this.pvs_type_6_8_quantity || 0;
        let pvs_type_8_8_margin = this.pvs_type_8_8_margin || 0;
        let pvs_type_8_8_quantity = this.pvs_type_8_8_quantity || 0;
        let pvs_detail_foundation_bolt_margin = this.pvs_detail_foundation_bolt_margin || 0;
        let pvs_detail_foundation_bolt_quantity = this.pvs_detail_foundation_bolt_quantity || 0;
        let pvs_detail_ms_template_margin_pv = this.pvs_detail_ms_template_margin_pv || 0;
        let pvs_detail_ms_template_quantity_pv = this.pvs_detail_ms_template_quantity_pv || 0;
        let pvs_detail_ms_template_margin_firm = this.pvs_detail_ms_template_margin_firm || 0;
        let pvs_detail_ms_template_quantity_firm = this.pvs_detail_ms_template_quantity_firm || 0;
        let pv_formula = this.pv_formula || 0;
        let pv_base_month = this.pv_base_month || 0;
        let pv_base_year = this.pv_base_year || 0;
        let pvt_pv_avg_of_blooms = this.pvt_pv_avg_of_blooms || 0;
        let pvt_pv_rm_cost = this.pvt_pv_rm_cost || 0;
        let pvt_pv_zinc_value = this.pvt_pv_zinc_value || 0;
        let pvt_pv_zinc_value_610 = this.pvt_pv_zinc_value_610 || 0;
        let pvt_pv_zinc_value_900 = this.pvt_pv_zinc_value_900 || 0;
        let pvt_pv_zinc_value_1000 = this.pvt_pv_zinc_value_1000 || 0;
        let pvt_pv_proto_required = this.pvt_pv_proto_required || 0;
        let pvt_pv_scrap_value = this.pvt_pv_scrap_value || 0;
        let pvt_pv_prevailing_rate_of_bank_interest = this.pvt_pv_prevailing_rate_of_bank_interest || 0;
        let pvt_pv_market_price = this.pvt_pv_market_price || 0;
        let pvt_pv_no_of_days = this.pvt_pv_no_of_days || 0;
        let pvt_firm_zinc_value = this.pvt_firm_zinc_value || 0;
        let pvt_firm_zinc_value_610 = this.pvt_firm_zinc_value_610 || 0;
        let pvt_firm_zinc_value_900 = this.pvt_firm_zinc_value_900 || 0;
        let pvt_firm_zinc_value_1000 = this.pvt_firm_zinc_value_1000 || 0;
        let pvt_firm_scrap_value = this.pvt_firm_scrap_value || 0;
        let pvt_firm_proto_required = this.pvt_firm_proto_required || 0;
        let pvt_firm_prevailing_rate_of_bank_interest = this.pvt_firm_prevailing_rate_of_bank_interest || 0;
        let pvt_firm_market_price = this.pvt_firm_market_price || 0;
        let pvt_firm_no_of_days = this.pvt_firm_no_of_days || 0;
        let pvt_pv_ms610_gsm_unit_price = this.pvt_pv_ms610_gsm_unit_price || 0;
        let pvt_pv_ms610_gsm_unit_cost = this.pvt_pv_ms610_gsm_unit_cost || 0;
        let pvt_pv_ms610_gsm_quantity = this.pvt_pv_ms610_gsm_quantity || 0;
        let pvt_pv_ht610_gsm_unit_price = this.pvt_pv_ht610_gsm_unit_price || 0;
        let pvt_pv_ht610_gsm_unit_cost = this.pvt_pv_ht610_gsm_unit_cost || 0;
        let pvt_pv_ht610_gsm_quantity = this.pvt_pv_ht610_gsm_quantity || 0;
        let pvt_pv_ms900_gsm_unit_price = this.pvt_pv_ms900_gsm_unit_price || 0;
        let pvt_pv_ms900_gsm_unit_cost = this.pvt_pv_ms900_gsm_unit_cost || 0;
        let pvt_pv_ms900_gsm_quantity = this.pvt_pv_ms900_gsm_quantity || 0;
        let pvt_pv_ht900_gsm_unit_price = this.pvt_pv_ht900_gsm_unit_price || 0;
        let pvt_pv_ht900_gsm_unit_cost = this.pvt_pv_ht900_gsm_unit_cost || 0;
        let pvt_pv_ht900_gsm_quantity = this.pvt_pv_ht900_gsm_quantity || 0;
        let pvt_pv_ms1000_gsm_unit_price = this.pvt_pv_ms1000_gsm_unit_price || 0;
        let pvt_pv_ms1000_gsm_unit_cost = this.pvt_pv_ms1000_gsm_unit_cost || 0;
        let pvt_pv_ms1000_gsm_quantity = this.pvt_pv_ms1000_gsm_quantity || 0;
        let pvt_pv_ht1000_gsm_unit_price = this.pvt_pv_ht1000_gsm_unit_price || 0;
        let pvt_pv_ht1000_gsm_unit_cost = this.pvt_pv_ht1000_gsm_unit_cost || 0;
        let pvt_pv_ht1000_gsm_quantity = this.pvt_pv_ht1000_gsm_quantity || 0;
        let pvt_firm_ms610_gsm_unit_price = this.pvt_firm_ms610_gsm_unit_price || 0;
        let pvt_firm_ms610_gsm_unit_cost = this.pvt_firm_ms610_gsm_unit_cost || 0;
        let pvt_firm_ms610_gsm_quantity = this.pvt_firm_ms610_gsm_quantity || 0;
        let pvt_firm_ht610_gsm_unit_price = this.pvt_firm_ht610_gsm_unit_price || 0;
        let pvt_firm_ht610_gsm_unit_cost = this.pvt_firm_ht610_gsm_unit_cost || 0;
        let pvt_firm_ht610_gsm_quantity = this.pvt_firm_ht610_gsm_quantity || 0;
        let pvt_firm_ms900_gsm_unit_price = this.pvt_firm_ms900_gsm_unit_price || 0;
        let pvt_firm_ms900_gsm_unit_cost = this.pvt_firm_ms900_gsm_unit_cost || 0;
        let pvt_firm_ms900_gsm_quantity = this.pvt_firm_ms900_gsm_quantity || 0;
        let pvt_firm_ht900_gsm_unit_price = this.pvt_firm_ht900_gsm_unit_price || 0;
        let pvt_firm_ht900_gsm_unit_cost = this.pvt_firm_ht900_gsm_unit_cost || 0;
        let pvt_firm_ht900_gsm_quantity = this.pvt_firm_ht900_gsm_quantity || 0;
        let pvt_firm_ms1000_gsm_unit_price = this.pvt_firm_ms1000_gsm_unit_price || 0;
        let pvt_firm_ms1000_gsm_unit_cost = this.pvt_firm_ms1000_gsm_unit_cost || 0;
        let pvt_firm_ms1000_gsm_quantity = this.pvt_firm_ms1000_gsm_quantity || 0;
        let pvt_firm_ht1000_gsm_unit_price = this.pvt_firm_ht1000_gsm_unit_price || 0;
        let pvt_firm_ht1000_gsm_unit_cost = this.pvt_firm_ht1000_gsm_unit_cost || 0;
        let pvt_firm_ht1000_gsm_quantity = this.pvt_firm_ht1000_gsm_quantity || 0;
        let pvt_N5_N12 = this.pvt_N5_N12 || 0;
        let pvt_O5_O12 = this.pvt_O5_O12 || 0;
        let pvt_P5_P12 = this.pvt_P5_P12 || 0;
        let pvt_T6_T13 = this.pvt_T6_T13 || 0;
        let pvt_U6_U13 = this.pvt_U6_U13 || 0;
        let pvt_V6_V13 = this.pvt_V6_V13 || 0;
        let pvt_AW22 = this.pvt_AW22 || 0;
        let pvt_AO31 = this.pvt_AO31 || 0;
        let pvt_C19 = this.pvt_C19 || 0;
        let pvt_G61 = this.pvt_G61 || 0;
        let pvt_G60 = this.pvt_G60 || 0;
        let pvt_pv_bank_interest = this.pvt_pv_bank_interest || 0;
        let pvt_firm_bank_interest = this.pvt_firm_bank_interest || 0;
        let pvs_pv_avg_of_blooms = this.pvs_pv_avg_of_blooms || 0;
        let pvs_pv_rm_cost = this.pvs_pv_rm_cost || 0;
        let pvs_pv_cost_of_production = this.pvs_pv_cost_of_production || 0;
        let pvs_pv_zinc_value = this.pvs_pv_zinc_value || 0;
        let pvs_pv_zinc_value_610 = this.pvs_pv_zinc_value_610 || 0;
        let pvs_pv_zinc_value_900 = this.pvs_pv_zinc_value_900 || 0;
        let pvs_pv_zinc_value_1000 = this.pvs_pv_zinc_value_1000 || 0;
        let pvs_pv_cost_of_production_gantry = this.pvs_pv_cost_of_production_gantry || 0;
        let pvs_pv_cost_of_production_equipment = this.pvs_pv_cost_of_production_equipment || 0;
        let pvs_pv_cost_of_production_composite = this.pvs_pv_cost_of_production_composite || 0;
        let pvs_pv_proto_required = this.pvs_pv_proto_required || 0;
        let pvs_pv_scrap_value = this.pvs_pv_scrap_value || 0;
        let pvs_pv_prevailing_rate_of_bank_interest = this.pvs_pv_prevailing_rate_of_bank_interest || 0;
        let pvs_pv_market_price = this.pvs_pv_market_price || 0;
        let pvs_pv_no_of_days = this.pvs_pv_no_of_days || 0;
        let pvs_firm_zinc_value = this.pvs_firm_zinc_value || 0;
        let pvs_firm_zinc_value_610 = this.pvs_firm_zinc_value_610 || 0;
        let pvs_firm_zinc_value_900 = this.pvs_firm_zinc_value_900 || 0;
        let pvs_firm_zinc_value_1000 = this.pvs_firm_zinc_value_1000 || 0;
        let pvs_firm_cost_of_production = this.pvs_firm_cost_of_production || 0;
        let pvs_firm_cost_of_production_gantry = this.pvs_firm_cost_of_production_gantry || 0;
        let pvs_firm_cost_of_production_equipment = this.pvs_firm_cost_of_production_equipment || 0;
        let pvs_firm_cost_of_production_composite = this.pvs_firm_cost_of_production_composite || 0;
        let pvs_firm_scrap_value = this.pvs_firm_scrap_value || 0;
        let pvs_firm_proto_required = this.pvs_firm_proto_required || 0;
        let pvs_firm_prevailing_rate_of_bank_interest = this.pvs_firm_prevailing_rate_of_bank_interest || 0;
        let pvs_firm_market_price = this.pvs_firm_market_price || 0;
        let pvs_firm_no_of_days = this.pvs_firm_no_of_days || 0;
        let pvs_pv_gantry_ms610_unit_price = this.pvs_pv_gantry_ms610_unit_price || 0;
        let pvs_pv_gantry_ms610_unit_cost = this.pvs_pv_gantry_ms610_unit_cost || 0;
        let pvs_pv_gantry_ms610_gsm_quantity = this.pvs_pv_gantry_ms610_gsm_quantity || 0;
        let pvs_pv_gantry_ht610_unit_price = this.pvs_pv_gantry_ht610_unit_price || 0;
        let pvs_pv_gantry_ht610_unit_cost = this.pvs_pv_gantry_ht610_unit_cost || 0;
        let pvs_pv_gantry_ht610_quantity = this.pvs_pv_gantry_ht610_quantity || 0;
        let pvs_pv_gantry_ms900_unit_price = this.pvs_pv_gantry_ms900_unit_price || 0;
        let pvs_pv_gantry_ms900_unit_cost = this.pvs_pv_gantry_ms900_unit_cost || 0;
        let pvs_pv_gantry_ms900_gsm_quantity = this.pvs_pv_gantry_ms900_gsm_quantity || 0;
        let pvs_pv_gantry_ht900_unit_price = this.pvs_pv_gantry_ht900_unit_price || 0;
        let pvs_pv_gantry_ht900_unit_cost = this.pvs_pv_gantry_ht900_unit_cost || 0;
        let pvs_pv_gantry_ht900_quantity = this.pvs_pv_gantry_ht900_quantity || 0;
        let pvs_pv_gantry_ms1000_unit_price = this.pvs_pv_gantry_ms1000_unit_price || 0;
        let pvs_pv_gantry_ms1000_unit_cost = this.pvs_pv_gantry_ms1000_unit_cost || 0;
        let pvs_pv_gantry_ms1000_gsm_quantity = this.pvs_pv_gantry_ms1000_gsm_quantity || 0;
        let pvs_pv_gantry_ht1000_unit_price = this.pvs_pv_gantry_ht1000_unit_price || 0;
        let pvs_pv_gantry_ht1000_unit_cost = this.pvs_pv_gantry_ht1000_unit_cost || 0;
        let pvs_pv_gantry_ht1000_quantity = this.pvs_pv_gantry_ht1000_quantity || 0;
        let pvs_pv_equipment_ms610_unit_price = this.pvs_pv_equipment_ms610_unit_price || 0;
        let pvs_pv_equipment_ms610_unit_cost = this.pvs_pv_equipment_ms610_unit_cost || 0;
        let pvs_pv_equipment_ms610_gsm_quantity = this.pvs_pv_equipment_ms610_gsm_quantity || 0;
        let pvs_pv_equipment_ht610_unit_price = this.pvs_pv_equipment_ht610_unit_price || 0;
        let pvs_pv_equipment_ht610_unit_cost = this.pvs_pv_equipment_ht610_unit_cost || 0;
        let pvs_pv_equipment_ht610_quantity = this.pvs_pv_equipment_ht610_quantity || 0;
        let pvs_pv_equipment_ms900_unit_price = this.pvs_pv_equipment_ms900_unit_price || 0;
        let pvs_pv_equipment_ms900_unit_cost = this.pvs_pv_equipment_ms900_unit_cost || 0;
        let pvs_pv_equipment_ms900_gsm_quantity = this.pvs_pv_equipment_ms900_gsm_quantity || 0;
        let pvs_pv_equipment_ht900_unit_price = this.pvs_pv_equipment_ht900_unit_price || 0;
        let pvs_pv_equipment_ht900_unit_cost = this.pvs_pv_equipment_ht900_unit_cost || 0;
        let pvs_pv_equipment_ht900_quantity = this.pvs_pv_equipment_ht900_quantity || 0;
        let pvs_pv_equipment_ms1000_unit_price = this.pvs_pv_equipment_ms1000_unit_price || 0;
        let pvs_pv_equipment_ms1000_unit_cost = this.pvs_pv_equipment_ms1000_unit_cost || 0;
        let pvs_pv_equipment_ms1000_gsm_quantity = this.pvs_pv_equipment_ms1000_gsm_quantity || 0;
        let pvs_pv_equipment_ht1000_unit_price = this.pvs_pv_equipment_ht1000_unit_price || 0;
        let pvs_pv_equipment_ht1000_unit_cost = this.pvs_pv_equipment_ht1000_unit_cost || 0;
        let pvs_pv_equipment_ht1000_quantity = this.pvs_pv_equipment_ht1000_quantity || 0;
        let pvs_pv_composite_ms610_unit_price = this.pvs_pv_composite_ms610_unit_price || 0;
        let pvs_pv_composite_ms610_unit_cost = this.pvs_pv_composite_ms610_unit_cost || 0;
        let pvs_pv_composite_ms610_gsm_quantity = this.pvs_pv_composite_ms610_gsm_quantity || 0;
        let pvs_pv_composite_ht610_unit_price = this.pvs_pv_composite_ht610_unit_price || 0;
        let pvs_pv_composite_ht610_unit_cost = this.pvs_pv_composite_ht610_unit_cost || 0;
        let pvs_pv_composite_ht610_quantity = this.pvs_pv_composite_ht610_quantity || 0;
        let pvs_pv_composite_ms900_unit_price = this.pvs_pv_composite_ms900_unit_price || 0;
        let pvs_pv_composite_ms900_unit_cost = this.pvs_pv_composite_ms900_unit_cost || 0;
        let pvs_pv_composite_ms900_gsm_quantity = this.pvs_pv_composite_ms900_gsm_quantity || 0;
        let pvs_pv_composite_ht900_unit_price = this.pvs_pv_composite_ht900_unit_price || 0;
        let pvs_pv_composite_ht900_unit_cost = this.pvs_pv_composite_ht900_unit_cost || 0;
        let pvs_pv_composite_ht900_quantity = this.pvs_pv_composite_ht900_quantity || 0;
        let pvs_pv_composite_ms1000_unit_price = this.pvs_pv_composite_ms1000_unit_price || 0;
        let pvs_pv_composite_ms1000_unit_cost = this.pvs_pv_composite_ms1000_unit_cost || 0;
        let pvs_pv_composite_ms1000_gsm_quantity = this.pvs_pv_composite_ms1000_gsm_quantity || 0;
        let pvs_pv_composite_ht1000_unit_price = this.pvs_pv_composite_ht1000_unit_price || 0;
        let pvs_pv_composite_ht1000_unit_cost = this.pvs_pv_composite_ht1000_unit_cost || 0;
        let pvs_pv_composite_ht1000_quantity = this.pvs_pv_composite_ht1000_quantity || 0;
        let pvs_firm_gantry_ms610_unit_price = this.pvs_firm_gantry_ms610_unit_price || 0;
        let pvs_firm_gantry_ms610_unit_cost = this.pvs_firm_gantry_ms610_unit_cost || 0;
        let pvs_firm_gantry_ms610_gsm_quantity = this.pvs_firm_gantry_ms610_gsm_quantity || 0;
        let pvs_firm_gantry_ht610_unit_price = this.pvs_firm_gantry_ht610_unit_price || 0;
        let pvs_firm_gantry_ht610_unit_cost = this.pvs_firm_gantry_ht610_unit_cost || 0;
        let pvs_firm_gantry_ht610_quantity = this.pvs_firm_gantry_ht610_quantity || 0;
        let pvs_firm_gantry_ms900_unit_price = this.pvs_firm_gantry_ms900_unit_price || 0;
        let pvs_firm_gantry_ms900_unit_cost = this.pvs_firm_gantry_ms900_unit_cost || 0;
        let pvs_firm_gantry_ms900_gsm_quantity = this.pvs_firm_gantry_ms900_gsm_quantity || 0;
        let pvs_firm_gantry_ht900_unit_price = this.pvs_firm_gantry_ht900_unit_price || 0;
        let pvs_firm_gantry_ht900_unit_cost = this.pvs_firm_gantry_ht900_unit_cost || 0;
        let pvs_firm_gantry_ht900_quantity = this.pvs_firm_gantry_ht900_quantity || 0;
        let pvs_firm_gantry_ms1000_unit_price = this.pvs_firm_gantry_ms1000_unit_price || 0;
        let pvs_firm_gantry_ms1000_unit_cost = this.pvs_firm_gantry_ms1000_unit_cost || 0;
        let pvs_firm_gantry_ms1000_gsm_quantity = this.pvs_firm_gantry_ms1000_gsm_quantity || 0;
        let pvs_firm_gantry_ht1000_unit_price = this.pvs_firm_gantry_ht1000_unit_price || 0;
        let pvs_firm_gantry_ht1000_unit_cost = this.pvs_firm_gantry_ht1000_unit_cost || 0;
        let pvs_firm_gantry_ht1000_quantity = this.pvs_firm_gantry_ht1000_quantity || 0;
        let pvs_firm_equipment_ms610_unit_price = this.pvs_firm_equipment_ms610_unit_price || 0;
        let pvs_firm_equipment_ms610_unit_cost = this.pvs_firm_equipment_ms610_unit_cost || 0;
        let pvs_firm_equipment_ms610_gsm_quantity = this.pvs_firm_equipment_ms610_gsm_quantity || 0;
        let pvs_firm_equipment_ht610_unit_price = this.pvs_firm_equipment_ht610_unit_price || 0;
        let pvs_firm_equipment_ht610_unit_cost = this.pvs_firm_equipment_ht610_unit_cost || 0;
        let pvs_firm_equipment_ht610_quantity = this.pvs_firm_equipment_ht610_quantity || 0;
        let pvs_FIRM_equipment_ms900_unit_price = this.pvs_FIRM_equipment_ms900_unit_price || 0;
        let pvs_FIRM_equipment_ms900_unit_cost = this.pvs_FIRM_equipment_ms900_unit_cost || 0;
        let pvs_firm_equipment_ms900_gsm_quantity = this.pvs_firm_equipment_ms900_gsm_quantity || 0;
        let pvs_firm_equipment_ht900_unit_price = this.pvs_firm_equipment_ht900_unit_price || 0;
        let pvs_firm_equipment_ht900_unit_cost = this.pvs_firm_equipment_ht900_unit_cost || 0;
        let pvs_firm_equipment_ht900_quantity = this.pvs_firm_equipment_ht900_quantity || 0;
        let pvs_firm_equipment_ms1000_unit_price = this.pvs_firm_equipment_ms1000_unit_price || 0;
        let pvs_firm_equipment_ms1000_unit_cost = this.pvs_firm_equipment_ms1000_unit_cost || 0;
        let pvs_firm_equipment_ms1000_gsm_quantity = this.pvs_firm_equipment_ms1000_gsm_quantity || 0;
        let pvs_firm_equipment_ht1000_unit_price = this.pvs_firm_equipment_ht1000_unit_price || 0;
        let pvs_firm_equipment_ht1000_unit_cost = this.pvs_firm_equipment_ht1000_unit_cost || 0;
        let pvs_firm_equipment_ht1000_quantity = this.pvs_firm_equipment_ht1000_quantity || 0;
        let pvs_firm_composite_ms610_unit_price = this.pvs_firm_composite_ms610_unit_price || 0;
        let pvs_firm_composite_ms610_unit_cost = this.pvs_firm_composite_ms610_unit_cost || 0;
        let pvs_firm_composite_ms610_gsm_quantity = this.pvs_firm_composite_ms610_gsm_quantity || 0;
        let pvs_firm_composite_ht610_unit_price = this.pvs_firm_composite_ht610_unit_price || 0;
        let pvs_firm_composite_ht610_unit_cost = this.pvs_firm_composite_ht610_unit_cost || 0;
        let pvs_firm_composite_ht610_quantity = this.pvs_firm_composite_ht610_quantity || 0;
        let pvs_firm_composite_ms900_unit_price = this.pvs_firm_composite_ms900_unit_price || 0;
        let pvs_firm_composite_ms900_unit_cost = this.pvs_firm_composite_ms900_unit_cost || 0;
        let pvs_firm_composite_ms900_gsm_quantity = this.pvs_firm_composite_ms900_gsm_quantity || 0;
        let pvs_firm_composite_ht900_unit_price = this.pvs_firm_composite_ht900_unit_price || 0;
        let pvs_firm_composite_ht900_unit_cost = this.pvs_firm_composite_ht900_unit_cost || 0;
        let pvs_firm_composite_ht900_quantity = this.pvs_firm_composite_ht900_quantity || 0;
        let pvs_firm_composite_ms1000_unit_price = this.pvs_firm_composite_ms1000_unit_price || 0;
        let pvs_firm_composite_ms1000_unit_cost = this.pvs_firm_composite_ms1000_unit_cost || 0;
        let pvs_firm_composite_ms1000_gsm_quantity = this.pvs_firm_composite_ms1000_gsm_quantity || 0;
        let pvs_firm_composite_ht1000_unit_price = this.pvs_firm_composite_ht1000_unit_price || 0;
        let pvs_firm_composite_ht1000_unit_cost = this.pvs_firm_composite_ht1000_unit_cost || 0;
        let pvs_firm_composite_ht1000_quantity = this.pvs_firm_composite_ht1000_quantity || 0;
        let AE27 = this.AE27 || 0;
        let AE70 = this.AE70 || 0;
        let AE113 = this.AE113 || 0;
        let AE41 = this.AE41 || 0;
        let AE84 = this.AE84 || 0;
        let AE127 = this.AE127 || 0;
        let AE55 = this.AE55 || 0;
        let AE98 = this.AE98 || 0;
        let AE141 = this.AE141 || 0;
        let AM27 = this.AM27 || 0;
        let AM70 = this.AM70 || 0;
        let AM113 = this.AM113 || 0;
        let AM41 = this.AM41 || 0;
        let AM84 = this.AM84 || 0;
        let AM127 = this.AM127 || 0;
        let AM55 = this.AM55 || 0;
        let AM98 = this.AM98 || 0;
        let AM141 = this.AM141 || 0;
        let pvs_BJ34 = this.pvs_BJ34 || 0;
        let pvs_BT29 = this.pvs_BT29 || 0;
        let pvs_G61 = this.pvs_G61 || 0;
        let pvs_G60 = this.pvs_G60 || 0;
        let pvs_type_5_6_price_unit = this.pvs_type_5_6_price_unit || 0;
        let pvs_type_5_6_price_cost = this.pvs_type_5_6_price_cost || 0;
        let pvs_type_6_8_price_unit = this.pvs_type_6_8_price_unit || 0;
        let pvs_type_6_8_price_cost = this.pvs_type_6_8_price_cost || 0;
        let pvs_type_8_8_price_unit = this.pvs_type_8_8_price_unit || 0;
        let pvs_type_8_8_price_cost = this.pvs_type_8_8_price_cost || 0;
        let pvs_detail_foundation_bolt_price_unit = this.pvs_detail_foundation_bolt_price_unit || 0;
        let pvs_detail_foundation_bolt_price_cost = this.pvs_detail_foundation_bolt_price_cost || 0;
        let pvs_detail_ms_template_price_pv = this.pvs_detail_ms_template_price_pv || 0;
        let pvs_detail_ms_template_price_pv_gantry = this.pvs_detail_ms_template_price_pv_gantry || 0;
        let pvs_detail_ms_template_price_pv_equipment = this.pvs_detail_ms_template_price_pv_equipment || 0;
        let pvs_detail_ms_template_price_pv_composite = this.pvs_detail_ms_template_price_pv_composite || 0;
        let pvs_detail_ms_template_price_firm = this.pvs_detail_ms_template_price_firm || 0;
        let pvs_detail_ms_template_price_firm_gantry = this.pvs_detail_ms_template_price_firm_gantry || 0;
        let pvs_detail_ms_template_price_firm_equipment = this.pvs_detail_ms_template_price_firm_equipment || 0;
        let pvs_detail_ms_template_price_firm_composite = this.pvs_detail_ms_template_price_firm_composite || 0;
        let pvf_ms = this.pvf_ms || 0;
        let pvf_ht = this.pvf_ht || 0;
        let pvf_blooms = this.pvf_blooms || 0;
        let pvf_billets = this.pvf_billets || 0;
        let pvf_zinc = this.pvf_zinc || 0;
        let pvf_consumer_price_index = this.pvf_consumer_price_index || 0;
        
        let Incoterms = this.Incoterms;
        let tc_payment_terms_picklist = this.tc_payment_terms_picklist;
        let type_of_product = this.type_of_product;
        let pvs_N28 = this.pvs_N28 || 0;
        let pvs_AH35 = this.pvs_AH35 || 0;
        let pvs_AH49 = this.pvs_AH49 || 0;
        let pvs_AH63 = this.pvs_AH63 || 0;
        let pvs_U28 = this.pvs_U28 || 0;
        let pvs_AP35 = this.pvs_AP35 || 0;
        let pvs_AP49 = this.pvs_AP49 || 0;
        let pvs_AP63 = this.pvs_AP63 || 0;
        let tower_project_for_transportation_addition = this.tower_project_for_transportation_addition;

        try { pvt_pv_avg_of_blooms = pvt_price_module == 'IEEMA' ? Math.round(((Number(pvt_pv_blooms || 0) + Number(pvt_pv_billets || 0)) / 2) * 100) / 100 : (pvt_price_module == 'PGCIL' ? Math.round(Number(pvt_pv_blooms || 0) * 100) / 100 : 0); this.pvt_pv_avg_of_blooms = pvt_pv_avg_of_blooms; } catch(e) { console.error(e); this.pvt_pv_avg_of_blooms = 0; }
        try { pvt_pv_rm_cost = Number(pvt_pv_convergence_to_angles || 0) + Number(pvt_pv_avg_of_blooms || 0); this.pvt_pv_rm_cost = pvt_pv_rm_cost; } catch(e) { console.error(e); this.pvt_pv_rm_cost = 0; }
        try { pvt_pv_zinc_value = Math.round((((pvt_pv_610_gsm ? ((Number(pvt_pv_zinc_value_as_IEEMA || 0) * Number(pvt_pv_zinc_consumption_percent || 0)) / 100) : 0) + (pvt_pv_900_gsm ? 5000 : 0) + (pvt_pv_1000_gsm ? 6000 : 0)) * 100)) / 100; this.pvt_pv_zinc_value = pvt_pv_zinc_value; } catch(e) { console.error(e); this.pvt_pv_zinc_value = 0; }
        try { pvt_pv_zinc_value_610 = Math.round((pvt_pv_610_gsm ? ((Number(pvt_pv_zinc_value_as_IEEMA||0) * Number(pvt_pv_zinc_consumption_percent||0))/100) : 0) * 100) / 100; this.pvt_pv_zinc_value_610 = pvt_pv_zinc_value_610; } catch(e) { console.error(e); this.pvt_pv_zinc_value_610 = 0; }
        try { pvt_pv_zinc_value_900 = Math.round((pvt_pv_900_gsm ? (((Number(pvt_pv_zinc_value_as_IEEMA||0) * Number(pvt_pv_zinc_consumption_percent||0))/100) + 5000) : 0) * 100) / 100; this.pvt_pv_zinc_value_900 = pvt_pv_zinc_value_900; } catch(e) { console.error(e); this.pvt_pv_zinc_value_900 = 0; }
        try { pvt_pv_zinc_value_1000 = Math.round((pvt_pv_1000_gsm ? (((Number(pvt_pv_zinc_value_as_IEEMA||0) * Number(pvt_pv_zinc_consumption_percent||0))/100) + 6000) : 0) * 100) / 100; this.pvt_pv_zinc_value_1000 = pvt_pv_zinc_value_1000; } catch(e) { console.error(e); this.pvt_pv_zinc_value_1000 = 0; }
        try { pvt_pv_proto_required = pvt_pv_proto=='YES'? 800 : 0; this.pvt_pv_proto_required = pvt_pv_proto_required; } catch(e) { console.error(e); this.pvt_pv_proto_required = 0; }
        try { pvt_pv_scrap_value = Math.round((((Number(pvt_pv_avg_of_blooms || 0) + Number(pvt_pv_convergence_to_angles || 0)) * Number(pvt_pv_scrap || 0)/100)) * 100) / 100; this.pvt_pv_scrap_value = pvt_pv_scrap_value; } catch(e) { console.error(e); this.pvt_pv_scrap_value = 0; }
        try { pvt_pv_prevailing_rate_of_bank_interest = Number(pvt_G60 || 0) * 100; this.pvt_pv_prevailing_rate_of_bank_interest = pvt_pv_prevailing_rate_of_bank_interest; } catch(e) { console.error(e); this.pvt_pv_prevailing_rate_of_bank_interest = 0; }
        try { pvt_pv_market_price = Number(pvt_pv_avg_of_blooms || 0) + Number(pvt_pv_convergence_to_angles || 0) + Number(pvt_pv_cost_of_production || 0) + ((Number(pvt_pv_zinc_value_as_IEEMA || 0) * Number(pvt_pv_zinc_consumption_percent || 0))/100) ; this.pvt_pv_market_price = pvt_pv_market_price; } catch(e) { console.error(e); this.pvt_pv_market_price = 0; }
        try { pvt_pv_no_of_days = pvt_G61; this.pvt_pv_no_of_days = pvt_pv_no_of_days; } catch(e) { console.error(e); this.pvt_pv_no_of_days = 0; }
        try { pvt_firm_zinc_value = Math.round(((pvt_firm_610_gsm ? ((Number(pvt_firm_zinc_price||0)*Number(pvt_firm_zinc_consumption_percent||0))/100) : 0) + (pvt_firm_900_gsm ? 4000 : 0) + (pvt_firm_1000_gsm ? 6000 : 0)) * 100) / 100; this.pvt_firm_zinc_value = pvt_firm_zinc_value; } catch(e) { console.error(e); this.pvt_firm_zinc_value = 0; }
        try { pvt_firm_zinc_value_610 = Math.round((pvt_firm_610_gsm ? ((Number(pvt_firm_zinc_price||0)*Number(pvt_firm_zinc_consumption_percent||0))/100) : 0) * 100) / 100; this.pvt_firm_zinc_value_610 = pvt_firm_zinc_value_610; } catch(e) { console.error(e); this.pvt_firm_zinc_value_610 = 0; }
        try { pvt_firm_zinc_value_900 = Math.round((pvt_firm_900_gsm ? (((Number(pvt_firm_zinc_price||0)*Number(pvt_firm_zinc_consumption_percent||0))/100) + 4000) : 0) * 100) / 100; this.pvt_firm_zinc_value_900 = pvt_firm_zinc_value_900; } catch(e) { console.error(e); this.pvt_firm_zinc_value_900 = 0; }
        try { pvt_firm_zinc_value_1000 = Math.round((pvt_firm_1000_gsm ? (((Number(pvt_firm_zinc_price||0)*Number(pvt_firm_zinc_consumption_percent||0))/100) + 6000) : 0) * 100) / 100; this.pvt_firm_zinc_value_1000 = pvt_firm_zinc_value_1000; } catch(e) { console.error(e); this.pvt_firm_zinc_value_1000 = 0; }
        try { pvt_firm_scrap_value = Number(pvt_firm_angles||0)*0.015; this.pvt_firm_scrap_value = pvt_firm_scrap_value; } catch(e) { console.error(e); this.pvt_firm_scrap_value = 0; }
        try { pvt_firm_proto_required = pvt_firm_proto=='YES'? 800 : 0; this.pvt_firm_proto_required = pvt_firm_proto_required; } catch(e) { console.error(e); this.pvt_firm_proto_required = 0; }
        try { pvt_firm_prevailing_rate_of_bank_interest = pvt_G60 * 100; this.pvt_firm_prevailing_rate_of_bank_interest = pvt_firm_prevailing_rate_of_bank_interest; } catch(e) { console.error(e); this.pvt_firm_prevailing_rate_of_bank_interest = 0; }
        try { pvt_firm_market_price = Number(pvt_firm_angles || 0) + Number(pvt_firm_cost_of_production || 0) + ((Number(pvt_firm_zinc_price || 0) * Number(pvt_firm_zinc_consumption_percent || 0)) / 100); this.pvt_firm_market_price = pvt_firm_market_price; } catch(e) { console.error(e); this.pvt_firm_market_price = 0; }
        try { pvt_firm_no_of_days = pvt_G61; this.pvt_firm_no_of_days = pvt_firm_no_of_days; } catch(e) { console.error(e); this.pvt_firm_no_of_days = 0; }
        try { pvt_pv_ms610_gsm_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_N5_N12||0) * (1 + Number(pvt_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(pvt_N5_N12||0) * (1 + Number(pvt_pv_margin||0)/100))); this.pvt_pv_ms610_gsm_unit_price = pvt_pv_ms610_gsm_unit_price; } catch(e) { console.error(e); this.pvt_pv_ms610_gsm_unit_price = 0; }
        try { pvt_pv_ms610_gsm_unit_cost =  Number(pvt_pv_ms610_gsm_unit_price || 0) * (1 - Number(pvt_pv_margin||0)/100); this.pvt_pv_ms610_gsm_unit_cost = pvt_pv_ms610_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_pv_ms610_gsm_unit_cost = 0; }
        try { pvt_pv_ms610_gsm_quantity = Number(pvt_ms_quantity_pv||0); this.pvt_pv_ms610_gsm_quantity = pvt_pv_ms610_gsm_quantity; } catch(e) { console.error(e); this.pvt_pv_ms610_gsm_quantity = 0; }
        try { pvt_pv_ht610_gsm_unit_price = (((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_N5_N12||0) * (1 + Number(pvt_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(pvt_N5_N12||0) * (1 + Number(pvt_pv_margin||0)/100))) + Number(pvt_pv_additional_pricing||0)); this.pvt_pv_ht610_gsm_unit_price = pvt_pv_ht610_gsm_unit_price; } catch(e) { console.error(e); this.pvt_pv_ht610_gsm_unit_price = 0; }
        try { pvt_pv_ht610_gsm_unit_cost =  Number(pvt_pv_ht610_gsm_unit_price||0) * (1 - Number(pvt_pv_margin||0)/100); this.pvt_pv_ht610_gsm_unit_cost = pvt_pv_ht610_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_pv_ht610_gsm_unit_cost = 0; }
        try { pvt_pv_ht610_gsm_quantity = Number(pvt_ht_quantity_pv||0); this.pvt_pv_ht610_gsm_quantity = pvt_pv_ht610_gsm_quantity; } catch(e) { console.error(e); this.pvt_pv_ht610_gsm_quantity = 0; }
        try { pvt_pv_ms900_gsm_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_O5_O12||0) * (1 + Number(pvt_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(pvt_O5_O12||0) * (1 + Number(pvt_pv_margin||0)/100)); this.pvt_pv_ms900_gsm_unit_price = pvt_pv_ms900_gsm_unit_price; } catch(e) { console.error(e); this.pvt_pv_ms900_gsm_unit_price = 0; }
        try { pvt_pv_ms900_gsm_unit_cost =  Number(pvt_pv_ms900_gsm_unit_price||0) * (1 - Number(pvt_pv_margin||0)/100); this.pvt_pv_ms900_gsm_unit_cost = pvt_pv_ms900_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_pv_ms900_gsm_unit_cost = 0; }
        try { pvt_pv_ms900_gsm_quantity = Number(pvt_ms_quantity_pv||0); this.pvt_pv_ms900_gsm_quantity = pvt_pv_ms900_gsm_quantity; } catch(e) { console.error(e); this.pvt_pv_ms900_gsm_quantity = 0; }
        try { pvt_pv_ht900_gsm_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_O5_O12||0) * (1 + Number(pvt_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(pvt_O5_O12||0) * (1 + Number(pvt_pv_margin||0)/100))) + Number(pvt_pv_additional_pricing||0); this.pvt_pv_ht900_gsm_unit_price = pvt_pv_ht900_gsm_unit_price; } catch(e) { console.error(e); this.pvt_pv_ht900_gsm_unit_price = 0; }
        try { pvt_pv_ht900_gsm_unit_cost =  Number(pvt_pv_ht900_gsm_unit_price||0) * (1 - Number(pvt_pv_margin||0)/100); this.pvt_pv_ht900_gsm_unit_cost = pvt_pv_ht900_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_pv_ht900_gsm_unit_cost = 0; }
        try { pvt_pv_ht900_gsm_quantity = Number(pvt_ht_quantity_pv||0); this.pvt_pv_ht900_gsm_quantity = pvt_pv_ht900_gsm_quantity; } catch(e) { console.error(e); this.pvt_pv_ht900_gsm_quantity = 0; }
        try { pvt_pv_ms1000_gsm_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_P5_P12||0) * (1 + Number(pvt_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(pvt_P5_P12||0) * (1 + Number(pvt_pv_margin||0)/100)); this.pvt_pv_ms1000_gsm_unit_price = pvt_pv_ms1000_gsm_unit_price; } catch(e) { console.error(e); this.pvt_pv_ms1000_gsm_unit_price = 0; }
        try { pvt_pv_ms1000_gsm_unit_cost =  Number(pvt_pv_ms1000_gsm_unit_price || 0) * (1 - Number(pvt_pv_margin||0)/100); this.pvt_pv_ms1000_gsm_unit_cost = pvt_pv_ms1000_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_pv_ms1000_gsm_unit_cost = 0; }
        try { pvt_pv_ms1000_gsm_quantity = Number(pvt_ms_quantity_pv||0); this.pvt_pv_ms1000_gsm_quantity = pvt_pv_ms1000_gsm_quantity; } catch(e) { console.error(e); this.pvt_pv_ms1000_gsm_quantity = 0; }
        try { pvt_pv_ht1000_gsm_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_P5_P12||0) * (1 + Number(pvt_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(pvt_P5_P12||0) * (1 + Number(pvt_pv_margin||0)/100))) + Number(pvt_pv_additional_pricing||0); this.pvt_pv_ht1000_gsm_unit_price = pvt_pv_ht1000_gsm_unit_price; } catch(e) { console.error(e); this.pvt_pv_ht1000_gsm_unit_price = 0; }
        try { pvt_pv_ht1000_gsm_unit_cost =  Number(pvt_pv_ht1000_gsm_unit_price||0) * (1 - Number(pvt_pv_margin||0)/100); this.pvt_pv_ht1000_gsm_unit_cost = pvt_pv_ht1000_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_pv_ht1000_gsm_unit_cost = 0; }
        try { pvt_pv_ht1000_gsm_quantity = Number(pvt_ht_quantity_pv||0); this.pvt_pv_ht1000_gsm_quantity = pvt_pv_ht1000_gsm_quantity; } catch(e) { console.error(e); this.pvt_pv_ht1000_gsm_quantity = 0; }
        try { pvt_firm_ms610_gsm_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_T6_T13||0) * (1 + Number(pvt_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(pvt_T6_T13||0) * (1 + Number(pvt_firm_margin||0)/100)); this.pvt_firm_ms610_gsm_unit_price = pvt_firm_ms610_gsm_unit_price; } catch(e) { console.error(e); this.pvt_firm_ms610_gsm_unit_price = 0; }
        try { pvt_firm_ms610_gsm_unit_cost =  Number(pvt_firm_ms610_gsm_unit_price||0) * (1 - Number(pvt_firm_margin||0)/100); this.pvt_firm_ms610_gsm_unit_cost = pvt_firm_ms610_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_firm_ms610_gsm_unit_cost = 0; }
        try { pvt_firm_ms610_gsm_quantity = Number(pvt_ms_quantity_firm||0); this.pvt_firm_ms610_gsm_quantity = pvt_firm_ms610_gsm_quantity; } catch(e) { console.error(e); this.pvt_firm_ms610_gsm_quantity = 0; }
        try { pvt_firm_ht610_gsm_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_T6_T13||0) * (1 + Number(pvt_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(pvt_T6_T13||0) * (1 + Number(pvt_firm_margin||0)/100))) + Number(pvt_firm_additional_pricing||0); this.pvt_firm_ht610_gsm_unit_price = pvt_firm_ht610_gsm_unit_price; } catch(e) { console.error(e); this.pvt_firm_ht610_gsm_unit_price = 0; }
        try { pvt_firm_ht610_gsm_unit_cost =  Number(pvt_firm_ht610_gsm_unit_price||0) * (1 - Number(pvt_firm_margin||0)/100); this.pvt_firm_ht610_gsm_unit_cost = pvt_firm_ht610_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_firm_ht610_gsm_unit_cost = 0; }
        try { pvt_firm_ht610_gsm_quantity = Number(pvt_ht_quantity_firm||0); this.pvt_firm_ht610_gsm_quantity = pvt_firm_ht610_gsm_quantity; } catch(e) { console.error(e); this.pvt_firm_ht610_gsm_quantity = 0; }
        try { pvt_firm_ms900_gsm_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_U6_U13||0) * (1 + Number(pvt_firm_margin || 0) / 100)) + Number(pvt_C19||0) : Math.round(Number(pvt_U6_U13||0) * (1 + Number(pvt_firm_margin || 0) / 100)); this.pvt_firm_ms900_gsm_unit_price = pvt_firm_ms900_gsm_unit_price; } catch(e) { console.error(e); this.pvt_firm_ms900_gsm_unit_price = 0; }
        try { pvt_firm_ms900_gsm_unit_cost =  Number(pvt_firm_ms900_gsm_unit_price||0) * (1 - Number(pvt_firm_margin || 0) / 100); this.pvt_firm_ms900_gsm_unit_cost = pvt_firm_ms900_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_firm_ms900_gsm_unit_cost = 0; }
        try { pvt_firm_ms900_gsm_quantity = Number(pvt_ms_quantity_firm||0); this.pvt_firm_ms900_gsm_quantity = pvt_firm_ms900_gsm_quantity; } catch(e) { console.error(e); this.pvt_firm_ms900_gsm_quantity = 0; }
        try { pvt_firm_ht900_gsm_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_U6_U13||0) * (1 + Number(pvt_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(pvt_U6_U13||0) * (1 + Number(pvt_firm_margin||0)/100))) + Number(pvt_firm_additional_pricing||0); this.pvt_firm_ht900_gsm_unit_price = pvt_firm_ht900_gsm_unit_price; } catch(e) { console.error(e); this.pvt_firm_ht900_gsm_unit_price = 0; }
        try { pvt_firm_ht900_gsm_unit_cost =  Number(pvt_firm_ht900_gsm_unit_price||0) * (1 - Number(pvt_firm_margin||0)/100); this.pvt_firm_ht900_gsm_unit_cost = pvt_firm_ht900_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_firm_ht900_gsm_unit_cost = 0; }
        try { pvt_firm_ht900_gsm_quantity = Number(pvt_ht_quantity_firm||0); this.pvt_firm_ht900_gsm_quantity = pvt_firm_ht900_gsm_quantity; } catch(e) { console.error(e); this.pvt_firm_ht900_gsm_quantity = 0; }
        try { pvt_firm_ms1000_gsm_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_V6_V13||0) * (1 + Number(pvt_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(pvt_V6_V13||0) * (1 + Number(pvt_firm_margin||0)/100)); this.pvt_firm_ms1000_gsm_unit_price = pvt_firm_ms1000_gsm_unit_price; } catch(e) { console.error(e); this.pvt_firm_ms1000_gsm_unit_price = 0; }
        try { pvt_firm_ms1000_gsm_unit_cost =  Number(pvt_firm_ms1000_gsm_unit_price||0) * (1 - Number(pvt_firm_margin||0)/100); this.pvt_firm_ms1000_gsm_unit_cost = pvt_firm_ms1000_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_firm_ms1000_gsm_unit_cost = 0; }
        try { pvt_firm_ms1000_gsm_quantity = Number(pvt_ms_quantity_firm||0); this.pvt_firm_ms1000_gsm_quantity = pvt_firm_ms1000_gsm_quantity; } catch(e) { console.error(e); this.pvt_firm_ms1000_gsm_quantity = 0; }
        try { pvt_firm_ht1000_gsm_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(pvt_V6_V13||0) * (1 + Number(pvt_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(pvt_V6_V13||0) * (1 + Number(pvt_firm_margin||0)/100))) + Number(pvt_firm_additional_pricing||0); this.pvt_firm_ht1000_gsm_unit_price = pvt_firm_ht1000_gsm_unit_price; } catch(e) { console.error(e); this.pvt_firm_ht1000_gsm_unit_price = 0; }
        try { pvt_firm_ht1000_gsm_unit_cost =  Number(pvt_firm_ht1000_gsm_unit_price||0) * (1 - Number(pvt_firm_margin||0)/100); this.pvt_firm_ht1000_gsm_unit_cost = pvt_firm_ht1000_gsm_unit_cost; } catch(e) { console.error(e); this.pvt_firm_ht1000_gsm_unit_cost = 0; }
        try { pvt_firm_ht1000_gsm_quantity = Number(pvt_ht_quantity_firm||0); this.pvt_firm_ht1000_gsm_quantity = pvt_firm_ht1000_gsm_quantity; } catch(e) { console.error(e); this.pvt_firm_ht1000_gsm_quantity = 0; }
        try { pvt_N5_N12 = Number(pvt_pv_avg_of_blooms||0) + Number(pvt_pv_convergence_to_angles||0)+ (pvt_pv_610_gsm ? Number(pvt_pv_zinc_value_610||0) : 0) + Number(pvt_pv_scrap_value||0) + Number(pvt_AO31||0) + Number(pvt_pv_interest_component_on_product_cycle||0) + Number(pvt_pv_cost_of_production||0) + Number(pvt_pv_proto_required||0); this.pvt_N5_N12 = pvt_N5_N12; } catch(e) { console.error(e); this.pvt_N5_N12 = 0; }
        try { pvt_O5_O12 = Number(pvt_pv_avg_of_blooms||0) + Number(pvt_pv_convergence_to_angles||0) + (pvt_pv_900_gsm ? Number(pvt_pv_zinc_value_900) : 0) + Number(pvt_pv_scrap_value||0) + Number(pvt_AO31||0) + Number(pvt_pv_interest_component_on_product_cycle||0) + Number(pvt_pv_cost_of_production||0) + Number(pvt_pv_proto_required||0); this.pvt_O5_O12 = pvt_O5_O12; } catch(e) { console.error(e); this.pvt_O5_O12 = 0; }
        try { pvt_P5_P12 = Number(pvt_pv_avg_of_blooms||0)+Number(pvt_pv_convergence_to_angles||0)+(pvt_pv_1000_gsm ? Number(pvt_pv_zinc_value_1000) : 0)+Number(pvt_pv_scrap_value||0)+ Number(pvt_AO31||0)+Number(pvt_pv_interest_component_on_product_cycle||0)+Number(pvt_pv_cost_of_production||0)+Number(pvt_pv_proto_required||0); this.pvt_P5_P12 = pvt_P5_P12; } catch(e) { console.error(e); this.pvt_P5_P12 = 0; }
        try { pvt_T6_T13 = Number(pvt_firm_angles||0)+(pvt_firm_610_gsm ? Number(pvt_firm_zinc_value_610||0) : 0)+Number(pvt_firm_scrap_value||0)+Number(pvt_AW22||0)+Number(pvt_firm_cost_of_production||0)+Number(pvt_firm_interest_component_on_product_cycle||0)+Number(pvt_firm_proto_required||0); this.pvt_T6_T13 = pvt_T6_T13; } catch(e) { console.error(e); this.pvt_T6_T13 = 0; }
        try { pvt_U6_U13 = Number(pvt_firm_angles||0)+(pvt_firm_900_gsm? Number(pvt_firm_zinc_value_900||0):0)+Number(pvt_firm_scrap_value||0)+Number(pvt_AW22||0)+Number(pvt_firm_cost_of_production||0)+Number(pvt_firm_interest_component_on_product_cycle||0)+Number(pvt_firm_proto_required||0); this.pvt_U6_U13 = pvt_U6_U13; } catch(e) { console.error(e); this.pvt_U6_U13 = 0; }
        try { pvt_V6_V13 = Number(pvt_firm_angles||0)+(pvt_firm_1000_gsm ? Number(pvt_firm_zinc_value_1000||0) : 0)+Number(pvt_firm_scrap_value||0)+Number(pvt_AW22||0)+Number(pvt_firm_cost_of_production||0)+Number(pvt_firm_interest_component_on_product_cycle||0)+Number(pvt_firm_proto_required||0); this.pvt_V6_V13 = pvt_V6_V13; } catch(e) { console.error(e); this.pvt_V6_V13 = 0; }
        try { pvt_AW22 = (typeof tc_payment_terms_picklist!=='undefined'&&tc_payment_terms_picklist!==null?(tc_payment_terms_picklist=='Against LC Before Dispatch'?Math.round(Number(pvt_G60||0)*(Number(pvt_firm_angles||0) + (Number(pvt_firm_zinc_price || 0) * (Number(pvt_firm_zinc_consumption_percent || 0)/100)) + Number(pvt_firm_cost_of_production||0))*Number(pvt_G61||0)/365):tc_payment_terms_picklist=='Against VFS'?Math.round((Number(pvt_firm_angles||0) + (Number(pvt_firm_zinc_price || 0) * (Number(pvt_firm_zinc_consumption_percent || 0)/100)) + Number(pvt_firm_cost_of_production||0))*Number(pvt_G60||0)/365*Number(pvt_G61||0)):0):0); this.pvt_AW22 = pvt_AW22; } catch(e) { console.error(e); this.pvt_AW22 = 0; }
        try { pvt_AO31 = (typeof tc_payment_terms_picklist!=='undefined'&&tc_payment_terms_picklist!==null?(tc_payment_terms_picklist=='Against LC Before Dispatch'?Math.round(Number(pvt_G60||0)*(Number(pvt_pv_avg_of_blooms||0) + Number(pvt_pv_convergence_to_angles||0) + (Number(pvt_pv_zinc_value_as_IEEMA || 0) * Number(pvt_pv_zinc_consumption_percent || 0)/100) + Number(pvt_pv_cost_of_production||0))*Number(pvt_G61||0)/365):tc_payment_terms_picklist=='Against VFS'?Math.round((Number(pvt_pv_avg_of_blooms||0) + Number(pvt_pv_convergence_to_angles||0) + (Number(pvt_pv_zinc_value_as_IEEMA || 0) * Number(pvt_pv_zinc_consumption_percent || 0)/100) + Number(pvt_pv_cost_of_production||0))*Number(pvt_G60||0)/365*Number(pvt_G61||0)):0):0); this.pvt_AO31 = pvt_AO31; } catch(e) { console.error(e); this.pvt_AO31 = 0; }
        try { pvt_C19 = (typeof tower_project_for_transportation_addition!=='undefined'&&tower_project_for_transportation_addition!==null?(tower_project_for_transportation_addition=='YES'?0:(Number(minimum_guranteed_freight_1||0)+Number(minimum_guranteed_freight_2||0)+Number(minimum_guranteed_freight_3||0)+Number(minimum_guranteed_freight_4||0)+Number(minimum_guranteed_freight_5||0)+Number(minimum_guranteed_freight_6||0)+Number(minimum_guranteed_freight_7||0)+Number(minimum_guranteed_freight_8||0)+Number(minimum_guranteed_freight_9||0)+Number(minimum_guranteed_freight_10||0)+Number(rate_per_ton_1||0)+Number(rate_per_ton_2||0)+Number(rate_per_ton_3||0)+Number(rate_per_ton_4||0)+Number(rate_per_ton_5||0)+Number(rate_per_ton_6||0)+Number(rate_per_ton_7||0)+Number(rate_per_ton_8||0)+Number(rate_per_ton_9||0)+Number(rate_per_ton_10||0))):0); this.pvt_C19 = pvt_C19; } catch(e) { console.error(e); this.pvt_C19 = 0; }
        try { pvt_G61 = typeof tc_payment_terms_picklist!=='undefined'&&tc_payment_terms_picklist!==null?(tc_payment_terms_picklist=='Against LC Before Dispatch'?(tc_lc_seller_interest_days?tc_lc_seller_interest_days:0):tc_payment_terms_picklist=='Against VFS'?(tc_vfs_seller_interest?tc_vfs_seller_interest:0):0):0; this.pvt_G61 = pvt_G61; } catch(e) { console.error(e); this.pvt_G61 = 0; }
        try { pvt_G60 = typeof tc_payment_terms_picklist!=='undefined'&&tc_payment_terms_picklist!==null?(tc_payment_terms_picklist=='Against LC Before Dispatch'?0.08:(tc_payment_terms_picklist=='Against VFS'?0.079:0)):0; this.pvt_G60 = pvt_G60; } catch(e) { console.error(e); this.pvt_G60 = 0; }
        try { pvt_pv_bank_interest = pvt_AO31; this.pvt_pv_bank_interest = pvt_pv_bank_interest; } catch(e) { console.error(e); this.pvt_pv_bank_interest = 0; }
        try { pvt_firm_bank_interest = pvt_AW22; this.pvt_firm_bank_interest = pvt_firm_bank_interest; } catch(e) { console.error(e); this.pvt_firm_bank_interest = 0; }
        try { pvs_pv_avg_of_blooms = pvs_price_module == 'IEEMA' ? Math.round(((Number(pvs_pv_blooms || 0) + Number(pvs_pv_billets || 0)) / 2) * 100) / 100 : (pvs_price_module == 'PGCIL' ? Math.round(Number(pvs_pv_blooms || 0) * 100) / 100 : ''); this.pvs_pv_avg_of_blooms = pvs_pv_avg_of_blooms; } catch(e) { console.error(e); this.pvs_pv_avg_of_blooms = 0; }
        try { pvs_pv_rm_cost = Number(pvs_pv_conversion_to_angle || 0) + Number(pvs_pv_avg_of_blooms || 0); this.pvs_pv_rm_cost = pvs_pv_rm_cost; } catch(e) { console.error(e); this.pvs_pv_rm_cost = 0; }
        try { pvs_pv_cost_of_production = pvs_composite_structure ? 16000 : pvs_equipment_structure ? 19000 : pvs_gantry_structure ? 13000 : 0; this.pvs_pv_cost_of_production = pvs_pv_cost_of_production; } catch(e) { console.error(e); this.pvs_pv_cost_of_production = 0; }
        try { pvs_pv_zinc_value = Math.round((((pvs_pv_610_gsm ? ((Number(pvs_pv_zinc_value_as_per_ieema || 0) * Number(pvs_pv_zinc_consumption_percent || 0)/ 100)) : 0) + (pvs_pv_900_gsm ? 5000 : 0) + (pvs_pv_1000_gsm ? 6000 : 0)) * 100)) / 100; this.pvs_pv_zinc_value = pvs_pv_zinc_value; } catch(e) { console.error(e); this.pvs_pv_zinc_value = 0; }
        try { pvs_pv_zinc_value_610 = Math.round((pvs_pv_610_gsm ? ((Number(pvs_pv_zinc_value_as_per_ieema||0) * Number(pvs_pv_zinc_consumption_percent||0))/100) : 0) * 100) / 100; this.pvs_pv_zinc_value_610 = pvs_pv_zinc_value_610; } catch(e) { console.error(e); this.pvs_pv_zinc_value_610 = 0; }
        try { pvs_pv_zinc_value_900 = Math.round((pvs_pv_900_gsm ? ((Number(pvs_pv_zinc_value_as_per_ieema || 0) * Number(pvs_pv_zinc_consumption_percent || 0)/ 100) + 5000) : 0) * 100) / 100; this.pvs_pv_zinc_value_900 = pvs_pv_zinc_value_900; } catch(e) { console.error(e); this.pvs_pv_zinc_value_900 = 0; }
        try { pvs_pv_zinc_value_1000 = Math.round((pvs_pv_1000_gsm ? ((Number(pvs_pv_zinc_value_as_per_ieema || 0) * Number(pvs_pv_zinc_consumption_percent || 0)/100) + 6000) : 0) * 100) / 100; this.pvs_pv_zinc_value_1000 = pvs_pv_zinc_value_1000; } catch(e) { console.error(e); this.pvs_pv_zinc_value_1000 = 0; }
        try { pvs_pv_cost_of_production_gantry = pvs_gantry_structure ? 13000 : 0; this.pvs_pv_cost_of_production_gantry = pvs_pv_cost_of_production_gantry; } catch(e) { console.error(e); this.pvs_pv_cost_of_production_gantry = 0; }
        try { pvs_pv_cost_of_production_equipment = pvs_equipment_structure ? 19000 : 0; this.pvs_pv_cost_of_production_equipment = pvs_pv_cost_of_production_equipment; } catch(e) { console.error(e); this.pvs_pv_cost_of_production_equipment = 0; }
        try { pvs_pv_cost_of_production_composite = pvs_composite_structure ? 16000 : 0; this.pvs_pv_cost_of_production_composite = pvs_pv_cost_of_production_composite; } catch(e) { console.error(e); this.pvs_pv_cost_of_production_composite = 0; }
        try { pvs_pv_proto_required = pvs_pv_proto==='YES'?800:0; this.pvs_pv_proto_required = pvs_pv_proto_required; } catch(e) { console.error(e); this.pvs_pv_proto_required = 0; }
        try { pvs_pv_scrap_value = Math.round(((Number(pvs_pv_conversion_to_angle || 0) + Number(pvs_pv_avg_of_blooms || 0)) * (Number(pvs_pv_scrap || 0) / 100)) * 100) / 100; this.pvs_pv_scrap_value = pvs_pv_scrap_value; } catch(e) { console.error(e); this.pvs_pv_scrap_value = 0; }
        try { pvs_pv_prevailing_rate_of_bank_interest = pvs_G60 * 100; this.pvs_pv_prevailing_rate_of_bank_interest = pvs_pv_prevailing_rate_of_bank_interest; } catch(e) { console.error(e); this.pvs_pv_prevailing_rate_of_bank_interest = 0; }
        try { pvs_pv_market_price = Math.round((Number(pvs_pv_avg_of_blooms || 0) + Number(pvs_pv_conversion_to_angle || 0) + 9000 + (Number(pvs_pv_zinc_value_as_per_ieema || 0) * Number(pvs_pv_zinc_consumption_percent || 0) / 100)) * 100) / 100; this.pvs_pv_market_price = pvs_pv_market_price; } catch(e) { console.error(e); this.pvs_pv_market_price = 0; }
        try { pvs_pv_no_of_days = pvs_G61; this.pvs_pv_no_of_days = pvs_pv_no_of_days; } catch(e) { console.error(e); this.pvs_pv_no_of_days = 0; }
        try { pvs_firm_zinc_value = Math.round((((pvs_firm_610_gsm ? (Number(pvs_firm_zinc_price || 0) * (Number(pvs_firm_zinc_consumption_percent || 0) / 100)) : 0) + (pvs_firm_900_gsm ? 4000 : 0) + (pvs_firm_1000_gsm ? 6000 : 0)) * 100)) / 100; this.pvs_firm_zinc_value = pvs_firm_zinc_value; } catch(e) { console.error(e); this.pvs_firm_zinc_value = 0; }
        try { pvs_firm_zinc_value_610 = Math.round((pvs_firm_610_gsm ? (Number(pvs_firm_zinc_price || 0) * (Number(pvs_firm_zinc_consumption_percent || 0) / 100)) : 0) * 100) / 100; this.pvs_firm_zinc_value_610 = pvs_firm_zinc_value_610; } catch(e) { console.error(e); this.pvs_firm_zinc_value_610 = 0; }
        try { pvs_firm_zinc_value_900 = Math.round((pvs_firm_900_gsm ? ((Number(pvs_firm_zinc_price || 0) * (Number(pvs_firm_zinc_consumption_percent || 0) / 100)) + 4000) : 0) * 100) / 100; this.pvs_firm_zinc_value_900 = pvs_firm_zinc_value_900; } catch(e) { console.error(e); this.pvs_firm_zinc_value_900 = 0; }
        try { pvs_firm_zinc_value_1000 = Math.round((pvs_firm_1000_gsm ? ((Number(pvs_firm_zinc_price || 0) * (Number(pvs_firm_zinc_consumption_percent || 0) / 100)) + 6000) : 0) * 100) / 100; this.pvs_firm_zinc_value_1000 = pvs_firm_zinc_value_1000; } catch(e) { console.error(e); this.pvs_firm_zinc_value_1000 = 0; }
        try { pvs_firm_cost_of_production = pvs_composite_structure ? 16000 : pvs_equipment_structure ? 19000 : pvs_gantry_structure ? 13000 : 0; this.pvs_firm_cost_of_production = pvs_firm_cost_of_production; } catch(e) { console.error(e); this.pvs_firm_cost_of_production = 0; }
        try { pvs_firm_cost_of_production_gantry = pvs_gantry_structure ? 13000 : 0; this.pvs_firm_cost_of_production_gantry = pvs_firm_cost_of_production_gantry; } catch(e) { console.error(e); this.pvs_firm_cost_of_production_gantry = 0; }
        try { pvs_firm_cost_of_production_equipment = pvs_equipment_structure ? 19000 : 0; this.pvs_firm_cost_of_production_equipment = pvs_firm_cost_of_production_equipment; } catch(e) { console.error(e); this.pvs_firm_cost_of_production_equipment = 0; }
        try { pvs_firm_cost_of_production_composite = pvs_composite_structure ? 16000 : 0; this.pvs_firm_cost_of_production_composite = pvs_firm_cost_of_production_composite; } catch(e) { console.error(e); this.pvs_firm_cost_of_production_composite = 0; }
        try { pvs_firm_scrap_value = Math.round((Number(pvs_firm_angles || 0) * 1.5 / 100) * 100) / 100; this.pvs_firm_scrap_value = pvs_firm_scrap_value; } catch(e) { console.error(e); this.pvs_firm_scrap_value = 0; }
        try { pvs_firm_proto_required = pvs_firm_proto==='YES'?800:0; this.pvs_firm_proto_required = pvs_firm_proto_required; } catch(e) { console.error(e); this.pvs_firm_proto_required = 0; }
        try { pvs_firm_prevailing_rate_of_bank_interest = pvs_G60 * 100; this.pvs_firm_prevailing_rate_of_bank_interest = pvs_firm_prevailing_rate_of_bank_interest; } catch(e) { console.error(e); this.pvs_firm_prevailing_rate_of_bank_interest = 0; }
        try { pvs_firm_market_price = Math.round((Number(pvs_firm_angles || 0) + Number(pvs_firm_cost_of_production || 0) + (Number(pvs_firm_zinc_price || 0) * (Number(pvs_firm_zinc_consumption_percent || 0) / 100))) * 100) / 100; this.pvs_firm_market_price = pvs_firm_market_price; } catch(e) { console.error(e); this.pvs_firm_market_price = 0; }
        try { pvs_firm_no_of_days = pvs_G61; this.pvs_firm_no_of_days = pvs_firm_no_of_days; } catch(e) { console.error(e); this.pvs_firm_no_of_days = 0; }
        try { pvs_pv_gantry_ms610_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE27||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE27||0) * (1 + Number(pvs_pv_margin||0)/100)); this.pvs_pv_gantry_ms610_unit_price = pvs_pv_gantry_ms610_unit_price; } catch(e) { console.error(e); this.pvs_pv_gantry_ms610_unit_price = 0; }
        try { pvs_pv_gantry_ms610_unit_cost =  Number(pvs_pv_gantry_ms610_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_gantry_ms610_unit_cost = pvs_pv_gantry_ms610_unit_cost; } catch(e) { console.error(e); this.pvs_pv_gantry_ms610_unit_cost = 0; }
        try { pvs_pv_gantry_ms610_gsm_quantity = Number(pvs_gantry_structure_ms_quantity1||0); this.pvs_pv_gantry_ms610_gsm_quantity = pvs_pv_gantry_ms610_gsm_quantity; } catch(e) { console.error(e); this.pvs_pv_gantry_ms610_gsm_quantity = 0; }
        try { pvs_pv_gantry_ht610_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE27||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE27||0) * (1 + Number(pvs_pv_margin||0)/100))) + Number(pvs_pv_additional_pricing||0); this.pvs_pv_gantry_ht610_unit_price = pvs_pv_gantry_ht610_unit_price; } catch(e) { console.error(e); this.pvs_pv_gantry_ht610_unit_price = 0; }
        try { pvs_pv_gantry_ht610_unit_cost =  Number(pvs_pv_gantry_ht610_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_gantry_ht610_unit_cost = pvs_pv_gantry_ht610_unit_cost; } catch(e) { console.error(e); this.pvs_pv_gantry_ht610_unit_cost = 0; }
        try { pvs_pv_gantry_ht610_quantity = Number(pvs_gantry_structure_ht_quantity1||0); this.pvs_pv_gantry_ht610_quantity = pvs_pv_gantry_ht610_quantity; } catch(e) { console.error(e); this.pvs_pv_gantry_ht610_quantity = 0; }
        try { pvs_pv_gantry_ms900_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE70||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE70||0) * (1 + Number(pvs_pv_margin||0)/100)); this.pvs_pv_gantry_ms900_unit_price = pvs_pv_gantry_ms900_unit_price; } catch(e) { console.error(e); this.pvs_pv_gantry_ms900_unit_price = 0; }
        try { pvs_pv_gantry_ms900_unit_cost =  Number(pvs_pv_gantry_ms900_unit_price || 0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_gantry_ms900_unit_cost = pvs_pv_gantry_ms900_unit_cost; } catch(e) { console.error(e); this.pvs_pv_gantry_ms900_unit_cost = 0; }
        try { pvs_pv_gantry_ms900_gsm_quantity = Number(pvs_gantry_structure_ms_quantity1||0); this.pvs_pv_gantry_ms900_gsm_quantity = pvs_pv_gantry_ms900_gsm_quantity; } catch(e) { console.error(e); this.pvs_pv_gantry_ms900_gsm_quantity = 0; }
        try { pvs_pv_gantry_ht900_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE70||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE70||0) * (1 + Number(pvs_pv_margin||0)/100))) + Number(pvs_pv_additional_pricing||0); this.pvs_pv_gantry_ht900_unit_price = pvs_pv_gantry_ht900_unit_price; } catch(e) { console.error(e); this.pvs_pv_gantry_ht900_unit_price = 0; }
        try { pvs_pv_gantry_ht900_unit_cost = Number(pvs_pv_gantry_ht900_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_gantry_ht900_unit_cost = pvs_pv_gantry_ht900_unit_cost; } catch(e) { console.error(e); this.pvs_pv_gantry_ht900_unit_cost = 0; }
        try { pvs_pv_gantry_ht900_quantity = Number(pvs_gantry_structure_ht_quantity1||0); this.pvs_pv_gantry_ht900_quantity = pvs_pv_gantry_ht900_quantity; } catch(e) { console.error(e); this.pvs_pv_gantry_ht900_quantity = 0; }
        try { pvs_pv_gantry_ms1000_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE113||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE113||0) * (1 + Number(pvs_pv_margin||0)/100)); this.pvs_pv_gantry_ms1000_unit_price = pvs_pv_gantry_ms1000_unit_price; } catch(e) { console.error(e); this.pvs_pv_gantry_ms1000_unit_price = 0; }
        try { pvs_pv_gantry_ms1000_unit_cost =  Number(pvs_pv_gantry_ms1000_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_gantry_ms1000_unit_cost = pvs_pv_gantry_ms1000_unit_cost; } catch(e) { console.error(e); this.pvs_pv_gantry_ms1000_unit_cost = 0; }
        try { pvs_pv_gantry_ms1000_gsm_quantity = Number(pvs_gantry_structure_ms_quantity1||0); this.pvs_pv_gantry_ms1000_gsm_quantity = pvs_pv_gantry_ms1000_gsm_quantity; } catch(e) { console.error(e); this.pvs_pv_gantry_ms1000_gsm_quantity = 0; }
        try { pvs_pv_gantry_ht1000_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE113||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE113||0) * (1 + Number(pvs_pv_margin||0)/100))) + Number(pvs_pv_additional_pricing||0); this.pvs_pv_gantry_ht1000_unit_price = pvs_pv_gantry_ht1000_unit_price; } catch(e) { console.error(e); this.pvs_pv_gantry_ht1000_unit_price = 0; }
        try { pvs_pv_gantry_ht1000_unit_cost =  Number(pvs_pv_gantry_ht1000_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_gantry_ht1000_unit_cost = pvs_pv_gantry_ht1000_unit_cost; } catch(e) { console.error(e); this.pvs_pv_gantry_ht1000_unit_cost = 0; }
        try { pvs_pv_gantry_ht1000_quantity = Number(pvs_gantry_structure_ht_quantity1||0); this.pvs_pv_gantry_ht1000_quantity = pvs_pv_gantry_ht1000_quantity; } catch(e) { console.error(e); this.pvs_pv_gantry_ht1000_quantity = 0; }
        try { pvs_pv_equipment_ms610_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE41||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE41||0) * (1 + Number(pvs_pv_margin||0)/100)); this.pvs_pv_equipment_ms610_unit_price = pvs_pv_equipment_ms610_unit_price; } catch(e) { console.error(e); this.pvs_pv_equipment_ms610_unit_price = 0; }
        try { pvs_pv_equipment_ms610_unit_cost =  Number(pvs_pv_equipment_ms610_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_equipment_ms610_unit_cost = pvs_pv_equipment_ms610_unit_cost; } catch(e) { console.error(e); this.pvs_pv_equipment_ms610_unit_cost = 0; }
        try { pvs_pv_equipment_ms610_gsm_quantity = Number(pvs_equipment_structure_ms_quantity2||0); this.pvs_pv_equipment_ms610_gsm_quantity = pvs_pv_equipment_ms610_gsm_quantity; } catch(e) { console.error(e); this.pvs_pv_equipment_ms610_gsm_quantity = 0; }
        try { pvs_pv_equipment_ht610_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE41||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE41||0) * (1 + Number(pvs_pv_margin||0)/100))) + Number(pvs_pv_additional_pricing||0); this.pvs_pv_equipment_ht610_unit_price = pvs_pv_equipment_ht610_unit_price; } catch(e) { console.error(e); this.pvs_pv_equipment_ht610_unit_price = 0; }
        try { pvs_pv_equipment_ht610_unit_cost =  Number(pvs_pv_equipment_ht610_unit_price || 0)* (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_equipment_ht610_unit_cost = pvs_pv_equipment_ht610_unit_cost; } catch(e) { console.error(e); this.pvs_pv_equipment_ht610_unit_cost = 0; }
        try { pvs_pv_equipment_ht610_quantity = Number(pvs_equipment_structure_ht_quantity2||0); this.pvs_pv_equipment_ht610_quantity = pvs_pv_equipment_ht610_quantity; } catch(e) { console.error(e); this.pvs_pv_equipment_ht610_quantity = 0; }
        try { pvs_pv_equipment_ms900_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE84||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE84||0) * (1 + Number(pvs_pv_margin||0)/100)); this.pvs_pv_equipment_ms900_unit_price = pvs_pv_equipment_ms900_unit_price; } catch(e) { console.error(e); this.pvs_pv_equipment_ms900_unit_price = 0; }
        try { pvs_pv_equipment_ms900_unit_cost =  Number(pvs_pv_equipment_ms900_unit_price || 0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_equipment_ms900_unit_cost = pvs_pv_equipment_ms900_unit_cost; } catch(e) { console.error(e); this.pvs_pv_equipment_ms900_unit_cost = 0; }
        try { pvs_pv_equipment_ms900_gsm_quantity = Number(pvs_equipment_structure_ms_quantity2||0); this.pvs_pv_equipment_ms900_gsm_quantity = pvs_pv_equipment_ms900_gsm_quantity; } catch(e) { console.error(e); this.pvs_pv_equipment_ms900_gsm_quantity = 0; }
        try { pvs_pv_equipment_ht900_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE84||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE84||0) * (1 + Number(pvs_pv_margin||0)/100))) + Number(pvs_pv_additional_pricing||0); this.pvs_pv_equipment_ht900_unit_price = pvs_pv_equipment_ht900_unit_price; } catch(e) { console.error(e); this.pvs_pv_equipment_ht900_unit_price = 0; }
        try { pvs_pv_equipment_ht900_unit_cost =  Number(pvs_pv_equipment_ht900_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_equipment_ht900_unit_cost = pvs_pv_equipment_ht900_unit_cost; } catch(e) { console.error(e); this.pvs_pv_equipment_ht900_unit_cost = 0; }
        try { pvs_pv_equipment_ht900_quantity = Number(pvs_equipment_structure_ht_quantity2||0); this.pvs_pv_equipment_ht900_quantity = pvs_pv_equipment_ht900_quantity; } catch(e) { console.error(e); this.pvs_pv_equipment_ht900_quantity = 0; }
        try { pvs_pv_equipment_ms1000_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE127||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE127||0) * (1 + Number(pvs_pv_margin||0)/100)); this.pvs_pv_equipment_ms1000_unit_price = pvs_pv_equipment_ms1000_unit_price; } catch(e) { console.error(e); this.pvs_pv_equipment_ms1000_unit_price = 0; }
        try { pvs_pv_equipment_ms1000_unit_cost = Number(pvs_pv_equipment_ms1000_unit_price||0)  * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_equipment_ms1000_unit_cost = pvs_pv_equipment_ms1000_unit_cost; } catch(e) { console.error(e); this.pvs_pv_equipment_ms1000_unit_cost = 0; }
        try { pvs_pv_equipment_ms1000_gsm_quantity = Number(pvs_equipment_structure_ms_quantity2||0); this.pvs_pv_equipment_ms1000_gsm_quantity = pvs_pv_equipment_ms1000_gsm_quantity; } catch(e) { console.error(e); this.pvs_pv_equipment_ms1000_gsm_quantity = 0; }
        try { pvs_pv_equipment_ht1000_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE127||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE127||0) * (1 + Number(pvs_pv_margin||0)/100))) + Number(pvs_pv_additional_pricing||0); this.pvs_pv_equipment_ht1000_unit_price = pvs_pv_equipment_ht1000_unit_price; } catch(e) { console.error(e); this.pvs_pv_equipment_ht1000_unit_price = 0; }
        try { pvs_pv_equipment_ht1000_unit_cost = Number(pvs_pv_equipment_ht1000_unit_price) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_equipment_ht1000_unit_cost = pvs_pv_equipment_ht1000_unit_cost; } catch(e) { console.error(e); this.pvs_pv_equipment_ht1000_unit_cost = 0; }
        try { pvs_pv_equipment_ht1000_quantity = Number(pvs_equipment_structure_ht_quantity2||0); this.pvs_pv_equipment_ht1000_quantity = pvs_pv_equipment_ht1000_quantity; } catch(e) { console.error(e); this.pvs_pv_equipment_ht1000_quantity = 0; }
        try { pvs_pv_composite_ms610_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE55||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE55||0) * (1 + Number(pvs_pv_margin||0)/100)); this.pvs_pv_composite_ms610_unit_price = pvs_pv_composite_ms610_unit_price; } catch(e) { console.error(e); this.pvs_pv_composite_ms610_unit_price = 0; }
        try { pvs_pv_composite_ms610_unit_cost = Number(pvs_pv_composite_ms610_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_composite_ms610_unit_cost = pvs_pv_composite_ms610_unit_cost; } catch(e) { console.error(e); this.pvs_pv_composite_ms610_unit_cost = 0; }
        try { pvs_pv_composite_ms610_gsm_quantity = Number(pvs_composite_structure_ms_quantity3||0); this.pvs_pv_composite_ms610_gsm_quantity = pvs_pv_composite_ms610_gsm_quantity; } catch(e) { console.error(e); this.pvs_pv_composite_ms610_gsm_quantity = 0; }
        try { pvs_pv_composite_ht610_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE55||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE55||0) * (1 + Number(pvs_pv_margin||0)/100))) + Number(pvs_pv_additional_pricing||0); this.pvs_pv_composite_ht610_unit_price = pvs_pv_composite_ht610_unit_price; } catch(e) { console.error(e); this.pvs_pv_composite_ht610_unit_price = 0; }
        try { pvs_pv_composite_ht610_unit_cost = Number(pvs_pv_composite_ht610_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_composite_ht610_unit_cost = pvs_pv_composite_ht610_unit_cost; } catch(e) { console.error(e); this.pvs_pv_composite_ht610_unit_cost = 0; }
        try { pvs_pv_composite_ht610_quantity = Number(pvs_composite_structure_ht_quantity3||0); this.pvs_pv_composite_ht610_quantity = pvs_pv_composite_ht610_quantity; } catch(e) { console.error(e); this.pvs_pv_composite_ht610_quantity = 0; }
        try { pvs_pv_composite_ms900_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE98||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE98||0) * (1 + Number(pvs_pv_margin||0)/100)); this.pvs_pv_composite_ms900_unit_price = pvs_pv_composite_ms900_unit_price; } catch(e) { console.error(e); this.pvs_pv_composite_ms900_unit_price = 0; }
        try { pvs_pv_composite_ms900_unit_cost =  Number(pvs_pv_composite_ms900_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_composite_ms900_unit_cost = pvs_pv_composite_ms900_unit_cost; } catch(e) { console.error(e); this.pvs_pv_composite_ms900_unit_cost = 0; }
        try { pvs_pv_composite_ms900_gsm_quantity = Number(pvs_composite_structure_ms_quantity3||0); this.pvs_pv_composite_ms900_gsm_quantity = pvs_pv_composite_ms900_gsm_quantity; } catch(e) { console.error(e); this.pvs_pv_composite_ms900_gsm_quantity = 0; }
        try { pvs_pv_composite_ht900_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE98||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE98||0) * (1 + Number(pvs_pv_margin||0)/100))) + Number(pvs_pv_additional_pricing||0); this.pvs_pv_composite_ht900_unit_price = pvs_pv_composite_ht900_unit_price; } catch(e) { console.error(e); this.pvs_pv_composite_ht900_unit_price = 0; }
        try { pvs_pv_composite_ht900_unit_cost = Number(pvs_pv_composite_ht900_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_composite_ht900_unit_cost = pvs_pv_composite_ht900_unit_cost; } catch(e) { console.error(e); this.pvs_pv_composite_ht900_unit_cost = 0; }
        try { pvs_pv_composite_ht900_quantity = Number(pvs_composite_structure_ht_quantity3||0); this.pvs_pv_composite_ht900_quantity = pvs_pv_composite_ht900_quantity; } catch(e) { console.error(e); this.pvs_pv_composite_ht900_quantity = 0; }
        try { pvs_pv_composite_ms1000_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE141||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE141||0) * (1 + Number(pvs_pv_margin||0)/100)); this.pvs_pv_composite_ms1000_unit_price = pvs_pv_composite_ms1000_unit_price; } catch(e) { console.error(e); this.pvs_pv_composite_ms1000_unit_price = 0; }
        try { pvs_pv_composite_ms1000_unit_cost = Number(pvs_pv_composite_ms1000_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_composite_ms1000_unit_cost = pvs_pv_composite_ms1000_unit_cost; } catch(e) { console.error(e); this.pvs_pv_composite_ms1000_unit_cost = 0; }
        try { pvs_pv_composite_ms1000_gsm_quantity = Number(pvs_composite_structure_ms_quantity3||0); this.pvs_pv_composite_ms1000_gsm_quantity = pvs_pv_composite_ms1000_gsm_quantity; } catch(e) { console.error(e); this.pvs_pv_composite_ms1000_gsm_quantity = 0; }
        try { pvs_pv_composite_ht1000_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AE141||0) * (1 + Number(pvs_pv_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AE141||0) * (1 + Number(pvs_pv_margin||0)/100))) + Number(pvs_pv_additional_pricing||0); this.pvs_pv_composite_ht1000_unit_price = pvs_pv_composite_ht1000_unit_price; } catch(e) { console.error(e); this.pvs_pv_composite_ht1000_unit_price = 0; }
        try { pvs_pv_composite_ht1000_unit_cost =  Number(pvs_pv_composite_ht1000_unit_price||0) * (1 - Number(pvs_pv_margin||0)/100); this.pvs_pv_composite_ht1000_unit_cost = pvs_pv_composite_ht1000_unit_cost; } catch(e) { console.error(e); this.pvs_pv_composite_ht1000_unit_cost = 0; }
        try { pvs_pv_composite_ht1000_quantity = Number(pvs_composite_structure_ht_quantity3||0); this.pvs_pv_composite_ht1000_quantity = pvs_pv_composite_ht1000_quantity; } catch(e) { console.error(e); this.pvs_pv_composite_ht1000_quantity = 0; }
        try { pvs_firm_gantry_ms610_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM27||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM27||0) * (1 + Number(pvs_firm_margin||0)/100)); this.pvs_firm_gantry_ms610_unit_price = pvs_firm_gantry_ms610_unit_price; } catch(e) { console.error(e); this.pvs_firm_gantry_ms610_unit_price = 0; }
        try { pvs_firm_gantry_ms610_unit_cost = Number(pvs_firm_gantry_ms610_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_gantry_ms610_unit_cost = pvs_firm_gantry_ms610_unit_cost; } catch(e) { console.error(e); this.pvs_firm_gantry_ms610_unit_cost = 0; }
        try { pvs_firm_gantry_ms610_gsm_quantity = Number(pvs_gantry_structure_ms_quantity1||0); this.pvs_firm_gantry_ms610_gsm_quantity = pvs_firm_gantry_ms610_gsm_quantity; } catch(e) { console.error(e); this.pvs_firm_gantry_ms610_gsm_quantity = 0; }
        try { pvs_firm_gantry_ht610_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM27||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM27||0) * (1 + Number(pvs_firm_margin||0)/100))) + Number(pvs_firm_additional_pricing||0); this.pvs_firm_gantry_ht610_unit_price = pvs_firm_gantry_ht610_unit_price; } catch(e) { console.error(e); this.pvs_firm_gantry_ht610_unit_price = 0; }
        try { pvs_firm_gantry_ht610_unit_cost =  Number(pvs_firm_gantry_ht610_unit_price) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_gantry_ht610_unit_cost = pvs_firm_gantry_ht610_unit_cost; } catch(e) { console.error(e); this.pvs_firm_gantry_ht610_unit_cost = 0; }
        try { pvs_firm_gantry_ht610_quantity = Number(pvs_gantry_structure_ht_quantity1||0); this.pvs_firm_gantry_ht610_quantity = pvs_firm_gantry_ht610_quantity; } catch(e) { console.error(e); this.pvs_firm_gantry_ht610_quantity = 0; }
        try { pvs_firm_gantry_ms900_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM70||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM70||0) * (1 + Number(pvs_firm_margin||0)/100)); this.pvs_firm_gantry_ms900_unit_price = pvs_firm_gantry_ms900_unit_price; } catch(e) { console.error(e); this.pvs_firm_gantry_ms900_unit_price = 0; }
        try { pvs_firm_gantry_ms900_unit_cost = Number(pvs_firm_gantry_ms900_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_gantry_ms900_unit_cost = pvs_firm_gantry_ms900_unit_cost; } catch(e) { console.error(e); this.pvs_firm_gantry_ms900_unit_cost = 0; }
        try { pvs_firm_gantry_ms900_gsm_quantity = Number(pvs_gantry_structure_ms_quantity1||0); this.pvs_firm_gantry_ms900_gsm_quantity = pvs_firm_gantry_ms900_gsm_quantity; } catch(e) { console.error(e); this.pvs_firm_gantry_ms900_gsm_quantity = 0; }
        try { pvs_firm_gantry_ht900_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM70||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM70||0) * (1 + Number(pvs_firm_margin||0)/100))) + Number(pvs_firm_additional_pricing||0); this.pvs_firm_gantry_ht900_unit_price = pvs_firm_gantry_ht900_unit_price; } catch(e) { console.error(e); this.pvs_firm_gantry_ht900_unit_price = 0; }
        try { pvs_firm_gantry_ht900_unit_cost = Number(pvs_firm_gantry_ht900_unit_price) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_gantry_ht900_unit_cost = pvs_firm_gantry_ht900_unit_cost; } catch(e) { console.error(e); this.pvs_firm_gantry_ht900_unit_cost = 0; }
        try { pvs_firm_gantry_ht900_quantity = Number(pvs_gantry_structure_ht_quantity1||0); this.pvs_firm_gantry_ht900_quantity = pvs_firm_gantry_ht900_quantity; } catch(e) { console.error(e); this.pvs_firm_gantry_ht900_quantity = 0; }
        try { pvs_firm_gantry_ms1000_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM113||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM113||0) * (1 + Number(pvs_firm_margin||0)/100)); this.pvs_firm_gantry_ms1000_unit_price = pvs_firm_gantry_ms1000_unit_price; } catch(e) { console.error(e); this.pvs_firm_gantry_ms1000_unit_price = 0; }
        try { pvs_firm_gantry_ms1000_unit_cost =  Number(pvs_firm_gantry_ms1000_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_gantry_ms1000_unit_cost = pvs_firm_gantry_ms1000_unit_cost; } catch(e) { console.error(e); this.pvs_firm_gantry_ms1000_unit_cost = 0; }
        try { pvs_firm_gantry_ms1000_gsm_quantity = Number(pvs_gantry_structure_ms_quantity1||0); this.pvs_firm_gantry_ms1000_gsm_quantity = pvs_firm_gantry_ms1000_gsm_quantity; } catch(e) { console.error(e); this.pvs_firm_gantry_ms1000_gsm_quantity = 0; }
        try { pvs_firm_gantry_ht1000_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM113||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM113||0) * (1 + Number(pvs_firm_margin||0)/100))) + Number(pvs_firm_additional_pricing||0); this.pvs_firm_gantry_ht1000_unit_price = pvs_firm_gantry_ht1000_unit_price; } catch(e) { console.error(e); this.pvs_firm_gantry_ht1000_unit_price = 0; }
        try { pvs_firm_gantry_ht1000_unit_cost = Number(pvs_firm_gantry_ht1000_unit_price||0)* (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_gantry_ht1000_unit_cost = pvs_firm_gantry_ht1000_unit_cost; } catch(e) { console.error(e); this.pvs_firm_gantry_ht1000_unit_cost = 0; }
        try { pvs_firm_gantry_ht1000_quantity = Number(pvs_gantry_structure_ht_quantity1||0); this.pvs_firm_gantry_ht1000_quantity = pvs_firm_gantry_ht1000_quantity; } catch(e) { console.error(e); this.pvs_firm_gantry_ht1000_quantity = 0; }
        try { pvs_firm_equipment_ms610_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM41||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM41||0) * (1 + Number(pvs_firm_margin||0)/100)); this.pvs_firm_equipment_ms610_unit_price = pvs_firm_equipment_ms610_unit_price; } catch(e) { console.error(e); this.pvs_firm_equipment_ms610_unit_price = 0; }
        try { pvs_firm_equipment_ms610_unit_cost =  Number(pvs_firm_equipment_ms610_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_equipment_ms610_unit_cost = pvs_firm_equipment_ms610_unit_cost; } catch(e) { console.error(e); this.pvs_firm_equipment_ms610_unit_cost = 0; }
        try { pvs_firm_equipment_ms610_gsm_quantity = Number(pvs_equipment_structure_ms_quantity2||0); this.pvs_firm_equipment_ms610_gsm_quantity = pvs_firm_equipment_ms610_gsm_quantity; } catch(e) { console.error(e); this.pvs_firm_equipment_ms610_gsm_quantity = 0; }
        try { pvs_firm_equipment_ht610_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM41||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM41||0) * (1 + Number(pvs_firm_margin||0)/100))) + Number(pvs_firm_additional_pricing||0); this.pvs_firm_equipment_ht610_unit_price = pvs_firm_equipment_ht610_unit_price; } catch(e) { console.error(e); this.pvs_firm_equipment_ht610_unit_price = 0; }
        try { pvs_firm_equipment_ht610_unit_cost =  Number(pvs_firm_equipment_ht610_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_equipment_ht610_unit_cost = pvs_firm_equipment_ht610_unit_cost; } catch(e) { console.error(e); this.pvs_firm_equipment_ht610_unit_cost = 0; }
        try { pvs_firm_equipment_ht610_quantity = Number(pvs_equipment_structure_ht_quantity2||0); this.pvs_firm_equipment_ht610_quantity = pvs_firm_equipment_ht610_quantity; } catch(e) { console.error(e); this.pvs_firm_equipment_ht610_quantity = 0; }
        try { pvs_FIRM_equipment_ms900_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM84||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM84||0) * (1 + Number(pvs_firm_margin||0)/100)); this.pvs_FIRM_equipment_ms900_unit_price = pvs_FIRM_equipment_ms900_unit_price; } catch(e) { console.error(e); this.pvs_FIRM_equipment_ms900_unit_price = 0; }
        try { pvs_FIRM_equipment_ms900_unit_cost =  Number(pvs_FIRM_equipment_ms900_unit_price) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_FIRM_equipment_ms900_unit_cost = pvs_FIRM_equipment_ms900_unit_cost; } catch(e) { console.error(e); this.pvs_FIRM_equipment_ms900_unit_cost = 0; }
        try { pvs_firm_equipment_ms900_gsm_quantity = Number(pvs_equipment_structure_ms_quantity2||0); this.pvs_firm_equipment_ms900_gsm_quantity = pvs_firm_equipment_ms900_gsm_quantity; } catch(e) { console.error(e); this.pvs_firm_equipment_ms900_gsm_quantity = 0; }
        try { pvs_firm_equipment_ht900_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM84||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM84||0) * (1 + Number(pvs_firm_margin||0)/100))) + Number(pvs_firm_additional_pricing||0); this.pvs_firm_equipment_ht900_unit_price = pvs_firm_equipment_ht900_unit_price; } catch(e) { console.error(e); this.pvs_firm_equipment_ht900_unit_price = 0; }
        try { pvs_firm_equipment_ht900_unit_cost =  Number(pvs_firm_equipment_ht900_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_equipment_ht900_unit_cost = pvs_firm_equipment_ht900_unit_cost; } catch(e) { console.error(e); this.pvs_firm_equipment_ht900_unit_cost = 0; }
        try { pvs_firm_equipment_ht900_quantity = Number(pvs_equipment_structure_ht_quantity2||0); this.pvs_firm_equipment_ht900_quantity = pvs_firm_equipment_ht900_quantity; } catch(e) { console.error(e); this.pvs_firm_equipment_ht900_quantity = 0; }
        try { pvs_firm_equipment_ms1000_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM127||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM127||0) * (1 + Number(pvs_firm_margin||0)/100)); this.pvs_firm_equipment_ms1000_unit_price = pvs_firm_equipment_ms1000_unit_price; } catch(e) { console.error(e); this.pvs_firm_equipment_ms1000_unit_price = 0; }
        try { pvs_firm_equipment_ms1000_unit_cost = Number(pvs_firm_equipment_ms1000_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_equipment_ms1000_unit_cost = pvs_firm_equipment_ms1000_unit_cost; } catch(e) { console.error(e); this.pvs_firm_equipment_ms1000_unit_cost = 0; }
        try { pvs_firm_equipment_ms1000_gsm_quantity = Number(pvs_equipment_structure_ms_quantity2||0); this.pvs_firm_equipment_ms1000_gsm_quantity = pvs_firm_equipment_ms1000_gsm_quantity; } catch(e) { console.error(e); this.pvs_firm_equipment_ms1000_gsm_quantity = 0; }
        try { pvs_firm_equipment_ht1000_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM127||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM127||0) * (1 + Number(pvs_firm_margin||0)/100))) + Number(pvs_firm_additional_pricing||0); this.pvs_firm_equipment_ht1000_unit_price = pvs_firm_equipment_ht1000_unit_price; } catch(e) { console.error(e); this.pvs_firm_equipment_ht1000_unit_price = 0; }
        try { pvs_firm_equipment_ht1000_unit_cost =  Number(pvs_firm_equipment_ht1000_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_equipment_ht1000_unit_cost = pvs_firm_equipment_ht1000_unit_cost; } catch(e) { console.error(e); this.pvs_firm_equipment_ht1000_unit_cost = 0; }
        try { pvs_firm_equipment_ht1000_quantity = Number(pvs_equipment_structure_ht_quantity2||0); this.pvs_firm_equipment_ht1000_quantity = pvs_firm_equipment_ht1000_quantity; } catch(e) { console.error(e); this.pvs_firm_equipment_ht1000_quantity = 0; }
        try { pvs_firm_composite_ms610_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM55||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM55||0) * (1 + Number(pvs_firm_margin||0)/100)); this.pvs_firm_composite_ms610_unit_price = pvs_firm_composite_ms610_unit_price; } catch(e) { console.error(e); this.pvs_firm_composite_ms610_unit_price = 0; }
        try { pvs_firm_composite_ms610_unit_cost = Number(pvs_firm_composite_ms610_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_composite_ms610_unit_cost = pvs_firm_composite_ms610_unit_cost; } catch(e) { console.error(e); this.pvs_firm_composite_ms610_unit_cost = 0; }
        try { pvs_firm_composite_ms610_gsm_quantity = Number(pvs_composite_structure_ms_quantity3||0); this.pvs_firm_composite_ms610_gsm_quantity = pvs_firm_composite_ms610_gsm_quantity; } catch(e) { console.error(e); this.pvs_firm_composite_ms610_gsm_quantity = 0; }
        try { pvs_firm_composite_ht610_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM55||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM55||0) * (1 + Number(pvs_firm_margin||0)/100))) + Number(pvs_firm_additional_pricing||0); this.pvs_firm_composite_ht610_unit_price = pvs_firm_composite_ht610_unit_price; } catch(e) { console.error(e); this.pvs_firm_composite_ht610_unit_price = 0; }
        try { pvs_firm_composite_ht610_unit_cost =  Number(pvs_firm_composite_ht610_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_composite_ht610_unit_cost = pvs_firm_composite_ht610_unit_cost; } catch(e) { console.error(e); this.pvs_firm_composite_ht610_unit_cost = 0; }
        try { pvs_firm_composite_ht610_quantity = Number(pvs_composite_structure_ht_quantity3||0); this.pvs_firm_composite_ht610_quantity = pvs_firm_composite_ht610_quantity; } catch(e) { console.error(e); this.pvs_firm_composite_ht610_quantity = 0; }
        try { pvs_firm_composite_ms900_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM98||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM98||0) * (1 + Number(pvs_firm_margin||0)/100)); this.pvs_firm_composite_ms900_unit_price = pvs_firm_composite_ms900_unit_price; } catch(e) { console.error(e); this.pvs_firm_composite_ms900_unit_price = 0; }
        try { pvs_firm_composite_ms900_unit_cost =  Number(pvs_firm_composite_ms900_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_composite_ms900_unit_cost = pvs_firm_composite_ms900_unit_cost; } catch(e) { console.error(e); this.pvs_firm_composite_ms900_unit_cost = 0; }
        try { pvs_firm_composite_ms900_gsm_quantity = Number(pvs_composite_structure_ms_quantity3||0); this.pvs_firm_composite_ms900_gsm_quantity = pvs_firm_composite_ms900_gsm_quantity; } catch(e) { console.error(e); this.pvs_firm_composite_ms900_gsm_quantity = 0; }
        try { pvs_firm_composite_ht900_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM98||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM98||0) * (1 + Number(pvs_firm_margin||0)/100))) + Number(pvs_firm_additional_pricing||0); this.pvs_firm_composite_ht900_unit_price = pvs_firm_composite_ht900_unit_price; } catch(e) { console.error(e); this.pvs_firm_composite_ht900_unit_price = 0; }
        try { pvs_firm_composite_ht900_unit_cost =  Number(pvs_firm_composite_ht900_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_composite_ht900_unit_cost = pvs_firm_composite_ht900_unit_cost; } catch(e) { console.error(e); this.pvs_firm_composite_ht900_unit_cost = 0; }
        try { pvs_firm_composite_ht900_quantity = Number(pvs_composite_structure_ht_quantity3||0); this.pvs_firm_composite_ht900_quantity = pvs_firm_composite_ht900_quantity; } catch(e) { console.error(e); this.pvs_firm_composite_ht900_quantity = 0; }
        try { pvs_firm_composite_ms1000_unit_price = (Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM141||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM141||0) * (1 + Number(pvs_firm_margin||0)/100)); this.pvs_firm_composite_ms1000_unit_price = pvs_firm_composite_ms1000_unit_price; } catch(e) { console.error(e); this.pvs_firm_composite_ms1000_unit_price = 0; }
        try { pvs_firm_composite_ms1000_unit_cost = Number(pvs_firm_composite_ms1000_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_composite_ms1000_unit_cost = pvs_firm_composite_ms1000_unit_cost; } catch(e) { console.error(e); this.pvs_firm_composite_ms1000_unit_cost = 0; }
        try { pvs_firm_composite_ms1000_gsm_quantity = Number(pvs_composite_structure_ms_quantity3||0); this.pvs_firm_composite_ms1000_gsm_quantity = pvs_firm_composite_ms1000_gsm_quantity; } catch(e) { console.error(e); this.pvs_firm_composite_ms1000_gsm_quantity = 0; }
        try { pvs_firm_composite_ht1000_unit_price = ((Incoterms == 'F.O.R (Freight on Road)' && tower_project_for_transportation_addition == 'NO') ? Math.round(Number(AM141||0) * (1 + Number(pvs_firm_margin||0)/100)) + Number(pvt_C19||0) : Math.round(Number(AM141||0) * (1 + Number(pvs_firm_margin||0)/100))) + Number(pvs_firm_additional_pricing||0); this.pvs_firm_composite_ht1000_unit_price = pvs_firm_composite_ht1000_unit_price; } catch(e) { console.error(e); this.pvs_firm_composite_ht1000_unit_price = 0; }
        try { pvs_firm_composite_ht1000_unit_cost = Number(pvs_firm_composite_ht1000_unit_price||0) * (1 - Number(pvs_firm_margin||0)/100); this.pvs_firm_composite_ht1000_unit_cost = pvs_firm_composite_ht1000_unit_cost; } catch(e) { console.error(e); this.pvs_firm_composite_ht1000_unit_cost = 0; }
        try { pvs_firm_composite_ht1000_quantity = Number(pvs_composite_structure_ht_quantity3||0); this.pvs_firm_composite_ht1000_quantity = pvs_firm_composite_ht1000_quantity; } catch(e) { console.error(e); this.pvs_firm_composite_ht1000_quantity = 0; }
        try { AE27 = (pvs_gantry_structure ? Number(pvs_pv_avg_of_blooms||0)+Number(pvs_pv_conversion_to_angle||0)+(pvs_pv_610_gsm ? Number(pvs_pv_zinc_value_610||0) : 0)+Number(pvs_pv_scrap_value||0)+Number(pvs_BJ34||0)+Number(pvs_pv_interest_component_on_product_cycle||0)+ 9000 +Number(pvs_pv_proto_required||0) + 4000 : 0); this.AE27 = AE27; } catch(e) { console.error(e); this.AE27 = 0; }
        try { AE70 = (pvs_gantry_structure ? Number(pvs_pv_avg_of_blooms||0)+Number(pvs_pv_conversion_to_angle||0)+(pvs_pv_900_gsm ? Number(pvs_pv_zinc_value_900||0) : 0)+Number(pvs_pv_scrap_value||0)+Number(pvs_BJ34||0)+Number(pvs_pv_interest_component_on_product_cycle||0)+9000+Number(pvs_pv_proto_required||0) + 4000 : 0); this.AE70 = AE70; } catch(e) { console.error(e); this.AE70 = 0; }
        try { AE113 = (pvs_gantry_structure ? Number(pvs_pv_avg_of_blooms||0)+Number(pvs_pv_conversion_to_angle||0)+(pvs_pv_1000_gsm ? Number(pvs_pv_zinc_value_1000 || 0) : 0)+Number(pvs_pv_scrap_value||0)+Number(pvs_BJ34||0)+Number(pvs_pv_interest_component_on_product_cycle||0)+9000+Number(pvs_pv_proto_required||0) + 4000 : 0); this.AE113 = AE113; } catch(e) { console.error(e); this.AE113 = 0; }
        try { AE41 = (pvs_equipment_structure ? Number(pvs_pv_avg_of_blooms||0)+Number(pvs_pv_conversion_to_angle||0)+(pvs_pv_610_gsm ? Number(pvs_pv_zinc_value_610||0) : 0)+Number(pvs_pv_scrap_value||0)+Number(pvs_BJ34||0)+Number(pvs_pv_interest_component_on_product_cycle||0)+9000+Number(pvs_pv_proto_required||0) + 10000 : 0); this.AE41 = AE41; } catch(e) { console.error(e); this.AE41 = 0; }
        try { AE84 = (pvs_equipment_structure ? Number(pvs_pv_avg_of_blooms||0)+Number(pvs_pv_conversion_to_angle||0)+(pvs_pv_900_gsm ? Number(pvs_pv_zinc_value_900||0) : 0)+Number(pvs_pv_scrap_value||0)+Number(pvs_BJ34||0)+Number(pvs_pv_interest_component_on_product_cycle||0)+9000+Number(pvs_pv_proto_required||0) + 10000 : 0); this.AE84 = AE84; } catch(e) { console.error(e); this.AE84 = 0; }
        try { AE127 = (pvs_equipment_structure ? Number(pvs_pv_avg_of_blooms||0)+Number(pvs_pv_conversion_to_angle||0)+(pvs_pv_1000_gsm ? Number(pvs_pv_zinc_value_1000||0) : 0)+Number(pvs_pv_scrap_value||0)+Number(pvs_BJ34||0)+Number(pvs_pv_interest_component_on_product_cycle||0)+9000+Number(pvs_pv_proto_required||0) + 10000 : 0); this.AE127 = AE127; } catch(e) { console.error(e); this.AE127 = 0; }
        try { AE55 = (pvs_composite_structure ? Number(pvs_pv_avg_of_blooms||0)+Number(pvs_pv_conversion_to_angle||0)+(pvs_pv_610_gsm ? Number(pvs_pv_zinc_value_610||0) : 0)+Number(pvs_pv_scrap_value||0)+Number(pvs_BJ34||0)+Number(pvs_pv_interest_component_on_product_cycle||0)+9000+Number(pvs_pv_proto_required||0) + 7000 : 0); this.AE55 = AE55; } catch(e) { console.error(e); this.AE55 = 0; }
        try { AE98 = (pvs_composite_structure ? Number(pvs_pv_avg_of_blooms||0)+Number(pvs_pv_conversion_to_angle||0)+(pvs_pv_900_gsm ? Number(pvs_pv_zinc_value_900||0) : 0)+Number(pvs_pv_scrap_value||0)+Number(pvs_BJ34||0)+Number(pvs_pv_interest_component_on_product_cycle||0)+9000+Number(pvs_pv_proto_required||0) + 7000 : 0); this.AE98 = AE98; } catch(e) { console.error(e); this.AE98 = 0; }
        try { AE141 = (pvs_composite_structure ? Number(pvs_pv_avg_of_blooms||0)+Number(pvs_pv_conversion_to_angle||0)+(pvs_pv_1000_gsm ? Number(pvs_pv_zinc_value_1000||0) : 0)+Number(pvs_pv_scrap_value||0)+Number(pvs_BJ34||0)+Number(pvs_pv_interest_component_on_product_cycle||0)+9000+Number(pvs_pv_proto_required||0) + 7000 : 0); this.AE141 = AE141; } catch(e) { console.error(e); this.AE141 = 0; }
        try { AM27 = (pvs_gantry_structure ? Number(pvs_firm_angles||0)+(pvs_firm_610_gsm ? Number(pvs_firm_zinc_value_610||0) : 0)+Number(pvs_firm_scrap_value||0)+Number(pvs_BT29||0)+9000+Number(pvs_firm_interest_component_on_product_cycle||0)+Number(pvs_firm_proto_required||0) + 4000 : 0); this.AM27 = AM27; } catch(e) { console.error(e); this.AM27 = 0; }
        try { AM70 = (pvs_gantry_structure ? Number(pvs_firm_angles||0)+(pvs_firm_900_gsm ? Number(pvs_firm_zinc_value_900||0) : 0)+Number(pvs_firm_scrap_value||0)+Number(pvs_BT29||0)+9000+Number(pvs_firm_interest_component_on_product_cycle||0)+Number(pvs_firm_proto_required||0) + 4000 : 0); this.AM70 = AM70; } catch(e) { console.error(e); this.AM70 = 0; }
        try { AM113 = (pvs_gantry_structure ? Number(pvs_firm_angles||0)+(pvs_firm_1000_gsm ? Number(pvs_firm_zinc_value_1000||0) : 0)+Number(pvs_firm_scrap_value||0)+Number(pvs_BT29||0)+9000+Number(pvs_firm_interest_component_on_product_cycle||0)+Number(pvs_firm_proto_required||0) + 4000 : 0); this.AM113 = AM113; } catch(e) { console.error(e); this.AM113 = 0; }
        try { AM41 = (pvs_equipment_structure ? Number(pvs_firm_angles||0)+(pvs_firm_610_gsm ? Number(pvs_firm_zinc_value_610||0) : 0)+Number(pvs_firm_scrap_value||0)+Number(pvs_BT29||0)+9000+Number(pvs_firm_interest_component_on_product_cycle||0)+Number(pvs_firm_proto_required||0) + 10000 : 0); this.AM41 = AM41; } catch(e) { console.error(e); this.AM41 = 0; }
        try { AM84 = (pvs_equipment_structure ? Number(pvs_firm_angles||0)+(pvs_firm_900_gsm ? Number(pvs_firm_zinc_value_900||0) : 0)+Number(pvs_firm_scrap_value||0)+Number(pvs_BT29||0)+9000+Number(pvs_firm_interest_component_on_product_cycle||0)+Number(pvs_firm_proto_required||0) + 10000 : 0); this.AM84 = AM84; } catch(e) { console.error(e); this.AM84 = 0; }
        try { AM127 = (pvs_equipment_structure ? Number(pvs_firm_angles||0)+(pvs_firm_1000_gsm ? Number(pvs_firm_zinc_value_1000||0) : 0)+Number(pvs_firm_scrap_value||0)+Number(pvs_BT29||0)+9000+Number(pvs_firm_interest_component_on_product_cycle||0)+Number(pvs_firm_proto_required||0) + 10000 : 0); this.AM127 = AM127; } catch(e) { console.error(e); this.AM127 = 0; }
        try { AM55 = (pvs_composite_structure ? Number(pvs_firm_angles||0)+(pvs_firm_610_gsm ? Number(pvs_firm_zinc_value_610||0) : 0)+Number(pvs_firm_scrap_value||0)+Number(pvs_BT29||0)+9000+Number(pvs_firm_interest_component_on_product_cycle||0)+Number(pvs_firm_proto_required||0) + 7000 : 0); this.AM55 = AM55; } catch(e) { console.error(e); this.AM55 = 0; }
        try { AM98 = (pvs_composite_structure ? Number(pvs_firm_angles||0)+(pvs_firm_900_gsm ? Number(pvs_firm_zinc_value_900||0) : 0)+Number(pvs_firm_scrap_value||0)+Number(pvs_BT29||0)+9000+Number(pvs_firm_interest_component_on_product_cycle||0)+Number(pvs_firm_proto_required||0) + 7000 : 0); this.AM98 = AM98; } catch(e) { console.error(e); this.AM98 = 0; }
        try { AM141 = (pvs_composite_structure ? Number(pvs_firm_angles||0)+(pvs_firm_1000_gsm ? Number(pvs_firm_zinc_value_1000||0) : 0)+Number(pvs_firm_scrap_value||0)+Number(pvs_BT29||0)+9000+Number(pvs_firm_interest_component_on_product_cycle||0)+Number(pvs_firm_proto_required||0) + 7000 : 0); this.AM141 = AM141; } catch(e) { console.error(e); this.AM141 = 0; }
        try { pvs_BJ34 = (typeof tc_payment_terms_picklist!=='undefined'&&tc_payment_terms_picklist!==null?(tc_payment_terms_picklist=='Against LC Before Dispatch'?Math.round(Number(pvs_G60||0)*(Number(pvs_pv_avg_of_blooms||0)+Number(pvs_pv_conversion_to_angle||0)+(Number(pvs_pv_zinc_value_as_per_ieema || 0) * Number(pvs_pv_zinc_consumption_percent || 0)/100)+9000)*Number(pvs_G61||0)/365):tc_payment_terms_picklist=='Against VFS'?Math.round((Number(pvs_pv_avg_of_blooms||0)+Number(pvs_pv_conversion_to_angle||0)+(Number(pvs_pv_zinc_value_as_per_ieema || 0) * Number(pvs_pv_zinc_consumption_percent || 0)/100)+9000)*Number(pvs_G60||0)/365*Number(pvs_G61||0)):0):0); this.pvs_BJ34 = pvs_BJ34; } catch(e) { console.error(e); this.pvs_BJ34 = 0; }
        try { pvs_BT29 = (typeof tc_payment_terms_picklist!=='undefined'&&tc_payment_terms_picklist!==null?(tc_payment_terms_picklist=='Against LC Before Dispatch'?Math.round(Number(pvs_G60||0)*(Number(pvs_firm_angles||0)+(Number(pvs_firm_zinc_price || 0) * (Number(pvs_firm_zinc_consumption_percent || 0)/100))+9000)*Number(pvs_G61||0)/365):tc_payment_terms_picklist=='Against VFS'?((Number(pvs_firm_angles||0)+(Number(pvs_firm_zinc_price || 0) * (Number(pvs_firm_zinc_consumption_percent || 0)/100))+9000)*Number(pvs_G60||0)/365*Number(pvs_G61||0)):0):0); this.pvs_BT29 = pvs_BT29; } catch(e) { console.error(e); this.pvs_BT29 = 0; }
        try { pvs_G61 = typeof tc_payment_terms_picklist!=='undefined'&&tc_payment_terms_picklist!==null?(tc_payment_terms_picklist=='Against LC Before Dispatch'?Number(tc_lc_seller_interest_days||0):tc_payment_terms_picklist=='Against VFS'?Number(tc_vfs_seller_interest||0):0):0; this.pvs_G61 = pvs_G61; } catch(e) { console.error(e); this.pvs_G61 = 0; }
        try { pvs_G60 = typeof tc_payment_terms_picklist!=='undefined'&&tc_payment_terms_picklist!==null?(tc_payment_terms_picklist=='Against LC Before Dispatch'?0.08:(tc_payment_terms_picklist=='Against VFS'?0.079:0)):0; this.pvs_G60 = pvs_G60; } catch(e) { console.error(e); this.pvs_G60 = 0; }
        try { pvt_C19 = (typeof tower_project_for_transportation_addition!=='undefined'&&tower_project_for_transportation_addition!==null?(tower_project_for_transportation_addition=='YES'?0:(Number(minimum_guranteed_freight_1||0)+Number(minimum_guranteed_freight_2||0)+Number(minimum_guranteed_freight_3||0)+Number(minimum_guranteed_freight_4||0)+Number(minimum_guranteed_freight_5||0)+Number(minimum_guranteed_freight_6||0)+Number(minimum_guranteed_freight_7||0)+Number(minimum_guranteed_freight_8||0)+Number(minimum_guranteed_freight_9||0)+Number(minimum_guranteed_freight_10||0)+Number(rate_per_ton_1||0)+Number(rate_per_ton_2||0)+Number(rate_per_ton_3||0)+Number(rate_per_ton_4||0)+Number(rate_per_ton_5||0)+Number(rate_per_ton_6||0)+Number(rate_per_ton_7||0)+Number(rate_per_ton_8||0)+Number(rate_per_ton_9||0)+Number(rate_per_ton_10||0))):0); this.pvt_C19 = pvt_C19; } catch(e) { console.error(e); this.pvt_C19 = 0; }
        try { pvs_type_5_6_price_unit = typeof tc_payment_terms_picklist !== 'undefined' && tc_payment_terms_picklist !== null ? (tc_payment_terms_picklist=='Against LC Before Dispatch' ? Math.round((pvs_G60*(pvs_type_5_6?100000*(1+Number(pvs_type_5_6_margin||0)/100):0)*Number(pvs_G61||0)/365)+(pvs_type_5_6?100000*(1+Number(pvs_type_5_6_margin||0)/100):0)) : tc_payment_terms_picklist=='Against VFS' ? Math.round(((pvs_type_5_6?100000*(1+Number(pvs_type_5_6_margin||0)/100):0)*Number(pvs_G60||0)/365*pvs_G61)+(pvs_type_5_6?100000*(1+Number(pvs_type_5_6_margin||0)/100):0)) : (pvs_type_5_6?100000*(1+Number(pvs_type_5_6_margin||0)/100):0)) : (pvs_type_5_6?100000*(1+Number(pvs_type_5_6_margin||0)/100):0); this.pvs_type_5_6_price_unit = pvs_type_5_6_price_unit; } catch(e) { console.error(e); this.pvs_type_5_6_price_unit = 0; }
        try { pvs_type_5_6_price_cost = Number(pvs_type_5_6_price_unit || 0) * (1 - Number(pvs_type_5_6_margin||0)/100); this.pvs_type_5_6_price_cost = pvs_type_5_6_price_cost; } catch(e) { console.error(e); this.pvs_type_5_6_price_cost = 0; }
        try { pvs_type_6_8_price_unit = typeof tc_payment_terms_picklist!=='undefined'&&tc_payment_terms_picklist!==null?(tc_payment_terms_picklist=='Against LC Before Dispatch'?Math.round((Number(pvs_G60||0)*(pvs_type_6_8?110000*(1+Number(pvs_type_6_8_margin||0)/100):0)*Number(pvs_G61||0)/365)+(pvs_type_6_8?110000*(1+Number(pvs_type_6_8_margin||0)/100):0)):tc_payment_terms_picklist=='Against VFS'?Math.round(((pvs_type_6_8?110000*(1+Number(pvs_type_6_8_margin||0)/100):0)*Number(pvs_G60||0)/365*Number(pvs_G61||0))+(pvs_type_6_8?110000*(1+Number(pvs_type_6_8_margin||0)/100):0)):(pvs_type_6_8?110000*(1+Number(pvs_type_6_8_margin||0)/100):0)):(pvs_type_6_8?110000*(1+Number(pvs_type_6_8_margin||0)/100):0); this.pvs_type_6_8_price_unit = pvs_type_6_8_price_unit; } catch(e) { console.error(e); this.pvs_type_6_8_price_unit = 0; }
        try { pvs_type_6_8_price_cost =  Number(pvs_type_6_8_price_unit||0) * (1 - Number(pvs_type_6_8_margin||0)/100); this.pvs_type_6_8_price_cost = pvs_type_6_8_price_cost; } catch(e) { console.error(e); this.pvs_type_6_8_price_cost = 0; }
        try { pvs_type_8_8_price_unit = typeof tc_payment_terms_picklist!=='undefined'&&tc_payment_terms_picklist!==null?(tc_payment_terms_picklist=='Against LC Before Dispatch'?Math.round((Number(pvs_G60||0)*(pvs_type_8_8?121000*(1+Number(pvs_type_8_8_margin||0)/100):0)*Number(pvs_G61||0)/365)+(pvs_type_8_8?121000*(1+Number(pvs_type_8_8_margin||0)/100):0)):tc_payment_terms_picklist=='Against VFS'?Math.round((((pvs_type_8_8?121000*(1+Number(pvs_type_8_8_margin||0)/100):0)*Number(pvs_G60||0)/365*Number(pvs_G61||0)))+(pvs_type_8_8?121000*(1+Number(pvs_type_8_8_margin||0)/100):0)):(pvs_type_8_8?121000*(1+Number(pvs_type_8_8_margin||0)/100):0)):(pvs_type_8_8?121000*(1+Number(pvs_type_8_8_margin||0)/100):0); this.pvs_type_8_8_price_unit = pvs_type_8_8_price_unit; } catch(e) { console.error(e); this.pvs_type_8_8_price_unit = 0; }
        try { pvs_type_8_8_price_cost = Number(pvs_type_8_8_price_unit||0) * (1 - Number(pvs_type_8_8_margin||0)/100) ; this.pvs_type_8_8_price_cost = pvs_type_8_8_price_cost; } catch(e) { console.error(e); this.pvs_type_8_8_price_cost = 0; }
        try { pvs_detail_foundation_bolt_price_unit = typeof tc_payment_terms_picklist!=='undefined'&&tc_payment_terms_picklist!==null?(tc_payment_terms_picklist=='Against LC Before Dispatch'?Math.round((Number(pvs_G60||0)*(pvs_foundation_bolt_checkbox?95000*(1+Number(pvs_detail_foundation_bolt_margin||0)/100):0)*Number(pvs_G61||0)/365)+(pvs_foundation_bolt_checkbox?95000*(1+Number(pvs_detail_foundation_bolt_margin||0)/100):0)):tc_payment_terms_picklist=='Against VFS'?Math.round((((pvs_foundation_bolt_checkbox?95000*(1+Number(pvs_detail_foundation_bolt_margin||0)/100):0)*Number(pvs_G60||0)/365*Number(pvs_G61||0)))+(pvs_foundation_bolt_checkbox?95000*(1+Number(pvs_detail_foundation_bolt_margin||0)/100):0)):(pvs_foundation_bolt_checkbox?95000*(1+Number(pvs_detail_foundation_bolt_margin||0)/100):0)):(pvs_foundation_bolt_checkbox?95000*(1+Number(pvs_detail_foundation_bolt_margin||0)/100):0); this.pvs_detail_foundation_bolt_price_unit = pvs_detail_foundation_bolt_price_unit; } catch(e) { console.error(e); this.pvs_detail_foundation_bolt_price_unit = 0; }
        try { pvs_detail_foundation_bolt_price_cost =  Number(pvs_detail_foundation_bolt_price_unit||0) * (1 - Number(pvs_detail_foundation_bolt_margin)/100); this.pvs_detail_foundation_bolt_price_cost = pvs_detail_foundation_bolt_price_cost; } catch(e) { console.error(e); this.pvs_detail_foundation_bolt_price_cost = 0; }
        try { pvs_detail_ms_template_price_pv = (type_of_product=='Tower'&&pvt_price_basics=='Price Variation')?Number(pvs_N28||0):pvs_gantry_structure?Number(pvs_AH35||0):pvs_equipment_structure?Number(pvs_AH49||0):pvs_composite_structure?Number(pvs_AH63||0):0; this.pvs_detail_ms_template_price_pv = pvs_detail_ms_template_price_pv; } catch(e) { console.error(e); this.pvs_detail_ms_template_price_pv = 0; }
        try { pvs_detail_ms_template_price_pv_gantry = (type_of_product=='Tower'&&pvt_price_basics=='Price Variation')?Number(pvs_N28||0):Number(pvs_AH35||0); this.pvs_detail_ms_template_price_pv_gantry = pvs_detail_ms_template_price_pv_gantry; } catch(e) { console.error(e); this.pvs_detail_ms_template_price_pv_gantry = 0; }
        try { pvs_detail_ms_template_price_pv_equipment = (type_of_product=='Tower'&&pvt_price_basics=='Price Variation')?Number(pvs_N28||0):Number(pvs_AH49||0); this.pvs_detail_ms_template_price_pv_equipment = pvs_detail_ms_template_price_pv_equipment; } catch(e) { console.error(e); this.pvs_detail_ms_template_price_pv_equipment = 0; }
        try { pvs_detail_ms_template_price_pv_composite = (type_of_product=='Tower'&&pvt_price_basics=='Price Variation')?Number(pvs_N28||0):Number(pvs_AH63||0); this.pvs_detail_ms_template_price_pv_composite = pvs_detail_ms_template_price_pv_composite; } catch(e) { console.error(e); this.pvs_detail_ms_template_price_pv_composite = 0; }
        try { pvs_detail_ms_template_price_firm = (type_of_product=='Tower'&&pvt_price_basics=='FIRM')? Number(pvs_U28||0) : pvs_gantry_structure? Number(pvs_AP35||0) : pvs_equipment_structure? Number(pvs_AP49||0) : pvs_composite_structure? Number(pvs_AP63||0) : 0; this.pvs_detail_ms_template_price_firm = pvs_detail_ms_template_price_firm; } catch(e) { console.error(e); this.pvs_detail_ms_template_price_firm = 0; }
        try { pvs_detail_ms_template_price_firm_gantry = (type_of_product=='Tower'&&pvt_price_basics=='FIRM')? Number(pvs_U28||0) : Number(pvs_AP35||0); this.pvs_detail_ms_template_price_firm_gantry = pvs_detail_ms_template_price_firm_gantry; } catch(e) { console.error(e); this.pvs_detail_ms_template_price_firm_gantry = 0; }
        try { pvs_detail_ms_template_price_firm_equipment = (type_of_product=='Tower'&&pvt_price_basics=='FIRM')? Number(pvs_U28||0) : Number(pvs_AP49||0); this.pvs_detail_ms_template_price_firm_equipment = pvs_detail_ms_template_price_firm_equipment; } catch(e) { console.error(e); this.pvs_detail_ms_template_price_firm_equipment = 0; }
        try { pvs_detail_ms_template_price_firm_composite = (type_of_product=='Tower'&&pvt_price_basics=='FIRM')? Number(pvs_U28||0) : Number(pvs_AP63||0); this.pvs_detail_ms_template_price_firm_composite = pvs_detail_ms_template_price_firm_composite; } catch(e) { console.error(e); this.pvs_detail_ms_template_price_firm_composite = 0; }
        try { pvf_ms = Number(pvt_pv_billets||0); this.pvf_ms = pvf_ms; } catch(e) { console.error(e); this.pvf_ms = 0; }
        try { pvf_ht = pvt_price_module == 'IEEMA' ? Math.round(((Number(pvt_pv_blooms || 0) + Number(pvt_pv_billets || 0)) / 2) * 100) / 100 : (pvt_price_module == 'PGCIL' ? Math.round(Number(pvt_pv_blooms || 0) * 100) / 100 : ''); this.pvf_ht = pvf_ht; } catch(e) { console.error(e); this.pvf_ht = 0; }
        try { pvf_blooms = (pvt_pv_blooms != null && pvt_pv_blooms !== '') ? pvt_pv_blooms : ((pvs_pv_blooms != null && pvs_pv_blooms !== '') ? pvs_pv_blooms : 0); this.pvf_blooms = pvf_blooms; } catch(e) { console.error(e); this.pvf_blooms = 0; }
        try { pvf_billets = (pvt_pv_billets != null && pvt_pv_billets !== '') ? pvt_pv_billets : ((pvs_pv_billets != null && pvs_pv_billets !== '') ? pvs_pv_billets : 0); this.pvf_billets = pvf_billets; } catch(e) { console.error(e); this.pvf_billets = 0; }
        try { pvf_zinc = (pvt_pv_zinc_value_as_IEEMA != null && pvt_pv_zinc_value_as_IEEMA !== '') ? pvt_pv_zinc_value_as_IEEMA : ((pvs_pv_zinc_value_as_per_ieema != null && pvs_pv_zinc_value_as_per_ieema !== '') ? pvs_pv_zinc_value_as_per_ieema : 0); this.pvf_zinc = pvf_zinc; } catch(e) { console.error(e); this.pvf_zinc = 0; }
        try { pvf_consumer_price_index = (pvt_pv_CPI != null && pvt_pv_CPI !== '') ? pvt_pv_CPI : ((pvs_pv_CPI != null && pvs_pv_CPI !== '') ? pvt_pv_CPI : 0); this.pvf_consumer_price_index = pvf_consumer_price_index; } catch(e) { console.error(e); this.pvf_consumer_price_index = 0; }
    }
    
    handleSave() {
        let payload = {};
        for(let key of Object.keys(this)) {
            if(key.startsWith('is_')) continue;
            payload[key] = this[key];
        }
        
        let lines = [];
        
        // Dynamic extraction based on the schema
        // We will look for groups of fields that represent a line item.
        if (this.selectedType === 'Tower') {
            if (this.pvt_pv_ms610_gsm_unit_price && this.pvt_pv_ms610_gsm_quantity && this.pvt_pv_610_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'PV-MS-610 GSM',
                    Quantity__c: this.pvt_pv_ms610_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_pv_ms610_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_pv_ms610_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_pv_ms610_gsm_unit_price || 0) * (this.pvt_pv_ms610_gsm_quantity || 0)
                });
            }
            if (this.pvt_pv_ht610_gsm_unit_price && this.pvt_pv_ht610_gsm_quantity && this.pvt_pv_610_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'PV-HT-610 GSM',
                    Quantity__c: this.pvt_pv_ht610_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_pv_ht610_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_pv_ht610_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_pv_ht610_gsm_unit_price || 0) * (this.pvt_pv_ht610_gsm_quantity || 0)
                });
            }
            if (this.pvt_pv_ms900_gsm_unit_price && this.pvt_pv_ms900_gsm_quantity && this.pvt_pv_900_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'PV-MS-900 GSM',
                    Quantity__c: this.pvt_pv_ms900_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_pv_ms900_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_pv_ms900_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_pv_ms900_gsm_unit_price || 0) * (this.pvt_pv_ms900_gsm_quantity || 0)
                });
            }
            if (this.pvt_pv_ht900_gsm_unit_price && this.pvt_pv_ht900_gsm_quantity && this.pvt_pv_900_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'PV-HT-900 GSM',
                    Quantity__c: this.pvt_pv_ht900_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_pv_ht900_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_pv_ht900_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_pv_ht900_gsm_unit_price || 0) * (this.pvt_pv_ht900_gsm_quantity || 0)
                });
            }
            if (this.pvt_pv_ms1000_gsm_unit_price && this.pvt_pv_ms1000_gsm_quantity && this.pvt_pv_1000_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'PV-MS-1000 GSM',
                    Quantity__c: this.pvt_pv_ms1000_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_pv_ms1000_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_pv_ms1000_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_pv_ms1000_gsm_unit_price || 0) * (this.pvt_pv_ms1000_gsm_quantity || 0)
                });
            }
            if (this.pvt_pv_ht1000_gsm_unit_price && this.pvt_pv_ht1000_gsm_quantity && this.pvt_pv_1000_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'PV-HT-1000 GSM',
                    Quantity__c: this.pvt_pv_ht1000_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_pv_ht1000_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_pv_ht1000_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_pv_ht1000_gsm_unit_price || 0) * (this.pvt_pv_ht1000_gsm_quantity || 0)
                });
            }
            if (this.pvt_firm_ms610_gsm_unit_price && this.pvt_firm_ms610_gsm_quantity && this.pvt_firm_610_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'FIRM-MS-610 GSM',
                    Quantity__c: this.pvt_firm_ms610_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_firm_ms610_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_firm_ms610_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_firm_ms610_gsm_unit_price || 0) * (this.pvt_firm_ms610_gsm_quantity || 0)
                });
            }
            if (this.pvt_firm_ht610_gsm_unit_price && this.pvt_firm_ht610_gsm_quantity && this.pvt_firm_610_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'FIRM-HT-610 GSM',
                    Quantity__c: this.pvt_firm_ht610_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_firm_ht610_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_firm_ht610_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_firm_ht610_gsm_unit_price || 0) * (this.pvt_firm_ht610_gsm_quantity || 0)
                });
            }
            if (this.pvt_firm_ms900_gsm_unit_price && this.pvt_firm_ms900_gsm_quantity && this.pvt_firm_900_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'FIRM-MS-900 GSM',
                    Quantity__c: this.pvt_firm_ms900_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_firm_ms900_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_firm_ms900_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_firm_ms900_gsm_unit_price || 0) * (this.pvt_firm_ms900_gsm_quantity || 0)
                });
            }
            if (this.pvt_firm_ht900_gsm_unit_price && this.pvt_firm_ht900_gsm_quantity && this.pvt_firm_900_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'FIRM-HT-900 GSM',
                    Quantity__c: this.pvt_firm_ht900_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_firm_ht900_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_firm_ht900_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_firm_ht900_gsm_unit_price || 0) * (this.pvt_firm_ht900_gsm_quantity || 0)
                });
            }
            if (this.pvt_firm_ms1000_gsm_unit_price && this.pvt_firm_ms1000_gsm_quantity && this.pvt_firm_1000_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'Firm-MS-1000 GSM',
                    Quantity__c: this.pvt_firm_ms1000_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_firm_ms1000_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_firm_ms1000_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_firm_ms1000_gsm_unit_price || 0) * (this.pvt_firm_ms1000_gsm_quantity || 0)
                });
            }
            if (this.pvt_firm_ht1000_gsm_unit_price && this.pvt_firm_ht1000_gsm_quantity && this.pvt_firm_1000_gsm) {
                lines.push({
                    Category__c: 'Tower',
                    Material__c: 'FIRM-HT-1000 GSM',
                    Quantity__c: this.pvt_firm_ht1000_gsm_quantity || 0,
                    Base_Rate__c: this.pvt_firm_ht1000_gsm_unit_cost || 0,
                    Net_Rate__c: this.pvt_firm_ht1000_gsm_unit_price || 0,
                    Total_Amount__c: (this.pvt_firm_ht1000_gsm_unit_price || 0) * (this.pvt_firm_ht1000_gsm_quantity || 0)
                });
            }
        }
        if (this.selectedType === 'Substation') {
            if (this.pvs_pv_gantry_ms610_unit_price && this.pvs_pv_gantry_ms610_gsm_quantity && this.pvs_gantry_structure && this.pvs_pv_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Gantry Structure-MS-610 GSM',
                    Quantity__c: this.pvs_pv_gantry_ms610_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_pv_gantry_ms610_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_gantry_ms610_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_gantry_ms610_unit_price || 0) * (this.pvs_pv_gantry_ms610_gsm_quantity || 0)
                });
            }
            if (this.pvs_pv_gantry_ht610_unit_price && this.pvs_pv_gantry_ht610_quantity && this.pvs_gantry_structure && this.pvs_pv_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Gantry Structure-HT-610 GSM',
                    Quantity__c: this.pvs_pv_gantry_ht610_quantity || 0,
                    Base_Rate__c: this.pvs_pv_gantry_ht610_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_gantry_ht610_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_gantry_ht610_unit_price || 0) * (this.pvs_pv_gantry_ht610_quantity || 0)
                });
            }
            if (this.pvs_pv_gantry_ms900_unit_price && this.pvs_pv_gantry_ms900_gsm_quantity && this.pvs_gantry_structure && this.pvs_pv_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Gantry Structure-MS-900 GSM',
                    Quantity__c: this.pvs_pv_gantry_ms900_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_pv_gantry_ms900_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_gantry_ms900_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_gantry_ms900_unit_price || 0) * (this.pvs_pv_gantry_ms900_gsm_quantity || 0)
                });
            }
            if (this.pvs_pv_gantry_ht900_unit_price && this.pvs_pv_gantry_ht900_quantity && this.pvs_gantry_structure && this.pvs_pv_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Gantry Structure-HT-900 GSM',
                    Quantity__c: this.pvs_pv_gantry_ht900_quantity || 0,
                    Base_Rate__c: this.pvs_pv_gantry_ht900_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_gantry_ht900_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_gantry_ht900_unit_price || 0) * (this.pvs_pv_gantry_ht900_quantity || 0)
                });
            }
            if (this.pvs_pv_gantry_ms1000_unit_price && this.pvs_pv_gantry_ms1000_gsm_quantity && this.pvs_gantry_structure && this.pvs_pv_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Gantry Structure-MS-1000 GSM',
                    Quantity__c: this.pvs_pv_gantry_ms1000_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_pv_gantry_ms1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_gantry_ms1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_gantry_ms1000_unit_price || 0) * (this.pvs_pv_gantry_ms1000_gsm_quantity || 0)
                });
            }
            if (this.pvs_pv_gantry_ht1000_unit_price && this.pvs_pv_gantry_ht1000_quantity && this.pvs_gantry_structure && this.pvs_pv_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Gantry Structure-HT-1000 GSM',
                    Quantity__c: this.pvs_pv_gantry_ht1000_quantity || 0,
                    Base_Rate__c: this.pvs_pv_gantry_ht1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_gantry_ht1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_gantry_ht1000_unit_price || 0) * (this.pvs_pv_gantry_ht1000_quantity || 0)
                });
            }
            if (this.pvs_pv_equipment_ms610_unit_price && this.pvs_pv_equipment_ms610_gsm_quantity && this.pvs_equipment_structure && this.pvs_pv_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Equipment Structure-MS-610 GSM',
                    Quantity__c: this.pvs_pv_equipment_ms610_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_pv_equipment_ms610_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_equipment_ms610_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_equipment_ms610_unit_price || 0) * (this.pvs_pv_equipment_ms610_gsm_quantity || 0)
                });
            }
            if (this.pvs_pv_equipment_ht610_unit_price && this.pvs_pv_equipment_ht610_quantity && this.pvs_equipment_structure && this.pvs_pv_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Equipment Structure-HT-610 GSM',
                    Quantity__c: this.pvs_pv_equipment_ht610_quantity || 0,
                    Base_Rate__c: this.pvs_pv_equipment_ht610_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_equipment_ht610_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_equipment_ht610_unit_price || 0) * (this.pvs_pv_equipment_ht610_quantity || 0)
                });
            }
            if (this.pvs_pv_equipment_ms900_unit_price && this.pvs_pv_equipment_ms900_gsm_quantity && this.pvs_equipment_structure && this.pvs_pv_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Equipment Structure-MS-900 GSM',
                    Quantity__c: this.pvs_pv_equipment_ms900_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_pv_equipment_ms900_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_equipment_ms900_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_equipment_ms900_unit_price || 0) * (this.pvs_pv_equipment_ms900_gsm_quantity || 0)
                });
            }
            if (this.pvs_pv_equipment_ht900_unit_price && this.pvs_pv_equipment_ht900_quantity && this.pvs_equipment_structure && this.pvs_pv_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Equipment Structure-HT-900 GSM',
                    Quantity__c: this.pvs_pv_equipment_ht900_quantity || 0,
                    Base_Rate__c: this.pvs_pv_equipment_ht900_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_equipment_ht900_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_equipment_ht900_unit_price || 0) * (this.pvs_pv_equipment_ht900_quantity || 0)
                });
            }
            if (this.pvs_pv_equipment_ms1000_unit_price && this.pvs_pv_equipment_ms1000_gsm_quantity && this.pvs_equipment_structure && this.pvs_pv_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Equipment Structure-MS-1000 GSM',
                    Quantity__c: this.pvs_pv_equipment_ms1000_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_pv_equipment_ms1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_equipment_ms1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_equipment_ms1000_unit_price || 0) * (this.pvs_pv_equipment_ms1000_gsm_quantity || 0)
                });
            }
            if (this.pvs_pv_equipment_ht1000_unit_price && this.pvs_pv_equipment_ht1000_quantity && this.pvs_equipment_structure && this.pvs_pv_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Equipment Structure-HT-1000 GSM',
                    Quantity__c: this.pvs_pv_equipment_ht1000_quantity || 0,
                    Base_Rate__c: this.pvs_pv_equipment_ht1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_equipment_ht1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_equipment_ht1000_unit_price || 0) * (this.pvs_pv_equipment_ht1000_quantity || 0)
                });
            }
            if (this.pvs_pv_composite_ms610_unit_price && this.pvs_pv_composite_ms610_gsm_quantity && this.pvs_composite_structure && this.pvs_pv_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Composite Structure-MS-610 GSM',
                    Quantity__c: this.pvs_pv_composite_ms610_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_pv_composite_ms610_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_composite_ms610_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_composite_ms610_unit_price || 0) * (this.pvs_pv_composite_ms610_gsm_quantity || 0)
                });
            }
            if (this.pvs_pv_composite_ht610_unit_price && this.pvs_pv_composite_ht610_quantity && this.pvs_composite_structure && this.pvs_pv_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Composite Structure-HT-610 GSM',
                    Quantity__c: this.pvs_pv_composite_ht610_quantity || 0,
                    Base_Rate__c: this.pvs_pv_composite_ht610_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_composite_ht610_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_composite_ht610_unit_price || 0) * (this.pvs_pv_composite_ht610_quantity || 0)
                });
            }
            if (this.pvs_pv_composite_ms900_unit_price && this.pvs_pv_composite_ms900_gsm_quantity && this.pvs_composite_structure && this.pvs_pv_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Composite Structure-MS-900 GSM',
                    Quantity__c: this.pvs_pv_composite_ms900_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_pv_composite_ms900_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_composite_ms900_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_composite_ms900_unit_price || 0) * (this.pvs_pv_composite_ms900_gsm_quantity || 0)
                });
            }
            if (this.pvs_pv_composite_ht900_unit_price && this.pvs_pv_composite_ht900_quantity && this.pvs_composite_structure && this.pvs_pv_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Composite Structure-HT-900 GSM',
                    Quantity__c: this.pvs_pv_composite_ht900_quantity || 0,
                    Base_Rate__c: this.pvs_pv_composite_ht900_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_composite_ht900_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_composite_ht900_unit_price || 0) * (this.pvs_pv_composite_ht900_quantity || 0)
                });
            }
            if (this.pvs_pv_composite_ms1000_unit_price && this.pvs_pv_composite_ms1000_gsm_quantity && this.pvs_composite_structure && this.pvs_pv_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Composite Structure-MS-1000 GSM',
                    Quantity__c: this.pvs_pv_composite_ms1000_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_pv_composite_ms1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_composite_ms1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_composite_ms1000_unit_price || 0) * (this.pvs_pv_composite_ms1000_gsm_quantity || 0)
                });
            }
            if (this.pvs_pv_composite_ht1000_unit_price && this.pvs_pv_composite_ht1000_quantity && this.pvs_composite_structure && this.pvs_pv_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'PV-Composite Structure-HT-1000 GSM',
                    Quantity__c: this.pvs_pv_composite_ht1000_quantity || 0,
                    Base_Rate__c: this.pvs_pv_composite_ht1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_pv_composite_ht1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_pv_composite_ht1000_unit_price || 0) * (this.pvs_pv_composite_ht1000_quantity || 0)
                });
            }
            if (this.pvs_firm_gantry_ms610_unit_price && this.pvs_firm_gantry_ms610_gsm_quantity && this.pvs_gantry_structure && this.pvs_firm_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Gantry Structure-MS-610 GSM',
                    Quantity__c: this.pvs_firm_gantry_ms610_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_firm_gantry_ms610_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_gantry_ms610_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_gantry_ms610_unit_price || 0) * (this.pvs_firm_gantry_ms610_gsm_quantity || 0)
                });
            }
            if (this.pvs_firm_gantry_ht610_unit_price && this.pvs_firm_gantry_ht610_quantity && this.pvs_gantry_structure && this.pvs_firm_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'Firm-Gantry Structure-HT-610 GSM',
                    Quantity__c: this.pvs_firm_gantry_ht610_quantity || 0,
                    Base_Rate__c: this.pvs_firm_gantry_ht610_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_gantry_ht610_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_gantry_ht610_unit_price || 0) * (this.pvs_firm_gantry_ht610_quantity || 0)
                });
            }
            if (this.pvs_firm_gantry_ms900_unit_price && this.pvs_firm_gantry_ms900_gsm_quantity && this.pvs_gantry_structure && this.pvs_firm_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Gantry Structure-MS-900 GSM',
                    Quantity__c: this.pvs_firm_gantry_ms900_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_firm_gantry_ms900_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_gantry_ms900_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_gantry_ms900_unit_price || 0) * (this.pvs_firm_gantry_ms900_gsm_quantity || 0)
                });
            }
            if (this.pvs_firm_gantry_ht900_unit_price && this.pvs_firm_gantry_ht900_quantity && this.pvs_gantry_structure && this.pvs_firm_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Gantry Structure-HT-900 GSM',
                    Quantity__c: this.pvs_firm_gantry_ht900_quantity || 0,
                    Base_Rate__c: this.pvs_firm_gantry_ht900_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_gantry_ht900_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_gantry_ht900_unit_price || 0) * (this.pvs_firm_gantry_ht900_quantity || 0)
                });
            }
            if (this.pvs_firm_gantry_ms1000_unit_price && this.pvs_firm_gantry_ms1000_gsm_quantity && this.pvs_gantry_structure && this.pvs_firm_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Gantry Structure-MS-1000 GSM',
                    Quantity__c: this.pvs_firm_gantry_ms1000_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_firm_gantry_ms1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_gantry_ms1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_gantry_ms1000_unit_price || 0) * (this.pvs_firm_gantry_ms1000_gsm_quantity || 0)
                });
            }
            if (this.pvs_firm_gantry_ht1000_unit_price && this.pvs_firm_gantry_ht1000_quantity && this.pvs_gantry_structure && this.pvs_firm_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Gantry Structure-HT-1000 GSM',
                    Quantity__c: this.pvs_firm_gantry_ht1000_quantity || 0,
                    Base_Rate__c: this.pvs_firm_gantry_ht1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_gantry_ht1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_gantry_ht1000_unit_price || 0) * (this.pvs_firm_gantry_ht1000_quantity || 0)
                });
            }
            if (this.pvs_firm_equipment_ms610_unit_price && this.pvs_firm_equipment_ms610_gsm_quantity && this.pvs_equipment_structure && this.pvs_firm_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Equipment Structure-MS-610 GSM',
                    Quantity__c: this.pvs_firm_equipment_ms610_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_firm_equipment_ms610_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_equipment_ms610_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_equipment_ms610_unit_price || 0) * (this.pvs_firm_equipment_ms610_gsm_quantity || 0)
                });
            }
            if (this.pvs_firm_equipment_ht610_unit_price && this.pvs_firm_equipment_ht610_quantity && this.pvs_equipment_structure && this.pvs_firm_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Equipment Structure-HT-610 GSM',
                    Quantity__c: this.pvs_firm_equipment_ht610_quantity || 0,
                    Base_Rate__c: this.pvs_firm_equipment_ht610_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_equipment_ht610_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_equipment_ht610_unit_price || 0) * (this.pvs_firm_equipment_ht610_quantity || 0)
                });
            }
            if (this.pvs_FIRM_equipment_ms900_unit_price && this.pvs_firm_equipment_ms900_gsm_quantity && this.pvs_equipment_structure && this.pvs_firm_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Equipment Structure-MS-900 GSM',
                    Quantity__c: this.pvs_firm_equipment_ms900_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_FIRM_equipment_ms900_unit_cost || 0,
                    Net_Rate__c: this.pvs_FIRM_equipment_ms900_unit_price || 0,
                    Total_Amount__c: (this.pvs_FIRM_equipment_ms900_unit_price || 0) * (this.pvs_firm_equipment_ms900_gsm_quantity || 0)
                });
            }
            if (this.pvs_firm_equipment_ht900_unit_price && this.pvs_firm_equipment_ht900_quantity && this.pvs_equipment_structure && this.pvs_firm_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Equipment Structure-HT-900 GSM',
                    Quantity__c: this.pvs_firm_equipment_ht900_quantity || 0,
                    Base_Rate__c: this.pvs_firm_equipment_ht900_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_equipment_ht900_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_equipment_ht900_unit_price || 0) * (this.pvs_firm_equipment_ht900_quantity || 0)
                });
            }
            if (this.pvs_firm_equipment_ms1000_unit_price && this.pvs_firm_equipment_ms1000_gsm_quantity && this.pvs_equipment_structure && this.pvs_firm_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Equipment Structure-MS-1000 GSM',
                    Quantity__c: this.pvs_firm_equipment_ms1000_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_firm_equipment_ms1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_equipment_ms1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_equipment_ms1000_unit_price || 0) * (this.pvs_firm_equipment_ms1000_gsm_quantity || 0)
                });
            }
            if (this.pvs_firm_equipment_ht1000_unit_price && this.pvs_firm_equipment_ht1000_quantity && this.pvs_equipment_structure && this.pvs_firm_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Equipment Structure-HT-1000 GSM',
                    Quantity__c: this.pvs_firm_equipment_ht1000_quantity || 0,
                    Base_Rate__c: this.pvs_firm_equipment_ht1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_equipment_ht1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_equipment_ht1000_unit_price || 0) * (this.pvs_firm_equipment_ht1000_quantity || 0)
                });
            }
            if (this.pvs_firm_composite_ms610_unit_price && this.pvs_firm_composite_ms610_gsm_quantity && this.pvs_composite_structure && this.pvs_firm_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Composite Structure-MS-610 GSM',
                    Quantity__c: this.pvs_firm_composite_ms610_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_firm_composite_ms610_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_composite_ms610_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_composite_ms610_unit_price || 0) * (this.pvs_firm_composite_ms610_gsm_quantity || 0)
                });
            }
            if (this.pvs_firm_composite_ht610_unit_price && this.pvs_firm_composite_ht610_quantity && this.pvs_composite_structure && this.pvs_firm_610_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Composite Structure-HT-610 GSM',
                    Quantity__c: this.pvs_firm_composite_ht610_quantity || 0,
                    Base_Rate__c: this.pvs_firm_composite_ht610_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_composite_ht610_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_composite_ht610_unit_price || 0) * (this.pvs_firm_composite_ht610_quantity || 0)
                });
            }
            if (this.pvs_firm_composite_ms900_unit_price && this.pvs_firm_composite_ms900_gsm_quantity && this.pvs_composite_structure && this.pvs_firm_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Composite Structure-MS-900 GSM',
                    Quantity__c: this.pvs_firm_composite_ms900_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_firm_composite_ms900_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_composite_ms900_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_composite_ms900_unit_price || 0) * (this.pvs_firm_composite_ms900_gsm_quantity || 0)
                });
            }
            if (this.pvs_firm_composite_ht900_unit_price && this.pvs_firm_composite_ht900_quantity && this.pvs_composite_structure && this.pvs_firm_900_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Composite Structure-HT-900 GSM',
                    Quantity__c: this.pvs_firm_composite_ht900_quantity || 0,
                    Base_Rate__c: this.pvs_firm_composite_ht900_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_composite_ht900_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_composite_ht900_unit_price || 0) * (this.pvs_firm_composite_ht900_quantity || 0)
                });
            }
            if (this.pvs_firm_composite_ms1000_unit_price && this.pvs_firm_composite_ms1000_gsm_quantity && this.pvs_composite_structure && this.pvs_firm_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Composite Structure-MS-1000 GSM',
                    Quantity__c: this.pvs_firm_composite_ms1000_gsm_quantity || 0,
                    Base_Rate__c: this.pvs_firm_composite_ms1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_composite_ms1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_composite_ms1000_unit_price || 0) * (this.pvs_firm_composite_ms1000_gsm_quantity || 0)
                });
            }
            if (this.pvs_firm_composite_ht1000_unit_price && this.pvs_firm_composite_ht1000_quantity && this.pvs_composite_structure && this.pvs_firm_1000_gsm) {
                lines.push({
                    Category__c: 'Substation',
                    Material__c: 'FIRM-Composite Structure-HT-1000 GSM',
                    Quantity__c: this.pvs_firm_composite_ht1000_quantity || 0,
                    Base_Rate__c: this.pvs_firm_composite_ht1000_unit_cost || 0,
                    Net_Rate__c: this.pvs_firm_composite_ht1000_unit_price || 0,
                    Total_Amount__c: (this.pvs_firm_composite_ht1000_unit_price || 0) * (this.pvs_firm_composite_ht1000_quantity || 0)
                });
            }
        }

        this.dispatchEvent(new CustomEvent('save', { detail: { type: this.selectedType, Lines: lines, payload: payload } }));
    }
}