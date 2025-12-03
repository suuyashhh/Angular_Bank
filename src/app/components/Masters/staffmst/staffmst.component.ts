import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../services/api.service';
import { PickerService } from '../../../services/picker.service';
import { CommonModule } from '@angular/common';
import { NgxPaginationModule } from 'ngx-pagination';
import { RouterModule } from '@angular/router';
import { DropdownService } from '../../../shared/services/dropdown.service';

@Component({
  selector: 'app-staffmst',
  standalone: true,
  imports: [
    CommonModule,
        ReactiveFormsModule,
        FormsModule,
        NgxPaginationModule,
        RouterModule,
  ],
  templateUrl: './staffmst.component.html',
  styleUrl: './staffmst.component.css'
})
export class StaffmstComponent {
  

  @ViewChild('countryNameField') countryNameField!: ElementRef;

  isCreatingNew = false;   // controls visibility of inline form
  isEditMode = false;      // true when editing existing city
  btn: string = '';
  staff_code = 0;

  selectedStaffName = '';
  selectedStaffDate : number | null = null;
  selectedStaffCode: number | null = null;

  saving = false;
  staff_List: any[] = [];
  loading = false;

  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  data!: FormGroup;

  // used by delete flow so we know which district/state/country to send
  deleteStaffCode: number | null = null;
  
  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    public picker: PickerService,
    private dropdown: DropdownService
  ) { }

  ngOnInit(): void {
  this.data = new FormGroup({
    STAFF_NAME: new FormControl('', Validators.required),
    STAFF_CODE: new FormControl(0),
    DATE: new FormControl(0),
  });

  this.loadStaff();
}


  private normalizeServerObject(raw: any) {
    if (!raw) return {
      CODE: 0,
      NAME: '',
      DATE:'',
    };
    return {
      CODE: raw.CODE ?? raw.code ?? 0,
      NAME: String(raw.NAME ?? raw.Name ?? raw.name ?? ''),
      DATE: raw.DATE ?? raw.date ?? raw.Entry_Date ?? 0,
    };
  }

  loadStaff(): void {
    this.loading = true;
    this.api.get('StaffMaster/GetAllStaff').subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res) list = [res];
        this.staff_List = (list || []).map((c: any) => this.normalizeServerObject(c));
      },
      error: (err) => {
        console.error('Failed to load Staff', err);
        this.toastr.error('Failed to load Staff');
      },
      complete: () => (this.loading = false)
    });
  }

resetStaffForm(): void {
  this.isCreatingNew = true;   // show form
  this.isEditMode = false;     // NEW mode, not edit
  this.btn = '';
  this.staff_code = 0;
  this.selectedStaffCode = null;
  this.selectedStaffDate = null;
  this.selectedStaffName = '';

  this.data.reset({
    STAFF_CODE: 0,
    STAFF_NAME: '',
    DATE: ''
  });

  setTimeout(() => this.countryNameField?.nativeElement?.focus?.(), 50);
}



  // Open form for edit
  openInlineForm(staffCode: number | null, action: string): void {
    if (staffCode === null) {
      this.toastr.warning('Invalid city id for edit');
      return;
    }
    this.isCreatingNew = true;  // show form
    this.isEditMode = true;     // EDIT mode
    this.btn = action;

    this.selectedStaffCode = staffCode ?? null;


    this.getDataById(staffCode);
  }

  // Fetch a city by its id (and use state & country to be safe)
  getDataById(StaffCode: number): void {
    // *** IMPORTANT: parameter names must match controller: country, state, dist, taluka, code ***
    const url = `StaffMaster/GetStaffById?country=${encodeURIComponent(StaffCode)}`;

    this.api.get(url).subscribe({
      next: (res: any) => {
        let objRaw = res;
        if (res?.data && typeof res.data === 'object') objRaw = res.data;
        if (Array.isArray(objRaw) && objRaw.length > 0) objRaw = objRaw[0];

        const obj = this.normalizeServerObject(objRaw);

        this.staff_code = Number(obj.CODE ?? 0 );
        this.selectedStaffName = obj.NAME ;
        this.selectedStaffDate = obj.DATE ?? '';
       

        this.data.patchValue({
          STAFF_CODE: this.staff_code,
          STAFF_NAME: this.selectedStaffName ?? '',
          DATE: this.selectedStaffDate || 0,
          
        });

        setTimeout(() => this.countryNameField?.nativeElement?.focus?.(), 50);
      },
      error: (err) => {
        console.error('Error loading Staff', err);
        this.toastr.error('Failed to load Staff');
      }
    });
  }

  // Save or Update
  submit(): void {
    debugger
    const StaffName = this.data.get('STAFF_NAME')?.value?.trim();

    if (!StaffName) {
      this.toastr.warning('Please enter Staff name', 'Validation');
      // better focus on staff input instead of country
      const cityInput = document.getElementById('StaffName') as HTMLInputElement | null;
      cityInput?.focus();
      return;
    }


    const v = this.data.value;

    // *** Shape payload like DTOCityMaster on the server ***
    const payload = {
      STAFF_CODE: Number(v.STAFF_CODE || this.selectedStaffCode || 0),
      // DATE: Number(v.DATE || this.selectedStaffDate || 0),
      STAFF_NAME:this.selectedStaffName,
      Entry_Date: v.DATE || new Date()
    };

    this.saving = true;
    const isEdit = payload.STAFF_CODE > 0;

    const apiCall$ = isEdit
      ? this.api.post('StaffMaster/Update', payload)
      : this.api.post('StaffMaster/Save', payload);

    apiCall$.subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? (isEdit ? 'Updated' : 'Saved'));
        this.saving = false;
        this.isCreatingNew = false;
        this.isEditMode = false;
        this.data.reset({ STAFF_CODE: 0, STAFF_NAME: '', DATE: 0});
        this.selectedStaffCode = null;
        this.selectedStaffDate = null;
        this.selectedStaffName = '';
        this.loadStaff();  // <-- actually refresh
      },
      error: (err) => {
        console.error('Save error', err);
        this.toastr.error('Failed to save Staff');
        this.saving = false;
      }
    });
  }

  // Trigger delete modal and store codes to send
  deleteStaff(staffCode: number): void {
    if (staffCode === null || staffCode === undefined) {
      this.toastr.warning('Invalid staff id');
      return;
    }
    this.staff_code = staffCode;
    this.deleteStaffCode = staffCode ?? null;
    this.data.patchValue({ STAFF_NAME: name });

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
    if (this.staff_code === null) {
      this.toastr.warning('Invalid staff selected');
      return;
    }

    const codeQ = this.staff_code;
    const stateQ = this.deleteStaffCode ?? this.data.get('STAFF_CODE')?.value ?? 0;

    const url = `StaffMaster/Delete?code=${encodeURIComponent(codeQ)}`;

    this.api.delete(url).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'Staff deleted');
        this.loadStaff();
        this.isCreatingNew = false;
        this.staff_code = 0;
        // this.deleteStateCode = null;
        // this.deleteCountryCode = null;
        // this.selectedCountryCode = null;
        // this.selectedStateCode = null;
        // this.selectedCountryName = '';
        // this.selectedStateName = '';
      },
      error: (err) => {
        console.error('Delete error', err);
        this.toastr.error('Failed to delete Staff');
      }
    });
  }

  closeForm(): void {
    this.isCreatingNew = false;
    this.isEditMode = false;
  }

  filteredCountries() {
    let result = this.staff_List || [];
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter((c: any) =>
        (c.STAFF_NAME || '').toLowerCase().includes(s) ||
        String(c.STAFF_CODE || '').toLowerCase().includes(s)
      );
    }
    return result;
  }


  

}
