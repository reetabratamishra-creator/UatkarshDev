import { LightningElement, track } from 'lwc';

export default class AccessoriesConfig extends LightningElement {
    @track transInOffer = '';
    @track transportation = 0;
    @track fvf = 0;

    @track accessoriesRows = [];
    @track miscRows = [];
    @track addMiscRows = [];

    get beamOptions() {
        return [
            { label: 'W-Beam', value: 'W-Beam' },
            { label: 'Thrie Beam', value: 'Thrie Beam' }
        ];
    }

    get accessoryOptions() {
        return [
            { label: 'Bull Nose', value: 'Bull Nose' },
            { label: 'End Shoe', value: 'End Shoe' },
            { label: 'Fish Tail', value: 'Fish Tail' },
            { label: 'Buffer Return', value: 'Buffer Return' },
            { label: 'MELT', value: 'MELT' },
            { label: 'TT', value: 'TT' },
            { label: 'Turn Down End Terminal', value: 'Turn Down End Terminal' },
            { label: 'Concrete Transition Element (NJB Connection)', value: 'Concrete Transition Element (NJB Connection)' },
            { label: 'End Terminal', value: 'End Terminal' },
            { label: 'Terminal Connector', value: 'Terminal Connector' },
            { label: 'Crash Cushion', value: 'Crash Cushion' }
        ];
    }

    get uomOptions() {
        return [
            { label: 'PCS', value: 'PCS' },
            { label: 'Running Meter', value: 'Running Meter' },
            { label: 'Set', value: 'Set' }
        ];
    }

    get transOptions() {
        return [
            { label: 'Ex-works', value: 'Ex-works' },
            { label: 'F.O.R (Freight on Road)', value: 'F.O.R (Freight on Road)' }
        ];
    }

    connectedCallback() {
        for (let i = 1; i <= 10; i++) {
            this.accessoriesRows.push({
                id: `acc_${i}`,
                beamType: '',
                accessory: '',
                length: null,
                width: null,
                height: null,
                weight: null,
                uom: '',
                rate: null,
                qtyOneSet: null,
                qtyNo: null,
                remark: ''
            });

            this.miscRows.push({
                id: `misc_${i}`,
                description: '',
                length: null,
                thickness: null,
                weight: null,
                uom: '',
                rate: null,
                qtyOneSet: null,
                qtyNo: null,
                remark: ''
            });

            this.addMiscRows.push({
                id: `add_misc_${i}`,
                description: '',
                uom: '',
                qty: null,
                rate: null
            });
        }
    }

    handleGlobalChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    handleAccChange(event) {
        const index = event.target.dataset.index;
        const field = event.target.dataset.field;
        this.accessoriesRows[index][field] = event.target.value;
    }

    handleMiscChange(event) {
        const index = event.target.dataset.index;
        const field = event.target.dataset.field;
        this.miscRows[index][field] = event.target.value;
    }

    handleAddMiscChange(event) {
        const index = event.target.dataset.index;
        const field = event.target.dataset.field;
        this.addMiscRows[index][field] = event.target.value;
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleSave() {
        const validAccessories = this.accessoriesRows.filter(row => row.qtyNo > 0 || (row.qtyOneSet > 0) || (row.accessory && row.rate));
        const validMisc = this.miscRows.filter(row => row.qtyNo > 0 || (row.qtyOneSet > 0) || (row.description && row.rate));
        const validAddMisc = this.addMiscRows.filter(row => row.qty > 0 || (row.description && row.rate));
        
        const payload = {
            accessories: validAccessories,
            miscellaneous: validMisc,
            addMiscellaneous: validAddMisc,
            global: {
                transInOffer: this.transInOffer,
                transportation: this.transportation,
                fvf: this.fvf
            }
        };

        this.dispatchEvent(new CustomEvent('save', { detail: payload }));
    }
}