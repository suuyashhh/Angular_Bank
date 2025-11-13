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

  uniqCode?: number;
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
  target: PickerTarget;
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

  public currentTarget: PickerTarget = 'primary';

  /** Separate storage primary/corr */
  private pickerSelectedMap: Record<
    PickerField,
    { primary: Option | null; corr: Option | null }
  > = {
      city: { primary: null, corr: null },
      country: { primary: null, corr: null },
      area: { primary: null, corr: null },
      religion: { primary: null, corr: null },
      cast: { primary: null, corr: null },
      occupation: { primary: null, corr: null },
      idproof: { primary: null, corr: null },
      addrproof: { primary: null, corr: null },
      otherstaff: { primary: null, corr: null },
    };

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    private loader: LoaderService
  ) { }

  /** Reset values for new page */
  resetSelections() {
    (Object.keys(this.pickerSelectedMap) as PickerField[]).forEach(f => {
      this.pickerSelectedMap[f].primary = null;
      this.pickerSelectedMap[f].corr = null;
    });

    this.pickerSelected$.next(null);
    this.pickerTempSelected$.next(null);
  }

  getSelected(field: PickerField, target: PickerTarget = 'primary') {
    return this.pickerSelectedMap[field][target];
  }

  /** Open Picker */
  openPicker(field: PickerField, target: PickerTarget = 'primary') {

    // Area validation
    if (field === 'area' && !this.pickerSelectedMap.city[target]) {
      this.toastr.error("Please select a city first.");
      return;
    }

    this.currentTarget = target;

    this.pickerOpen$.next(true);
    this.pickerField$.next(field);
    this.pickerTitle$.next(this.getPickerTitle(field));
    this.pickerOptions$.next([]);
    this.pickerFiltered$.next([]);
    this.pickerLoading$.next(true);

    const existing = this.pickerSelectedMap[field][target];

    this.pickerTempSelected$.next({ field, option: existing, target });
    this.pickerSelected$.next({ field, option: existing, target });

    document.body.style.overflow = 'hidden';

    // LOAD LIST BASED ON FIELD
    switch (field) {
      case 'city': this.loadCityList(); break;
      case 'country': this.loadCountryList(); break;
      case 'area': this.loadAreaList(target); break;
      case 'religion': this.loadReligionList(); break;
      case 'cast': this.loadCastList(); break;
      case 'occupation': this.loadOccupationList(); break;
      case 'idproof': this.loadIDProofList(); break;
      case 'addrproof': this.loadAddrProofList(); break;
      default: this.pickerLoading$.next(false);
    }
  }

  closePicker() {
    this.pickerOpen$.next(false);
    this.pickerTempSelected$.next(null);
    this.pickerLoading$.next(false);
    document.body.style.overflow = '';
  }

  confirmPicker() {
    const field = this.pickerField$.value;
    const temp = this.pickerTempSelected$.value;
    const target = this.currentTarget;

    if (!field || !temp?.option) return;

    this.pickerSelectedMap[field][target] = temp.option;

    // reset area when city changes
    if (field === 'city') {
      this.pickerSelectedMap.area[target] = null;
      this.pickerSelected$.next({ field: 'area', option: null, target });
    }

    this.pickerSelected$.next({ field, option: temp.option, target });

    this.closePicker();
  }

  pickOption(opt: Option) {
    const field = this.pickerField$.value;
    if (!field) return;

    this.pickerTempSelected$.next({
      field,
      option: opt,
      target: this.currentTarget
    });
  }

  filter(term: string) {
    term = (term || '').toLowerCase();

    const filtered = this.pickerOptions$.value.filter(x =>
      (x.name ?? '').toLowerCase().includes(term)
    );

    this.pickerFiltered$.next(filtered);
  }

  private getPickerTitle(field: PickerField) {
    return {
      city: 'City',
      country: 'Country',
      area: 'Area',
      religion: 'Religion',
      cast: 'Caste',
      occupation: 'Occupation',
      idproof: 'ID Proof',
      addrproof: 'Address Proof',
      otherstaff: 'Staff',
    }[field];
  }

  /* --------------------------
   * CITY
   * -------------------------- */
  private loadCityList() {
    this.api.get('CityMaster/GetAllDependencies').subscribe({
      next: (res: any[]) => {
        const list = res.map(r => ({
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

        this.pickerOptions$.next(list);
        this.pickerFiltered$.next(list);
        this.pickerLoading$.next(false);
      },
      error: () => {
        this.toastr.error("Failed to load city list.");
        this.pickerLoading$.next(false);
      }
    });
  }

  /* --------------------------
   * COUNTRY
   * -------------------------- */
  private loadCountryList() {
    this.api.get('CountryMaster/GetAll').subscribe({
      next: (res: any[]) => {
        const list = res.map(x => ({
          code: x.trN_NO,
          name: x.countrY_NAME
        }));

        this.pickerOptions$.next(list);
        this.pickerFiltered$.next(list);
        this.pickerLoading$.next(false);
      },
      error: () => {
        this.toastr.error("Failed to load country list.");
        this.pickerLoading$.next(false);
      }
    });
  }

  /* --------------------------
   * AREA
   * -------------------------- */
  private loadAreaList(target: PickerTarget) {
    const city = this.pickerSelectedMap.city[target];

    if (!city) {
      this.toastr.error("Please select a city first.");
      this.pickerLoading$.next(false);
      return;
    }

    const url =
      `AreaMaster/GetAreaById?countryCode=${city.countrY_CODE}&stateCode=${city.statE_CODE}&distCode=${city.disT_CODE}&talukaCode=${city.talukA_CODE}&cityCode=${city.code}`;

    this.api.get(url).subscribe({
      next: (res: any[]) => {
        const list = res.map(r => ({
          areA_CODE: r.areA_CODE,
          name: r.areA_NAME,
          piN_CODE: r.piN_CODE
        }));

        this.pickerOptions$.next(list);
        this.pickerFiltered$.next(list);
        this.pickerLoading$.next(false);
      },
      error: () => {
        this.toastr.error("Failed to load areas.");
        this.pickerLoading$.next(false);
      }
    });
  }

  /* --------------------------
   * RELIGION
   * -------------------------- */
  private loadReligionList() {
    this.api.get('ReligionMaster/GetAllReligion').subscribe({
      next: (res: any[]) => {
        const list = res.map(x => ({
          code: Number(x.religioN_CODE ?? 0),
          name: String(x.religioN_NAME ?? '').trim()
        }));

        this.pickerOptions$.next(list);
        this.pickerFiltered$.next(list);
        this.pickerLoading$.next(false);
      },
      error: () => {
        this.toastr.error("Failed to load religions.");
        this.pickerLoading$.next(false);
      }
    });
  }

  /* --------------------------
   * CASTE
   * -------------------------- */
  private loadCastList() {
    this.api.get('CastMaster/GetAllCast').subscribe({
      next: (res: any[]) => {
        const list = res.map(x => ({
          code: Number(x.casT_CODE ?? 0),
          name: String(x.casT_NAME ?? '').trim()
        }));

        this.pickerOptions$.next(list);
        this.pickerFiltered$.next(list);
        this.pickerLoading$.next(false);
      },
      error: () => {
        this.toastr.error("Failed to load caste.");
        this.pickerLoading$.next(false);
      }
    });
  }

  /* --------------------------
   * OCCUPATION
   * -------------------------- */
  private loadOccupationList() {
    this.api.get('OccupationMaster/GetAllOccupations').subscribe({
      next: (res: any[]) => {
        const list = res.map(x => ({
          code: Number(x.occuP_CODE ?? 0),
          name: String(x.occuP_NAME ?? '').trim()
        }));

        this.pickerOptions$.next(list);
        this.pickerFiltered$.next(list);
        this.pickerLoading$.next(false);
      },
      error: () => {
        this.toastr.error("Failed to load occupations.");
        this.pickerLoading$.next(false);
      }
    });
  }

  /* --------------------------
   * ID PROOF
   * -------------------------- */
  private loadIDProofList() {
    this.api.get('KycIdMaster/GetAllKycId').subscribe({
      next: (res: any[]) => {
        const list = res.map(x => ({
          code: Number(x.kyC_ID_CODE ?? 0),
          name: String(x.kyC_ID_NAME ?? '').trim()
        }));

        this.pickerOptions$.next(list);
        this.pickerFiltered$.next(list);
        this.pickerLoading$.next(false);
      },
      error: () => {
        this.toastr.error("Failed to load ID proofs.");
        this.pickerLoading$.next(false);
      }
    });
  }

  /* --------------------------
   * ADDRESS PROOF
   * -------------------------- */
  private loadAddrProofList() {
    this.api.get('KycAddressMaster/GetAllKycAddress').subscribe({
      next: (res: any[]) => {
        const list = res.map(x => ({
          code: Number(x.kyC_ADDR_CODE ?? 0),
          name: String(x.kyC_ADDR_NAME ?? '').trim()
        }));

        this.pickerOptions$.next(list);
        this.pickerFiltered$.next(list);
        this.pickerLoading$.next(false);
      },
      error: () => {
        this.toastr.error("Failed to load address proofs.");
        this.pickerLoading$.next(false);
      }
    });
  }
}
