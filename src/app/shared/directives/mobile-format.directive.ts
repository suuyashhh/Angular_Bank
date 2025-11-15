import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[mobileFormat]',
  standalone: true
})
export class MobileFormatDirective {
  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event.target.value'])
  onInput(value: string) {
    const formatted = value.replace(/[^0-9]/g, '').substring(0, 10);
    this.el.nativeElement.value = formatted;
  }
}
