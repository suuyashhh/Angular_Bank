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
    this.branchCode = sessionStorage.getItem('branchCode');
    
    // Initialize dropdown search
    this.dropdown.searchChanged$
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe(text => {
        this.api.get(
          `PartyMaster/GetCustomers?branchCode=${this.branchCode}&search=${text}`
        ).subscribe({
          next: (res: any) => {
            this.dropdown.pickerOptions$.next(res);
            this.dropdown.pickerFiltered$.next(res);
          }
        });
      });
    
    this.initializeForm();
    
    // Subscribe to picker selections
    this.picker.pickerSelected$.subscribe(sel => {
      if (!sel) return;
      const { field, option, target } = sel;
      // Handle picker selections here
    });
  }
  
  initializeForm() {
    this.form = this.fb.group({
      // Step 1
      name: ['', Validators.required],
      ADDR1: ['', Validators.required],
      ADDR2: [''],
      ADDR3: [''],
      PINCODE: ['', Validators.required],
      
      // Step 3
      interestPaidType: [''],
      
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
  
  // Utility methods
  openEdit() {
    this.isEditMode = !this.isEditMode;
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
  
  submit() {
    if (!this.form.valid) {
      this.toastr.error("Please fill all required fields");
      return;
    }
    
    // Submit logic here
    this.loader.show();
    
    // Example API call
    const payload = {
      ...this.form.value,
      branchCode: this.branchCode
    };
    
    this.api.post("PartyMaster/save", payload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        this.toastr.success("Saved Successfully!");
        console.log("API RESPONSE →", res);
        this.resetForm();
      },
      error: (err: any) => {
        this.loader.hide();
        this.toastr.error("Error saving data");
        console.error("API ERROR →", err);
      }
    });
  }
  
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