import { Directive, HostListener, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[passportFormat]',
  standalone: true
})
export class PassportFormatDirective {

  constructor(@Self() @Optional() private control: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: any) {
    const input = event.target;
    let value = (input.value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 8);

    if (value.length > 0) {
      value = value.replace(/^[0-9]/, ''); // 1st must be letter
    }

    this.control?.control?.setValue(value, {
      emitEvent: false,
      emitModelToViewChange: true
    });
  }
}
