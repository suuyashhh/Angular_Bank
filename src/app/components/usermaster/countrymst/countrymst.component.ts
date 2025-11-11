import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-countrymst',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgxPaginationModule,RouterModule
  ],
  templateUrl: './countrymst.component.html',
  styleUrls: ['./countrymst.component.css']
})
export class CountrymstComponent implements OnInit {
  @ViewChild('countryNameField') countryNameField!: ElementRef;

  isCreatingNew = false;
  btn: string = '';
  trn_no = 0;
  saving = false;

  countries: any[] = [];
  loading = false;

  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  data!: FormGroup;

  constructor(private api: ApiService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.data = new FormGroup({
      TRN_NO: new FormControl(0),
      COUNTRY_NAME: new FormControl('', Validators.required),
      DATE: new FormControl('')
    });

    this.loadCountries();
  }

  // Normalize incoming server object to the fields the template expects
  private normalizeServerObject(c: any) {
    
      debugger;
    // Accept many variants of property names from backend
    const trnNo = c.trN_NO ?? null;
    const countryName =
      c.countrY_NAME ?? 
      '';
    const dateVal = c.date ?? null;

    // Convert string-ish date to JS Date if possible
    let dateObj: Date | null = null;
    if (dateVal) {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) dateObj = d;
    }

    return {
      TRN_NO: trnNo,
      COUNTRY_NAME: countryName,
      DATE: dateObj // either Date or null
    };
  }

  loadCountries(): void {
    this.loading = true;
    this.api.get('CountryMaster/GetAll').subscribe({
      next: (res: any) => {
        // Defensive: if server wraps list in property (like { data: [...] }) handle that
        const list = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
        console.log('raw countries response', res);
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
    this.data.reset({ TRN_NO: 0, COUNTRY_NAME: '', DATE: '' });
    setTimeout(() => this.countryNameField?.nativeElement?.focus?.(), 50);
  }

  openInlineForm(trnNo: number | null, action: string): void {
    debugger;
    // allow both TRN_NO or other id forms
    if (!trnNo && trnNo !== 0) {
      this.toastr.warning('Invalid country id for edit');
      return;
    }
    this.isCreatingNew = true;
    this.btn = action;
    this.getDataById(trnNo as number);
  }

  getDataById(trnNo: number): void {
    this.api.get(`CountryMaster/GetCountryById?countryCode=${trnNo}`).subscribe({
      next: (res: any) => {
        if (!res) {
          this.toastr.error('Country not found');
          return;
        }

        // normalize single object (API might return {TRN_NO...} or trn_NO...)
        const obj = this.normalizeServerObject(res);
        this.trn_no = obj.TRN_NO ?? trnNo;
        this.data.patchValue({
          TRN_NO: this.trn_no,
          COUNTRY_NAME: obj.COUNTRY_NAME,
          DATE: obj.DATE ?? ''
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
      TRN_NO: this.data.get('TRN_NO')?.value || 0,
      COUNTRY_NAME: this.data.get('COUNTRY_NAME')?.value,
      // send DATE as ISO if present; backend expects datetime
      DATE: this.data.get('DATE')?.value ? new Date(this.data.get('DATE')?.value).toISOString() : new Date().toISOString()
    };

    this.saving = true;
    const isEdit = payload.TRN_NO && payload.TRN_NO > 0;

    const apiCall$ = isEdit
      ? this.api.post('CountryMaster/Update', payload)
      : this.api.post('CountryMaster/Save', payload);

    apiCall$.subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? (isEdit ? 'Updated' : 'Saved'));
        this.saving = false;
        this.isCreatingNew = false;
        this.data.reset({ TRN_NO: 0, COUNTRY_NAME: '', DATE: '' });
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
    if (!trnNo && trnNo !== 0) {
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
    if (!this.trn_no && this.trn_no !== 0) {
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
        String(c.TRN_NO || '').includes(s)
      );
    }
    return result;
  }
}
