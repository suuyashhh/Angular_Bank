import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { LoaderService } from '../../../services/loader.service';

type PickerField = 'city' | 'area' | 'religion' | 'cast' | 'occupation' | 'idproof' | 'addrproof' | 'otherstaff';
type PickerTarget = 'primary' | 'corr';
type PreviewKey = 'photo' | 'sign' | 'pan' | 'aadhaarFront' | 'aadhaarBack';

type Option = {
  code: number;
  name: string;
  selectId?: number;
  pin?: string | null;
};

@Component({
  selector: 'app-partymast',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
  selectedPincode = '';

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
  addrproofCode : number | null = null;

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
  // search input ref in picker modal - used for autofocus
  @ViewChild('pickerSearchInput') pickerSearchInput!: ElementRef<HTMLInputElement>;

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    private loader: LoaderService
  ) { }

  ngOnInit(): void { }

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
      case 'addrproof' : this.loadAddrProofList(); break;
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
      case 'addrproof' : return 'AddressProof';
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
     
        // Map based on the type (Other or Staff)
        const mapped: Option[] = (list || []).map(x => {
          if (this.otherStaffType === 'O') {
            // For Other type
            const code = Number(x.otheR_CODE ?? x.OTHER_CODE ?? 0);
            const name = String(x.otheR_NAME ?? x.OTHER_NAME ?? '').trim();
            return { code, name, selectId: code };
          } else {
            // For Staff type - using KYC_ADDR fields from your example
            const code = Number(x.stafF_CODE );
            const name = String(x.stafF_NAME ?? '').trim();
            return { code, name, selectId: code };
          }
        }).filter(x => x.name && x.name !== 'null' && x.name !== '') // Filter out empty names
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

  private loadCityList() {
    this.pickerLoading = true;
    const apiUrl = `CityMaster/GetAllCities`;
    this.api.get(apiUrl).subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : Object.values(res || {});
        const mapped: Option[] = (list || []).map(x => {
          const unic = Number(x.citY_UNIC_ID ?? x.CitY_UNIC_ID ?? 0);
          const code = Number(x.citY_CODE ?? x.CitY_CODE ?? 0);
          const name = String(x.citY_NAME ?? x.CitY_NAME ?? '').trim();
          const pin = x.piN_CODE ?? x.PIN_CODE ?? x.pin_code ?? null;
          return { code, name, selectId: unic, pin: pin ? String(pin) : null };
        }).sort((a, b) => a.name.localeCompare(b.name));

        this.pickerOptions = mapped;
        this.pickerOptionsFiltered = [...this.pickerOptions];
        this.pickerLoading = false;
        this.dropdownOpen = true;
      },
      error: (err: any) => {
        console.error('Error loading cities', err);
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

    // choose codes depending on target
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
    this.pickerOptionsFiltered = this.pickerOptions.filter(o =>
      (o.name || '').toLowerCase().includes(q) ||
      (o.pin || '').toLowerCase().includes(q) ||
      String(o.selectId ?? '').includes(q)
    );
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) this.onSearchChange();
  }

  pickOption(opt: Option) {
    this.pickerSelectedCode = opt.selectId ?? opt.code;
    this.pickerSelectedName = opt.name;
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
        this.selectedPincode = String(selected.pin ?? '').trim();
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
      this.loader.show();
      const cityUnicId = Number(this.pickerSelectedCode);
      const depApi = `CityMaster/GetDependencyByCityId?cityUnicId=${cityUnicId}`;

      this.api.get(depApi).subscribe({
        next: (res: any) => {
          if (!res) {
            this.toastr.error('No dependency data returned for selected city.');
            this.closePicker();
            this.loader.hide();
            return;
          }

          const resp: any = res;

          if (this.pickerTarget === 'primary') {
            this.selectedCityUnicId = Number(resp.citY_UNIC_ID ?? resp.CitY_UNIC_ID ?? resp.city_unic_id ?? cityUnicId);
            this.selectedCityCode = resp.citY_CODE ?? resp.CitY_CODE ?? resp.city_code ?? null;
            this.selectedCityName = String(resp.citY_NAME ?? resp.CitY_NAME ?? resp.city_name ?? this.pickerSelectedName ?? '').trim();

            this.selectedCountryCode = resp.countrY_CODE ?? resp.COUNTRy_CODE ?? resp.country_code ?? null;
            this.selectedCountryName = String(resp.countrY_NAME ?? resp.COUNTRy_NAME ?? resp.country_name ?? '').trim();

            this.selectedStateCode = resp.statE_CODE ?? resp.STATe_CODE ?? resp.state_code ?? null;
            this.selectedStateName = String(resp.statE_NAME ?? resp.statE_NAME ?? resp.state_name ?? '').trim();

            this.selectedDistrictCode = resp.disT_CODE ?? resp.DIST_CODE ?? resp.dist_code ?? null;
            this.selectedDistrictName = String(resp.disT_NAME ?? resp.disT_NAME ?? resp.dist_name ?? '').trim();

            this.selectedTalukaCode = resp.talukA_CODE ?? resp.TALUKA_CODE ?? resp.taluka_code ?? null;
            this.selectedTalukaName = String(resp.talukA_NAME ?? resp.talukA_NAME ?? resp.taluka_name ?? '').trim();

            // keep area blank — user must pick area separately
            this.selectedAreaCode = null;
            this.selectedAreaName = '';
            // set city-level pincode if returned; area selection will overwrite
            this.selectedPincode = String(resp.piN_CODE ?? resp.PIN_CODE ?? resp.pin_code ?? '').trim();
          } else { // corr target
            this.corrSelectedCityUnicId = Number(resp.citY_UNIC_ID ?? resp.CitY_UNIC_ID ?? resp.city_unic_id ?? cityUnicId);
            this.corrSelectedCityCode = resp.citY_CODE ?? resp.CitY_CODE ?? resp.city_code ?? null;
            this.corrCityName = String(resp.citY_NAME ?? resp.CitY_NAME ?? resp.city_name ?? this.pickerSelectedName ?? '').trim();

            this.corrSelectedCountryCode = resp.countrY_CODE ?? resp.COUNTRy_CODE ?? resp.country_code ?? null;
            this.corrCountryName = String(resp.countrY_NAME ?? resp.COUNTRy_NAME ?? resp.country_name ?? '').trim();

            this.corrSelectedStateCode = resp.statE_CODE ?? resp.STATe_CODE ?? resp.state_code ?? null;
            this.corrStateName = String(resp.statE_NAME ?? resp.statE_NAME ?? resp.state_name ?? '').trim();

            this.corrSelectedDistrictCode = resp.disT_CODE ?? resp.DIST_CODE ?? resp.dist_code ?? null;
            this.corrDistrictName = String(resp.disT_NAME ?? resp.disT_NAME ?? resp.dist_name ?? '').trim();

            this.corrSelectedTalukaCode = resp.talukA_CODE ?? resp.TALUKA_CODE ?? resp.taluka_code ?? null;
            this.corrTalukaName = String(resp.talukA_NAME ?? resp.talukA_NAME ?? resp.taluka_name ?? '').trim();

            // keep corr area blank — user must pick area separately
            this.corrSelectedAreaCode = null;
            this.corrAreaName = '';
            // set city-level pincode if returned; area selection will overwrite
            this.corrPincode = String(resp.piN_CODE ?? resp.PIN_CODE ?? resp.pin_code ?? '').trim();
          }

          this.toastr.success('City selected and address fields updated.');
          this.closePicker();
          this.loader.hide();
        },
        error: (err: any) => {
          console.error('Error fetching city dependency', err);
          this.toastr.error('Unable to fetch city details. Please try again.');
          this.closePicker();
          this.loader.hide();
        }
      });

      return;
    }

    // -------------------- RELIGION / CAST / OCCUPATION --------------------
    // These types simply return code + name from their respective APIs (already loaded into pickerOptions)
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

        case 'addrproof' :
          this.addrproofCode =Number(this.pickerSelectedCode);
          this.addrproofName = this.pickerSelectedName ?? '';
          this.toastr.success('Address Proof Selected.');
          break;

      default:
        // unknown picker field (shouldn't happen)
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

  @HostListener('window:keydown.escape', ['$event'])
  onEscKey(_: KeyboardEvent) {
    if (this.modalOpen) this.closePreview();
    if (this.pickerOpen) this.closePicker();
  }
}