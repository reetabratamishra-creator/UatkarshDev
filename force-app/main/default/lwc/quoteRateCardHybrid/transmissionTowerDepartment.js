export function getTransmissionTowerFields(subSpecification) {
    switch (subSpecification) {
        case 'Type of Product - Tower':
            return [
                { name: 'Tower configuration type', value: '', type: 'text' },
                { name: 'Wind Loading Parameter zone', value: '', type: 'text' },
                { name: 'Fabrication Cost base metric', value: '', type: 'number' }
            ];
        case 'Price Variation Calculation':
            return [
                { name: 'Base Calculation Anchor Month', value: '', type: 'text' },
                { name: 'Steel Index Rate Factor', value: '', type: 'number' },
                { name: 'Final Calculated Formulation Rate', value: '', type: 'number' }
            ];
        default:
            return [
                { name: 'Standard Item Unit Part Reference', value: '', type: 'text' },
                { name: 'Execution Cost Rate', value: '', type: 'number' }
            ];
    }
}