export function getSolarStructureFields(subSpecification) {
    if (subSpecification === 'Unit of Measurement - Pcs') {
        return [
            { name: 'Structure Frame ID', value: '', type: 'text' },
            { name: 'Module Capacity Layout', value: '', type: 'text' },
            { name: 'Rate Per Piece', value: '', type: 'number' }
        ];
    }
    return [
        { name: 'Raw Material Steel Grade', value: '', type: 'text' },
        { name: 'Total Weight In KG', value: '', type: 'number' },
        { name: 'Rate Per KG', value: '', type: 'number' }
    ];
}