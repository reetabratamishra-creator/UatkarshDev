import { LightningElement ,api} from 'lwc';

export default class SchoolFormLWC extends LightningElement {

    @api
     get value() {
        return this._value;
    }
    set value(val) {
        this._value = val;
    }

    connectedCallback() {
        console.log('Connected Callback called');
        console.log('Value in connectedCallback:', this.value);
    }
}