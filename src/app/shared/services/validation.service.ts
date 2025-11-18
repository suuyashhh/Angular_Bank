import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ValidationService {

  private panRegex = new RegExp('^[A-Z]{5}[0-9]{4}[A-Z]$');
  private aadhaarRegex = new RegExp('^[0-9]{12}$');
  private gstRegex = new RegExp('^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$');
  private mobileRegex = new RegExp('^[6-9][0-9]{9}$');
  private phoneRegex = new RegExp('^[0-9]{10}$');
  private emailRegex = new RegExp('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[A-Za-z]{2,}$');

  // NEW ↓↓↓
  private passportRegex = new RegExp('^[A-PR-WYa-pr-wy][0-9]{7}$');
  private voterIdRegex = new RegExp('^[A-Z]{3}[0-9]{7}$');

  validate(type: string, value: string): boolean {
    if (!value) return false;

    switch (type) {
      case 'pan': return this.panRegex.test(value);
      case 'aadhaar': return this.aadhaarRegex.test(value);
      case 'gst': return this.gstRegex.test(value);
      case 'mobile': return this.mobileRegex.test(value);
      case 'phone': return this.phoneRegex.test(value);
      case 'email': return this.emailRegex.test(value);

      // NEW ↓↓↓
      case 'passport': return this.passportRegex.test(value);
      case 'voterid': return this.voterIdRegex.test(value);

      default: return false;
    }
  }
}

export type ValidatorType =
  | 'pan'
  | 'aadhaar'
  | 'gst'
  | 'mobile'
  | 'phone'
  | 'email'
  | 'passport'
  | 'voterid';
