import { Component, OnInit, ViewChild, ElementRef, HostListener, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { LoaderService } from '../../../services/loader.service';
import { PickerModalComponent } from '../../../shared/picker-modal/picker-modal.component';
import { PickerService } from '../../../services/picker.service';
import { ValidationService } from '../../../shared/services/validation.service';
import { debounceTime, distinctUntilChanged, finalize, share, Subject } from 'rxjs';
import { BasicContactInputsComponent } from '../../../shared/basic-contact-inputs/basic-contact-inputs.component';
import { GstFormatDirective } from '../../../shared/directives/gst-format.directive';
import { MobileFormatDirective } from '../../../shared/directives/mobile-format.directive';
import { PhoneFormatDirective } from '../../../shared/directives/phone-format.directive';
// import { ValidIndicatorDirective } from '../../../shared/directives/valid-indicator.directive';
import { AadhaarFormatDirective } from '../../../shared/directives/aadhaar-format.directive';
import { PanFormatDirective } from '../../../shared/directives/pan-format.directive';
import { AsyncValidationService } from '../../../shared/services/async-validation.service';
import { ValidatedInputDirective } from '../../../shared/directives/valid-indicator.directive';
import { ShowErrorsDirective } from '../../../shared/directives/show-errors.directive';
import { ValidationSignal } from '../../../shared/services/validation-signals.service';
import { VoterIdFormatDirective } from '../../../shared/directives/voterid-format.directive';
import { PassportFormatDirective } from '../../../shared/directives/passport-format.directive';
import { InputRestrictionDirective } from '../../../shared/directives/input-restriction.directive';
import { DropdownOption, DropdownService } from '../../../shared/services/dropdown.service';
import { DropdpwnModalComponent } from '../../../shared/dropdpwn-modal/dropdpwn-modal.component';

type PickerField = 'city' | 'area' | 'religion' | 'cast' | 'occupation' | 'idproof' | 'addrproof' | 'otherstaff';
type PickerTarget = 'primary' | 'corr';
type PreviewKey = 'photo' | 'sign' | 'pan' | 'aadhaarFront' | 'aadhaarBack';

// updated Option type with dependency fields
type Option = {
  code: number;
  name: string;
  selectId?: number;
  pin?: string | null;

  // dependency fields returned by GetAllDependencies
  talukaCode?: number;
  talukaName?: string;
  distCode?: number;
  distName?: string;
  stateCode?: number;
  stateName?: string;
  countryCode?: number;
  countryName?: string;
};

@Component({
  selector: 'app-depositaccount-opening',
  imports:[
    CommonModule,
    FormsModule,
    RouterModule,
    PickerModalComponent,
    ReactiveFormsModule,

    // Our standalone contact component
    BasicContactInputsComponent,
    DropdpwnModalComponent,

    // standalone directives
    AadhaarFormatDirective,
    GstFormatDirective,
    MobileFormatDirective,
    PhoneFormatDirective,
    ValidatedInputDirective,
    PanFormatDirective,
    ShowErrorsDirective,
    VoterIdFormatDirective,
    PassportFormatDirective,
    InputRestrictionDirective],
  standalone: true,
  templateUrl: './depositaccount-opening.component.html',
  styleUrls: ['./depositaccount-opening.component.css']
})
export class DepositaccountOpeningComponent implements OnInit {

  // ---------- general ----------
  accountType = '0';

  // Other/Staff fields
  otherStaffType = 'O'; // Default to 'Other'
  otherStaffName: DropdownOption | null = null;
  otherStaffCode: number | null = null;

  // Corresponding address toggle
  useDifferentCorresponding = false;

  // Corresponding address fields
  CorrAddr1 = '';
  CorrAddr2 = '';
  CorrAddr3 = '';

  // ---------- Picker State ----------
  pickerOpen = false;
  pickerField: PickerField | null = null;
  pickerTarget: PickerTarget = 'primary';
  pickerTitle = '';
  pickerOptions: Option[] = [];
  pickerOptionsFiltered: Option[] = [];
  pickerSelectedCode: number | null = null;
  pickerSelectedName: string | null = null;
  pickerSelectedObj: Option | null = null; // store full selected object
  pickerLoading = false;
  pickerSearch = '';
  dropdownOpen = false;

  // ---------- Primary Address ----------
  selectedCountryCode: number | null = null;
  selectedCountryName = '';
  selectedStateCode: number | null = null;
  selectedStateName = '';
  selectedDistrictCode: number | null = null;
  selectedDistrictName = '';
  selectedTalukaCode: number | null = null;
  selectedTalukaName = '';
  selectedCityCode: number | null = null;
  selectedCityName = '';
  selectedCityUnicId: number | null = null;
  selectedAreaCode: number | null = null;
  selectedAreaName = '';
  selectedPincode: number | null = null;

  // ---------- Corresponding Address ----------
  corrCityName = '';
  corrSelectedCityCode: number | null = null;
  corrSelectedCityUnicId: number | null = null;
  corrSelectedCountryCode: number | null = null;
  corrCountryName = '';
  corrSelectedStateCode: number | null = null;
  corrStateName = '';
  corrSelectedDistrictCode: number | null = null;
  corrDistrictName = '';
  corrSelectedTalukaCode: number | null = null;
  corrTalukaName = '';
  corrSelectedAreaCode: number | null = null;
  corrAreaName = '';
  corrPincode: number | null = null;

  // ---------- Religion / Caste / Occupation ----------
  religionName = '';
  religionCode: number | null = null;
  castName = '';
  castCode: number | null = null;
  occupationName = '';
  occupationCode: number | null = null;
  idproofName = '';
  idproofCode: number | null = null;
  addrproofName = '';
  addrproofCode: number | null = null;
  form: any;
  // ---------- File Previews ----------
  previews: Record<PreviewKey, string | null> = {
    photo: null,
    sign: null,
    pan: null,
    aadhaarFront: null,
    aadhaarBack: null
  };
  activeKey: PreviewKey | null = null;
  modalOpen = false;

  // input fields
  child!: BasicContactInputsComponent;
  contactForm!: FormGroup;
  contactFormValid: boolean = false;

  isOtherStaffSelected = false;
  branchCode: string | null = null;
  isEditMode: boolean = false;

  searchText: string = '';
  searchTextChanged = new Subject<string>();
  selectedCustomer: any = null;


  // ---------- Template Refs ----------
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('signInput') signInput!: ElementRef<HTMLInputElement>;
  @ViewChild('panInput') panInput!: ElementRef<HTMLInputElement>;
  @ViewChild('aadhaarFrontInput') aadhaarFrontInput!: ElementRef<HTMLInputElement>;
  @ViewChild('aadhaarBackInput') aadhaarBackInput!: ElementRef<HTMLInputElement>;
  @ViewChild('pickerSearchInput') pickerSearchInput!: ElementRef<HTMLInputElement>;

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    private loader: LoaderService,
    public picker: PickerService,
    public fb: FormBuilder,
    public vs: ValidationService,
    public asyncVs: AsyncValidationService,
    public dropdown: DropdownService
  ) { }
  pan = new ValidationSignal(this.vs, 'pan');
  aadhaar = new ValidationSignal(this.vs, 'aadhaar');
  gst = new ValidationSignal(this.vs, 'gst');
  mobile = new ValidationSignal(this.vs, 'mobile');
  phone = new ValidationSignal(this.vs, 'phone');
  email = new ValidationSignal(this.vs, 'email');
  voterid = new ValidationSignal(this.vs, 'voterid');
  passport = new ValidationSignal(this.vs, 'passport');

  ngOnInit(): void {

    this.branchCode = sessionStorage.getItem('branchCode');
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



    this.form_Group();

    this.picker.resetSelections();

    this.picker.pickerSelected$.subscribe(sel => {

      if (!sel) return;

      const { field, option, target } = sel;


      /* ---------------------------------------
       * PRIMARY ADDRESS
       * --------------------------------------- */
      if (target === 'primary') {

        /* 🔵 CITY (PRIMARY) */
        if (field === 'city') {

          if (!option) {
            this.selectedCityName = '';
            return;
          }

          this.selectedCityName = option.name;
          this.selectedCityCode = Number(option.code ?? null);
          this.selectedCityUnicId = Number(option.uniqCode ?? option.code ?? 0);

          // Dependencies
          this.selectedTalukaName = option.talukA_NAME ?? '';
          this.selectedDistrictName = option.disT_NAME ?? '';
          this.selectedStateName = option.statE_NAME ?? '';
          this.selectedCountryName = option.countrY_NAME ?? '';

          this.selectedTalukaCode = Number(option.talukA_CODE ?? 0);
          this.selectedDistrictCode = Number(option.disT_CODE ?? 0);
          this.selectedStateCode = Number(option.statE_CODE ?? 0);
          this.selectedCountryCode = Number(option.countrY_CODE ?? 0);

          console.log('PRIMARY CITY:', option);
        }


        /* 🔵 AREA (PRIMARY) */
        if (field === 'area') {

          if (!option) {
            this.selectedAreaName = '';
            return;
          }

          this.selectedAreaName = option.name;
          this.selectedAreaCode = Number(option.areA_CODE ?? null);
          this.selectedPincode = Number(option.piN_CODE ?? 0);

          console.log('PRIMARY AREA:', option);
        }


        /* 🔵 RELIGION (PRIMARY) */
        if (field === 'religion') {
          this.religionName = option?.name ?? '';
          this.religionCode = Number(option?.code ?? 0);

          console.log("PRIMARY RELIGION:", option);
        }

        /* 🔵 CASTE (PRIMARY) */
        if (field === 'cast') {
          this.castName = option?.name ?? '';
          this.castCode = Number(option?.code ?? 0);

          console.log("PRIMARY CAST:", option);
        }

        /* 🔵 OCCUPATION (PRIMARY) */
        if (field === 'occupation') {
          this.occupationName = option?.name ?? '';
          this.occupationCode = Number(option?.code ?? 0);

          console.log("PRIMARY OCCUPATION:", option);
        }

        /* 🔵 ID PROOF (PRIMARY) */
        if (field === 'idproof') {
          this.idproofName = option?.name ?? '';
          this.idproofCode = Number(option?.code ?? 0);

          console.log("PRIMARY ID PROOF:", option);
        }

        /* 🔵 ADDRESS PROOF (PRIMARY) */
        if (field === 'addrproof') {
          this.addrproofName = option?.name ?? '';
          this.addrproofCode = Number(option?.code ?? 0);

          console.log("PRIMARY ADDRESS PROOF:", option);
        }

      }



      /* ---------------------------------------
       * CORRESPONDING ADDRESS
       * --------------------------------------- */
      if (target === 'corr') {

        /* 🔵 CITY (CORR) */
        if (field === 'city') {

          if (!option) {
            this.corrCityName = '';
            return;
          }

          this.corrCityName = option.name;
          this.corrSelectedCityCode = Number(option.code ?? null);
          this.corrSelectedCityUnicId = Number(option.uniqCode ?? option.code ?? 0);

          this.corrTalukaName = option.talukA_NAME ?? '';
          this.corrDistrictName = option.disT_NAME ?? '';
          this.corrStateName = option.statE_NAME ?? '';
          this.corrCountryName = option.countrY_NAME ?? '';

          this.corrSelectedTalukaCode = Number(option.talukA_CODE ?? 0);
          this.corrSelectedDistrictCode = Number(option.disT_CODE ?? 0);
          this.corrSelectedStateCode = Number(option.statE_CODE ?? 0);
          this.corrSelectedCountryCode = Number(option.countrY_CODE ?? 0);

          console.log('CORR CITY:', option);
        }


        /* 🔵 AREA (CORR) */
        if (field === 'area') {

          if (!option) {
            this.corrAreaName = '';
            return;
          }

          this.corrAreaName = option.name;
          this.corrSelectedAreaCode = Number(option.areA_CODE ?? null);
          this.corrPincode = Number(option.piN_CODE ?? 0);

          console.log('CORR AREA:', option);
        }


      }

    });

  }


  form_Group() {
    this.form = this.fb.group({
      // Step 1 – Basic Details
      AcType: ['0',Validators.required],
      panNo: ['',Validators.required],
      AdharNo: ['',Validators.required],
      GSTNo: ['',Validators.required],
      nmprefix: ['',Validators.required],
      name: ['',Validators.required],

      // Step 2 – Address (Permanent)
      ADDR1: ['',Validators.required],
      ADDR2: [''],
      ADDR3: [''],
      City: ['',Validators.required],
      cityCode: [null,Validators.required],
      countryCode: [null,Validators.required],
      stateCode: [null,Validators.required],
      districtCode: [null,Validators.required],
      talukaCode: [null,Validators.required],
      areaCode: [null,Validators.required],
      pincode: ['',Validators.required],
      phone: [''],
      mobile: ['',Validators.required],

      // Corresponding Address toggle
      useDifferentCorresponding: [false],

      // Corresponding Address
      CorrAddr1: [''],
      CorrAddr2: [''],
      CorrAddr3: [''],
      corrCityCode: [null],
      corrCountryCode: [null],
      corrStateCode: [null],
      corrDistrictCode: [null],
      corrTalukaCode: [null],
      corrAreaCode: [null],
      corrPincode: [''],

      // Step 3 – Personal Details
      Religon: [null,Validators.required],
      Cast: [null,Validators.required],
      OCCU: [null,Validators.required],
      passportno: [''],
      passexpdate: [''],
      passauth: [''],
      voteridno: [''],
      birthdate: ['',Validators.required],
      AGE: ['',Validators.required],
      SEX: ['',Validators.required],
      ST_DIR: ['O'],
      Ref_STDIR: [null],

      // Company / Firm Details
      COMPREGNO: [''],
      COMPREGDT: [''],
      COMPBRANCH: [''],
      COMPNATURE: [''],
      COMPPAIDCAPT: [''],
      COMPTURNOVER: [''],
      COMPNETWORTH: [''],
      Propritor1: [''],
      Propritor2: [''],

      // Step 4 – Other Details
      officename: [''],
      OFFICEPIN: [''],
      OFFICEADDR1: [''],
      OFFICEADDR2: [''],
      OFFICEADDR3: [''],
      OFFICEPHONE: [''],
      OFFICEPHONE1: [''],
      EMAIL_ID: ['',Validators.required],

      // Step 5 – KYC Details
      KycIdProof: [false],
      idProofCode: [null],
      KycAddrProof: [false],
      addressProofCode: [null],

      // File uploads
      photo: [null],
      sign: [null],
      panFile: [null],
      aadhaarFront: [null],
      aadhaarBack: [null]
    });
  }
  submit() {
      // make sure last step also validated
  const lastValid = this.stepValidators[5]();
  this.stepStatus[5] = lastValid;

  // ensure all steps true
  // for (let i = 1; i <= 5; i++) {
  //   if (this.stepStatus[i] !== true) {
  //     this.toastr.error(`Step ${i} is not completed correctly`);
  //     this.navigateTo(i);
  //     return;
  //   }
  // }
    if (!this.form) return;

    // -----------------------------
    // 1️⃣  COLLECT FORM VALUES
    // -----------------------------
    const f = this.form.value;

    // -----------------------------
    // 2️⃣ COLLECT PICKER SELECTIONS
    // -----------------------------
    const payload: any = {
      // STEP 1 – BASIC DETAILS
      brnc_code: this.branchCode,
      AcType: f.AcType,
      pan_no: f.panNo,
      AdharNo: f.AdharNo,
      GstNo: f.GSTNo,
      nmprefix: f.nmprefix,
      Name: f.name,

      // STEP 2 – PERMANENT ADDRESS
      ADDR1: f.ADDR1,
      ADDR2: f.ADDR2,
      ADDR3: f.ADDR3,
      City: this.selectedCityName,
      CityCode: this.selectedCityCode,
      NationalityCode: this.selectedCountryCode,
      NATIONALITY: this.selectedCountryName,
      StateCode: this.selectedStateCode,
      State: this.selectedStateName,
      DistCode: this.selectedDistrictCode,
      District: this.selectedDistrictName,
      TalukaCode: this.selectedTalukaCode,
      Taluka: this.selectedTalukaName,
      Area_code: this.selectedAreaCode,
      Area: this.selectedAreaName,
      PIN: this.selectedPincode,
      PHONE: f.phone,
      PHONE1: f.mobile,

      // CORRESPONDING ADDRESS
      chkSameadd: this.useDifferentCorresponding ? 1 : 0,

      CorADDR1: f.CorrAddr1,
      CorADDR2: f.CorrAddr2,
      CorADDR3: f.CorrAddr3,
      Cor_CityCode: this.corrSelectedCityCode,
      Cor_City: this.corrCityName,
      Cor_NationalityCode: this.corrSelectedCountryCode,
      Cor_NATIONALITY: this.corrCountryName,
      Cor_StateCode: this.corrSelectedStateCode,
      Cor_State: this.corrStateName,
      Cor_DistCode: this.corrSelectedDistrictCode,
      Cor_District: this.corrDistrictName,
      Cor_TalukaCode: this.corrSelectedTalukaCode,
      Cor_Taluka: this.corrTalukaName,
      Cor_Area_code: this.corrSelectedAreaCode,
      Cor_Area: this.corrAreaName,
      CorPIN: this.corrPincode,

      // STEP 3 – PERSONAL DETAILS
      Religon: this.religionCode,
      Cast: this.castCode,
      OCCU: this.occupationCode,
      passportno: f.passportno,
      passexpdate: f.passexpdate,
      passauth: f.passauth,
      voteridno: f.voteridno,
      birthdate: f.birthdate,
      AGE: f.AGE,
      SEX: f.SEX,

      // Other/Staff
      ST_DIR: this.otherStaffType,
      Ref_STDIR: this.otherStaffName?.code ?? null,

      // COMPANY DETAILS

      COMPREGNO: f.COMPREGNO,
      COMPREGDT: f.COMPREGDT,
      COMPBRANCH: f.COMPBRANCH,
      COMPNATURE: f.COMPNATURE,
      COMPPAIDCAPT: f.COMPPAIDCAPT,
      COMPTURNOVER: f.COMPTURNOVER,
      COMPNETWORTH: f.COMPNETWORTH,
      Propritor1: f.Propritor1,
      Propritor2: f.Propritor2,

      // STEP 4 – OTHER DETAILS
      officename: f.officename,
      OFFICEPIN: f.OFFICEPIN,
      OFFICEADDR1: f.OFFICEADDR1,
      OFFICEADDR2: f.OFFICEADDR2,
      OFFICEADDR3: f.OFFICEADDR3,
      OFFICEPHONE: f.OFFICEPHONE,
      OFFICEPHONE1: f.OFFICEPHONE1,
      EMAIL_ID: f.EMAIL_ID,

      // STEP 5 – KYC DETAILS
      KycIdProof: f.KycIdProof ? 1 : 0,
      KycIdProof_Code: this.idproofCode,
      KycAddrProof: f.KycAddrProof ? 1 : 0,
      KycAddrProof_Code: this.addrproofCode,
    };

    // -----------------------------
    // 3️⃣ FILES
    // -----------------------------
    const Pictures = [];

    if (this.previews.photo) {
      Pictures.push({
        Picture: this.previews.photo,
        flag: 1,      // 1 = Photo
        srno: 1,
        Scan_By: 0
      });
    }

    if (this.previews.sign) {
      Pictures.push({
        Picture: this.previews.sign,
        flag: 2,      // 2 = Signature
        srno: 1,
        Scan_By: 0
      });
    }

    if (this.previews.pan) {
      Pictures.push({
        Picture: this.previews.pan,
        flag: 3,      // PAN FILE
        srno: 1,
        Scan_By: 0
      });
    }

    if (this.previews.aadhaarFront) {
      Pictures.push({
        Picture: this.previews.aadhaarFront,
        flag: 4,      // Aadhaar Front
        srno: 1,
        Scan_By: 0
      });
    }

    if (this.previews.aadhaarBack) {
      Pictures.push({
        Picture: this.previews.aadhaarBack,
        flag: 5,      // Aadhaar Back
        srno: 1,
        Scan_By: 0
      });
    }


    // -----------------------------
    // 4️⃣ COMBINE ALL FINAL DATA
    // -----------------------------
    const finalPayload = {
      ...payload,
      Pictures: Pictures,

    };

    console.log("FINAL PAYLOAD →", finalPayload);

    // -----------------------------
    // 5️⃣ SEND TO API
    // -----------------------------
    this.loader.show();

    console.log(finalPayload);

    this.api.post("PartyMaster/save", finalPayload).subscribe({
      next: (res: any) => {
        this.loader.hide();
        this.toastr.success("Party Master Saved Successfully!");
        console.log("API RESPONSE →", res);

        this.resetPartyMasterForm();
      },
      error: (err: any) => {
        this.loader.hide();
        this.toastr.error("Error saving Party Master");
        console.error("API ERROR →", err);
      }
    });
  }

  getCustomers() {
    // load last 20 (search = null)
    this.api.get(
      `PartyMaster/GetCustomers?branchCode=${this.branchCode}&search=`
    ).subscribe({
      next: (res: any) => {
        this.dropdown.openPicker('Customers', res).then(sel => {
          if (sel) {
            this.setSelectedCustomer(sel);
          }
        });
      }
    });
  }

  setSelectedCustomer(cust: any) {
    this.selectedCustomer = cust;
    this.searchText = cust.name;   // show in main input

    this.api.get(
      `PartyMaster/GetCustomerById?custCode=${cust.code}`
    ).subscribe({
      next: (res: any) => {
        console.log(res);

        this.patchPartyMaster(res);
        this.validateAllStepsOnEdit();
      }
    });
  }







  // ---------- Other/Staff Type Change Handler ----------
  // onOtherStaffTypeChange() {
  // Reset the name and code when type changes
  // this.otherStaffName = '';

  // }

  // ---------- Open Other/Staff Picker ----------
  // openOtherStaffPicker() {
  //   if (!this.otherStaffType) {
  //     this.toastr.error('Please select Other or Staff type first.');
  //     return;
  //   }

  //   this.pickerField = 'otherstaff';
  //   this.pickerTarget = 'primary';
  //   this.pickerTitle = this.otherStaffType === 'O' ? 'Other' : 'Staff';
  //   this.pickerSearch = '';
  //   this.pickerSelectedCode = null;
  //   this.pickerSelectedName = null;
  //   this.pickerSelectedObj = null;
  //   this.pickerOptions = [];
  //   this.pickerOptionsFiltered = [];
  //   this.pickerLoading = true;
  //   this.pickerOpen = true;
  //   this.dropdownOpen = false;
  //   document.body.style.overflow = 'hidden';

  //   this.loadOtherStaffList();

  //   setTimeout(() => {
  //     try { this.pickerSearchInput?.nativeElement?.focus(); } catch { }
  //   }, 0);
  // }

  // ---------- Picker Handling ----------
  openPicker(field: PickerField, target: PickerTarget = 'primary') {
    // If opening area, ensure required codes exist for that target
    if (field === 'area') {
      const missing = target === 'primary'
        ? (this.selectedCountryCode == null || this.selectedStateCode == null || this.selectedDistrictCode == null || this.selectedTalukaCode == null || this.selectedCityCode == null)
        : (this.corrSelectedCountryCode == null || this.corrSelectedStateCode == null || this.corrSelectedDistrictCode == null || this.corrSelectedTalukaCode == null || this.corrSelectedCityCode == null);

      if (missing) {
        this.toastr.error('Please select a City first for this address. Area depends on City.', 'Area');
        return;
      }
    }

    this.pickerField = field;
    this.pickerTarget = target;
    this.pickerTitle = this.getPickerTitle(field);
    this.pickerSearch = '';
    this.pickerSelectedCode = null;
    this.pickerSelectedName = null;
    this.pickerSelectedObj = null;
    this.pickerOptions = [];
    this.pickerOptionsFiltered = [];
    this.pickerLoading = true;
    this.pickerOpen = true;
    this.dropdownOpen = false;
    document.body.style.overflow = 'hidden';

    switch (field) {
      case 'city': this.loadCityList(); break;
      case 'area': this.loadAreaList(); break;
      case 'religion': this.loadReligionList(); break;
      case 'cast': this.loadCastList(); break;
      case 'occupation': this.loadOccupationList(); break;
      case 'idproof': this.loadIDProofList(); break;
      case 'addrproof': this.loadAddrProofList(); break;
      case 'otherstaff': this.loadOtherStaffList(); break;
    }

    setTimeout(() => {
      try { this.pickerSearchInput?.nativeElement?.focus(); } catch { }
    }, 0);
  }

  private getPickerTitle(field: PickerField): string {
    switch (field) {
      case 'city': return 'City';
      case 'area': return 'Area';
      case 'religion': return 'Religion';
      case 'cast': return 'Caste';
      case 'occupation': return 'Occupation';
      case 'idproof': return 'IDProof';
      case 'addrproof': return 'AddressProof';
      case 'otherstaff': return this.otherStaffType === 'O' ? 'Other' : 'Staff';
      default: return '';
    }
  }

  closePicker() {
    this.pickerOpen = false;
    this.pickerField = null;
    this.pickerOptions = [];
    this.pickerOptionsFiltered = [];
    this.pickerSelectedCode = null;
    this.pickerSelectedName = null;
    this.pickerSelectedObj = null;
    this.pickerLoading = false;
    this.pickerSearch = '';
    this.dropdownOpen = false;
    document.body.style.overflow = '';
  }

  // ---------- API LOADERS ----------
  loadOtherStaffList() {
    // ❌ If already selected → do NOT call API
    if (this.isOtherStaffSelected) {
      console.log("Already selected, skipping API call.");
      return;
    }

    this.pickerLoading = true;

    const apiUrl = this.otherStaffType === 'O'
      ? `DireMast/GetAllOther`
      : `StaffMaster/GetAllStaff`;

    this.api.get(apiUrl)
      .pipe(finalize(() => this.pickerLoading = false))
      .subscribe({
        next: (res: any) => {
          const arr = Array.isArray(res) ? res : Object.values(res || {});

          const list: DropdownOption[] = arr.map((x: any) => ({
            name: this.otherStaffType === 'O' ? x.otheR_NAME : x.stafF_NAME,
            meta: x.deparT_NAME || '',
            code: this.otherStaffType === 'O' ? x.otheR_CODE : x.stafF_CODE,
            ...x
          }));

          const result = this.dropdown.openPicker('Other/Staff Name', list);
          result?.then?.((sel: any) => this.handleSelection(sel));
        }
      });
  }


  handleSelection(sel: any) {
    if (!sel) return;

    this.otherStaffName = sel;

    // Set DB fields
    // if (this.otherStaffType === 'O') {
    //   this.form.patchValue({
    //     ST_DIR: 'O',
    //     Ref_STDIR: sel.otheR_CODE
    //   });
    // } else {
    //   this.form.patchValue({
    //     ST_DIR: 'S',
    //     Ref_STDIR: sel.stafF_CODE
    //   });
    // }

    // 🔒 Disable further clicks
    this.isOtherStaffSelected = true;

    console.log("Selected:", sel);
  }

  onOtherStaffTypeChange() {
    this.otherStaffCode = null;
    this.otherStaffName = null;
    this.isOtherStaffSelected = false;

  }




  // ---------- City loader: uses the new GetAllDependencies API ----------
  private loadCityList() {
    this.pickerLoading = true;
    const apiUrl = `CityMaster/GetAllDependencies`; // new single API that returns city + taluka/dist/state/country

    this.api.get(apiUrl).subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : Object.values(res || {}));

        const mapped: Option[] = (list || []).map(x => {
          const unic = Number(x.citY_UNIC_ID ?? x.CitY_UNIC_ID ?? x.city_unic_id ?? 0);
          const code = Number(x.citY_CODE ?? x.CitY_CODE ?? x.city_code ?? x.citY_CODE ?? 0);
          const name = String(x.citY_NAME ?? x.CitY_NAME ?? x.city_name ?? '').trim();
          const pin = x.piN_CODE ?? x.PIN_CODE ?? x.pin_code ?? null;

          return {
            code,
            selectId: unic || undefined,
            name,
            pin: pin ? String(pin) : null,
            talukaCode: Number(x.talukA_CODE ?? x.TALUKA_CODE ?? x.talukA_CODE ?? x.taluka_code ?? 0) || undefined,
            talukaName: String(x.talukA_NAME ?? x.TALUKA_NAME ?? x.talukA_NAME ?? x.taluka_name ?? '').trim() || undefined,
            distCode: Number(x.disT_CODE ?? x.DIST_CODE ?? x.disT_CODE ?? x.dist_code ?? 0) || undefined,
            distName: String(x.disT_NAME ?? x.DIST_NAME ?? x.disT_NAME ?? x.dist_name ?? '').trim() || undefined,
            stateCode: Number(x.statE_CODE ?? x.STATE_CODE ?? x.statE_CODE ?? x.state_code ?? 0) || undefined,
            stateName: String(x.statE_NAME ?? x.STATE_NAME ?? x.statE_NAME ?? x.state_name ?? '').trim() || undefined,
            countryCode: Number(x.countrY_CODE ?? x.COUNTRy_CODE ?? x.country_code ?? 0) || undefined,
            countryName: String(x.countrY_NAME ?? x.COUNTRy_NAME ?? x.country_name ?? '').trim() || undefined
          } as Option;
        })
          .filter(o => o.name && o.name !== 'null')
          .sort((a, b) => a.name.localeCompare(b.name));

        this.pickerOptions = mapped;
        this.pickerOptionsFiltered = [...this.pickerOptions];
        this.pickerLoading = false;
        this.dropdownOpen = true;
      },
      error: (err: any) => {
        console.error('Error loading cities (GetAllDependencies)', err);
        this.pickerOptions = [];
        this.pickerOptionsFiltered = [];
        this.pickerLoading = false;
        this.dropdownOpen = false;
        this.toastr.error('Unable to load city list.');
      }
    });
  }

  // ---------------- Load areas ----------------
  private loadAreaList() {
    this.pickerLoading = true;

    const country = this.pickerTarget === 'primary' ? this.selectedCountryCode : this.corrSelectedCountryCode;
    const state = this.pickerTarget === 'primary' ? this.selectedStateCode : this.corrSelectedStateCode;
    const dist = this.pickerTarget === 'primary' ? this.selectedDistrictCode : this.corrSelectedDistrictCode;
    const taluka = this.pickerTarget === 'primary' ? this.selectedTalukaCode : this.corrSelectedTalukaCode;
    const city = this.pickerTarget === 'primary' ? this.selectedCityCode : this.corrSelectedCityCode;

    const apiUrl = `AreaMaster/GetAreaById?countryCode=${country}&stateCode=${state}&distCode=${dist}&talukaCode=${taluka}&cityCode=${city}`;

    this.api.get(apiUrl).subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : Object.values(res || {}));
        const mapped: Option[] = (list || []).map(x => {
          const selectId = Number(x.areA_CODE ?? x.AREA_CODE ?? 0);
          const name = String(x.areA_NAME ?? x.AREA_NAME ?? x.name ?? '').trim();
          const pin = x.piN_CODE ?? x.PIN_CODE ?? x.pin_code ?? null;
          return { code: selectId, name, selectId: selectId, pin: pin ? String(pin) : null };
        }).sort((a, b) => a.name.localeCompare(b.name));

        this.pickerOptions = mapped;
        this.pickerOptionsFiltered = [...this.pickerOptions];
        this.pickerLoading = false;
        this.dropdownOpen = true;
      },
      error: (err: any) => {
        console.error('Error loading areas', err);
        this.pickerOptions = [];
        this.pickerOptionsFiltered = [];
        this.pickerLoading = false;
        this.dropdownOpen = false;
        this.toastr.error('Unable to load area list.');
      }
    });
  }

  private loadReligionList() {
    this.pickerLoading = true;
    this.api.get('ReligionMaster/GetAllReligion').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : Object.values(res || {});
        const mapped: Option[] = list.map(x => ({
          code: Number(x.religioN_CODE ?? 0),
          name: String(x.religioN_NAME ?? '').trim()
        }));
        this.pickerOptions = mapped;
        this.pickerOptionsFiltered = [...mapped];
        this.pickerLoading = false;
        this.dropdownOpen = true;
      },
      error: () => {
        this.toastr.error('Failed to load religions.');
        this.pickerLoading = false;
      }
    });
  }

  private loadCastList() {
    this.pickerLoading = true;
    this.api.get('CastMaster/GetAllCast').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : Object.values(res || {});
        const mapped: Option[] = list.map(x => ({
          code: Number(x.casT_CODE ?? 0),
          name: String(x.casT_NAME ?? '').trim()
        }));
        this.pickerOptions = mapped;
        this.pickerOptionsFiltered = [...mapped];
        this.pickerLoading = false;
        this.dropdownOpen = true;
      },
      error: () => {
        this.toastr.error('Failed to load cast list.');
        this.pickerLoading = false;
      }
    });
  }

  private loadOccupationList() {
    this.pickerLoading = true;
    this.api.get('OccupationMaster/GetAllOccupations').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : Object.values(res || {});
        const mapped: Option[] = list.map(x => ({
          code: Number(x.occuP_CODE ?? 0),
          name: String(x.occuP_NAME ?? '').trim()
        }));
        this.pickerOptions = mapped;
        this.pickerOptionsFiltered = [...mapped];
        this.pickerLoading = false;
        this.dropdownOpen = true;
      },
      error: () => {
        this.toastr.error('Failed to load occupations.');
        this.pickerLoading = false;
      }
    });
  }

  private loadIDProofList() {
    this.pickerLoading = true;
    this.api.get('KycIdMaster/GetAllKycId').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : Object.values(res || {});
        const mapped: Option[] = list.map(x => ({
          code: Number(x.kyC_ID_CODE ?? 0),
          name: String(x.kyC_ID_NAME ?? '').trim()
        }));
        this.pickerOptions = mapped;
        this.pickerOptionsFiltered = [...mapped];
        this.pickerLoading = false;
        this.dropdownOpen = true;
      },
      error: () => {
        this.toastr.error('Failed to load I.D.Proofs.');
        this.pickerLoading = false;
      }
    });
  }

  private loadAddrProofList() {
    this.pickerLoading = true;
    this.api.get('KycAddressMaster/GetAllKycAddress').subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : Object.values(res || {});
        const mapped: Option[] = list.map(x => ({
          code: Number(x.kyC_ADDR_CODE ?? 0),
          name: String(x.kyC_ADDR_NAME ?? '').trim()
        }));
        this.pickerOptions = mapped;
        this.pickerOptionsFiltered = [...mapped];
        this.pickerLoading = false;
        this.dropdownOpen = true;
      },
      error: () => {
        this.toastr.error('Failed to load Address Proofs.');
        this.pickerLoading = false;
      }
    });
  }

  // ---------- Search ----------
  onSearchChange() {
    const q = (this.pickerSearch || '').toLowerCase().trim();
    if (!q) {
      this.pickerOptionsFiltered = [...this.pickerOptions];
      return;
    }

    this.pickerOptionsFiltered = this.pickerOptions.filter(o => {
      const name = (o.name ?? '').toString().toLowerCase();
      const pin = (o.pin ?? '').toString().toLowerCase();
      const codeVal = o.code ?? o.selectId ?? '';
      const code = (codeVal === null || codeVal === undefined) ? '' : String(codeVal).toLowerCase();

      return name.includes(q) || pin.includes(q) || code.includes(q);
    });
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) this.onSearchChange();
  }

  // store full object when picking
  pickOption(opt: Option) {
    this.pickerSelectedCode = opt.selectId ?? opt.code;
    this.pickerSelectedName = opt.name;
    this.pickerSelectedObj = opt;
    this.pickerSearch = opt.name;
    this.dropdownOpen = false;
  }

  // ---------- Confirm Selection ----------
  confirmPicker() {
    if (!this.pickerField || !this.pickerSelectedCode) return;

    // -------------------- OTHER/STAFF --------------------
    if (this.pickerField === 'otherstaff') {
      this.otherStaffCode = Number(this.pickerSelectedCode);
      // this.otherStaffName = this.pickerSelectedName ?? '';
      this.toastr.success(`${this.otherStaffType === 'O' ? 'Other' : 'Staff'} selected.`);
      this.closePicker();
      return;
    }

    // -------------------- AREA --------------------
    if (this.pickerField === 'area') {
      const selected = this.pickerOptions.find(o => (o.selectId ?? o.code) === this.pickerSelectedCode);
      if (!selected) {
        this.toastr.error('Selected area not found.');
        this.closePicker();
        return;
      }

      if (this.pickerTarget === 'primary') {
        this.selectedAreaCode = Number(selected.selectId ?? selected.code ?? 0);
        this.selectedAreaName = selected.name ?? '';
        // this.selectedPincode = String(selected.pin ?? '').trim();
      } else { // corr
        this.corrSelectedAreaCode = Number(selected.selectId ?? selected.code ?? 0);
        this.corrAreaName = selected.name ?? '';
        // this.corrPincode = String(selected.pin ?? '').trim();
      }

      this.toastr.success('Area selected and pincode updated.');
      this.closePicker();
      return;
    }

    // -------------------- CITY --------------------
    if (this.pickerField === 'city') {
      // use the stored full object (no extra dependency call)
      const selected = this.pickerSelectedObj ?? this.pickerOptions.find(o => (o.selectId ?? o.code) === this.pickerSelectedCode);
      if (!selected) {
        this.toastr.error('Selected city not found.');
        this.closePicker();
        return;
      }

      if (this.pickerTarget === 'primary') {
        this.selectedCityUnicId = Number(selected.selectId ?? selected.code ?? 0);
        this.selectedCityCode = selected.code ?? null;
        this.selectedCityName = selected.name ?? '';

        this.selectedCountryCode = selected.countryCode ?? null;
        this.selectedCountryName = selected.countryName ?? '';

        this.selectedStateCode = selected.stateCode ?? null;
        this.selectedStateName = selected.stateName ?? '';

        this.selectedDistrictCode = selected.distCode ?? null;
        this.selectedDistrictName = selected.distName ?? '';

        this.selectedTalukaCode = selected.talukaCode ?? null;
        this.selectedTalukaName = selected.talukaName ?? '';

        // reset area — user should select if needed
        this.selectedAreaCode = null;
        this.selectedAreaName = '';
        // use city-level pincode if present

      } else {
        // corresponding target
        this.corrSelectedCityUnicId = Number(selected.selectId ?? selected.code ?? 0);
        this.corrSelectedCityCode = selected.code ?? null;
        this.corrCityName = selected.name ?? '';

        this.corrSelectedCountryCode = selected.countryCode ?? null;
        this.corrCountryName = selected.countryName ?? '';

        this.corrSelectedStateCode = selected.stateCode ?? null;
        this.corrStateName = selected.stateName ?? '';

        this.corrSelectedDistrictCode = selected.distCode ?? null;
        this.corrDistrictName = selected.distName ?? '';

        this.corrSelectedTalukaCode = selected.talukaCode ?? null;
        this.corrTalukaName = selected.talukaName ?? '';

        this.corrSelectedAreaCode = null;
        this.corrAreaName = '';
      }

      this.closePicker();
      return;
    }

    // -------------------- RELIGION / CAST / OCCUPATION / IDPROOF / ADDRPROOF --------------------
    switch (this.pickerField) {
      case 'religion':
        this.religionCode = Number(this.pickerSelectedCode);
        this.religionName = this.pickerSelectedName ?? '';
        this.toastr.success('Religion selected.');
        break;

      case 'cast':
        this.castCode = Number(this.pickerSelectedCode);
        this.castName = this.pickerSelectedName ?? '';
        this.toastr.success('Caste selected.');
        break;

      case 'occupation':
        this.occupationCode = Number(this.pickerSelectedCode);
        this.occupationName = this.pickerSelectedName ?? '';
        this.toastr.success('Occupation selected.');
        break;

      case 'idproof':
        this.idproofCode = Number(this.pickerSelectedCode);
        this.idproofName = this.pickerSelectedName ?? '';
        this.toastr.success('I.D.Proof Selected.');
        break;

      case 'addrproof':
        this.addrproofCode = Number(this.pickerSelectedCode);
        this.addrproofName = this.pickerSelectedName ?? '';
        this.toastr.success('Address Proof Selected.');
        break;

      default:
        console.warn('confirmPicker: unknown pickerField', this.pickerField);
        break;
    }

    this.closePicker();
  }

  trackByCode(_: number, item: { code: number; selectId?: number }) {
    return item.selectId ?? item.code;
  }

  // ---------- Preview Handlers ----------
  onFileChange(event: Event, key: PreviewKey) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    console.log(input);
    console.log(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.previews[key] = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  isImage(preview: string | null | undefined): boolean {
    return !!preview && typeof preview === 'string' && preview.startsWith('data:image/');
  }

  openPreview(key: PreviewKey) {
    this.activeKey = key;
    this.modalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closePreview() {
    this.modalOpen = false;
    this.activeKey = null;
    document.body.style.overflow = '';
  }

  removeCurrent() {
    if (!this.activeKey) return;
    const key = this.activeKey;
    this.previews[key] = null;

    try {
      switch (key) {
        case 'photo':
          if (this.photoInput && this.photoInput.nativeElement) this.photoInput.nativeElement.value = '';
          break;
        case 'sign':
          if (this.signInput && this.signInput.nativeElement) this.signInput.nativeElement.value = '';
          break;
        case 'pan':
          if (this.panInput && this.panInput.nativeElement) this.panInput.nativeElement.value = '';
          break;
        case 'aadhaarFront':
          if (this.aadhaarFrontInput && this.aadhaarFrontInput.nativeElement) this.aadhaarFrontInput.nativeElement.value = '';
          break;
        case 'aadhaarBack':
          if (this.aadhaarBackInput && this.aadhaarBackInput.nativeElement) this.aadhaarBackInput.nativeElement.value = '';
          break;
      }
    } catch (e) { /* ignore */ }

    this.closePreview();
  }

  formatCityMeta(opt: Option | null | undefined): string {
    if (!opt) return '';
    const parts = [
      opt.talukaName,
      opt.distName,
      opt.stateName,
      opt.countryName
    ].filter(p => p !== null && p !== undefined && String(p).trim() !== '' && String(p).toLowerCase() !== 'null')
      .map(p => String(p).trim());

    return parts.length ? parts.join(' · ') : '';
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscKey(event: Event | KeyboardEvent) {
    const ke = event as KeyboardEvent;
    if (this.modalOpen) this.closePreview();
    if (this.pickerOpen) this.closePicker();
  }

  base64Image: string | ArrayBuffer | null = null;


  onFileSelected(event: any) {
    const file = event.target.files[0];

    const reader = new FileReader();
    reader.readAsDataURL(file);  // Encode → Base64

    reader.onload = () => {
      this.base64Image = reader.result;  // "data:image/jpeg;base64,/9j/4AAQSk..."
      console.log(this.base64Image);

    };
  }


  openEdit() {
    this.isEditMode = !this.isEditMode;
  }

  resetPartyMasterForm() {

    // 1️⃣ Reset Angular Form
    if (this.form) {
      this.form.reset();
    }

    this.form.AcType = '0';
    this.form.nmprefix = '';

    // 2️⃣ Reset picker selections
    this.selectedCountryCode = null;
    this.selectedCountryName = '';
    this.selectedStateCode = null;
    this.selectedStateName = '';
    this.selectedDistrictCode = null;
    this.selectedDistrictName = '';
    this.selectedTalukaCode = null;
    this.selectedTalukaName = '';
    this.selectedCityCode = null;
    this.selectedCityName = '';
    this.selectedAreaCode = null;
    this.selectedAreaName = '';
    this.selectedPincode = null;

    this.corrSelectedCityCode = null;
    this.corrCityName = '';
    this.corrSelectedAreaCode = null;
    this.corrAreaName = '';
    this.corrSelectedDistrictCode = null;
    this.corrDistrictName = '';
    this.corrSelectedTalukaCode = null;
    this.corrTalukaName = '';
    this.corrSelectedCountryCode = null;
    this.corrCountryName = '';
    this.corrSelectedStateCode = null;
    this.corrStateName = '';
    this.corrPincode = null;

    this.religionCode = null;
    this.religionName = '';
    this.castCode = null;
    this.castName = '';
    this.occupationCode = null;
    this.occupationName = '';
    this.idproofCode = null;
    this.idproofName = '';
    this.addrproofCode = null;
    this.addrproofName = '';

    this.otherStaffName = null;
    this.otherStaffCode = null;
    this.otherStaffType = 'O';
    this.isOtherStaffSelected = false;

    // 3️⃣ Reset previews and file inputs
    this.previews = {
      photo: null,
      sign: null,
      pan: null,
      aadhaarFront: null,
      aadhaarBack: null
    };

    try {
      if (this.photoInput?.nativeElement) this.photoInput.nativeElement.value = '';
      if (this.signInput?.nativeElement) this.signInput.nativeElement.value = '';
      if (this.panInput?.nativeElement) this.panInput.nativeElement.value = '';
      if (this.aadhaarFrontInput?.nativeElement) this.aadhaarFrontInput.nativeElement.value = '';
      if (this.aadhaarBackInput?.nativeElement) this.aadhaarBackInput.nativeElement.value = '';
    } catch { }

    // 4️⃣ Reset modal & picker state
    this.activeKey = null;
    this.modalOpen = false;
    this.pickerOpen = false;
    this.dropdownOpen = false;

    // 5️⃣ Reset base64Image
    this.base64Image = null;

    console.log("✔ FORM RESET COMPLETED");
  }

  patchPartyMaster(data: any) {

    if (!data) return;

    // --------------------------
    // 1️⃣  PATCH FORM FIELDS
    // --------------------------
    this.form.patchValue({
      AcType: data.acType,
      panNo: data.pan_no,
      AdharNo: data.adharNo,
      GSTNo: data.gstNo,
      nmprefix: data.nmprefix,
      name: data.name,

      ADDR1: data.addR1,
      ADDR2: data.addR2,
      ADDR3: data.addR3,
      phone: data.phone,
      mobile: data.phonE1,

      CorrAddr1: data.corADDR1,
      CorrAddr2: data.corADDR2,
      CorrAddr3: data.corADDR3,

      passportno: data.passportno,
      passexpdate: data.passexpdate.split('T')[0],
      passauth: data.passauth,
      voteridno: data.voteridno,
      birthdate: data.birthdate.split('T')[0],
      AGE: data.age,
      SEX: data.sex,

      COMPREGNO: data.compregno,
      COMPREGDT: data.compregdt,
      COMPBRANCH: data.compbranch,
      COMPNATURE: data.compnature,
      COMPPAIDCAPT: data.comppaidcapt,
      COMPTURNOVER: data.compturnover,
      COMPNETWORTH: data.compnetworth,
      Propritor1: data.propritor1,
      Propritor2: data.propritor2,

      officename: data.officename,
      OFFICEPIN: data.officepin,
      OFFICEADDR1: data.officeaddR1,
      OFFICEADDR2: data.officeaddR2,
      OFFICEADDR3: data.officeaddR3,
      OFFICEPHONE: data.officephone,
      OFFICEPHONE1: data.officephonE1,
      EMAIL_ID: data.emaiL_ID,

      KycIdProof: data.kycIdProof,
      KycAddrProof: data.kycAddrProof,

    });

    this.idproofCode = data.kycIdProof_Code,
      this.idproofName = data.kycIdProof_Name,
      this.addrproofCode = data.kycAddrProof_Code,
      this.addrproofName = data.kycAddrProof_Name

    // --------------------------
    // 2️⃣  PATCH PICKER FIELDS
    // --------------------------
    this.selectedCityCode = data.citycode;
    this.selectedCityName = data.city;


    this.selectedAreaCode = data.area_code;
    this.selectedAreaName = data.area;

    this.selectedDistrictCode = data.distCode;
    this.selectedDistrictName = data.district;

    this.selectedTalukaCode = data.talukacode;
    this.selectedTalukaName = data.taluka;

    this.selectedStateCode = data.statecode;
    this.selectedStateName = data.state;

    this.selectedCountryCode = data.nationalityCode;
    this.selectedCountryName = data.nationality;

    this.selectedPincode = data.pin;

    this.useDifferentCorresponding = data.chkSameadd;

    // --- CORRESPONDING ADDRESS ---
    this.corrSelectedCityCode = data.cor_Citycode;
    this.corrCityName = data.cor_City;

    this.corrSelectedAreaCode = data.cor_Area_code;
    this.corrAreaName = data.cor_Area;

    this.corrSelectedDistrictCode = data.cor_DistCode;
    this.corrDistrictName = data.cor_District;

    this.corrSelectedTalukaCode = data.cor_Talukacode;
    this.corrTalukaName = data.cor_Taluka;

    this.corrSelectedStateCode = data.cor_Statecode;
    this.corrStateName = data.cor_State;

    this.corrSelectedCountryCode = data.cor_NationalityCode;
    this.corrCountryName = data.cor_NATIONALITY;

    this.corrPincode = data.corPIN;

    // --------------------------
    // 3️⃣  PATCH RELIGION/CAST/OCCU
    // --------------------------
    // this.religionName = data.religon;
    this.religionCode = data.religon;
    this.religionName = data.religon_Name;
    this.castCode = data.cast;
    this.castName = data.cast_Name;
    this.occupationCode = data.occu;
    this.occupationName = data.occU_Name;

    // --------------------------
    // 4️⃣  PATCH STAFF
    // --------------------------
    this.otherStaffType = data.sT_DIR;
    this.otherStaffCode = data.ref_STDIR;
    this.otherStaffName = data.ref_STDIR_Name;

    // --------------------------
    // 5️⃣  PATCH IMAGES
    // --------------------------
    this.previews = {
      photo: null,
      sign: null,
      pan: null,
      aadhaarFront: null,
      aadhaarBack: null
    };

    if (Array.isArray(data.pictures)) {
      data.pictures.forEach((p: any) => {
        switch (Number(p.flag)) {
          case 1: this.previews.photo = p.picture; break;
          case 2: this.previews.sign = p.picture; break;
          case 3: this.previews.pan = p.picture; break;
          case 4: this.previews.aadhaarFront = p.picture; break;
          case 5: this.previews.aadhaarBack = p.picture; break;
        }
      });
    }

    console.log("✔ PATCHED SUCCESSFULLY");
  }

stepValidators:any = {
  1: () => this.validateStep1(),
  2: () => this.validateStep2(),
  3: () => this.validateStep3(),
  4: () => this.validateStep4(),
  5: () => this.validateStep5()
};


// null = not checked yet, true = valid, false = invalid
stepStatus: any = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null
};

currentStep = 1;



// goToStep(step: number) {
//   const valid = this.stepValidators[step - 1]();

//   if (!valid) {
//     this.toastr.error("Please fill all required fields");
//     return;
//   }

//   // manually click radio button
//   const radio = document.getElementById(`step-${step}`) as HTMLInputElement;
//   if (radio) radio.checked = true;
// }

validateStep1(): boolean {
  const controls = [
    'AcType',
    'panNo',
    'AdharNo',
    'GSTNo',
    'nmprefix',
    'name'
  ];

  let valid = true;

  for (let c of controls) {
    const ctrl = this.form.get(c);
    if (ctrl && !ctrl.disabled && ctrl.invalid) {
      
      // ❗ Detect exists error
      if (ctrl.errors?.['exists']) {
  this.toastr.error("Fill correct data — your data already exists");

  // shake step
  const stepEl = document.querySelector(
    `label[for="step-${this.currentStep}"]`
  ) as HTMLElement;
  if (stepEl) {
    stepEl.classList.add('step-shake');
    setTimeout(() => stepEl.classList.remove('step-shake'), 350);
  }

  this.scrollToFirstInvalid();
}
else {
  this.toastr.error("Please fill required fields");
  this.scrollToFirstInvalid();
}


      ctrl.markAsTouched();
      valid = false;
    }
  }

  return valid;
}


validateStep2(): boolean {

  const controls = ['ADDR1', 'ADDR2', 'ADDR3', 'phone', 'mobile'];

  let valid = true;

  for (let c of controls) {
    const ctrl = this.form.get(c);
    if (ctrl && !ctrl.disabled && ctrl.invalid) {

      if (ctrl.errors?.['exists']) {
  this.toastr.error("Fill correct data — your data already exists");

  // shake step
  const stepEl = document.querySelector(
    `label[for="step-${this.currentStep}"]`
  ) as HTMLElement;
  if (stepEl) {
    stepEl.classList.add('step-shake');
    setTimeout(() => stepEl.classList.remove('step-shake'), 350);
  }

  this.scrollToFirstInvalid();
}
else {
  this.toastr.error("Please fill required fields");
  this.scrollToFirstInvalid();
}


      ctrl.markAsTouched();
      valid = false;
    }
  }

  if (!this.selectedCityCode
    || !this.selectedAreaCode
    || !this.selectedCountryCode
    || !this.selectedStateCode
    || !this.selectedDistrictCode
    || !this.selectedTalukaCode
  ) {
    this.toastr.error("Please fill required fields");
    valid = false;
  }

  return valid;
}


validateStep3(): boolean {
  let valid = true;

  const controls = [
    'passportno',
    'passexpdate',
    'voteridno',
    'birthdate',
    'AGE',
    'SEX'
  ];

  for (let c of controls) {
    const ctrl = this.form.get(c);
    if (ctrl && !ctrl.disabled && ctrl.invalid) {

      if (ctrl.errors?.['exists']) {
  this.toastr.error("Fill correct data — your data already exists");

  // shake step
  const stepEl = document.querySelector(
    `label[for="step-${this.currentStep}"]`
  ) as HTMLElement;
  if (stepEl) {
    stepEl.classList.add('step-shake');
    setTimeout(() => stepEl.classList.remove('step-shake'), 350);
  }

  this.scrollToFirstInvalid();
}
else {
  this.toastr.error("Please fill required fields");
  this.scrollToFirstInvalid();
}


      ctrl.markAsTouched();
      valid = false;
    }
  }

  if (!this.religionCode || !this.castCode || !this.occupationCode) {
    valid = false;
  }

  return valid;
}

validateStep4(): boolean {
  let valid = true;

  const controls = [
    'officename',
    'OFFICEPIN',
    'OFFICEADDR1',
    'OFFICEPHONE',
    'EMAIL_ID'
  ];

  for (let c of controls) {
    const ctrl = this.form.get(c);
    if (ctrl && !ctrl.disabled && ctrl.invalid) {

      if (ctrl.errors?.['exists']) {
  this.toastr.error("Fill correct data — your data already exists");

  // shake step
  const stepEl = document.querySelector(
    `label[for="step-${this.currentStep}"]`
  ) as HTMLElement;
  if (stepEl) {
    stepEl.classList.add('step-shake');
    setTimeout(() => stepEl.classList.remove('step-shake'), 350);
  }

  this.scrollToFirstInvalid();
}
else {
  this.toastr.error("Please fill required fields");
  this.scrollToFirstInvalid();
}


      ctrl.markAsTouched();
      valid = false;
    }
  }

  return valid;
}

validateStep5(): boolean {
  let valid = true;

  // ---------------------------
  // 1️⃣ CHECKBOX + PICKER VALIDATION
  // ---------------------------
  if (!this.form.get('KycIdProof')?.value || !this.idproofCode) {
    this.toastr.error("Please select I.D. Proof");
    valid = false;
  }

  if (!this.form.get('KycAddrProof')?.value || !this.addrproofCode) {
    this.toastr.error("Please select Address Proof");
    valid = false;
  }

  // ---------------------------
  // 2️⃣ REQUIRED FILES
  // ---------------------------
  const requiredFiles: { key: PreviewKey; label: string }[] = [
    { key: 'photo', label: 'Photo' },
    { key: 'sign', label: 'Signature' },
    { key: 'pan', label: 'PAN Card' },
    { key: 'aadhaarFront', label: 'Aadhaar Front' },
    { key: 'aadhaarBack', label: 'Aadhaar Back' },
  ];

  for (let f of requiredFiles) {
    if (!this.previews[f.key]) {
      this.toastr.error(`${f.label} is required`);
      valid = false;
    }
  }

  // ---------------------------
  // 3️⃣ IF INVALID → SHAKE + SCROLL
  // ---------------------------
  if (!valid) {
    const stepEl = document.querySelector(
      `label[for="step-${this.currentStep}"]`
    ) as HTMLElement;

    if (stepEl) {
      stepEl.classList.add('step-shake');
      setTimeout(() => stepEl.classList.remove('step-shake'), 350);
    }

    this.scrollToMissingFile();
  }

  return valid;
}

private scrollToMissingFile() {
  const fileKeys: PreviewKey[] = [
    'photo',
    'sign',
    'pan',
    'aadhaarFront',
    'aadhaarBack'
  ];

  for (const key of fileKeys) {
    if (!this.previews[key]) {
      const el = document.querySelector(`[data-key="${key}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  }
}



goToStep(step: number) {
  // const current = this.currentStep;

  // const isValid = this.stepValidators[current]();
  // this.stepStatus[current] = isValid;

  // if (!isValid) {
  //   this.toastr.error("Please fill required fields");

  //   // scroll to the first invalid field
  //   this.scrollToFirstInvalid();

  //   // shake step circle
  //   const stepEl = document.querySelector(
  //     `label[for="step-${current}"]`
  //   ) as HTMLElement;

  //   if (stepEl) {
  //     stepEl.classList.add('step-shake');
  //     setTimeout(() => stepEl.classList.remove('step-shake'), 350);
  //   }

  //   return;
  //}

  this.navigateTo(step);
}


tryOpenStep(step: number) {
  // user cannot open step N if any previous step invalid or not completed
  // for (let i = 1; i < step; i++) {
  //   if (this.stepStatus[i] !== true) {
  //     this.toastr.error(`Step ${i} is not completed`);
  //     return;
  //   }
  // }

  this.navigateTo(step);
}

navigateTo(step: number) {
  const r = document.getElementById(`step-${step}`) as HTMLInputElement;
  if (r) {
    r.checked = true;
    this.currentStep = step;  // ⭐ THIS SETS ACTIVE STEP
  }
}


getStepClass(step: number) {
  const status = this.stepStatus[step];

  return {
    // ACTIVE STEP (blue border background)
    'border-violet-600 bg-violet-50 text-violet-700': this.currentStep === step,

    // VALID (green)
    'border-green-500 bg-green-50 text-green-700': status === true && this.currentStep !== step,

    // INVALID (red)
    'border-red-500 bg-red-50 text-red-700': status === false && this.currentStep !== step,

    // DEFAULT (gray)
    'border-gray-300 bg-gray-50 text-gray-500': status === null && this.currentStep !== step
  };
}



getStepIcon(step: number): string {
  const activeIcons: any = {
    1: 'user',
    2: 'home',
    3: 'id',
    4: 'office',
    5: 'check-circle'
  };

  const current = this.currentStep;
  const status = this.stepStatus[step];

  // ACTIVE → main SVG
  if (current === step) return activeIcons[step];

  // VALID → green check
  if (status === true) return 'check';

  // INVALID → red cross
  if (status === false) return 'cross';

  // DEFAULT
  return 'number';
}

scrollToFirstInvalid() {
  setTimeout(() => {
    const invalidField: HTMLElement | null =
      document.querySelector('.ng-invalid:not([disabled])');

    if (invalidField) {
      invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // add shake animation to invalid field
      invalidField.classList.add('shake-anim');
      setTimeout(() => {
        invalidField.classList.remove('shake-anim');
      }, 350);
    }
  }, 50);
}
private validateAllStepsOnEdit() {
  for (let s = 1; s <= 5; s++) {
    const isValid = this.stepValidators[s]();
    this.stepStatus[s] = isValid;
  }
}




}
