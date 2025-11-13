import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { ToastrService } from 'ngx-toastr';
import { LoaderService } from './loader.service';

export type PickerField =
  | 'city'
  | 'country'
  | 'area'
  | 'religion'
  | 'cast'
  | 'occupation'
  | 'idproof'
  | 'addrproof'
  | 'otherstaff';

export type PickerTarget = 'primary' | 'corr';

export interface Option {
  code?: number | string;
  name: string;
  pin?: string | null;
  selectId?: number | string;

  uniqCode?: number;      // <-- ADD THIS LINE
  areA_CODE?: number;
  citY_CODE?: number;
  talukA_CODE?: number;
  talukA_NAME?: string;
  disT_CODE?: number;
  disT_NAME?: string;
  statE_CODE?: number;
  statE_NAME?: string;
  countrY_CODE?: number;
  countrY_NAME?: string;
  piN_CODE?: number;
}


export interface FieldSelection {
  field: PickerField;
  option: Option | null;
  target?: PickerTarget;
}

@Injectable({ providedIn: 'root' })
export class PickerService {
  pickerOpen$ = new BehaviorSubject<boolean>(false);
  pickerTitle$ = new BehaviorSubject<string>('');
  pickerOptions$ = new BehaviorSubject<Option[]>([]);
  pickerFiltered$ = new BehaviorSubject<Option[]>([]);
  pickerField$ = new BehaviorSubject<PickerField | null>(null);
  pickerSelected$ = new BehaviorSubject<FieldSelection | null>(null);
  pickerTempSelected$ = new BehaviorSubject<FieldSelection | null>(null);
  pickerLoading$ = new BehaviorSubject<boolean>(false);

  private currentTarget: PickerTarget = 'primary';

  private pickerSelectedMap: Record<PickerField, Option | null> = {
    city: null,
    country: null,
    area: null,
    religion: null,
    cast: null,
    occupation: null,
    idproof: null,
    addrproof: null,
    otherstaff: null,
  };

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    private loader: LoaderService
  ) { }

  getSelected(field: PickerField) {
    return this.pickerSelectedMap[field];
  }

  openPicker(field: PickerField, target: PickerTarget = 'primary') {

    // 🔥 GLOBAL VALIDATION FOR AREA
    if (field === 'area' && !this.pickerSelectedMap.city) {
      this.toastr.error("Please select a city first.");
      return;
    }

    this.currentTarget = target;

    // 🔥 CLEAR previously selected value for fresh open
    this.pickerSelectedMap[field] = null;

    this.pickerOpen$.next(true);
    this.pickerField$.next(field);
    this.pickerTitle$.next(this.getPickerTitle(field));
    this.pickerOptions$.next([]);
    this.pickerFiltered$.next([]);
    this.pickerLoading$.next(true);

    // no old value anymore (existing = null)
    const existing = this.pickerSelectedMap[field];

    this.pickerTempSelected$.next({ field, option: existing, target });
    this.pickerSelected$.next({ field, option: existing, target });

    document.body.style.overflow = 'hidden';

    switch (field) {
      case 'city':
        this.loadCityList();
        break;
      case 'country':
        this.loadCountryList();
        break;
      case 'area':
        this.loadAreaList();
        break;
      default:
        this.pickerLoading$.next(false);
        break;
    }
  }


  closePicker() {
    this.pickerOpen$.next(false);
    this.pickerLoading$.next(false);
    this.pickerTempSelected$.next(null);
    document.body.style.overflow = '';
  }

  confirmPicker() {
    const field = this.pickerField$.value;
    const temp = this.pickerTempSelected$.value;

    if (!field || !temp?.option) return;

    this.pickerSelectedMap[field] = temp.option;

    // RESET AREA on CITY change
    if (field === 'city') {
      this.pickerSelectedMap.area = null;
      this.pickerSelected$.next({ field: 'area', option: null });
    }

    this.pickerSelected$.next({
      field,
      option: temp.option,
      target: this.currentTarget,
    });

    this.closePicker();
  }

  pickOption(opt: Option) {
    const field = this.pickerField$.value;
    if (!field) return;

    this.pickerTempSelected$.next({
      field,
      option: opt,
      target: this.currentTarget,
    });
  }

  filter(term: string) {
    term = term.toLowerCase();
    const filtered = this.pickerOptions$.value.filter(o =>
      (o.name ?? '').toLowerCase().includes(term)
    );
    this.pickerFiltered$.next(filtered);
  }

  private getPickerTitle(f: PickerField) {
    return {
      city: 'City',
      country: 'Country',
      area: 'Area',
      religion: 'Religion',
      cast: 'Caste',
      occupation: 'Occupation',
      idproof: 'ID Proof',
      addrproof: 'Address Proof',
      otherstaff: 'Other Staff',
    }[f];
  }

  private loadCityList() {
    this.api.get('CityMaster/GetAllDependencies').subscribe({
      next: (res: any[]) => {
        const options = res.map(r => ({
          uniqCode: r.uniqCode,
          code: r.citY_CODE,
          name: r.citY_NAME,
          talukA_CODE: r.talukA_CODE,
          talukA_NAME: r.talukA_NAME,
          disT_CODE: r.disT_CODE,
          disT_NAME: r.disT_NAME,
          statE_CODE: r.statE_CODE,
          statE_NAME: r.statE_NAME,
          countrY_CODE: r.countrY_CODE,
          countrY_NAME: r.countrY_NAME,
          piN_CODE: r.pin
        }));

        this.pickerOptions$.next(options);
        this.pickerFiltered$.next(options);
        this.pickerLoading$.next(false);
      },
      error: () => {
        this.toastr.error('Failed to load cities.');
        this.pickerLoading$.next(false);
      }
    });
  }

  private loadCountryList() {
    this.api.get('CountryMaster/GetAll').subscribe({
      next: (res: any[]) => {
        const options = res.map(r => ({
          code: r.trN_NO,
          name: r.countrY_NAME,
        }));

        this.pickerOptions$.next(options);
        this.pickerFiltered$.next(options);
        this.pickerLoading$.next(false);
      },
      error: () => {
        this.toastr.error('Failed to load countries.');
        this.pickerLoading$.next(false);
      }
    });
  }

  private loadAreaList() {
    const city = this.pickerSelectedMap.city;
    console.log(city);

    if (!city) {
      this.toastr.error('Please select city first.');
      this.pickerFiltered$.next([]);
      this.pickerLoading$.next(false);
      return;
    }

    const url =
      `AreaMaster/GetAreaById?countryCode=${city.countrY_CODE}&stateCode=${city.statE_CODE}&distCode=${city.disT_CODE}&talukaCode=${city.talukA_CODE}&cityCode=${city.code}`;

    this.api.get(url).subscribe({
      next: (res: any[]) => {
        const options = res.map(r => ({
          areA_CODE: r.areA_CODE,
          name: r.areA_NAME,
          piN_CODE: r.piN_CODE,
        }));

        this.pickerOptions$.next(options);
        this.pickerFiltered$.next(options);
        this.pickerLoading$.next(false);
      },
      error: () => {
        this.toastr.error('Failed to load areas.');
        this.pickerLoading$.next(false);
      }
    });
  }
}
