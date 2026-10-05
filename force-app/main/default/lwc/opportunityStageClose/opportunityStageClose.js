import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import OPPORTUNITY_OBJECT from '@salesforce/schema/Opportunity';
import PO_REQUIREMENT_FIELD from '@salesforce/schema/Opportunity.Refer_to_Dealer_PO_upload__c';
import getContext from '@salesforce/apex/OpportunityStageCloseController.getContext';
import executeClose from '@salesforce/apex/OpportunityStageCloseController.executeClose';

const LOST = 'Closed Lost';
const WON = 'Closed Won';
const DIRECT = 'Direct Business';
const DEALER = 'Refer to Dealer';
const NURTURE = 'Nurture';
const NEGOTIATION = 'Negotiation';
const PO_REQUIRED = 'PO is required';

const NURTURE_LOSS_REASONS = [
    'Customer details not received',
    'Not responding',
    'Purchased from Other Brands',
    'Internal Problem',
    'Future Prospect',
    'Price Enquiry',
    'Existing Customer',
    'Out of Service Area',
    'Minimum Quantity not met'
];

const NEGOTIATION_LOSS_REASONS = [
    'Not responding',
    'Purchased from Other Brands',
    'Internal Problem',
    'Future Prospect',
    'Rate Issue',
    'Tender lost'
];

export default class OpportunityStageClose extends LightningElement {
   
    _recordId;

    context;
    isLoading = true;
    isSaving = false;
    loaded = false;
    errorMessage;
    showSuccessScreen = false;
    showFaultScreen = false;

    outcome;
    expectedDealValue;
    lossReason;
    remarks;
    poUploadRequirement = PO_REQUIRED;
    uploadedDocumentIds = [];
    uploadedFileNames = [];
    poError;
    resultMessage;

    poPicklistValues = [];
    objectInfo;


@api
get recordId() {
    return this._recordId;
}

set recordId(value) {
    this._recordId = value;

    if (value && !this.loaded) {
        this.loadContext();
    }

    console.log('Opportunity recordId received:', value);
}

    @api
    invoke() {
        this.loadContext();
    }

    @wire(getObjectInfo, { objectApiName: OPPORTUNITY_OBJECT })
    wiredObjectInfo({ data, error }) {
        if (data) {
            this.objectInfo = data;
        } else if (error) {
            this.poPicklistValues = [];
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$defaultRecordTypeId',
        fieldApiName: PO_REQUIREMENT_FIELD
    })
    wiredPoPicklist({ data, error }) {
        if (data) {
            this.poPicklistValues = data.values || [];
            if (!this.poUploadRequirement && this.poPicklistValues.length) {
                const requiredValue = this.poPicklistValues.find(v => v.value === PO_REQUIRED);
                this.poUploadRequirement = requiredValue ? requiredValue.value : this.poPicklistValues[0].value;
            }
        } else if (error) {
            this.poPicklistValues = [];
        }
    }

    get defaultRecordTypeId() {
        return this.objectInfo?.defaultRecordTypeId;
    }

    get opportunityName() {
        return this.context?.opportunityName || '';
    }

    get stageName() {
        return this.context?.stageName || '';
    }

    get customerJourney() {
        return this.context?.customerJourney || '';
    }

    get amount() {
        return this.context?.amount ?? null;
    }

    get isCustomerJourneyValid() {
        return this.context?.validCustomerJourney === true;
    }

    get validationScreen() {
        return !this.isLoading && !this.isSaving && !this.isCustomerJourneyValid;
    }

    get normalScreen() {
        return !this.validationScreen && !this.showSuccessScreen && !this.showFaultScreen;
    }

    get showDirectBusiness() {
        return this.customerJourney === DIRECT;
    }

    get showDealerBusiness() {
        return this.customerJourney === DEALER;
    }

    get showNurtureSection() {
        return this.showDirectBusiness && this.stageName === NURTURE;
    }

    get showNegotiationSection() {
        return this.showDirectBusiness && this.stageName === NEGOTIATION;
    }

    get showOtherDirectBusinessSection() {
        return this.showDirectBusiness && ![NURTURE, NEGOTIATION].includes(this.stageName);
    }

    get showOutcome() {
        return this.showDealerBusiness || this.showNegotiationSection || this.showNurtureSection;
    }

    get outcomeOptions() {
        if (this.showNurtureSection) {
            return [{ label: LOST, value: LOST }];
        }
        return [
            { label: LOST, value: LOST },
            { label: WON, value: WON }
        ];
    }

    get isLost() {
        return this.outcome === LOST;
    }

    get isWon() {
        return this.outcome === WON;
    }

    get showExpectedDealValue() {
        return this.isWon && !this.showOtherDirectBusinessSection;
    }

    get showLostReason() {
        return this.isLost && !this.showOtherDirectBusinessSection;
    }

    get lossReasonOptions() {
        const values = this.showNurtureSection ? NURTURE_LOSS_REASONS : NEGOTIATION_LOSS_REASONS;
        return values.map(value => ({ label: value, value }));
    }

    get showRemarks() {
        return this.isLost && !this.showOtherDirectBusinessSection;
    }

    get showPoRequirement() {
        // Direct Business / Negotiation and Refer to Dealer / Won both expose the Flow's PO field.
        return this.isWon && (this.showNegotiationSection || this.showDealerBusiness);
    }

    get showPoUpload() {
        return this.showPoRequirement && this.poUploadRequirement === PO_REQUIRED;
    }

    get showPoWarning() {
        return this.showPoUpload;
    }

    get warningVisible() {
        if (!this.context || !this.isCustomerJourneyValid) {
            return false;
        }

        const hasActivities = this.context.hasOpenTasks || this.context.hasFutureEvents;
        if (!hasActivities) {
            return false;
        }

        // Exact screen visibility behavior from the Flow:
        // Direct Business: warning only for Nurture Closed Lost or Negotiation outcome.
        if (this.showDirectBusiness) {
            if (this.stageName === NURTURE) {
                return this.outcome === LOST;
            }
            if (this.stageName === NEGOTIATION) {
                return !!this.outcome;
            }
            return false;
        }

        // Refer to Dealer: warning whenever there are open tasks/future events.
        return this.showDealerBusiness;
    }

    get warningText() {
        return 'You have Open Task or Future Events. By closing this Opportunity, all will be completed.';
    }

    get fileNameText() {
        return this.uploadedFileNames.join(', ');
    }

    get canSubmit() {
        return !this.isLoading && !this.isSaving && this.isCustomerJourneyValid;
    }

    get isSubmitDisabled() {
    return !this.canSubmit;
}

    get successMessage() {
        return this.resultMessage || '';
    }

    get successHasOrderOrQuote() {
        return false;
    }


    async loadContext() {
        if (!this.recordId || this.loaded) {
            return;
        }

        this.isLoading = true;
        this.errorMessage = undefined;
        try {
            this.context = await getContext({ recordId: this.recordId });
            this.expectedDealValue = this.context.amount;
            this.loaded = true;
        } catch (error) {
            this.errorMessage = this.normalizeError(error);
        } finally {
            this.isLoading = false;
        }

        console.log('Calling Apex getContext with:', this.recordId);
    }

    handleOutcomeChange(event) {
        this.outcome = event.detail.value;
        this.lossReason = undefined;
        this.remarks = undefined;
        this.expectedDealValue = this.isWon ? this.context?.amount : undefined;
        this.poError = undefined;
        this.uploadedDocumentIds = [];
        this.uploadedFileNames = [];

        if (this.showNurtureSection) {
            this.outcome = LOST;
        }
    }

    handleExpectedDealValueChange(event) {
        this.expectedDealValue = event.detail.value === '' ? null : Number(event.detail.value);
    }

    handleLossReasonChange(event) {
        this.lossReason = event.detail.value;
    }

    handleRemarksChange(event) {
        this.remarks = event.detail.value;
    }

    handlePoRequirementChange(event) {
        this.poUploadRequirement = event.detail.value;
        this.poError = undefined;
        this.uploadedDocumentIds = [];
        this.uploadedFileNames = [];
    }

    handleUploadFinished(event) {
        const files = event.detail.files || [];
        this.uploadedDocumentIds = files.map(file => file.documentId).filter(Boolean);
        this.uploadedFileNames = files.map(file => file.name).filter(Boolean);
        this.poError = undefined;
    }

    validateForm() {
        if (!this.isCustomerJourneyValid) {
            return this.context.validationMessage;
        }

        if (this.showOtherDirectBusinessSection) {
            // Flow's default decision path: no Opportunity stage update, cleanup still executes.
            return null;
        }

        if (!this.outcome) {
            return 'Please select an outcome.';
        }

        if (this.isLost) {
            if (!this.lossReason) {
                return 'Lost Reason is required.';
            }
            if (!this.remarks || !this.remarks.trim()) {
                return 'Remarks is required.';
            }
            return null;
        }

        if (this.isWon) {
            if (this.expectedDealValue === null || this.expectedDealValue === undefined || this.expectedDealValue === '') {
                return 'Expected Deal Value is required.';
            }

            if (this.showPoUpload && this.uploadedDocumentIds.length === 0) {
                return 'PO is required to proceed.';
            }
        }

        return null;
    }

    async handleSubmit() {
        const validationMessage = this.validateForm();
        if (validationMessage) {
            this.showToast('Validation Error', validationMessage, 'error');
            return;
        }

        this.isSaving = true;
        this.errorMessage = undefined;

        try {
            const result = await executeClose({
                recordId: this.recordId,
                outcome: this.showOtherDirectBusinessSection ? null : this.outcome,
                expectedDealValue: this.expectedDealValue,
                lostReason: this.lossReason,
                remarks: this.remarks,
                poUploadRequirement: this.showPoRequirement ? this.poUploadRequirement : null,
                contentDocumentIds: this.uploadedDocumentIds
            });

            this.resultMessage = result.message;
            this.showSuccessScreen = true;
            this.showFaultScreen = false;
            this.showToast('Success', result.message, 'success');
        } catch (error) {
            this.errorMessage = this.normalizeError(error);
            this.showFaultScreen = true;
            this.showSuccessScreen = false;
            this.showToast('Error', this.errorMessage, 'error');
        } finally {
            this.isSaving = false;
        }
    }

    handleCancel() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    handleFinish() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    normalizeError(error) {
        if (Array.isArray(error?.body)) {
            return error.body.map(item => item.message).join(', ');
        }
        if (error?.body?.message) {
            return error.body.message;
        }
        return error?.message || 'An unexpected error occurred.';
    }
}