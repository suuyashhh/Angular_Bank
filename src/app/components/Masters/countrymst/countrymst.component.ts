import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

interface CountryDTO {
  code: number;
  name: string;
}

@Component({
  selector: 'app-countrymst',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgxPaginationModule,
    RouterModule
  ],
  templateUrl: './countrymst.component.html',
  styleUrls: ['./countrymst.component.css']
})
export class CountrymstComponent implements OnInit {
  @ViewChild('countryNameField') countryNameField!: ElementRef<HTMLInputElement>;

  isCreatingNew = false;
  btn: string = '';
  currentCode = 0;
  saving = false;

  countries: CountryDTO[] = [];
  loading = false;

  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  data!: FormGroup;

  constructor(private api: ApiService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.data = new FormGroup({
      Code: new FormControl(0),
      Name: new FormControl('', { nonNullable: true, validators: [Validators.required] })
    });

    this.loadCountries();
  }

  // Normalize server object (accept variant property names)
  private normalizeServerObject(c: any): CountryDTO {
    const code = c.Code ?? c.code ?? c.TRN_NO ?? c.trn_no ?? c.COUNTRY_CODE ?? c.country_code ?? 0;
    const name = c.Name ?? c.name ?? c.COUNTRY_NAME ?? c.country_name ?? c.countrY_NAME ?? '';

    return {
      code: Number(code || 0),
      name: String(name || '')
    };
  }

  loadCountries(): void {
    this.loading = true;
    this.api.get('CountryMaster/GetAll')
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const list = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
          this.countries = (list || []).map((c: any) => this.normalizeServerObject(c));
        },
        error: (err) => {
          console.error('Failed to load countries', err);
          this.toastr.error('Failed to load countries');
        }
      });
  }

  resetCountryForm(): void {
    this.isCreatingNew = true;
    this.btn = '';
    this.currentCode = 0;
    this.data.reset({ Code: 0, Name: '' });
    setTimeout(() => this.countryNameField?.nativeElement?.focus?.(), 50);
  }

  openInlineForm(code: number | null, action: string): void {
    if (code === null || code === undefined) {
      this.toastr.warning('Invalid country id for edit');
      return;
    }
    this.isCreatingNew = true;
    this.btn = action;
    this.getDataById(code);
  }

  getDataById(code: number): void {
    this.api.get(`CountryMaster/GetCountryById?countryCode=${code}`).subscribe({
      next: (res: any) => {
        if (!res) {
          this.toastr.error('Country not found');
          return;
        }
        const obj = this.normalizeServerObject(res);
        this.currentCode = obj.code || code;
        this.data.patchValue({
          Code: obj.code,
          Name: obj.name
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

    const code = Number(this.data.get('Code')?.value || 0);
    const name = String(this.data.get('Name')?.value || '').trim();

    const payload = {
      Code: code,
      Name: name
    };

    this.saving = true;
    const isEdit = code && code > 0;
    const apiCall$ = isEdit ? this.api.post('CountryMaster/Update', payload) : this.api.post('CountryMaster/Save', payload);

    apiCall$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? (isEdit ? 'Updated' : 'Saved'));
        this.isCreatingNew = false;
        this.loadCountries();
      },
      error: (err) => {
        console.error('Save error', err);
        this.toastr.error('Failed to save country');
      }
    });
  }

  // Delete flow
  deleteCountry(code: number | null, name: string): void {
    if (code === null || code === undefined) {
      this.toastr.warning('Invalid country id');
      return;
    }
    this.currentCode = code;
    this.data.patchValue({ Name: name });

    const modalEl = document.getElementById('deleteConfirmModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    } else {
      if (confirm(`Delete ${name}?`)) this.executeDelete();
    }
  }

  executeDelete(): void {
    if (this.currentCode === null || this.currentCode === undefined) {
      this.toastr.warning('Invalid country selected');
      return;
    }
    this.api.delete(`CountryMaster/Delete/${this.currentCode}`).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'Country deleted');
        this.loadCountries();
        this.isCreatingNew = false;
        this.currentCode = 0;
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
        (c.name || '').toLowerCase().includes(s) ||
        String(c.code || '').includes(s)
      );
    }
    return result;
  }
}
