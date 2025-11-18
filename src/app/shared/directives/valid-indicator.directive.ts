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
import { ToastrService } from 'ngx-toastr';

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

  // serverValid: null = no server result, true = valid (doesn't exist), false = exists (warning)
  private serverValid: boolean | null = null;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private http: HttpClient,
    private auth: AuthService,
    private toastr: ToastrService,
  ) { }

  private getParent(): HTMLElement {
    return this.el.nativeElement.parentElement as HTMLElement;
  }

  // Normalize value for validation (uppercase for alpha parts)
  private normalizeForValidation(raw: string): string {
    if (raw == null) return '';
    let v = raw.trim();
    // For alphanumeric IDs we want uppercase comparisons
    if (['pan', 'gst', 'passport', 'voterid'].includes(this.type)) {
      v = v.toUpperCase();
    }
    return v;
  }

  // ---------------------------- INPUT EVENT -----------------------------
  @HostListener('input', ['$event.target.value'])
  onInput(rawValue: string) {
    const value = this.normalizeForValidation(rawValue);

    // immediate: reset server result whenever user types
    this.serverValid = null;

    // update native input value with normalized (uppercase) form if differs
    const inputEl = this.el.nativeElement as HTMLInputElement;
    if (inputEl && inputEl.value !== value) {
      inputEl.value = value;
    }

    this.updateUI(value);

    // decide whether to call API automatically for this type
    if (this.shouldAutoValidate(value)) {
      this.callServerValidation(value);
    }
  }

  // ---------------------------- BLUR EVENT ------------------------------
  @HostListener('blur', ['$event.target.value'])
  onBlur(rawValue: string) {
    const value = this.normalizeForValidation(rawValue);

    // DO NOT trigger API on blur. Only shake when invalid (and server hasn't approved).
    const localValid = this.validator.validate(this.type, value);
    if (!localValid && this.serverValid !== true) {
      this.shake(this.el.nativeElement);
    }
  }

  // --------------------- WHEN TO CALL API -----------------------
  private shouldAutoValidate(value: string): boolean {
    switch (this.type) {
      case 'aadhaar': return value.length === 12;
      case 'pan': return value.length === 10;
      case 'gst': return value.length === 15;
      case 'mobile': return value.length === 10;
      case 'phone': return value.length === 10;
      case 'voterid': return value.length >= 6;
      case 'passport': return value.length >= 8;
      default: return false;
    }
  }

  // ---------------------------- UI UPDATE ------------------------------
  private updateUI(value: string) {
    const input = this.el.nativeElement as HTMLElement;
    const parent = this.getParent();

    // Server override first
    if (this.serverValid === false) {
      this.invalidExistsUI(input, parent); // ⚠
      return;
    }
    if (this.serverValid === true) {
      this.validUI(input, parent); // ✔
      return;
    }

    // Local validation
    if (!value) {
      this.resetUI(input, parent);
      return;
    }

    const localValid = this.validator.validate(this.type, value);
    if (localValid) this.validUI(input, parent);
    else this.invalidUI(input, parent);
  }

  // --------------------------- SERVER (API) CALL -----------------------
  private callServerValidation(value: string) {
    const input = this.el.nativeElement as HTMLElement;
    const parent = this.getParent();

    // Map endpoint & param name by type
    const map: Record<string, { endpoint: string, param: string }> = {
      aadhaar: { endpoint: 'ValidationService/AadharNo', param: 'aadharNo' },
      pan: { endpoint: 'ValidationService/PanNo', param: 'panNo' },
      gst: { endpoint: 'ValidationService/GstNo', param: 'gstNo' },
      mobile: { endpoint: 'ValidationService/MobileNo', param: 'mobileNo' },
      phone: { endpoint: 'ValidationService/PhoneNo', param: 'phone1' },
      voterid: { endpoint: 'ValidationService/VoterIdNo', param: 'voterIdNo' },
      passport: { endpoint: 'ValidationService/PassportNo', param: 'passportNo' }
    };

    const cfg = map[this.type];
    if (!cfg) return;

    this.showLoader(parent);

    this.api.get(cfg.endpoint, { [cfg.param]: value }).subscribe({
      next: (res: any) => {
        this.hideLoader(parent);

        // support 'exist' OR 'exists' keys
        const exists = !!(res?.exist ?? res?.exists);

        if (exists) {
          // already exists in DB -> show warning ⚠
          this.serverValid = false;
          this.invalidExistsUI(input, parent);
          this.shake(input);
          this.toastr.warning('Details Already Exist');
        } else {
          // does not exist -> valid ✔
          this.serverValid = true;
          this.validUI(input, parent);
        }

        // re-run final UI state
        this.updateUI(value);
      },
      error: () => {
        this.hideLoader(parent);
        // treat errors as "exists" (safer UX) — you can change to null if you prefer
        this.serverValid = false;
        this.invalidExistsUI(input, parent);
        this.shake(input);
        this.updateUI(value);
      }
    });
  }

  // ---------------------------- UI STATES -------------------------------
  private validUI(input: HTMLElement, parent: HTMLElement) {
    this.removeLoader(); // hide spinner before showing icon
    this.setBorder(input, '#06d6a0');
    this.setLabelColor(parent, '#06d6a0');
    this.setIcon(parent, '✔', '#06d6a0');
  }

  private invalidUI(input: HTMLElement, parent: HTMLElement) {
    this.removeLoader();
    this.setBorder(input, '#e63946');
    this.setLabelColor(parent, '#e63946');
    this.setIcon(parent, '✖', '#e63946');
  }

  private invalidExistsUI(input: HTMLElement, parent: HTMLElement) {
    this.removeLoader();
    this.setBorder(input, '#e63946');
    this.setLabelColor(parent, '#e63946');
    this.setIcon(parent, '⚠', '#e63946');
  }

  private resetUI(input: HTMLElement, parent: HTMLElement) {
    this.removeLoader();
    this.renderer.removeStyle(input, 'border-color');
    this.renderer.removeStyle(input, 'box-shadow');
    this.setLabelColor(parent, null);
    this.removeIcon(parent);
  }

  // -------------------------- HELPERS (DOM) ---------------------------------
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
    if (!this.iconEl) return;

    this.renderer.setStyle(this.iconEl, 'position', 'absolute');
    this.renderer.setStyle(this.iconEl, 'right', '14px');
    this.renderer.setStyle(this.iconEl, 'top', '50%');
    this.renderer.setStyle(this.iconEl, 'transform', 'translateY(-50%)');
    this.renderer.setStyle(this.iconEl, 'font-size', '18px');
    this.renderer.setStyle(this.iconEl, 'color', color);
    this.renderer.setProperty(this.iconEl, 'innerHTML', symbol);

    if (parent && this.iconEl) {
      parent.appendChild(this.iconEl);
    }
  }

  private removeIcon(parent: HTMLElement) {
    if (this.iconEl && this.iconEl.parentElement) {
      this.iconEl.parentElement.removeChild(this.iconEl);
    }
    this.iconEl = null;
  }

  // -------------------------- LOADER ----------------------------------
  private showLoader(parent: HTMLElement) {
    this.removeLoader();
    this.removeIcon(parent);

    this.loaderEl = this.renderer.createElement('div');
    if (!this.loaderEl) return;

    this.renderer.setStyle(this.loaderEl, 'position', 'absolute');
    this.renderer.setStyle(this.loaderEl, 'right', '14px');
    this.renderer.setStyle(this.loaderEl, 'top', '50%');
    this.renderer.setStyle(this.loaderEl, 'transform', 'translateY(-50%)');
    this.renderer.setStyle(this.loaderEl, 'width', '18px');
    this.renderer.setStyle(this.loaderEl, 'height', '18px');
    this.renderer.setStyle(this.loaderEl, 'border', '3px solid #CCC');
    this.renderer.setStyle(this.loaderEl, 'border-top-color', '#6366F1');
    this.renderer.setStyle(this.loaderEl, 'border-radius', '50%');
    this.renderer.setStyle(this.loaderEl, 'animation', 'spin 0.6s linear infinite');

    if (parent && this.loaderEl) parent.appendChild(this.loaderEl);
  }

  private hideLoader(parent: HTMLElement) {
    this.removeLoader();
  }

  private removeLoader() {
    if (this.loaderEl && this.loaderEl.parentElement) {
      this.loaderEl.parentElement.removeChild(this.loaderEl);
    }
    this.loaderEl = null;
  }

  // -------------------------- SHAKE ANIMATION -------------------------
  private shake(input: HTMLElement) {
    this.renderer.addClass(input, 'shake-anim');
    setTimeout(() => this.renderer.removeClass(input, 'shake-anim'), 350);
  }
}
