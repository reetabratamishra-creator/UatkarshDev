import { LightningElement, track, api } from 'lwc';

export default class SteelTubularPoleConfig extends LightningElement {
    @api savedData = {};
    @track selectedType = 'Standard Pole';

    get typeOptions() {
        return [
            { label: 'Standard Pole', value: 'Standard Pole' },
            { label: 'Customized Pole', value: 'Customized Pole' }
        ];
    }
    
    get isStandard() { return this.selectedType === 'Standard Pole'; }
    get isCustomized() { return this.selectedType === 'Customized Pole'; }

    handleTypeChange(event) {
        this.selectedType = event.detail.value;
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }
    @track ms_gi_1;
    @track ms_gi_2;
    @track ms_gi_3;
    @track d1_tolerance_percent;
    @track d1_for;
    @track d1_lump_sum;
    @track d1_transportation;
    @track d1_designation;
    @track d1_tolerance;
    @track d1_added_up;
    @track d1_quantity;
    @track d1_bp_ms_gi;
    @track d1_bp_sister_plate;
    @track d1_bp_ms_gi_reflect;
    @track d1_bp_sp_reflect;
    @track d1_bp_ms_gi_length;
    @track d1_bp_ms_gi_width;
    @track d1_bp_ms_gi_thickness;
    @track d1_bp_ms_gi_added_up;
    @track d1_bp_ms_gi_quantity;
    @track d1_bp_sp_length;
    @track d1_bp_sp_width;
    @track d1_bp_sp_thickness;
    @track d1_bp_sp_added_up;
    @track d1_bp_sp_quantity;
    @track d1_bp_cast_iron_is;
    @track d1_bp_ci_is_dia;
    @track d1_bp_ci_is_added_up;
    @track d1_bp_ci_is_quantity;
    @track d1_bp_ci_is_reflect;
    @track d1_bp_cast_iron_comm;
    @track d1_bp_ci_comm_dia;
    @track d1_bp_ci_comm_added_up;
    @track d1_bp_ci_comm_quantity;
    @track d1_bp_ci_comm_reflect;
    @track d1_br_ms_gs;
    @track d1_br_dia;
    @track d1_br_thickness;
    @track d1_br_length;
    @track d1_br_single_arm;
    @track d1_br_sa_added_up;
    @track d1_br_sa_quantity;
    @track d1_br_double_arm;
    @track d1_br_da_added_up;
    @track d1_br_da_quantity;
    @track d1_br_triple_arm;
    @track d1_br_ta_added_up;
    @track d1_br_ta_quantity;
    @track d1_br_four_arm;
    @track d1_br_fa_added_up;
    @track d1_br_fa_quantity;
    @track d1_br_ring_arm;
    @track d1_br_ra_added_up;
    @track d1_br_ra_quantity;
    @track d1_swan_ms_gs;
    @track d1_swan_single;
    @track d1_swan_s_added;
    @track d1_swan_s_qty;
    @track d1_swan_double;
    @track d1_swan_d_added;
    @track d1_swan_d_qty;
    @track d1_swan_triple;
    @track d1_swan_t_added;
    @track d1_swan_t_qty;
    @track d1_fb_check;
    @track d1_fb_dia;
    @track d1_fb_length;
    @track d1_fb_qty;
    @track d1_fb_added_up;
    @track d1_fb_quantity;
    @track d1_ad_cep_dia;
    @track d1_ad_cep_thickness;
    @track d1_ad_cep_length;
    @track d1_ad_cep_check;
    @track d1_ad_cep_qty;
    @track d1_ad_cep_added_up;
    @track d1_fb_ad_cep_quantity;
    @track d1_ad_add_check;
    @track d1_ad_add_note;
    @track cp_height_1;
    @track cp_height_2;
    @track cp_height_3;
    @track c1_sections;
    @track c2_sections;
    @track c3_sections;
    @track c1_ms_gi;
    @track c1_tolerance;
    @track c1_added_up;
    @track c1_quantity;
    @track c1_swan;
    @track c1_tol_pct;
    @track c1_for;
    @track c1_for_lump;
    @track c1_for_transp;
    @track c1_top_dia;
    @track c1_top_thk;
    @track c1_top_len;
    @track c1_mid2_dia;
    @track c1_mid2_thk;
    @track c1_mid2_len;
    @track c1_mid3_dia;
    @track c1_mid3_thk;
    @track c1_mid3_len;
    @track c1_mid4_dia;
    @track c1_mid4_thk;
    @track c1_mid4_len;
    @track c1_bot_dia;
    @track c1_bot_thk;
    @track c1_bot_len;
    @track c1_bp_ms_gi;
    @track c1_bp_sister_plate;
    @track c1_bp_ms_gi_reflect;
    @track c1_bp_sp_reflect;
    @track c1_bp_ms_gi_length;
    @track c1_bp_ms_gi_width;
    @track c1_bp_ms_gi_thickness;
    @track c1_bp_ms_gi_added_up;
    @track c1_bp_ms_gi_quantity;
    @track c1_bp_sp_length;
    @track c1_bp_sp_width;
    @track c1_bp_sp_thickness;
    @track c1_bp_sp_added_up;
    @track c1_bp_sp_quantity;
    @track c1_bp_cast_iron_is;
    @track c1_bp_ci_is_dia;
    @track c1_bp_ci_is_added_up;
    @track c1_bp_ci_is_quantity;
    @track c1_bp_ci_is_reflect;
    @track c1_bp_cast_iron_comm;
    @track c1_bp_ci_comm_dia;
    @track c1_bp_ci_comm_added_up;
    @track c1_bp_ci_comm_quantity;
    @track c1_bp_ci_comm_reflect;
    @track c1_br_ms_gs;
    @track c1_br_dia;
    @track c1_br_thickness;
    @track c1_br_length;
    @track c1_br_single_arm;
    @track c1_br_sa_added_up;
    @track c1_br_sa_quantity;
    @track c1_br_double_arm;
    @track c1_br_da_added_up;
    @track c1_br_da_quantity;
    @track c1_br_triple_arm;
    @track c1_br_ta_added_up;
    @track c1_br_ta_quantity;
    @track c1_br_four_arm;
    @track c1_br_fa_added_up;
    @track c1_br_fa_quantity;
    @track c1_br_ring_arm;
    @track c1_br_ra_added_up;
    @track c1_br_ra_quantity;
    @track c1_swan_ms_gs;
    @track c1_swan_single;
    @track c1_swan_s_added;
    @track c1_swan_s_qty;
    @track c1_swan_double;
    @track c1_swan_d_added;
    @track c1_swan_d_qty;
    @track c1_swan_triple;
    @track c1_swan_t_added;
    @track c1_swan_t_qty;
    @track c1_fb_check;
    @track c1_fb_dia;
    @track c1_fb_length;
    @track c1_fb_qty;
    @track c1_fb_added_up;
    @track c1_fb_quantity;
    @track c1_ad_cep_dia;
    @track c1_ad_cep_thickness;
    @track c1_ad_cep_length;
    @track c1_ad_cep_check;
    @track c1_ad_cep_qty;
    @track c1_ad_cep_added_up;
    @track c1_fb_ad_cep_quantity;
    @track c1_ad_add_check;
    @track c1_ad_add_note;
    @track height_1;
    @track height_2;
    @track height_3;
    @track d1_rate;
    @track d1_base_weight;
    @track d1_base_length;
    @track d1_weight;
    @track d1_pole_total_amount;
    @track d1_pole_payment_term;
    @track d1_bp_ms_gi_rate;
    @track d1_bp_sp_rate;
    @track d1_bp_ci_is_rate;
    @track d1_bp_ci_comm_rate;
    @track d1_bp_ms_total_amount;
    @track d1_sp_total_amount;
    @track d1_cast_iron_total_amount;
    @track d1_cast_iron_comm_total_amount;
    @track d1_br_sa_rate;
    @track d1_br_da_rate;
    @track d1_br_ta_rate;
    @track d1_br_fa_rate;
    @track d1_br_ra_rate;
    @track d1_br_sa_total_amount;
    @track d1_br_da_total_amount;
    @track d1_br_ta_total_amount;
    @track d1_br_fa_total_amount;
    @track d1_br_ra_total_amount;
    @track d1_swan_s_rate;
    @track d1_swan_d_rate;
    @track d1_swan_t_rate;
    @track d1_swan_sa_total_amount;
    @track d1_swan_da_total_amount;
    @track d1_swan_ta_total_amount;
    @track d1_fb_rate;
    @track d1_ad_cep_rate;
    @track d1_foundation_total_amount;
    @track d1_addi_total_amount;
    @track d1_final_total_amount;
    @track d1_final_added_up_cost;
    @track d1_final_added_up_std_rate;
    @track d1_final_unit_cost;
    @track d1_final_list_price;
    @track c1_rate;
    @track c1_section1_normal_weight;
    @track c1_section1_additional_weight;
    @track c1_section1_final_weight;
    @track c1_sec1_unit_price;
    @track c1_section2_normal_weight;
    @track c1_section2_additional_weight;
    @track c1_section2_final_weight;
    @track c1_sec2_unit_price;
    @track c1_section3_normal_weight;
    @track c1_section3_additional_weight;
    @track c1_section3_final_weight;
    @track c1_sec3_unit_price;
    @track c1_section4_normal_weight;
    @track c1_section4_additional_weight;
    @track c1_section4_final_weight;
    @track c1_sec4_unit_price;
    @track c1_section5_normal_weight;
    @track c1_section5_additional_weight;
    @track c1_section5_final_weight;
    @track c1_sec5_unit_price;
    @track c1_pole_payment_term;
    @track c1_bp_ms_gi_rate;
    @track c1_bp_sp_rate;
    @track c1_bp_ci_is_rate;
    @track c1_bp_ci_comm_rate;
    @track c1_bp_ms_total_amount;
    @track c1_sp_total_amount;
    @track c1_cast_iron_total_amount;
    @track c1_cast_iron_comm_total_amount;
    @track c1_br_sa_rate;
    @track c1_br_da_rate;
    @track c1_br_ta_rate;
    @track c1_br_fa_rate;
    @track c1_br_ra_rate;
    @track c1_br_sa_total_amount;
    @track c1_br_da_total_amount;
    @track c1_br_ta_total_amount;
    @track c1_br_fa_total_amount;
    @track c1_br_ra_total_amount;
    @track c1_swan_s_rate;
    @track c1_swan_d_rate;
    @track c1_swan_t_rate;
    @track c1_swan_sa_total_amount;
    @track c1_swan_da_total_amount;
    @track c1_swan_ta_total_amount;
    @track c1_fb_rate;
    @track c1_ad_cep_rate;
    @track c1_foundation_total_amount;
    @track c1_addi_total_amount;
    @track c1_final_total_amount;
    @track c1_final_added_up_cost;
    @track c1_final_added_up_std_rate;
    @track c1_final_unit_cost;
    @track c1_final_list_price;

    // Getters for visibility and options
    get ms_gi_1_options() { return [{label: 'Galvanized', value: 'Galvanized'}, {label: 'Mild Steel', value: 'Mild Steel'}]; }

    get is_ms_gi_2_visible() {
        const vals = [this.ms_gi_1];
        return vals.some(val => ['Galvanized', 'Mild Steel'].includes(val) || (['', null, 'null'].includes(val) && ['Galvanized', 'Mild Steel'].some(v=>!v || v==='null')));
    }
    get ms_gi_2_options() { return [{label: 'Galvanized', value: 'Galvanized'}, {label: 'Mild Steel', value: 'Mild Steel'}]; }

    get is_height_2_visible() {
        const vals = [this.ms_gi_1];
        return vals.some(val => ['Galvanized', 'Mild Steel'].includes(val) || (['', null, 'null'].includes(val) && ['Galvanized', 'Mild Steel'].some(v=>!v || v==='null')));
    }

    get is_ms_gi_3_visible() {
        const vals = [this.ms_gi_2];
        return vals.some(val => ['Galvanized', 'Mild Steel'].includes(val) || (['', null, 'null'].includes(val) && ['Galvanized', 'Mild Steel'].some(v=>!v || v==='null')));
    }
    get ms_gi_3_options() { return [{label: 'Galvanized', value: 'Galvanized'}, {label: 'Mild Steel', value: 'Mild Steel'}]; }

    get is_height_3_visible() {
        const vals = [this.ms_gi_2];
        return vals.some(val => ['Galvanized', 'Mild Steel'].includes(val) || (['', null, 'null'].includes(val) && ['Galvanized', 'Mild Steel'].some(v=>!v || v==='null')));
    }

    get is_designation_1_visible() {
        const vals = [this.ms_gi_1];
        return vals.some(val => ['Galvanized', 'Mild Steel'].includes(val));
    }

    get is_d1_tolerance_percent_visible() {
        const vals = [this.d1_tolerance];
        return vals.some(val => ['YES'].includes(val) || (['', null, 'null'].includes(val) && ['YES'].some(v=>!v || v==='null')));
    }

    get is_d1_tol_spacer_visible() {
        const vals = [this.d1_tolerance];
        return vals.some(val => ['NO', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['NO', '', 'null'].some(v=>!v || v==='null')));
    }
    get d1_for_options() { return [{label: 'Lump sum', value: 'Lump sum'}, {label: 'Per pcs', value: 'Per pcs'}]; }

    get is_d1_lump_sum_visible() {
        const vals = [this.d1_for];
        return vals.some(val => ['Lump sum'].includes(val) || (['', null, 'null'].includes(val) && ['Lump sum'].some(v=>!v || v==='null')));
    }

    get is_d1_transportation_visible() {
        const vals = [this.d1_for];
        return vals.some(val => ['Per pcs'].includes(val) || (['', null, 'null'].includes(val) && ['Per pcs'].some(v=>!v || v==='null')));
    }

    get is_d1_for_spacer_visible() {
        const vals = [this.d1_for];
        return vals.some(val => ['', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['', 'null'].some(v=>!v || v==='null')));
    }
    get d1_designation_options() { return [{label: '410-SP-01', value: '410-SP-01'}, {label: '410-SP-02', value: '410-SP-02'}, {label: '410-SP-03', value: '410-SP-03'}, {label: '410-SP-04', value: '410-SP-04'}, {label: '410-SP-05', value: '410-SP-05'}, {label: '410-SP-06', value: '410-SP-06'}, {label: '410-SP-07', value: '410-SP-07'}, {label: '410-SP-08', value: '410-SP-08'}, {label: '410-SP-09', value: '410-SP-09'}, {label: '410-SP-10', value: '410-SP-10'}, {label: '410-SP-11', value: '410-SP-11'}, {label: '410-SP-12', value: '410-SP-12'}, {label: '410-SP-13', value: '410-SP-13'}, {label: '410-SP-14', value: '410-SP-14'}, {label: '410-SP-15', value: '410-SP-15'}, {label: '410-SP-16', value: '410-SP-16'}, {label: '410-SP-17', value: '410-SP-17'}, {label: '410-SP-18', value: '410-SP-18'}, {label: '410-SP-19', value: '410-SP-19'}, {label: '410-SP-20', value: '410-SP-20'}, {label: '410-SP-21', value: '410-SP-21'}, {label: '410-SP-22', value: '410-SP-22'}, {label: '410-SP-23', value: '410-SP-23'}, {label: '410-SP-24', value: '410-SP-24'}, {label: '410-SP-25', value: '410-SP-25'}, {label: '410-SP-26', value: '410-SP-26'}, {label: '410-SP-27', value: '410-SP-27'}, {label: '410-SP-28', value: '410-SP-28'}, {label: '410-SP-29', value: '410-SP-29'}, {label: '410-SP-30', value: '410-SP-30'}, {label: '410-SP-31', value: '410-SP-31'}, {label: '410-SP-32', value: '410-SP-32'}, {label: '410-SP-33', value: '410-SP-33'}, {label: '410-SP-34', value: '410-SP-34'}, {label: '410-SP-35', value: '410-SP-35'}, {label: '410-SP-36', value: '410-SP-36'}, {label: '410-SP-37', value: '410-SP-37'}, {label: '410-SP-38', value: '410-SP-38'}, {label: '410-SP-39', value: '410-SP-39'}, {label: '410-SP-40', value: '410-SP-40'}, {label: '410-SP-41', value: '410-SP-41'}, {label: '410-SP-42', value: '410-SP-42'}, {label: '410-SP-43', value: '410-SP-43'}, {label: '410-SP-44', value: '410-SP-44'}, {label: '410-SP-45', value: '410-SP-45'}, {label: '410-SP-46', value: '410-SP-46'}, {label: '410-SP-47', value: '410-SP-47'}, {label: '410-SP-48', value: '410-SP-48'}, {label: '410-SP-49', value: '410-SP-49'}, {label: '410-SP-50', value: '410-SP-50'}, {label: '410-SP-51', value: '410-SP-51'}, {label: '410-SP-52', value: '410-SP-52'}, {label: '410-SP-53', value: '410-SP-53'}, {label: '410-SP-54', value: '410-SP-54'}, {label: '410-SP-55', value: '410-SP-55'}, {label: '410-SP-56', value: '410-SP-56'}, {label: '410-SP-57', value: '410-SP-57'}, {label: '410-SP-58', value: '410-SP-58'}, {label: '410-SP-59', value: '410-SP-59'}, {label: '410-SP-60', value: '410-SP-60'}, {label: '410-SP-61', value: '410-SP-61'}, {label: '410-SP-62', value: '410-SP-62'}, {label: '410-SP-63', value: '410-SP-63'}, {label: '410-SP-64', value: '410-SP-64'}, {label: '410-SP-65', value: '410-SP-65'}, {label: '410-SP-66', value: '410-SP-66'}, {label: '410-SP-67', value: '410-SP-67'}, {label: '410-SP-68', value: '410-SP-68'}, {label: '410-SP-69', value: '410-SP-69'}, {label: '410-SP-70', value: '410-SP-70'}, {label: '410-SP-71', value: '410-SP-71'}, {label: '410-SP-72', value: '410-SP-72'}, {label: '410-SP-73', value: '410-SP-73'}, {label: '410-SP-74', value: '410-SP-74'}, {label: '410-SP-75', value: '410-SP-75'}, {label: '410-SP-76', value: '410-SP-76'}, {label: '410-SP-77', value: '410-SP-77'}, {label: '410-SP-78', value: '410-SP-78'}, {label: '410-SP-79', value: '410-SP-79'}, {label: '410-SP-80', value: '410-SP-80'}]; }
    get d1_tolerance_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_d1_bp_ms_gi_spacer_visible() {
        const vals = [this.d1_bp_ms_gi];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ms_gi_reflect_visible() {
        const vals = [this.d1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_bp_ms_gi_reflect_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_d1_bp_sp_spacer_visible() {
        const vals = [this.d1_bp_sister_plate];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_sp_reflect_visible() {
        const vals = [this.d1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_bp_sp_reflect_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_d1_bp_ms_gi_length_visible() {
        const vals = [this.d1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ms_gi_width_visible() {
        const vals = [this.d1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ms_gi_thickness_visible() {
        const vals = [this.d1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ms_gi_rate_visible() {
        const vals = [this.d1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ms_gi_added_up_visible() {
        const vals = [this.d1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ms_gi_quantity_visible() {
        const vals = [this.d1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_sp_length_visible() {
        const vals = [this.d1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_sp_width_visible() {
        const vals = [this.d1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_sp_thickness_visible() {
        const vals = [this.d1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_sp_rate_visible() {
        const vals = [this.d1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_sp_added_up_visible() {
        const vals = [this.d1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_sp_quantity_visible() {
        const vals = [this.d1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ci_is_spacer_visible() {
        const vals = [this.d1_bp_cast_iron_is];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ci_is_dia_visible() {
        const vals = [this.d1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ci_is_rate_visible() {
        const vals = [this.d1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ci_is_added_up_visible() {
        const vals = [this.d1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ci_is_quantity_visible() {
        const vals = [this.d1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ci_is_reflect_visible() {
        const vals = [this.d1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_bp_ci_is_reflect_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_d1_bp_ci_comm_spacer_visible() {
        const vals = [this.d1_bp_cast_iron_comm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ci_comm_dia_visible() {
        const vals = [this.d1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ci_comm_rate_visible() {
        const vals = [this.d1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ci_comm_added_up_visible() {
        const vals = [this.d1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ci_comm_quantity_visible() {
        const vals = [this.d1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_bp_ci_comm_reflect_visible() {
        const vals = [this.d1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_bp_ci_comm_reflect_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_d1_bp_ms_total_amount_visible() {
        const vals = [this.d1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_sp_total_amount_visible() {
        const vals = [this.d1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_cast_iron_total_amount_visible() {
        const vals = [this.d1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_cast_iron_comm_total_amount_visible() {
        const vals = [this.d1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_ms_gs_visible() {
        const vals = [this.d1_br_single_arm, this.d1_br_double_arm, this.d1_br_triple_arm, this.d1_br_four_arm, this.d1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_br_ms_gs_options() { return [{label: 'Galvanized', value: 'Galvanized'}, {label: 'Mild Steel', value: 'Mild Steel'}]; }

    get is_d1_br_swan_spacer_visible() {
        const vals = [this.d1_swan_single, this.d1_swan_double, this.d1_swan_triple, this.d1_br_single_arm, this.d1_br_double_arm, this.d1_br_triple_arm, this.d1_br_four_arm, this.d1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_dia_visible() {
        const vals = [this.d1_br_single_arm, this.d1_br_double_arm, this.d1_br_triple_arm, this.d1_br_four_arm, this.d1_br_ring_arm, this.d1_swan_single, this.d1_swan_double, this.d1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_br_dia_options() { return [{label: '33.7', value: '33.7'}, {label: '42.4', value: '42.4'}, {label: '48.3', value: '48.3'}, {label: '60.3', value: '60.3'}, {label: '76.1', value: '76.1'}]; }

    get is_d1_br_thickness_visible() {
        const vals = [this.d1_br_single_arm, this.d1_br_double_arm, this.d1_br_triple_arm, this.d1_br_four_arm, this.d1_br_ring_arm, this.d1_swan_single, this.d1_swan_double, this.d1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_br_thickness_options() { return [{label: '2.9', value: '2.9'}, {label: '3.2', value: '3.2'}, {label: '3.65', value: '3.65'}, {label: '4.5', value: '4.5'}, {label: '4.85', value: '4.85'}, {label: '5.4', value: '5.4'}]; }

    get is_d1_br_length_visible() {
        const vals = [this.d1_br_single_arm, this.d1_br_double_arm, this.d1_br_triple_arm, this.d1_br_four_arm, this.d1_br_ring_arm, this.d1_swan_single, this.d1_swan_double, this.d1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_br_length_options() { return [{label: '0.25', value: '0.25'}, {label: '0.5', value: '0.5'}, {label: '0.75', value: '0.75'}, {label: '1', value: '1'}, {label: '1.25', value: '1.25'}, {label: '1.5', value: '1.5'}, {label: '1.75', value: '1.75'}, {label: '2', value: '2'}, {label: '2.25', value: '2.25'}, {label: '2.5', value: '2.5'}, {label: '2.75', value: '2.75'}, {label: '3', value: '3'}, {label: '3.25', value: '3.25'}, {label: '3.5', value: '3.5'}, {label: '3.75', value: '3.75'}, {label: '4', value: '4'}]; }

    get is_d1_br_sa_spacer_visible() {
        const vals = [this.d1_br_single_arm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_br_sa_rate_visible() {
        const vals = [this.d1_br_single_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_sa_added_up_visible() {
        const vals = [this.d1_br_single_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_sa_quantity_visible() {
        const vals = [this.d1_br_single_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_da_spacer_visible() {
        const vals = [this.d1_br_double_arm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_br_da_rate_visible() {
        const vals = [this.d1_br_double_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_da_added_up_visible() {
        const vals = [this.d1_br_double_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_da_quantity_visible() {
        const vals = [this.d1_br_double_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_ta_spacer_visible() {
        const vals = [this.d1_br_triple_arm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_br_ta_rate_visible() {
        const vals = [this.d1_br_triple_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_ta_added_up_visible() {
        const vals = [this.d1_br_triple_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_ta_quantity_visible() {
        const vals = [this.d1_br_triple_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_fa_spacer_visible() {
        const vals = [this.d1_br_four_arm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_br_fa_rate_visible() {
        const vals = [this.d1_br_four_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_fa_added_up_visible() {
        const vals = [this.d1_br_four_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_fa_quantity_visible() {
        const vals = [this.d1_br_four_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_ra_spacer_visible() {
        const vals = [this.d1_br_ring_arm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_br_ra_rate_visible() {
        const vals = [this.d1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_ra_added_up_visible() {
        const vals = [this.d1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_ra_quantity_visible() {
        const vals = [this.d1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_sa_total_amount_visible() {
        const vals = [this.d1_br_single_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_da_total_amount_visible() {
        const vals = [this.d1_br_double_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_ta_total_amount_visible() {
        const vals = [this.d1_br_triple_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_fa_total_amount_visible() {
        const vals = [this.d1_br_four_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_br_ra_total_amount_visible() {
        const vals = [this.d1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_ms_gs_visible() {
        const vals = [this.d1_swan_single, this.d1_swan_double, this.d1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_swan_ms_gs_options() { return [{label: 'Galvanized', value: 'Galvanized'}, {label: 'Mild Steel', value: 'Mild Steel'}]; }

    get is_d1_swan_hdr_spacer_active_visible() {
        const vals = [this.d1_swan_single, this.d1_swan_double, this.d1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_s_spacer_visible() {
        const vals = [this.d1_swan_single];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_s_rate_visible() {
        const vals = [this.d1_swan_single];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_s_added_visible() {
        const vals = [this.d1_swan_single];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_s_qty_visible() {
        const vals = [this.d1_swan_single];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_d_spacer_visible() {
        const vals = [this.d1_swan_double];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_d_rate_visible() {
        const vals = [this.d1_swan_double];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_d_added_visible() {
        const vals = [this.d1_swan_double];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_d_qty_visible() {
        const vals = [this.d1_swan_double];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_t_spacer_visible() {
        const vals = [this.d1_swan_triple];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_t_rate_visible() {
        const vals = [this.d1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_t_added_visible() {
        const vals = [this.d1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_t_qty_visible() {
        const vals = [this.d1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_sa_total_amount_visible() {
        const vals = [this.d1_swan_single];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_da_total_amount_visible() {
        const vals = [this.d1_swan_double];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_swan_ta_total_amount_visible() {
        const vals = [this.d1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_fb_spacer_visible() {
        const vals = [this.d1_fb_check];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_fb_dia_visible() {
        const vals = [this.d1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_fb_dia_options() { return [{label: '12', value: '12'}, {label: '16', value: '16'}, {label: '20', value: '20'}, {label: '24', value: '24'}]; }

    get is_d1_fb_length_visible() {
        const vals = [this.d1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_fb_qty_visible() {
        const vals = [this.d1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_fb_rate_visible() {
        const vals = [this.d1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_fb_added_up_visible() {
        const vals = [this.d1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_fb_spacer_visible() {
        const vals = [this.d1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_fb_quantity_visible() {
        const vals = [this.d1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_fb_spacer2_visible() {
        const vals = [this.d1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_ad_top_spacer_visible() {
        const vals = [this.d1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_ad_cep_dia_visible() {
        const vals = [this.d1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_ad_cep_dia_options() { return [{label: '33.7', value: '33.7'}, {label: '42.4', value: '42.4'}, {label: '48.3', value: '48.3'}, {label: '60.3', value: '60.3'}, {label: '76.1', value: '76.1'}]; }

    get is_d1_ad_cep_thickness_visible() {
        const vals = [this.d1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_ad_cep_thickness_options() { return [{label: '2.9', value: '2.9'}, {label: '3.2', value: '3.2'}, {label: '3.65', value: '3.65'}, {label: '4.5', value: '4.5'}, {label: '4.85', value: '4.85'}, {label: '5.4', value: '5.4'}]; }

    get is_d1_ad_cep_length_visible() {
        const vals = [this.d1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get d1_ad_cep_length_options() { return [{label: '0.25', value: '0.25'}, {label: '0.5', value: '0.5'}, {label: '0.75', value: '0.75'}, {label: '1', value: '1'}, {label: '1.25', value: '1.25'}, {label: '1.5', value: '1.5'}, {label: '1.75', value: '1.75'}, {label: '2', value: '2'}, {label: '2.25', value: '2.25'}, {label: '2.5', value: '2.5'}, {label: '2.75', value: '2.75'}, {label: '3', value: '3'}, {label: '3.25', value: '3.25'}, {label: '3.5', value: '3.5'}, {label: '3.75', value: '3.75'}, {label: '4', value: '4'}]; }

    get is_d1_ad_cep_false_spacer_visible() {
        const vals = [this.d1_ad_cep_check];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_ad_cep_qty_visible() {
        const vals = [this.d1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_ad_cep_rate_visible() {
        const vals = [this.d1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_ad_cep_added_up_visible() {
        const vals = [this.d1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_fb_ad_cep_quantity_visible() {
        const vals = [this.d1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_ad_mid_spacer_visible() {
        const vals = [this.d1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_ad_add_false_spacer_visible() {
        const vals = [this.d1_ad_add_check];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_d1_ad_add_note_visible() {
        const vals = [this.d1_ad_add_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_foundation_total_amount_visible() {
        const vals = [this.d1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_d1_addi_total_amount_visible() {
        const vals = [this.d1_swan_single];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_designation_2_visible() {
        const vals = [this.ms_gi_2];
        return vals.some(val => ['Galvanized', 'Mild Steel'].includes(val));
    }

    get is_designation_3_visible() {
        const vals = [this.ms_gi_3];
        return vals.some(val => ['Galvanized', 'Mild Steel'].includes(val));
    }

    get is_cp_height_2_visible() {
        const vals = [this.cp_height_1];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_cp_ghost_h2_visible() {
        const vals = [this.cp_height_1];
        return vals.some(val => ['', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['', 'null'].some(v=>!v || v==='null')));
    }

    get is_cp_height_3_visible() {
        const vals = [this.cp_height_2];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_cp_ghost_h3_visible() {
        const vals = [this.cp_height_2];
        return vals.some(val => ['', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['', 'null'].some(v=>!v || v==='null')));
    }
    get c1_sections_options() { return [{label: '1', value: '1'}, {label: '2', value: '2'}, {label: '3', value: '3'}, {label: '4', value: '4'}, {label: '5', value: '5'}]; }

    get is_c2_sections_visible() {
        const vals = [this.cp_height_1];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }
    get c2_sections_options() { return [{label: '1', value: '1'}, {label: '2', value: '2'}, {label: '3', value: '3'}, {label: '4', value: '4'}, {label: '5', value: '5'}]; }

    get is_cp_ghost_s2_visible() {
        const vals = [this.cp_height_1];
        return vals.some(val => ['', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['', 'null'].some(v=>!v || v==='null')));
    }

    get is_c3_sections_visible() {
        const vals = [this.cp_height_2];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }
    get c3_sections_options() { return [{label: '1', value: '1'}, {label: '2', value: '2'}, {label: '3', value: '3'}, {label: '4', value: '4'}, {label: '5', value: '5'}]; }

    get is_cp_ghost_s3_visible() {
        const vals = [this.cp_height_2];
        return vals.some(val => ['', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['', 'null'].some(v=>!v || v==='null')));
    }

    get is_customized_1_visible() {
        const vals = [this.cp_height_1];
        return vals.some(val => ['*'].includes(val));
    }
    get c1_ms_gi_options() { return [{label: 'Galvanized', value: 'Galvanized'}, {label: 'Mild Steel', value: 'Mild Steel'}]; }
    get c1_tolerance_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_c1_top_sec_hdr_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2', '3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['2', '3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_pole_dim_hdr_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['1'].includes(val) || (['', null, 'null'].includes(val) && ['1'].some(v=>!v || v==='null')));
    }

    get is_c1_pole_dim_hdr_spacer_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_c1_tol_pct_visible() {
        const vals = [this.c1_tolerance];
        return vals.some(val => ['YES'].includes(val) || (['', null, 'null'].includes(val) && ['YES'].some(v=>!v || v==='null')));
    }

    get is_c1_tol_spacer_visible() {
        const vals = [this.c1_tolerance];
        return vals.some(val => ['NO', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['NO', '', 'null'].some(v=>!v || v==='null')));
    }
    get c1_for_options() { return [{label: 'Lump sum', value: 'Lump sum'}, {label: 'Per pcs', value: 'Per pcs'}]; }

    get is_c1_for_lump_visible() {
        const vals = [this.c1_for];
        return vals.some(val => ['Lump sum'].includes(val) || (['', null, 'null'].includes(val) && ['Lump sum'].some(v=>!v || v==='null')));
    }

    get is_c1_for_transp_visible() {
        const vals = [this.c1_for];
        return vals.some(val => ['Per pcs'].includes(val) || (['', null, 'null'].includes(val) && ['Per pcs'].some(v=>!v || v==='null')));
    }

    get is_c1_for_spacer_visible() {
        const vals = [this.c1_for];
        return vals.some(val => ['', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_top_dia_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }
    get c1_top_dia_options() { return [{label: '33.7', value: '33.7'}, {label: '42.4', value: '42.4'}, {label: '48.3', value: '48.3'}, {label: '60.3', value: '60.3'}, {label: '76.1', value: '76.1'}, {label: '88.9', value: '88.9'}, {label: '101.6', value: '101.6'}, {label: '114.3', value: '114.3'}, {label: '127', value: '127'}, {label: '139.7', value: '139.7'}, {label: '152.4', value: '152.4'}, {label: '165.1', value: '165.1'}, {label: '168.3', value: '168.3'}, {label: '193.7', value: '193.7'}, {label: '219.1', value: '219.1'}]; }

    get is_c1_top_thk_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_c1_top_len_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_c1_top_dash1_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_c1_top_dash2_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_c1_top_dash3_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_c1_mid2_hdr2_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid2_dia_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['3', '4', '5'].some(v=>!v || v==='null')));
    }
    get c1_mid2_dia_options() { return [{label: '33.7', value: '33.7'}, {label: '42.4', value: '42.4'}, {label: '48.3', value: '48.3'}, {label: '60.3', value: '60.3'}, {label: '76.1', value: '76.1'}, {label: '88.9', value: '88.9'}, {label: '101.6', value: '101.6'}, {label: '114.3', value: '114.3'}, {label: '127', value: '127'}, {label: '139.7', value: '139.7'}, {label: '152.4', value: '152.4'}, {label: '165.1', value: '165.1'}, {label: '168.3', value: '168.3'}, {label: '193.7', value: '193.7'}, {label: '219.1', value: '219.1'}]; }

    get is_c1_mid2_thk_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid2_len_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid2_d1_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid2_d2_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid2_d3_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid3_hdr2_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid3_dia_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['4', '5'].some(v=>!v || v==='null')));
    }
    get c1_mid3_dia_options() { return [{label: '33.7', value: '33.7'}, {label: '42.4', value: '42.4'}, {label: '48.3', value: '48.3'}, {label: '60.3', value: '60.3'}, {label: '76.1', value: '76.1'}, {label: '88.9', value: '88.9'}, {label: '101.6', value: '101.6'}, {label: '114.3', value: '114.3'}, {label: '127', value: '127'}, {label: '139.7', value: '139.7'}, {label: '152.4', value: '152.4'}, {label: '165.1', value: '165.1'}, {label: '168.3', value: '168.3'}, {label: '193.7', value: '193.7'}, {label: '219.1', value: '219.1'}]; }

    get is_c1_mid3_thk_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid3_len_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid3_d1_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid3_d2_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid3_d3_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid4_hdr2_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['5'].includes(val) || (['', null, 'null'].includes(val) && ['5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid4_dia_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['5'].includes(val) || (['', null, 'null'].includes(val) && ['5'].some(v=>!v || v==='null')));
    }
    get c1_mid4_dia_options() { return [{label: '33.7', value: '33.7'}, {label: '42.4', value: '42.4'}, {label: '48.3', value: '48.3'}, {label: '60.3', value: '60.3'}, {label: '76.1', value: '76.1'}, {label: '88.9', value: '88.9'}, {label: '101.6', value: '101.6'}, {label: '114.3', value: '114.3'}, {label: '127', value: '127'}, {label: '139.7', value: '139.7'}, {label: '152.4', value: '152.4'}, {label: '165.1', value: '165.1'}, {label: '168.3', value: '168.3'}, {label: '193.7', value: '193.7'}, {label: '219.1', value: '219.1'}]; }

    get is_c1_mid4_thk_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['5'].includes(val) || (['', null, 'null'].includes(val) && ['5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid4_len_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['5'].includes(val) || (['', null, 'null'].includes(val) && ['5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid4_d1_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['5'].includes(val) || (['', null, 'null'].includes(val) && ['5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid4_d2_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['5'].includes(val) || (['', null, 'null'].includes(val) && ['5'].some(v=>!v || v==='null')));
    }

    get is_c1_mid4_d3_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['5'].includes(val) || (['', null, 'null'].includes(val) && ['5'].some(v=>!v || v==='null')));
    }

    get is_c1_bot_hdr1_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2', '3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['2', '3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_bot_dia_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2', '3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['2', '3', '4', '5'].some(v=>!v || v==='null')));
    }
    get c1_bot_dia_options() { return [{label: '33.7', value: '33.7'}, {label: '42.4', value: '42.4'}, {label: '48.3', value: '48.3'}, {label: '60.3', value: '60.3'}, {label: '76.1', value: '76.1'}, {label: '88.9', value: '88.9'}, {label: '101.6', value: '101.6'}, {label: '114.3', value: '114.3'}, {label: '127', value: '127'}, {label: '139.7', value: '139.7'}, {label: '152.4', value: '152.4'}, {label: '165.1', value: '165.1'}, {label: '168.3', value: '168.3'}, {label: '193.7', value: '193.7'}, {label: '219.1', value: '219.1'}]; }

    get is_c1_bot_thk_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2', '3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['2', '3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_bot_len_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2', '3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['2', '3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_bot_d1_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2', '3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['2', '3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_bot_d2_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2', '3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['2', '3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_bot_d3_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2', '3', '4', '5'].includes(val) || (['', null, 'null'].includes(val) && ['2', '3', '4', '5'].some(v=>!v || v==='null')));
    }

    get is_c1_section1_normal_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['1'].includes(val) || (['', null, 'null'].includes(val) && ['1'].some(v=>!v || v==='null')));
    }

    get is_c1_section1_additional_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['1'].includes(val) || (['', null, 'null'].includes(val) && ['1'].some(v=>!v || v==='null')));
    }

    get is_c1_section1_final_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['1'].includes(val) || (['', null, 'null'].includes(val) && ['1'].some(v=>!v || v==='null')));
    }

    get is_c1_sec1_unit_price_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['1'].includes(val) || (['', null, 'null'].includes(val) && ['1'].some(v=>!v || v==='null')));
    }

    get is_c1_section2_normal_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2'].includes(val) || (['', null, 'null'].includes(val) && ['2'].some(v=>!v || v==='null')));
    }

    get is_c1_section2_additional_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2'].includes(val) || (['', null, 'null'].includes(val) && ['2'].some(v=>!v || v==='null')));
    }

    get is_c1_section2_final_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2'].includes(val) || (['', null, 'null'].includes(val) && ['2'].some(v=>!v || v==='null')));
    }

    get is_c1_sec2_unit_price_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['2'].includes(val) || (['', null, 'null'].includes(val) && ['2'].some(v=>!v || v==='null')));
    }

    get is_c1_section3_normal_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['3'].includes(val) || (['', null, 'null'].includes(val) && ['3'].some(v=>!v || v==='null')));
    }

    get is_c1_section3_additional_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['3'].includes(val) || (['', null, 'null'].includes(val) && ['3'].some(v=>!v || v==='null')));
    }

    get is_c1_section3_final_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['3'].includes(val) || (['', null, 'null'].includes(val) && ['3'].some(v=>!v || v==='null')));
    }

    get is_c1_sec3_unit_price_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['3'].includes(val) || (['', null, 'null'].includes(val) && ['3'].some(v=>!v || v==='null')));
    }

    get is_c1_section4_normal_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['4'].includes(val) || (['', null, 'null'].includes(val) && ['4'].some(v=>!v || v==='null')));
    }

    get is_c1_section4_additional_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['4'].includes(val) || (['', null, 'null'].includes(val) && ['4'].some(v=>!v || v==='null')));
    }

    get is_c1_section4_final_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['4'].includes(val) || (['', null, 'null'].includes(val) && ['4'].some(v=>!v || v==='null')));
    }

    get is_c1_sec4_unit_price_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['4'].includes(val) || (['', null, 'null'].includes(val) && ['4'].some(v=>!v || v==='null')));
    }

    get is_c1_section5_normal_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['5'].includes(val) || (['', null, 'null'].includes(val) && ['5'].some(v=>!v || v==='null')));
    }

    get is_c1_section5_additional_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['5'].includes(val) || (['', null, 'null'].includes(val) && ['5'].some(v=>!v || v==='null')));
    }

    get is_c1_section5_final_weight_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['5'].includes(val) || (['', null, 'null'].includes(val) && ['5'].some(v=>!v || v==='null')));
    }

    get is_c1_sec5_unit_price_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['5'].includes(val) || (['', null, 'null'].includes(val) && ['5'].some(v=>!v || v==='null')));
    }

    get is_c1_pole_payment_term_visible() {
        const vals = [this.c1_sections];
        return vals.some(val => ['*'].includes(val) || (['', null, 'null'].includes(val) && ['*'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ms_gi_spacer_visible() {
        const vals = [this.c1_bp_ms_gi];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ms_gi_reflect_visible() {
        const vals = [this.c1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_bp_ms_gi_reflect_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_c1_bp_sp_spacer_visible() {
        const vals = [this.c1_bp_sister_plate];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_sp_reflect_visible() {
        const vals = [this.c1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_bp_sp_reflect_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_c1_bp_ms_gi_length_visible() {
        const vals = [this.c1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ms_gi_width_visible() {
        const vals = [this.c1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ms_gi_thickness_visible() {
        const vals = [this.c1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ms_gi_rate_visible() {
        const vals = [this.c1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ms_gi_added_up_visible() {
        const vals = [this.c1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ms_gi_quantity_visible() {
        const vals = [this.c1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_sp_length_visible() {
        const vals = [this.c1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_sp_width_visible() {
        const vals = [this.c1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_sp_thickness_visible() {
        const vals = [this.c1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_sp_rate_visible() {
        const vals = [this.c1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_sp_added_up_visible() {
        const vals = [this.c1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_sp_quantity_visible() {
        const vals = [this.c1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ci_is_spacer_visible() {
        const vals = [this.c1_bp_cast_iron_is];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ci_is_dia_visible() {
        const vals = [this.c1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ci_is_rate_visible() {
        const vals = [this.c1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ci_is_added_up_visible() {
        const vals = [this.c1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ci_is_quantity_visible() {
        const vals = [this.c1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ci_is_reflect_visible() {
        const vals = [this.c1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_bp_ci_is_reflect_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_c1_bp_ci_comm_spacer_visible() {
        const vals = [this.c1_bp_cast_iron_comm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ci_comm_dia_visible() {
        const vals = [this.c1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ci_comm_rate_visible() {
        const vals = [this.c1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ci_comm_added_up_visible() {
        const vals = [this.c1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ci_comm_quantity_visible() {
        const vals = [this.c1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_bp_ci_comm_reflect_visible() {
        const vals = [this.c1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_bp_ci_comm_reflect_options() { return [{label: 'YES', value: 'YES'}, {label: 'NO', value: 'NO'}]; }

    get is_c1_bp_ms_total_amount_visible() {
        const vals = [this.c1_bp_ms_gi];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_sp_total_amount_visible() {
        const vals = [this.c1_bp_sister_plate];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_cast_iron_total_amount_visible() {
        const vals = [this.c1_bp_cast_iron_is];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_cast_iron_comm_total_amount_visible() {
        const vals = [this.c1_bp_cast_iron_comm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_ms_gs_visible() {
        const vals = [this.c1_br_single_arm, this.c1_br_double_arm, this.c1_br_triple_arm, this.c1_br_four_arm, this.c1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_br_ms_gs_options() { return [{label: 'Galvanized', value: 'Galvanized'}, {label: 'Mild Steel', value: 'Mild Steel'}]; }

    get is_c1_br_swan_spacer_visible() {
        const vals = [this.c1_swan_single, this.c1_swan_double, this.c1_swan_triple, this.c1_br_single_arm, this.c1_br_double_arm, this.c1_br_triple_arm, this.c1_br_four_arm, this.c1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_dia_visible() {
        const vals = [this.c1_br_single_arm, this.c1_br_double_arm, this.c1_br_triple_arm, this.c1_br_four_arm, this.c1_br_ring_arm, this.c1_swan_single, this.c1_swan_double, this.c1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_br_dia_options() { return [{label: '33.7', value: '33.7'}, {label: '42.4', value: '42.4'}, {label: '48.3', value: '48.3'}, {label: '60.3', value: '60.3'}, {label: '76.1', value: '76.1'}]; }

    get is_c1_br_thickness_visible() {
        const vals = [this.c1_br_single_arm, this.c1_br_double_arm, this.c1_br_triple_arm, this.c1_br_four_arm, this.c1_br_ring_arm, this.c1_swan_single, this.c1_swan_double, this.c1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_br_thickness_options() { return [{label: '2.9', value: '2.9'}, {label: '3.2', value: '3.2'}, {label: '3.65', value: '3.65'}, {label: '4.5', value: '4.5'}, {label: '4.85', value: '4.85'}, {label: '5.4', value: '5.4'}]; }

    get is_c1_br_length_visible() {
        const vals = [this.c1_br_single_arm, this.c1_br_double_arm, this.c1_br_triple_arm, this.c1_br_four_arm, this.c1_br_ring_arm, this.c1_swan_single, this.c1_swan_double, this.c1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_br_length_options() { return [{label: '0.25', value: '0.25'}, {label: '0.5', value: '0.5'}, {label: '0.75', value: '0.75'}, {label: '1', value: '1'}, {label: '1.25', value: '1.25'}, {label: '1.5', value: '1.5'}, {label: '1.75', value: '1.75'}, {label: '2', value: '2'}, {label: '2.25', value: '2.25'}, {label: '2.5', value: '2.5'}, {label: '2.75', value: '2.75'}, {label: '3', value: '3'}, {label: '3.25', value: '3.25'}, {label: '3.5', value: '3.5'}, {label: '3.75', value: '3.75'}, {label: '4', value: '4'}]; }

    get is_c1_br_sa_spacer_visible() {
        const vals = [this.c1_br_single_arm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_br_sa_rate_visible() {
        const vals = [this.c1_br_single_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_sa_added_up_visible() {
        const vals = [this.c1_br_single_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_sa_quantity_visible() {
        const vals = [this.c1_br_single_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_da_spacer_visible() {
        const vals = [this.c1_br_double_arm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_br_da_rate_visible() {
        const vals = [this.c1_br_double_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_da_added_up_visible() {
        const vals = [this.c1_br_double_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_da_quantity_visible() {
        const vals = [this.c1_br_double_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_ta_spacer_visible() {
        const vals = [this.c1_br_triple_arm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_br_ta_rate_visible() {
        const vals = [this.c1_br_triple_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_ta_added_up_visible() {
        const vals = [this.c1_br_triple_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_ta_quantity_visible() {
        const vals = [this.c1_br_triple_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_fa_spacer_visible() {
        const vals = [this.c1_br_four_arm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_br_fa_rate_visible() {
        const vals = [this.c1_br_four_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_fa_added_up_visible() {
        const vals = [this.c1_br_four_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_fa_quantity_visible() {
        const vals = [this.c1_br_four_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_ra_spacer_visible() {
        const vals = [this.c1_br_ring_arm];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_br_ra_rate_visible() {
        const vals = [this.c1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_ra_added_up_visible() {
        const vals = [this.c1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_ra_quantity_visible() {
        const vals = [this.c1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_sa_total_amount_visible() {
        const vals = [this.c1_br_single_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_da_total_amount_visible() {
        const vals = [this.c1_br_double_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_ta_total_amount_visible() {
        const vals = [this.c1_br_triple_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_fa_total_amount_visible() {
        const vals = [this.c1_br_four_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_br_ra_total_amount_visible() {
        const vals = [this.c1_br_ring_arm];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_ms_gs_visible() {
        const vals = [this.c1_swan_single, this.c1_swan_double, this.c1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_swan_ms_gs_options() { return [{label: 'Galvanized', value: 'Galvanized'}, {label: 'Mild Steel', value: 'Mild Steel'}]; }

    get is_c1_swan_hdr_spacer_active_visible() {
        const vals = [this.c1_swan_single, this.c1_swan_double, this.c1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_s_spacer_visible() {
        const vals = [this.c1_swan_single];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_s_rate_visible() {
        const vals = [this.c1_swan_single];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_s_added_visible() {
        const vals = [this.c1_swan_single];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_s_qty_visible() {
        const vals = [this.c1_swan_single];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_d_spacer_visible() {
        const vals = [this.c1_swan_double];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_d_rate_visible() {
        const vals = [this.c1_swan_double];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_d_added_visible() {
        const vals = [this.c1_swan_double];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_d_qty_visible() {
        const vals = [this.c1_swan_double];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_t_spacer_visible() {
        const vals = [this.c1_swan_triple];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_t_rate_visible() {
        const vals = [this.c1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_t_added_visible() {
        const vals = [this.c1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_t_qty_visible() {
        const vals = [this.c1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_sa_total_amount_visible() {
        const vals = [this.c1_swan_single];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_da_total_amount_visible() {
        const vals = [this.c1_swan_double];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_swan_ta_total_amount_visible() {
        const vals = [this.c1_swan_triple];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_fb_spacer_visible() {
        const vals = [this.c1_fb_check];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_fb_dia_visible() {
        const vals = [this.c1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_fb_dia_options() { return [{label: '12', value: '12'}, {label: '16', value: '16'}, {label: '20', value: '20'}, {label: '24', value: '24'}]; }

    get is_c1_fb_length_visible() {
        const vals = [this.c1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_fb_qty_visible() {
        const vals = [this.c1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_fb_rate_visible() {
        const vals = [this.c1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_fb_added_up_visible() {
        const vals = [this.c1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_fb_spacer_visible() {
        const vals = [this.c1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_fb_quantity_visible() {
        const vals = [this.c1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_fb_spacer2_visible() {
        const vals = [this.c1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_ad_top_spacer_visible() {
        const vals = [this.c1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_ad_cep_dia_visible() {
        const vals = [this.c1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_ad_cep_dia_options() { return [{label: '33.7', value: '33.7'}, {label: '42.4', value: '42.4'}, {label: '48.3', value: '48.3'}, {label: '60.3', value: '60.3'}, {label: '76.1', value: '76.1'}]; }

    get is_c1_ad_cep_thickness_visible() {
        const vals = [this.c1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_ad_cep_thickness_options() { return [{label: '2.9', value: '2.9'}, {label: '3.2', value: '3.2'}, {label: '3.65', value: '3.65'}, {label: '4.5', value: '4.5'}, {label: '4.85', value: '4.85'}, {label: '5.4', value: '5.4'}]; }

    get is_c1_ad_cep_length_visible() {
        const vals = [this.c1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }
    get c1_ad_cep_length_options() { return [{label: '0.25', value: '0.25'}, {label: '0.5', value: '0.5'}, {label: '0.75', value: '0.75'}, {label: '1', value: '1'}, {label: '1.25', value: '1.25'}, {label: '1.5', value: '1.5'}, {label: '1.75', value: '1.75'}, {label: '2', value: '2'}, {label: '2.25', value: '2.25'}, {label: '2.5', value: '2.5'}, {label: '2.75', value: '2.75'}, {label: '3', value: '3'}, {label: '3.25', value: '3.25'}, {label: '3.5', value: '3.5'}, {label: '3.75', value: '3.75'}, {label: '4', value: '4'}]; }

    get is_c1_ad_cep_false_spacer_visible() {
        const vals = [this.c1_ad_cep_check];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_ad_cep_qty_visible() {
        const vals = [this.c1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_ad_cep_rate_visible() {
        const vals = [this.c1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_ad_cep_added_up_visible() {
        const vals = [this.c1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_fb_ad_cep_quantity_visible() {
        const vals = [this.c1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_ad_mid_spacer_visible() {
        const vals = [this.c1_ad_cep_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_ad_add_false_spacer_visible() {
        const vals = [this.c1_ad_add_check];
        return vals.some(val => ['false', '', 'null'].includes(val) || (['', null, 'null'].includes(val) && ['false', '', 'null'].some(v=>!v || v==='null')));
    }

    get is_c1_ad_add_note_visible() {
        const vals = [this.c1_ad_add_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_foundation_total_amount_visible() {
        const vals = [this.c1_fb_check];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_c1_addi_total_amount_visible() {
        const vals = [this.c1_swan_single];
        return vals.some(val => ['true'].includes(val) || (['', null, 'null'].includes(val) && ['true'].some(v=>!v || v==='null')));
    }

    get is_customized_2_visible() {
        const vals = [this.cp_height_2];
        return vals.some(val => ['*'].includes(val));
    }

    get is_customized_3_visible() {
        const vals = [this.cp_height_3];
        return vals.some(val => ['*'].includes(val));
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
        let ms_gi_1 = this.ms_gi_1 || 0;
        let ms_gi_2 = this.ms_gi_2 || 0;
        let ms_gi_3 = this.ms_gi_3 || 0;
        let d1_tolerance_percent = this.d1_tolerance_percent || 0;
        let d1_for = this.d1_for || 0;
        let d1_lump_sum = this.d1_lump_sum || 0;
        let d1_transportation = this.d1_transportation || 0;
        let d1_designation = this.d1_designation || 0;
        let d1_tolerance = this.d1_tolerance || 0;
        let d1_added_up = this.d1_added_up || 0;
        let d1_quantity = this.d1_quantity || 0;
        let d1_bp_ms_gi = this.d1_bp_ms_gi || 0;
        let d1_bp_sister_plate = this.d1_bp_sister_plate || 0;
        let d1_bp_ms_gi_reflect = this.d1_bp_ms_gi_reflect || 0;
        let d1_bp_sp_reflect = this.d1_bp_sp_reflect || 0;
        let d1_bp_ms_gi_length = this.d1_bp_ms_gi_length || 0;
        let d1_bp_ms_gi_width = this.d1_bp_ms_gi_width || 0;
        let d1_bp_ms_gi_thickness = this.d1_bp_ms_gi_thickness || 0;
        let d1_bp_ms_gi_added_up = this.d1_bp_ms_gi_added_up || 0;
        let d1_bp_ms_gi_quantity = this.d1_bp_ms_gi_quantity || 0;
        let d1_bp_sp_length = this.d1_bp_sp_length || 0;
        let d1_bp_sp_width = this.d1_bp_sp_width || 0;
        let d1_bp_sp_thickness = this.d1_bp_sp_thickness || 0;
        let d1_bp_sp_added_up = this.d1_bp_sp_added_up || 0;
        let d1_bp_sp_quantity = this.d1_bp_sp_quantity || 0;
        let d1_bp_cast_iron_is = this.d1_bp_cast_iron_is || 0;
        let d1_bp_ci_is_dia = this.d1_bp_ci_is_dia || 0;
        let d1_bp_ci_is_added_up = this.d1_bp_ci_is_added_up || 0;
        let d1_bp_ci_is_quantity = this.d1_bp_ci_is_quantity || 0;
        let d1_bp_ci_is_reflect = this.d1_bp_ci_is_reflect || 0;
        let d1_bp_cast_iron_comm = this.d1_bp_cast_iron_comm || 0;
        let d1_bp_ci_comm_dia = this.d1_bp_ci_comm_dia || 0;
        let d1_bp_ci_comm_added_up = this.d1_bp_ci_comm_added_up || 0;
        let d1_bp_ci_comm_quantity = this.d1_bp_ci_comm_quantity || 0;
        let d1_bp_ci_comm_reflect = this.d1_bp_ci_comm_reflect || 0;
        let d1_br_ms_gs = this.d1_br_ms_gs || 0;
        let d1_br_dia = this.d1_br_dia || 0;
        let d1_br_thickness = this.d1_br_thickness || 0;
        let d1_br_length = this.d1_br_length || 0;
        let d1_br_single_arm = this.d1_br_single_arm || 0;
        let d1_br_sa_added_up = this.d1_br_sa_added_up || 0;
        let d1_br_sa_quantity = this.d1_br_sa_quantity || 0;
        let d1_br_double_arm = this.d1_br_double_arm || 0;
        let d1_br_da_added_up = this.d1_br_da_added_up || 0;
        let d1_br_da_quantity = this.d1_br_da_quantity || 0;
        let d1_br_triple_arm = this.d1_br_triple_arm || 0;
        let d1_br_ta_added_up = this.d1_br_ta_added_up || 0;
        let d1_br_ta_quantity = this.d1_br_ta_quantity || 0;
        let d1_br_four_arm = this.d1_br_four_arm || 0;
        let d1_br_fa_added_up = this.d1_br_fa_added_up || 0;
        let d1_br_fa_quantity = this.d1_br_fa_quantity || 0;
        let d1_br_ring_arm = this.d1_br_ring_arm || 0;
        let d1_br_ra_added_up = this.d1_br_ra_added_up || 0;
        let d1_br_ra_quantity = this.d1_br_ra_quantity || 0;
        let d1_swan_ms_gs = this.d1_swan_ms_gs || 0;
        let d1_swan_single = this.d1_swan_single || 0;
        let d1_swan_s_added = this.d1_swan_s_added || 0;
        let d1_swan_s_qty = this.d1_swan_s_qty || 0;
        let d1_swan_double = this.d1_swan_double || 0;
        let d1_swan_d_added = this.d1_swan_d_added || 0;
        let d1_swan_d_qty = this.d1_swan_d_qty || 0;
        let d1_swan_triple = this.d1_swan_triple || 0;
        let d1_swan_t_added = this.d1_swan_t_added || 0;
        let d1_swan_t_qty = this.d1_swan_t_qty || 0;
        let d1_fb_check = this.d1_fb_check || 0;
        let d1_fb_dia = this.d1_fb_dia || 0;
        let d1_fb_length = this.d1_fb_length || 0;
        let d1_fb_qty = this.d1_fb_qty || 0;
        let d1_fb_added_up = this.d1_fb_added_up || 0;
        let d1_fb_quantity = this.d1_fb_quantity || 0;
        let d1_ad_cep_dia = this.d1_ad_cep_dia || 0;
        let d1_ad_cep_thickness = this.d1_ad_cep_thickness || 0;
        let d1_ad_cep_length = this.d1_ad_cep_length || 0;
        let d1_ad_cep_check = this.d1_ad_cep_check || 0;
        let d1_ad_cep_qty = this.d1_ad_cep_qty || 0;
        let d1_ad_cep_added_up = this.d1_ad_cep_added_up || 0;
        let d1_fb_ad_cep_quantity = this.d1_fb_ad_cep_quantity || 0;
        let d1_ad_add_check = this.d1_ad_add_check || 0;
        let d1_ad_add_note = this.d1_ad_add_note || 0;
        let cp_height_1 = this.cp_height_1 || 0;
        let cp_height_2 = this.cp_height_2 || 0;
        let cp_height_3 = this.cp_height_3 || 0;
        let c1_sections = this.c1_sections || 0;
        let c2_sections = this.c2_sections || 0;
        let c3_sections = this.c3_sections || 0;
        let c1_ms_gi = this.c1_ms_gi || 0;
        let c1_tolerance = this.c1_tolerance || 0;
        let c1_added_up = this.c1_added_up || 0;
        let c1_quantity = this.c1_quantity || 0;
        let c1_swan = this.c1_swan || 0;
        let c1_tol_pct = this.c1_tol_pct || 0;
        let c1_for = this.c1_for || 0;
        let c1_for_lump = this.c1_for_lump || 0;
        let c1_for_transp = this.c1_for_transp || 0;
        let c1_top_dia = this.c1_top_dia || 0;
        let c1_top_thk = this.c1_top_thk || 0;
        let c1_top_len = this.c1_top_len || 0;
        let c1_mid2_dia = this.c1_mid2_dia || 0;
        let c1_mid2_thk = this.c1_mid2_thk || 0;
        let c1_mid2_len = this.c1_mid2_len || 0;
        let c1_mid3_dia = this.c1_mid3_dia || 0;
        let c1_mid3_thk = this.c1_mid3_thk || 0;
        let c1_mid3_len = this.c1_mid3_len || 0;
        let c1_mid4_dia = this.c1_mid4_dia || 0;
        let c1_mid4_thk = this.c1_mid4_thk || 0;
        let c1_mid4_len = this.c1_mid4_len || 0;
        let c1_bot_dia = this.c1_bot_dia || 0;
        let c1_bot_thk = this.c1_bot_thk || 0;
        let c1_bot_len = this.c1_bot_len || 0;
        let c1_bp_ms_gi = this.c1_bp_ms_gi || 0;
        let c1_bp_sister_plate = this.c1_bp_sister_plate || 0;
        let c1_bp_ms_gi_reflect = this.c1_bp_ms_gi_reflect || 0;
        let c1_bp_sp_reflect = this.c1_bp_sp_reflect || 0;
        let c1_bp_ms_gi_length = this.c1_bp_ms_gi_length || 0;
        let c1_bp_ms_gi_width = this.c1_bp_ms_gi_width || 0;
        let c1_bp_ms_gi_thickness = this.c1_bp_ms_gi_thickness || 0;
        let c1_bp_ms_gi_added_up = this.c1_bp_ms_gi_added_up || 0;
        let c1_bp_ms_gi_quantity = this.c1_bp_ms_gi_quantity || 0;
        let c1_bp_sp_length = this.c1_bp_sp_length || 0;
        let c1_bp_sp_width = this.c1_bp_sp_width || 0;
        let c1_bp_sp_thickness = this.c1_bp_sp_thickness || 0;
        let c1_bp_sp_added_up = this.c1_bp_sp_added_up || 0;
        let c1_bp_sp_quantity = this.c1_bp_sp_quantity || 0;
        let c1_bp_cast_iron_is = this.c1_bp_cast_iron_is || 0;
        let c1_bp_ci_is_dia = this.c1_bp_ci_is_dia || 0;
        let c1_bp_ci_is_added_up = this.c1_bp_ci_is_added_up || 0;
        let c1_bp_ci_is_quantity = this.c1_bp_ci_is_quantity || 0;
        let c1_bp_ci_is_reflect = this.c1_bp_ci_is_reflect || 0;
        let c1_bp_cast_iron_comm = this.c1_bp_cast_iron_comm || 0;
        let c1_bp_ci_comm_dia = this.c1_bp_ci_comm_dia || 0;
        let c1_bp_ci_comm_added_up = this.c1_bp_ci_comm_added_up || 0;
        let c1_bp_ci_comm_quantity = this.c1_bp_ci_comm_quantity || 0;
        let c1_bp_ci_comm_reflect = this.c1_bp_ci_comm_reflect || 0;
        let c1_br_ms_gs = this.c1_br_ms_gs || 0;
        let c1_br_dia = this.c1_br_dia || 0;
        let c1_br_thickness = this.c1_br_thickness || 0;
        let c1_br_length = this.c1_br_length || 0;
        let c1_br_single_arm = this.c1_br_single_arm || 0;
        let c1_br_sa_added_up = this.c1_br_sa_added_up || 0;
        let c1_br_sa_quantity = this.c1_br_sa_quantity || 0;
        let c1_br_double_arm = this.c1_br_double_arm || 0;
        let c1_br_da_added_up = this.c1_br_da_added_up || 0;
        let c1_br_da_quantity = this.c1_br_da_quantity || 0;
        let c1_br_triple_arm = this.c1_br_triple_arm || 0;
        let c1_br_ta_added_up = this.c1_br_ta_added_up || 0;
        let c1_br_ta_quantity = this.c1_br_ta_quantity || 0;
        let c1_br_four_arm = this.c1_br_four_arm || 0;
        let c1_br_fa_added_up = this.c1_br_fa_added_up || 0;
        let c1_br_fa_quantity = this.c1_br_fa_quantity || 0;
        let c1_br_ring_arm = this.c1_br_ring_arm || 0;
        let c1_br_ra_added_up = this.c1_br_ra_added_up || 0;
        let c1_br_ra_quantity = this.c1_br_ra_quantity || 0;
        let c1_swan_ms_gs = this.c1_swan_ms_gs || 0;
        let c1_swan_single = this.c1_swan_single || 0;
        let c1_swan_s_added = this.c1_swan_s_added || 0;
        let c1_swan_s_qty = this.c1_swan_s_qty || 0;
        let c1_swan_double = this.c1_swan_double || 0;
        let c1_swan_d_added = this.c1_swan_d_added || 0;
        let c1_swan_d_qty = this.c1_swan_d_qty || 0;
        let c1_swan_triple = this.c1_swan_triple || 0;
        let c1_swan_t_added = this.c1_swan_t_added || 0;
        let c1_swan_t_qty = this.c1_swan_t_qty || 0;
        let c1_fb_check = this.c1_fb_check || 0;
        let c1_fb_dia = this.c1_fb_dia || 0;
        let c1_fb_length = this.c1_fb_length || 0;
        let c1_fb_qty = this.c1_fb_qty || 0;
        let c1_fb_added_up = this.c1_fb_added_up || 0;
        let c1_fb_quantity = this.c1_fb_quantity || 0;
        let c1_ad_cep_dia = this.c1_ad_cep_dia || 0;
        let c1_ad_cep_thickness = this.c1_ad_cep_thickness || 0;
        let c1_ad_cep_length = this.c1_ad_cep_length || 0;
        let c1_ad_cep_check = this.c1_ad_cep_check || 0;
        let c1_ad_cep_qty = this.c1_ad_cep_qty || 0;
        let c1_ad_cep_added_up = this.c1_ad_cep_added_up || 0;
        let c1_fb_ad_cep_quantity = this.c1_fb_ad_cep_quantity || 0;
        let c1_ad_add_check = this.c1_ad_add_check || 0;
        let c1_ad_add_note = this.c1_ad_add_note || 0;
        let height_1 = this.height_1 || 0;
        let height_2 = this.height_2 || 0;
        let height_3 = this.height_3 || 0;
        let d1_rate = this.d1_rate || 0;
        let d1_base_weight = this.d1_base_weight || 0;
        let d1_base_length = this.d1_base_length || 0;
        let d1_weight = this.d1_weight || 0;
        let d1_pole_total_amount = this.d1_pole_total_amount || 0;
        let d1_pole_payment_term = this.d1_pole_payment_term || 0;
        let d1_bp_ms_gi_rate = this.d1_bp_ms_gi_rate || 0;
        let d1_bp_sp_rate = this.d1_bp_sp_rate || 0;
        let d1_bp_ci_is_rate = this.d1_bp_ci_is_rate || 0;
        let d1_bp_ci_comm_rate = this.d1_bp_ci_comm_rate || 0;
        let d1_bp_ms_total_amount = this.d1_bp_ms_total_amount || 0;
        let d1_sp_total_amount = this.d1_sp_total_amount || 0;
        let d1_cast_iron_total_amount = this.d1_cast_iron_total_amount || 0;
        let d1_cast_iron_comm_total_amount = this.d1_cast_iron_comm_total_amount || 0;
        let d1_br_sa_rate = this.d1_br_sa_rate || 0;
        let d1_br_da_rate = this.d1_br_da_rate || 0;
        let d1_br_ta_rate = this.d1_br_ta_rate || 0;
        let d1_br_fa_rate = this.d1_br_fa_rate || 0;
        let d1_br_ra_rate = this.d1_br_ra_rate || 0;
        let d1_br_sa_total_amount = this.d1_br_sa_total_amount || 0;
        let d1_br_da_total_amount = this.d1_br_da_total_amount || 0;
        let d1_br_ta_total_amount = this.d1_br_ta_total_amount || 0;
        let d1_br_fa_total_amount = this.d1_br_fa_total_amount || 0;
        let d1_br_ra_total_amount = this.d1_br_ra_total_amount || 0;
        let d1_swan_s_rate = this.d1_swan_s_rate || 0;
        let d1_swan_d_rate = this.d1_swan_d_rate || 0;
        let d1_swan_t_rate = this.d1_swan_t_rate || 0;
        let d1_swan_sa_total_amount = this.d1_swan_sa_total_amount || 0;
        let d1_swan_da_total_amount = this.d1_swan_da_total_amount || 0;
        let d1_swan_ta_total_amount = this.d1_swan_ta_total_amount || 0;
        let d1_fb_rate = this.d1_fb_rate || 0;
        let d1_ad_cep_rate = this.d1_ad_cep_rate || 0;
        let d1_foundation_total_amount = this.d1_foundation_total_amount || 0;
        let d1_addi_total_amount = this.d1_addi_total_amount || 0;
        let d1_final_total_amount = this.d1_final_total_amount || 0;
        let d1_final_added_up_cost = this.d1_final_added_up_cost || 0;
        let d1_final_added_up_std_rate = this.d1_final_added_up_std_rate || 0;
        let d1_final_unit_cost = this.d1_final_unit_cost || 0;
        let d1_final_list_price = this.d1_final_list_price || 0;
        let c1_rate = this.c1_rate || 0;
        let c1_section1_normal_weight = this.c1_section1_normal_weight || 0;
        let c1_section1_additional_weight = this.c1_section1_additional_weight || 0;
        let c1_section1_final_weight = this.c1_section1_final_weight || 0;
        let c1_sec1_unit_price = this.c1_sec1_unit_price || 0;
        let c1_section2_normal_weight = this.c1_section2_normal_weight || 0;
        let c1_section2_additional_weight = this.c1_section2_additional_weight || 0;
        let c1_section2_final_weight = this.c1_section2_final_weight || 0;
        let c1_sec2_unit_price = this.c1_sec2_unit_price || 0;
        let c1_section3_normal_weight = this.c1_section3_normal_weight || 0;
        let c1_section3_additional_weight = this.c1_section3_additional_weight || 0;
        let c1_section3_final_weight = this.c1_section3_final_weight || 0;
        let c1_sec3_unit_price = this.c1_sec3_unit_price || 0;
        let c1_section4_normal_weight = this.c1_section4_normal_weight || 0;
        let c1_section4_additional_weight = this.c1_section4_additional_weight || 0;
        let c1_section4_final_weight = this.c1_section4_final_weight || 0;
        let c1_sec4_unit_price = this.c1_sec4_unit_price || 0;
        let c1_section5_normal_weight = this.c1_section5_normal_weight || 0;
        let c1_section5_additional_weight = this.c1_section5_additional_weight || 0;
        let c1_section5_final_weight = this.c1_section5_final_weight || 0;
        let c1_sec5_unit_price = this.c1_sec5_unit_price || 0;
        let c1_pole_payment_term = this.c1_pole_payment_term || 0;
        let c1_bp_ms_gi_rate = this.c1_bp_ms_gi_rate || 0;
        let c1_bp_sp_rate = this.c1_bp_sp_rate || 0;
        let c1_bp_ci_is_rate = this.c1_bp_ci_is_rate || 0;
        let c1_bp_ci_comm_rate = this.c1_bp_ci_comm_rate || 0;
        let c1_bp_ms_total_amount = this.c1_bp_ms_total_amount || 0;
        let c1_sp_total_amount = this.c1_sp_total_amount || 0;
        let c1_cast_iron_total_amount = this.c1_cast_iron_total_amount || 0;
        let c1_cast_iron_comm_total_amount = this.c1_cast_iron_comm_total_amount || 0;
        let c1_br_sa_rate = this.c1_br_sa_rate || 0;
        let c1_br_da_rate = this.c1_br_da_rate || 0;
        let c1_br_ta_rate = this.c1_br_ta_rate || 0;
        let c1_br_fa_rate = this.c1_br_fa_rate || 0;
        let c1_br_ra_rate = this.c1_br_ra_rate || 0;
        let c1_br_sa_total_amount = this.c1_br_sa_total_amount || 0;
        let c1_br_da_total_amount = this.c1_br_da_total_amount || 0;
        let c1_br_ta_total_amount = this.c1_br_ta_total_amount || 0;
        let c1_br_fa_total_amount = this.c1_br_fa_total_amount || 0;
        let c1_br_ra_total_amount = this.c1_br_ra_total_amount || 0;
        let c1_swan_s_rate = this.c1_swan_s_rate || 0;
        let c1_swan_d_rate = this.c1_swan_d_rate || 0;
        let c1_swan_t_rate = this.c1_swan_t_rate || 0;
        let c1_swan_sa_total_amount = this.c1_swan_sa_total_amount || 0;
        let c1_swan_da_total_amount = this.c1_swan_da_total_amount || 0;
        let c1_swan_ta_total_amount = this.c1_swan_ta_total_amount || 0;
        let c1_fb_rate = this.c1_fb_rate || 0;
        let c1_ad_cep_rate = this.c1_ad_cep_rate || 0;
        let c1_foundation_total_amount = this.c1_foundation_total_amount || 0;
        let c1_addi_total_amount = this.c1_addi_total_amount || 0;
        let c1_final_total_amount = this.c1_final_total_amount || 0;
        let c1_final_added_up_cost = this.c1_final_added_up_cost || 0;
        let c1_final_added_up_std_rate = this.c1_final_added_up_std_rate || 0;
        let c1_final_unit_cost = this.c1_final_unit_cost || 0;
        let c1_final_list_price = this.c1_final_list_price || 0;
        let tc_payment_terms_picklist = this.savedData ? this.savedData.tc_payment_terms_picklist : null;
        try { height_1 = (d1_base_length || 0); this.height_1 = height_1; } catch(e) { console.error(e); this.height_1 = 0; }
        try { height_2 = (d2_base_length || 0); this.height_2 = height_2; } catch(e) { console.error(e); this.height_2 = 0; }
        try { height_3 = (d3_base_length || 0); this.height_3 = height_3; } catch(e) { console.error(e); this.height_3 = 0; }
        try { d1_rate = Math.round((d1_weight || 0) * (ms_gi_1 == 'Galvanized' ? 83 : 64) * (1 + ((d1_added_up || 0) / 100))); this.d1_rate = d1_rate; } catch(e) { console.error(e); this.d1_rate = 0; }
        var m_d1_base_weight = {"410-SP-01":62,"410-SP-02":73,"410-SP-03":85,"410-SP-04":67,"410-SP-05":79,"410-SP-06":93,"410-SP-07":97,"410-SP-08":103,"410-SP-09":110,"410-SP-10":70,"410-SP-11":83,"410-SP-12":97,"410-SP-13":101,"410-SP-14":111,"410-SP-15":119,"410-SP-16":75,"410-SP-17":89,"410-SP-18":104,"410-SP-19":109,"410-SP-20":115,"410-SP-21":129,"410-SP-22":141,"410-SP-23":148,"410-SP-24":158,"410-SP-25":78,"410-SP-26":92,"410-SP-27":108,"410-SP-28":113,"410-SP-29":125,"410-SP-30":133,"410-SP-31":147,"410-SP-32":154,"410-SP-33":164,"410-SP-34":122,"410-SP-35":129,"410-SP-36":137,"410-SP-37":153,"410-SP-38":160,"410-SP-39":170,"410-SP-40":128,"410-SP-41":135,"410-SP-42":144,"410-SP-43":160,"410-SP-44":168,"410-SP-45":178,"410-SP-46":208,"410-SP-47":221,"410-SP-48":223,"410-SP-49":140,"410-SP-50":147,"410-SP-51":164,"410-SP-52":175,"410-SP-53":183,"410-SP-54":194,"410-SP-55":227,"410-SP-56":241,"410-SP-57":257,"410-SP-58":186,"410-SP-59":197,"410-SP-60":208,"410-SP-61":245,"410-SP-62":259,"410-SP-63":277,"410-SP-64":292,"410-SP-65":313,"410-SP-66":322,"410-SP-67":261,"410-SP-68":281,"410-SP-69":302,"410-SP-70":312,"410-SP-71":333,"410-SP-72":343,"410-SP-73":312,"410-SP-74":336,"410-SP-75":370,"410-SP-76":380,"410-SP-77":341,"410-SP-78":367,"410-SP-79":405,"410-SP-80":416}; this.d1_base_weight = m_d1_base_weight[this.d1_designation] || 0;
        d1_base_weight = this.d1_base_weight;
        var m_d1_base_length = {"410-SP-01":7,"410-SP-02":7,"410-SP-03":7,"410-SP-04":7.5,"410-SP-05":7.5,"410-SP-06":7.5,"410-SP-07":7.5,"410-SP-08":7.5,"410-SP-09":7.5,"410-SP-10":8,"410-SP-11":8,"410-SP-12":8,"410-SP-13":8,"410-SP-14":8,"410-SP-15":8,"410-SP-16":8.5,"410-SP-17":8.5,"410-SP-18":8.5,"410-SP-19":8.5,"410-SP-20":8.5,"410-SP-21":8.5,"410-SP-22":8.5,"410-SP-23":8.5,"410-SP-24":8.5,"410-SP-25":9,"410-SP-26":9,"410-SP-27":9,"410-SP-28":9,"410-SP-29":9,"410-SP-30":9,"410-SP-31":9,"410-SP-32":9,"410-SP-33":9,"410-SP-34":9.5,"410-SP-35":9.5,"410-SP-36":9.5,"410-SP-37":9.5,"410-SP-38":9.5,"410-SP-39":9.5,"410-SP-40":10,"410-SP-41":10,"410-SP-42":10,"410-SP-43":10,"410-SP-44":10,"410-SP-45":10,"410-SP-46":10,"410-SP-47":10,"410-SP-48":10,"410-SP-49":11,"410-SP-50":11,"410-SP-51":11,"410-SP-52":11,"410-SP-53":11,"410-SP-54":11,"410-SP-55":11,"410-SP-56":11,"410-SP-57":11,"410-SP-58":12,"410-SP-59":12,"410-SP-60":12,"410-SP-61":12,"410-SP-62":12,"410-SP-63":12,"410-SP-64":12,"410-SP-65":12,"410-SP-66":12,"410-SP-67":13,"410-SP-68":13,"410-SP-69":13,"410-SP-70":13,"410-SP-71":13,"410-SP-72":13,"410-SP-73":14.5,"410-SP-74":14.5,"410-SP-75":14.5,"410-SP-76":14.5,"410-SP-77":16,"410-SP-78":16,"410-SP-79":16,"410-SP-80":16}; this.d1_base_length = m_d1_base_length[this.d1_designation] || 0;
        d1_base_length = this.d1_base_length;
        try { d1_weight = (d1_base_weight || 0) - ((d1_base_weight || 0) * ((d1_tolerance_percent || 0) / 100)); this.d1_weight = d1_weight; } catch(e) { console.error(e); this.d1_weight = 0; }
        try { d1_pole_total_amount = ((Math.ceil(((d1_rate || 0) + (d1_bp_ms_gi_reflect == 'NO' ? (Math.ceil((d1_bp_ms_gi_rate || 0) / 10) * 10) : 0) + ((d1_transportation || 0) * (d1_base_weight || 0)) + ((typeof tc_payment_terms_picklist !== 'undefined' && (tc_payment_terms_picklist == 'Against LC Before Dispatch' || tc_payment_terms_picklist == 'Against VFS')) ? ((ms_gi_1 == 'Galvanized' ? 83 : 64) * (1 + (0.08 / 12))) : 0)) / 10) * 10) * (d1_quantity || 0)); this.d1_pole_total_amount = d1_pole_total_amount; } catch(e) { console.error(e); this.d1_pole_total_amount = 0; }
        try { d1_pole_payment_term = ((typeof tc_payment_terms_picklist !== 'undefined' && (tc_payment_terms_picklist == 'Against LC Before Dispatch' || tc_payment_terms_picklist == 'Against VFS')) ? ((ms_gi_1 == 'Galvanized' ? 83 : 64) * (1 + (0.08 / 12))) : 0); this.d1_pole_payment_term = d1_pole_payment_term; } catch(e) { console.error(e); this.d1_pole_payment_term = 0; }
        try { d1_bp_ms_gi_rate = ((d1_bp_ms_gi_length || 0) * (d1_bp_ms_gi_width || 0) * (d1_bp_ms_gi_thickness || 0) * 7.86 * 64) * (1 + ((d1_bp_ms_gi_added_up || 0) / 100)); this.d1_bp_ms_gi_rate = d1_bp_ms_gi_rate; } catch(e) { console.error(e); this.d1_bp_ms_gi_rate = 0; }
        try { d1_bp_sp_rate = ((d1_bp_sp_length || 0) * (d1_bp_sp_width || 0) * (d1_bp_sp_thickness || 0) * 7.86 * 64) * (1 + ((d1_bp_sp_added_up || 0) / 100)); this.d1_bp_sp_rate = d1_bp_sp_rate; } catch(e) { console.error(e); this.d1_bp_sp_rate = 0; }
        try { d1_bp_ci_is_rate = (800 * (1 + ((d1_bp_ci_is_added_up || 0) / 100))); this.d1_bp_ci_is_rate = d1_bp_ci_is_rate; } catch(e) { console.error(e); this.d1_bp_ci_is_rate = 0; }
        try { d1_bp_ci_comm_rate = (400 * (1 + ((d1_bp_ci_comm_added_up || 0) / 100))); this.d1_bp_ci_comm_rate = d1_bp_ci_comm_rate; } catch(e) { console.error(e); this.d1_bp_ci_comm_rate = 0; }
        try { d1_bp_ms_total_amount = (Math.ceil((d1_bp_ms_gi_rate || 0) / 10) * 10) * (d1_bp_ms_gi_quantity || 0); this.d1_bp_ms_total_amount = d1_bp_ms_total_amount; } catch(e) { console.error(e); this.d1_bp_ms_total_amount = 0; }
        try { d1_sp_total_amount = (Math.ceil((d1_bp_sp_rate || 0) / 10) * 10) * (d1_bp_sp_quantity || 0); this.d1_sp_total_amount = d1_sp_total_amount; } catch(e) { console.error(e); this.d1_sp_total_amount = 0; }
        try { d1_cast_iron_total_amount = (Math.ceil((d1_bp_ci_is_rate || 0) / 10) * 10) * (d1_bp_ci_is_quantity || 0); this.d1_cast_iron_total_amount = d1_cast_iron_total_amount; } catch(e) { console.error(e); this.d1_cast_iron_total_amount = 0; }
        try { d1_cast_iron_comm_total_amount = (Math.ceil((d1_bp_ci_comm_rate || 0) / 10) * 10) * (d1_bp_ci_comm_quantity || 0); this.d1_cast_iron_comm_total_amount = d1_cast_iron_comm_total_amount; } catch(e) { console.error(e); this.d1_cast_iron_comm_total_amount = 0; }
        try { d1_br_sa_rate = ((((d1_br_dia || 0) - (d1_br_thickness || 0)) * (d1_br_thickness || 0) * 0.0246 * (d1_br_length || 0)) * (d1_br_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((d1_br_sa_added_up || 0) / 100))); this.d1_br_sa_rate = d1_br_sa_rate; } catch(e) { console.error(e); this.d1_br_sa_rate = 0; }
        try { d1_br_da_rate = ((((d1_br_dia || 0) - (d1_br_thickness || 0)) * (d1_br_thickness || 0) * 0.0246 * (d1_br_length || 0) * 2) * (d1_br_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((d1_br_da_added_up || 0) / 100))); this.d1_br_da_rate = d1_br_da_rate; } catch(e) { console.error(e); this.d1_br_da_rate = 0; }
        try { d1_br_ta_rate = ((((d1_br_dia || 0) - (d1_br_thickness || 0)) * (d1_br_thickness || 0) * 0.0246 * (d1_br_length || 0) * 3) * (d1_br_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((d1_br_ta_added_up || 0) / 100))); this.d1_br_ta_rate = d1_br_ta_rate; } catch(e) { console.error(e); this.d1_br_ta_rate = 0; }
        try { d1_br_fa_rate = ((((d1_br_dia || 0) - (d1_br_thickness || 0)) * (d1_br_thickness || 0) * 0.0246 * (d1_br_length || 0) * 4) * (d1_br_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((d1_br_fa_added_up || 0) / 100))); this.d1_br_fa_rate = d1_br_fa_rate; } catch(e) { console.error(e); this.d1_br_fa_rate = 0; }
        try { d1_br_ra_rate = ((((d1_br_dia || 0) - (d1_br_thickness || 0)) * (d1_br_thickness || 0) * 0.0246 * (d1_br_length || 0)) * (d1_br_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((d1_br_ra_added_up || 0) / 100))); this.d1_br_ra_rate = d1_br_ra_rate; } catch(e) { console.error(e); this.d1_br_ra_rate = 0; }
        try { d1_br_sa_total_amount = (Math.ceil((d1_br_sa_rate || 0) / 10) * 10) * (d1_br_sa_quantity || 0); this.d1_br_sa_total_amount = d1_br_sa_total_amount; } catch(e) { console.error(e); this.d1_br_sa_total_amount = 0; }
        try { d1_br_da_total_amount = (Math.ceil((d1_br_da_rate || 0) / 10) * 10) * (d1_br_da_quantity || 0); this.d1_br_da_total_amount = d1_br_da_total_amount; } catch(e) { console.error(e); this.d1_br_da_total_amount = 0; }
        try { d1_br_ta_total_amount = (Math.ceil((d1_br_ta_rate || 0) / 10) * 10) * (d1_br_ta_quantity || 0); this.d1_br_ta_total_amount = d1_br_ta_total_amount; } catch(e) { console.error(e); this.d1_br_ta_total_amount = 0; }
        try { d1_br_fa_total_amount = (Math.ceil((d1_br_fa_rate || 0) / 10) * 10) * (d1_br_fa_quantity || 0); this.d1_br_fa_total_amount = d1_br_fa_total_amount; } catch(e) { console.error(e); this.d1_br_fa_total_amount = 0; }
        try { d1_br_ra_total_amount = (Math.ceil((d1_br_ra_rate || 0) / 10) * 10) * (d1_br_ra_quantity || 0); this.d1_br_ra_total_amount = d1_br_ra_total_amount; } catch(e) { console.error(e); this.d1_br_ra_total_amount = 0; }
        try { d1_swan_s_rate = ((((d1_br_dia || 0) - (d1_br_thickness || 0)) * (d1_br_thickness || 0) * 0.0246 * (d1_br_length || 0)) * (d1_swan_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((d1_swan_s_added || 0) / 100))); this.d1_swan_s_rate = d1_swan_s_rate; } catch(e) { console.error(e); this.d1_swan_s_rate = 0; }
        try { d1_swan_d_rate = ((((d1_br_dia || 0) - (d1_br_thickness || 0)) * (d1_br_thickness || 0) * 0.0246 * (d1_br_length || 0) * 2) * (d1_swan_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((d1_swan_d_added || 0) / 100))); this.d1_swan_d_rate = d1_swan_d_rate; } catch(e) { console.error(e); this.d1_swan_d_rate = 0; }
        try { d1_swan_t_rate = ((((d1_br_dia || 0) - (d1_br_thickness || 0)) * (d1_br_thickness || 0) * 0.0246 * (d1_br_length || 0) * 3) * (d1_swan_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((d1_swan_t_added || 0) / 100))); this.d1_swan_t_rate = d1_swan_t_rate; } catch(e) { console.error(e); this.d1_swan_t_rate = 0; }
        try { d1_swan_sa_total_amount = (Math.ceil((d1_swan_s_rate || 0) / 10) * 10) * (d1_swan_s_qty || 0); this.d1_swan_sa_total_amount = d1_swan_sa_total_amount; } catch(e) { console.error(e); this.d1_swan_sa_total_amount = 0; }
        try { d1_swan_da_total_amount = (Math.ceil((d1_swan_d_rate || 0) / 10) * 10) * (d1_swan_d_qty || 0); this.d1_swan_da_total_amount = d1_swan_da_total_amount; } catch(e) { console.error(e); this.d1_swan_da_total_amount = 0; }
        try { d1_swan_ta_total_amount = (Math.ceil((d1_swan_t_rate || 0) / 10) * 10) * (d1_swan_t_qty || 0); this.d1_swan_ta_total_amount = d1_swan_ta_total_amount; } catch(e) { console.error(e); this.d1_swan_ta_total_amount = 0; }
        try { d1_fb_rate = ((d1_fb_qty || 0) * (8 + ((d1_fb_length || 0) * (d1_fb_dia == '24' ? 0.35 : d1_fb_dia == '20' ? 0.25 : d1_fb_dia == '16' ? 0.16 : 0.09)))) * (1 + ((d1_fb_added_up || 0) / 100)); this.d1_fb_rate = d1_fb_rate; } catch(e) { console.error(e); this.d1_fb_rate = 0; }
        try { d1_ad_cep_rate = (((((d1_ad_cep_dia || 0) - (d1_ad_cep_thickness || 0)) * (d1_ad_cep_thickness || 0) * 0.0246 * (d1_ad_cep_length || 0)) * 83 * (d1_ad_cep_qty || 0)) * (1 + ((d1_ad_cep_added_up || 0) / 100)) * 100) / 100; this.d1_ad_cep_rate = d1_ad_cep_rate; } catch(e) { console.error(e); this.d1_ad_cep_rate = 0; }
        try { d1_foundation_total_amount = (Math.ceil((d1_fb_rate || 0) / 10) * 10) * (d1_fb_quantity || 0); this.d1_foundation_total_amount = d1_foundation_total_amount; } catch(e) { console.error(e); this.d1_foundation_total_amount = 0; }
        try { d1_addi_total_amount = (Math.ceil((d1_ad_cep_rate || 0) / 10) * 10) * (d1_fb_ad_cep_quantity || 0); this.d1_addi_total_amount = d1_addi_total_amount; } catch(e) { console.error(e); this.d1_addi_total_amount = 0; }
        try { d1_final_total_amount = Math.ceil((d1_pole_total_amount || 0) + (d1_bp_ms_total_amount || 0) + (d1_sp_total_amount || 0) + (d1_cast_iron_total_amount || 0) + (d1_cast_iron_comm_total_amount || 0) + (d1_br_sa_total_amount || 0) + (d1_br_da_total_amount || 0) + (d1_br_ta_total_amount || 0) + (d1_br_fa_total_amount || 0) + (d1_br_ra_total_amount || 0) + (d1_swan_sa_total_amount || 0) + (d1_swan_da_total_amount || 0) + (d1_swan_ta_total_amount || 0) + (d1_foundation_total_amount || 0) + (d1_addi_total_amount || 0) + (d1_for == 'Per pcs' ? ((d1_transportation || 0) * (d1_base_weight || 0)) : (d1_lump_sum || 0))); this.d1_final_total_amount = d1_final_total_amount; } catch(e) { console.error(e); this.d1_final_total_amount = 0; }
        try { d1_final_added_up_cost = (((d1_added_up || 0) + (d1_bp_ms_gi_added_up || 0) + (d1_bp_sp_added_up || 0) + (d1_bp_ci_is_added_up || 0) + (d1_bp_ci_comm_added_up || 0) + (d1_br_sa_added_up || 0) + (d1_br_da_added_up || 0) + (d1_br_ta_added_up || 0) + (d1_br_fa_added_up || 0) + (d1_br_ra_added_up || 0) + (d1_swan_s_added || 0) + (d1_swan_d_added || 0) + (d1_swan_t_added || 0) + (d1_fb_added_up || 0) + (d1_ad_cep_added_up || 0))/100); this.d1_final_added_up_cost = d1_final_added_up_cost; } catch(e) { console.error(e); this.d1_final_added_up_cost = 0; }
        try { d1_final_added_up_std_rate = ((d1_added_up ? 2/100 : 0) + (d1_bp_ms_gi_added_up ? 2/100 : 0) + (d1_bp_sp_added_up ? 2/100 : 0) + (d1_bp_ci_is_added_up ? 2/100 : 0) + (d1_bp_ci_comm_added_up ? 2/100 : 0) + (d1_br_sa_added_up ? 2/100 : 0) + (d1_br_da_added_up ? 2/100 : 0) + (d1_br_ta_added_up ? 2/100 : 0) + (d1_br_fa_added_up ? 2/100 : 0) + (d1_br_ra_added_up ? 2/100 : 0) + (d1_swan_s_added ? 2/100 : 0) + (d1_swan_d_added ? 2/100 : 0) + (d1_swan_t_added ? 2/100 : 0) + (d1_fb_added_up ? 2/100 : 0) + (d1_ad_cep_added_up ? 2/100 : 0)); this.d1_final_added_up_std_rate = d1_final_added_up_std_rate; } catch(e) { console.error(e); this.d1_final_added_up_std_rate = 0; }
        try { d1_final_unit_cost = (d1_final_total_amount - (d1_final_total_amount *d1_final_added_up_cost)); this.d1_final_unit_cost = d1_final_unit_cost; } catch(e) { console.error(e); this.d1_final_unit_cost = 0; }
        try { d1_final_list_price = (d1_final_added_up_cost || 0) == (d1_final_added_up_std_rate || 0) ? (d1_final_total_amount || 0) : ((d1_final_unit_cost || 0) + ((d1_final_unit_cost || 0) * (d1_final_added_up_std_rate || 0))); this.d1_final_list_price = d1_final_list_price; } catch(e) { console.error(e); this.d1_final_list_price = 0; }
        try { c1_rate = Math.ceil(((c1_sections == '1' ? (c1_sec1_unit_price || 0) : c1_sections == '2' ? (c1_sec2_unit_price || 0) : c1_sections == '3' ? (c1_sec3_unit_price || 0) : c1_sections == '4' ? (c1_sec4_unit_price || 0) : (c1_sec5_unit_price || 0)) + (c1_bp_ms_gi_reflect == 'NO' ? (c1_bp_ms_gi_rate || 0) : 0) + ((c1_sections == '1' ? (c1_section1_final_weight || 0) : c1_sections == '2' ? (c1_section2_final_weight || 0) : c1_sections == '3' ? (c1_section3_final_weight || 0) : c1_sections == '4' ? (c1_section4_final_weight || 0) : (c1_section5_final_weight || 0)) * (c1_for_transp || 0)) + (c1_pole_payment_term || 0)) / 10) * 10; this.c1_rate = c1_rate; } catch(e) { console.error(e); this.c1_rate = 0; }
        try { c1_section1_normal_weight = Math.round((((c1_top_dia || 0) - (c1_top_thk || 0)) * (c1_top_thk || 0) * 0.0246 * (c1_top_len || 0)) * 100) / 100; this.c1_section1_normal_weight = c1_section1_normal_weight; } catch(e) { console.error(e); this.c1_section1_normal_weight = 0; }
        try { c1_section1_additional_weight = Math.round((((c1_top_dia || 0) - (c1_top_thk || 0)) * (c1_top_thk || 0) * 0.0246 * ((c1_top_len || 0) + (c1_top_dia == 33.7 ? 0.20 : c1_top_dia == 42.4 ? 0.20 : c1_top_dia == 48.3 ? 0.20 : c1_top_dia == 60.3 ? 0.20 : c1_top_dia == 76.1 ? 0.20 : c1_top_dia == 88.9 ? 0.23 : c1_top_dia == 101.6 ? 0.23 : c1_top_dia == 114.3 ? 0.30 : c1_top_dia == 127 ? 0.30 : c1_top_dia == 139.7 ? 0.35 : c1_top_dia == 152.4 ? 0.35 : c1_top_dia == 165.1 ? 0.40 : c1_top_dia == 168.3 ? 0.40 : c1_top_dia == 193.7 ? 0.45 : c1_top_dia == 219.1 ? 0.45 : 0))) * 100) / 100; this.c1_section1_additional_weight = c1_section1_additional_weight; } catch(e) { console.error(e); this.c1_section1_additional_weight = 0; }
        try { c1_section1_final_weight = Math.round(((c1_tol_pct || 0) > 0 ? (c1_section1_additional_weight || 0) - ((c1_section1_additional_weight || 0) * (c1_tol_pct || 0) / 100) : (c1_section1_additional_weight || 0)) * 100) / 100; this.c1_section1_final_weight = c1_section1_final_weight; } catch(e) { console.error(e); this.c1_section1_final_weight = 0; }
        try { c1_sec1_unit_price = Math.round(((c1_section1_normal_weight || 0) * (c1_ms_gi == 'Galvanized' ? 83 : 64) * (1 + ((c1_added_up || 0) / 100))) * 100) / 100; this.c1_sec1_unit_price = c1_sec1_unit_price; } catch(e) { console.error(e); this.c1_sec1_unit_price = 0; }
        try { c1_section2_normal_weight = Math.round((c1_section1_additional_weight + (((c1_bot_dia || 0) - (c1_bot_thk || 0)) * (c1_bot_thk || 0) * 0.0246 * (c1_bot_len || 0))) * 100) / 100; this.c1_section2_normal_weight = c1_section2_normal_weight; } catch(e) { console.error(e); this.c1_section2_normal_weight = 0; }
        try { c1_section2_additional_weight = Math.round((c1_section1_additional_weight + (((c1_bot_dia || 0) - (c1_bot_thk || 0)) * (c1_bot_thk || 0) * 0.0246 * ((c1_bot_len || 0) + (c1_bot_dia == 33.7 ? 0.20 : c1_bot_dia == 42.4 ? 0.20 : c1_bot_dia == 48.3 ? 0.20 : c1_bot_dia == 60.3 ? 0.20 : c1_bot_dia == 76.1 ? 0.20 : c1_bot_dia == 88.9 ? 0.23 : c1_bot_dia == 101.6 ? 0.23 : c1_bot_dia == 114.3 ? 0.30 : c1_bot_dia == 127 ? 0.30 : c1_bot_dia == 139.7 ? 0.35 : c1_bot_dia == 152.4 ? 0.35 : c1_bot_dia == 165.1 ? 0.40 : c1_bot_dia == 168.3 ? 0.40 : c1_bot_dia == 193.7 ? 0.45 : c1_bot_dia == 219.1 ? 0.45 : 0)))) * 100) / 100; this.c1_section2_additional_weight = c1_section2_additional_weight; } catch(e) { console.error(e); this.c1_section2_additional_weight = 0; }
        try { c1_section2_final_weight = Math.round(((c1_tol_pct || 0) > 0 ? (c1_section2_additional_weight || 0) - ((c1_section2_additional_weight || 0) * (c1_tol_pct || 0) / 100) : (c1_section2_additional_weight || 0)) * 100) / 100; this.c1_section2_final_weight = c1_section2_final_weight; } catch(e) { console.error(e); this.c1_section2_final_weight = 0; }
        try { c1_sec2_unit_price = Math.round(((c1_section2_normal_weight || 0) * (c1_ms_gi == 'Galvanized' ? 83 : 64) * (1 + ((c1_added_up || 0) / 100))) * 100) / 100; this.c1_sec2_unit_price = c1_sec2_unit_price; } catch(e) { console.error(e); this.c1_sec2_unit_price = 0; }
        try { c1_section3_normal_weight = Math.round((c1_section1_additional_weight + (((c1_bot_dia || 0) - (c1_bot_thk || 0)) * (c1_bot_thk || 0) * 0.0246 * (c1_bot_len || 0)) + (((c1_mid2_dia || 0) - (c1_mid2_thk || 0)) * (c1_mid2_thk || 0) * 0.0246 * ((c1_mid2_len || 0) + (c1_mid2_dia == 33.7 ? 0.20 : c1_mid2_dia == 42.4 ? 0.20 : c1_mid2_dia == 48.3 ? 0.20 : c1_mid2_dia == 60.3 ? 0.20 : c1_mid2_dia == 76.1 ? 0.20 : c1_mid2_dia == 88.9 ? 0.23 : c1_mid2_dia == 101.6 ? 0.23 : c1_mid2_dia == 114.3 ? 0.30 : c1_mid2_dia == 127 ? 0.30 : c1_mid2_dia == 139.7 ? 0.35 : c1_mid2_dia == 152.4 ? 0.35 : c1_mid2_dia == 165.1 ? 0.40 : c1_mid2_dia == 168.3 ? 0.40 : c1_mid2_dia == 193.7 ? 0.45 : c1_mid2_dia == 219.1 ? 0.45 : 0)))) * 100) / 100; this.c1_section3_normal_weight = c1_section3_normal_weight; } catch(e) { console.error(e); this.c1_section3_normal_weight = 0; }
        try { c1_section3_additional_weight = Math.round((c1_section1_additional_weight + (((c1_mid2_dia || 0) - (c1_mid2_thk || 0)) * (c1_mid2_thk || 0) * 0.0246 * ((c1_mid2_len || 0) + (c1_mid2_dia == 33.7 ? 0.20 : c1_mid2_dia == 42.4 ? 0.20 : c1_mid2_dia == 48.3 ? 0.20 : c1_mid2_dia == 60.3 ? 0.20 : c1_mid2_dia == 76.1 ? 0.20 : c1_mid2_dia == 88.9 ? 0.23 : c1_mid2_dia == 101.6 ? 0.23 : c1_mid2_dia == 114.3 ? 0.30 : c1_mid2_dia == 127 ? 0.30 : c1_mid2_dia == 139.7 ? 0.35 : c1_mid2_dia == 152.4 ? 0.35 : c1_mid2_dia == 165.1 ? 0.40 : c1_mid2_dia == 168.3 ? 0.40 : c1_mid2_dia == 193.7 ? 0.45 : c1_mid2_dia == 219.1 ? 0.45 : 0))) + (((c1_bot_dia || 0) - (c1_bot_thk || 0)) * (c1_bot_thk || 0) * 0.0246 * ((c1_bot_len || 0) + (c1_bot_dia == 33.7 ? 0.20 : c1_bot_dia == 42.4 ? 0.20 : c1_bot_dia == 48.3 ? 0.20 : c1_bot_dia == 60.3 ? 0.20 : c1_bot_dia == 76.1 ? 0.20 : c1_bot_dia == 88.9 ? 0.23 : c1_bot_dia == 101.6 ? 0.23 : c1_bot_dia == 114.3 ? 0.30 : c1_bot_dia == 127 ? 0.30 : c1_bot_dia == 139.7 ? 0.35 : c1_bot_dia == 152.4 ? 0.35 : c1_bot_dia == 165.1 ? 0.40 : c1_bot_dia == 168.3 ? 0.40 : c1_bot_dia == 193.7 ? 0.45 : c1_bot_dia == 219.1 ? 0.45 : 0)))) * 100) / 100; this.c1_section3_additional_weight = c1_section3_additional_weight; } catch(e) { console.error(e); this.c1_section3_additional_weight = 0; }
        try { c1_section3_final_weight = Math.round(((c1_tol_pct || 0) > 0 ? (c1_section3_additional_weight || 0) - ((c1_section3_additional_weight || 0) * (c1_tol_pct || 0) / 100) : (c1_section3_additional_weight || 0)) * 100) / 100; this.c1_section3_final_weight = c1_section3_final_weight; } catch(e) { console.error(e); this.c1_section3_final_weight = 0; }
        try { c1_sec3_unit_price = Math.round(((c1_section3_normal_weight || 0) * (c1_ms_gi == 'Galvanized' ? 83 : 64) * (1 + ((c1_added_up || 0) / 100))) * 100) / 100; this.c1_sec3_unit_price = c1_sec3_unit_price; } catch(e) { console.error(e); this.c1_sec3_unit_price = 0; }
        try { c1_section4_normal_weight = Math.round((c1_section1_additional_weight + (((c1_bot_dia || 0) - (c1_bot_thk || 0)) * (c1_bot_thk || 0) * 0.0246 * (c1_bot_len || 0)) + (((c1_mid2_dia || 0) - (c1_mid2_thk || 0)) * (c1_mid2_thk || 0) * 0.0246 * ((c1_mid2_len || 0) + (c1_mid2_dia == 33.7 ? 0.20 : c1_mid2_dia == 42.4 ? 0.20 : c1_mid2_dia == 48.3 ? 0.20 : c1_mid2_dia == 60.3 ? 0.20 : c1_mid2_dia == 76.1 ? 0.20 : c1_mid2_dia == 88.9 ? 0.23 : c1_mid2_dia == 101.6 ? 0.23 : c1_mid2_dia == 114.3 ? 0.30 : c1_mid2_dia == 127 ? 0.30 : c1_mid2_dia == 139.7 ? 0.35 : c1_mid2_dia == 152.4 ? 0.35 : c1_mid2_dia == 165.1 ? 0.40 : c1_mid2_dia == 168.3 ? 0.40 : c1_mid2_dia == 193.7 ? 0.45 : c1_mid2_dia == 219.1 ? 0.45 : 0))) + (((c1_mid3_dia || 0) - (c1_mid3_thk || 0)) * (c1_mid3_thk || 0) * 0.0246 * ((c1_mid3_len || 0) + (c1_mid3_dia == 33.7 ? 0.20 : c1_mid3_dia == 42.4 ? 0.20 : c1_mid3_dia == 48.3 ? 0.20 : c1_mid3_dia == 60.3 ? 0.20 : c1_mid3_dia == 76.1 ? 0.20 : c1_mid3_dia == 88.9 ? 0.23 : c1_mid3_dia == 101.6 ? 0.23 : c1_mid3_dia == 114.3 ? 0.30 : c1_mid3_dia == 127 ? 0.30 : c1_mid3_dia == 139.7 ? 0.35 : c1_mid3_dia == 152.4 ? 0.35 : c1_mid3_dia == 165.1 ? 0.40 : c1_mid3_dia == 168.3 ? 0.40 : c1_mid3_dia == 193.7 ? 0.45 : c1_mid3_dia == 219.1 ? 0.45 : 0))) ) * 100) / 100; this.c1_section4_normal_weight = c1_section4_normal_weight; } catch(e) { console.error(e); this.c1_section4_normal_weight = 0; }
        try { c1_section4_additional_weight = Math.round((c1_section1_additional_weight + (((c1_mid2_dia || 0) - (c1_mid2_thk || 0)) * (c1_mid2_thk || 0) * 0.0246 * ((c1_mid2_len || 0) + (c1_mid2_dia == 33.7 ? 0.20 : c1_mid2_dia == 42.4 ? 0.20 : c1_mid2_dia == 48.3 ? 0.20 : c1_mid2_dia == 60.3 ? 0.20 : c1_mid2_dia == 76.1 ? 0.20 : c1_mid2_dia == 88.9 ? 0.23 : c1_mid2_dia == 101.6 ? 0.23 : c1_mid2_dia == 114.3 ? 0.30 : c1_mid2_dia == 127 ? 0.30 : c1_mid2_dia == 139.7 ? 0.35 : c1_mid2_dia == 152.4 ? 0.35 : c1_mid2_dia == 165.1 ? 0.40 : c1_mid2_dia == 168.3 ? 0.40 : c1_mid2_dia == 193.7 ? 0.45 : c1_mid2_dia == 219.1 ? 0.45 : 0))) + (((c1_bot_dia || 0) - (c1_bot_thk || 0)) * (c1_bot_thk || 0) * 0.0246 * ((c1_bot_len || 0) + (c1_bot_dia == 33.7 ? 0.20 : c1_bot_dia == 42.4 ? 0.20 : c1_bot_dia == 48.3 ? 0.20 : c1_bot_dia == 60.3 ? 0.20 : c1_bot_dia == 76.1 ? 0.20 : c1_bot_dia == 88.9 ? 0.23 : c1_bot_dia == 101.6 ? 0.23 : c1_bot_dia == 114.3 ? 0.30 : c1_bot_dia == 127 ? 0.30 : c1_bot_dia == 139.7 ? 0.35 : c1_bot_dia == 152.4 ? 0.35 : c1_bot_dia == 165.1 ? 0.40 : c1_bot_dia == 168.3 ? 0.40 : c1_bot_dia == 193.7 ? 0.45 : c1_bot_dia == 219.1 ? 0.45 : 0))) + (((c1_mid3_dia || 0) - (c1_mid3_thk || 0)) * (c1_mid3_thk || 0) * 0.0246 * ((c1_mid3_len || 0) + (c1_mid3_dia == 33.7 ? 0.20 : c1_mid3_dia == 42.4 ? 0.20 : c1_mid3_dia == 48.3 ? 0.20 : c1_mid3_dia == 60.3 ? 0.20 : c1_mid3_dia == 76.1 ? 0.20 : c1_mid3_dia == 88.9 ? 0.23 : c1_mid3_dia == 101.6 ? 0.23 : c1_mid3_dia == 114.3 ? 0.30 : c1_mid3_dia == 127 ? 0.30 : c1_mid3_dia == 139.7 ? 0.35 : c1_mid3_dia == 152.4 ? 0.35 : c1_mid3_dia == 165.1 ? 0.40 : c1_mid3_dia == 168.3 ? 0.40 : c1_mid3_dia == 193.7 ? 0.45 : c1_mid3_dia == 219.1 ? 0.45 : 0)))) * 100) / 100; this.c1_section4_additional_weight = c1_section4_additional_weight; } catch(e) { console.error(e); this.c1_section4_additional_weight = 0; }
        try { c1_section4_final_weight = Math.round(((c1_tol_pct || 0) > 0 ? (c1_section4_additional_weight || 0) - ((c1_section4_additional_weight || 0) * (c1_tol_pct || 0) / 100) : (c1_section4_additional_weight || 0)) * 100) / 100; this.c1_section4_final_weight = c1_section4_final_weight; } catch(e) { console.error(e); this.c1_section4_final_weight = 0; }
        try { c1_sec4_unit_price = Math.round(((c1_section4_normal_weight || 0) * (c1_ms_gi == 'Galvanized' ? 83 : 64) * (1 + ((c1_added_up || 0) / 100))) * 100) / 100; this.c1_sec4_unit_price = c1_sec4_unit_price; } catch(e) { console.error(e); this.c1_sec4_unit_price = 0; }
        try { c1_section5_normal_weight = Math.round((c1_section1_additional_weight + (((c1_bot_dia || 0) - (c1_bot_thk || 0)) * (c1_bot_thk || 0) * 0.0246 * (c1_bot_len || 0)) + (((c1_mid2_dia || 0) - (c1_mid2_thk || 0)) * (c1_mid2_thk || 0) * 0.0246 * ((c1_mid2_len || 0) + (c1_mid2_dia == 33.7 ? 0.20 : c1_mid2_dia == 42.4 ? 0.20 : c1_mid2_dia == 48.3 ? 0.20 : c1_mid2_dia == 60.3 ? 0.20 : c1_mid2_dia == 76.1 ? 0.20 : c1_mid2_dia == 88.9 ? 0.23 : c1_mid2_dia == 101.6 ? 0.23 : c1_mid2_dia == 114.3 ? 0.30 : c1_mid2_dia == 127 ? 0.30 : c1_mid2_dia == 139.7 ? 0.35 : c1_mid2_dia == 152.4 ? 0.35 : c1_mid2_dia == 165.1 ? 0.40 : c1_mid2_dia == 168.3 ? 0.40 : c1_mid2_dia == 193.7 ? 0.45 : c1_mid2_dia == 219.1 ? 0.45 : 0))) + (((c1_mid3_dia || 0) - (c1_mid3_thk || 0)) * (c1_mid3_thk || 0) * 0.0246 * ((c1_mid3_len || 0) + (c1_mid3_dia == 33.7 ? 0.20 : c1_mid3_dia == 42.4 ? 0.20 : c1_mid3_dia == 48.3 ? 0.20 : c1_mid3_dia == 60.3 ? 0.20 : c1_mid3_dia == 76.1 ? 0.20 : c1_mid3_dia == 88.9 ? 0.23 : c1_mid3_dia == 101.6 ? 0.23 : c1_mid3_dia == 114.3 ? 0.30 : c1_mid3_dia == 127 ? 0.30 : c1_mid3_dia == 139.7 ? 0.35 : c1_mid3_dia == 152.4 ? 0.35 : c1_mid3_dia == 165.1 ? 0.40 : c1_mid3_dia == 168.3 ? 0.40 : c1_mid3_dia == 193.7 ? 0.45 : c1_mid3_dia == 219.1 ? 0.45 : 0))) + (((c1_mid4_dia || 0) - (c1_mid4_thk || 0)) * (c1_mid4_thk || 0) * 0.0246 * ((c1_mid4_len || 0) + (c1_mid4_dia == 33.7 ? 0.20 : c1_mid4_dia == 42.4 ? 0.20 : c1_mid4_dia == 48.3 ? 0.20 : c1_mid4_dia == 60.3 ? 0.20 : c1_mid4_dia == 76.1 ? 0.20 : c1_mid4_dia == 88.9 ? 0.23 : c1_mid4_dia == 101.6 ? 0.23 : c1_mid4_dia == 114.3 ? 0.30 : c1_mid4_dia == 127 ? 0.30 : c1_mid4_dia == 139.7 ? 0.35 : c1_mid4_dia == 152.4 ? 0.35 : c1_mid4_dia == 165.1 ? 0.40 : c1_mid4_dia == 168.3 ? 0.40 : c1_mid4_dia == 193.7 ? 0.45 : c1_mid4_dia == 219.1 ? 0.45 : 0))) ) * 100) / 100; this.c1_section5_normal_weight = c1_section5_normal_weight; } catch(e) { console.error(e); this.c1_section5_normal_weight = 0; }
        try { c1_section5_additional_weight = Math.round((c1_section1_additional_weight + (((c1_bot_dia || 0) - (c1_bot_thk || 0)) * (c1_bot_thk || 0) * 0.0246 * (c1_bot_len || 0)) + (((c1_mid2_dia || 0) - (c1_mid2_thk || 0)) * (c1_mid2_thk || 0) * 0.0246 * ((c1_mid2_len || 0) + (c1_mid2_dia == 33.7 ? 0.20 : c1_mid2_dia == 42.4 ? 0.20 : c1_mid2_dia == 48.3 ? 0.20 : c1_mid2_dia == 60.3 ? 0.20 : c1_mid2_dia == 76.1 ? 0.20 : c1_mid2_dia == 88.9 ? 0.23 : c1_mid2_dia == 101.6 ? 0.23 : c1_mid2_dia == 114.3 ? 0.30 : c1_mid2_dia == 127 ? 0.30 : c1_mid2_dia == 139.7 ? 0.35 : c1_mid2_dia == 152.4 ? 0.35 : c1_mid2_dia == 165.1 ? 0.40 : c1_mid2_dia == 168.3 ? 0.40 : c1_mid2_dia == 193.7 ? 0.45 : c1_mid2_dia == 219.1 ? 0.45 : 0))) + (((c1_mid3_dia || 0) - (c1_mid3_thk || 0)) * (c1_mid3_thk || 0) * 0.0246 * ((c1_mid3_len || 0) + (c1_mid3_dia == 33.7 ? 0.20 : c1_mid3_dia == 42.4 ? 0.20 : c1_mid3_dia == 48.3 ? 0.20 : c1_mid3_dia == 60.3 ? 0.20 : c1_mid3_dia == 76.1 ? 0.20 : c1_mid3_dia == 88.9 ? 0.23 : c1_mid3_dia == 101.6 ? 0.23 : c1_mid3_dia == 114.3 ? 0.30 : c1_mid3_dia == 127 ? 0.30 : c1_mid3_dia == 139.7 ? 0.35 : c1_mid3_dia == 152.4 ? 0.35 : c1_mid3_dia == 165.1 ? 0.40 : c1_mid3_dia == 168.3 ? 0.40 : c1_mid3_dia == 193.7 ? 0.45 : c1_mid3_dia == 219.1 ? 0.45 : 0))) + (((c1_mid4_dia || 0) - (c1_mid4_thk || 0)) * (c1_mid4_thk || 0) * 0.0246 * ((c1_mid4_len || 0) + (c1_mid4_dia == 33.7 ? 0.20 : c1_mid4_dia == 42.4 ? 0.20 : c1_mid4_dia == 48.3 ? 0.20 : c1_mid4_dia == 60.3 ? 0.20 : c1_mid4_dia == 76.1 ? 0.20 : c1_mid4_dia == 88.9 ? 0.23 : c1_mid4_dia == 101.6 ? 0.23 : c1_mid4_dia == 114.3 ? 0.30 : c1_mid4_dia == 127 ? 0.30 : c1_mid4_dia == 139.7 ? 0.35 : c1_mid4_dia == 152.4 ? 0.35 : c1_mid4_dia == 165.1 ? 0.40 : c1_mid4_dia == 168.3 ? 0.40 : c1_mid4_dia == 193.7 ? 0.45 : c1_mid4_dia == 219.1 ? 0.45 : 0))) ) * 100) / 100; this.c1_section5_additional_weight = c1_section5_additional_weight; } catch(e) { console.error(e); this.c1_section5_additional_weight = 0; }
        try { c1_section5_final_weight = Math.round(((c1_tol_pct || 0) > 0 ? (c1_section5_additional_weight || 0) - ((c1_section5_additional_weight || 0) * (c1_tol_pct || 0) / 100) : (c1_section5_additional_weight || 0)) * 100) / 100; this.c1_section5_final_weight = c1_section5_final_weight; } catch(e) { console.error(e); this.c1_section5_final_weight = 0; }
        try { c1_sec5_unit_price = Math.round(((c1_section5_final_weight || 0) * (c1_ms_gi == 'Galvanized' ? 83 : 64) * (1 + ((c1_added_up || 0) / 100))) * 100) / 100; this.c1_sec5_unit_price = c1_sec5_unit_price; } catch(e) { console.error(e); this.c1_sec5_unit_price = 0; }
        try { c1_pole_payment_term = ((typeof tc_payment_terms_picklist !== 'undefined' && (tc_payment_terms_picklist == 'Against LC Before Dispatch' || tc_payment_terms_picklist == 'Against VFS')) ? ((c1_ms_gi == 'Galvanized' ? 83 : 64) * (1 + (0.08 / 12))) : 0); this.c1_pole_payment_term = c1_pole_payment_term; } catch(e) { console.error(e); this.c1_pole_payment_term = 0; }
        try { c1_bp_ms_gi_rate = ((c1_bp_ms_gi_length || 0) * (c1_bp_ms_gi_width || 0) * (c1_bp_ms_gi_thickness || 0) * 7.86 * 64) * (1 + ((c1_bp_ms_gi_added_up || 0) / 100)); this.c1_bp_ms_gi_rate = c1_bp_ms_gi_rate; } catch(e) { console.error(e); this.c1_bp_ms_gi_rate = 0; }
        try { c1_bp_sp_rate = ((c1_bp_sp_length || 0) * (c1_bp_sp_width || 0) * (c1_bp_sp_thickness || 0) * 7.86 * 64) * (1 + ((c1_bp_sp_added_up || 0) / 100)); this.c1_bp_sp_rate = c1_bp_sp_rate; } catch(e) { console.error(e); this.c1_bp_sp_rate = 0; }
        try { c1_bp_ci_is_rate = (800 * (1 + ((c1_bp_ci_is_added_up || 0) / 100))); this.c1_bp_ci_is_rate = c1_bp_ci_is_rate; } catch(e) { console.error(e); this.c1_bp_ci_is_rate = 0; }
        try { c1_bp_ci_comm_rate = (400 * (1 + ((c1_bp_ci_comm_added_up || 0) / 100))); this.c1_bp_ci_comm_rate = c1_bp_ci_comm_rate; } catch(e) { console.error(e); this.c1_bp_ci_comm_rate = 0; }
        try { c1_bp_ms_total_amount = (Math.ceil((c1_bp_ms_gi_rate || 0) / 10) * 10) * (c1_bp_ms_gi_quantity || 0); this.c1_bp_ms_total_amount = c1_bp_ms_total_amount; } catch(e) { console.error(e); this.c1_bp_ms_total_amount = 0; }
        try { c1_sp_total_amount = (Math.ceil((c1_bp_sp_rate || 0) / 10) * 10) * (c1_bp_sp_quantity || 0); this.c1_sp_total_amount = c1_sp_total_amount; } catch(e) { console.error(e); this.c1_sp_total_amount = 0; }
        try { c1_cast_iron_total_amount = (Math.ceil((c1_bp_ci_is_rate || 0) / 10) * 10) * (c1_bp_ci_is_quantity || 0); this.c1_cast_iron_total_amount = c1_cast_iron_total_amount; } catch(e) { console.error(e); this.c1_cast_iron_total_amount = 0; }
        try { c1_cast_iron_comm_total_amount = (Math.ceil((c1_bp_ci_comm_rate || 0) / 10) * 10) * (c1_bp_ci_comm_quantity || 0); this.c1_cast_iron_comm_total_amount = c1_cast_iron_comm_total_amount; } catch(e) { console.error(e); this.c1_cast_iron_comm_total_amount = 0; }
        try { c1_br_sa_rate = ((((c1_br_dia || 0) - (c1_br_thickness || 0)) * (c1_br_thickness || 0) * 0.0246 * (c1_br_length || 0)) * (c1_br_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((c1_br_sa_added_up || 0) / 100))); this.c1_br_sa_rate = c1_br_sa_rate; } catch(e) { console.error(e); this.c1_br_sa_rate = 0; }
        try { c1_br_da_rate = ((((c1_br_dia || 0) - (c1_br_thickness || 0)) * (c1_br_thickness || 0) * 0.0246 * (c1_br_length || 0) * 2) * (c1_br_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((c1_br_da_added_up || 0) / 100))); this.c1_br_da_rate = c1_br_da_rate; } catch(e) { console.error(e); this.c1_br_da_rate = 0; }
        try { c1_br_ta_rate = ((((c1_br_dia || 0) - (c1_br_thickness || 0)) * (c1_br_thickness || 0) * 0.0246 * (c1_br_length || 0) * 3) * (c1_br_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((c1_br_ta_added_up || 0) / 100))); this.c1_br_ta_rate = c1_br_ta_rate; } catch(e) { console.error(e); this.c1_br_ta_rate = 0; }
        try { c1_br_fa_rate = ((((c1_br_dia || 0) - (c1_br_thickness || 0)) * (c1_br_thickness || 0) * 0.0246 * (c1_br_length || 0) * 4) * (c1_br_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((c1_br_fa_added_up || 0) / 100))); this.c1_br_fa_rate = c1_br_fa_rate; } catch(e) { console.error(e); this.c1_br_fa_rate = 0; }
        try { c1_br_ra_rate = ((((c1_br_dia || 0) - (c1_br_thickness || 0)) * (c1_br_thickness || 0) * 0.0246 * (c1_br_length || 0)) * (c1_br_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((c1_br_ra_added_up || 0) / 100))); this.c1_br_ra_rate = c1_br_ra_rate; } catch(e) { console.error(e); this.c1_br_ra_rate = 0; }
        try { c1_br_sa_total_amount = (Math.ceil((c1_br_sa_rate || 0) / 10) * 10) * (c1_br_sa_quantity || 0); this.c1_br_sa_total_amount = c1_br_sa_total_amount; } catch(e) { console.error(e); this.c1_br_sa_total_amount = 0; }
        try { c1_br_da_total_amount = (Math.ceil((c1_br_da_rate || 0) / 10) * 10) * (c1_br_da_quantity || 0); this.c1_br_da_total_amount = c1_br_da_total_amount; } catch(e) { console.error(e); this.c1_br_da_total_amount = 0; }
        try { c1_br_ta_total_amount = (Math.ceil((c1_br_ta_rate || 0) / 10) * 10) * (c1_br_ta_quantity || 0); this.c1_br_ta_total_amount = c1_br_ta_total_amount; } catch(e) { console.error(e); this.c1_br_ta_total_amount = 0; }
        try { c1_br_fa_total_amount = (Math.ceil((c1_br_fa_rate || 0) / 10) * 10) * (c1_br_fa_quantity || 0); this.c1_br_fa_total_amount = c1_br_fa_total_amount; } catch(e) { console.error(e); this.c1_br_fa_total_amount = 0; }
        try { c1_br_ra_total_amount = (Math.ceil((c1_br_ra_rate || 0) / 10) * 10) * (c1_br_ra_quantity || 0); this.c1_br_ra_total_amount = c1_br_ra_total_amount; } catch(e) { console.error(e); this.c1_br_ra_total_amount = 0; }
        try { c1_swan_s_rate = ((((c1_br_dia || 0) - (c1_br_thickness || 0)) * (c1_br_thickness || 0) * 0.0246 * (c1_br_length || 0)) * (c1_swan_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((c1_swan_s_added || 0) / 100))); this.c1_swan_s_rate = c1_swan_s_rate; } catch(e) { console.error(e); this.c1_swan_s_rate = 0; }
        try { c1_swan_d_rate = ((((c1_br_dia || 0) - (c1_br_thickness || 0)) * (c1_br_thickness || 0) * 0.0246 * (c1_br_length || 0) * 2) * (c1_swan_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((c1_swan_d_added || 0) / 100))); this.c1_swan_d_rate = c1_swan_d_rate; } catch(e) { console.error(e); this.c1_swan_d_rate = 0; }
        try { c1_swan_t_rate = ((((c1_br_dia || 0) - (c1_br_thickness || 0)) * (c1_br_thickness || 0) * 0.0246 * (c1_br_length || 0) * 3) * (c1_swan_ms_gs == 'Galvanized' ? 83 : 64) * (1 + ((c1_swan_t_added || 0) / 100))); this.c1_swan_t_rate = c1_swan_t_rate; } catch(e) { console.error(e); this.c1_swan_t_rate = 0; }
        try { c1_swan_sa_total_amount = (Math.ceil((c1_swan_s_rate || 0) / 10) * 10) * (c1_swan_s_qty || 0); this.c1_swan_sa_total_amount = c1_swan_sa_total_amount; } catch(e) { console.error(e); this.c1_swan_sa_total_amount = 0; }
        try { c1_swan_da_total_amount = (Math.ceil((c1_swan_d_rate || 0) / 10) * 10) * (c1_swan_d_qty || 0); this.c1_swan_da_total_amount = c1_swan_da_total_amount; } catch(e) { console.error(e); this.c1_swan_da_total_amount = 0; }
        try { c1_swan_ta_total_amount = (Math.ceil((c1_swan_t_rate || 0) / 10) * 10) * (c1_swan_t_qty || 0); this.c1_swan_ta_total_amount = c1_swan_ta_total_amount; } catch(e) { console.error(e); this.c1_swan_ta_total_amount = 0; }
        try { c1_fb_rate = ((c1_fb_qty || 0) * (8 + ((c1_fb_length || 0) * (c1_fb_dia == '24' ? 0.35 : c1_fb_dia == '20' ? 0.25 : c1_fb_dia == '16' ? 0.16 : 0.09)))) * (1 + ((c1_fb_added_up || 0) / 100)); this.c1_fb_rate = c1_fb_rate; } catch(e) { console.error(e); this.c1_fb_rate = 0; }
        try { c1_ad_cep_rate = (((((c1_ad_cep_dia || 0) - (c1_ad_cep_thickness || 0)) * (c1_ad_cep_thickness || 0) * 0.0246 * (c1_ad_cep_length || 0)) * 83 * (c1_ad_cep_qty || 0)) * (1 + ((c1_ad_cep_added_up || 0) / 100)) * 100) / 100; this.c1_ad_cep_rate = c1_ad_cep_rate; } catch(e) { console.error(e); this.c1_ad_cep_rate = 0; }
        try { c1_foundation_total_amount = (Math.ceil((c1_fb_rate || 0) / 10) * 10) * (c1_fb_quantity || 0); this.c1_foundation_total_amount = c1_foundation_total_amount; } catch(e) { console.error(e); this.c1_foundation_total_amount = 0; }
        try { c1_addi_total_amount = (Math.ceil((c1_ad_cep_rate || 0) / 10) * 10) * (c1_fb_ad_cep_quantity || 0); this.c1_addi_total_amount = c1_addi_total_amount; } catch(e) { console.error(e); this.c1_addi_total_amount = 0; }
        try { c1_final_total_amount = Math.ceil((c1_rate || 0) +(c1_bp_ms_total_amount || 0) +(c1_sp_total_amount || 0) +(c1_cast_iron_total_amount || 0) +(c1_cast_iron_comm_total_amount || 0) +(c1_br_sa_total_amount || 0) +(c1_br_da_total_amount || 0) +(c1_br_ta_total_amount || 0) +(c1_br_fa_total_amount || 0) +(c1_br_ra_total_amount || 0) +(c1_swan_sa_total_amount || 0) +(c1_swan_da_total_amount || 0) +(c1_swan_ta_total_amount || 0) +(c1_foundation_total_amount || 0) +(c1_addi_total_amount || 0) +(c1_for == 'Per pcs'? ((c1_for_transp || 0) * (c1_sections == '1' ? (c1_section1_final_weight || 0) :c1_sections == '2' ? (c1_section2_final_weight || 0) :c1_sections == '3' ? (c1_section3_final_weight || 0) :c1_sections == '4' ? (c1_section4_final_weight || 0) :(c1_section5_final_weight || 0))): (c1_for_lump || 0))); this.c1_final_total_amount = c1_final_total_amount; } catch(e) { console.error(e); this.c1_final_total_amount = 0; }
        try { c1_final_added_up_cost = (((c1_added_up || 0) + (c1_bp_ms_gi_added_up || 0) + (c1_bp_sp_added_up || 0) + (c1_bp_ci_is_added_up || 0) + (c1_bp_ci_comm_added_up || 0) + (c1_br_sa_added_up || 0) + (c1_br_da_added_up || 0) + (c1_br_ta_added_up || 0) + (c1_br_fa_added_up || 0) + (c1_br_ra_added_up || 0) + (c1_swan_s_added || 0) + (c1_swan_d_added || 0) + (c1_swan_t_added || 0) + (c1_fb_added_up || 0) + (c1_ad_cep_added_up || 0))/100); this.c1_final_added_up_cost = c1_final_added_up_cost; } catch(e) { console.error(e); this.c1_final_added_up_cost = 0; }
        try { c1_final_added_up_std_rate = ((c1_added_up ? 2/100 : 0) + (c1_bp_ms_gi_added_up ? 2/100 : 0) + (c1_bp_sp_added_up ? 2/100 : 0) + (c1_bp_ci_is_added_up ? 2/100 : 0) + (c1_bp_ci_comm_added_up ? 2/100 : 0) + (c1_br_sa_added_up ? 2/100 : 0) + (c1_br_da_added_up ? 2/100 : 0) + (c1_br_ta_added_up ? 2/100 : 0) + (c1_br_fa_added_up ? 2/100 : 0) + (c1_br_ra_added_up ? 2/100 : 0) + (c1_swan_s_added ? 2/100 : 0) + (c1_swan_d_added ? 2/100 : 0) + (c1_swan_t_added ? 2/100 : 0) + (c1_fb_added_up ? 2/100 : 0) + (c1_ad_cep_added_up ? 2/100 : 0)); this.c1_final_added_up_std_rate = c1_final_added_up_std_rate; } catch(e) { console.error(e); this.c1_final_added_up_std_rate = 0; }
        try { c1_final_unit_cost = (c1_final_total_amount - (c1_final_total_amount *c1_final_added_up_cost)); this.c1_final_unit_cost = c1_final_unit_cost; } catch(e) { console.error(e); this.c1_final_unit_cost = 0; }
        try { c1_final_list_price = (c1_final_added_up_cost || 0) == (c1_final_added_up_std_rate || 0) ? (c1_final_total_amount || 0) : ((c1_final_unit_cost || 0) + ((c1_final_unit_cost || 0) * (c1_final_added_up_std_rate || 0))); this.c1_final_list_price = c1_final_list_price; } catch(e) { console.error(e); this.c1_final_list_price = 0; }
    }
    
    handleSave() {
        let payload = {};
        for(let key of Object.keys(this)) {
            if(key.startsWith('is_')) continue;
            payload[key] = this[key];
        }
        let lines = [];
        if (this.selectedType === 'Standard Pole') {
            if(this.d1_designation && this.d1_quantity) {
                lines.push({
                    Category__c: 'Standard Pole',
                    Material__c: this.d1_designation,
                    Quantity__c: this.d1_quantity,
                    Base_Rate__c: this.d1_rate || 0,
                    Added_Up_Margin__c: this.d1_added_up || 0,
                    Net_Rate__c: this.d1_rate || 0,
                    Total_Amount__c: this.d1_pole_total_amount || 0
                });
            }
        } else {
            if(this.c1_sections && this.c1_quantity) {
                 lines.push({
                    Category__c: 'Customized Pole',
                    Material__c: 'Customized Pole',
                    Quantity__c: this.c1_quantity,
                    Base_Rate__c: this.c1_rate || 0,
                    Added_Up_Margin__c: this.c1_added_up || 0,
                    Net_Rate__c: this.c1_rate || 0,
                    Total_Amount__c: this.c1_final_total_amount || 0
                });
            }
        }
        
        this.dispatchEvent(new CustomEvent('save', { detail: { type: this.selectedType, Lines: lines, payload: payload } }));
    }
}