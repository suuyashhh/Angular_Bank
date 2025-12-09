import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { PickerService } from '../../../services/picker.service';

import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgxPaginationModule } from 'ngx-pagination';
import { DropdownService } from '../../../shared/services/dropdown.service';

@Component({
  selector: 'app-religionmst',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgxPaginationModule,
    RouterModule,
  ],
  templateUrl: './religionmst.component.html',
  styleUrl: './religionmst.component.css'
})
export class ReligionmstComponent {

  @ViewChild('religionNameField') religionNameField!: ElementRef;

  isCreatingNew = false;   // controls visibility of inline form
  isEditMode = false;      // true when editing existing city
  btn: string = '';
  staff_code = 0;

  selectedReligonName = '';
  selectedDate: number | null = null;
  selectedReligionCode: number | null = null;

  saving = false;
  Religion_List: any[] = [];
  loading = false;

  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  data!: FormGroup;

  // used by delete flow so we know which district/state/country to send
  deleteReligionCode: number | null = null;

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    public picker: PickerService,
    private dropdown: DropdownService
  ) { }

  ngOnInit(): void {
    this.data = new FormGroup({
      RELIGION_NAME: new FormControl('', Validators.required),
      RELIGION_CODE: new FormControl(0),
    });

    this.loadReligion();
  }


  private normalizeServerObject(raw: any) {
    if (!raw) {
      return {
        RELIGION_CODE: 0,
        RELIGION_NAME: '',
        RELIGION_DATE: null,
      };
    }

    return {
      RELIGION_CODE: raw.religioN_CODE ?? raw.code ?? raw.RELIGION_CODE ?? 0,
      RELIGION_NAME: String(
        raw.religioN_NAME ?? raw.Name ?? raw.name ?? raw.RELIGION_NAME ?? ''
      ),
      RELIGION_DATE: raw.religioN_DATE ?? raw.RELIGION_DATE ?? null,
    };
  }


  loadReligion(): void {
    this.loading = true;
    this.api.get('ReligionMaster/GetAllReligion').subscribe({
      next: (res: any) => {
        let list: any[] = [];
        console.log('server religion list sample', list[0]);
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res) list = [res];
        this.Religion_List = (list || []).map((c: any) => this.normalizeServerObject(c));
      },
      error: (err) => {
        console.error('Failed to load Religion', err);
        this.toastr.error('Failed to load Religion');
      },
      complete: () => (this.loading = false)
    });
  }

  resetReligionForm(): void {
    this.isCreatingNew = true;   // show form
    this.isEditMode = false;     // NEW mode, not edit
    this.btn = '';
    // this.Religion_code = 0;
    this.selectedReligionCode = null;
    this.selectedDate = null;
    this.selectedReligonName = '';

    this.data.reset({
      RELIGION_CODE: 0,
      RELIGION_NAME: '',
      DATE: 0,
    });

    setTimeout(() => this.religionNameField?.nativeElement?.focus?.(), 50);
  }



  // Open form for edit
  openInlineForm(religioncode: number | null, action: string): void {
    if (religioncode === null) {
      this.toastr.warning('Invalid city id for edit');
      return;
    }
    this.isCreatingNew = true;  // show form
    this.isEditMode = true;     // EDIT mode
    this.btn = action;
    this.selectedReligionCode = religioncode ?? null;


    this.getDataById(religioncode);

  }

  // Fetch a city by its id (and use state & country to be safe)
  getDataById(Religioncode: number): void {
    debugger
    // *** IMPORTANT: parameter names must match controller: country, state, dist, taluka, code ***
    const url = `ReligionMaster/GetReligionById?code=${encodeURIComponent(Religioncode)}`;

    this.api.get(url).subscribe({
      next: (res: any) => {
        let objRaw = res;
        if (res?.data && typeof res.data === 'object') objRaw = res.data;
        if (Array.isArray(objRaw) && objRaw.length > 0) objRaw = objRaw[0];

        const obj = this.normalizeServerObject(objRaw);

        this.selectedReligionCode = Number(obj.RELIGION_CODE ?? 0);
        this.selectedReligonName = obj.RELIGION_NAME ?? '';

        this.data.patchValue({
          RELIGION_CODE: this.selectedReligionCode,
          RELIGION_NAME: this.selectedReligonName,
        });


        setTimeout(() => this.religionNameField?.nativeElement?.focus?.(), 50);
      },
      error: (err) => {
        console.error('Error loading Religion', err);
        this.toastr.error('Failed to load Religion');
      }
    });
  }

  // Save or Update
  submit(): void {
    debugger
    const ReligionName = this.data.get('RELIGION_NAME')?.value?.trim();

    if (!ReligionName) {
      this.toastr.warning('Please enter Religion name', 'Validation');
      // better focus on staff input instead of country
      const cityInput = document.getElementById('RELIGION_NAME') as HTMLInputElement | null;
      cityInput?.focus();
      return;
    }


    const v = this.data.value;

    // *** Shape payload like DTOCityMaster on the server ***
    const payload = {
      RELIGION_CODE: Number(v.RELIGION_CODE || this.selectedReligionCode || 0),
      // DATE: Number(v.DATE || this.selectedStaffDate || 0),
      RELIGION_NAME: v.RELIGION_NAME || this.selectedReligonName
      // DATE : v.DATE || new Date() || this.selectedStaffDate,
    };

    this.saving = true;
    const isEdit = payload.RELIGION_CODE > 0;

    const apiCall$ = isEdit
      ? this.api.post('ReligionMaster/Update', payload)
      : this.api.post('ReligionMaster/Save', payload);

    apiCall$.subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? (isEdit ? 'Updated' : 'Saved'));
        this.saving = false;
        this.isCreatingNew = false;
        this.isEditMode = false;
        this.data.reset({
          RELIGION_CODE: 0,
          RELIGION_NAME: '',
        });

        this.selectedReligionCode = null;
        // this.selectedStaffDate = null;
        this.selectedReligonName = '';
        this.loadReligion();  // <-- actually refresh
      },
      error: (err) => {
        console.error('Save error', err);
        this.toastr.error('Failed to save Religion');
        this.saving = false;
      }
    });
  }

  // Trigger delete modal and store codes to send
  deleteReligion(religioncode: number): void {
    if (religioncode === null || religioncode === undefined) {
      this.toastr.warning('Invalid ReligionCode id');
      return;
    }
    // this.religion_Code = religioncode;
    this.deleteReligionCode = religioncode ?? null;
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
    const codeQ = this.deleteReligionCode ?? this.data.get('RELIGION_CODE')?.value ?? 0;

    if (!codeQ) {
      this.toastr.warning('Invalid Religion selected');
      return;
    }

    const url = `ReligionMaster/Delete?code=${encodeURIComponent(codeQ)}`;

    this.api.delete(url).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'Religion deleted');
        this.loadReligion();
        this.isCreatingNew = false;
        this.deleteReligionCode = null;
      },
      error: (err) => {
        console.error('Delete error', err);
        this.toastr.error('Failed to delete Religion');
      }
    });
  }

  closeForm(): void {
    this.isCreatingNew = false;
    this.isEditMode = false;
  }

  filteredReligion() {
    let result = this.Religion_List || [];
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter((c: any) =>
        (c.RELIGION_NAME || '').toLowerCase().includes(s) ||
        String(c.RELIGION_CODE || '').toLowerCase().includes(s)
      );
    }
    return result;
  }



}
