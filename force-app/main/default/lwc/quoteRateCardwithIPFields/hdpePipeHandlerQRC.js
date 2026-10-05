/**
 * Sub-Controller for HDPE Pipe Department
 */
export function getHdpePipeFields(subType) {
    if (subType === 'Standard - IS 4984') {
        return [
            { name: 'Pipe Diameter', value: '', type: 'number' },
            { name: 'PN Rating', value: '', type: 'text' },
            { name: 'PE Grade', value: '', type: 'text' },
            { name: 'Price Per Meter', value: '', type: 'number' }
        ];
    } else if (subType === 'Standard - PLB Duct') {
        return [
            { name: 'Outer Diameter', value: '', type: 'decimal' },
            { name: 'Inner Diameter', value: '', type: 'decimal' },
            { name: 'Color Code', value: '', type: 'text' },
            { name: 'Standard Length Price', value: '', type: 'decimal' },
            { name: 'Price Per Meter', value: '', type: 'number' }
        ];
    }
    return [{ name: 'Item Name', value: '', type: 'text' }, { name: 'Rate', value: '', type: 'number' }];
}