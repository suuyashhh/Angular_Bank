import { Directive, ElementRef, Input, Renderer2, OnInit, OnDestroy } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[showFieldError]',
  standalone: true
})
export class ShowFieldErrorDirective implements OnInit, OnDestroy {

  @Input() messages: Record<string, string> = {};
  private errorElement: HTMLElement | null = null;

  constructor(
    private control: NgControl,
    private el: ElementRef<HTMLInputElement | HTMLSelectElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    // Subscribe to status and value changes
    this.control?.statusChanges?.subscribe(() => this.update());
    this.control?.valueChanges?.subscribe(() => this.update());
    
    // Initial update
    setTimeout(() => this.update());
  }

  private update() {
    const input = this.el.nativeElement;
    const formGroup = input.closest('.form-group');
    
    if (!formGroup) {
      console.warn('Form group not found for error display');
      return;
    }

    // Remove existing error element if we created it
    if (this.errorElement && this.errorElement.parentNode === formGroup) {
      this.renderer.removeChild(formGroup, this.errorElement);
      this.errorElement = null;
    }

    // Remove error classes from input
    input.classList.remove('input-error', 'shake-anim');
    
    const ctrl = this.control.control;
    if (!ctrl) return;

    if (ctrl.invalid && (ctrl.touched || ctrl.dirty)) {
      // Add error styling to input
      input.classList.add('input-error', 'shake-anim');
      
      // Get the error message
      const key = Object.keys(ctrl.errors || {})[0];
      const errorMessage = this.messages[key] || 'Invalid field';
      
      // Create error element
      this.errorElement = this.renderer.createElement('small');
      this.renderer.addClass(this.errorElement, 'text-danger');
      this.renderer.addClass(this.errorElement, 'mt-1');
      this.renderer.addClass(this.errorElement, 'block');
      this.renderer.addClass(this.errorElement, 'pl-1');
      this.renderer.addClass(this.errorElement, 'text-sm');
      this.renderer.appendChild(this.errorElement, this.renderer.createText(errorMessage));
      
      // Append to form-group (after the form-floating div)
      this.renderer.appendChild(formGroup, this.errorElement);
    }
  }

  ngOnDestroy() {
    // Clean up error element on destroy
    if (this.errorElement && this.errorElement.parentNode) {
      this.renderer.removeChild(this.errorElement.parentNode, this.errorElement);
    }
  }
}