import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { LoaderService } from '../../../services/loader.service';
import { PickerModalComponent } from '../../../shared/picker-modal/picker-modal.component';
import { PickerService } from '../../../services/picker.service';
import { ValidationService } from '../../../shared/services/validation.service';
import { debounceTime, distinctUntilChanged, finalize, Subject } from 'rxjs';
import { DropdpwnModalComponent } from '../../../shared/dropdpwn-modal/dropdpwn-modal.component';
import { DropdownService } from '../../../shared/services/dropdown.service';

@Component({
  selector: 'app-depositaccount-opening',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PickerModalComponent,
    ReactiveFormsModule,
    DropdpwnModalComponent,
  ],
  providers: [DropdownService],
  standalone: true,
  templateUrl: './depositaccount-opening.component.html',
  styleUrls: ['./depositaccount-opening.component.css']
})
export class DepositaccountOpeningComponent implements OnInit {
  // General properties
  accountType = '0';
  isEditMode = false;
  searchText = '';
  branchCode: string | null = null;


  selectedGlCode: string = '';
  selectedGlName: string = '';
  selectedType: string = '';


  // Form
  form!: FormGroup;

  // Step management
  currentStep = 1;
  stepValidators: any = {
    1: () => this.validateStep1(),
    2: () => this.validateStep2(),
    3: () => this.validateStep3(),
    4: () => this.validateStep4(),
    5: () => this.validateStep5()
  };

  stepStatus: any = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null
  };

  // Search
  searchTextChanged = new Subject<string>();

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    private loader: LoaderService,
    public picker: PickerService,
    public fb: FormBuilder,
    public vs: ValidationService,
    public dropdown: DropdownService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm() {
    this.form = this.fb.group({
      // Step 1
      name: ['', Validators.required],
      ADDR1: ['', Validators.required],
      ADDR2: [''],
      ADDR3: [''],
      PINCODE: ['', Validators.required],
      GLCode: [''],
      GLName: [''],
      GLType: ['']

      // Add other form controls as needed
    });
  }

  // Step navigation methods
  goToStep(step: number) {
    this.navigateTo(step);
  }

  tryOpenStep(step: number) {
    this.navigateTo(step);
  }

  navigateTo(step: number) {
    const r = document.getElementById(`step-${step}`) as HTMLInputElement;
    if (r) {
      r.checked = true;
      this.currentStep = step;
    }
  }

  // Step validation methods
  validateStep1(): boolean {
    const controls = ['name', 'ADDR1', 'PINCODE'];
    let valid = true;

    for (let c of controls) {
      const ctrl = this.form.get(c);
      if (ctrl && !ctrl.disabled && ctrl.invalid) {
        this.toastr.error("Please fill required fields");
        ctrl.markAsTouched();
        valid = false;
      }
    }

    return valid;
  }

  validateStep2(): boolean {
    // Add validation logic for step 2
    return true;
  }

  validateStep3(): boolean {
    // Add validation logic for step 3
    return true;
  }

  validateStep4(): boolean {
    // Add validation logic for step 4
    return true;
  }

  validateStep5(): boolean {
    // Add validation logic for step 5
    return true;
  }

  // Step UI methods
  getStepClass(step: number) {
    const status = this.stepStatus[step];

    return {
      'border-violet-600 bg-violet-50 text-violet-700': this.currentStep === step,
      'border-green-500 bg-green-50 text-green-700': status === true && this.currentStep !== step,
      'border-red-500 bg-red-50 text-red-700': status === false && this.currentStep !== step,
      'border-gray-300 bg-gray-50 text-gray-500': status === null && this.currentStep !== step
    };
  }

  getStepIcon(step: any): string {
    const activeIcons: any = {
      1: 'user',
      2: 'home',
      3: 'id',
      4: 'office',
      5: 'check-circle'
    };

    const current = this.currentStep;
    const status = this.stepStatus[step];

    if (current === step) return activeIcons[step];
    if (status === true) return 'check';
    if (status === false) return 'cross';

    return 'number';
  }

  openGlCodeModel(): void {
    const url = `DepositeAccountOpening/GetGlCodeAll`;

    this.api.get(url).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res)
          ? res
          : (res?.data && Array.isArray(res.data) ? res.data : (res ? [res] : []));

        const list = raw.map((x: any) => ({
          code: String(x.code ?? ''),
          name: String(x.name ?? ''),
          type: String(x.type ?? '')
        }));

        this.dropdown.openPicker('Deposit Acc Open', list).then(sel => {
          if (!sel) return;
          debugger;
          this.selectedGlCode = String(sel.code ?? '');

          this.form.patchValue({
            GLCode: String(sel.code ?? ''),
            GLName: String(sel.name ?? ''),
            GLType: String(sel['type'] ?? '')
          });
        });
      },
      error: (err) => {
        console.error('Failed to load customers for GLCode', err);
        this.toastr.error('Failed to load GLCode.');
      }
    });
  }


  getCustomers() {
    this.api.get(
      `PartyMaster/GetCustomers?branchCode=${this.branchCode}&search=`
    ).subscribe({
      next: (res: any) => {
        this.dropdown.openPicker('Customers', res).then(sel => {
          if (sel) {
            // Handle customer selection
          }
        });
      }
    });
  }

  submit() { }

  resetForm() {
    this.form.reset();
    this.isEditMode = false;
    this.currentStep = 1;

    // Reset step status
    Object.keys(this.stepStatus).forEach(key => {
      this.stepStatus[key] = null;
    });

    // Reset to step 1
    this.navigateTo(1);
  }

  scrollToFirstInvalid() {
    setTimeout(() => {
      const invalidField: HTMLElement | null =
        document.querySelector('.ng-invalid:not([disabled])');

      if (invalidField) {
        invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        invalidField.classList.add('shake-anim');
        setTimeout(() => {
          invalidField.classList.remove('shake-anim');
        }, 350);
      }
    }, 50);
  }
}