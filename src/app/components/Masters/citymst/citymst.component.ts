import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PickerModalComponent } from '../../../shared/picker-modal/picker-modal.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { PickerService } from '../../../services/picker.service';
import { DropdpwnModalComponent } from '../../../shared/dropdpwn-modal/dropdpwn-modal.component';
import { DropdownService } from '../../../shared/services/dropdown.service.ts.service';

@Component({
  selector: 'app-citymst',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PickerModalComponent,
    NgxPaginationModule,
    RouterModule,
    DropdpwnModalComponent
  ],
  templateUrl: './citymst.component.html',
  styleUrl: './citymst.component.css'
})
export class CitymstComponent {

  @ViewChild('countryNameField') countryNameField!: ElementRef;

  isCreatingNew = false;   // controls visibility of inline form
  isEditMode = false;      // true when editing existing city
  btn: string = '';
  city_code = 0;

  selectedCountryName = '';
  selectedStateName = '';
  SelectedTalukaName = '';
  SelectedDistrictName = '';
  selectedCountryCode: number | null = null;
  selectedStateCode: number | null = null;
  SelectedCityCode: number | null = null;
  SelectedTalukaCode: number | null = null;
  SelectedDistrictCode: number | null = null;

  saving = false;
  city_List: any[] = [];
  loading = false;

  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  data!: FormGroup;

  // used by delete flow so we know which district/state/country to send
  deleteCityCode: number | null = null;
  deleteCountryCode: number | null = null;
  deleteStateCode: number | null = null;
  deleteDistrictCode: number | null = null;
  deleteTalukaCode: number | null = null;

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    public picker: PickerService,
    private dropdown: DropdownService
  ) { }

  ngOnInit(): void {
    this.data = new FormGroup({
      DISTRICT_CODE: new FormControl(0),
      DISTRICT_NAME: new FormControl('', Validators.required),
      COUNTRY_CODE: new FormControl(0),
      STATE_CODE: new FormControl(0),
      CITY_CODE: new FormControl(0),
      CITY_NAME: new FormControl('', Validators.required),
      TALUKA_CODE: new FormControl(0),
      TALUKA_NAME: new FormControl('', Validators.required),
      DATE: new FormControl('')
    });

    this.loadCities();

    this.picker.resetSelections();
    this.picker.pickerSelected$.subscribe(sel => {
      if (!sel) return;
      const { field, option } = sel;
      const fld = (field || '').toString().toLowerCase();

      if (fld === 'country') {
        if (!option) {
          this.selectedCountryName = '';
          this.selectedCountryCode = null;
          this.data.patchValue({ COUNTRY_CODE: 0 });
          return;
        }
        this.selectedCountryName = option.name;
        this.selectedCountryCode = Number(option.code ?? 0);
        this.data.patchValue({ COUNTRY_CODE: this.selectedCountryCode });
      }

      if (fld === 'state') {
        if (!option) {
          this.selectedStateName = '';
          this.selectedStateCode = null;
          this.data.patchValue({ STATE_CODE: 0 });
          return;
        }
        this.selectedStateName = option.name;
        this.selectedStateCode = Number(option.code ?? 0);
        this.data.patchValue({ STATE_CODE: this.selectedStateCode });
      }
    });
  }

  private normalizeServerObject(raw: any) {
    if (!raw) return {
      CITY_CODE: 0,
      CITY_NAME: '',
      DISTRICT_CODE: 0,
      TALUKA_CODE: 0,
      DISTRICT_NAME: '',
      TALUKA_NAME: '',
      COUNTRY_CODE: 0,
      COUNTRY_NAME: '',
      STATE_CODE: 0,
      STATE_NAME: ''
    };
    return {
      CITY_CODE: raw.CITY_CODE ?? raw.code ?? raw.citY_CODE ?? 0,
      CITY_NAME: String(raw.CITY_NAME ?? raw.citY_NAME ?? raw.Name ?? ''),
      DISTRICT_CODE: raw.DIST_CODE ?? raw.disT_CODE ?? raw.DISTRICT_CODE ?? 0,
      DISTRICT_NAME: String(raw.DIST_NAME ?? raw.disT_NAME ?? raw.distName ?? raw.DISTRICT_NAME ?? ''),
      COUNTRY_CODE: raw.COUNTRY_CODE ?? raw.country_Code ?? raw.countrY_CODE ?? 0,
      COUNTRY_NAME: String(raw.COUNTRY_NAME ?? raw.countrY_NAME ?? raw.Country_Name ?? ''),
      STATE_CODE: raw.STATE_CODE ?? raw.state_Code ?? raw.statE_CODE ?? 0,
      STATE_NAME: String(raw.STATE_NAME ?? raw.statE_NAME ?? raw.State_Name ?? ''),
      TALUKA_CODE: raw.TALUKA_CODE ?? raw.talukA_CODE ?? raw.code ?? 0,
      TALUKA_NAME: String(raw.TALUKA_NAME ?? raw.talukA_NAME ?? raw.taluka_Name ?? '')
    };
  }

  loadCities(): void {
    this.loading = true;
    this.api.get('CityMaster/GetAllCity').subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res) list = [res];
        this.city_List = (list || []).map((c: any) => this.normalizeServerObject(c));
      },
      error: (err) => {
        console.error('Failed to load Cities', err);
        this.toastr.error('Failed to load Cities');
      },
      complete: () => (this.loading = false)
    });
  }

  openCountry() {
    // if (!this.isEditMode) {
    //   this.toastr.info('Country cannot be changed in edit mode.');
    //   return;
    // }
    this.api.get('CountryMaster/GetAll').subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : (res ? [res] : []));
        const list = raw.map((x: any) => ({
          code: Number(x.code ?? x.Code ?? x.COUNTRY_CODE ?? 0),
          name: String(x.name ?? x.Name ?? x.country_Name ?? x.COUNTRY_NAME ?? '')
        }));
        this.dropdown.openPicker('country', list).then(sel => {
          if (sel) {
            this.selectedCountryName = sel.name;
            this.selectedCountryCode = Number(sel.code ?? 0);
            this.data.patchValue({ COUNTRY_CODE: this.selectedCountryCode });
          }
        });
      },
      error: () => this.toastr.error('Failed to load Countries.')
    });
  }

  openState() {
    // if (!this.isEditMode) {
    //   this.toastr.info('State cannot be changed in edit mode.');
    //   return;
    // }
    this.api.get('StateMaster/GetAll').subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : (res ? [res] : []));
        const list = raw.map((x: any) => ({
          code: Number(x.code ?? x.Code ?? x.STATE_CODE ?? 0),
          name: String(x.name ?? x.Name ?? x.state_Name ?? x.STATE_NAME ?? '')
        }));
        this.dropdown.openPicker('state', list).then(sel => {
          if (sel) {
            this.selectedStateName = sel.name;
            this.selectedStateCode = Number(sel.code ?? 0);
            this.data.patchValue({ STATE_CODE: this.selectedStateCode });
          }
        });
      },
      error: () => this.toastr.error('Failed to load States.')
    });
  }

  openDistrict() {
    // if (!this.isEditMode) {
    //   this.toastr.info('Disrict cannot be changed in edit mode.');
    //   return;
    // }
    // 1. Guard: need country + state selected first
    if (!this.selectedCountryCode) {
      this.toastr.error('Please select Country first.');
      return;
    }
    if (!this.selectedStateCode) {
      this.toastr.error('Please select State first.');
      return;
    }

    // ✅ names match controller: countryCode, stateCode
    const url =
      `CityMaster/GetDistrictsByState` +
      `?countryCode=${encodeURIComponent(this.selectedCountryCode!)}` +
      `&stateCode=${encodeURIComponent(this.selectedStateCode!)}`;

    this.api.get(url).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res)
          ? res
          : (res?.data && Array.isArray(res.data)
            ? res.data
            : (res ? [res] : []));
        console.log('district raw from API:', raw);

        // IMPORTANT: use DIST_CODE / DIST_NAME (as per SQL/DTO)
        const list = raw.map((x: any) => ({
          code: Number(
            x.DIST_CODE ??
            x.DISTRICT_CODE ??
            x.Code ??
            x.code ??
            0
          ),
          name: String(
            x.DIST_NAME ??
            x.DISTRICT_NAME ??
            x.Name ??
            x.name ??
            ''
          )
        }));

        this.dropdown.openPicker('district', list).then(sel => {
          if (sel) {
            this.SelectedDistrictName = sel.name;
            this.SelectedDistrictCode = Number(sel.code ?? 0);

            this.data.patchValue({
              DISTRICT_CODE: this.SelectedDistrictCode,
              DISTRICT_NAME: this.SelectedDistrictName
            });

            // reset taluka when district changes
            this.SelectedTalukaName = '';
            this.SelectedTalukaCode = 0;
            this.data.patchValue({
              TALUKA_CODE: null,
              TALUKA_NAME: ''
            });
          }
        });
      },
      error: () => this.toastr.error('Failed to load Districts.')
    });
  }




  openTaluka() {
    // if (!this.isEditMode) {
    //   this.toastr.info('Taluka cannot be changed in edit mode.');
    //   return;
    // }
    if (!this.selectedCountryCode) {
      this.toastr.error('Please select Country first.');
      return;
    }
    if (!this.selectedStateCode) {
      this.toastr.error('Please select State first.');
      return;
    }
    if (!this.SelectedDistrictCode) {
      this.toastr.error('Please select District first.');
      return;
    }

    // ✅ names match controller: countryCode, stateCode, distCode
    const url =
      `CityMaster/GetTalukasByDistrict` +
      `?countryCode=${encodeURIComponent(this.selectedCountryCode!)}` +
      `&stateCode=${encodeURIComponent(this.selectedStateCode!)}` +
      `&distCode=${encodeURIComponent(this.SelectedDistrictCode!)}`;

    this.api.get(url).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res)
          ? res
          : (res?.data && Array.isArray(res.data)
            ? res.data
            : (res ? [res] : []));

        const list = raw.map((x: any) => ({
          code: Number(
            x.TALUKA_CODE ??
            x.Code ??
            x.code ??
            0
          ),
          name: String(
            x.TALUKA_NAME ??
            x.Name ??
            x.name ??
            ''
          )
        }));

        this.dropdown.openPicker('taluka', list).then(sel => {
          if (sel) {
            this.SelectedTalukaName = sel.name;
            this.SelectedTalukaCode = Number(sel.code ?? 0);
            this.data.patchValue({
              TALUKA_CODE: this.SelectedTalukaCode,
              TALUKA_NAME: this.SelectedTalukaName
            });
          }
        });
      },
      error: () => this.toastr.error('Failed to load Taluka.')
    });
  }

  resetCityForm(): void {
    this.isCreatingNew = true;   // show form
    this.isEditMode = false;     // NEW mode, not edit
    this.btn = '';
    this.city_code = 0;
    this.selectedCountryCode = null;
    this.selectedStateCode = null;
    this.selectedCountryName = '';
    this.selectedStateName = '';
    this.SelectedTalukaCode = null;
    this.SelectedTalukaName = '';
    this.SelectedDistrictCode = null;
    this.SelectedDistrictName = '';
    this.data.reset({ CITY_CODE: 0, CITY_NAME: '', COUNTRY_CODE: 0, STATE_CODE: 0, TALUKA_CODE: 0, DISTRICT_CODE: 0 });
    setTimeout(() => this.countryNameField?.nativeElement?.focus?.(), 50);
  }

  // Open form for edit
  openInlineForm(cityCode: number | null, stateCode: number | null, countryCode: number | null, districtCode: number | null, talukaCode: number | null, action: string): void {
    if (cityCode === null || cityCode === undefined) {
      this.toastr.warning('Invalid city id for edit');
      return;
    }
    this.isCreatingNew = true;  // show form
    this.isEditMode = true;     // EDIT mode
    this.btn = action;

    this.SelectedCityCode = cityCode ?? null;
    this.selectedStateCode = stateCode ?? null;
    this.selectedCountryCode = countryCode ?? null;
    this.SelectedTalukaCode = talukaCode ?? null;
    this.SelectedDistrictCode = districtCode ?? null;

    this.getDataById(cityCode, stateCode ?? 0, countryCode ?? 0, districtCode ?? 0, talukaCode ?? 0);
  }

  // Fetch a city by its id (and use state & country to be safe)
  getDataById(cityCode: number, stateCode: number, countryCode: number, districtCode: number, talukaCode: number): void {
    // *** IMPORTANT: parameter names must match controller: country, state, dist, taluka, code ***
    const url = `CityMaster/GetCityById?country=${encodeURIComponent(countryCode)}&state=${encodeURIComponent(stateCode)}&dist=${encodeURIComponent(districtCode)}&taluka=${encodeURIComponent(talukaCode)}&code=${encodeURIComponent(cityCode)}`;

    this.api.get(url).subscribe({
      next: (res: any) => {
        let objRaw = res;
        if (res?.data && typeof res.data === 'object') objRaw = res.data;
        if (Array.isArray(objRaw) && objRaw.length > 0) objRaw = objRaw[0];

        const obj = this.normalizeServerObject(objRaw);

        this.city_code = Number(obj.CITY_CODE ?? cityCode);
        this.selectedCountryCode = Number(obj.COUNTRY_CODE ?? countryCode);
        this.selectedCountryName = obj.COUNTRY_NAME ?? '';
        this.selectedStateCode = Number(obj.STATE_CODE ?? stateCode);
        this.selectedStateName = obj.STATE_NAME ?? '';
        this.SelectedTalukaCode = Number(obj.TALUKA_CODE ?? talukaCode);
        this.SelectedTalukaName = obj.TALUKA_NAME ?? '';
        this.SelectedDistrictCode = Number(obj.DISTRICT_CODE ?? districtCode);
        this.SelectedDistrictName = obj.DISTRICT_NAME ?? '';

        this.data.patchValue({
          CITY_CODE: this.city_code,
          COUNTRY_CODE: this.selectedCountryCode || 0,
          STATE_CODE: this.selectedStateCode || 0,
          TALUKA_CODE: this.SelectedTalukaCode || 0,
          DISTRICT_CODE: this.SelectedDistrictCode || 0,
          CITY_NAME: obj.CITY_NAME ?? '',
          TALUKA_NAME: this.SelectedTalukaName,
          DISTRICT_NAME: this.SelectedDistrictName
        });

        setTimeout(() => this.countryNameField?.nativeElement?.focus?.(), 50);
      },
      error: (err) => {
        console.error('Error loading city', err);
        this.toastr.error('Failed to load city');
      }
    });
  }

  // Save or Update
  submit(): void {
    debugger
    const cityName = this.data.get('CITY_NAME')?.value?.trim();

    if (!cityName) {
      this.toastr.warning('Please enter city name', 'Validation');
      // better focus on city input instead of country
      const cityInput = document.getElementById('cityName') as HTMLInputElement | null;
      cityInput?.focus();
      return;
    }


    const v = this.data.value;

    // *** Shape payload like DTOCityMaster on the server ***
    const payload = {
      COUNTRY_CODE: Number(v.COUNTRY_CODE || this.selectedCountryCode || 0),
      STATE_CODE: Number(v.STATE_CODE || this.selectedStateCode || 0),
      DIST_CODE: Number(v.DISTRICT_CODE || this.SelectedDistrictCode || 0),
      TALUKA_CODE: Number(v.TALUKA_CODE || this.SelectedTalukaCode || 0),
      CITY_CODE: Number(v.CITY_CODE || 0),
      CITY_NAME: String(v.CITY_NAME || '').trim(),
      COUNTRY_NAME: this.selectedCountryName || '',
      STATE_NAME: this.selectedStateName || '',
      TALUKA_NAME: this.SelectedTalukaName || '',
      DIST_NAME: this.SelectedDistrictName || '',
      Entry_Date: v.DATE || new Date()
    };

    this.saving = true;
    const isEdit = payload.CITY_CODE && payload.CITY_CODE > 0;

    const apiCall$ = isEdit
      ? this.api.post('CityMaster/Update', payload)
      : this.api.post('CityMaster/Save', payload);

    apiCall$.subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? (isEdit ? 'Updated' : 'Saved'));
        this.saving = false;
        this.isCreatingNew = false;
        this.isEditMode = false;
        this.data.reset({ CITY_CODE: 0, CITY_NAME: '', COUNTRY_CODE: 0, STATE_CODE: 0, TALUKA_CODE: 0, DISTRICT_CODE: 0 });
        this.selectedCountryCode = null;
        this.selectedStateCode = null;
        this.selectedCountryName = '';
        this.selectedStateName = '';
        this.SelectedTalukaCode = null;
        this.SelectedTalukaName = '';
        this.SelectedDistrictCode = null;
        this.SelectedDistrictName = '';
        this.loadCities();  // <-- actually refresh
      },
      error: (err) => {
        console.error('Save error', err);
        this.toastr.error('Failed to save city');
        this.saving = false;
      }
    });
  }

  // Trigger delete modal and store codes to send
  deleteCity(cityCode: number, name: string, stateCode: number, countryCode: number, talukaCode: number, districtCode: number): void {
    if (cityCode === null || cityCode === undefined) {
      this.toastr.warning('Invalid city id');
      return;
    }
    this.city_code = cityCode;
    this.deleteStateCode = stateCode ?? null;
    this.deleteCountryCode = countryCode ?? null;
    this.deleteTalukaCode = talukaCode ?? null;
    this.deleteDistrictCode = districtCode ?? null;
    this.data.patchValue({ CITY_NAME: name });

    const modalEl = document.getElementById('deleteConfirmModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    } else {
      if (confirm(`Delete ${name}?`)) this.executeDelete();
    }
  }

  // Delete call – still using query-string because your API service delete likely works that way
  executeDelete(): void {
    if (this.city_code === null || this.city_code === undefined) {
      this.toastr.warning('Invalid city selected');
      return;
    }

    const codeQ = this.city_code;
    const stateQ = this.deleteStateCode ?? this.data.get('STATE_CODE')?.value ?? 0;
    const countryQ = this.deleteCountryCode ?? this.data.get('COUNTRY_CODE')?.value ?? 0;
    const talukaQ = this.deleteTalukaCode ?? this.data.get('TALUKA_CODE')?.value ?? 0;
    const districtQ = this.deleteDistrictCode ?? this.data.get('DISTRICT_CODE')?.value ?? 0;

    const url = `CityMaster/Delete?code=${encodeURIComponent(codeQ)}&state=${encodeURIComponent(stateQ)}&country=${encodeURIComponent(countryQ)}&taluka=${encodeURIComponent(talukaQ)}&dist=${encodeURIComponent(districtQ)}`;

    this.api.delete(url).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'City deleted');
        this.loadCities();
        this.isCreatingNew = false;
        this.city_code = 0;
        this.deleteStateCode = null;
        this.deleteCountryCode = null;
        this.selectedCountryCode = null;
        this.selectedStateCode = null;
        this.selectedCountryName = '';
        this.selectedStateName = '';
      },
      error: (err) => {
        console.error('Delete error', err);
        this.toastr.error('Failed to delete city');
      }
    });
  }

  closeForm(): void {
    this.isCreatingNew = false;
    this.isEditMode = false;
  }

  filteredCountries() {
    let result = this.city_List || [];
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter((c: any) =>
        (c.CITY_NAME || '').toLowerCase().includes(s) ||
        String(c.CITY_CODE || '').toLowerCase().includes(s)
      );
    }
    return result;
  }
}
