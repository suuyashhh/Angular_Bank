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
  selector: 'app-talukamst',
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
  templateUrl: './talukamst.component.html',
  styleUrls: ['./talukamst.component.css']
})
export class TalukamstComponent implements OnInit {
  @ViewChild('talukaNameField') talukaNameField!: ElementRef;

  // form + UI state
  data!: FormGroup;
  isCreatingNew = false;
  btn: string = '';
  trn_no = 0;

  loading = false;
  saving = false;

  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  // list
  talukas: any[] = [];
  private rawByTrn = new Map<number, any>();

  // pickers/readouts & codes
  selectedCountryName = '';
  selectedStateName = '';
  selectedDistrictName = '';
  selectedCountryCode: number | null = null;
  selectedStateCode: number | null = null;
  selectedDistrictCode: number | null = null;
  

  // delete flow
  deleteStateCode: number | null = null;
  deleteCountryCode: number | null = null;
  deleteDistrictCode: number | null = null;


  // disable pickers when editing
  pickersDisabled = false;

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    public picker: PickerService,
    private dropdown: DropdownService
  ) { }

  ngOnInit(): void {
    this.data = new FormGroup({
      TRN_NO: new FormControl(0),
      STATE_NAME: new FormControl('', Validators.required), // taluka name
      STATE_CODE: new FormControl(0),
      DIST_CODE: new FormControl(0),
      COUNTRY_CODE: new FormControl(0)
    });

    this.loadTalukas();

    // picker selection subscription (mirrors district component)
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

      if (fld === 'district') {
        if (!option) {
          this.selectedDistrictName = '';
          this.selectedDistrictCode = null;
          this.data.patchValue({ DIST_CODE: 0 });
          return;
        }
        this.selectedDistrictName = option.name;
        this.selectedDistrictCode = Number(option.code ?? 0);
        this.data.patchValue({ DIST_CODE: this.selectedDistrictCode });
      }
    });
  }

  /* ---------------- Normalizer ---------------- */
  private normalizeServerObject(raw: any) {
    if (!raw) return {
      TRN_NO: 0, code: 0, STATE_NAME: '', name: '', COUNTRY_NAME: '', COUNTRY_CODE: 0,
      STATE_CODE: 0, STATE_NAME_DISPLAY: '', DIST_CODE: 0, DISTRICT_NAME: ''
    };

    const trn = raw.code ?? raw.Code ?? raw.TRN_NO ?? raw.TRNNO ?? 0;
    return {
      TRN_NO: trn,
      code: trn,
      STATE_NAME: String(raw.STATE_NAME ?? raw.name ?? raw.Name ?? ''),
      name: String(raw.name ?? raw.STATE_NAME ?? raw.Name ?? ''),
      COUNTRY_CODE: Number(raw.COUNTRY_CODE ?? raw.country_Code ?? raw.countryCode ?? 0),
      COUNTRY_NAME: String(raw.COUNTRY_NAME ?? raw.country_Name ?? raw.countryName ?? ''),
      STATE_CODE: Number(raw.STATE_CODE ?? raw.state_Code ?? raw.stateCode ?? 0),
      STATE_NAME_DISPLAY: String(raw.STATE_NAME_DISPLAY ?? raw.state_Name ?? raw.stateName ?? ''),
      DIST_CODE: Number(raw.DIST_CODE ?? raw.dist_code ?? raw.distCode ?? 0),
      DISTRICT_NAME: String(raw.DISTRICT_NAME ?? raw.district_Name ?? raw.districtName ?? ''),
      __raw: raw
    };
  }

  /* ---------------- Load talukas ---------------- */
  loadTalukas(): void {
    this.loading = true;
    this.api.get('TalukaMaster/GetAll').subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res && typeof res === 'object') list = [res];
        else list = [];

        this.rawByTrn.clear();
        this.talukas = (list || []).map((c: any) => {
          const norm = this.normalizeServerObject(c);
          const key = Number(norm.TRN_NO || norm.code || 0);
          if (key) this.rawByTrn.set(key, c);
          return norm;
        });
      },
      error: (err) => {
        console.error('Failed to load talukas', err);
        this.toastr.error('Failed to load talukas');
      },
      complete: () => (this.loading = false)
    });
  }

  /* ---------------- Picker openers (respect pickersDisabled) ---------------- */
  openCountry() {
    if (this.pickersDisabled) return;
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
            // reset dependent selections
            this.selectedStateCode = null; this.selectedStateName = '';
            this.selectedDistrictCode = null; this.selectedDistrictName = '';
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



  openDistrict() {
    if (this.pickersDisabled) return;
    this.api.get('DistrictMaster/GetAll').subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : (res ? [res] : []));
        const list = raw.map((x: any) => ({
          code: Number(x.code ?? x.Code ?? x.DISTRICT_CODE ?? x.DIST_CODE ?? 0),
          name: String(x.name ?? x.Name ?? x.district_Name ?? x.DISTRICT_NAME ?? ''),
          stateCode: Number(x.state_Code ?? x.State_Code ?? x.STATE_CODE ?? 0),
          countryCode: Number(x.country_Code ?? x.Country_Code ?? x.COUNTRY_CODE ?? 0)
        }));
        const filtered = list.filter((l: any) =>
          (this.selectedCountryCode ? l.countryCode === this.selectedCountryCode : true) &&
          (this.selectedStateCode ? l.stateCode === this.selectedStateCode : true)
        );
        this.dropdown.openPicker('district', filtered).then(sel => {
          if (sel) {
            this.selectedDistrictName = sel.name;
            this.selectedDistrictCode = Number(sel.code ?? 0);
            this.data.patchValue({ DIST_CODE: this.selectedDistrictCode });
          }
        });
      },
      error: () => this.toastr.error('Failed to load Districts.')
    });
  }

  /* ---------------- Helpers to disable/enable pickers + form controls ---------------- */
  private setPickersDisabled(disabled: boolean) {
    this.pickersDisabled = disabled;
    const ctrlNames = ['COUNTRY_CODE', 'STATE_CODE', 'DIST_CODE'];
    ctrlNames.forEach(n => {
      const c = this.data.get(n);
      if (!c) return;
      if (disabled) c.disable({ emitEvent: false });
      else c.enable({ emitEvent: false });
    });
    // make sure name control is enabled (editable) in all create/edit flows
    const nameCtrl = this.data.get('STATE_NAME');
    if (nameCtrl) {
      if (disabled && nameCtrl.disabled) nameCtrl.enable({ emitEvent: false });
    }
  }

  /* ---------------- New / Edit flows ---------------- */
  resetTalukaForm(): void {
    this.isCreatingNew = true;
    this.btn = '';
    this.trn_no = 0;
    this.selectedCountryCode = null;
    this.selectedStateCode = null;
    this.selectedDistrictCode = null;
    this.selectedCountryName = '';
    this.selectedStateName = '';
    this.selectedDistrictName = '';
    this.setPickersDisabled(false);
    this.data.reset({ TRN_NO: 0, STATE_NAME: '', STATE_CODE: 0, DIST_CODE: 0, COUNTRY_CODE: 0 });
    setTimeout(() => this.talukaNameField?.nativeElement?.focus?.(), 50);
  }

  // Open inline form for edit - will fetch full record and then lock pickers
  openInlineForm(trn: number | null, stateCode: number | null, distCode: number | null, countryCode: number | null, action: string): void {
 
    if (trn === null || trn === undefined) {
      this.toastr.warning('Invalid taluka id for edit');
      return;
    }

    this.isCreatingNew = true;
    this.btn = action || 'E';

    
    // store fallbacks
    this.selectedCountryCode = countryCode ?? null;
    this.selectedStateCode = stateCode ?? null;
    this.selectedDistrictCode = distCode ?? null;

    // debug

    // fetch full record
    this.getDataById(Number(trn), Number(stateCode ?? 0), Number(distCode ?? 0), Number(countryCode ?? 0));
  }

  getDataById(trn: number, stateCode: number, distCode: number, countryCode: number): void {
    // Show loading so user knows something is happening
    this.loading = true;
    const url = `TalukaMaster/GetTalukaById?talukaCode=${encodeURIComponent(trn)}&State_Code=${encodeURIComponent(stateCode)}&Dist_code=${encodeURIComponent(distCode)}&Country_Code=${encodeURIComponent(countryCode)}`;
    console.debug('[Taluka] fetching', url);

    this.api.get(url).subscribe({
      next: (res: any) => {
        console.debug('[Taluka] raw response', res);

        // normalize to a single object (accept array, { data: obj }, obj)
        let objRaw: any = res;
        if (res && typeof res === 'object' && 'data' in res) {
          objRaw = res.data;
        }
        if (Array.isArray(objRaw)) objRaw = objRaw.length ? objRaw[0] : null;

        if (!objRaw) {
          console.warn('[Taluka] getDataById: no object found in response', res);
          this.toastr.error('No taluka data returned by server');
          return;
        }

        // resilient extraction of fields
        const obj = this.normalizeServerObject(objRaw);
        console.debug('[Taluka] normalized object', obj);

        // populate readouts & codes
        this.trn_no = Number(obj.TRN_NO ?? trn);
        this.selectedCountryCode = Number(obj.COUNTRY_CODE ?? countryCode ?? 0) || null;
        this.selectedCountryName = obj.COUNTRY_NAME ?? (obj.__raw?.country_Name ?? '') ?? '';
        this.selectedStateCode = Number(obj.STATE_CODE ?? stateCode ?? 0) || null;
        this.selectedStateName = obj.STATE_NAME_DISPLAY ?? (obj.__raw?.state_Name ?? '') ?? '';
        this.selectedDistrictCode = Number(obj.DIST_CODE ?? distCode ?? 0) || null;
        this.selectedDistrictName = obj.DISTRICT_NAME ?? (obj.__raw?.district_Name ?? '') ?? '';

        // patch the form controls (hidden numeric controls + name)
        // Use 0 fallback so form has some numeric value (keeps types consistent)
        this.data.patchValue({
          TRN_NO: this.trn_no || 0,
          STATE_NAME: obj.STATE_NAME ?? obj.name ?? '',
          STATE_CODE: this.selectedStateCode ?? 0,
          DIST_CODE: this.selectedDistrictCode ?? 0,
          COUNTRY_CODE: this.selectedCountryCode ?? 0
        });

        // disable pickers so they cannot be changed in edit mode,
        // but ensure the name field remains enabled
        this.setPickersDisabled(true);
        const nameCtrl = this.data.get('STATE_NAME');
        if (nameCtrl && nameCtrl.disabled) {
          nameCtrl.enable({ emitEvent: false });
        }

        // tiny UX: focus the name field
        setTimeout(() => this.talukaNameField?.nativeElement?.focus?.(), 50);
      },
      error: (err) => {
        console.error('[Taluka] getDataById error', err);
        this.toastr.error('Failed to load taluka');
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  /* ---------------- Save / Update ---------------- */
  submit(): void {
    if (this.data.invalid) {
      this.toastr.warning('Please enter taluka name', 'Validation');
      this.talukaNameField?.nativeElement?.focus?.();
      return;
    }

    const v = this.data.value;
   
    const payload = {
      Country_Code: Number(v.COUNTRY_CODE || this.selectedCountryCode || 0),
      State_Code: Number(v.STATE_CODE || this.selectedStateCode || 0),
      Dist_code: Number(v.DIST_CODE || this.selectedDistrictCode || 0),
      Code: Number(v.TRN_NO || this.trn_no || 0),
      name: String(v.STATE_NAME || '').trim()
    };

    this.saving = true;
    const isEdit = payload.Code && payload.Code > 0;
    
    const apiCall$ = isEdit ? this.api.post('TalukaMaster/Update', payload) : this.api.post('TalukaMaster/Save', payload);

    apiCall$.subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? (isEdit ? 'Updated' : 'Saved'));
        this.saving = false;
        this.isCreatingNew = false;
        this.data.reset({ TRN_NO: 0, STATE_NAME: '', STATE_CODE: 0, DIST_CODE: 0, COUNTRY_CODE: 0 });
        this.selectedCountryCode = null;
        this.selectedStateCode = null;
        this.selectedDistrictCode = null;
        this.selectedCountryName = '';
        this.selectedStateName = '';
        this.selectedDistrictName = '';
        this.setPickersDisabled(false);
        this.loadTalukas();
      },
      error: (err) => {
        console.error('Save error', err);
        this.toastr.error(err?.error?.title ?? err?.message ?? 'Failed to save taluka');
        this.saving = false;
      }
    });
  }

  /* ---------------- Delete ---------------- */
 /**
 * Open delete flow for a taluka.
 * Now accepts and stores DIST_CODE as well as STATE_CODE and COUNTRY_CODE.
 */
deleteTaluka(trn: number, name: string, distCode: number, stateCode: number, countryCode: number): void {
  if (trn === null || trn === undefined) {
    this.toastr.warning('Invalid taluka id');
    return;
  }

  // store identifiers for executeDelete()
  this.trn_no = Number(trn);
  this.deleteDistrictCode = (distCode ?? 0) ? Number(distCode) : null; // <-- NEW
  this.deleteStateCode = (stateCode ?? 0) ? Number(stateCode) : null;
  this.deleteCountryCode = (countryCode ?? 0) ? Number(countryCode) : null;

  // optionally patch the form so the modal shows the values if you display them
  this.data.patchValue({
    STATE_NAME: name,
    DIST_CODE: this.deleteDistrictCode ?? this.data.get('DIST_CODE')?.value ?? 0,
    STATE_CODE: this.deleteStateCode ?? this.data.get('STATE_CODE')?.value ?? 0,
    COUNTRY_CODE: this.deleteCountryCode ?? this.data.get('COUNTRY_CODE')?.value ?? 0
  });

  // show modal (bootstrap) or fallback confirm
  const modalEl = document.getElementById('deleteConfirmModal');
  if (modalEl) {
    const modal = new (window as any).bootstrap.Modal(modalEl);
    modal.show();
  } else {
    if (confirm(`Delete ${name}?`)) this.executeDelete();
  }
}


 executeDelete(): void {
  if (!this.trn_no) {
    this.toastr.warning('Invalid taluka selected');
    return;
  }

  const codeQ = this.trn_no;
  const distQ = this.deleteDistrictCode;
  const stateQ = this.deleteStateCode;
  const countryQ = this.deleteCountryCode;

  const url = `TalukaMaster/Delete/${codeQ}?Dist_code=${distQ}&State_Code=${stateQ}&Country_Code=${countryQ}`;

  this.api.delete(url).subscribe({
    next: () => {
      this.toastr.success('Taluka deleted');
      this.loadTalukas();
    },
    error: () => this.toastr.error('Failed to delete taluka')
  });
}


  /* ---------------- Filtering ---------------- */
  filteredTaluka() {
    let result = this.talukas || [];
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter((c: any) =>
        (String(c.STATE_NAME || c.name || '')).toLowerCase().includes(s) ||
        (String(c.DISTRICT_NAME || c.district_Name || '')).toLowerCase().includes(s) ||
        (String(c.COUNTRY_NAME || c.country_Name || '')).toLowerCase().includes(s) ||
        (String(c.TALUKA_NAME || c.taluka_Name || '')).toLowerCase().includes(s) ||
        String(c.TRN_NO || c.code || '').toLowerCase().includes(s)
      );
    }
    return result;
  }

  /** Called by template to cancel / close the inline form or after successful save/update */
  afterSaveOrUpdateCleanup(): void {
    // Close the form UI
    this.isCreatingNew = false;
    this.btn = '';
    this.trn_no = 0;

    // Re-enable pickers and reset form values
    this.setPickersDisabled(false);

    // Reset the reactive form to default values
    this.data.reset({ TRN_NO: 0, STATE_NAME: '', STATE_CODE: 0, DIST_CODE: 0, COUNTRY_CODE: 0 });

    // Clear selected readouts
    this.selectedCountryCode = null;
    this.selectedStateCode = null;
    this.selectedDistrictCode = null;
    this.selectedCountryName = '';
    this.selectedStateName = '';
    this.selectedDistrictName = '';

    // Stop any saving flag (defensive)
    this.saving = false;

    // Optionally refresh list to reflect any external changes
    this.loadTalukas();
  }

}
