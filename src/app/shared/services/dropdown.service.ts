import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

export interface DropdownOption {
  name: string;
  code: number | string;
  meta?: string;
  [key: string]: any;
}

@Injectable()
export class DropdownService implements OnDestroy {

  pickerOpen$ = new BehaviorSubject<boolean>(false);
  dropdownOpen$ = new BehaviorSubject<boolean>(false);

  pickerTitle$ = new BehaviorSubject<string>('');
  pickerOptions$ = new BehaviorSubject<DropdownOption[]>([]);
  pickerFiltered$ = new BehaviorSubject<DropdownOption[]>([]);
  pickerSelectedTemp$ = new BehaviorSubject<DropdownOption | null>(null);

  searchText$ = new BehaviorSubject<string>('');
  searchChanged$ = new Subject<string>();

  private destroy$ = new Subject<void>();
  private resolveFn: ((value: DropdownOption | null) => void) | null = null;

  constructor() {
    this.searchChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(q => this.filter(q));
  }

  /** Open dropdown */
  openPicker(title: string, list: DropdownOption[]): Promise<DropdownOption | null> {
    this.resetState();

    this.pickerTitle$.next(title);
    this.pickerOptions$.next(list);
    this.pickerFiltered$.next(list);

    this.pickerOpen$.next(true);

    return new Promise(resolve => (this.resolveFn = resolve));
  }

  /** Confirm */
  confirmPicker() {
    const selected = this.pickerSelectedTemp$.value;
    this.closeInternal();
    this.resolveFn?.(selected);
    this.resolveFn = null;
  }

  /** Close */
  closePicker() {
    this.closeInternal();
    this.resolveFn?.(null);
    this.resolveFn = null;
  }

  /** Select option */
  pickOption(opt: DropdownOption) {
    this.pickerSelectedTemp$.next(opt);
    this.searchText$.next(opt.name);
    this.dropdownOpen$.next(false);
  }

  isSelected(opt: DropdownOption) {
    return this.pickerSelectedTemp$.value === opt;
  }

  toggleDropdown() {
    this.dropdownOpen$.next(!this.dropdownOpen$.value);
  }

  filter(q: string) {
    this.searchText$.next(q);

    const all = this.pickerOptions$.value;
    q = (q || '').trim().toLowerCase();

    if (!q) {
      this.pickerFiltered$.next(all);
      return;
    }

    this.pickerFiltered$.next(
      all.filter(o =>
        o.name.toLowerCase().includes(q) ||
        o.code.toString().toLowerCase().includes(q)
      )
    );
  }

  /** INTERNAL RESET */
  private resetState() {
    this.dropdownOpen$.next(false);
    this.searchText$.next('');
    this.pickerSelectedTemp$.next(null);
  }

  private closeInternal() {
    this.pickerOpen$.next(false);
    this.dropdownOpen$.next(false);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
