/**
 * imRateMaps - the domestic rate-card catalogue the IM "Base Rates" screen mirrors.
 *
 * One entry per Price_Calculator__mdt row the domestic Quote Rate Card Manager
 * (quoteRateCard) edits, keyed by the domestic Department picklist value, with the
 * same Type / Standard labels and the same apiName -> label maps, so the screen reads
 * exactly like the domestic one. Only products that are International-enabled are
 * listed; a department that is not IM-enabled never shows (the parent filters by
 * the bootstrap product list).
 *
 *   dev   = domestic DeveloperName (the IM twin is IM_<dev>, see InternationalQuoteController)
 *   dept  = Department__c the IM twin is keyed on when the domestic row has none yet (Telecom)
 *   flat  = Base Amount / Add On Amount card (no JSON) - the High Mast pattern
 *   cols  = grid column captions, as in the domestic validationSchemas
 *   labels= apiName -> caption (reverse maps copied from quoteRateCard.js)
 */
const CB_ZINC = {
    zinc_regular_delta: 'Regular (Zinc Coating)',
    zinc_medium_55_delta: 'Medium 55 micron (Zinc Coating)',
    zinc_average_delta: 'Average 77 micron (Zinc Coating)',
    zinc_minimum_delta: 'Minimum 77 micron (Zinc Coating)',
    con_zinc_reg: 'Consumption Zinc Regular',
    con_zinc_medium_55: 'Consumption Zinc Medium 55 micron',
    con_zinc_avg_77: 'Consumption Zinc Average 77 micron',
    con_zinc_min_77: 'Consumption Zinc Minimum 77 micron'
};

export const RATE_CATALOGUE = {
    'Crash Barrier - Department': [
        {
            label: 'MBCB type - Conventional Type', dev: 'Crash_Barrier_Conventional', cols: ['Item', 'Rate'],
            labels: {
                b_rate: 'Base Rate',
                w_SSSB: 'W-Beam SSSB', w_SSDB: 'W-Beam SSDB', w_DSSB: 'W-Beam DSSB', w_DSDB: 'W-Beam DSDB',
                t_SSSB: 'Thrie-Beam SSSB', t_SSDB: 'Thrie-Beam SSDB', t_DSSB: 'Thrie-Beam DSSB', t_DSDB: 'Thrie-Beam DSDB',
                zinc_reg: 'Regular (Zinc Coating)', zinc_medium_55_delta: 'Medium 55 micron (Zinc Coating)',
                zinc_avg_77: 'Average 77 micron (Zinc Coating)', zinc_min_77: 'Minimum 77 micron (Zinc Coating)',
                con_zinc_reg: 'Consumption Zinc Regular', con_zinc_medium_55: 'Consumption Zinc Medium 55 micron',
                con_zinc_avg_77: 'Consumption Zinc Average 77 micron', con_zinc_min_77: 'Consumption Zinc Minimum 77 micron'
            }
        },
        {
            label: 'MBCB type - Crash Tested', dev: 'Crash_Barrier_Crash_Tested', cols: ['Item', 'Rate'],
            labels: Object.assign({ common_base_rate: 'Base Rate' }, CB_ZINC, {
                wb_natrax_rate_rm: 'W-Beam Natrax (Delta)', wb_alka_2cc_rate: 'W-Beam Alka Type - 2 c/c (Delta)',
                wb_alka_4cc_rate: 'W-Beam Alka Type - 4 c/c (Delta)', wb_trans_rate_rm: 'W-Beam Transpolis (Delta)',
                tb_natrax_rate_rm: 'Thrie-Beam Natrax (Delta)', tb_alka_2cc_rate: 'Thrie-Beam Alka Type - 2 c/c (Delta)',
                tb_alka_266cc_rate: 'Thrie-Beam Alka Type - 2.66 c/c (Delta)'
            })
        },
        {
            label: 'MBCB type - Railway', dev: 'Crash_Barrier_Railway', cols: ['Item', 'Rate'],
            labels: Object.assign({ common_base_rate: 'Base Rate' }, CB_ZINC, {
                railway_graded_delta1_8: 'Railway Graded (Delta)(1.8)', railway_graded_delta2: 'Railway Graded (Delta)(2.0)',
                railway_nongraded_delta1_8: 'Railway Non-Graded (Delta)(1.8)', railway_nongraded_delta2: 'Railway Non-Graded (Delta)(2.0)'
            })
        },
        {
            label: 'MBCB type - Non-Spacer Design', dev: 'Crash_Barrier_Non_Spacer', cols: ['Item', 'Rate'],
            labels: Object.assign({ common_base_rate: 'Base Rate' }, CB_ZINC, {
                wb_non_spacer_delta: 'W-Beam Non Spacer (Delta)', tb_non_spacer_delta: 'Thrie-Beam Non Spacer (Delta)'
            })
        }
    ],
    'High Mast - Department': [
        { label: 'Standard Mast - Transmission Pole', dev: 'Transmission_Pole_Price_Details', flat: true, cols: ['Item', 'Value'] },
        // High Mast cross product (highMastImConfig) - one flat Base / Add On card per mast type, the
        // rows the domestic estimators price from (Department__c = the type's controlling value).
        // The IM twin is "IM - <that value>", read first by getImPricingRates. Deepanjan (28th Sep 2026)
        { label: 'Standard Mast - Lighting Mast', dev: 'Lighting_Mast_Price', flat: true, cols: ['Item', 'Value'] },
        { label: 'Customized Mast - Stadium Mast', dev: 'STADIUM_MAST_Price', flat: true, cols: ['Item', 'Value'] },
        { label: 'Customized Mast - Flag Mast', dev: 'FLAG_MAST_Price', flat: true, cols: ['Item', 'Value'] },
        { label: 'Octagonal Pole - Standard Lighting Pole', dev: 'Std_Lightning_Pole_Price', flat: true, cols: ['Item', 'Value'] },
        { label: 'Octagonal Pole - Custom Lighting Pole', dev: 'Custom_Lightning_Pole', flat: true, cols: ['Item', 'Value'] },
        { label: 'Octagonal Pole - Mid Hinge Pole', dev: 'Mid_Hinge_Pole', flat: true, cols: ['Item', 'Value'] },
        { label: 'Segment Above 5 - LCLM', dev: 'LCLM_Price', flat: true, cols: ['Item', 'Value'] },
        { label: 'Lightning Cum Lighting Mast', dev: 'Lightning_Cum_Lighting_Mast_Price', flat: true, cols: ['Item', 'Value'] },
        { label: 'Signage Mast', dev: 'Signage_Mast_Price', flat: true, cols: ['Item', 'Value'] },
        { label: 'Latching Mast', dev: 'Latching_Mast_Price', flat: true, cols: ['Item', 'Value'] },
        { label: 'Custom Lightning Mast', dev: 'Custom_Lighting_Mast', flat: true, cols: ['Item', 'Value'] }
    ],
    'Transmission Tower - Department': [
        {
            label: 'Type of Product - Tower', dev: 'Transmission_Tower_Product', cols: ['Item', 'Value'],
            labels: {
                pvt_pv_convergence_to_angles: 'PV Convergence to Angles', pvt_firm_angles: 'Firm Angles Price',
                pvt_firm_zinc_price: 'Firm Zinc Price', pvt_int_comp_working_capital: 'Interest - Working Capital',
                pvt_int_carrying_cost: 'Interest - Carrying Cost', pvt_int_LC: 'Interest - LC %', pvt_int_VFS: 'Interest - VFS %',
                pvt_proto_value: 'Proto Value', pvt_base_cop: 'Cost of Production', pvt_base_zcp: 'Zinc Consumption %', pvt_base_sp: 'Scrap %'
            }
        },
        {
            label: 'Type of Product - Substation', dev: 'Transmission_Substation', cols: ['Item', 'Value'],
            labels: {
                pvs_pv_conversion_to_angle: 'PV Conversion to Angle', pvs_firm_angles: 'Firm Angles Price',
                pvs_firm_zinc_price: 'Firm Zinc Price', pvs_int_comp_working_capital: 'Interest - Working Capital',
                pvs_int_carrying_cost: 'Interest - Carrying Cost', pvs_int_LC: 'Interest - LC %', pvs_int_VFS: 'Interest - VFS %',
                pvs_proto_value: 'Proto Value', pvs_base_Cost_of_Production: 'Cost of Production', pvs_base_zcp: 'Zinc Consumption %',
                pvs_base_sp: 'Scrap %', pvs_composite_st: 'Composite Structure Rate', pvs_equipment_st: 'Equipment Structure Rate',
                pvs_gantary_st: 'Gantry Structure Rate'
            }
        },
        {
            label: 'Nuts & Bolts Details', dev: 'Transmission_Nuts_Bolts', cols: ['Item', 'Value'],
            labels: {
                base_price: 'Base Price', foundation_base_price: 'Foundation Base Price',
                pvs_type_5_6_margin: 'PVS Type 5.6 Margin %', pvs_type_6_8_margin: 'PVS Type 6.8 Margin %',
                pvs_type_8_8_margin: 'PVS Type 8.8 Margin %', pvs_detail_foundation_bolt_margin: 'Foundation Bolt Margin %',
                pvs_detail_ms_template_margin_firm: 'MS Template (FIRM) Margin %', pvs_detail_ms_template_margin_pv: 'MS Template (PV) Margin %'
            }
        }
    ],
    'Telecom Tower - Department': [
        // Quote Rate Card Manager (Rajeev, 14 Sep): Telecom_Angular_Tower etc., Department__c "Angular Tower" ...
        {
            label: 'Angular Tower', dev: 'Telecom_Angular_Tower', dept: 'Angular Tower', cols: ['Item', 'Rate'],
            labels: {
                agl_rmc: 'Raw Material Cost', agl_zinc_value: 'Zinc Value', agl_zinc_conversion_percent: 'Zinc Conversion %',
                agl_fabrication_cost: 'Fabrication Cost', agl_labour_cost: 'Labour Cost',
                agl_against_LC_percent: 'Against LC Margin %', agl_against_VFS_percent: 'Against VFS Margin %'
            }
        },
        {
            label: 'Tubular Tower', dev: 'Telecom_Tubular_Tower', dept: 'Tubular Tower', cols: ['Item', 'Rate'],
            labels: {
                tub_without_bom_value1: 'Without BOM Value', tub_pipe_rate: 'Pipe Rate', tub_plate_rate: 'Plate Rate',
                tub_ang_chan_rate: 'Angle/Channel Rate', tub_misc_chan_rate: 'Misc Rate', tub_zinc_value: 'Zinc Value',
                tub_zinc_conversion_percent: 'Zinc Conversion %', tub_fabrication_cost: 'Fabrication Cost', tub_labour_cost: 'Labour Cost',
                tub_against_LC_percent: 'Against LC Margin %', tub_against_VFS_percent: 'Against VFS Margin %'
            }
        },
        {
            label: 'Tubular Signalling Tower', dev: 'Telecom_Tubular_Signalling_Tower', dept: 'Tubular Signalling Tower', cols: ['Item', 'Rate'],
            labels: {
                tsg_without_bom_value1: 'Without BOM Value', tsg_pipe_rate: 'Pipe Rate', tsg_plate_rate: 'Plate Rate',
                tsg_ang_chan_rate: 'Angle/Channel Rate', tsg_misc_chan_rate: 'Misc Rate', tsg_zinc_value: 'Zinc Value',
                tsg_zinc_conversion_percent: 'Zinc Conversion %', tsg_fabrication_cost: 'Fabrication Cost', tsg_labour_cost: 'Labour Cost',
                tsg_against_LC_percent: 'Against LC Margin %', tsg_against_VFS_percent: 'Against VFS Margin %'
            }
        }
    ]
};