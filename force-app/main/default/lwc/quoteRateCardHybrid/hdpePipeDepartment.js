export function getHdpePipeFields(subSpecification) {
    if (subSpecification === 'Standard - IS 4984') {
        return [
            { name: 'Pipe Diameter', value: '', type: 'number' },
            { name: 'PN Rating', value: '', type: 'text' },
            { name: 'PE Grade', value: '', type: 'text' },
            { name: 'Price Per Meter', value: '', type: 'number' }
        ];
    }
    return [
        { name: 'Outer Diameter', value: '', type: 'number' },
        { name: 'Inner Diameter', value: '', type: 'number' },
        { name: 'Color Code', value: '', type: 'text' },
        { name: 'Standard Length Price', value: '', type: 'number' }
    ];
}