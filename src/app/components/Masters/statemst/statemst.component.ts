import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { Console } from 'console';
import { PickerService } from '../../../services/picker.service';
import { PickerModalComponent } from '../../../shared/picker-modal/picker-modal.component';

@Component({
  selector: 'app-statemst',
  standalone: true,
  imports: [
      CommonModule,
      ReactiveFormsModule,
      FormsModule,PickerModalComponent,
      NgxPaginationModule,RouterModule],
  templateUrl: './statemst.component.html',
  styleUrl: './statemst.component.css'
})
export class StatemstComponent implements OnInit {
  @ViewChild('countryNameField') countryNameField!: ElementRef;

  isCreatingNew = false;
  btn: string = '';
  trn_no = 0;
  
  selectedCountryName = '';
  selectedCountryCode: number | null = null;
  saving = false;

  countries: any[] = [];
  loading = false;

  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  data!: FormGroup;

  constructor(private api: ApiService, private toastr: ToastrService,public picker:PickerService) {}

  ngOnInit(): void {
    this.data = new FormGroup({
      TRN_NO: new FormControl(0),
      COUNTRY_NAME: new FormControl('', Validators.required),
      DATE: new FormControl('')
    });

    this.loadCountries();



    
  this.picker.resetSelections();

  this.picker.pickerSelected$.subscribe(sel => {

    if (!sel) return;

    const { field, option, target } = sel;


    if (target === 'primary') {

      if (field === 'country') {

        if (!option) {
          this.selectedCountryName = '';
          return;
        }

        this.selectedCountryName = option.name;
        this.selectedCountryCode = Number(option.code ?? null);   
        console.log(this.selectedCountryCode);
    }
  }
  });
  }

  /**
   * Normalizes server object shapes into the fields used by the template
   * Accepts many variants and falls back safely.
   */
  private normalizeServerObject(raw: any) {
    if (!raw) return { TRN_NO: 0, COUNTRY_NAME: '' };

    // server uses: code, name, entry_Date
    const code = raw.code ?? raw.Code ?? raw.trn_no ?? raw.TRN_NO ?? null;
    const name = raw.name ?? raw.Name ?? raw.countrY_NAME ?? raw.COUNTRY_NAME ?? '';

    // Convert to number if possible
    const trnNo = code !== null && code !== undefined && code !== '' ? Number(code) : 0;

   

    return {
      TRN_NO: trnNo,
      COUNTRY_NAME: String(name)
    };
  }

  loadCountries(): void {
    this.loading = true;
    this.api.get('CountryMaster/GetAll').subscribe({
      next: (res: any) => {
        // console.log raw response for debugging
        console.log('raw countries response', res);

        // response might be an array, or { data: [...] }, or single object
        let list: any[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (Array.isArray(res?.data)) {
          list = res.data;
        } else if (res && typeof res === 'object' && (res.code !== undefined || res.name !== undefined)) {
          // maybe server returned single object or items but not wrapped in array
          list = [res];
        } else {
          list = [];
        }

        this.countries = (list || []).map((c: any) => this.normalizeServerObject(c));
        console.log('normalized countries', this.countries);
      },
      error: (err) => {
        console.error('Failed to load countries', err);
        this.toastr.error('Failed to load country');
      },
      complete: () => (this.loading = false)
    });
  }

  resetCountryForm(): void {
    this.isCreatingNew = true;
    this.btn = '';
    this.trn_no = 0;
    this.data.reset({ TRN_NO: 0, COUNTRY_NAME: '' });

    // wait a tick then focus
    setTimeout(() => this.countryNameField?.nativeElement?.focus?.(), 50);
  }

  openInlineForm(trnNo: number | null, action: string): void {
    if (trnNo === null || trnNo === undefined) {
      this.toastr.warning('Invalid country id for edit');
      return;
    }
    this.isCreatingNew = true;
    this.btn = action;
    this.getDataById(trnNo as number);
  }

  getDataById(trnNo: number): void {
    // try to fetch single country. backend param name may be countryCode (as your original)
    this.api.get(`CountryMaster/GetCountryById?countryCode=${trnNo}`).subscribe({
      next: (res: any) => {
        if (!res) {
          this.toastr.error('Country not found');
          return;
        }

        // If server returned { data: {...} } or array, handle that.
        let objRaw = res;
        if (res?.data && (typeof res.data === 'object')) objRaw = res.data;
        if (Array.isArray(objRaw) && objRaw.length > 0) objRaw = objRaw[0];

        const obj = this.normalizeServerObject(objRaw);
        this.trn_no = obj.TRN_NO ?? trnNo;
        this.data.patchValue({
          TRN_NO: this.trn_no,
          COUNTRY_NAME: obj.COUNTRY_NAME
        });

        setTimeout(() => this.countryNameField?.nativeElement?.focus?.(), 50);
      },
      error: (err) => {
        console.error('Error loading country', err);
        this.toastr.error('Failed to load country');
      }
    });
  }

  submit(): void {
    if (this.data.invalid) {
      this.toastr.warning('Please enter country name', 'Validation');
      this.countryNameField?.nativeElement?.focus?.();
      return;
    }

    const payload = {
      // keep TRN_NO as code: backend might expect property name 'code' or 'TRN_NO'
      // If backend expects 'code', change here. For now we send TRN_NO (server should accept/match by id).
      TRN_NO: this.data.get('TRN_NO')?.value || 0,
      COUNTRY_NAME: this.data.get('COUNTRY_NAME')?.value,
    };

    this.saving = true;
    const isEdit = payload.TRN_NO && payload.TRN_NO > 0;
    const apiPayload = {
      code: payload.TRN_NO,
      name: payload.COUNTRY_NAME
    };

    const apiCall$ = isEdit
      ? this.api.post('CountryMaster/Update', apiPayload)
      : this.api.post('CountryMaster/Save', apiPayload);

    apiCall$.subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? (isEdit ? 'Updated' : 'Saved'));
        this.saving = false;
        this.isCreatingNew = false;
        this.data.reset({ TRN_NO: 0, COUNTRY_NAME: '' });
        this.loadCountries();
      },
      error: (err) => {
        console.error('Save error', err);
        this.toastr.error('Failed to save country');
        this.saving = false;
      }
    });
  }

  deleteCountry(trnNo: number | null, name: string): void {
    if (trnNo === null || trnNo === undefined) {
      this.toastr.warning('Invalid country id');
      return;
    }
    this.trn_no = trnNo as number;
    this.data.patchValue({ COUNTRY_NAME: name });

    const modalEl = document.getElementById('deleteConfirmModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    } else {
      if (confirm(`Delete ${name}?`)) this.executeDelete();
    }
  }

  executeDelete(): void {
    if (this.trn_no === null || this.trn_no === undefined) {
      this.toastr.warning('Invalid country selected');
      return;
    }
    this.api.delete(`CountryMaster/Delete/${this.trn_no}`).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'Country deleted');
        this.loadCountries();
        this.isCreatingNew = false;
        this.trn_no = 0;
      },
      error: (err) => {
        console.error('Delete error', err);
        this.toastr.error('Failed to delete country');
      }
    });
  }

  filteredCountries() {
    let result = this.countries || [];
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter((c: any) =>
        (c.COUNTRY_NAME || '').toLowerCase().includes(s) ||
        String(c.TRN_NO || '').toLowerCase().includes(s)
      );
    }
    return result;
  }
}
