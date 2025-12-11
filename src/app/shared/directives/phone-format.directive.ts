import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[phoneFormat]',
  standalone: true
})
export class PhoneFormatDirective {
  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event.target.value'])
  onInput(value: string) {
    const formatted = value.replace(/[^0-9]/g, '').substring(0, 15);
    this.el.nativeElement.value = formatted;
  }
}
