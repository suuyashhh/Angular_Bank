import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';       // <-- REQUIRED
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { BasicContactInputsComponent } from './basic-contact-inputs/basic-contact-inputs.component';
import { PanFormatDirective } from './directives/pan-format.directive';
import { AadhaarFormatDirective } from './directives/aadhaar-format.directive';
import { GstFormatDirective } from './directives/gst-format.directive';
import { MobileFormatDirective } from './directives/mobile-format.directive';
import { PhoneFormatDirective } from './directives/phone-format.directive';
// import { ValidIndicatorDirective } from './directives/valid-indicator.directive';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,        // <-- FIXES ngClass, ngIf, ngFor, etc.
    FormsModule,
    ReactiveFormsModule
  ],
  exports: [
  ]
})
export class SharedModule {}
