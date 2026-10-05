export function getCrashBarrierFields(subSpecification) {
    switch(subSpecification) {
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
                { name: 'Weight Metric', value: '', type: 'number' },
                { name: 'Base Rate', value: '', type: 'number' }
            ];
        default:
            return [
                { name: 'Component Name', value: '', type: 'text' },
                { name: 'Specification Value', value: '', type: 'text' },
                { name: 'Rate', value: '', type: 'number' }
            ];
    }
}