import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PickerService } from '../../../services/picker.service';
import { PickerModalComponent } from '../../../shared/picker-modal/picker-modal.component';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-usermst',
  standalone: true,
  imports: [ReactiveFormsModule, PickerModalComponent],
  templateUrl: './usermst.component.html',
  styleUrl: './usermst.component.css'
})
export class UsermstComponent implements OnInit {
  userForm!: FormGroup;
  selectedCountryName = '';
  list: any[] = [];

  constructor(
    private fb: FormBuilder,
    public picker: PickerService,
    private api: ApiService
  ) {}

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

    
    
    // this.loadCountryList();
    
    this.picker.pickerSelected$.subscribe((selected:any) => {
      if (selected && selected.name) {
        this.selectedCountryName = selected.name; // ✅ updates your input
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
