import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[panFormat]',
  standalone: true
})
export class PanFormatDirective {
  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event.target.value'])
  onInput(value: string) {
    const formatted = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10);

    this.el.nativeElement.value = formatted;
  }
}