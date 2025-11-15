import { Directive, ElementRef, Input, Renderer2, computed, effect } from '@angular/core';
import { ValidationSignal } from '../services/validation-signals.service';

@Directive({
  selector: '[showErrors]',
  standalone: true
})
export class ShowErrorsDirective {
  @Input('showErrors') model!: ValidationSignal;

  private errorEl!: HTMLElement;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    const parent = this.el.nativeElement.parentElement;

    this.errorEl = this.renderer.createElement('small');
    this.renderer.addClass(this.errorEl, 'text-danger');
    this.renderer.setStyle(this.errorEl, 'display', 'none');
    this.renderer.appendChild(parent, this.errorEl);

    effect(() => {
      if (this.model.invalid()) {
        this.renderer.setStyle(this.errorEl, 'display', 'block');
        this.renderer.setProperty(this.errorEl, 'innerHTML', this.getMessage());
      } else {
        this.renderer.setStyle(this.errorEl, 'display', 'none');
      }
    });
  }

  private getMessage(): string {
    switch (this.model['type']) {
      case 'pan': return 'Invalid PAN (ABCDE1234F)';
      case 'aadhaar': return 'Aadhaar must be 12 digits';
      case 'gst': return 'GST must be 15 characters';
      case 'mobile': return 'Start with 6–9 and must be 10 digits';
      case 'phone': return 'Phone must be 10 digits';
      case 'email': return 'Enter a valid email address';
      default: return 'Invalid input';
    }
  }
}
