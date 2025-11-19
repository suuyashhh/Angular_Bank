import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-talukamst',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgxPaginationModule],
  templateUrl: './talukamst.component.html',
  styleUrls: ['./talukamst.component.css']
})
export class TalukamstComponent implements OnInit {
  @ViewChild('talukaNameField') talukaNameField!: ElementRef;

  // Reactive form
  data!: FormGroup;

  // UI state
  loading = false;
  saving = false;
  isCreatingNew = false;
  btn: 'E' | 'N' | '' = '';
  trn_no = 0;

  // Data lists
  talukas: any[] = [];
  private rawByTrn = new Map<number, any>();

  // Select options (derived from taluka list)
  countryOptions: Array<{ name: string; code: number }> = [];
  stateOptions: Array<{ name: string; code: number; countryCode: number }> = [];
  districtOptions: Array<{ name: string; code: number; stateCode: number; countryCode: number }> = [];

  // Selected names & codes for UI
  selectedCountryName = '';
  selectedCountryCode: number | null = null;
  selectedStateName = '';
  selectedStateCode: number | null = null;
  selectedDistrictName = '';
  selectedDistrictCode: number | null = null;

  // Server errors / preview
  serverErrors: Record<string, string[]> = {};
  rawApiObjectPreview = '';
  lastFetchedRaw: any | null = null;

  // Pagination & search
  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  constructor(private api: ApiService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.data = new FormGroup({
      TRN_NO: new FormControl({ value: 0, disabled: true }),
      STATE_NAME: new FormControl('', Validators.required),   // taluka name
      STATE_CODE: new FormControl(null, Validators.required), // numeric state code
      DIST_CODE: new FormControl(null, Validators.required),  // numeric district code
      COUNTRY_CODE: new FormControl(null, Validators.required) // numeric country code
    });

    this.loadState();
  }

  /* ---------- Load talukas & build select option lists ---------- */

  loadState(): void {
    this.loading = true;
    this.api.get('TalukaMaster/GetAll').subscribe({
      next: (res: any) => {
        try {
          let list: any[] = [];
          if (Array.isArray(res)) list = res;
          else if (Array.isArray((res as any)?.data)) list = (res as any).data;
          else if (res && typeof res === 'object') list = [res];
          else list = [];

          this.rawByTrn.clear();
          this.talukas = (list || []).map((c: any) => {
            const norm = this.normalizeServerObject(c);
            const key = Number(norm.TRN_NO || norm.code || 0);
            if (key) this.rawByTrn.set(key, c);
            return norm;
          });

          // Build options deduped from taluka list:
          this.buildSelectOptionsFromTalukas(this.talukas);
        } catch (err) {
          console.error('Error parsing talukas', err);
          this.toastr.error('Failed to parse talukas');
        }
      },
      error: (err) => {
        console.error('Failed to load talukas', err);
        this.toastr.error('Failed to load talukas');
      },
      complete: () => (this.loading = false)
    });
  }

  private buildSelectOptionsFromTalukas(talukas: any[]) {
    const countryMap = new Map<number, string>();
    const stateMap = new Map<string, { code: number; name: string; countryCode: number }>();
    const districtMap = new Map<string, { code: number; name: string; stateCode: number; countryCode: number }>();

    for (const r of talukas) {
      const countryCode = Number(r.COUNTRY_CODE ?? r.country_Code ?? r['country_Code'] ?? r['countryCode'] ?? 0) || 0;
      const stateCode = Number(r.STATE_CODE ?? r.state_Code ?? r['state_Code'] ?? r['stateCode'] ?? 0) || 0;
      const distCode = Number(r.DIST_CODE ?? r.dist_code ?? r['dist_code'] ?? r['distCode'] ?? 0) || 0;
      const countryName = (r.COUNTRY_NAME ?? r.country_Name ?? r['country_Name'] ?? r['countryName'] ?? '') || '';
      const stateName = (r.STATE_NAME ?? r.state_Name ?? r['state_Name'] ?? r['stateName'] ?? '') || '';
      const districtName = (r.DISTRICT_NAME ?? r.district_Name ?? r['district_Name'] ?? r['districtName'] ?? '') || '';

      if (countryCode && countryName) countryMap.set(countryCode, countryName);
      if (stateCode && stateName) stateMap.set(`${countryCode}_${stateCode}`, { code: stateCode, name: stateName, countryCode });
      if (distCode && districtName) districtMap.set(`${countryCode}_${stateCode}_${distCode}`, { code: distCode, name: districtName, stateCode, countryCode });
    }

    this.countryOptions = Array.from(countryMap.entries()).map(([code, name]) => ({ name, code }))
      .sort((a, b) => a.name.localeCompare(b.name));

    this.stateOptions = Array.from(stateMap.values()).map(v => ({ name: v.name, code: v.code, countryCode: v.countryCode }))
      .sort((a, b) => a.name.localeCompare(b.name));

    this.districtOptions = Array.from(districtMap.values()).map(v => ({ name: v.name, code: v.code, stateCode: v.stateCode, countryCode: v.countryCode }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /* ---------- Normalizer ---------- */

  private normalizeServerObject(raw: any) {
    if (!raw) {
      return {
        TRN_NO: 0,
        code: 0,
        STATE_NAME: '',
        name: '',
        COUNTRY_NAME: '',
        COUNTRY_CODE: null,
        STATE_CODE: null,
        DIST_CODE: null,
        DISTRICT_NAME: ''
      };
    }

    const trn = Number(raw['code'] ?? raw['Code'] ?? 0) || 0;
    const name = raw['name'] ?? raw['Name'] ?? '';
    const countryCode = Number(raw['country_Code'] ?? raw['countryCode'] ?? raw['country_Code'] ?? 0) || 0;
    const stateCode = Number(raw['state_Code'] ?? raw['stateCode'] ?? raw['State_Code'] ?? 0) || 0;
    const distCode = Number(raw['dist_code'] ?? raw['distCode'] ?? raw['Dist_code'] ?? 0) || 0;
    const countryName = raw['country_Name'] ?? raw['Country_Name'] ?? raw['countryName'] ?? '';
    const stateName = raw['state_Name'] ?? raw['State_Name'] ?? raw['stateName'] ?? '';
    const districtName = raw['district_Name'] ?? raw['District_Name'] ?? raw['districtName'] ?? '';

    return {
      TRN_NO: trn,
      code: trn,
      STATE_NAME: String(name),
      name: String(name),
      COUNTRY_CODE: countryCode || null,
      country_Code: countryCode || null,
      COUNTRY_NAME: String(countryName || ''),
      country_Name: String(countryName || ''),
      STATE_CODE: stateCode || null,
      state_code: stateCode || null,
      STATE_NAME_DISPLAY: String(stateName || ''),
      DIST_CODE: distCode || null,
      dist_code: distCode || null,
      DISTRICT_NAME: String(districtName || ''),
      __raw: raw
    };
  }

  /* ---------- Select handlers ---------- */

  onCountryChange(countryCodeStr: any) {
    const countryCode = Number(countryCodeStr) || 0;
    this.selectedCountryCode = countryCode || null;
    this.selectedCountryName = this.countryOptions.find(c => c.code === countryCode)?.name ?? '';
    this.selectedStateCode = null; this.selectedStateName = '';
    this.selectedDistrictCode = null; this.selectedDistrictName = '';
    this.data.get('STATE_CODE')?.setValue(null);
    this.data.get('DIST_CODE')?.setValue(null);
  }

  onStateChange(stateCodeStr: any) {
    const stateCode = Number(stateCodeStr) || 0;
    this.selectedStateCode = stateCode || null;
    this.selectedStateName = this.stateOptions.find(s => s.code === stateCode && s.countryCode === (this.selectedCountryCode ?? 0))?.name ?? '';
    this.selectedDistrictCode = null; this.selectedDistrictName = '';
    this.data.get('DIST_CODE')?.setValue(null);
  }

  onDistrictChange(distCodeStr: any) {
    const distCode = Number(distCodeStr) || 0;
    this.selectedDistrictCode = distCode || null;
    this.selectedDistrictName = this.districtOptions.find(d => d.code === distCode && d.stateCode === (this.selectedStateCode ?? 0) && d.countryCode === (this.selectedCountryCode ?? 0))?.name ?? '';
  }

  /* ---------- Submit ---------- */

  submit(): void {
    this.serverErrors = {};
    if (this.data.invalid) {
      this.toastr.warning('Please fill required fields', 'Validation');
      Object.keys(this.data.controls).forEach(k => this.data.get(k)?.markAsTouched());
      return;
    }

    const talukaName = String(this.data.get('STATE_NAME')?.value || '').trim();
    const stateCode = Number(this.data.get('STATE_CODE')?.value) || 0;
    const distCode = Number(this.data.get('DIST_CODE')?.value) || 0;
    const countryCode = Number(this.data.get('COUNTRY_CODE')?.value) || 0;
    const countryName = this.countryOptions.find(c => c.code === countryCode)?.name ?? this.selectedCountryName ?? '';

    if (!countryName || !stateCode || !distCode || !talukaName) {
      this.toastr.warning('Please select Country, State, District and enter Taluka name.');
      return;
    }

    this.saving = true;
    const isEdit = this.btn === 'E';
    const payload: any = {
      Code: isEdit ? (Number(this.data.get('TRN_NO')?.value) || 0) : 0,
      name: talukaName,
      State_Code: stateCode,
      Dist_code: distCode,
      Country_Name: countryName
    };

    const endpoint = isEdit ? 'TalukaMaster/Update' : 'TalukaMaster/Save';
    this.api.post(endpoint, payload).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? (isEdit ? 'Updated' : 'Saved'));
        this.afterSaveOrUpdateCleanup();
      },
      error: (err) => {
        console.error('Save error', err);
        if (err?.error && err.error.errors) {
          this.serverErrors = err.error.errors;
          const firstKey = Object.keys(this.serverErrors)[0];
          this.toastr.error(this.serverErrors[firstKey]?.[0] ?? 'Validation error');
        } else {
          this.toastr.error(err?.error?.title ?? err?.message ?? 'Save failed');
        }
        this.saving = false;
      }
    });
  }

 afterSaveOrUpdateCleanup() {
    this.saving = false;
    this.isCreatingNew = false;
    this.btn = '';
    this.lastFetchedRaw = null;
    this.rawApiObjectPreview = '';
    this.data.reset({ TRN_NO: { value: 0, disabled: true }, STATE_NAME: '', STATE_CODE: null, DIST_CODE: null, COUNTRY_CODE: null });
    this.selectedCountryName = ''; this.selectedCountryCode = null;
    this.selectedStateName = ''; this.selectedStateCode = null;
    this.selectedDistrictName = ''; this.selectedDistrictCode = null;
    this.loadState();
  }

  /* ---------- New / Edit / Delete ---------- */

  newTaluka(): void {
    this.isCreatingNew = true;
    this.btn = 'N';
    this.data.reset({ TRN_NO: { value: 0, disabled: true }, STATE_NAME: '', STATE_CODE: null, DIST_CODE: null, COUNTRY_CODE: null });
    setTimeout(() => this.talukaNameField?.nativeElement?.focus?.(), 50);
  }

  editTaluka(t: any) {
    this.isCreatingNew = true;
    this.btn = 'E';
    const trn = Number(t.TRN_NO || t.code || 0) || 0;
    this.trn_no = trn;
    this.lastFetchedRaw = this.rawByTrn.get(trn) ?? null;

    const countryCode = Number(t.COUNTRY_CODE ?? t.country_Code ?? 0) || 0;
    const stateCode = Number(t.STATE_CODE ?? t.state_code ?? 0) || 0;
    const distCode = Number(t.DIST_CODE ?? t.dist_code ?? 0) || 0;

    this.data.patchValue({
      TRN_NO: trn,
      STATE_NAME: t.STATE_NAME ?? t.name ?? '',
      STATE_CODE: stateCode || null,
      DIST_CODE: distCode || null,
      COUNTRY_CODE: countryCode || null
    });

    this.selectedCountryCode = countryCode || null;
    this.selectedCountryName = this.countryOptions.find(c => c.code === countryCode)?.name ?? '';
    this.selectedStateCode = stateCode || null;
    this.selectedStateName = this.stateOptions.find(s => s.code === stateCode && s.countryCode === countryCode)?.name ?? '';
    this.selectedDistrictCode = distCode || null;
    this.selectedDistrictName = this.districtOptions.find(d => d.code === distCode && d.stateCode === stateCode && d.countryCode === countryCode)?.name ?? '';

    setTimeout(() => this.talukaNameField?.nativeElement?.focus?.(), 50);
  }

  deleteTaluka(t: any) {
    const name = t.STATE_NAME ?? t.name ?? `#${t.code ?? t.TRN_NO ?? ''}`;
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    const codeToDelete = Number(t.TRN_NO || t.code || 0) || 0;
    const dist = Number(t.DIST_CODE ?? t.dist_code ?? 0) || 0;
    const state = Number(t.STATE_CODE ?? t.state_code ?? 0) || 0;
    const country = Number(t.COUNTRY_CODE ?? t.country_Code ?? 0) || 0;
    if (!codeToDelete || !dist || !state || !country) {
      this.toastr.error('Missing identifiers for deletion.');
      return;
    }

    const url = `TalukaMaster/Delete/${codeToDelete}?Dist_code=${dist}&State_Code=${state}&Country_Code=${country}`;
    this.api.delete(url).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'Deleted');
        this.loadState();
      },
      error: (err) => {
        console.error('Delete error', err);
        this.toastr.error(err?.error?.title ?? err?.message ?? 'Delete failed');
      }
    });
  }

  /* ---------- Filtering ---------- */

  filteredTaluka() {
    let result = this.talukas || [];
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter((c: any) =>
        (String(c.STATE_NAME || c.name || '')).toLowerCase().includes(s) ||
        (String(c.DISTRICT_NAME || c.district_Name || '')).toLowerCase().includes(s) ||
        (String(c.COUNTRY_NAME || c.country_Name || '')).toLowerCase().includes(s)
      );
    }
    return result;
  }
}
