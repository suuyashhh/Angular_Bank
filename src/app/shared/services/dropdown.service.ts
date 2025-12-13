import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface DropdownOption {
  name: string;
  code: number | string;
  meta?: string;      // optional (city meta / code / pin)
  [key: string]: any;
}

@Injectable()
export class DropdownService {

  pickerOpen$ = new BehaviorSubject<boolean>(false);
  dropdownOpen$ = new BehaviorSubject<boolean>(false);

  pickerTitle$ = new BehaviorSubject<string>('');
  pickerOptions$ = new BehaviorSubject<DropdownOption[]>([]);
  pickerFiltered$ = new BehaviorSubject<DropdownOption[]>([]);
  pickerSelectedTemp$ = new BehaviorSubject<DropdownOption | null>(null);

  searchText$ = new BehaviorSubject<string>('');
  searchChanged$ = new Subject<string>();


  private resolveFn: ((value: DropdownOption | null) => void) | null = null;

  /** Open dynamic dropdown */
openPicker(title: string, list: DropdownOption[]): Promise<DropdownOption | null> {
  this.pickerTitle$.next(title);
  this.pickerOptions$.next(list);
  this.pickerFiltered$.next(list);

  // keep previously selected item in input
  this.searchText$.next(this.pickerSelectedTemp$.value?.name || '');

  this.dropdownOpen$.next(false);
  this.pickerOpen$.next(true);

  return new Promise(resolve => (this.resolveFn = resolve));
}


  /** Close picker */
  closePicker() {
    this.pickerOpen$.next(false);
    this.dropdownOpen$.next(false);
    this.resolveFn?.(null);
    this.resolveFn = null;
  }

  /** Confirm */
  confirmPicker() {
    const selected = this.pickerSelectedTemp$.value;
    this.pickerOpen$.next(false);
    this.dropdownOpen$.next(false);
    this.resolveFn?.(selected);
    this.resolveFn = null;
  }

  /** Select option */
pickOption(opt: DropdownOption) {
  this.pickerSelectedTemp$.next(opt);
  this.searchText$.next(opt.name); // <-- REQUIRED
  this.dropdownOpen$.next(false);
}



  /** Check selected (for checkmark icon) */
  isSelected(opt: DropdownOption) {
    return this.pickerSelectedTemp$.value === opt;
  }

  /** Toggle dropdown */
  toggleDropdown() {
    this.dropdownOpen$.next(!this.dropdownOpen$.value);
  }

  /** Search */
  filter(q: string) {
  this.searchText$.next(q);

  const all = this.pickerOptions$.value || [];
  q = (q || '').trim().toLowerCase();

  if (!q) {
    this.pickerFiltered$.next(all);
    return;
  }

  this.pickerFiltered$.next(
    all.filter(o => {
      const name = (o.name || '').toString().toLowerCase();
      const code = (o.code || '').toString().toLowerCase();
      
      return (
        name.includes(q) ||
        code.includes(q)
      );
    })
  );
}


}
