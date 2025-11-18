import { signal, computed } from '@angular/core';
import { ValidationService } from './validation.service';

export type ValidatorType =
  | 'pan'
  | 'aadhaar'
  | 'gst'
  | 'mobile'
  | 'phone'
  | 'email'
  | 'passport'
  | 'voterid';

export class ValidationSignal {
  value = signal('');
  touched = signal(false);

  constructor(private service: ValidationService, private type: ValidatorType) {}

  valid = computed(() => {
    const v = this.value().trim();
    return this.service.validate(this.type, v);
  });

  invalid = computed(() => this.touched() && !this.valid());
  pristine = computed(() => !this.touched() && !this.value());
}
