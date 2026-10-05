import { LightningElement, track, api } from 'lwc';
import getRateCardJson from '@salesforce/apex/CreateQuoteController.getRateCardJson';

const STEEL_TYPE_OPTIONS = [
    { label: "Black Steel", value: "Black Steel" },
    { label: "Galvanized Iron (GI)", value: "Galvanized Iron (GI)" },
    { label: "Stainless Steel", value: "Stainless Steel" }
];

const DESIGNATION_OPTIONS = [
    { label: "MS ERW", value: "MS ERW" },
    { label: "GI ERW", value: "GI ERW" },
    { label: "CS ERW", value: "CS ERW" }
];

const STANDARD_OPTIONS = [
    { label: "IS 1239", value: "IS 1239" },
    { label: "IS 1161", value: "IS 1161" },
    { label: "IS 3589", value: "IS 3589" },
    { label: "IS 4270:2001", value: "IS 4270:2001" },
    { label: "IS 4923 : 2017", value: "IS 4923 : 2017" },
    { label: "IS 9295 : 1983", value: "IS 9295 : 1983" },
    { label: "IS 10577 : 1982", value: "IS 10577 : 1982" },
    { label: "IS 3601", value: "IS 3601" }
];

const END_FINISH_OPTIONS = [
    { label: "Plain End", value: "Plain End" },
    { label: "Beveled End", value: "Beveled End" },
    { label: "Threaded & Coupled", value: "Threaded & Coupled" }
];

const UOM_OPTIONS = [
    { label: "MT", value: "MT" },
    { label: "Meters", value: "Meters" },
    { label: "Pieces", value: "Pieces" }
];


export default class SteelPipeConfig extends LightningElement {
    @track pipeCount = 1;
    @track pipes = [];
    @track showCalculations = true;
    @track dynamicBaseRates = {};
    WEIGHT_MAP = {};
    SHAPE_DEPENDENT_MAP = {};
    CLASS_DEPENDENT_MAP = {};

    @api savedPipes = [];

    connectedCallback() {
        this.fetchConfigData();
        
        this.initializePipes();
    }

        fetchConfigData() {
        getRateCardJson({ departmentName: 'Steel Pipe Domestic Config' })
            .then(data => {
                if (data) {
                    try {
                        const config = JSON.parse(data);
                        this.WEIGHT_MAP = config.WEIGHT_MAP || {};
                        this.SHAPE_DEPENDENT_MAP = config.SHAPE_DEPENDENT_MAP || {};
                        this.CLASS_DEPENDENT_MAP = config.CLASS_DEPENDENT_MAP || {};
                        this.dynamicBaseRates = config.BASE_RATES || {};
                        
                        // Re-eval options for existing pipes
                        this.pipes = this.pipes.map(p => {
                            p.shapeOptions = this.getShapeOptions(p.standardSpecGrade);
                            if (p.shapeOptions.length === 1) {
                                if (!p.shapeType) {
                                    p.shapeType = p.shapeOptions[0].value;
                                }
                                p.isShapeDisabled = true;
                            } else {
                                p.isShapeDisabled = false;
                            }
                            p.sizeOptions = this.getSizeOptions(p.standardSpecGrade, p.shapeType);
                            p.classOptions = this.getClassOptions(p.standardSpecGrade, p.shapeType, p.sizeNb);
                            if (p.classOptions.length === 1) {
                                if (!p.pipeClass) {
                                    p.pipeClass = p.classOptions[0].value;
                                }
                                p.isClassDisabled = true;
                            } else {
                                p.isClassDisabled = false;
                            }
                            this.calculatePipe(p);
                            return p;
                        });
                    } catch (e) {
                        console.error('Error parsing JSON Config', e);
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching Rate Card Config', error);
            });
    }

    

    initializePipes() {
        if (this.savedPipes && this.savedPipes.length > 0) {
            this.pipeCount = this.savedPipes.length;
            this.pipes = this.savedPipes.map((savedPipe, index) => {
                let pipe = this.createEmptyPipe(index);
                // Copy all properties from saved data
                pipe.steelType = savedPipe.steel_type;
                pipe.designation = savedPipe.pipe_designation;
                pipe.standardSpecGrade = savedPipe.standard_spec_grade || savedPipe.standard;
                pipe.shapeType = savedPipe.shape;
                pipe.pipeClass = savedPipe.pipe_class;
                pipe.sizeNb = savedPipe.size_nb;
                pipe.endFinish = savedPipe.end_finish;
                pipe.pipeLength = savedPipe.pipe_length || 1;
                pipe.quantity = savedPipe.quantity;
                pipe.uom = savedPipe.uom;
                pipe.discount = savedPipe.discount || 0;
                
                // Rebuild options dropdowns
                pipe.shapeOptions = this.getShapeOptions(pipe.standardSpecGrade);
                if (pipe.shapeOptions.length === 1) {
                    pipe.isShapeDisabled = true;
                    if (!pipe.shapeType) pipe.shapeType = pipe.shapeOptions[0].value;
                } else {
                    pipe.isShapeDisabled = false;
                }
                pipe.sizeOptions = this.getSizeOptions(pipe.standardSpecGrade, pipe.shapeType);
                pipe.classOptions = this.getClassOptions(pipe.standardSpecGrade, pipe.shapeType, pipe.sizeNb);
                if (pipe.classOptions.length === 1) {
                    if (!pipe.pipeClass) {
                        pipe.pipeClass = pipe.classOptions[0].value;
                    }
                    pipe.isClassDisabled = true;
                } else {
                    pipe.isClassDisabled = false;
                }
                
                pipe.singlePipeWeight = savedPipe.unitWeight || savedPipe.singlePipeWeight || 0;
                pipe.totalWeight = savedPipe.weight || savedPipe.totalWeight || 0;
                pipe.rateRsMtr = savedPipe.rate || savedPipe.rateRsMtr || 0;
                pipe.gst = savedPipe.gst || 0;
                pipe.pricePerUom = savedPipe.price_per_uom || savedPipe.pricePerUom || 0;
                
                pipe.additionalMargin = savedPipe.additionalMargin || savedPipe.Additional_Margin__c || 0;
                pipe.tolerance = savedPipe.tolerance || savedPipe.Tolerance__c || 10;
                
                pipe.transInOffer = savedPipe.transInOffer || savedPipe.Trans_In_Offer__c || '';
                pipe.freightType = savedPipe.freightType || savedPipe.Freight_Type__c || '';
                pipe.freightValue = savedPipe.freightValue || savedPipe.Freight_Value__c || null;

                pipe.showFreightType = pipe.transInOffer === 'F.O.R (Freight on Road)';
                pipe.showFreightValue = pipe.showFreightType && (pipe.freightType === 'Transportation KG' || pipe.freightType === 'Full Vehicle Freight');

                pipe.transInOfferOptions = [
                    { label: 'EX-works', value: 'EX-works' },
                    { label: 'F.O.R (Freight on Road)', value: 'F.O.R (Freight on Road)' }
                ];
                pipe.freightTypeOptions = [
                    { label: 'Transportation KG', value: 'Transportation KG' },
                    { label: 'Full Vehicle Freight', value: 'Full Vehicle Freight' }
                ];
                
                const savedReflect = savedPipe.reflectInOfferDoc || savedPipe.Reflect_In_Offer_Doc__c || 'Yes';
                pipe.reflectInOfferDocToggle = savedReflect === 'Yes';

                this.calculatePipe(pipe);
                pipe.totalPrice = savedPipe.total_price || savedPipe.totalPrice || 0;

                return pipe;
            });
        } else {
            this.pipes = [];
            for (let i = 0; i < this.pipeCount; i++) {
                this.pipes.push(this.createEmptyPipe(i));
            }
        }
    }

    get hasFreight() {
        return this.pipes.some(pipe => pipe.transInOffer === 'F.O.R (Freight on Road)');
    }

    createEmptyPipe(index) {
        return {
            id: index,
            key: `pipe_${index}`,
            steelType: 'Black Steel',
            designation: 'MS ERW',
            standardSpecGrade: 'IS 1239',
            shapeType: 'Default',
            isShapeDisabled: false,
            pipeClass: '',
            isClassDisabled: false,
            sizeNb: '',
            endFinish: 'Plain End',
            pipeLength: 6,
            specialDescription: '',
            customOD: 0,
            customThickness: 0,
            quantity: 1,
            uom: 'Pieces',
            discount: 0,
            additionalMargin: 0,
            tolerance: 10,
            transInOffer: '',
            freightType: '',
            freightValue: null,
            showFreightType: false,
            showFreightValue: false,
            reflectInOfferDocToggle: true,
            isClassDisabled: false,
            isClassDefault: false,
            
            // Available Options
            transInOfferOptions: [
                { label: 'EX-works', value: 'EX-works' },
                { label: 'F.O.R (Freight on Road)', value: 'F.O.R (Freight on Road)' }
            ],
            freightTypeOptions: [
                { label: 'Transportation KG', value: 'Transportation KG' },
                { label: 'Full Vehicle Freight', value: 'Full Vehicle Freight' }
            ],
            steelTypeOptions: STEEL_TYPE_OPTIONS,
            designationOptions: DESIGNATION_OPTIONS,
            standardOptions: STANDARD_OPTIONS,
            shapeOptions: this.getShapeOptions('IS 1239'),
            classOptions: [],
            sizeOptions: [],
            endFinishOptions: END_FINISH_OPTIONS,
            uomOptions: UOM_OPTIONS,
            
            // Calculated fields
            weightPerMeter: 0,
            singlePipeWeight: 0,
            totalWeight: 0,
            rateRsMtr: 0,
            gst: 0,
            pricePerUom: 0,
            totalPrice: 0
        };
    }

    getShapeOptions(standard) {
        if (this.SHAPE_DEPENDENT_MAP[standard]) {
            return this.SHAPE_DEPENDENT_MAP[standard].map(opt => ({ label: opt, value: opt }));
        }
        return [{ label: 'Default', value: 'Default' }];
    }

    getODFromNB(standard, nbValue) {
        // If it's not a standard round pipe NB (e.g., Square sizes or already OD), return as is
        if (!nbValue || !nbValue.endsWith('mm')) return nbValue;
        
        let num = nbValue.replace('mm', '').trim();
        const map = {
            "15": "21.3", "20": "26.9", "25": "33.7", "32": "42.4",
            "40": "48.3", "50": "60.3", "65": "76.1", "80": "88.9",
            "90": "101.6", "100": "114.3", "110": "127", 
            "125": (standard === 'IS 4270:2001') ? "141.3" : "139.7",
            "135": "152.4", 
            "150": (standard === 'IS 3589' || standard === 'IS 4270:2001') ? "168.3" : "165.1",
            "175": "193.7", "200": "219.1", "225": "244.5",
            "250": (standard === 'IS 4270:2001') ? "273.1" : "273", 
            "300": "323.9", "350": "355.6", "400": "406.4"
        };
        return map[num] ? map[num] : nbValue;
    }

    getSizeOptions(standard, shape) {
        const keyPrefix = `${standard}|${shape}|`;
        const sizes = new Set();
        Object.keys(this.WEIGHT_MAP).forEach(k => {
            if (k.startsWith(keyPrefix)) {
                sizes.add(k.split('|')[3]);
            }
        });
        return Array.from(sizes).map(opt => ({ 
            label: this.getODFromNB(standard, shape, opt), 
            value: opt 
        }));
    }

    getClassOptions(standard, shape, sizeNb) {
        if (standard === 'IS 1239') {
            return [{ label: 'Default', value: 'Default' }];
        }
        
        if (!sizeNb) {
            const key = `${standard}|${shape}`;
            if (this.CLASS_DEPENDENT_MAP[key] && this.CLASS_DEPENDENT_MAP[key].length === 1) {
                return this.CLASS_DEPENDENT_MAP[key].map(opt => ({ label: opt, value: opt }));
            }
            return [];
        }

        const keyPrefix = `${standard}|${shape}|`;
        const classes = new Set();
        Object.keys(this.WEIGHT_MAP).forEach(k => {
            const parts = k.split('|');
            if (k.startsWith(keyPrefix) && parts[3] === sizeNb) {
                classes.add(parts[2]);
            }
        });
        const options = Array.from(classes).map(opt => ({ label: opt, value: opt }));
        if (options.length > 0) return options;

        const key = `${standard}|${shape}`;
        if (this.CLASS_DEPENDENT_MAP[key] && this.CLASS_DEPENDENT_MAP[key].length > 0) {
            return this.CLASS_DEPENDENT_MAP[key].map(opt => ({ label: opt, value: opt }));
        }
        return [{ label: 'Default', value: 'Default' }];
    }

    handleApply() {
        for (let i = 0; i < this.pipes.length; i++) {
            const p = this.pipes[i];
            if (p.classOptions && p.classOptions.length > 0 && !p.pipeClass) {
                alert(`Row ${i + 1}: Please select a Wall Thickness / Class.`);
                return;
            }
        }

        const configuredPipes = this.pipes.map(pipe => ({
            steel_type: pipe.steelType,
            pipe_designation: pipe.designation,
            standard: pipe.standardSpecGrade,
            shape: pipe.shapeType,
            pipe_class: pipe.pipeClass,
            size_nb: pipe.sizeNb,
            end_finish: pipe.endFinish,
            pipe_length: pipe.pipeLength,
            special_description: pipe.specialDescription || '',
            custom_od: pipe.customOD || 0,
            custom_thickness: pipe.customThickness || 0,
            quantity: pipe.quantity,
            uom: pipe.uom,
            discount: pipe.discount,
            singlePipeWeight: pipe.singlePipeWeight,
            totalWeight: pipe.totalWeight,
            rateRsMtr: pipe.rateRsMtr,
            gst: pipe.gst,
            pricePerUom: pipe.pricePerUom,
            totalPrice: pipe.totalPrice
        }));

        this.dispatchEvent(new CustomEvent('saveconfig', {
            detail: {
                pipes: configuredPipes
            }
        }));
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }

    handlePipeCountChange(event) {
        let val = parseInt(event.target.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        this.pipeCount = val;
        
        // Adjust array size
        if (this.pipes.length < this.pipeCount) {
            for (let i = this.pipes.length; i < this.pipeCount; i++) {
                this.pipes.push(this.createEmptyPipe(i));
            }
        } else if (this.pipes.length > this.pipeCount) {
            this.pipes = this.pipes.slice(0, this.pipeCount);
        }
    }

    toggleCalculations() {
        this.showCalculations = !this.showCalculations;
    }

    handleAddRow() {
        this.pipeCount = this.pipes.length + 1;
        this.pipes.push(this.createEmptyPipe(this.pipes.length));
        this.pipes = [...this.pipes];
    }

    handleDeleteRow(event) {
        const index = parseInt(event.currentTarget.dataset.index, 10);
        if (!isNaN(index) && index >= 0 && index < this.pipes.length) {
            if (this.pipes.length === 1) {
                this.pipes = [this.createEmptyPipe(0)];
            } else {
                this.pipes.splice(index, 1);
                this.pipes = this.pipes.map((pipe, idx) => {
                    pipe.id = idx;
                    pipe.key = `pipe_${idx}_${Date.now()}`;
                    return pipe;
                });
                this.pipeCount = this.pipes.length;
            }
        }
    }

    handleFieldChange(event) {
        const fieldName = event.target.dataset.field;
        const index = parseInt(event.target.dataset.index, 10);
        const value = (event.target.type === 'toggle' || event.target.type === 'checkbox') ? event.target.checked : event.target.value;

        let pipe = this.pipes[index];
        pipe[fieldName] = value;

        // Dependency logic
        if (fieldName === 'standardSpecGrade') {
            pipe.shapeType = '';
            pipe.sizeNb = '';
            pipe.pipeClass = '';
            pipe.shapeOptions = this.getShapeOptions(pipe.standardSpecGrade);
            pipe.sizeOptions = [];
            pipe.classOptions = [];
            // Auto-select if only 1 option
            if (pipe.shapeOptions.length === 1) {
                pipe.shapeType = pipe.shapeOptions[0].value;
                pipe.isShapeDisabled = true;
                pipe.sizeOptions = this.getSizeOptions(pipe.standardSpecGrade, pipe.shapeType);
                pipe.classOptions = this.getClassOptions(pipe.standardSpecGrade, pipe.shapeType, pipe.sizeNb);
                if (pipe.classOptions.length === 1) {
                    if (pipe.classOptions[0].value === 'Default') {
                        pipe.pipeClass = '';
                        pipe.isClassDisabled = false;
                        pipe.isClassDefault = true;
                    } else {
                        pipe.pipeClass = pipe.classOptions[0].value;
                        pipe.isClassDisabled = true;
                        pipe.isClassDefault = false;
                    }
                } else {
                    pipe.isClassDisabled = false;
                    pipe.isClassDefault = false;
                }
            } else {
                pipe.isShapeDisabled = false;
                pipe.isClassDisabled = false;
            }
        } else if (fieldName === 'shapeType') {
            pipe.sizeNb = '';
            pipe.pipeClass = '';
            pipe.sizeOptions = this.getSizeOptions(pipe.standardSpecGrade, pipe.shapeType);
            pipe.classOptions = this.getClassOptions(pipe.standardSpecGrade, pipe.shapeType, pipe.sizeNb);
            if (pipe.classOptions.length === 1) {
                if (pipe.classOptions[0].value === 'Default') {
                    pipe.pipeClass = '';
                    pipe.isClassDisabled = false;
                    pipe.isClassDefault = true;
                } else {
                    pipe.pipeClass = pipe.classOptions[0].value;
                    pipe.isClassDisabled = true;
                    pipe.isClassDefault = false;
                }
            } else {
                pipe.isClassDisabled = false;
                pipe.isClassDefault = false;
            }
        } else if (fieldName === 'sizeNb') {
            pipe.pipeClass = '';
            pipe.classOptions = this.getClassOptions(pipe.standardSpecGrade, pipe.shapeType, pipe.sizeNb);
            if (pipe.classOptions.length === 1) {
                if (pipe.classOptions[0].value === 'Default') {
                    pipe.pipeClass = '';
                    pipe.isClassDisabled = false;
                    pipe.isClassDefault = true;
                } else {
                    pipe.pipeClass = pipe.classOptions[0].value;
                    pipe.isClassDisabled = true;
                    pipe.isClassDefault = false;
                }
            } else {
                pipe.isClassDisabled = false;
                pipe.isClassDefault = false;
            }
        } else if (fieldName === 'transInOffer') {
            pipe.showFreightType = value === 'F.O.R (Freight on Road)';
            if (!pipe.showFreightType) {
                pipe.freightType = '';
                pipe.freightValue = null;
                pipe.showFreightValue = false;
            }
        } else if (fieldName === 'freightType') {
            pipe.showFreightValue = value === 'Transportation KG' || value === 'Full Vehicle Freight';
            if (!pipe.showFreightValue) {
                pipe.freightValue = null;
            }
        }
        
        // Ensure numeric for numbers
        if (['pipeLength', 'quantity', 'discount', 'additionalMargin', 'customOD', 'customThickness', 'freightValue', 'tolerance'].includes(fieldName)) {
            pipe[fieldName] = parseFloat(value) || 0;
        }

        // Handle tolerance and additional margin sync
        if (fieldName === 'additionalMargin') {
            pipe.tolerance = 10 + pipe.additionalMargin;
        } else if (fieldName === 'tolerance') {
            pipe.additionalMargin = pipe.tolerance - 10;
        }

        this.calculatePipe(pipe);
        // Trigger reactivity
        this.pipes = [...this.pipes];
    }

    calculatePipe(pipe) {
        // Formula for kg/mtr = (OD - THK) * THK * 0.0246615 (Using standard coefficient)
        let odVal = pipe.customOD > 0 ? pipe.customOD : (parseFloat(pipe.sizeNb) || 0);
        let thkVal = pipe.customThickness > 0 ? pipe.customThickness : (parseFloat(pipe.pipeClass) || 0);
        
        pipe.weightPerMeter = Number(((odVal - thkVal) * thkVal * 0.0246615).toFixed(3));
        
        // "change single wt to kg/mtr"
        pipe.singlePipeWeight = pipe.weightPerMeter;
        pipe.totalWeight = pipe.singlePipeWeight * pipe.quantity;

        // Find Base Rate
        let rateKey = `${pipe.steelType}|${pipe.designation}|${pipe.shapeType}|${pipe.pipeClass}|${pipe.sizeNb}`;
        let rateKeyWithoutShape = `${pipe.steelType}|${pipe.designation}`;
        
        // Priority for rate is complex in JSON, simplified here:
        // Attempt exact match first
        let baseRate = this.dynamicBaseRates[rateKey];
        if (baseRate === undefined) {
            // Attempt standard fallback
            const fbKey = `${pipe.steelType}|${pipe.designation}|Default|${pipe.pipeClass}|${pipe.sizeNb}`;
            baseRate = this.dynamicBaseRates[fbKey];
        }
        if (baseRate === undefined) {
            baseRate = this.dynamicBaseRates[rateKeyWithoutShape];
        }
        if (baseRate === undefined) {
            baseRate = this.dynamicBaseRates[pipe.steelType] || 0;
        }

        // Add extra charges
        if (pipe.endFinish === 'Beveled End') {
            baseRate += 0.50;
        }

        pipe.rateRsMtr = baseRate;

        // Pricing formula
        let discountMultiplier = (1 - (pipe.discount / 100));
        let discountedRate = pipe.rateRsMtr * discountMultiplier;
        
        // "PRICE (PER UOM) will be simply rate * single WT"
        let basePrice = discountedRate * pipe.singlePipeWeight;
        
        pipe.gst = Number((basePrice * 0.18).toFixed(2));
        pipe.pricePerUom = Number((basePrice + pipe.gst).toFixed(2));
        
        let tol = parseFloat(pipe.tolerance) || 0;
        pipe.cutoffPrice = Number((pipe.pricePerUom + (pipe.pricePerUom * (tol / 100))).toFixed(2));
        
        pipe.totalPrice = Number((pipe.cutoffPrice * pipe.quantity).toFixed(2));
    }

    @api
    getConfigurationData() {
        // Return structured data for the parent quoting engine
        return this.pipes.map(p => ({
            Steel_Type__c: p.steelType,
            Designation__c: p.designation,
            Standard__c: p.standardSpecGrade,
            Shape__c: p.shapeType,
            Pipe_Class__c: p.pipeClass,
            Size__c: p.sizeNb,
            End_Finish__c: p.endFinish,
            Length__c: p.pipeLength,
            Quantity__c: p.quantity,
            UOM__c: p.uom,
            Discount__c: p.discount,
            Additional_Margin__c: p.additionalMargin,
            Tolerance__c: p.tolerance,
            Cutoff_Price__c: p.cutoffPrice,
            Trans_In_Offer__c: p.transInOffer,
            Freight_Type__c: p.freightType,
            Freight_Value__c: p.freightValue,
            Reflect_In_Offer_Doc__c: p.reflectInOfferDocToggle ? 'Yes' : 'No',
            Total_Weight__c: p.totalWeight,
            Total_Price__c: p.totalPrice
        }));
    }
}