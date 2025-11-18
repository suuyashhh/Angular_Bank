import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[gstFormat]',
  standalone: true
})
export class GstFormatDirective {
  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event.target.value'])
  onInput(value: string) {
    const formatted = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 15);

    this.el.nativeElement.value = formatted;
  }
}
