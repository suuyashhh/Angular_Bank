import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class NameValidationService {

  // ---------------------------
  //  AUTO CAPITALIZE FUNCTION
  // ---------------------------
  private capitalizeWords(value: string): string {
    if (!value) return '';

    return value
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ---------------------------
  //  INPUT RESTRICTION SECTION
  // ---------------------------

  /** Personal KYC Name (A–Z, dot, apostrophe, hyphen, spaces) */
  restrictCustomerName(value: string): string {
    if (!value) return '';

    value = value.replace(/[^A-Za-z.'\- ]/g, '');
    value = value.replace(/\s{2,}/g, ' ');
    value = value.replace(/([.'\-])\1+/g, '$1');

    value = value.trimStart();

    // AUTO FORMAT
    value = this.capitalizeWords(value);

    return value;
  }

  /** Company Name (A–Z, digits, & . , - / ( ) ') */
  restrictCompanyName(value: string): string {
    if (!value) return '';

    value = value.replace(/[^A-Za-z0-9&.,()\/'\- ]/g, '');
    value = value.replace(/\s{2,}/g, ' ');
    value = value.replace(/([&.,()\/'\-])\1+/g, '$1');

    value = value.trimStart();

    // AUTO FORMAT
    value = this.capitalizeWords(value);

    return value;
  }

  restrictOnlyText(value: string): string {
    return value.replace(/[^A-Za-z]/g, '');
  }

  restrictOnlyNumber(value: string): string {
    return value.replace(/[^0-9]/g, '');
  }

  restrictAlphaNumeric(value: string): string {
    return value.replace(/[^A-Za-z0-9]/g, '');
  }

  restrictAlphaNumericSpaces(value: string): string {
    return value.replace(/[^A-Za-z0-9 ]/g, '');
  }

  // ---------------------------
  //   VALIDATOR SECTION
  // ---------------------------

  /** Validator - Customer Name (Reactive Forms) */
  validateCustomerName(control: AbstractControl): ValidationErrors | null {
    const value = (control.value || '').trim();

    if (!value) return { required: true };

    if (!/^[A-Za-z][A-Za-z.'\- ]*[A-Za-z]$/.test(value)) {
      return { customerNameInvalid: true };
    }

    return null;
  }

  /** Validator - Company Name */
  validateCompanyName(control: AbstractControl): ValidationErrors | null {
    const value = (control.value || '').trim();

    if (!value) return { required: true };

    if (!/^[A-Za-z0-9&.,()\/'\- ]+$/.test(value)) {
      return { companyNameInvalid: true };
    }

    if (!/[A-Za-z]/.test(value)) {
      return { companyNameInvalid: true };
    }

    return null;
  }
}
