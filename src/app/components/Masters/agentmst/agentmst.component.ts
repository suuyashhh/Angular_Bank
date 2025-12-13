import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { DropdpwnModalComponent, Option as ModalOption } from '../../../shared/dropdpwn-modal/dropdpwn-modal.component';

@Component({
  selector: 'app-agentmst',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgxPaginationModule,
    RouterModule,
    DropdpwnModalComponent
  ],
  templateUrl: './agentmst.component.html',
  styleUrls: ['./agentmst.component.css']
})
export class AgentmstComponent implements OnInit {
  @ViewChild('editFocusStart') editFocusStart!: ElementRef;

  // form & UI state
  data!: FormGroup;
  isCreatingNew = false;
  btn: '' | 'E' = '';
  saving = false;
  loading = false;
  id = 0;
  submitted = false;

  // list / paging
  agent_List: any[] = [];
  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  // selection display values for pickers
  selectedBranchName = '';
  selectedAgentCode = '';
  selectedCustomerCode = '';
  selectedBranchCode = '';
  selectedCustomerName = '';

  /* Branch modal state */
  branchModalOpen = false;
  branchOptions: ModalOption[] = [];
  branchTempSelection: ModalOption | null = null;

  /* Customer modal state */
  customerModalOpen = false;
  customerOptions: ModalOption[] = [];
  customerTempSelection: ModalOption | null = null;

  // delete flow
  deleteAgentID: number | null = null;

  constructor(
    private api: ApiService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    // phone pattern: optional +, digits only, length 7-15
    const phonePattern = /^\+?\d{7,15}$/;

    this.data = new FormGroup({
      ID: new FormControl(0),
      BRNC_CODE: new FormControl('', Validators.required),
      AGENT_CODE: new FormControl(0),
      PARTY_CODE: new FormControl('', Validators.required),
      MobileNo: new FormControl('', [Validators.maxLength(15), Validators.pattern(phonePattern)]),
      NAME: new FormControl('', Validators.required),
      Machine_type: new FormControl(1),
      Join_date: new FormControl(''),
      Resign_Date: new FormControl(''),
      Active_YN: new FormControl('Y', Validators.required)
    });

    // apply cross-field validator for date order to the form group
    this.data.setValidators(this.dateRangeValidator('Join_date', 'Resign_Date'));

    this.resetAgentForm();
    this.loadAgents();
  }

  // ---------- Validators ----------
  // cross-field date validator: Join_date <= Resign_Date (if Resign_Date present)
  private dateRangeValidator(joinKey: string, resignKey: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const join = group.get(joinKey)?.value;
      const resign = group.get(resignKey)?.value;

      if (!join || !resign) return null; // nothing to validate if either is absent

      const joinDate = new Date(join);
      const resignDate = new Date(resign);

      if (isNaN(joinDate.getTime()) || isNaN(resignDate.getTime())) {
        // invalid date formats are not this validator's responsibility
        return null;
      }

      return resignDate >= joinDate ? null : { dateRange: true };
    };
  }

  // ---------- Helpers ----------
  private formatAsDateInput(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') {
      return value.includes('T') ? value.split('T')[0] : value;
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  private normalizeAgent(raw: any) {
    if (!raw) {
      return {
        ID: 0,
        BRNC_CODE: '',
        BRNC_NAME: '',
        AGENT_CODE: 0,
        PARTY_CODE: '',
        PARTY_NAME: '',
        MobileNo: '',
        NAME: '',
        Machine_type: '',
        Join_date: '',
        Resign_Date: '',
        Active_YN: 'Y'
      };
    }

    return {
      ID: raw.ID ?? raw.id ?? 0,
      BRNC_CODE: raw.brnc_code ?? raw.BRNC_CODE ?? raw.Branch_Code ?? raw.branch_code ?? raw.branchCode ?? '',
      BRNC_NAME:
        raw.brnc_name ??
        raw.BRNC_NAME ??
        raw.Branch_Name ??
        raw.branchName ??
        raw.Branch ??
        '',
      AGENT_CODE: raw.code ?? raw.AGENT_CODE ?? raw.agentCode ?? 0,
      PARTY_CODE:
        raw.PARTY_CODE ??
        raw.Party_Code ??
        raw.party_code ??
        raw.partyCode ??
        raw.PartyCode ??
        raw.code ??
        '',
      PARTY_NAME:
        raw.Party_Name ??
        raw.CUSTOMER_NAME ??
        raw.CustomerName ??
        raw.customer_name ??
        raw.name ??
        raw.NAME ??
        '',
      MobileNo: raw.MobileNo ?? raw.mobileNo ?? raw.mob_no ?? raw.phone ?? '',
      NAME: raw.NAME ?? raw.name ?? '',
      Machine_type: raw.Machine_type ?? raw.machine_type ?? 'Manually',
      Join_date: raw.Join_date ?? raw.join_date ?? '',
      Resign_Date: raw.Resign_Date ?? raw.resign_Date ?? '',
      Active_YN: raw.Active_YN ?? raw.active_YN ?? 'Y'
    };
  }

  // ---------- Form actions ----------
  resetAgentForm(): void {
    this.isCreatingNew = true;
    this.btn = '';
    this.submitted = false;
    this.selectedBranchName = '';
    this.selectedAgentCode = '';
    this.selectedCustomerCode = '';
    this.selectedCustomerName = '';
    this.data.reset({
      ID: 0,
      BRNC_CODE: '',
      AGENT_CODE: 0,
      PARTY_CODE: '',
      MobileNo: '',
      NAME: '',
      Machine_type: 'Manually',
      Join_date: '',
      Resign_Date: '',
      Active_YN: 'Y'
    });

    // create mode: allow branch & party selection, disable AGENT_CODE (server-generated)
    this.data.get('BRNC_CODE')?.enable({ emitEvent: false });
    this.data.get('PARTY_CODE')?.enable({ emitEvent: false });
    this.data.get('AGENT_CODE')?.disable({ emitEvent: false });
  }

  // ---------- Load list ----------
  loadAgents(): void {
    this.loading = true;

    this.api.get('AgentMaster/GetAllAgent').subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res) list = [res];
        this.agent_List = (list || []).map((a: any) => this.normalizeAgent(a));
      },
      error: (err) => {
        console.error('Failed to load agents', err);
        this.toastr.error('Failed to load agents');
      },
      complete: () => (this.loading = false)
    });
  }

  // ---------- Pickers & modals ----------
  onBranchClick(): void {
    if (this.btn === 'E') return;
    this.openBranch();
  }

  onCustomerClick(): void {
    if (this.btn === 'E') return;
    this.openCustomer();
  }

  onAgentClick(): void {
    if (this.btn === 'E') return;
    this.openAgent();
  }

  openBranch(): void {
    if (this.btn === 'E') return;
    this.api.get('BranchMast/GetAllBranches').subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res)
          ? res
          : res?.data && Array.isArray(res.data)
            ? res.data
            : res
              ? [res]
              : [];
        this.branchOptions = raw.map((x: any) => ({
          code: Number(x.brnc_code ?? x.BRNC_CODE ?? x.code ?? 0),
          name: String(x.brnc_name ?? x.BRNC_NAME ?? x.name ?? '')
        }));
        this.branchTempSelection = null;
        this.branchModalOpen = true;
      },
      error: () => this.toastr.error('Failed to load branches.')
    });
  }

  onBranchClosed() {
    this.branchModalOpen = false;
  }

  onBranchConfirmed(sel?: ModalOption | null) {
    this.branchModalOpen = false;
    if (!sel) return;
    this.selectedBranchName = String(sel.name ?? '');
    this.selectedBranchCode = String(sel.code ?? '');
    this.data.patchValue({ BRNC_CODE: this.selectedBranchCode });
  }

  openAgent(): void {
    if (this.btn === 'E') return;
    const list = (this.agent_List || []).map(a => ({
      code: String(a.AGENT_CODE ?? a.code ?? ''),
      name: String(a.NAME ?? '')
    }));
    this.customerOptions = list;
    this.customerTempSelection = null;
    this.customerModalOpen = true;
  }

  openCustomer(): void {
    if (this.btn === 'E') return;
    const branchVal = this.data.get('BRNC_CODE')?.value;
    const branchCode = Number((branchVal ?? '').toString().trim()) || 0;
    const url = `PartyMaster/GetCustomers?branchCode=${encodeURIComponent(branchCode)}&search=`;

    this.api.get(url).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res)
          ? res
          : res?.data && Array.isArray(res.data)
            ? res.data
            : res
              ? [res]
              : [];
        this.customerOptions = raw.map((x: any) => ({
          code: String(x.code ?? x.Code ?? x.PARTY_CODE ?? x.partyCode ?? ''),
          name: String(x.name ?? x.Name ?? x.Party_Name ?? x.CUSTOMER_NAME ?? ''),
          mobile: String(x.MobileNo ?? x.mob_no ?? x.Mobile ?? x.phonE1 ?? '')
        }));
        this.customerTempSelection = null;
        this.customerModalOpen = true;
      },
      error: (err) => {
        console.error('Failed to load customers for branch', branchCode, err);
        this.toastr.error('Failed to load customers.');
      }
    });
  }

  onCustomerClosed() {
    this.customerModalOpen = false;
  }

  onCustomerConfirmed(sel?: ModalOption | null) {
    this.customerModalOpen = false;
    if (!sel) return;
    this.selectedCustomerCode = String(sel.code ?? '');
    this.selectedCustomerName = String(sel.name ?? '');
    this.data.patchValue({
      PARTY_CODE: String(sel.code ?? ''),
      NAME: String(sel.name ?? ''),
      MobileNo: String(sel['mobile'] ?? '')
    });
  }

  // ---------- Edit & Delete ----------
  openInlineForm(agent: any): void {
    if (!agent || (!agent.ID && !agent.AGENT_CODE && !agent.code)) {
      this.toastr.warning('Invalid agent selected for edit');
      return;
    }

    this.isCreatingNew = true;
    this.btn = 'E';
    this.submitted = false;

    const a = this.normalizeAgent(agent);

    // Patch controls
    this.data.patchValue({
      ID: a.ID,
      BRNC_CODE: String(a.BRNC_CODE ?? ''),
      AGENT_CODE: Number(a.AGENT_CODE) || 0,
      PARTY_CODE: String(a.PARTY_CODE ?? ''),
      MobileNo: String(a.MobileNo ?? ''),
      NAME: String(a.NAME ?? ''),
      Machine_type: a.Machine_type || 'Manually',
      Join_date: this.formatAsDateInput(a.Join_date),
      Resign_Date: this.formatAsDateInput(a.Resign_Date),
      Active_YN: a.Active_YN || 'Y'
    });

    // Display values
    this.selectedBranchCode = String(a.BRNC_CODE ?? '');
    this.selectedBranchName = a.BRNC_NAME ? String(a.BRNC_NAME) : (a.BRNC_CODE ? `Branch ${a.BRNC_CODE}` : '');
    this.selectedCustomerCode = String(a.PARTY_CODE ?? '');
    this.selectedCustomerName = a.PARTY_NAME ? String(a.PARTY_NAME) : (a.PARTY_CODE ? `Customer ${a.PARTY_CODE}` : '');

    // Seed modal selections
    this.branchTempSelection = {
      code: Number(a.BRNC_CODE) || 0,
      name: this.selectedBranchName || ''
    };

    this.customerTempSelection = {
      code: String(a.PARTY_CODE ?? ''),
      name: this.selectedCustomerName || ''
    };

    // Edit mode: disable branch/customer/agent controls so they are read-only in UI
    this.data.get('BRNC_CODE')?.disable({ emitEvent: false });
    this.data.get('PARTY_CODE')?.disable({ emitEvent: false });
    this.data.get('AGENT_CODE')?.disable({ emitEvent: false });

    setTimeout(() => {
      this.editFocusStart?.nativeElement?.focus();
    }, 50);
  }

  deleteAgent(id: number, name?: string): void {
    if (id === null || id === undefined || id <= 0) {
      this.toastr.warning('Invalid Agent id');
      return;
    }

    this.deleteAgentID = Number(id);
    this.id = this.deleteAgentID;

    this.data.patchValue({
      AGENT_CODE: this.deleteAgentID ?? this.data.get('AGENT_CODE')?.value ?? 0
    });

    const modalEl = document.getElementById('deleteConfirmModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    } else {
      const displayName = name ?? this.data.get('NAME')?.value ?? `ID ${this.deleteAgentID}`;
      if (confirm(`Delete ${displayName}?`)) {
        this.executeDelete();
      }
    }
  }

  executeDelete(): void {
    const idToDelete = this.deleteAgentID ?? this.id ?? 0;
    if (!idToDelete || idToDelete <= 0) {
      this.toastr.warning('Invalid Agent selected');
      return;
    }

    const url = `AgentMaster/Delete?ID=${encodeURIComponent(idToDelete)}`;

    this.api.delete(url).subscribe({
      next: () => {
        this.toastr.success('Agent deleted');
        this.deleteAgentID = null;
        this.id = 0;
        this.loadAgents();
      },
      error: (err) => {
        console.error('Failed to delete Agent', err);
        this.toastr.error('Failed to delete Agent');
      }
    });
  }

  // ---------- Save / Update ----------
  submit(): void {
    this.submitted = true;
    this.data.markAllAsTouched();

    // include disabled controls too
    const v = this.data.getRawValue();

    // check form-level validity (includes dateRange validator)
    if (this.data.invalid) {
      // if date-range specifically invalid, show useful toast
      if (this.data.errors?.['dateRange']) {
        this.toastr.warning('Resign date must be the same as or after Join date.');
      } else {
        this.toastr.warning('Please fill required fields and correct validation errors.');
      }
      return;
    }

    const payload = {
      ID: v.ID || 0,
      brnc_code: v.BRNC_CODE,
      code: Number(v.AGENT_CODE) || 0,
      Party_Code: v.PARTY_CODE,
      MobileNo: v.MobileNo || '',
      NAME: v.NAME || '',
      Machine_type: Number(v.Machine_type) || 1,
      Join_date: v.Join_date || null,
      Resign_Date: v.Resign_Date || null,
      Active_YN: v.Active_YN || 'Y'
    };

    const isEdit = !!payload.ID && payload.ID > 0;
    this.saving = true;

    const api$ = isEdit
      ? this.api.post('AgentMaster/Update', payload)
      : this.api.post('AgentMaster/Save', payload);

    api$.subscribe({
      next: (res: any) => {
        // keep existing toast
        this.toastr.success(res?.message ?? 'Agent saved successfully');

        // prepare details for modal (use payload + response if needed)
        this.savedAgentDetails = {
          name: payload.NAME,
          code: res?.agentCode,   // 🔑 REAL generated code
          branch: this.selectedBranchName || payload.brnc_code
        };


        // open modal
        this.showAgentSavedModal = true;

        this.saving = false;
        this.isCreatingNew = false;
        this.btn = '';
        this.submitted = false;

        // reset form
        this.data.reset({
          ID: 0,
          BRNC_CODE: '',
          AGENT_CODE: 0,
          PARTY_CODE: '',
          MobileNo: '',
          NAME: '',
          Machine_type: 'Manually',
          Join_date: '',
          Resign_Date: '',
          Active_YN: 'Y'
        });

        this.data.get('AGENT_CODE')?.disable({ emitEvent: false });
        this.loadAgents();
      },

      error: (err) => {
        console.error('Save error', err);
        this.toastr.error('Failed to save agent');
        this.saving = false;
      }
    });
  }

  // ---------- Filter for search ----------
  filteredAgents() {
    let result = this.agent_List || [];
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      result = result.filter((a: any) =>
        (a.NAME || '').toLowerCase().includes(s) ||
        String(a.AGENT_CODE || a.code || '').toLowerCase().includes(s)
      );
    }
    return result;
  }

  // success modal state
  showAgentSavedModal = false;
  savedAgentDetails: {
    name: string;
    code: string | number;
    branch?: string;
  } | null = null;


  closeAgentSavedModal(): void {
  this.showAgentSavedModal = false;
  document.body.classList.remove('modal-open');
}

openAgentSavedModal(): void {
  this.showAgentSavedModal = true;
  document.body.classList.add('modal-open');
}


}
