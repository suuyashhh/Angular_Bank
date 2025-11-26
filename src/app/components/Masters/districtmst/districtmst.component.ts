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
import { DropdownService } from '../../../shared/services/dropdown.service';

@Component({
  selector: 'app-districtmst',
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
  templateUrl: './districtmst.component.html',
  styleUrl: './districtmst.component.css'
})
export class DistrictmstComponent implements OnInit {
  @ViewChild('countryNameField') countryNameField!: ElementRef;

  isCreatingNew = false;
  btn: string = '';
  dist_code = 0;

  selectedCountryName = '';
  selectedStateName = '';
  selectedCountryCode: number | null = null;
  selectedStateCode: number | null = null;

  saving = false;
  districts_List: any[] = [];
  loading = false;

  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  data!: FormGroup;

  // used by delete flow so we know which district/state/country to send
  deleteStateCode: number | null = null;
  deleteCountryCode: number | null = null;

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
      DATE: new FormControl('')
    });

    this.loadDistricts();

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
    if (!raw) return { DISTRICT_CODE: 0, DISTRICT_NAME: '', COUNTRY_CODE: 0, COUNTRY_NAME: '', STATE_CODE: 0, STATE_NAME: '' };
    return {
      DISTRICT_CODE: raw.code ?? raw.Code ?? raw.DISTRICT_CODE ?? 0,
      DISTRICT_NAME: String(raw.name ?? raw.Name ?? raw.DISTRICT_NAME ?? ''),
      COUNTRY_CODE: raw.country_Code ?? raw.Country_Code ?? raw.COUNTRY_CODE ?? 0,
      COUNTRY_NAME: String(raw.country_Name ?? raw.Country_Name ?? raw.COUNTRY_NAME ?? ''),
      STATE_CODE: raw.state_Code ?? raw.State_Code ?? raw.STATE_CODE ?? 0,
      STATE_NAME: String(raw.state_Name ?? raw.State_Name ?? raw.STATE_NAME ?? '')
    };
  }

  loadDistricts(): void {
    this.loading = true;
    this.api.get('DistrictMaster/GetAll').subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res) list = [res];
        this.districts_List = (list || []).map((c: any) => this.normalizeServerObject(c));
      },
      error: (err) => {
        console.error('Failed to load Districts', err);
        this.toastr.error('Failed to load districts');
      },
      complete: () => (this.loading = false)
    });
  }

  openCountry() {
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
    if (!this.selectedCountryCode || Number(this.selectedCountryCode) <= 0) {
      this.toastr.error('Please select country first..!');
      return;
    }
    this.api.get('StateMaster/GetState', { countryCode: this.selectedCountryCode }).subscribe({
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

  resetCountryForm(): void {
    this.isCreatingNew = true;
    this.btn = '';
    this.dist_code = 0;
    this.selectedCountryCode = null;
    this.selectedStateCode = null;
    this.selectedCountryName = '';
    this.selectedStateName = '';
    this.data.reset({ DISTRICT_CODE: 0, DISTRICT_NAME: '', COUNTRY_CODE: 0, STATE_CODE: 0 });
    setTimeout(() => this.countryNameField?.nativeElement?.focus?.(), 50);
  }

  // Open form for edit: pass districtCode, stateCode, countryCode
  openInlineForm(distCode: number | null, stateCode: number | null, countryCode: number | null, action: string): void {
    if (distCode === null || distCode === undefined) {
      this.toastr.warning('Invalid district id for edit');
      return;
    }
    this.isCreatingNew = true;
    this.btn = action;
    // store state & country for delete/edit flows
    this.selectedStateCode = stateCode ?? null;
    this.selectedCountryCode = countryCode ?? null;
    this.getDataById(distCode, stateCode ?? 0, countryCode ?? 0);
  }

  // Fetch a district by its id (and use state & country to be safe)
  getDataById(distCode: number, stateCode: number, countryCode: number): void {
    // screenshot showed query param distCode for District get
    this.api.get(`DistrictMaster/GetDistrictById?distCode=${encodeURIComponent(distCode)}&State_Code=${encodeURIComponent(stateCode)}&Country_Code=${encodeURIComponent(countryCode)}`).subscribe({
      next: (res: any) => {
        let objRaw = res;
        if (res?.data && typeof res.data === 'object') objRaw = res.data;
        if (Array.isArray(objRaw) && objRaw.length > 0) objRaw = objRaw[0];

        const obj = this.normalizeServerObject(objRaw);

        this.dist_code = Number(obj.DISTRICT_CODE ?? distCode);
        this.selectedCountryCode = Number(obj.COUNTRY_CODE ?? countryCode);
        this.selectedCountryName = obj.COUNTRY_NAME ?? '';
        this.selectedStateCode = Number(obj.STATE_CODE ?? stateCode);
        this.selectedStateName = obj.STATE_NAME ?? '';

        this.data.patchValue({
          DISTRICT_CODE: this.dist_code,
          DISTRICT_NAME: obj.DISTRICT_NAME,
          COUNTRY_CODE: this.selectedCountryCode || 0,
          STATE_CODE: this.selectedStateCode || 0
        });

        setTimeout(() => this.countryNameField?.nativeElement?.focus?.(), 50);
      },
      error: (err) => {
        console.error('Error loading district', err);
        this.toastr.error('Failed to load district');
      }
    });
  }

  // Save or Update
  submit(): void {
    if (this.data.invalid) {
      this.toastr.warning('Please enter district name', 'Validation');
      this.countryNameField?.nativeElement?.focus?.();
      return;
    }

    const v = this.data.value;
    const payload = {
      country_Code: Number(v.COUNTRY_CODE || this.selectedCountryCode || 0),
      state_Code: Number(v.STATE_CODE || this.selectedStateCode || 0),
      code: Number(v.DISTRICT_CODE || 0),
      name: String(v.DISTRICT_NAME || '').trim()
    };

    this.saving = true;
    const isEdit = payload.code && payload.code > 0;
    const apiCall$ = isEdit
      ? this.api.post('DistrictMaster/Update', payload)
      : this.api.post('DistrictMaster/Save', payload);

    apiCall$.subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? (isEdit ? 'Updated' : 'Saved'));
        this.saving = false;
        this.isCreatingNew = false;
        this.data.reset({ DISTRICT_CODE: 0, DISTRICT_NAME: '', COUNTRY_CODE: 0, STATE_CODE: 0 });
        this.selectedCountryCode = null;
        this.selectedStateCode = null;
        this.selectedCountryName = '';
        this.selectedStateName = '';
        this.loadDistricts();
      },
      error: (err) => {
        console.error('Save error', err);
        this.toastr.error('Failed to save district');
        this.saving = false;
      }
    });
  }

  // Trigger delete modal and store codes to send
  deleteCountry(distCode: number, name: string, stateCode: number, countryCode: number): void {
    if (distCode === null || distCode === undefined) {
      this.toastr.warning('Invalid district id');
      return;
    }
    this.dist_code = distCode;
    this.deleteStateCode = stateCode ?? null;
    this.deleteCountryCode = countryCode ?? null;
    this.data.patchValue({ DISTRICT_NAME: name });

    const modalEl = document.getElementById('deleteConfirmModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    } else {
      if (confirm(`Delete ${name}?`)) this.executeDelete();
    }
  }

  // Delete call with Code, State_Code, Country_Code
  executeDelete(): void {
    if (this.dist_code === null || this.dist_code === undefined) {
      this.toastr.warning('Invalid district selected');
      return;
    }

    const codeQ = this.dist_code;
    const stateQ = this.deleteStateCode ?? this.data.get('STATE_CODE')?.value ?? 0;
    const countryQ = this.deleteCountryCode ?? this.data.get('COUNTRY_CODE')?.value ?? 0;

    const url = `DistrictMaster/Delete?Code=${encodeURIComponent(codeQ)}&State_Code=${encodeURIComponent(stateQ)}&Country_Code=${encodeURIComponent(countryQ)}`;

    this.api.delete(url).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'District deleted');
        this.loadDistricts();
        this.isCreatingNew = false;
        this.dist_code = 0;
        this.deleteStateCode = null;
        this.deleteCountryCode = null;
        this.selectedCountryCode = null;
        this.selectedStateCode = null;
        this.selectedCountryName = '';
        this.selectedStateName = '';
      },
      error: (err) => {
        console.error('Delete error', err);
        this.toastr.error('Failed to delete district');
      }
    });
  }

  filteredCountries() {
    let result = this.districts_List || [];
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter((c: any) =>
        (c.DISTRICT_NAME || '').toLowerCase().includes(s) ||
        String(c.DISTRICT_CODE || '').toLowerCase().includes(s)
      );
    }
    return result;
  }
}
