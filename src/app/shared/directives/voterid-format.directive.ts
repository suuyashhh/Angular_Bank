import { Directive, HostListener, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[voteridFormat]',
  standalone: true
})
export class VoterIdFormatDirective {

  constructor(@Self() @Optional() private control: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: any) {
    console.log("Voter");
    
    const input = event.target;
    let value = (input.value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10);

    if (value.length <= 3) {
      value = value.replace(/[^A-Z]/g, '');
    } else {
      value =
        value.substring(0, 3).replace(/[^A-Z]/g, '') +
        value.substring(3).replace(/[^0-9]/g, '');
    }

    this.control?.control?.setValue(value, {
      emitEvent: false,
      emitModelToViewChange: true
    });
  }
}
