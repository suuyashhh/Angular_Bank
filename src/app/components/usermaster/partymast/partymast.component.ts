import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { LoaderService } from '../../../services/loader.service';

type PickerField = 'city' | 'area';
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
  // wizard
  accountType = '0';

  // picker
  pickerOpen = false;
  pickerField: PickerField | null = null;
  pickerTitle = 'City';
  pickerOptions: Option[] = [];
  pickerOptionsFiltered: Option[] = [];
  pickerSelectedCode: number | null = null;
  pickerSelectedName: string | null = null;
  pickerLoading = false;
  pickerSearch = '';
  dropdownOpen = false;

  // address fields
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

  // file previews & preview modal
  previews: Record<PreviewKey, string | null> = {
    photo: null,
    sign: null,
    pan: null,
    aadhaarFront: null,
    aadhaarBack: null
  };
  activeKey: PreviewKey | null = null;
  modalOpen = false;

  // file input refs
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('signInput') signInput!: ElementRef<HTMLInputElement>;
  @ViewChild('panInput') panInput!: ElementRef<HTMLInputElement>;
  @ViewChild('aadhaarFrontInput') aadhaarFrontInput!: ElementRef<HTMLInputElement>;
  @ViewChild('aadhaarBackInput') aadhaarBackInput!: ElementRef<HTMLInputElement>;

  // search input ref in picker modal - used for autofocus
  @ViewChild('pickerSearchInput') pickerSearchInput!: ElementRef<HTMLInputElement>;

  constructor(private api: ApiService, private toastr: ToastrService, private loader: LoaderService) {}

  ngOnInit(): void {
     this.api.get('BranchMast/GetAllBranches').subscribe({
  next: (res: any) => {
    console.log('Account Types:', res);
  },
  error: (err: any) => {
    console.error('Error fetching account types:', err);
  }
});
  }

  /**
   * Open picker for 'city' or 'area'.
   * For 'area' we first check that country/state/district/taluka/city codes are present.
   * If check fails, show toast and DO NOT open modal.
   */
  openPicker(field: PickerField) {
    // If opening area, ensure we already have required codes from a selected city
    if (field === 'area') {
      // Check for null / undefined only — allow numeric 0 as valid
      if (
        this.selectedCountryCode == null ||
        this.selectedStateCode == null ||
        this.selectedDistrictCode == null ||
        this.selectedTalukaCode == null ||
        this.selectedCityCode == null
      ) {
        // Provide a clear message so user knows what to do
        this.toastr.error('Please select a City first. Area depends on City.','Area');
        return; // do not open modal
      }
    }

    // proceed to open modal for city OR area
    this.pickerField = field;
    this.pickerTitle = field === 'city' ? 'City' : 'Area';
    this.pickerSearch = '';
    this.pickerSelectedCode = null;
    this.pickerSelectedName = null;
    this.pickerOptions = [];
    this.pickerOptionsFiltered = [];
    this.pickerLoading = true;
    this.pickerOpen = true;
    this.dropdownOpen = false;
    document.body.style.overflow = 'hidden';

    // load appropriate list
    if (field === 'city') {
      this.loadCityList();
    } else {
      this.loadAreaList();
    }

    // autofocus the search input after the modal is displayed
    // setTimeout 0 ensures DOM exists & modal CSS applied before focus
    setTimeout(() => {
      try { this.pickerSearchInput?.nativeElement?.focus(); }
      catch (e) { /* ignore if not present */ }
    }, 0);
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

  // ---------------- Load city list ----------------
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

  // ---------------- Load area list ----------------
  private loadAreaList() {
   

    this.pickerLoading = true;
    const apiUrl = `AreaMaster/GetAreaById?countryCode=${this.selectedCountryCode}&stateCode=${this.selectedStateCode}&distCode=${this.selectedDistrictCode}&talukaCode=${this.selectedTalukaCode}&cityCode=${this.selectedCityCode}`;

    this.api.get(apiUrl).subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : Object.values(res || {}));
        const mapped: Option[] = (list || []).map(x => {
          const selectId = Number(x.areA_CODE ?? x.AREA_CODE ?? x.areA_CODE ?? 0);
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

  onSearchChange() {
    const q = (this.pickerSearch || '').toLowerCase().trim();
    if (!q) {
      this.pickerOptionsFiltered = [...this.pickerOptions];
      return;
    }
    this.pickerOptionsFiltered = this.pickerOptions.filter(o =>
      (o.name || '').toLowerCase().includes(q) ||
      (o.pin || '').includes(q) ||
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

  confirmPicker() {
    if (!this.pickerField || !this.pickerSelectedCode) return;

    if (this.pickerField === 'area') {
      const selected = this.pickerOptions.find(o => (o.selectId ?? o.code) === this.pickerSelectedCode);
      if (!selected) {
        this.toastr.error('Selected area not found.');
        this.closePicker();
        return;
      }

      this.selectedAreaCode = Number(selected.selectId ?? selected.code ?? 0);
      this.selectedAreaName = selected.name ?? '';
      this.selectedPincode = String(selected.pin ?? '').trim();

      this.toastr.success('Area selected and pincode updated.');
      this.closePicker();
      return;
    }

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
          this.selectedCityUnicId = Number(resp.citY_UNIC_ID ?? resp.CitY_UNIC_ID ?? resp.city_unic_id ?? cityUnicId);
          this.selectedCityCode = Number(resp.citY_CODE ?? resp.CitY_CODE ?? resp.city_code ?? null);
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
    }
  }

  trackByCode(_: number, item: { code: number; selectId?: number }) {
    return item.selectId ?? item.code;
  }

  // file preview helpers
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
        case 'photo': if (this.photoInput?.nativeElement) this.photoInput.nativeElement.value = ''; break;
        case 'sign': if (this.signInput?.nativeElement) this.signInput.nativeElement.value = ''; break;
        case 'pan': if (this.panInput?.nativeElement) this.panInput.nativeElement.value = ''; break;
        case 'aadhaarFront': if (this.aadhaarFrontInput?.nativeElement) this.aadhaarFrontInput.nativeElement.value = ''; break;
        case 'aadhaarBack': if (this.aadhaarBackInput?.nativeElement) this.aadhaarBackInput.nativeElement.value = ''; break;
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
