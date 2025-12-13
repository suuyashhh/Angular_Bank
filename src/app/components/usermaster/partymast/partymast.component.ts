import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { LoaderService } from '../../../services/loader.service';
import { PickerModalComponent } from '../../../shared/picker-modal/picker-modal.component';
import { PickerService } from '../../../services/picker.service';
import { ValidationService } from '../../../shared/services/validation.service';
import {
  debounceTime,
  distinctUntilChanged,
  finalize,
  Subject,
} from 'rxjs';
import { BasicContactInputsComponent } from '../../../shared/basic-contact-inputs/basic-contact-inputs.component';
import { GstFormatDirective } from '../../../shared/directives/gst-format.directive';
import { MobileFormatDirective } from '../../../shared/directives/mobile-format.directive';
import { PhoneFormatDirective } from '../../../shared/directives/phone-format.directive';
import { AadhaarFormatDirective } from '../../../shared/directives/aadhaar-format.directive';
import { PanFormatDirective } from '../../../shared/directives/pan-format.directive';
import { AsyncValidationService } from '../../../shared/services/async-validation.service';
import { ValidatedInputDirective } from '../../../shared/directives/valid-indicator.directive';
import { ShowErrorsDirective } from '../../../shared/directives/show-errors.directive';
import { ValidationSignal } from '../../../shared/services/validation-signals.service';
import { VoterIdFormatDirective } from '../../../shared/directives/voterid-format.directive';
import { PassportFormatDirective } from '../../../shared/directives/passport-format.directive';
import {
  DropdownOption,
  DropdownService,
} from '../../../shared/services/dropdown.service';
import { DropdpwnModalComponent } from '../../../shared/dropdpwn-modal/dropdpwn-modal.component';
import { AutoTabIndexDirective } from '../../../shared/directives/auto-tab-index.directive';
import { InputValidatorDirective } from '../../../shared/directives/input-validator.directive';
import { RequiredStarDirective } from '../../../shared/directives/required-star.directive';
import { ShowFieldErrorDirective } from '../../../shared/directives/show-field-error.directive';

type PickerField =
  | 'city'
  | 'area'
  | 'religion'
  | 'cast'
  | 'occupation'
  | 'idproof'
  | 'addrproof'
  | 'otherstaff';
type PickerTarget = 'primary' | 'corr';

type PreviewKey = 'photo' | 'sign' | 'pan' | 'aadhaarFront' | 'aadhaarBack';

@Component({
  selector: 'app-partymast',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PickerModalComponent,
    ReactiveFormsModule,
    BasicContactInputsComponent,
    DropdpwnModalComponent,
    AadhaarFormatDirective,
    GstFormatDirective,
    MobileFormatDirective,
    PhoneFormatDirective,
    ValidatedInputDirective,
    PanFormatDirective,
    ShowErrorsDirective,
    VoterIdFormatDirective,
    PassportFormatDirective,
    AutoTabIndexDirective,
    InputValidatorDirective,
    RequiredStarDirective,
    ShowFieldErrorDirective
  ],
  providers: [DropdownService],
  templateUrl: './partymast.component.html',
  styleUrls: ['./partymast.component.css'],
})
export class PartymastComponent implements OnInit {
  // ---------- general ----------
  accountType: number = 0;
  accountTypes: any[] = [];
  PrefixType: any[] = [];

  // Other/Staff fields
  otherStaffType = 'O'; // Default to 'Other'
  otherStaffName: DropdownOption | any | null = null;
  Customer: DropdownOption | any | null = null;
  otherStaffCode: number | null = null;

  // Corresponding address toggle
  useDifferentCorresponding = false;

  // Corresponding address fields (kept for template)
  CorrAddr1 = '';
  CorrAddr2 = '';
  CorrAddr3 = '';

  // ---------- Picker state kept minimal (picker service handles lists) ----------
  pickerOpen = false;
  pickerField: PickerField | null = null;
  pickerTarget: PickerTarget = 'primary';
  pickerTitle = '';
  pickerLoading = false;
  // avoid name clash with dropdown service
  isPickerDropdownOpen = false;

  // ---------- Primary Address (kept names for template) ----------
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

  // ---------- Corresponding Address (kept but logic handled externally) ----------
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

  // ---------- Form + files ----------
  form!: FormGroup;
  previews: Record<PreviewKey, string | null> = {
    photo: null,
    sign: null,
    pan: null,
    aadhaarFront: null,
    aadhaarBack: null,
  };
  activeKey: PreviewKey | null = null;
  modalOpen = false;

  // child component reference (kept for compatibility)
  child!: BasicContactInputsComponent;

  isOtherStaffSelected = false;
  branchCode: string | null = null;
  isEditMode: boolean = false;

  searchText: string = '';
  searchTextChanged = new Subject<string>();
  selectedCustomer: any = null;

  loading: boolean = false;
  selectedCategory: string = 'Personal';

  isViewOnly: boolean = false;

  customerText = '';
  designationText = '';
  selectedCustomerDesignations: {
    customerCode: string;
    customerName: string;
    designationCode: string;
    designationName: string;
  }[] = [];



  // template refs
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

  // validation signals (kept API)
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


    this.buildForm();

    // listen to picker's selection stream (picker service is authoritative)
    this.picker.pickerSelected$.subscribe((sel) => {
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

          // Fill dependent fields
          this.selectedTalukaName = option.talukA_NAME ?? '';
          this.selectedDistrictName = option.disT_NAME ?? '';
          this.selectedStateName = option.statE_NAME ?? '';
          this.selectedCountryName = option.countrY_NAME ?? '';

          this.selectedTalukaCode = Number(option.talukA_CODE ?? 0);
          this.selectedDistrictCode = Number(option.disT_CODE ?? 0);
          this.selectedStateCode = Number(option.statE_CODE ?? 0);
          this.selectedCountryCode = Number(option.countrY_CODE ?? 0);

          if (option.piN_CODE != 0) {
            this.selectedPincode = Number(option.piN_CODE ?? 0);
          }
        }

        /* 🔵 AREA (PRIMARY) */
        if (field === 'area') {
          if (!option) {
            this.selectedAreaName = '';
            return;
          }

          this.selectedAreaName = option.name;
          this.selectedAreaCode = Number(option.areA_CODE ?? null);

          // Update pincode if provided
          if (option.piN_CODE != 0 && this.selectedPincode !== option.piN_CODE) {
            this.selectedPincode = Number(option.piN_CODE ?? 0);
          }
        }

        /* 🔵 RELIGION */
        if (field === 'religion') {
          this.religionName = option?.name ?? '';
          this.religionCode = Number(option?.code ?? 0);
        }

        /* 🔵 CAST */
        if (field === 'cast') {
          this.castName = option?.name ?? '';
          this.castCode = Number(option?.code ?? 0);
        }

        /* 🔵 OCCUPATION */
        if (field === 'occupation') {
          this.occupationName = option?.name ?? '';
          this.occupationCode = Number(option?.code ?? 0);
        }

        /* 🔵 ID PROOF */
        if (field === 'idproof') {
          this.idproofName = option?.name ?? '';
          this.idproofCode = Number(option?.code ?? 0);
        }

        /* 🔵 ADDRESS PROOF */
        if (field === 'addrproof') {
          this.addrproofName = option?.name ?? '';
          this.addrproofCode = Number(option?.code ?? 0);
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

          // Fill dependent fields
          this.corrTalukaName = option.talukA_NAME ?? '';
          this.corrDistrictName = option.disT_NAME ?? '';
          this.corrStateName = option.statE_NAME ?? '';
          this.corrCountryName = option.countrY_NAME ?? '';

          this.corrSelectedTalukaCode = Number(option.talukA_CODE ?? 0);
          this.corrSelectedDistrictCode = Number(option.disT_CODE ?? 0);
          this.corrSelectedStateCode = Number(option.statE_CODE ?? 0);
          this.corrSelectedCountryCode = Number(option.countrY_CODE ?? 0);

          if (option.piN_CODE != 0) {
            this.corrPincode = Number(option.piN_CODE ?? 0);
          }
        }

        /* 🔵 AREA (CORR) */
        if (field === 'area') {
          if (!option) {
            this.corrAreaName = '';
            return;
          }

          this.corrAreaName = option.name;
          this.corrSelectedAreaCode = Number(option.areA_CODE ?? null);

          if (option.piN_CODE != 0 && this.corrPincode !== option.piN_CODE) {
            this.corrPincode = Number(option.piN_CODE ?? 0);
          }
        }
      }
    });


    this.loadLookups();
  }

  // --- build form in one place ---
  buildForm() {
    this.form = this.fb.group({
      AcType: ['0', Validators.required],
      panNo: ['', []],
      AdharNo: ['', []],
      GSTNo: ['', []],
      nmprefix: ['', Validators.required],
      name: ['', Validators.required],

      // Address
      ADDR1: ['', Validators.required],
      ADDR2: [''],
      ADDR3: [''],

      City: ['', Validators.nullValidator],
      cityCode: [null],
      countryCode: [null],
      stateCode: [null],
      districtCode: [null],
      talukaCode: [null],
      areaCode: [null],
      pincode: ['', Validators.required],
      phone: [''],
      phone1: [''],
      mobile: ['', Validators.required],
      mobile1: [''],

      useDifferentCorresponding: [false],

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

      // Personal
      Religon: [null, Validators.required],
      Cast: [null, Validators.required],
      OCCU: [null, Validators.required],
      passportno: [''],
      passexpdate: [''],
      passauth: [''],
      voteridno: [''],
      birthdate: ['', Validators.required],
      AGE: ['', Validators.required],
      SEX: ['', Validators.required],
      ST_DIR: ['O'],
      Ref_STDIR: [null],

      // Company
      COMPREGNO: [''],
      COMPREGDT: [''],
      COMPBRANCH: [''],
      COMPNATURE: [''],
      COMPPAIDCAPT: [''],
      COMPTURNOVER: [''],
      COMPNETWORTH: [''],
      Propritor1: [''],
      Propritor2: [''],

      // Other
      officename: [''],
      OFFICEPIN: [''],
      OFFICEADDR1: [''],
      OFFICEADDR2: [''],
      OFFICEADDR3: [''],
      OFFICEPHONE: [''],
      OFFICEPHONE1: [''],
      EMAIL_ID: ['', Validators.required],

      KycIdProof: [false],
      idProofCode: [null],
      KycAddrProof: [false],
      addressProofCode: [null],

      // Files
      photo: [null],
      sign: [null],
      panFile: [null],
      aadhaarFront: [null],
      aadhaarBack: [null],
    });

    // auto-calc age/date
    this.form.get('birthdate')?.valueChanges.subscribe((date: any) => {
      if (!date) return;
      this.updateAgeFromBirthdate(date);
    });

    this.form.get('AGE')?.valueChanges.subscribe((age: any) => {
      if (!age) return;
      this.updateBirthdateFromAge(age);
    });



  }

  loadLookups() {
    this.api.get(`AccountTypeMaster/GetAllAccountType`).subscribe({
      next: (res: any) => {
        this.accountTypes = res || [];
        this.applyAccountTypeRules(this.accountType);
      },
      error: (err) => console.error(err),
    });

    this.api.get(`PrefixMaster/GetAllPrefix`).subscribe({
      next: (res: any) => (this.PrefixType = res || []),
      error: (err) => console.error(err),
    });
  }

  onPrefixChange(event: Event) {
    const prefix = (event.target as HTMLSelectElement).value;
    const record = this.PrefixType.find((x) => x.prefixtype === prefix);
    this.selectedCategory = record?.prefixCategory ?? '';
  }

  updateAgeFromBirthdate(date: string) {
    const birth = new Date(date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (this.form.get('AGE')?.value !== age) {
      this.form.patchValue({ AGE: age }, { emitEvent: false });
    }
  }

  updateBirthdateFromAge(age: number) {
    if (!age || age <= 0) return;
    const today = new Date();
    const birth = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
    const formatted = birth.toISOString().split('T')[0];
    if (this.form.get('birthdate')?.value !== formatted) {
      this.form.patchValue({ birthdate: formatted }, { emitEvent: false });
    }
  }

  // -----------------------------
  // Picker: single delegating open method
  // -----------------------------
  openPicker(field: PickerField, target: PickerTarget = 'primary') {
    this.pickerField = field;
    this.pickerTarget = target;
    this.pickerTitle = String(field).toUpperCase();
    this.pickerLoading = true;
    this.pickerOpen = true;
    this.isPickerDropdownOpen = false;

    // delegate to picker service — service shows modal and returns a promise-like selection
    this.picker.openPicker(field, target);

    // support both Promise and Observable/void-safe patterns

  }

  // -----------------------------
  // Other staff loader: use picker for selection
  // -----------------------------
  loadOtherStaffList() {
    this.pickerLoading = true;

    const apiUrl =
      this.otherStaffType === 'O'
        ? `DireMast/GetAllOther`
        : `StaffMaster/GetAllStaff`;

    this.api.get(apiUrl)
      .pipe(finalize(() => this.pickerLoading = false))
      .subscribe({
        next: (res: any) => {

          const arr = Array.isArray(res) ? res : Object.values(res || {});

          const list: any[] = arr.map((x: any) => ({
            name: this.otherStaffType === 'O'
              ? (x.otheR_NAME ?? x.OTHER_NAME)
              : (x.stafF_NAME ?? x.STAFF_NAME),

            code: this.otherStaffType === 'O'
              ? (x.otheR_CODE ?? x.OTHER_CODE)
              : (x.stafF_CODE ?? x.STAFF_CODE),

            meta: x.deparT_NAME ?? x.DEPART_NAME ?? '',
            ...x
          }));

          // Open dropdown
          this.dropdown.openPicker('otherstaff', list);
        }
      });
  }



  handleSelection(sel: any) {
    if (!sel) return;
    this.otherStaffName = sel;
    this.isOtherStaffSelected = true;
    console.log("Selected:", sel);
  }

  onOtherStaffTypeChange() {
    this.otherStaffCode = null;
    this.otherStaffName = null;
    this.isOtherStaffSelected = false;

  }


  // -----------------------------
  // Account type rules
  // -----------------------------
  fieldConfigMap: any = {
    adharCard: 'AdharNo',
    panCard: 'panNo',
    gst: 'GSTNo',
  };

  applyAccountTypeRules(typeCode: number) {
    const selectedType = this.accountTypes.find((x: any) => x.code === Number(typeCode));
    if (!selectedType) return;

    Object.keys(this.fieldConfigMap).forEach((key) => {
      const controlName = this.fieldConfigMap[key];
      const control = this.form.get(controlName);
      const rule = selectedType[key] ?? 'N';
      if (!control) return;

      control.enable({ emitEvent: false });
      control.clearValidators();

      if (rule === 'Y') control.setValidators([Validators.required]);
      if (rule === 'D') {
        control.disable({ emitEvent: false });
        control.setValue(null, { emitEvent: false });
      }

      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  getDocRequired(field: 'panCard' | 'adharCard' | 'gst') {
    const type = this.accountTypes.find(x => x.code === this.accountType);
    return type?.[field] === 'Y' ? 'Y' : 'N';
  }

  isHidden(fieldKey: string): boolean {
    const type = this.accountTypes.find(x => x.code === this.accountType);
    return type?.[fieldKey] === 'D'; // D = hide field
  }

  onAccountTypeChange() {
    const typeStr = this.form.get('AcType')?.value;
    const num = Number(typeStr);
    this.accountType = num;

    const prefix = this.form.get('nmprefix');

    if (num === 0) {
      prefix?.enable({ emitEvent: false });   // Enable
    } else {
      prefix?.disable({ emitEvent: false });  // Disable
      prefix?.reset();
      this.form.patchValue({
        nmprefix: ''
      })                       // Optional: clear value
    }

    this.applyAccountTypeRules(num);
  }


  // -----------------------------
  // File compression & preview (kept)
  // -----------------------------
  async compressImage(file: File, maxSizeKB: number = 60): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas not supported');
          const maxDim = 1024;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = width * ratio;
            height = height * ratio;
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.9;
          const step = 0.05;

          const compress = () => {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const sizeKB = Math.round((dataUrl.length * (3 / 4)) / 1024);
            if (sizeKB <= maxSizeKB || quality <= 0.1) resolve(dataUrl);
            else {
              quality -= step;
              compress();
            }
          };

          compress();
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  async onFileChange(event: Event, key: PreviewKey) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    try {
      const compressedDataUrl = await this.compressImage(file, 60);
      this.previews[key] = compressedDataUrl;
    } catch (err) {
      console.error('Image compression failed', err);
    }
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
        case 'photo': if (this.photoInput?.nativeElement) this.photoInput.nativeElement.value = ''; break;
        case 'sign': if (this.signInput?.nativeElement) this.signInput.nativeElement.value = ''; break;
        case 'pan': if (this.panInput?.nativeElement) this.panInput.nativeElement.value = ''; break;
        case 'aadhaarFront': if (this.aadhaarFrontInput?.nativeElement) this.aadhaarFrontInput.nativeElement.value = ''; break;
        case 'aadhaarBack': if (this.aadhaarBackInput?.nativeElement) this.aadhaarBackInput.nativeElement.value = ''; break;
      }
    } catch (e) { }
    this.closePreview();
  }

  formatCityMeta(_: any): string { return ''; }

  @HostListener('window:keydown.escape', ['$event'])
  onEscKey(event: Event | KeyboardEvent) {
    if (this.modalOpen) this.closePreview();
    if (this.pickerOpen) { this.pickerOpen = false; }
  }

  base64Image: string | ArrayBuffer | null = null;
  onFileSelected(event: any) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => { this.base64Image = reader.result; };
  }

  openEdit() {
    this.isEditMode = !this.isEditMode;
    this.resetPartyMasterForm();

    if (this.isEditMode) {
      this.isViewOnly = true;           // 🔒 VIEW MODE
      this.makeAllFieldsReadonly();
    } else {
      this.isViewOnly = false;
      this.enableAllFields();
    }

    if (this.isEditMode && this.currentStep === 1) {
      setTimeout(() => this.openCustomerIdDropdown(), 150);
    }
  }

  private makeAllFieldsReadonly() {
    Object.keys(this.form.controls).forEach((key) => {
      this.form.get(key)?.disable({ emitEvent: false });
    });
  }

  private enableAllFields() {
    Object.keys(this.form.controls).forEach((key) => {
      this.form.get(key)?.enable({ emitEvent: false });
    });

    // 🔁 Re-apply account type rules
    this.applyAccountTypeRules(this.accountType);
  }

  enableEditing() {
    this.isViewOnly = false;
    this.enableAllFields();
  }


  private makeStep1Readonly() {
    const fieldsToDisable = ['AcType', 'panNo', 'AdharNo', 'GSTNo', 'nmprefix', 'name'];
    fieldsToDisable.forEach(f => { const ctrl = this.form.get(f); if (ctrl) ctrl.disable({ emitEvent: false }); });
  }
  private enableStep1Fields() {
    const fieldsToEnable = ['AcType', 'panNo', 'AdharNo', 'GSTNo', 'nmprefix', 'name'];
    fieldsToEnable.forEach(f => { const ctrl = this.form.get(f); if (ctrl) ctrl.enable({ emitEvent: false }); });
  }
  private openCustomerIdDropdown() {
    const el = document.querySelector('input[placeholder="Customer ID"]') as HTMLElement;
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
    this.getCustomers();
  }

  resetPartyMasterForm() {
    if (this.form) this.form.reset();
    this.form.patchValue({ AcType: '0', nmprefix: '', Religon: null, Cast: null, OCCU: null, SEX: '', KycIdProof: false, KycAddrProof: false });
    this.searchText = '';

    // reset pickers
    this.selectedCountryCode = null; this.selectedCountryName = '';
    this.selectedStateCode = null; this.selectedStateName = '';
    this.selectedDistrictCode = null; this.selectedDistrictName = '';
    this.selectedTalukaCode = null; this.selectedTalukaName = '';
    this.selectedCityCode = null; this.selectedCityName = '';
    this.selectedAreaCode = null; this.selectedAreaName = '';
    this.selectedPincode = null;

    this.corrSelectedCityCode = null; this.corrCityName = '';
    this.corrSelectedAreaCode = null; this.corrAreaName = '';
    this.corrSelectedDistrictCode = null; this.corrDistrictName = '';
    this.corrSelectedTalukaCode = null; this.corrTalukaName = '';
    this.corrSelectedCountryCode = null; this.corrCountryName = '';
    this.corrSelectedStateCode = null; this.corrStateName = '';
    this.corrPincode = null;

    this.religionCode = null; this.religionName = '';
    this.castCode = null; this.castName = '';
    this.occupationCode = null; this.occupationName = '';
    this.idproofCode = null; this.idproofName = '';
    this.addrproofCode = null; this.addrproofName = '';

    this.otherStaffName = null; this.otherStaffCode = null; this.otherStaffType = 'O'; this.isOtherStaffSelected = false;

    this.previews = { photo: null, sign: null, pan: null, aadhaarFront: null, aadhaarBack: null };
    try { if (this.photoInput?.nativeElement) this.photoInput.nativeElement.value = ''; if (this.signInput?.nativeElement) this.signInput.nativeElement.value = ''; if (this.panInput?.nativeElement) this.panInput.nativeElement.value = ''; if (this.aadhaarFrontInput?.nativeElement) this.aadhaarFrontInput.nativeElement.value = ''; if (this.aadhaarBackInput?.nativeElement) this.aadhaarBackInput.nativeElement.value = ''; } catch { }

    this.activeKey = null; this.modalOpen = false; this.pickerOpen = false; this.isPickerDropdownOpen = false;
    this.base64Image = null;
    this.resetStepper();
  }

  // -------------- Stepper / validation engine (dynamic) --------------
  steps: number[] = [1, 2, 3, 4, 5, 6];
  stepValidators: any = {};
  stepStatus: any = {};
  currentStep = 1;

  resetStepper() {
    this.currentStep = 1;
    this.stepStatus = {};
    this.steps.forEach(s => this.stepStatus[s] = null);
    setTimeout(() => { const steps = document.querySelectorAll('.step'); steps.forEach((s) => s.classList.remove('step-shake')); }, 50);
  }

  // Register validators mapping
  private ensureValidatorsRegistered() {
    if (Object.keys(this.stepValidators).length) return;
    this.stepValidators = {
      1: () => this.validateStep1(),
      2: () => this.validateStep2(),
      3: () => this.validateStep3(),
      4: () => this.validateStep4(),
      5: () => this.validateStep5(),
      6: () => this.validateStep6(),
    };
  }

  // Update markControlsTouched to ensure proper validation:
  private markControlsTouched(names: string[] = []) {
    names.forEach((n) => {
      const ctrl = this.form.get(n);
      if (ctrl) {
        // Mark as touched and dirty to trigger validation
        ctrl.markAsTouched({ onlySelf: true });
        ctrl.markAsDirty({ onlySelf: true });
        ctrl.updateValueAndValidity({ onlySelf: true });

        // Also trigger the showFieldError directive
        const element = this.findElementByControlName(n);
        if (element) {
          // Dispatch input event to trigger directive update
          element.dispatchEvent(new Event('input'));
        }
      }
    });
  }

  /** returns first invalid control element (DOM) if any */
  private getFirstInvalidElement(): HTMLElement | null {
    return document.querySelector('.ng-invalid:not([disabled])') as HTMLElement | null;
  }

  private scrollToFirstInvalidAndFocus() {
    setTimeout(() => {
      const el = this.getFirstInvalidElement();
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try { (el as HTMLElement).focus(); } catch { }
        el.classList.add('shake-anim');
        setTimeout(() => el.classList.remove('shake-anim'), 450);
      }
    }, 40);
  }

  // Update your validation methods - Replace the existing validateStep methods with these:

  // Helper method to find element by control name
  private findElementByControlName(controlName: string): HTMLElement | null {
    // Try to find by ID first (based on your HTML structure)
    const controlMap: { [key: string]: string } = {
      // Step 1
      'AcType': '#basic_accountType',
      'panNo': '#panNo',
      'AdharNo': '#AdharNo',
      'GSTNo': '#GSTNo',
      'nmprefix': '#basic_title',
      'name': '#basic_name',

      // Step 2
      'mobile': '[formcontrolname="mobile"]',
      'phone': '[formcontrolname="phone"]',
      'EMAIL_ID': '[formcontrolname="EMAIL_ID"]',

      // Step 3
      'ADDR1': '#addr_permanent_line1',
      'cityCode': '#addr_city',
      'areaCode': '#addr_area',
      'pincode': '#addr_pincode',
    };

    const selector = controlMap[controlName];
    if (selector) {
      return document.querySelector(selector) as HTMLElement;
    }

    // Fallback: find by formControlName attribute
    const byFormControl = document.querySelector(`[formcontrolname="${controlName}"]`) as HTMLElement;
    if (byFormControl) return byFormControl;

    // Fallback 2: find by name attribute
    const byName = document.querySelector(`[name="${controlName}"]`) as HTMLElement;
    if (byName) return byName;

    return null;
  }

  // Helper method to scroll and focus to element
  private scrollAndFocusToElement(element: HTMLElement) {
    if (!element) return;

    // Scroll to element
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });

    // Focus on element after a delay
    setTimeout(() => {
      try {
        element.focus();
        // Add shake animation for visual feedback
        element.classList.add('shake-anim');
        setTimeout(() => element.classList.remove('shake-anim'), 500);
      } catch (e) {
        console.warn('Could not focus element:', e);
      }
    }, 100);
  }

  // Fixed validateStep1 method
  validateStep1(): boolean {
    // ✅ IF VIEW MODE → AUTO PASS
    if (this.isEditMode && this.isViewOnly) {
      return true;
    }

    const selectedType = this.accountTypes.find((x) => x.code == this.accountType);
    const controls = [
      'AcType',
      selectedType?.panCard === 'Y' ? 'panNo' : null,
      selectedType?.adharCard === 'Y' ? 'AdharNo' : null,
      selectedType?.gst === 'Y' ? 'GSTNo' : null,
      'nmprefix',
      'name'
    ].filter(Boolean) as string[];

    // Mark controls as touched
    this.markControlsTouched(controls);

    // Find first invalid control
    let firstInvalidElement: HTMLElement | null = null;
    let isValid = true;

    for (const c of controls) {
      const ctrl = this.form.get(c);
      if (ctrl && !ctrl.disabled && ctrl.invalid) {
        isValid = false;
        if (!firstInvalidElement) {
          firstInvalidElement = this.findElementByControlName(c);
        }
      }
    }

    if (!isValid && firstInvalidElement) {
      this.scrollAndFocusToElement(firstInvalidElement);
      return false;
    }

    return true;
  }

  // Fixed validateStep2 method
  validateStep2(): boolean {
    // Mark mobile as touched if it's invalid
    const mobileCtrl = this.form.get('mobile');
    if (mobileCtrl && mobileCtrl.invalid) {
      mobileCtrl.markAsTouched();
      mobileCtrl.markAsDirty();
      mobileCtrl.updateValueAndValidity({ onlySelf: true });

      // Find and focus on mobile field
      const mobileElement = this.findElementByControlName('mobile');
      if (mobileElement) {
        this.scrollAndFocusToElement(mobileElement);
        return false;
      }
    }
    return true;
  }

  // Fixed validateStep3 method
  validateStep3(): boolean {
    const controls = ['ADDR1', 'mobile'];
    let firstInvalidElement: HTMLElement | null = null;
    let isValid = true;

    // Check form controls
    for (const c of controls) {
      const ctrl = this.form.get(c);
      if (ctrl && !ctrl.disabled && ctrl.invalid) {
        isValid = false;
        ctrl.markAsTouched();
        ctrl.markAsDirty();
        ctrl.updateValueAndValidity({ onlySelf: true });

        if (!firstInvalidElement) {
          firstInvalidElement = this.findElementByControlName(c);
        }
      }
    }

    // Check picker selections
    if (!this.selectedCityCode) {
      isValid = false;
      if (!firstInvalidElement) {
        firstInvalidElement = document.getElementById('addr_city');
      }
    }

    if (!this.selectedAreaCode) {
      isValid = false;
      if (!firstInvalidElement) {
        firstInvalidElement = document.getElementById('addr_area');
      }
    }

    if (!this.selectedPincode) {
      isValid = false;
      if (!firstInvalidElement) {
        firstInvalidElement = document.getElementById('addr_pincode');
      }
    }

    if (!isValid && firstInvalidElement) {
      this.scrollAndFocusToElement(firstInvalidElement);
      return false;
    }

    return true;
  }

  // Fixed validateStep4 method
  validateStep4(): boolean {
    let firstInvalidElement: HTMLElement | null = null;
    let isValid = true;

    if (this.accountType === 0) { // Personal
      const personalControls = ['birthdate', 'AGE', 'SEX'];

      // Check form controls
      for (const c of personalControls) {
        const ctrl = this.form.get(c);
        if (ctrl && !ctrl.disabled && ctrl.invalid) {
          isValid = false;
          ctrl.markAsTouched();
          ctrl.markAsDirty();
          ctrl.updateValueAndValidity({ onlySelf: true });

          if (!firstInvalidElement) {
            firstInvalidElement = this.findElementByControlName(c) || this.findElementById(c);
          }
        }
      }

      // Check religion, caste, occupation
      if (!this.religionCode) {
        isValid = false;
        if (!firstInvalidElement) firstInvalidElement = document.getElementById('religionCode');
      }
      if (!this.castCode) {
        isValid = false;
        if (!firstInvalidElement) firstInvalidElement = document.getElementById('castCode');
      }
      if (!this.occupationCode) {
        isValid = false;
        if (!firstInvalidElement) firstInvalidElement = document.getElementById('occupation');
      }

      // Check passport fields
      const passportNo = this.form.get('passportno')?.value;
      if (passportNo) {
        const expDate = this.form.get('passexpdate')?.value;
        const auth = this.form.get('passauth')?.value;

        if (!expDate) {
          isValid = false;
          if (!firstInvalidElement) firstInvalidElement = document.getElementById('passportExp');
        }
        if (!auth) {
          isValid = false;
          if (!firstInvalidElement) firstInvalidElement = document.getElementById('passportIssueAuth');
        }
      }

      // Check other/staff selection
      if (this.otherStaffType === 'S' && !this.otherStaffName) {
        isValid = false;
        if (!firstInvalidElement) {
          firstInvalidElement = document.querySelector('input[placeholder="Select Other/Staff"]');
        }
      }

    } else { // Company
      const companyControls = ['Propritor1'];

      for (const c of companyControls) {
        const ctrl = this.form.get(c);
        if (ctrl && !ctrl.disabled && ctrl.invalid) {
          isValid = false;
          ctrl.markAsTouched();
          ctrl.markAsDirty();
          ctrl.updateValueAndValidity({ onlySelf: true });

          if (!firstInvalidElement) {
            firstInvalidElement = this.findElementByControlName(c);
          }
        }
      }
    }

    if (!isValid && firstInvalidElement) {
      this.scrollAndFocusToElement(firstInvalidElement);
      return false;
    }

    return true;
  }

  // Fixed validateStep5 method
  validateStep5(): boolean {
    const controls = ['officename', 'OFFICEPIN', 'OFFICEADDR1', 'OFFICEPHONE', 'EMAIL_ID'];
    let firstInvalidElement: HTMLElement | null = null;
    let isValid = true;

    for (const c of controls) {
      const ctrl = this.form.get(c);
      if (ctrl && !ctrl.disabled && ctrl.invalid) {
        isValid = false;
        ctrl.markAsTouched();
        ctrl.markAsDirty();
        ctrl.updateValueAndValidity({ onlySelf: true });

        if (!firstInvalidElement) {
          firstInvalidElement = this.findElementByControlName(c) ||
            this.findElementById(c.toLowerCase().replace('_', ''));
        }
      }
    }

    if (!isValid && firstInvalidElement) {
      this.scrollAndFocusToElement(firstInvalidElement);
      return false;
    }

    return true;
  }

  // Fixed validateStep6 method
  validateStep6(): boolean {
    let firstInvalidElement: HTMLElement | null = null;
    let isValid = true;

    // Check ID Proof
    const kycIdProof = this.form.get('KycIdProof')?.value;
    if (!kycIdProof || !this.idproofCode) {
      isValid = false;
      firstInvalidElement = document.getElementById('IDProof');
    }

    // Check Address Proof
    const kycAddrProof = this.form.get('KycAddrProof')?.value;
    if (!kycAddrProof || !this.addrproofCode) {
      isValid = false;
      if (!firstInvalidElement) {
        firstInvalidElement = document.getElementById('AddressProof');
      }
    }

    if (!isValid && firstInvalidElement) {
      this.scrollAndFocusToElement(firstInvalidElement);
      return false;
    }

    return true;
  }

  // Helper method to find element by ID
  private findElementById(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  // Update the goToStep method to ensure it focuses on invalid fields
  goToStep(step: number) {
    this.ensureValidatorsRegistered();
    const current = this.currentStep;
    const isValid = this.stepValidators[current]?.() ?? true;
    this.stepStatus[current] = isValid;

    if (!isValid) {
      // Find invalid elements in current step panel
      const currentPanel = document.getElementById(`panel-${current}`);
      if (currentPanel) {
        // Look for invalid form controls
        const invalidInputs = currentPanel.querySelectorAll('.ng-invalid:not([disabled])');
        if (invalidInputs.length > 0) {
          this.scrollAndFocusToElement(invalidInputs[0] as HTMLElement);
        }
      }

      // Add shake animation to step indicator
      const stepEl = document.querySelector(`label[for="step-${current}"]`) as HTMLElement;
      if (stepEl) {
        stepEl.classList.add('step-shake');
        setTimeout(() => stepEl.classList.remove('step-shake'), 350);
      }

      return;
    }

    // Navigate to the next step if valid
    this.navigateTo(step);
  }

  // Update the scrollToFirstInvalid method
  private scrollToFirstInvalid() {
    setTimeout(() => {
      const invalidField = document.querySelector('.ng-invalid:not([disabled])') as HTMLElement;
      if (invalidField) {
        this.scrollAndFocusToElement(invalidField);
      }
    }, 50);
  }

  // Update focusFirstInvalidField method
  focusFirstInvalidField() {
    setTimeout(() => {
      const firstInvalid = document.querySelector('.ng-invalid:not([disabled])') as HTMLElement;
      if (firstInvalid) {
        this.scrollAndFocusToElement(firstInvalid);
      }
    }, 50);
  }

  focusField(selector: string) { const el = document.querySelector(selector) as HTMLElement; if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); } }

  // goToStep(step: number) {
  //   this.ensureValidatorsRegistered();
  //   const current = this.currentStep;
  //   const isValid = this.stepValidators[current]?.() ?? true;
  //   this.stepStatus[current] = isValid;
  //   if (!isValid) { 
  //     // this.toastr.error('Please fill required fields');
  //      this.scrollToFirstInvalid(); this.focusFirstInvalidField(); const stepEl = document.querySelector(`label[for="step-${current}"]`) as HTMLElement; if (stepEl) { stepEl.classList.add('step-shake'); setTimeout(() => stepEl.classList.remove('step-shake'), 350); } return; }
  //   this.navigateTo(step);
  // }

  tryOpenStep(step: number) {
    for (let i = 1; i < step; i++) { if (this.stepStatus[i] !== true) { this.toastr.error(`Step ${i} is not completed`); return; } }
    this.navigateTo(step);
  }

  navigateTo(step: number) { const r = document.getElementById(`step-${step}`) as HTMLInputElement; if (r) { r.checked = true; this.currentStep = step; } }

  getStepClass(step: number) {
    const status = this.stepStatus[step];
    return {
      'border-violet-600 bg-violet-50 text-violet-700': this.currentStep === step,
      'border-green-500 bg-green-50 text-green-700': status === true && this.currentStep !== step,
      'border-red-500 bg-red-50 text-red-700': status === false && this.currentStep !== step,
      'border-gray-300 bg-gray-50 text-gray-500': status === null && this.currentStep !== step,
    };
  }

  getStepIcon(step: number): string {
    const activeIcons: any = { 1: 'user', 2: 'contact', 3: 'home', 4: 'id', 5: 'office', 6: 'check-circle' };
    const current = this.currentStep; const status = this.stepStatus[step];
    if (current === step) return activeIcons[step];
    if (status === true) return 'check';
    if (status === false) return 'cross';
    return 'number';
  }

  //   scrollToFirstInvalid() { setTimeout(() => { const invalidField: HTMLElement | null = document.querySelector('.ng-invalid:not([disabled])'); if (invalidField) { invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' }); invalidField.classList.add('shake-anim'); setTimeout(() => invalidField.classList.remove('shake-anim'), 400); } }, 50); }
  //   focusFirstInvalidField() {
  //   setTimeout(() => {
  //     const firstInvalid = document.querySelector('.ng-invalid:not([disabled])') as HTMLElement;
  //     if (firstInvalid) {
  //       firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
  //       firstInvalid.focus();
  //     }
  //   }, 50);
  // }


  private scrollToMissingFile() {
    const fileKeys: PreviewKey[] = ['photo', 'sign', 'pan', 'aadhaarFront', 'aadhaarBack'];
    for (const key of fileKeys) { if (!this.previews[key]) { const el = document.querySelector(`[data-key="${key}"]`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); break; } } }
  }

  // ------------------------ Customers / API interactions ------------------------
  getCustomers() {
    this.loading = true;

    this.api
      .get(`PartyMaster/GetCustomers?branchCode=${this.branchCode}&search=`)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          this.dropdown.openPicker('Customers', res).then((sel: any) => {
            if (!sel) return;
            this.Customer = sel;
            this.loading = true;
            this.resetPartyMasterForm();
            this.setSelectedCustomer(sel);

            // 🔒 KEEP FORM READONLY AFTER LOAD
            this.makeAllFieldsReadonly();
          });
        },
        error: (err) => console.error(err),
      });
  }
  selectCustomers() {
    this.loading = true;

    this.api
      .get(`PartyMaster/GetCustomers?branchCode=${this.branchCode}&search=`)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any[]) => {
          this.dropdown.openPicker('Customers', res).then((sel: any) => {
            if (!sel) {
              return;
            }

            this.Customer = sel;
          });
        },
        error: (err) => {
          console.error(err);
        }
      });
  }
  selectDesignation() {
    if (!this.Customer) {
      alert('Please select a customer first');
      return;
    }

    this.loading = true;

    this.api
      .get(`Designation/GetAllDesignations`)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any[]) => {

          // 🔹 MAP API → DropdownOption
          const options = res.map(d => ({
            code: d.code,
            name: d.designation   // 👈 VERY IMPORTANT
          }));

          this.dropdown.openPicker('Designation', options)
            .then((sel: any) => {
              if (!sel) return;

              this.selectedCustomerDesignations.push({
                customerCode: this.Customer.code,
                customerName: this.Customer.name,
                designationCode: sel.code,
                designationName: sel.name
              });
            });
        },
        error: err => console.error(err)
      });

    console.log(this.selectedCustomerDesignations);
  }
  removeCustomerDesignation(index: number) {
    this.selectedCustomerDesignations.splice(index, 1);
  }




  setSelectedCustomer(cust: any) {
    this.selectedCustomer = cust; this.searchText = cust.name;
    this.api.get(`PartyMaster/GetCustomerById?custCode=${cust.code}`).pipe(finalize(() => (this.loading = false))).subscribe({ next: (res: any) => { this.patchPartyMaster(res); this.validateAllStepsOnEdit(); }, error: (err) => console.error(err) });
  }

  patchPartyMaster(data: any) {
    if (!data) return;
    const acStr = data.acType ?? '0'; const acNum = Number(acStr);
    this.form.patchValue({ AcType: acStr, panNo: data.pan_no, AdharNo: data.adharNo, GSTNo: data.gstNo, nmprefix: data.nmprefix, name: data.name, ADDR1: data.addR1, ADDR2: data.addR2, ADDR3: data.addR3, phone: data.phone, phone1: data.phone1, mobile: data.mobile, mobile1: data.mobile1, CorrAddr1: data.corADDR1, CorrAddr2: data.corADDR2, CorrAddr3: data.corADDR3, passportno: data.passportno, passexpdate: data.passexpdate?.split('T')[0] ?? '', passauth: data.passauth, voteridno: data.voteridno, birthdate: data.birthdate?.split('T')[0] ?? '', AGE: data.age, SEX: data.sex, COMPREGNO: data.compregno, COMPREGDT: data.compregdt, COMPBRANCH: data.compbranch, COMPNATURE: data.compnature, COMPPAIDCAPT: data.comppaidcapt, COMPTURNOVER: data.compturnover, COMPNETWORTH: data.compnetworth, Propritor1: data.propritor1, Propritor2: data.propritor2, officename: data.officename, OFFICEPIN: data.officepin, OFFICEADDR1: data.officeaddR1, OFFICEADDR2: data.officeaddR2, OFFICEADDR3: data.officeaddR3, OFFICEPHONE: data.officephone, OFFICEPHONE1: data.officephonE1, EMAIL_ID: data.emaiL_ID, KycIdProof: data.kycIdProof, KycAddrProof: data.kycAddrProof });

    this.idproofCode = data.kycIdProof_Code; this.idproofName = data.kycIdProof_Name; this.addrproofCode = data.kycAddrProof_Code; this.addrproofName = data.kycAddrProof_Name;

    this.selectedCityCode = data.citycode; this.selectedCityName = data.city; this.selectedAreaCode = data.area_code; this.selectedAreaName = data.area; this.selectedDistrictCode = data.distCode; this.selectedDistrictName = data.district; this.selectedTalukaCode = data.talukacode; this.selectedTalukaName = data.taluka; this.selectedStateCode = data.statecode; this.selectedStateName = data.state; this.selectedCountryCode = data.nationalityCode; this.selectedCountryName = data.nationality; this.selectedPincode = data.pin;

    this.useDifferentCorresponding = data.chkSameadd;

    this.corrSelectedCityCode = data.cor_Citycode; this.corrCityName = data.cor_City; this.corrSelectedAreaCode = data.cor_Area_code; this.corrAreaName = data.cor_Area; this.corrSelectedDistrictCode = data.cor_DistCode; this.corrDistrictName = data.cor_District; this.corrSelectedTalukaCode = data.cor_Talukacode; this.corrTalukaName = data.cor_Taluka; this.corrSelectedStateCode = data.cor_Statecode; this.corrStateName = data.cor_State; this.corrSelectedCountryCode = data.cor_NationalityCode; this.corrCountryName = data.cor_NATIONALITY; this.corrPincode = data.corPIN;

    this.religionCode = data.religon; this.religionName = data.religon_Name; this.castCode = data.cast; this.castName = data.cast_Name; this.occupationCode = data.occu; this.occupationName = data.occU_Name;

    this.otherStaffType = data.sT_DIR; this.otherStaffCode = data.ref_STDIR; this.otherStaffName = data.ref_STDIR_Name;

    this.previews = { photo: null, sign: null, pan: null, aadhaarFront: null, aadhaarBack: null };
    if (Array.isArray(data.pictures)) { data.pictures.forEach((p: any) => { switch (Number(p.flag)) { case 1: this.previews.photo = p.picture; break; case 2: this.previews.sign = p.picture; break; case 3: this.previews.pan = p.picture; break; case 4: this.previews.aadhaarFront = p.picture; break; case 5: this.previews.aadhaarBack = p.picture; break; } }); }

    this.accountType = acNum; this.applyAccountTypeRules(acNum);
  }

  validateAllStepsOnEdit() { this.ensureValidatorsRegistered(); for (let s of this.steps) { const isValid = this.stepValidators[s]?.() ?? true; this.stepStatus[s] = isValid; } }

  submit() {
    // final validation
    this.ensureValidatorsRegistered(); this.stepStatus[6] = this.stepValidators[6]();
    for (let i of this.steps) { if (this.stepStatus[i] !== true) { this.toastr.error(`Step ${i} is not completed correctly`); this.navigateTo(i); return; } }
    if (!this.form) return;

    const f = this.form.value;
    const payload: any = { brnc_code: this.branchCode, AcType: f.AcType, pan_no: f.panNo, AdharNo: f.AdharNo, GstNo: f.GSTNo, nmprefix: f.nmprefix, Name: f.name, ADDR1: f.ADDR1, ADDR2: f.ADDR2, ADDR3: f.ADDR3, City: this.selectedCityName, CityCode: this.selectedCityCode, NationalityCode: this.selectedCountryCode, NATIONALITY: this.selectedCountryName, StateCode: this.selectedStateCode, State: this.selectedStateName, DistCode: this.selectedDistrictCode, District: this.selectedDistrictName, TalukaCode: this.selectedTalukaCode, Taluka: this.selectedTalukaName, Area_code: this.selectedAreaCode, Area: this.selectedAreaName, PIN: this.selectedPincode, PHONE: f.phone, PHONE1: f.phone1, Mobile: f.mobile, Mobile1: f.mobile1, chkSameadd: this.useDifferentCorresponding ? 1 : 0, CorADDR1: f.CorrAddr1, CorADDR2: f.CorrAddr2, CorADDR3: f.CorrAddr3, Cor_CityCode: this.corrSelectedCityCode, Cor_City: this.corrCityName, Cor_NationalityCode: this.corrSelectedCountryCode, Cor_NATIONALITY: this.corrCountryName, Cor_StateCode: this.corrSelectedStateCode, Cor_State: this.corrStateName, Cor_DistCode: this.corrSelectedDistrictCode, Cor_District: this.corrDistrictName, Cor_TalukaCode: this.corrSelectedTalukaCode, Cor_Taluka: this.corrTalukaName, Cor_Area_code: this.corrSelectedAreaCode, Cor_Area: this.corrAreaName, CorPIN: this.corrPincode, Religon: this.religionCode, Cast: this.castCode, OCCU: this.occupationCode, passportno: f.passportno, passexpdate: f.passexpdate, passauth: f.passauth, voteridno: f.voteridno, birthdate: f.birthdate, AGE: f.AGE, SEX: f.SEX, ST_DIR: this.otherStaffType, Ref_STDIR: this.otherStaffName?.code ?? null, COMPREGNO: f.COMPREGNO, COMPREGDT: f.COMPREGDT, COMPBRANCH: f.COMPBRANCH, COMPNATURE: f.COMPNATURE, COMPPAIDCAPT: f.COMPPAIDCAPT, COMPTURNOVER: f.COMPTURNOVER, COMPNETWORTH: f.COMPNETWORTH, Propritor1: f.Propritor1, Propritor2: f.Propritor2, officename: f.officename, OFFICEPIN: f.OFFICEPIN, OFFICEADDR1: f.OFFICEADDR1, OFFICEADDR2: f.OFFICEADDR2, OFFICEADDR3: f.OFFICEADDR3, OFFICEPHONE: f.OFFICEPHONE, OFFICEPHONE1: f.OFFICEPHONE1, EMAIL_ID: f.EMAIL_ID, KycIdProof: f.KycIdProof ? 1 : 0, KycIdProof_Code: this.idproofCode, KycAddrProof: f.KycAddrProof ? 1 : 0, KycAddrProof_Code: this.addrproofCode };

    const Pictures: any[] = [];
    if (this.previews.photo) Pictures.push({ Picture: this.previews.photo, flag: 1, srno: 1, Scan_By: 0 });
    if (this.previews.sign) Pictures.push({ Picture: this.previews.sign, flag: 2, srno: 1, Scan_By: 0 });
    if (this.previews.pan) Pictures.push({ Picture: this.previews.pan, flag: 3, srno: 1, Scan_By: 0 });
    if (this.previews.aadhaarFront) Pictures.push({ Picture: this.previews.aadhaarFront, flag: 4, srno: 1, Scan_By: 0 });
    if (this.previews.aadhaarBack) Pictures.push({ Picture: this.previews.aadhaarBack, flag: 5, srno: 1, Scan_By: 0 });

    const finalPayload = { ...payload, Pictures };

    this.loader.show();
    this.api.post('PartyMaster/save', finalPayload).subscribe({ next: (res: any) => { this.loader.hide(); this.toastr.success('Party Master Saved Successfully!'); this.resetPartyMasterForm(); }, error: (err: any) => { this.loader.hide(); this.toastr.error('Error saving Party Master'); console.error('API ERROR →', err); } });
  }
}
