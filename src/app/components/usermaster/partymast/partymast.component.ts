import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { LoaderService } from '../../../services/loader.service';
import { PickerModalComponent } from '../../../shared/picker-modal/picker-modal.component';
import { PickerService } from '../../../services/picker.service';

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
  selector: 'app-partymast',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PickerModalComponent, ReactiveFormsModule],
  templateUrl: './partymast.component.html',
  styleUrls: ['./partymast.component.css']
})
export class PartymastComponent implements OnInit {

  // ---------- general ----------
  accountType = '0';

  // Other/Staff fields
  otherStaffType = 'O'; // Default to 'Other'
  otherStaffName = '';
  otherStaffCode: number | null = null;

  // Corresponding address toggle
  useDifferentCorresponding = false;

  // Corresponding address fields
  corrAddrLine1 = '';
  corrAddrLine2 = '';
  corrAddrLine3 = '';

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
  selectedPincode : number | null = null;

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
  corrPincode = '';

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
  ) { }

 ngOnInit(): void {

  this.picker.pickerSelected$.subscribe(sel => {

    if (!sel) return;

    const { field, option } = sel;  // ← IMPORTANT

    // -------------------------------
    // CITY SELECTED
    // -------------------------------
    if (field === 'city') {

      if (!option) {
        this.selectedCityName = '';
        return;
      }

      this.selectedCityName = option.name;
      this.selectedCityCode = Number(option.code ?? null);

      this.selectedCityUnicId = Number(option.citY_CODE ?? option.code ?? 0);

      // Extract dependencies
      this.selectedTalukaName = option.talukA_NAME ?? '';
      this.selectedDistrictName = option.disT_NAME ?? '';
      this.selectedStateName = option.statE_NAME ?? '';
      this.selectedCountryName = option.countrY_NAME ?? '';

      console.log('Selected City:', option);
    }

    // -------------------------------
    // AREA SELECTED
    // -------------------------------
    if (field === 'area') {

      if (!option) {
        this.selectedAreaName = '';
        return;
      }

      this.selectedAreaName = option.name;
      this.selectedAreaCode = Number(option.areA_CODE ?? null);
      this.selectedPincode = Number(option.piN_CODE?? 0);

      console.log('Selected Area:', option);
    }

  });

}



  // ---------- Other/Staff Type Change Handler ----------
  onOtherStaffTypeChange() {
    // Reset the name and code when type changes
    this.otherStaffName = '';
    this.otherStaffCode = null;
  }

  // ---------- Open Other/Staff Picker ----------
  openOtherStaffPicker() {
    if (!this.otherStaffType) {
      this.toastr.error('Please select Other or Staff type first.');
      return;
    }

    this.pickerField = 'otherstaff';
    this.pickerTarget = 'primary';
    this.pickerTitle = this.otherStaffType === 'O' ? 'Other' : 'Staff';
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

    this.loadOtherStaffList();

    setTimeout(() => {
      try { this.pickerSearchInput?.nativeElement?.focus(); } catch { }
    }, 0);
  }

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
  private loadOtherStaffList() {
    this.pickerLoading = true;

    const apiUrl = this.otherStaffType === 'O'
      ? `DireMast/GetAllOther`
      : `StaffMaster/GetAllStaff`;
    this.api.get(apiUrl).subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : Object.values(res || {});

        const mapped: Option[] = (list || []).map(x => {
          if (this.otherStaffType === 'O') {
            const code = Number(x.otheR_CODE ?? x.OTHER_CODE ?? 0);
            const name = String(x.otheR_NAME ?? x.OTHER_NAME ?? '').trim();
            return { code, name, selectId: code };
          } else {
            const code = Number(x.stafF_CODE);
            const name = String(x.stafF_NAME ?? '').trim();
            return { code, name, selectId: code };
          }
        }).filter(x => x.name && x.name !== 'null')
          .sort((a, b) => a.name.localeCompare(b.name));

        this.pickerOptions = mapped;
        this.pickerOptionsFiltered = [...this.pickerOptions];
        this.pickerLoading = false;
        this.dropdownOpen = true;
      },
      error: (err: any) => {
        console.error('Error loading other/staff list', err);
        this.pickerOptions = [];
        this.pickerOptionsFiltered = [];
        this.pickerLoading = false;
        this.dropdownOpen = false;
        this.toastr.error(`Unable to load ${this.otherStaffType === 'O' ? 'Other' : 'Staff'} list.`);
      }
    });
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
      this.otherStaffName = this.pickerSelectedName ?? '';
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
        this.corrPincode = String(selected.pin ?? '').trim();
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
        // this.selectedPincode = String(selected.pin ?? '').trim();
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
        this.corrPincode = String(selected.pin ?? '').trim();
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
}
