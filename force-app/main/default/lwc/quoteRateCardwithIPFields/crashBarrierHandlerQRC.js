/**
 * Sub-Controller for Crash Barrier Department
 */
export function getCrashBarrierFields(subType) {
    switch (subType) {
        case 'MBCB type - Conventional Type':
            return [
                { name: 'Item Code', value: '', type: 'text' },
                { name: 'W-Beam Thickness', value: '', type: 'number' },
                { name: 'Post Spacing', value: '', type: 'number' },
                { name: 'Rate Per MT', value: '', type: 'number' }
            ];
            
        case 'MBCB type - Railway':
            return [
                { name: 'Railway Section ID', value: '', type: 'text' },
                { name: 'Drawing Number', value: '', type: 'text' },
                { name: 'Weight', value: '', type: 'number' },
                { name: 'Base Rate', value: '', type: 'number' }
            ];

        case 'Accessories & Miscellaneous Details':
            return [
                { name: 'Component Name', value: '', type: 'text' },
                { name: 'Specification', value: '', type: 'text' },
                { name: 'Unit', value: '', type: 'text' },
                { name: 'Rate', value: '', type: 'number' }
            ];

        default:
            return [{ name: 'Standard Item Name', value: '', type: 'text' }, { name: 'Rate', value: '', type: 'number' }];
    }
}