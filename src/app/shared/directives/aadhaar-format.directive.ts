import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[aadhaarFormat]',
  standalone: true
})
export class AadhaarFormatDirective {
  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event.target.value'])
  onInput(value: string) {
    const formatted = value.replace(/[^0-9]/g, '').substring(0, 12);
    this.el.nativeElement.value = formatted;
  }
}
