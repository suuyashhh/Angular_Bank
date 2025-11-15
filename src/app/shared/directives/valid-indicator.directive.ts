import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2
} from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ValidationService } from '../services/validation.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Directive({
  selector: '[validatedInput]',
  standalone: true
})
export class ValidatedInputDirective {
  @Input('validatedInput') type!: string;

  private validator = new ValidationService();
  private api = new ApiService(this.http, this.auth);

  private iconEl: HTMLElement | null = null;
  private loaderEl: HTMLElement | null = null;

  private serverValid: boolean | null = null; // null=no API result yet

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getParent(): HTMLElement {
    return this.el.nativeElement.parentElement as HTMLElement;
  }

  // ---------------------------- INPUT EVENT -----------------------------
  @HostListener('input', ['$event.target.value'])
  onInput(value: string) {
    value = value.trim();

    this.serverValid = null; // reset API override
    this.updateUI(value);

    // Auto call API ONLY when Aadhaar fully typed
    if (this.type === 'aadhaar' && value.length === 12 && this.validator.validate('aadhaar', value)) {
      this.callAadhaarApi(value);
    }
  }

  // ---------------------------- BLUR EVENT ------------------------------
  @HostListener('blur', ['$event.target.value'])
  onBlur(value: string) {
    value = value.trim();

    // shake only if invalid & no server-positive
    if (!this.validator.validate(this.type, value) && this.serverValid !== true) {
      this.shake(this.el.nativeElement);
    }

    // no API call on blur
  }

  // ---------------------------- UI UPDATE ------------------------------
  private updateUI(value: string) {
    const input = this.el.nativeElement as HTMLElement;
    const parent = this.getParent();

    // 1. API result overrides everything
    if (this.serverValid === false) {
      this.invalidExistsUI(input, parent);
      return;
    }

    if (this.serverValid === true) {
      this.validUI(input, parent);
      return;
    }

    // 2. No API yet → local regex validation
    const isValidLocal = this.validator.validate(this.type, value);

    if (!value) {
      this.resetUI(input, parent);
      return;
    }

    if (isValidLocal) {
      this.validUI(input, parent);
    } else {
      this.invalidUI(input, parent);
    }
  }

  // --------------------------- SERVER (API) CALL -----------------------
  private callAadhaarApi(value: string) {
    const input = this.el.nativeElement as HTMLElement;
    const parent = this.getParent();

    this.showLoader(parent);

    const endpoint = `ValidationService/AadharNo`;
    const params = { aadharNo: value };

    this.api.get(endpoint, params).subscribe({
      next: (res: any) => {
        this.hideLoader(parent);

        const exists = !!res?.exist;

        if (exists) {
          this.serverValid = false;
          this.invalidExistsUI(input, parent);
          this.shake(input);
        } else {
          this.serverValid = true;
          this.validUI(input, parent);
        }

        this.updateUI(value); // ★ refresh UI after API
      },
      error: () => {
        this.hideLoader(parent);
        this.serverValid = false;
        this.invalidExistsUI(input, parent);
        this.shake(input);
        this.updateUI(value);
      }
    });
  }

  // ---------------------------- UI STATES -------------------------------
  private validUI(input: HTMLElement, parent: HTMLElement) {
    this.setBorder(input, '#06d6a0');
    this.setLabelColor(parent, '#06d6a0');
    this.setIcon(parent, '✔', '#06d6a0');
  }

  private invalidUI(input: HTMLElement, parent: HTMLElement) {
    this.setBorder(input, '#e63946');
    this.setLabelColor(parent, '#e63946');
    this.setIcon(parent, '✖', '#e63946');
  }

  private invalidExistsUI(input: HTMLElement, parent: HTMLElement) {
    this.setBorder(input, '#e63946');
    this.setLabelColor(parent, '#e63946');
    this.setIcon(parent, '⚠', '#e63946'); // yellow warning symbol
  }

  private resetUI(input: HTMLElement, parent: HTMLElement) {
    this.renderer.removeStyle(input, 'border-color');
    this.renderer.removeStyle(input, 'box-shadow');
    this.setLabelColor(parent, null);
    this.removeIcon(parent);
  }

  // -------------------------- HELPERS ---------------------------------
  private setBorder(input: HTMLElement, color: string) {
    this.renderer.setStyle(input, 'border-color', color);
    this.renderer.setStyle(input, 'box-shadow', `0 0 6px ${color}55`);
    this.renderer.setStyle(input, 'transition', 'all 0.25s ease');
  }

  private setLabelColor(parent: HTMLElement, color: string | null) {
    const label = parent.querySelector('label');
    if (!label) return;

    if (color) this.renderer.setStyle(label, 'color', color);
    else this.renderer.removeStyle(label, 'color');
  }

  private setIcon(parent: HTMLElement, symbol: string, color: string) {
    this.removeIcon(parent);

    this.iconEl = this.renderer.createElement('span');

    this.renderer.setStyle(this.iconEl, 'position', 'absolute');
    this.renderer.setStyle(this.iconEl, 'right', '14px');
    this.renderer.setStyle(this.iconEl, 'top', '50%');
    this.renderer.setStyle(this.iconEl, 'transform', 'translateY(-50%)');
    this.renderer.setStyle(this.iconEl, 'font-size', '18px');
    this.renderer.setStyle(this.iconEl, 'color', color);
    this.renderer.setProperty(this.iconEl, 'innerHTML', symbol);

    parent.appendChild(this.iconEl!);
  }

  private removeIcon(parent: HTMLElement) {
    if (this.iconEl) {
      parent.removeChild(this.iconEl);
      this.iconEl = null;
    }
  }

  // -------------------------- LOADER ----------------------------------
  private showLoader(parent: HTMLElement) {
    this.removeLoader();
    this.removeIcon(parent);

    this.loaderEl = this.renderer.createElement('div');

    this.renderer.setStyle(this.loaderEl, 'position', 'absolute');
    this.renderer.setStyle(this.loaderEl, 'right', '14px');
    this.renderer.setStyle(this.loaderEl, 'top', '50%');
    this.renderer.setStyle(this.loaderEl, 'transform', 'translateY(-50%)');
    this.renderer.setStyle(this.loaderEl, 'width', '18px');
    this.renderer.setStyle(this.loaderEl, 'height', '18px');
    this.renderer.setStyle(this.loaderEl, 'border', '3px solid #CCC');
    this.renderer.setStyle(this.loaderEl, 'border-top-color', 'transparent');
    this.renderer.setStyle(this.loaderEl, 'border-radius', '50%');
    this.renderer.setStyle(this.loaderEl, 'animation', 'spin 0.6s linear infinite');

    parent.appendChild(this.loaderEl!);
  }

  private hideLoader(parent: HTMLElement) {
    this.removeLoader();
  }

  private removeLoader() {
    if (this.loaderEl) {
      this.loaderEl.parentElement?.removeChild(this.loaderEl);
      this.loaderEl = null;
    }
  }

  // -------------------------- SHAKE ANIMATION -------------------------
  private shake(input: HTMLElement) {
    this.renderer.addClass(input, 'shake-anim');
    setTimeout(() => this.renderer.removeClass(input, 'shake-anim'), 350);
  }
}
