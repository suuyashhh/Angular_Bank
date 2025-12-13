import { Directive, ElementRef, Input, Renderer2, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[requiredStar]',
  standalone: true
})
export class RequiredStarDirective implements OnInit, OnChanges {

  @Input() requiredStar: string = 'N';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.addRequiredStar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['requiredStar']) {
      // Remove existing star if any
      this.removeExistingStar();
      
      // Add new star if needed
      this.addRequiredStar();
    }
  }

  private removeExistingStar() {
    const formFloating = this.el.nativeElement.querySelector('.form-floating-outline');
    if (!formFloating) return;
    
    const label = formFloating.querySelector('label');
    if (!label) return;
    
    const existingStar = label.querySelector('.req-star');
    if (existingStar) {
      this.renderer.removeChild(label, existingStar);
    }
  }

  private addRequiredStar() {
    if (this.requiredStar !== 'Y') return;

    const formFloating = this.el.nativeElement.querySelector('.form-floating-outline');
    if (!formFloating) {
      // Try again after a delay if element not found
      setTimeout(() => this.addRequiredStar(), 100);
      return;
    }

    const label = formFloating.querySelector('label');
    if (!label) return;

    // Check if star already exists
    if (label.querySelector('.req-star')) return;

    // Create and add the star
    const star = this.renderer.createElement('span');
    this.renderer.addClass(star, 'req-star');
    this.renderer.setStyle(star, 'margin-left', '2px');
    this.renderer.setStyle(star, 'color', '#ef4444'); // red-500
    this.renderer.appendChild(star, this.renderer.createText('*'));
    
    this.renderer.appendChild(label, star);
  }
}