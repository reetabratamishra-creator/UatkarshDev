import { LightningElement, track } from 'lwc';
import getActiveUsers from '@salesforce/apex/TargetManagementController.getActiveUsers';
import getPublicGroups from '@salesforce/apex/TargetManagementController.getPublicGroups';
import getGroupMembers from '@salesforce/apex/TargetManagementController.getGroupMembers';
import getWeekDates from '@salesforce/apex/TargetManagementController.getWeekDates';
import saveTarget from '@salesforce/apex/TargetManagementController.saveTarget';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TargetWizard extends LightningElement {
    // ──── Step tracking ────
    @track currentStep = 1;

    // ──── Step 1 fields ────
    @track targetName = '';
    @track targetModule = '';
    @track frequency = '';
    @track metric = '';
    @track assignToType = '';

    // ──── Step 2 fields ────
    @track allUsers = [];
    @track allGroups = [];
    @track selectedItemsMap = {};
    @track searchTerm = '';
    @track selectedTeamFilter = 'all';

    // ──── Step 3 fields ────
    @track weekColumnsData = [];
    @track targetValues = {}; // { 'userId_weekDate': value }
    @track isSaving = false;

    // ──── Picklist Options ────
    get moduleOptions() {
        return [{ label: 'Task', value: 'Task' }];
    }

    get frequencyOptions() {
        return [
            { label: 'Daily', value: 'Daily' },
            { label: 'Weekly', value: 'Weekly' },
            { label: 'Monthly', value: 'Monthly' },
            { label: 'Quarterly', value: 'Quarterly' }
        ];
    }

    get metricOptions() {
        return [{ label: 'Number of task completed', value: 'Number of task completed' }];
    }

    get assignToOptions() {
        return [
            { label: 'Team', value: 'Team' },
            { label: 'Users', value: 'Users' }
        ];
    }

    get teamFilterOptions() {
        return [{ label: 'All Teams', value: 'all' }];
    }

    // ──── Step Indicators ────
    get isStep1() { return this.currentStep === 1; }
    get isStep2() { return this.currentStep === 2; }
    get isStep3() { return this.currentStep === 3; }

    get step1Completed() { return this.currentStep > 1; }
    get step2Completed() { return this.currentStep > 2; }

    get step1IconClass() {
        return this.currentStep > 1 ? 'tw-step-icon tw-step-completed' :
               this.currentStep === 1 ? 'tw-step-icon tw-step-active' : 'tw-step-icon';
    }
    get step2IconClass() {
        return this.currentStep > 2 ? 'tw-step-icon tw-step-completed' :
               this.currentStep === 2 ? 'tw-step-icon tw-step-active' : 'tw-step-icon';
    }
    get step3IconClass() {
        return this.currentStep === 3 ? 'tw-step-icon tw-step-active' : 'tw-step-icon';
    }

    get step1LabelClass() {
        return this.currentStep >= 1 ? 'tw-step-label tw-step-label-active' : 'tw-step-label';
    }
    get step2LabelClass() {
        return this.currentStep >= 2 ? 'tw-step-label tw-step-label-active' : 'tw-step-label';
    }
    get step3LabelClass() {
        return this.currentStep >= 3 ? 'tw-step-label tw-step-label-active' : 'tw-step-label';
    }

    get line1Class() {
        return this.currentStep > 1 ? 'tw-line tw-line-active' : 'tw-line';
    }
    get line2Class() {
        return this.currentStep > 2 ? 'tw-line tw-line-active' : 'tw-line';
    }

    // ──── Step 1 Validation ────
    get isNextDisabledStep1() {
        return !this.targetName || !this.targetModule || !this.frequency || !this.metric || !this.assignToType;
    }

    // ──── Step 2 computed ────
    get isUserAssignment() {
        return this.assignToType === 'Users';
    }

    get isTeamAssignment() {
        return this.assignToType === 'Team';
    }

    get step2LeftTitle() {
        return this.isUserAssignment ? 'Employees' : 'Teams';
    }

    get step2RightLabel() {
        return this.isUserAssignment ? 'Employees' : 'Employees';
    }

    get selectedItems() {
        return Object.values(this.selectedItemsMap);
    }

    get selectedCount() {
        return this.selectedItems.length;
    }

    get noSelectedItems() {
        return this.selectedCount === 0;
    }

    get isNextDisabledStep2() {
        return this.selectedCount === 0;
    }

    get filteredAvailableItems() {
        let items;
        if (this.isTeamAssignment) {
            // Show groups
            items = this.allGroups.map(g => ({
                id: g.groupId,
                displayName: g.name,
                groupName: '',
                isGroup: true
            }));
        } else {
            // Show users
            items = this.allUsers
                .filter(u => !this.selectedItemsMap[u.userId])
                .map(u => ({
                    id: u.userId,
                    displayName: u.name + (u.employeeNumber ? ' (' + u.employeeNumber + ')' : ''),
                    groupName: u.groupName || '',
                    isGroup: false
                }));
        }

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            items = items.filter(i => i.displayName.toLowerCase().includes(term));
        }

        return items;
    }

    get noAvailableItems() {
        return this.filteredAvailableItems.length === 0;
    }

    // ──── Step 3 computed ────
    get weekColumns() {
        return this.weekColumnsData.map(w => ({
            ...w,
            key: w.weekStartDate,
            headerClass: w.type === 'current' ? 'tw-s3-th-sub tw-s3-th-current' :
                          w.type === 'past' ? 'tw-s3-th-sub tw-s3-th-past' : 'tw-s3-th-sub tw-s3-th-future'
        }));
    }

    get weekColumnsCount() {
        return this.weekColumnsData.length;
    }

    get assignmentRows() {
        return this.selectedItems.map(item => {
            const weeks = this.weekColumnsData.map(w => {
                const key = item.id + '_' + w.weekStartDate;
                const targetVal = this.targetValues[key] || 0;
                const achievedVal = 0; // No existing data for new targets
                const isPast = w.type === 'past';
                const percentage = targetVal > 0 ? Math.min((achievedVal / targetVal) * 100, 100) : 0;

                let progressBarClass = 'tw-progress-bar';
                if (percentage >= 80) {
                    progressBarClass += ' tw-progress-green';
                } else if (percentage >= 40) {
                    progressBarClass += ' tw-progress-orange';
                } else {
                    progressBarClass += ' tw-progress-red';
                }

                return {
                    key: w.weekStartDate,
                    weekStartDate: w.weekStartDate,
                    label: w.label,
                    type: w.type,
                    isPast: isPast,
                    targetValue: targetVal,
                    achievedValue: achievedVal,
                    progressStyle: 'width: ' + percentage + '%',
                    progressBarClass: progressBarClass
                };
            });

            return {
                userId: item.id,
                userName: item.displayName,
                groupName: item.groupName || '',
                weeks: weeks
            };
        });
    }

    // ──── Lifecycle ────
    async connectedCallback() {
        await this.loadInitialData();
    }

    async loadInitialData() {
        try {
            const [users, groups, weeks] = await Promise.all([
                getActiveUsers(),
                getPublicGroups(),
                getWeekDates()
            ]);
            this.allUsers = users || [];
            this.allGroups = groups || [];
            this.weekColumnsData = weeks || [];
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    // ──── Step 1 Handlers ────
    handleTargetNameChange(event) { this.targetName = event.target.value; }
    handleModuleChange(event) { this.targetModule = event.detail.value; }
    handleFrequencyChange(event) { this.frequency = event.detail.value; }
    handleMetricChange(event) { this.metric = event.detail.value; }
    handleAssignToChange(event) {
        this.assignToType = event.detail.value;
        // Reset selections when switching
        this.selectedItemsMap = {};
    }

    // ──── Step 2 Handlers ────
    handleSearchChange(event) {
        this.searchTerm = event.target.value;
    }

    handleTeamFilterChange(event) {
        this.selectedTeamFilter = event.detail.value;
    }

    async handleSelectItem(event) {
        const itemId = event.currentTarget.dataset.id;

        if (this.isTeamAssignment) {
            // When selecting a team/group, fetch all its members and add them
            try {
                const members = await getGroupMembers({ groupId: itemId });
                const updatedMap = { ...this.selectedItemsMap };
                for (const member of members) {
                    if (!updatedMap[member.userId]) {
                        updatedMap[member.userId] = {
                            id: member.userId,
                            displayName: member.name + (member.employeeNumber ? ' (' + member.employeeNumber + ')' : ''),
                            groupName: member.groupName || ''
                        };
                    }
                }
                this.selectedItemsMap = updatedMap;
            } catch (error) {
                console.error('Error fetching group members:', error);
                this.showToast('Error', 'Failed to load group members', 'error');
            }
        } else {
            // Direct user selection
            const item = this.filteredAvailableItems.find(i => i.id === itemId);
            if (item && !this.selectedItemsMap[itemId]) {
                this.selectedItemsMap = {
                    ...this.selectedItemsMap,
                    [itemId]: { ...item }
                };
            }
        }
    }

    handleSelectAll() {
        if (this.isTeamAssignment) {
            // Select all groups - need to fetch members for each
            this.showToast('Info', 'Please select individual teams', 'info');
            return;
        }

        const updatedMap = { ...this.selectedItemsMap };
        for (const item of this.filteredAvailableItems) {
            if (!updatedMap[item.id]) {
                updatedMap[item.id] = { ...item };
            }
        }
        this.selectedItemsMap = updatedMap;
    }

    handleRemoveItem(event) {
        const itemId = event.currentTarget.dataset.id;
        const updatedMap = { ...this.selectedItemsMap };
        delete updatedMap[itemId];
        this.selectedItemsMap = updatedMap;
    }

    // ──── Step 3 Handlers ────
    handleTargetValueChange(event) {
        const userId = event.currentTarget.dataset.userid;
        const weekDate = event.currentTarget.dataset.weekdate;
        const value = event.target.value;
        const key = userId + '_' + weekDate;
        this.targetValues = { ...this.targetValues, [key]: parseInt(value, 10) || 0 };
    }

    handleRemoveFromAssignment(event) {
        const userId = event.currentTarget.dataset.id;
        const updatedMap = { ...this.selectedItemsMap };
        delete updatedMap[userId];
        this.selectedItemsMap = updatedMap;
    }

    // ──── Navigation ────
    handleNext() {
        if (this.currentStep === 1) {
            if (this.isNextDisabledStep1) {
                this.showToast('Error', 'Please fill all required fields', 'error');
                return;
            }
            this.currentStep = 2;
        } else if (this.currentStep === 2) {
            if (this.selectedCount === 0) {
                this.showToast('Error', 'Please select at least one employee', 'error');
                return;
            }
            // Initialize default target values for current and future weeks
            this.initializeTargetValues();
            this.currentStep = 3;
        }
    }

    handlePrevious() {
        if (this.currentStep > 1) {
            this.currentStep -= 1;
        }
    }

    initializeTargetValues() {
        const updatedValues = { ...this.targetValues };
        for (const item of this.selectedItems) {
            for (const week of this.weekColumnsData) {
                const key = item.id + '_' + week.weekStartDate;
                if (updatedValues[key] === undefined && week.type !== 'past') {
                    updatedValues[key] = 0;
                }
            }
        }
        this.targetValues = updatedValues;
    }

    // ──── Save ────
    async handleFinish() {
        this.isSaving = true;
        try {
            // Build assignments
            const assignments = this.selectedItems.map(item => ({
                userId: item.id,
                groupName: item.groupName || ''
            }));

            // Build tracking records (only current + future weeks)
            const trackings = [];
            for (const item of this.selectedItems) {
                for (const week of this.weekColumnsData) {
                    if (week.type !== 'past') {
                        const key = item.id + '_' + week.weekStartDate;
                        trackings.push({
                            userId: item.id,
                            weekStartDate: week.weekStartDate,
                            targetValue: this.targetValues[key] || 0
                        });
                    }
                }
            }

            const payload = {
                targetName: this.targetName,
                targetModule: this.targetModule,
                frequency: this.frequency,
                metric: this.metric,
                assignToType: this.assignToType,
                assignments: assignments,
                trackings: trackings
            };

            await saveTarget({ targetJSON: JSON.stringify(payload) });
            this.dispatchEvent(new CustomEvent('save'));
        } catch (error) {
            console.error('Error saving target:', error);
            this.showToast('Error', 'Failed to save target: ' + (error.body ? error.body.message : error.message), 'error');
        } finally {
            this.isSaving = false;
        }
    }

    // ──── Utilities ────
    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
