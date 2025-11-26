import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { PickerService } from '../../../services/picker.service';
import { PickerModalComponent } from '../../../shared/picker-modal/picker-modal.component';
import { DropdownOption, DropdownService } from '../../../shared/services/dropdown.service';
import { DropdpwnModalComponent } from "../../../shared/dropdpwn-modal/dropdpwn-modal.component";

@Component({
  selector: 'app-statemst',
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
  templateUrl: './statemst.component.html',
  styleUrl: './statemst.component.css'
})
export class StatemstComponent implements OnInit {
  @ViewChild('stateNameField') stateNameField!: ElementRef;

  isCreatingNew = false;
  btn: 'E' | 'N' | '' = '';
  trn_no = 0;

  selectedCountryName = '';
  selectedCountryCode: number | null = null;
  saving = false;

  states: any[] = [];
  countryList: Array<{ name: string; code: number }> = [];

  loading = false;

  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  data!: FormGroup;

  selectedCountry: DropdownOption | null = null;

  rawApiObjectPreview = '';
  private lastFetchedRaw: any | null = null;

  constructor(private api: ApiService, private toastr: ToastrService, public picker: PickerService, public dropdown: DropdownService) {}

  ngOnInit(): void {
    // Create the form. TRN_NO will be disabled so users can't type it (both on create & edit).
    this.data = new FormGroup({
      TRN_NO: new FormControl({ value: 0, disabled: true }), // disabled by default
      STATE_NAME: new FormControl('', Validators.required),
      COUNTRY_CODE: new FormControl(null)
    });

    // Load server data
    this.loadCountries();
    this.loadStates();

    // picker subscription (if used elsewhere)
    this.picker.resetSelections();
    this.picker.pickerSelected$.subscribe(sel => {
      if (!sel) return;
      const { field, option, target } = sel;
      if (target === 'primary' && field === 'country') {
        if (!option) {
          this.selectedCountryName = '';
          this.selectedCountryCode = null;
          this.data.patchValue({ COUNTRY_CODE: null });
          return;
        }
        const rawCode = (option as any)['code'] ?? (option as any)['Code'] ?? (option as any)['value']?.['code'] ?? (option as any)['value']?.['Code'] ?? 0;
        const numCode = Number(rawCode) || 0;
        this.selectedCountryName = (option as any)['name'] ?? (option as any)['Name'] ?? '';
        this.selectedCountryCode = numCode;
        this.data.patchValue({ COUNTRY_CODE: numCode });
      }
    });
  }

  /* ---------- Helpers & API calls (unchanged behaviors) ---------- */

  private normalizeServerObject(raw: any) {
    if (!raw) return { TRN_NO: 0, code: 0, STATE_NAME: '', name: '', COUNTRY_CODE: null, country_Code: null, COUNTRY_NAME: '', country_Name: '' };

    const rawCode = (raw as any)['Code'] ?? (raw as any)['code'] ?? (raw as any)['trn_no'] ?? (raw as any)['TRN_NO'] ?? (raw as any)['id'] ?? null;
    const trnNo = rawCode !== null && rawCode !== undefined && rawCode !== '' ? Number(rawCode) : 0;
    const rawName = (raw as any)['Name'] ?? (raw as any)['name'] ?? (raw as any)['STATE_NAME'] ?? (raw as any)['stateName'] ?? '';
    const rawCountryCode = (raw as any)['Country_Code'] ?? (raw as any)['COUNTRY_CODE'] ?? (raw as any)['country_Code'] ?? (raw as any)['countryCode'] ?? null;
    const rawCountryName = (raw as any)['Country_Name'] ?? (raw as any)['COUNTRY_NAME'] ?? (raw as any)['countryName'] ?? '';

    return {
      TRN_NO: trnNo,
      STATE_NAME: String(rawName),
      COUNTRY_CODE: rawCountryCode,
      COUNTRY_NAME: rawCountryName,
      code: trnNo,
      name: String(rawName),
      country_Code: rawCountryCode,
      country_Name: rawCountryName
    };
  }

  loadStates(): void {
    this.loading = true;
    this.api.get('StateMaster/GetAll').subscribe({
      next: (res: any) => {
        try {
          let list: any[] = [];
          if (Array.isArray(res)) list = res;
          else if (Array.isArray((res as any)?.data)) list = (res as any).data;
          else if (res && typeof res === 'object' &&
                   (((res as any)['Code'] !== undefined) || ((res as any)['code'] !== undefined) || ((res as any)['Name'] !== undefined) || ((res as any)['name'] !== undefined) || ((res as any)['Country_Code'] !== undefined) || ((res as any)['country_Code'] !== undefined))) {
            list = [res];
          } else list = [];

          this.states = (list || []).map((c: any) => this.normalizeServerObject(c));
        } catch (err) {
          console.error('Error parsing GetAll response', err);
          this.toastr.error('Failed to parse states response');
        }
      },
      error: (err) => {
        console.error('Failed to load states (GET StateMaster/GetAll):', err);
        this.toastr.error(`Failed to load states: ${err?.message ?? err?.statusText ?? 'Unknown error'}`);
      },
      complete: () => (this.loading = false)
    });
  }

  loadCountries(): void {
    this.api.get('CountryMaster/GetAll').subscribe({
      next: (res: any) => {
        try {
          let list: any[] = [];
          if (Array.isArray(res)) list = res;
          else if (Array.isArray((res as any)?.data)) list = (res as any).data;
          else if (res && typeof res === 'object' &&
                   (((res as any)['Code'] !== undefined) || ((res as any)['code'] !== undefined) || ((res as any)['Name'] !== undefined) || ((res as any)['name'] !== undefined))) {
            list = [res];
          } else list = [];

          this.countryList = list.map(c => {
            const name = (c as any)['Name'] ?? (c as any)['name'] ?? (c as any)['Country_Name'] ?? (c as any)['country_Name'] ?? '';
            const code = Number((c as any)['Code'] ?? (c as any)['code'] ?? (c as any)['Country_Code'] ?? (c as any)['country_Code'] ?? 0) || 0;
            return { name, code };
          }).filter(x => x.code && x.name);

          console.log('Loaded countries:', this.countryList);
        } catch (err) {
          console.error('Error parsing Country list', err);
          this.toastr.error('Failed to load countries');
        }
      },
      error: (err) => {
        console.error('Failed to load countries (GET CountryMaster/GetAll):', err);
        this.toastr.error('Failed to load countries');
      }
    });
  }

  resetStateForm(mode: 'N' | 'E' = 'N'): void {
    this.isCreatingNew = true;
    this.btn = mode;
    this.trn_no = 0;
    this.selectedCountryName = '';
    this.selectedCountryCode = null;
    this.rawApiObjectPreview = '';
    this.lastFetchedRaw = null;

    // ensure TRN_NO is disabled so user can't type it (for both new and edit)
    const trnCtrl = this.data.get('TRN_NO');
    trnCtrl?.disable();

    // reset other fields
    this.data.patchValue({ STATE_NAME: '', COUNTRY_CODE: null, TRN_NO: 0 });

    setTimeout(() => this.stateNameField?.nativeElement?.focus?.(), 50);
  }

  closeForm(): void {
    this.isCreatingNew = false;
    this.btn = '';
    this.lastFetchedRaw = null;
  }

  openInlineForm(stateCode: number | null, countryCode: number | null, action: string): void {
    if (stateCode === null || stateCode === undefined) {
      this.toastr.warning('Invalid state id for edit');
      return;
    }
    this.isCreatingNew = true;
    this.btn = 'E';
    // keep TRN_NO disabled, but set value after fetching
    const trnCtrl = this.data.get('TRN_NO');
    trnCtrl?.disable();
    this.getDataById(stateCode as number, Number(countryCode) || 0);
  }

  getDataById(stateCode: number, countryCode: number): void {
    if (stateCode === null || stateCode === undefined) {
      this.toastr.warning('Invalid id for fetch');
      return;
    }

    const url = `StateMaster/GetStateById?stateCode=${stateCode}&countryCode=${countryCode}`;
    this.api.get(url).subscribe({
      next: (res: any) => {
        let objRaw: any = null;

        if (res === null || res === undefined) {
          this.toastr.error('State not found (empty response)');
          return;
        }

        if (typeof res === 'object' && ('body' in res) && (res as any).body !== undefined && (res as any).body !== null) {
          objRaw = (res as any).body;
        } else if ((res as any)?.data !== undefined && (res as any).data !== null) {
          objRaw = (res as any).data;
        } else {
          objRaw = res;
        }

        if (typeof objRaw === 'string') {
          try { objRaw = JSON.parse(objRaw); } catch { /* keep string */ }
        }

        if (Array.isArray(objRaw) && objRaw.length > 0) objRaw = objRaw[0];

        if (objRaw === null || objRaw === undefined || (typeof objRaw === 'object' && Object.keys(objRaw).length === 0)) {
          this.toastr.error('State not found (empty response object)');
          return;
        }

        try { this.rawApiObjectPreview = JSON.stringify(objRaw, null, 2); } catch { this.rawApiObjectPreview = String(objRaw); }
        this.lastFetchedRaw = objRaw;

        const obj = this.normalizeServerObject(objRaw);
        this.trn_no = obj.TRN_NO ?? stateCode;
        this.selectedCountryName = obj.country_Name ?? obj.COUNTRY_NAME ?? '';
        this.selectedCountryCode = Number(obj.COUNTRY_CODE ?? obj.country_Code ?? null) || null;

        // TRN_NO control is disabled; set value with setValue()
        this.data.get('TRN_NO')?.setValue(obj.TRN_NO);
        this.data.patchValue({
          STATE_NAME: obj.STATE_NAME,
          COUNTRY_CODE: obj.COUNTRY_CODE
        });

        const idx = this.states.findIndex(s => (s.TRN_NO || s.code) === (obj.TRN_NO || obj.code));
        if (idx >= 0) this.states[idx] = obj;
        else this.states.unshift(obj);

        setTimeout(() => this.stateNameField?.nativeElement?.focus?.(), 50);
      },
      error: (err) => {
        console.error(`Failed to load state stateCode=${stateCode} countryCode=${countryCode}:`, err);
        this.toastr.error(`Failed to load state: ${err?.message ?? err?.statusText ?? 'Unknown error'}`);
      }
    });
  }

  submit(): void {
    if (this.data.invalid) {
      this.toastr.warning('Please enter state name', 'Validation');
      this.stateNameField?.nativeElement?.focus?.();
      return;
    }

    const trnNoFromForm = Number(this.data.get('TRN_NO')?.value) || 0;
    const name = String(this.data.get('STATE_NAME')?.value || '').trim();
    const countryCodeFromForm = Number(this.data.get('COUNTRY_CODE')?.value) || 0;

    const countryNameFromLast = (this.lastFetchedRaw as any)?.['Country_Name'] ?? (this.lastFetchedRaw as any)?.['country_Name'] ?? (this.lastFetchedRaw as any)?.['countryName'] ?? '';
    const country_Name = this.selectedCountryName || countryNameFromLast || '';

    if (!countryCodeFromForm) {
      this.toastr.warning('Please select or provide a Country (Country Code is required).');
      return;
    }

    this.saving = true;
    const isEditMode = this.btn === 'E';

    const payloadBase = (this.lastFetchedRaw && typeof this.lastFetchedRaw === 'object') ? { ...(this.lastFetchedRaw as any) } : {};
    const payload: any = {
      ...payloadBase,
      Country_Code: Number(countryCodeFromForm),
      Country_Name: country_Name,
      Code: isEditMode ? (trnNoFromForm || (payloadBase as any)['Code'] || (payloadBase as any)['code'] || 0) : 0,
      Name: name
    };

    // clean duplicates
    delete (payload as any)['country_Code'];
    delete (payload as any)['country_Name'];
    delete (payload as any)['code'];
    delete (payload as any)['name'];

    if (isEditMode) {
      this.api.post('StateMaster/Update', payload).subscribe({
        next: (res: any) => {
          this.toastr.success(res?.message ?? 'Updated');
          this.saving = false;
          this.isCreatingNew = false;
          this.lastFetchedRaw = null;
          this.rawApiObjectPreview = '';
          this.data.get('TRN_NO')?.setValue(0);
          this.data.patchValue({ STATE_NAME: '', COUNTRY_CODE: null });
          this.btn = '';
          this.loadStates();
        },
        error: (err) => {
          console.error('Update error', err);
          this.toastr.error(`Failed to update state: ${err?.message ?? err?.statusText ?? 'Unknown error'}`);
          this.saving = false;
        }
      });
      return;
    }

    const savePayload = {
      Country_Code: Number(countryCodeFromForm),
      Country_Name: country_Name,
      Code: 0,
      Name: name
    };

    this.api.post('StateMaster/Save', savePayload).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'Saved');
        this.saving = false;
        this.isCreatingNew = false;
        this.rawApiObjectPreview = '';
        this.data.get('TRN_NO')?.setValue(0);
        this.data.patchValue({ STATE_NAME: '', COUNTRY_CODE: null });
        this.btn = '';
        this.loadStates();
      },
      error: (err) => {
        console.error('Save error', err);
        this.toastr.error(`Failed to save state: ${err?.message ?? err?.statusText ?? 'Unknown error'}`);
        this.saving = false;
      }
    });
  }

  deleteState(stateCode: number | null, stateName: string, countryCode?: number | null): void {
    if (stateCode === null || stateCode === undefined) {
      this.toastr.warning('Invalid state id');
      return;
    }
    this.trn_no = stateCode as number;
    this.data.patchValue({ STATE_NAME: stateName });

    const modalEl = document.getElementById('deleteConfirmModal');
    this.selectedCountryCode = countryCode ?? this.selectedCountryCode;

    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    } else {
      if (confirm(`Delete ${stateName}?`)) this.executeDelete();
    }
  }

  executeDelete(): void {
    if (this.trn_no === null || this.trn_no === undefined) {
      this.toastr.warning('Invalid state selected');
      return;
    }
    const countryCode = Number(this.selectedCountryCode) || 0;
    if (!countryCode) {
      this.toastr.warning('Country code required to delete');
      return;
    }

    const url = `StateMaster/Delete/${this.trn_no}?countryCode=${countryCode}`;
    this.api.delete(url).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'State deleted');
        this.loadStates();
        this.isCreatingNew = false;
        this.trn_no = 0;
        this.lastFetchedRaw = null;
        this.btn = '';
      },
      error: (err) => {
        console.error('Delete error', err);
        this.toastr.error(`Failed to delete state: ${err?.message ?? err?.statusText ?? 'Unknown error'}`);
      }
    });
  }

  filteredStates() {
    let result = this.states || [];
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter((c: any) =>
        (c.STATE_NAME || c.name || '').toLowerCase().includes(s) ||
        String(c.TRN_NO || c.code || '').toLowerCase().includes(s) ||
        (String(c.COUNTRY_NAME || c.country_Name || '')).toLowerCase().includes(s) ||
        String(c.COUNTRY_CODE || c.country_Code || '').toLowerCase().includes(s)
      );
    }
    return result;
  }

  openCountry() {
    // If editing, do not allow changing country
    if (this.btn === 'E') {
      this.toastr.info('Country cannot be changed while editing an existing state.');
      return;
    }

    const list = (this.countryList || []).map(c => ({ name: c.name, code: c.code }));
    if (!list.length) {
      this.toastr.info('Country list not loaded — fetching now...');
      this.loadCountries();
    }

    this.dropdown.openPicker('Country', list).then(sel => {
      if (!sel) return;
      const rawCode = (sel as any)['code'] ?? (sel as any)['Code'] ?? (sel as any)['value']?.['code'] ?? (sel as any)['value']?.['Code'] ?? 0;
      const numCode = Number(rawCode) || 0;

      this.selectedCountry = { name: (sel as any)['name'] ?? (sel as any)['Name'] ?? '', code: numCode };
      this.selectedCountryName = (sel as any)['name'] ?? (sel as any)['Name'] ?? '';
      this.selectedCountryCode = numCode;

      this.data.patchValue({ COUNTRY_CODE: numCode });
      console.log('selectedCountryCode set to', numCode);
    });
  }
}
