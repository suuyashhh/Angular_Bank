import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MenuCommServiceService } from '../../../shared/services/menu-comm-service.service';
// import { ApiService } from '../../../services/api.service'; // when you wire APIs
// import { ToastrService } from 'ngx-toastr';

interface MasterConfig {
  tblName: string;
  title: string;
  shortTitle: string;
  nameLabel?: string;
}
@Component({
  selector: 'app-commanmst-f2',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgxPaginationModule,
    RouterModule
  ],
  templateUrl: './commanmst-f2.component.html',
  styleUrl: './commanmst-f2.component.css'
})
export class CommanmstF2Component implements OnInit {

   masterConfig: Record<string, MasterConfig> = {
    staff:  { tblName: 'StaffMast',  title: 'Staff Master',  shortTitle: 'Staff',  nameLabel: 'Staff Name' },
    city:   { tblName: 'CityMast',   title: 'City Master',   shortTitle: 'City',   nameLabel: 'City Name' },
    state:  { tblName: 'StateMast',  title: 'State Master',  shortTitle: 'State',  nameLabel: 'State Name' },
    country:{ tblName: 'CountryMast',title: 'Country Master',shortTitle: 'Country',nameLabel: 'Country Name' },
    // add more here...
  };

  masterKeys: string[] = Object.keys(this.masterConfig);
  currentKey: string = this.masterKeys[0];
  get currentConfig(): MasterConfig | null {
    return this.masterConfig[this.currentKey] || null;
  }

  form!: FormGroup;
  isCreatingNew = false;
  isEditMode = false;
  saving = false;
  loading = false;

  // grid
  dataList: { CODE: string; NAME: string }[] = [];
  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  menuName: any;

  // delete
  pendingDelete: { CODE: string; NAME: string } | null = null;

  constructor(
    private menuComm: MenuCommServiceService,
    private route: ActivatedRoute,
    // private api: ApiService,
    // private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.menuComm.menu$.subscribe(data => {
      
    if (data) {
      this.menuName = data.menuName;

      // OPTIONAL → use menu name to select the correct master
      // this.currentKey = data.menuName.toLowerCase();
    }
  });
    this.form = new FormGroup({
      CODE: new FormControl({ value: '', disabled: true }), // code generated on server
      NAME: new FormControl('', [Validators.required, Validators.maxLength(100)])
    });

    // Optional: read which master from route param or query
    const fromRoute = this.route.snapshot.queryParamMap.get('master');
    if (fromRoute && this.masterConfig[fromRoute]) {
      this.currentKey = fromRoute;
    }

    this.loadData();
  }

  onMasterChange(key: string): void {
    if (!this.masterConfig[key]) return;
    this.currentKey = key;
    this.page = 1;
    this.closeForm();
    this.loadData();
  }

  resetForm(): void {
    this.isCreatingNew = true;
    this.isEditMode = false;
    this.form.reset({ CODE: '', NAME: '' });
  }

  closeForm(): void {
    this.isCreatingNew = false;
    this.isEditMode = false;
    this.form.reset({ CODE: '', NAME: '' });
  }

  editRow(row: { CODE: string; NAME: string }): void {
    this.isCreatingNew = true;
    this.isEditMode = true;
    this.form.patchValue({
      CODE: row.CODE,
      NAME: row.NAME
    });
  }

  confirmDelete(row: { CODE: string; NAME: string }): void {
    this.pendingDelete = row;
  }

  deleteRow(): void {
    if (!this.pendingDelete || !this.currentConfig) {
      this.pendingDelete = null;
      return;
    }

    const tblName = this.currentConfig.tblName;
    const code = this.pendingDelete.CODE;

    // TODO: wire actual delete API
    // this.api.delete(`CommanMaster/DeleteCommanMaster?tblName=${tblName}&code=${encodeURIComponent(code)}`)
    //   .subscribe({ ... });

    // For now: just simulate delete in UI
    this.dataList = this.dataList.filter(x => x.CODE !== code);
    this.pendingDelete = null;
  }

  submit(): void {
    if (this.form.invalid || !this.currentConfig) return;

    const tblName = this.currentConfig.tblName;
    const code = this.form.get('CODE')?.value; // empty for new
    const name = (this.form.get('NAME')?.value || '').trim();

    if (!name) return;

    this.saving = true;

    if (this.isEditMode && code) {
      // UPDATE mode – you will later call:
      // PUT api/CommanMaster/UpdateCommanMaster?tblName=...&code=...&name=...
      // For now, just update in local array
      const idx = this.dataList.findIndex(x => x.CODE === code);
      if (idx !== -1) this.dataList[idx].NAME = name;
      this.afterSave();
    } else {
      // INSERT mode – server will generate CODE.
      // You will later call POST api/CommanMaster/Save with DTOCommanMaster { flag=1, TblName=tblName, fld1='CODE', fld2='NAME', fld2val=name }
      // For now, just add a fake row with next code:
      const nextCode = (this.dataList.length > 0
        ? Math.max(...this.dataList.map(x => Number(x.CODE) || 0)) + 1
        : 1).toString();

      this.dataList.push({ CODE: nextCode, NAME: name });
      this.afterSave();
    }
  }

  private afterSave(): void {
    this.saving = false;
    this.closeForm();
  }

  loadData(): void {
    if (!this.currentConfig) return;
    this.loading = true;

    const tblName = this.currentConfig.tblName;

    // TODO: wire actual API:
    // GET api/CommanMaster/GetAllMaster?tblName=tblName
    // this.api.get(`CommanMaster/GetAllMaster?tblName=${tblName}`).subscribe({ ... });

    // For now: just simulate data for UI demo
    setTimeout(() => {
      this.dataList = [
        { CODE: '1', NAME: `${this.currentConfig?.shortTitle} 1` },
        { CODE: '2', NAME: `${this.currentConfig?.shortTitle} 2` },
        { CODE: '3', NAME: `${this.currentConfig?.shortTitle} 3` }
      ];
      this.loading = false;
    }, 300);
  }

  filteredList() {
    let list = this.dataList || [];
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(x =>
        (x.NAME || '').toLowerCase().includes(s) ||
        String(x.CODE || '').toLowerCase().includes(s)
      );
    }
    return list;
  }

}
