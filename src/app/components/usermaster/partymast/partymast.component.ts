import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { LoaderService } from '../../../services/loader.service';

type PickerField = 'city';
type PreviewKey = 'photo' | 'sign' | 'pan' | 'aadhaarFront' | 'aadhaarBack';

type Option = {
  code: number;
  name: string;
  selectId?: number;
  pin?: string;
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
  accountType = '0'; // default individual

  // picker (city)
  pickerOpen = false;
  pickerField: PickerField | null = null;
  pickerTitle = 'City';
  pickerOptions: Option[] = [];
  pickerOptionsFiltered: Option[] = [];
  pickerSelectedCode: number | null = null; // stores selected city unic id
  pickerSelectedName: string | null = null;
  pickerLoading = false;
  pickerSearch = '';
  dropdownOpen = false;

  // address fields (readonly visible + hidden codes via ngModel)
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

  // file input refs (template #photoInput etc)
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('signInput') signInput!: ElementRef<HTMLInputElement>;
  @ViewChild('panInput') panInput!: ElementRef<HTMLInputElement>;
  @ViewChild('aadhaarFrontInput') aadhaarFrontInput!: ElementRef<HTMLInputElement>;
  @ViewChild('aadhaarBackInput') aadhaarBackInput!: ElementRef<HTMLInputElement>;

  constructor(private api: ApiService, private toastr: ToastrService, private loader:LoaderService) {}

  ngOnInit(): void {
    // intentionally not preloading country/state/district/taluka
  }

  // ---------------- City picker methods ----------------
  openPicker(field: PickerField) {
    if (field !== 'city') return;
    this.pickerField = 'city';
    this.pickerTitle = 'City';
    this.pickerSearch = '';
    this.pickerSelectedCode = null;
    this.pickerSelectedName = null;
    this.pickerOptions = [];
    this.pickerOptionsFiltered = [];
    this.pickerLoading = true;
    this.pickerOpen = true;
    this.dropdownOpen = false;
    document.body.style.overflow = 'hidden';
    this.loadCityList();
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
          const pin = String(x.piN_CODE ?? x.PIN_CODE ?? x.piN_CODE ?? '').trim();
          return { code, name, selectId: unic, pin };
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
        this.toastr.error('Unable to load cities. Please try again.');
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
      String(o.code).includes(q) ||
      String(o.selectId ?? '').includes(q) ||
      (o.pin || '').includes(q)
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
    this.loader.show();
    if (!this.pickerField || !this.pickerSelectedCode) return;
    const cityUnicId = Number(this.pickerSelectedCode);
    const depApi = `CityMaster/GetDependencyByCityId?cityUnicId=${cityUnicId}`;

    this.api.get(depApi).subscribe({
      next: (res: any) => {
        if (!res) {
          this.toastr.error('No dependency data returned for selected city.');
          this.closePicker();
          return;
        }

        const resp: any = res;
        this.selectedCityUnicId = Number(resp.citY_UNIC_ID ?? resp.CitY_UNIC_ID ?? resp.city_unic_id ?? cityUnicId);
        this.selectedCityCode = Number(resp.citY_CODE ?? resp.CitY_CODE ?? resp.city_code ?? 0);
        this.selectedCityName = String(resp.citY_NAME ?? resp.CitY_NAME ?? resp.city_name ?? this.pickerSelectedName ?? '').trim();

        this.selectedCountryCode = Number(resp.countrY_CODE ?? resp.COUNTRy_CODE ?? resp.country_code ?? 0);
        this.selectedCountryName = String(resp.countrY_NAME ?? resp.COUNTRy_NAME ?? resp.country_name ?? '').trim();

        this.selectedStateCode = Number(resp.statE_CODE ?? resp.STATe_CODE ?? resp.state_code ?? 0);
        this.selectedStateName = String(resp.statE_NAME ?? resp.statE_NAME ?? resp.state_name ?? '').trim();

        this.selectedDistrictCode = Number(resp.disT_CODE ?? resp.DIST_CODE ?? resp.dist_code ?? 0);
        this.selectedDistrictName = String(resp.disT_NAME ?? resp.disT_NAME ?? resp.dist_name ?? '').trim();

        this.selectedTalukaCode = Number(resp.talukA_CODE ?? resp.TALUKA_CODE ?? resp.taluka_code ?? 0);
        this.selectedTalukaName = String(resp.talukA_NAME ?? resp.talukA_NAME ?? resp.taluka_name ?? '').trim();

        this.selectedAreaCode = Number(resp.areA_CODE ?? resp.AREA_CODE ?? resp.area_code ?? 0);
        this.selectedAreaName = String(resp.areA_NAME ?? resp.AREA_NAME ?? resp.area_name ?? '').trim();

        this.selectedPincode = String(resp.piN_CODE ?? resp.PIN_CODE ?? resp.pin_code ?? '').trim();

        this.toastr.success('City selected and address fields updated.');
        this.closePicker();
        this.loader.hide();
      },
      error: (err: any) => {
        console.error('Error fetching city dependency', err);
        this.toastr.error('Unable to fetch city details. Please try again.');
        this.closePicker();
      }
    });
  }

  trackByCode(_: number, item: { code: number; selectId?: number }) {
    return item.selectId ?? item.code;
  }

  // ---------------- File preview helpers ----------------
  onFileChange(event: Event, key: PreviewKey) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    // read as data URL for preview
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

    // clear corresponding file input element
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
