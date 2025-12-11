import { Directive, HostListener, Input, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appInputValidator]',
  standalone: true
})
export class InputValidatorDirective {

  @Input('appInputValidator') validationType: string = '';

  constructor(@Optional() private control: NgControl) {}

  @HostListener('input', ['$event']) onInput(event: any) {
    let raw = event.target.value ?? '';
    let value = raw;

    // -----------------------------
    // VALIDATION RULES
    // -----------------------------
    switch (this.validationType) {

      case 'pincode':
        value = value.replace(/[^0-9]/g, '');  // only numbers
        if (value.length > 6) value = value.substring(0, 6);
        break;

      case 'number':
        value = value.replace(/[^0-9]/g, '');
        break;

      case 'name':
        value = value.replace(/[^A-Za-z\s]/g, '');
        break;

      case 'alpha':
        value = value.replace(/[^A-Za-z]/g, '');
        break;

      case 'alphanumeric':
        value = value.replace(/[^A-Za-z0-9]/g, '');
        break;

      case 'company':
        value = value.replace(/[^A-Za-z0-9 .\-&'\/]/g, '');
        break;

      case 'address':
        value = value.replace(/[^A-Za-z0-9 .,#\-\/]/g, '');
        break;

      case 'text':
        value = value.replace(/[^A-Za-z\s]/g, '');
        break;
    }

    // Only uppercase alphabets-based validations
    if (this.validationType !== 'pincode' && this.validationType !== 'number') {
      value = value.toUpperCase();
    }

    // -----------------------------
    // PREVENT INFINITE LOOP
    // -----------------------------
    if (value === raw) return;

    // -----------------------------
    // UPDATE CONTROL SAFELY
    // -----------------------------
    if (this.control?.control) {
      this.control.control.setValue(value, { emitEvent: false });
    } else {
      event.target.value = value;
    }
  }
}
