import { LightningElement, api, track } from 'lwc';
import getRateCardJson from '@salesforce/apex/CreateQuoteController.getRateCardJson';

export default class TelecomTowerConfig extends LightningElement {
    @api typeOfTower = 'Angular';
    @api savedData = {};

    get isAngular() { return this.typeOfTower === 'Angular'; }
    get isTubular() { return this.typeOfTower === 'Tubular' || this.typeOfTower === 'Tubular Signalling'; }

    // Payment Terms (from modalSavedData)
    get selectPaymentTerms() { return this.savedData?.select_payment_terms || ''; }
    get usanceInterestSeller() { return this.savedData?.usance_interest_seller || 1; }

    // Angular state
    @track angRmc = 63000;
    @track angZincValue = 0;
    @track angZincConversionPercent = 0;
    get angTotalZincValue() { return (Number(this.angZincValue || 0) * (Number(this.angZincConversionPercent || 0) / 100)) || 0; }
    
    @track angFabrication = false;
    @track angFabricationCost = 8000;
    @track angLabour = false;
    @track angLabourCost = 2000;
    
    handleAngZincValueChange(e) { this.angZincValue = e.target.value; this.recalculateAll(); }
    handleAngZincConversionChange(e) { this.angZincConversionPercent = e.target.value; this.recalculateAll(); }
    handleAngFabricationChange(e) { this.angFabrication = e.target.checked; this.recalculateAll(); }
    handleAngFabricationCostChange(e) { this.angFabricationCost = e.target.value; this.recalculateAll(); }
    handleAngLabourChange(e) { this.angLabour = e.target.checked; this.recalculateAll(); }
    handleAngLabourCostChange(e) { this.angLabourCost = e.target.value; this.recalculateAll(); }

    // Tubular state
    @track tubPipeRate = 63;
    @track tubPlateRate = 58;
    @track tubAngChanRate = 57;
    @track tubMiscRate = 58;
    
    @track tubMaterialList = '';
    @track _tubMaterialListOptions = null;
    get tubMaterialListOptions() {
        return this._tubMaterialListOptions || [
            { label: 'BOM Availabel', value: 'BOM Availabel' },
            { label: 'BOM Not Availabel', value: 'BOM Not Availabel' }
        ];
    }
    get showBomFields() { return this.tubMaterialList === 'BOM Availabel'; }

    @track tubTowerWeight = 0;
    @track tubPipeCom = 0;
    @track tubPlateCom = 0;
    @track tubAngChanCom = 0;
    @track tubMiscCom = 0;
    get tubTotalComposition() { return Number(this.tubPipeCom || 0) + Number(this.tubPlateCom || 0) + Number(this.tubAngChanCom || 0) + Number(this.tubMiscCom || 0); }

    // Calculated Tubular BOM Rates
    get tubPipeWt() { return Number(this.tubTowerWeight || 0) * (Number(this.tubPipeCom || 0) / 100); }
    get tubPipeTotal() { return Math.round(Number(this.tubPipeRate || 0) * this.tubPipeWt); }

    get tubPlateWt() { return Number(this.tubTowerWeight || 0) * (Number(this.tubPlateCom || 0) / 100); }
    get tubPlateTotal() { return Math.round(Number(this.tubPlateRate || 0) * this.tubPlateWt); }

    get tubAngChanWt() { return Number(this.tubTowerWeight || 0) * (Number(this.tubAngChanCom || 0) / 100); }
    get tubAngChanTotal() { return Math.round(Number(this.tubAngChanRate || 0) * this.tubAngChanWt); }

    get tubMiscWt() { return Number(this.tubTowerWeight || 0) * (Number(this.tubMiscCom || 0) / 100); }
    get tubMiscTotal() { return Math.round(Number(this.tubMiscRate || 0) * this.tubMiscWt); }

    get tubTotalRmCostValue() { return this.tubPipeTotal + this.tubPlateTotal + this.tubAngChanTotal + this.tubMiscTotal; }
    get tubRmcRate() { return Number(this.tubTowerWeight || 0) === 0 ? 0 : (this.tubTotalRmCostValue / Number(this.tubTowerWeight)); }

    @track tubZincRatePerMt = 0;
    get tubTotalZincValue() { return Number(this.tubZincRatePerMt || 0); }

    @track tubFabrication = false;
    @track tubFabricationCost = 8000;
    @track tubLabour = false;
    @track tubLabourCost = 2000;

    handleTubPipeRateChange(e) { this.tubPipeRate = e.target.value; this.recalculateAll(); }
    handleTubPlateRateChange(e) { this.tubPlateRate = e.target.value; this.recalculateAll(); }
    handleTubAngChanRateChange(e) { this.tubAngChanRate = e.target.value; this.recalculateAll(); }
    handleTubMiscRateChange(e) { this.tubMiscRate = e.target.value; this.recalculateAll(); }
    handleTubMaterialListChange(e) { this.tubMaterialList = e.target.value; this.recalculateAll(); }
    handleTubTowerWeightChange(e) { this.tubTowerWeight = e.target.value; this.recalculateAll(); }
    handleTubPipeComChange(e) { this.tubPipeCom = e.target.value; this.recalculateAll(); }
    handleTubPlateComChange(e) { this.tubPlateCom = e.target.value; this.recalculateAll(); }
    handleTubAngChanComChange(e) { this.tubAngChanCom = e.target.value; this.recalculateAll(); }
    handleTubMiscComChange(e) { this.tubMiscCom = e.target.value; this.recalculateAll(); }
    handleTubZincRatePerMtChange(e) { this.tubZincRatePerMt = e.target.value; this.recalculateAll(); }
    handleTubFabricationChange(e) { this.tubFabrication = e.target.checked; this.recalculateAll(); }
    handleTubFabricationCostChange(e) { this.tubFabricationCost = e.target.value; this.recalculateAll(); }
    handleTubLabourChange(e) { this.tubLabour = e.target.checked; this.recalculateAll(); }
    handleTubLabourCostChange(e) { this.tubLabourCost = e.target.value; this.recalculateAll(); }

    // Margin
    @track margin = 0;
    handleMarginChange(e) { this.margin = e.target.value; this.recalculateAll(); }

    // Product Rows
    @track products = [
        { id: 'prod_1', details: '', weight: 0, quantity: 1, uom: 'SET', ratePerMt: 0, basicRate: 0, totalValue: 0, unitCost: 0, unitPrice: 0 }
    ];

    handleAddProduct() {
        if (this.products.length >= 10) return;
        this.products.push({ id: `prod_${Date.now()}`, details: '', weight: 0, quantity: 1, uom: 'SET', ratePerMt: 0, basicRate: 0, totalValue: 0, unitCost: 0, unitPrice: 0 });
        this.products = [...this.products];
    }

    handleRemoveProduct(e) {
        if (this.products.length <= 1) return;
        this.products = this.products.filter(p => p.id !== e.currentTarget.dataset.id);
        this.recalculateAll();
    }

    handleProductChange(e) {
        const id = e.currentTarget.dataset.id;
        const field = e.currentTarget.name;
        const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;

        this.products = this.products.map(p => {
            if (p.id === id) {
                return { ...p, [field]: value };
            }
            return p;
        });
        this.recalculateAll();
    }

    // Mathematical Core
    get angU19() {
        if (this.isAngular) return 55000;
        if (this.isTubular && this.tubMaterialList) return 63000;
        return 0;
    }
    
    get angU20() { return this.isAngular ? this.angTotalZincValue : this.tubTotalZincValue; }
    
    get angL21() {
        if (this.isAngular) {
            return (this.angLabour ? Number(this.angLabourCost||0) : 0) + (this.angFabrication ? Number(this.angFabricationCost||0) : 0);
        } else {
            return (this.tubLabour ? Number(this.tubLabourCost||0) : 0) + (this.tubFabrication ? Number(this.tubFabricationCost||0) : 0);
        }
    }

    get angU23() { return (this.angU19 + this.angU20 + this.angL21) * (Number(this.margin) / 100); }
    
    get angX30() { 
        let interest = Math.round((this.angU19 + this.angU20) * 0.08 * Number(this.usanceInterestSeller) / 365);
        return interest + (this.angU19 + this.angU20) + this.angL21 + this.angU23; 
    }
    
    get angW23() { return this.angU23 + (this.angU19 + this.angU20 + this.angL21); }

    recalculateAll() {
        const ratePerMt = this.selectPaymentTerms === 'Against LC' ? this.angX30 : this.angW23;

        this.products = this.products.map(p => {
            const basicRate = ratePerMt;
            const unitCost = Math.round((basicRate / (1 + Number(this.margin)/100)) * 100) / 100;
            const unitPrice = Math.round(basicRate * Number(p.weight||0)); 
            const totalValue = unitPrice * Number(p.quantity||1);
            
            return {
                ...p,
                ratePerMt: basicRate,
                basicRate: basicRate,
                unitCost: unitCost,
                unitPrice: unitPrice,
                totalValue: totalValue
            };
        });
    }

    connectedCallback() {
        if (this.savedData && this.savedData._telecomTowerConfig) {
            const saved = this.savedData._telecomTowerConfig;
            
            // Restore products if they exist
            if (saved.Lines && saved.Lines.length > 0) {
                this.products = saved.Lines.map((line, idx) => ({
                    id: `prod_${Date.now()}_${idx}`,
                    details: line.ProductDetails,
                    weight: line.TowerWeight,
                    quantity: line.Quantity,
                    uom: line.UOM,
                    ratePerMt: line.RatePerMt,
                    basicRate: line.RatePerMt,
                    unitCost: line.UnitCost,
                    unitPrice: line.UnitPrice,
                    totalValue: line.TotalValue
                }));
            }
            if (saved.margin) this.margin = saved.margin;
        }

        this.fetchBaseRates();
    }

    fetchBaseRates() {
        getRateCardJson({ departmentName: 'Telecom Tower - Department' })
            .then(result => {
                if (result) {
                    try {
                        const rateData = JSON.parse(result);
                        if (rateData.angRmc) this.angRmc = Number(rateData.angRmc);
                        if (rateData.angFabricationCost) this.angFabricationCost = Number(rateData.angFabricationCost);
                        if (rateData.angLabourCost) this.angLabourCost = Number(rateData.angLabourCost);
                        
                        if (rateData.tubPipeRate) this.tubPipeRate = Number(rateData.tubPipeRate);
                        if (rateData.tubPlateRate) this.tubPlateRate = Number(rateData.tubPlateRate);
                        if (rateData.tubAngChanRate) this.tubAngChanRate = Number(rateData.tubAngChanRate);
                        if (rateData.tubMiscRate) this.tubMiscRate = Number(rateData.tubMiscRate);
                        if (rateData.tubFabricationCost) this.tubFabricationCost = Number(rateData.tubFabricationCost);
                        if (rateData.tubLabourCost) this.tubLabourCost = Number(rateData.tubLabourCost);

                        if (rateData.tubMaterialListOptions) {
                            this._tubMaterialListOptions = rateData.tubMaterialListOptions;
                        }
                    } catch (e) {
                        console.error('Error parsing Telecom Tower base rates', e);
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching base rates', error);
            })
            .finally(() => {
                this.recalculateAll();
            });
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleSave() {
        const Lines = this.products.map(p => {
            return {
                ProductDetails: p.details,
                TowerWeight: p.weight,
                Quantity: p.quantity,
                UOM: p.uom,
                RatePerMt: p.ratePerMt,
                UnitPrice: p.unitPrice,
                UnitCost: p.unitCost,
                Margin: this.margin,
                TotalValue: p.totalValue
            };
        });

        this.dispatchEvent(new CustomEvent('save', {
            detail: {
                Lines: Lines
            }
        }));
    }
}