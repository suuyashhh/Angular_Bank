import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NameValidationService } from '../services/name-validation.service';

@Directive({
  selector: '[restrict]',
  standalone: true
})
export class InputRestrictionDirective {

  @Input('restrict') type!: string;

  constructor(
    private el: ElementRef,
    private service: NameValidationService
  ) {}

  @HostListener('input', ['$event'])
  onInput(event: any) {
    let value = event.target.value || '';

    switch (this.type) {

      case 'customerName':
        value = this.service.restrictCustomerName(value);
        break;

      case 'companyName':
        value = this.service.restrictCompanyName(value);
        break;

      case 'onlyText':
        value = this.service.restrictOnlyText(value);
        break;

      case 'onlyNumber':
        value = this.service.restrictOnlyNumber(value);
        break;

      case 'alphaNumeric':
        value = this.service.restrictAlphaNumeric(value);
        break;

      case 'alphaNumericSpaces':
        value = this.service.restrictAlphaNumericSpaces(value);
        break;
    }

    event.target.value = value;
  }
}
