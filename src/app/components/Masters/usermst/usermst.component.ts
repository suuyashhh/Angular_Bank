import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PickerService } from '../../../services/picker.service'; 
import { DropdownService, DropdownOption } from '../../../shared/services/dropdown.service.ts.service'; 
import { PickerModalComponent } from '../../../shared/picker-modal/picker-modal.component';
import { ApiService } from '../../../services/api.service';
import { DropdpwnModalComponent } from '../../../shared/dropdpwn-modal/dropdpwn-modal.component';

@Component({
  selector: 'app-usermst',
  standalone: true,
  imports: [ReactiveFormsModule, PickerModalComponent,DropdpwnModalComponent],
  templateUrl: './usermst.component.html',
  styleUrl: './usermst.component.css'
})
export class UsermstComponent implements OnInit {
  userForm!: FormGroup;
  selectedCountry: DropdownOption | null = null;
  list: any[] = [];
  data:any;

  constructor(
    private fb: FormBuilder,
    public picker: PickerService,
    private api: ApiService,
    private dropdown: DropdownService
  ) {}

   selectedDemo: DropdownOption | null = null;

openCountry() {
  const list = [
    { name: 'India', code: 1 },
    { name: 'USA', code: 2 },
    { name: 'Japan', code: 3 }
  ];

  this.dropdown.openPicker('Country', list).then(sel => {
    if (sel) {
      this.selectedCountry = sel;
      console.log(this.selectedCountry);
      
    }
  });
}



  ngOnInit(): void {
    this.userForm = this.fb.group({
      employeeCode: ['', Validators.required],
      userId: ['', Validators.required],
      name: ['', Validators.required],
      mobileNo: ['', Validators.required],
      access: ['', Validators.required],
      cashReceipt: ['', Validators.required],
      cashPayment: ['', Validators.required],
      passingReceipt: ['', Validators.required],
      passingPayment: ['', Validators.required],
      voucherSrNo: ['', Validators.required],
      workingBranch: ['', Validators.required],
      counterName: ['', Validators.required],
      password: ['', Validators.required]
    });


    
    this.picker.resetSelections();
    // this.loadCountryList();
    
    this.picker.pickerSelected$.subscribe((selected:any) => {
      if (selected && selected.name) {
        this.selectedCountry = selected.name; // ✅ updates your input
        console.log(selected);
      }
    });

  }

  // loadCountryList() {
  //   const apiUrl = `CountryMaster/GetAll`;
  //   this.api.get(apiUrl).subscribe({
  //     next: (res: any) => {
  //       this.list = res;
  //       console.log('Country list:', res);
  //     },
  //     error: (err: any) => {
  //       console.error('Error loading countries', err);
  //     }
  //   });
  // }

  // openCountryPicker() {
  //   if (this.list?.length) {
  //     this.picker.openCustomPicker('Country', this.list);
  //   } else {
  //     console.warn('Country list not loaded yet.');
  //   }
  // }

  onSave() {
    if (this.userForm.valid) {
      console.log('Form Submitted:', this.userForm.value);
    }
  }

  onCancel() {
    this.userForm.reset();
  }

  onExit() {
    console.log('Exit clicked');
  }
}
