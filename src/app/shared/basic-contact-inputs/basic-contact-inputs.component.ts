import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';                   // REQUIRED FOR ngClass, ngIf, ngFor
import { FormBuilder, FormGroup, AbstractControl, ReactiveFormsModule } from '@angular/forms';

import { ValidationService } from '../services/validation.service';
import { AsyncValidationService } from '../services/async-validation.service';

// Directives
import { PanFormatDirective } from '../directives/pan-format.directive';
import { AadhaarFormatDirective } from '../directives/aadhaar-format.directive';
import { GstFormatDirective } from '../directives/gst-format.directive';
import { MobileFormatDirective } from '../directives/mobile-format.directive';
import { PhoneFormatDirective } from '../directives/phone-format.directive';
// import { ValidIndicatorDirective } from '../directives/valid-indicator.directive';

import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-basic-contact-inputs',
  standalone: true,                         // <-- STANDALONE MODE ENABLED
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PanFormatDirective,
    AadhaarFormatDirective,
    GstFormatDirective,
    MobileFormatDirective,
    PhoneFormatDirective,
    // ValidIndicatorDirective
  ],
  templateUrl: './basic-contact-inputs.component.html',
  styleUrls: ['./basic-contact-inputs.component.scss']
})
export class BasicContactInputsComponent implements OnInit {

  @Input() accountType: string = '0';
  @Output() formChange = new EventEmitter<FormGroup>();
  @Output() validity = new EventEmitter<boolean>();

  form!: FormGroup;
  shakeField: any = {};

  constructor(
    private fb: FormBuilder,
    public vs: ValidationService,
    private asyncVs: AsyncValidationService
  ) {}

  ngOnInit(): void {
    // this.form = this.fb.group({
    //   phone: ['', [this.vs.phoneValidator.bind(this.vs)]],
    //   mobile: ['', [this.vs.mobileValidator.bind(this.vs)]],
    //   pan: ['', [this.vs.panValidator.bind(this.vs)]],
    //   aadhaar: ['', [this.vs.aadhaarValidator.bind(this.vs)]],
    //   gst: ['', [this.vs.gstValidator.bind(this.vs)]],
    //   email: ['', [this.vs.emailValidator.bind(this.vs)]],
    // });

    this.form.valueChanges.pipe(debounceTime(150)).subscribe(() => {
      this.formChange.emit(this.form);
      this.validity.emit(this.form.valid);
    });
  }

  control(c: string): AbstractControl {
    return this.form.controls[c];
  }

  markAndShakeInvalid() {
    this.form.markAllAsTouched();
    Object.keys(this.form.controls).forEach(key => {
      if (this.control(key).invalid) {
        this.shakeField[key] = true;
        setTimeout(() => this.shakeField[key] = false, 350);
      }
    });
  }

  statusTag(ctrl: string): 'valid' | 'invalid' | 'neutral' {
    const c = this.control(ctrl);
    if (!c.touched && !c.dirty) return 'neutral';
    if (c.valid) return 'valid';
    if (c.invalid) return 'invalid';
    return 'neutral';
  }
}
