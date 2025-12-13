import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MenuCommServiceService } from '../../../shared/services/menu-comm-service.service';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';

interface RowDTO {
  CODE: number;
  NAME: string;
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
  styleUrls: ['./commanmst-f2.component.css']
})
export class CommanmstF2Component implements OnInit {

  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

  // ViewId -> table mapping
  ViewIdList: { [key: number]: { tblName: string } } = {
    0: { tblName: 'AreaMast' },//done  - 1
    1: { tblName: 'castmast' }, //done - 2
    3: { tblName: 'golditems' },//done - 3
    4: { tblName: 'occumast' },//done - 4
    5: { tblName: 'resmmast' },//done - 5
    6: { tblName: 'staffMast' },//done - 6
    7: { tblName: 'talkmast' },//done  - 7
    9: { tblName: 'villmast' },//done - 8
    10: { tblName: 'vehicle' },//done - 9
    13: { tblName: 'FamilyMast' },//done - 10
    14: { tblName: 'purpmast' },//done - 11
    15: { tblName: 'KycIdmast' },//done - 12
    16: { tblName: 'KycAddrmast' },//done - 13
    17: { tblName: 'catgmast' },//done - 14
    18: { tblName: 'diremast' },//done - 15
    20: { tblName: 'secumast' },// done - 16
    26: { tblName: 'Valuator' },//done - 17
    33: { tblName: 'pertmast'},//done - 18
    36: { tblName: 'Division_Master' },// done - 19
    51: { tblName: 'AreaMast' },// done - 20

    
    // 2: { tblName: 'GradeMast' },//not found
    // 8: { tblName: 'pertmast' },// done
    // 11: { tblName: 'zonemast' },//not found
    // 12: { tblName: 'SubkGroup' },//not found
    // 19: { tblName: 'hellmast' },//not found
    // 21: { tblName: 'LOCKERGROUP' },//not found
    // 22: { tblName: 'DDCITY' },//not found
    // 23: { tblName: 'Clg_Trn_Type' },//not found
    // 24: { tblName: 'GRPMAST' },//not found
    // 25: { tblName: 'compmast' },//not found
    // 27: { tblName: 'Bank Master' },//not found
     // 28: { tblName: 'Item Group Master' },//not found
    // 30: { tblName: 'Item Master' },//not found
    // 50: { tblName: 'Local Director' },//not found
    // 52: { tblName: 'Lawad Court Master' }//not found
  };

  form!: FormGroup;
  isCreatingNew = false;
  isEditMode = false;
  saving = false;
  loading = false;

  // grid
  dataList: RowDTO[] = [];
  page = 1;
  readonly pageSize = 15;
  searchTerm = '';

  menuName: string | null = null;
  ViewId: number | null = null;
  currentTblName = '';

  // delete
pendingDelete: RowDTO | null = null;

  constructor(
    private menuComm: MenuCommServiceService,
    private route: ActivatedRoute,
    private api: ApiService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.form = new FormGroup({
      CODE: new FormControl({ value: 0, disabled: true }),
      NAME: new FormControl('', [Validators.required, Validators.maxLength(100)])
    });

    this.menuComm.menu$.subscribe(data => {
      console.log(data);
      if (data) {
        this.menuName = data.menuName;
        this.ViewId = data.ViewId;

        this.resolveTableName();
        this.loadData();
      }
    });

  }

  // Decide tblName from ViewIdList
  private resolveTableName(): void {
    if (this.ViewId === null || this.ViewId === undefined) {
      this.currentTblName = '';
      return;
    }

    const cfg = this.ViewIdList[this.ViewId];
    if (!cfg) {
      this.currentTblName = '';
      this.toastr.error('Table mapping not found for this menu.');
      return;
    }

    this.currentTblName = cfg.tblName;
  }

  private normalizeServerObject(r: any): RowDTO {
    const code = r.fld1val ??  0;
    const name = r.fld2val ?? '';

    return {
      CODE: Number(code || 0),
      NAME: String(name || '')
    };
  }

  loadData(): void {
    if (!this.currentTblName) {
      return;
    }

    this.loading = true;
    this.api.get(`CommanMaster/GetAllMaster?tblName=${encodeURIComponent(this.currentTblName)}`)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const list = Array.isArray(res)
            ? res
            : (res?.data && Array.isArray(res.data) ? res.data : []);

          this.dataList = (list || []).map((r: any) => this.normalizeServerObject(r));
        },
        error: (err) => {
          console.error('Failed to load data', err);
          this.toastr.error('Failed to load records');
        }
      });
  }

  resetForm(): void {
    if (!this.currentTblName) {
      this.toastr.warning('Invalid master configuration');
      return;
    }

    this.isCreatingNew = true;
    this.isEditMode = false;
    this.form.reset({ CODE: 0, NAME: '' });

    setTimeout(() => this.nameInput?.nativeElement?.focus?.(), 50);
  }

  closeForm(): void {
    this.isCreatingNew = false;
    this.isEditMode = false;
    this.form.reset({ CODE: 0, NAME: '' });
  }

  private getDataById(code: number): void {
    if (!this.currentTblName) return;

    this.api
      .get(
        `CommanMaster/GetCommanMasterById?tblName=${encodeURIComponent(
          this.currentTblName
        )}&code=${code}`
      )
      .subscribe({
        next: (res: any) => {
          if (!res) {
            this.toastr.error('Record not found');
            return;
          }
          const obj = this.normalizeServerObject(res);
          this.form.patchValue({
            CODE: obj.CODE,
            NAME: obj.NAME
          });

          setTimeout(() => this.nameInput?.nativeElement?.focus?.(), 50);
        },
        error: (err) => {
          console.error('Error loading record', err);
          this.toastr.error('Failed to load record');
        }
      });
  }

  editRow(row: RowDTO): void {
    this.isCreatingNew = true;
    this.isEditMode = true;

    this.form.patchValue({
      CODE: row.CODE,
      NAME: row.NAME
    });
    setTimeout(() => this.nameInput?.nativeElement?.focus?.(), 50);

  }

  confirmDelete(row: RowDTO): void {
    this.pendingDelete = row;
  }

  deleteRow(): void {
    if (!this.pendingDelete || !this.currentTblName) {
      this.pendingDelete = null;
      return;
    }

    const code = this.pendingDelete.CODE;

    this.api
      .delete(
        `CommanMaster/DeleteCommanMaster?tblName=${encodeURIComponent(
          this.currentTblName
        )}&code=${code}`
      )
      .subscribe({
        next: (res: any) => {
          this.toastr.success(res?.message ?? 'Deleted successfully');
          this.pendingDelete = null;
          this.loadData();
          this.closeForm();
        },
        error: (err) => {
          console.error('Delete error', err);
          this.toastr.error('Failed to delete record');
          this.pendingDelete = null;
        }
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.toastr.warning('Please enter name', 'Validation');
      this.nameInput?.nativeElement?.focus?.();
      return;
    }

    if (!this.currentTblName) {
      this.toastr.error('Table name not resolved');
      return;
    }

    const code = Number(this.form.get('CODE')?.value || 0);
    const name = String(this.form.get('NAME')?.value || '').trim();

    if (!name) {
      this.toastr.warning('Please enter name', 'Validation');
      this.nameInput?.nativeElement?.focus?.();
      return;
    }

    const isEdit = this.isEditMode && code > 0;
    this.saving = true;

    if (isEdit) {
      this.api
        .put(
          `CommanMaster/UpdateCommanMaster?tblName=${encodeURIComponent(
            this.currentTblName
          )}&code=${code}&name=${encodeURIComponent(name)}`,
          {}
        )
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: (res: any) => {
            this.toastr.success(res?.message ?? 'Updated successfully');
            this.afterSave();
          },
          error: (err) => {
            console.error('Update error', err);
            this.toastr.error('Failed to update record');
          }
        });
    } else {
    
      debugger;
      this.api
        .post( `CommanMaster/Save?tblName=${encodeURIComponent(
            this.currentTblName
          )}&name=${encodeURIComponent(name)}`,
          {} )
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: (res: any) => {
            this.toastr.success(res?.message ?? 'Saved successfully');
            this.afterSave();
          },
          error: (err) => {
            console.error('Save error', err);
            this.toastr.error('Failed to save record');
          }
        });
    }
  }

  private afterSave(): void {
    this.closeForm();
    this.loadData();
  }

  filteredList(): RowDTO[] {
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
