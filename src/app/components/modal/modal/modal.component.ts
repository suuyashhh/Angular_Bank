import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent{
 data = {
    applicationType: 'New',
    kycNumber: 'KYC1234567890',
    accountType: 'Normal',
    fullName: 'Prathmesh Kanekar',
    maidenName: '-',
    fatherName: 'Kanekar Ramesh',
    motherName: 'Kanekar Sunita',
    dob: '16-11-1995',
    gender: 'Male',
    pan: 'ABCDE1234F',
    form60: 'No',

    ovdType: 'Aadhaar',
    ovdNumber: 'XXXX-XXXX-1234',
    maskedAadhaar: 'XXXX-XXXX-1234',
    verificationMode: 'e-KYC',

    address1: 'Flat 12, Example Residency',
    address2: 'MG Road',
    address3: 'Pune',
    district: 'Pune',
    pin: '411001',
    state: 'MH',
    country: 'IN',

    isCurrentSame: 'Yes',
    currentDocType: 'N/A',
    currentAddress: 'Same as above',

    mobile: '91-9876543210',
    email: 'prathmesh@example.com',
    telRes: '020-12345678',
    telOff: '020-87654321',

    remarks: 'No remarks',

    // Page 2 fields
    docVerified: 'Certified Copies Received',
    ekycDataReceived: 'Yes',
    videoKyc: 'No',
    empName: 'Employee Name',
    empCode: 'EMP123',
    empDesignation: 'KYC Officer',
    empBranch: 'Pune Branch',
    ipvDone: 'Yes',
    ipvEmpName: 'Verifier Name',
    ipvDate: '16-11-2025',

    // For tables in page3 (abbreviated - you can expand)
    stateCodes: [
      { name: 'Andhra Pradesh', code: 'AP' },
      { name: 'Maharashtra', code: 'MH' },
      { name: 'Karnataka', code: 'KA' },
      { name: 'Delhi', code: 'DL' },
      // add rest...
    ],
    countryCodes: [
      { name: 'India', code: 'IN' },
      { name: 'United States', code: 'US' },
      { name: 'United Kingdom', code: 'GB' },
      { name: 'Australia', code: 'AU' },
      // add rest...
    ],
  };
}
