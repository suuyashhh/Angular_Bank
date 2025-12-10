import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { DropdpwnModalComponent } from '../../../shared/dropdpwn-modal/dropdpwn-modal.component';
import { DropdownService } from '../../../shared/services/dropdown.service';
import { ViewChild, ElementRef } from '@angular/core';
import { PickerService } from '../../../services/picker.service';


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
  styleUrl: './agentmst.component.css'
})
export class AgentmstComponent implements OnInit {

  @ViewChild('editFocusStart') editFocusStart!: ElementRef;


  // form & UI state
  data!: FormGroup;
  isCreatingNew = false;
  btn: '' | 'E' = '';
  saving = false;
  loading = false;

  // list / paging
  agent_List: any[] = [];
  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  // selection display values for pickers
  selectedBranchName = '';
  selectedAgentCode: string = '';
  selectedCustomerCode: string = '';
  selectedBranchCode = '';

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    private dropdown: DropdownService,
    public picker: PickerService
  ) { }

  ngOnInit(): void {
    this.data = new FormGroup({
      ID: new FormControl(0),
      BRNC_CODE: new FormControl('', Validators.required),        // Branch code (hidden input)
      AGENT_CODE: new FormControl(0),                             // Agent code (hidden input)
      PARTY_CODE: new FormControl('', Validators.required),       // Customer code (hidden input)
      MobileNo: new FormControl('', [Validators.maxLength(15)]),
      NAME: new FormControl('', Validators.required),
      Machine_type: new FormControl(1), // default: Manually
      Join_date: new FormControl(''),
      Resign_Date: new FormControl(''),
      Active_YN: new FormControl('Y', Validators.required)
    });

    this.loadAgents();
  }

  // open "New Agent" form
  resetAgentForm(): void {
    this.isCreatingNew = true;
    this.btn = '';
    this.selectedBranchName = '';
    this.selectedAgentCode = '';
    this.selectedCustomerCode = '';


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
    this.data.get('AGENT_CODE')?.disable();
  }

  // load agents list
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
      complete: () => this.loading = false
    });
  }

  // normalize server object to uniform structure
  private normalizeAgent(raw: any) {
    if (!raw) {
      return {
        ID: 0,
        BRNC_CODE: '',
        AGENT_CODE: 0,
        PARTY_CODE: '',
        MobileNo: '',
        NAME: '',
        Machine_type: '',
        Join_date: '',
        Resign_Date: '',
        Active_YN: 'Y'
        // Customer_Code : '',
      };
    }

    return {
      ID: raw.ID ?? raw.id ?? 0,
      BRNC_CODE: raw.brnc_code ?? raw.BRNC_CODE ??'',
      AGENT_CODE: raw.code ?? raw.AGENT_CODE ?? 0,
      PARTY_CODE: raw.PARTY_CODE ?? raw.Party_Code ?? '',
      MobileNo: raw.MobileNo ?? raw.mobileNo ?? raw.mob_no ?? '',
      NAME: raw.NAME ?? raw.name ?? '',
      Machine_type: raw.Machine_type ?? raw.machine_type ?? 'Manually',
      Join_date: raw.Join_date ?? raw.join_date ?? '',
      Resign_Date: raw.Resign_Date ?? raw.resign_date ?? '',
      Active_YN: raw.Active_YN ?? raw.active_YN ?? 'Y'
    };
  }

  // ------------ Modal pickers ------------

  // Branch picker
  // openBranch(): void {
  //   // TODO: change API if needed
  //   this.api.get('BranchMast/GetAllBranches').subscribe({
  //     next: (res: any) => {
  //       const raw = Array.isArray(res)
  //         ? res
  //         : (res?.data && Array.isArray(res.data) ? res.data : (res ? [res] : []));

  //       const list = raw.map((x: any) => ({
  //         code: Number(x.brnc_code ?? x.BRNC_CODE ?? x.code ?? ''),
  //         name: String(x.brnc_name ?? x.BRNC_NAME ?? x.name ?? '')
  //       }));

  //       this.dropdown.openPicker('branch', list).then(sel => {
  //         if (!sel) return;
  //         this.selectedBranchName = String(sel.name ?? '');
  //         this.data.patchValue({ BRNC_CODE: this.selectedBranchCode = ''});
  //       });
  //     },
  //     error: () => this.toastr.error('Failed to load branches.')
  //   });
  // }

  // Agent code picker (could reuse existing agents list or a special code list)
  openAgent(): void {
    // Here we reuse current agent list; you can switch to a dedicated API if you have
    const list = (this.agent_List || []).map(a => ({
      code: String(a.AGENT_CODE ?? a.code ?? ''),
      name: String(a.NAME ?? '')
    }));

    this.dropdown.openPicker('agent', list).then(sel => {
      if (!sel) return;
      // coerce to string for display
      this.selectedAgentCode = String(sel.code ?? '');
      // AGENT_CODE form control expects a number - convert safely
      this.data.patchValue({ AGENT_CODE: Number(sel.code) || 0 });
    });
  }

  // Customer (Party) picker
// Customer (Party) picker — API expects: branchCode (int), search (string)
openCustomer(): void {
  // Get branch code from form (may be string or number) and ensure it's an integer
  const branchVal = this.data.get('BRNC_CODE')?.value;
  const branchCode = Number(branchVal) || 0;

  // Initial search is empty (you can replace with a prompt or input if you want to pass a search string)
  const search = '';

  const url = `PartyMaster/GetCustomers?branchCode=${encodeURIComponent(branchCode)}&search=${encodeURIComponent(search)}`;

  this.api.get(url).subscribe({
    next: (res: any) => {
      const raw = Array.isArray(res)
        ? res
        : (res?.data && Array.isArray(res.data) ? res.data : (res ? [res] : []));

      const list = raw.map((x: any) => ({
        code: String(x.code ?? x.Code ?? x.PARTY_CODE ?? x.partyCode ?? ''),
        name: String(x.name ?? x.Name ?? x.Party_Name ?? x.CUSTOMER_NAME ?? ''),
        mobile: String(x.MobileNo ?? x.mob_no ?? x.Mobile ?? x.phonE1 ?? '')
      }));

      // openPicker returns a Promise that resolves to the selected item {code,name,...}
      this.dropdown.openPicker('customer', list).then(sel => {
        if (!sel) return;

        // coerce to string for display
        this.selectedCustomerCode = String(sel.code ?? '');

        // patch form: PARTY_CODE stored as string (or change to Number(...) if your backend expects numeric)
        this.data.patchValue({
          PARTY_CODE: String(sel.code ?? ''),
          NAME: String(sel.name ?? ''),        // auto-fill name
          MobileNo: String(sel['mobile']?? '')   // auto-fill mobile
        });
      });
    },
    error: (err) => {
      console.error('Failed to load customers for branch', branchCode, err);
      this.toastr.error('Failed to load customers.');
    }
  });
}


  // ------------ Edit & Delete ------------

  openInlineForm(agent: any): void {
    if (!agent || (!agent.ID && !agent.AGENT_CODE && !agent.code)) {
      this.toastr.warning('Invalid agent selected for edit');
      return;
    }

    this.isCreatingNew = true;
    this.btn = 'E';

    const a = this.normalizeAgent(agent);

    this.selectedBranchName = a.BRNC_CODE ? `Branch ${a.BRNC_CODE}` : '';
    this.selectedAgentCode = a.AGENT_CODE ? String(a.AGENT_CODE) : '';
    this.selectedCustomerCode = a.PARTY_CODE ? String(a.PARTY_CODE) : '';

    this.data.patchValue({
      ID: a.ID,
      BRNC_CODE: String(a.BRNC_CODE ?? ''),
      AGENT_CODE: Number(a.AGENT_CODE) || 0,
      PARTY_CODE: String(a.PARTY_CODE ?? ''),
      MobileNo: String(a.MobileNo ?? ''),
      NAME: String(a.NAME ?? ''),
      Machine_type: a.Machine_type || 'Manually',
      Join_date: a.Join_date ? a.Join_date.toString().substring(0, 10) : '',
      Resign_Date: a.Resign_Date ? a.Resign_Date.toString().substring(0, 10) : '',
      Active_YN: a.Active_YN || 'Y'
      
    });

    this.data.get('AGENT_CODE')?.disable();

    setTimeout(() => {
      this.editFocusStart?.nativeElement?.focus();
    }, 50);
  }

  deleteAgent(agent: any): void {
    const id = agent?.ID ?? agent?.id ?? 0;
    if (!id) {
      this.toastr.warning('Invalid agent');
      return;
    }
    if (!confirm(`Delete agent ${agent?.NAME ?? ''}?`)) return;

    this.api.delete(`AgentMaster/Delete?ID=${encodeURIComponent(id)}`).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'Agent deleted');
        this.loadAgents();
      },
      error: (err) => {
        console.error('Delete error', err);
        this.toastr.error('Failed to delete agent');
      }
    });
  }

  // ------------ Save / Update ------------

  submit(): void {
    if (this.data.invalid) {
      this.toastr.warning('Please fill required fields');
      return;
    }

    const v = this.data.value;

    const payload = {
      ID: v.ID || 0,
      brnc_code: v.BRNC_CODE,
      code: v.AGENT_CODE || 0,
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
        this.toastr.success(res?.message ?? (isEdit ? 'Agent updated' : 'Agent saved'));
        this.saving = false;
        this.isCreatingNew = false;
        this.btn = '';

        this.selectedBranchName = '';
        this.selectedAgentCode = '';
        this.selectedCustomerCode = '';

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

        this.data.get('AGENT_CODE')?.disable();

        this.loadAgents();
      },
      error: (err) => {
        console.error('Save error', err);
        this.toastr.error('Failed to save agent');
        this.saving = false;
      }
    });
  }

  // ------------ Filter for search ------------

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
}

