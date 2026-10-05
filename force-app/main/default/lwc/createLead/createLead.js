import { LightningElement,api ,track ,wire} from 'lwc';
import getLeadPicklistValues from '@salesforce/apex/CreateLeadController.getLeadPicklistValues';
import getEligibleOwners from '@salesforce/apex/CreateLeadController.getEligibleOwners';
import USER_ID from '@salesforce/user/Id';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import LEAD_OBJECT from '@salesforce/schema/Lead';
import PRODUCT_CATEGORY_FIELD from '@salesforce/schema/Lead.Product_Category__c';

import NAME_FIELD from '@salesforce/schema/User.Name';
import PROFILE_NAME_FIELD from '@salesforce/schema/User.Profile.Name';
import ROLE_NAME_FIELD from '@salesforce/schema/User.UserRole.Name';
import USER_DEPARTMENT_FIELD from '@salesforce/schema/User.Department';

export default class CreateLead extends LightningElement {

   currentUserId = USER_ID;
    currentUserName = '';
    currentUserProfile;
    currentUserRole;
    currentUserDepartment = ''; 

    @track leadSourceOptions = [];
    @track leadStageOptions = [];
    @track departmentNameOptions = []; 
    @track productCategoryOptions = []; 
    @track customerCategoryOptions = [];
    @track industryOptions = [];
    @track ratingOptions = [];
    @track uomOptions = [];
    @track ownerOptions = []; 
    
    @track uploadedFileIds = []; // Stores Document IDs uploaded on-the-fly

    masterDepartmentOptions = []; 
    masterProductCategoryData;   

    _value;
    @api
    get value() { return this._value; }
    set value(val) { this._value = val; }
 
    firstName        = '';
    lastName         = '';
    companyName      = '';
    phone            = '';
    email            = '';
    leadSource       = '';
    departmentName   = '';
    productCategory  = '';
    customerCategory = '';
    industry         = '';
    rating           = '';
    uom              = '';
    quantity         = '';
    ownerId          = ''; 
    leadStage        = 'Prospect';
    testVariable     = '';

    @wire(getRecord, { recordId: '$currentUserId', fields: [NAME_FIELD, PROFILE_NAME_FIELD, ROLE_NAME_FIELD, USER_DEPARTMENT_FIELD] })
    wiredUser({ error, data }) {
        if (data) {
            this.currentUserName = getFieldValue(data, NAME_FIELD);
            this.currentUserProfile = getFieldValue(data, PROFILE_NAME_FIELD);
            this.currentUserRole = getFieldValue(data, ROLE_NAME_FIELD);
            this.currentUserDepartment = getFieldValue(data, USER_DEPARTMENT_FIELD) || ''; 

            if (!this.testVariable) this.testVariable = this.currentUserName;
            this.filterDepartmentOptions();
        }
    }

    @wire(getLeadPicklistValues, { fieldApiName: 'LeadSource' })
    wiredLeadSourceOptions({ error, data }) { if (data) this.leadSourceOptions = data; }

    @wire(getLeadPicklistValues, { fieldApiName: 'Status' })
    wiredLeadStageOptions({ error, data }) { if (data) this.leadStageOptions = data; }

    @wire(getLeadPicklistValues, { fieldApiName: 'Department_Name__c' })
    wiredDepartmentNameOptions({ error, data }) {
        if (data) {
            this.masterDepartmentOptions = data;
            this.filterDepartmentOptions();
        }
    }

    @wire(getObjectInfo, { objectApiName: LEAD_OBJECT })
    leadObjectInfo;

    @wire(getPicklistValues, { recordTypeId: '$leadObjectInfo.data.defaultRecordTypeId', fieldApiName: PRODUCT_CATEGORY_FIELD })
    wiredProductCategory({ error, data }) {
        if (data) {
            this.masterProductCategoryData = data;
            this.filterProductOptions();
        }
    }

    @wire(getLeadPicklistValues, { fieldApiName: 'Customer_Category__c' })
    wiredCustomerCategoryOptions({ error, data }) { if (data) this.customerCategoryOptions = data; }

    @wire(getLeadPicklistValues, { fieldApiName: 'Industry' })
    wiredIndustryOptions({ error, data }) { if (data) this.industryOptions = data; }

    @wire(getLeadPicklistValues, { fieldApiName: 'Rating' })
    wiredRatingOptions({ error, data }) { if (data) this.ratingOptions = data; }

    @wire(getLeadPicklistValues, { fieldApiName: 'UOM__c' })
    wiredUomOptions({ error, data }) { if (data) this.uomOptions = data; }
    
    connectedCallback() {
        if (this.value) {
            this.firstName        = this.value.firstName        || '';
            this.lastName         = this.value.lastName         || '';
            this.companyName      = this.value.companyName      || '';
            this.phone            = this.value.phone            || '';
            this.email            = this.value.email            || '';
            this.leadSource       = this.value.leadSource       || '';
            this.departmentName   = this.value.departmentName   || '';
            this.productCategory  = this.value.productCategory  || '';
            this.customerCategory = this.value.customerCategory || '';
            this.industry         = this.value.industry         || '';
            this.rating           = this.value.rating           || '';
            this.uom              = this.value.uom              || '';
            this.quantity         = this.value.quantity         || '';
            this.ownerId          = this.value.ownerId          || '';
            this.leadStage        = this.value.leadStage        || 'Prospect';
            this.testVariable     = this.value.testVariable     || '';
            this.uploadedFileIds  = this.value.uploadedFileIds  || [];
            if (this.departmentName) this.fetchEligibleOwners();
        }
    }

    // DYNAMIC CONDITIONAL VISIBILITY GETTER (Based on your exact CASE rules)
    get isFileUploadVisible() {
        if (!this.leadSource) return false;

        // Grouping the matching "REQUIRED" sources from your formula breakdown
        const requiredSources = [
            'FACEBOOK', 'INBOUND EMAIL', 'INBOUND PHONE CALL', 'INDIAMART',
            'PAY PER CLICK ADS', 'WEBSITE', 'WHATSAPP CAMPAIGNING',
            'EMAIL CAMPAIGNING', 'OFFLINE CRM', 'OUTBOUND PHONE CALL', 'TENDER'
        ];

        return requiredSources.includes(this.leadSource.toUpperCase());
    }

    get acceptedFormats() {
        return ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx'];
    }

    // Capture the Document IDs from the on-the-fly component upload process
    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        let currentFiles = [...this.uploadedFileIds];
        
        uploadedFiles.forEach(file => {
            currentFiles.push(file.documentId);
        });
        
        this.uploadedFileIds = currentFiles;
        this.dispatchValueChangeEvent(); // Notify parent container wrapper layout
    }

    filterDepartmentOptions() {
        if (!this.masterDepartmentOptions || this.masterDepartmentOptions.length === 0) {
            this.departmentNameOptions = [];
            return;
        }
        if (this.currentUserProfile === 'System Administrator' || this.currentUserProfile === 'Utkarsh Admin') {
            this.departmentNameOptions = this.masterDepartmentOptions;
            return;
        }
        if (!this.currentUserDepartment) {
            this.departmentNameOptions = []; 
            return;
        }
        const userDeptLower = this.currentUserDepartment.toLowerCase();
        this.departmentNameOptions = this.masterDepartmentOptions.filter(opt => 
            userDeptLower.includes(opt.label.toLowerCase())
        );
    }

    filterProductOptions() {
        if (!this.masterProductCategoryData || !this.departmentName) {
            this.productCategoryOptions = [];
            return;
        }
        const controllerValueIndex = this.masterProductCategoryData.controllerValues[this.departmentName];
        if (controllerValueIndex === undefined) {
            this.productCategoryOptions = [];
            return;
        }
        this.productCategoryOptions = this.masterProductCategoryData.values
            .filter(opt => opt.validFor.includes(controllerValueIndex))
            .map(opt => ({ label: opt.label, value: opt.value }));
    }

    fetchEligibleOwners() {
        getEligibleOwners({ selectedDepartment: this.departmentName, currentUserId: this.currentUserId })
        .then(result => { this.ownerOptions = result; })
        .catch(error => { console.error(error); });
    }

    get isOwnerDisabled() { return !this.departmentName || this.ownerOptions.length === 0; }
 
    handleInputChange(event) {
        event.stopPropagation();
        const { name, value } = event.target;
        this[name] = value;

        if (name === 'departmentName') {
            this.productCategory = '';
            this.ownerId = '';
            this.filterProductOptions();
            this.fetchEligibleOwners();
        }

        this.dispatchValueChangeEvent();
    }

    // Unified dispatch helper to ensure file list is emitted instantly 
    dispatchValueChangeEvent() {
        this.dispatchEvent(
            new CustomEvent('valuechange', {
                detail: {
                    value: {
                        firstName:        this.firstName,
                        lastName:         this.lastName,
                        companyName:      this.companyName,
                        phone:            this.phone,
                        email:            this.email,
                        leadSource:       this.leadSource,
                        departmentName:   this.departmentName,
                        productCategory:  this.productCategory,
                        customerCategory: this.customerCategory,
                        industry:         this.industry,
                        rating:           this.rating,
                        uom:              this.uom,
                        quantity:         this.quantity,
                        ownerId:          this.ownerId,
                        leadStage:        this.leadStage,
                        testVariable:     this.testVariable,
                        uploadedFileIds:  this.uploadedFileIds // Injected into outbound payload string list
                    }
                }
            })
        );
    }
}