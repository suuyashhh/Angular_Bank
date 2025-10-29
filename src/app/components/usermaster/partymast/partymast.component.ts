import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';

type PreviewKey = 'photo' | 'sign' | 'pan' | 'aadhaarFront' | 'aadhaarBack';
type PickerField = 'country' | 'state' | 'district' | 'taluka' | 'city';
type Option = { code: number; name: string };

@Component({
  selector: 'app-partymast',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './partymast.component.html',
  styleUrl: './partymast.component.css'
})
export class PartymastComponent implements OnInit {
  // '0' = Individual
  accountType = '0';

  // explicit preview keys so TypeScript + Angular template checker are happy
  previews: Record<PreviewKey, string | null> = {
    photo: null,
    sign: null,
    pan: null,
    aadhaarFront: null,
    aadhaarBack: null
  };

  // activeKey must be one of the preview keys (or null)
  activeKey: PreviewKey | null = null;
  modalOpen = false;

  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('signInput') signInput!: ElementRef<HTMLInputElement>;
  @ViewChild('panInput') panInput!: ElementRef<HTMLInputElement>;
  @ViewChild('aadhaarFrontInput') aadhaarFrontInput!: ElementRef<HTMLInputElement>;
  @ViewChild('aadhaarBackInput') aadhaarBackInput!: ElementRef<HTMLInputElement>;

  constructor(private api: ApiService, private toastr: ToastrService) {}

  ngOnInit(): void {
    // keep any initial calls you need; this is harmless debug call
    this.api.get('BranchMast/GetAllBranches').subscribe({
      next: (res: any) => { console.log('Account Types:', res); },
      error: (err: any) => { console.error('Error fetching account types:', err); }
    });
  }

  // ---------------- Image preview helpers ----------------
  onFileChange(event: Event, key: PreviewKey) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { this.previews[key] = reader.result as string; };
    reader.readAsDataURL(file);
  }

  isImage(preview: string | null): boolean {
    return !!preview && preview.startsWith('data:image/');
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
        case 'photo': if (this.photoInput) this.photoInput.nativeElement.value = ''; break;
        case 'sign': if (this.signInput) this.signInput.nativeElement.value = ''; break;
        case 'pan': if (this.panInput) this.panInput.nativeElement.value = ''; break;
        case 'aadhaarFront': if (this.aadhaarFrontInput) this.aadhaarFrontInput.nativeElement.value = ''; break;
        case 'aadhaarBack': if (this.aadhaarBackInput) this.aadhaarBackInput.nativeElement.value = ''; break;
      }
    } catch {}
    this.closePreview();
  }

  // ESC closes preview and picker
  @HostListener('window:keydown.escape', ['$event'])
  onEscKey(_: KeyboardEvent) {
    if (this.modalOpen) this.closePreview();
    if (this.pickerOpen) this.closePicker();
  }

  // ---------------- Picker logic ----------------
  pickerOpen = false;
  pickerField: PickerField | null = null;
  pickerTitle = '';
  pickerOptions: Option[] = [];
  pickerOptionsFiltered: Option[] = [];
  pickerSelectedCode: number | null = null;
  pickerSelectedName: string | null = null;
  pickerLoading = false;
  pickerSearch = '';

  // dropdown state (the inner dropdown inside modal's input)
  dropdownOpen = false;

  // selected values (names + codes)
  selectedCountryCode: number | null = null; selectedCountryName = '';
  selectedStateCode: number | null = null; selectedStateName = '';
  selectedDistrictCode: number | null = null; selectedDistrictName = '';
  selectedTalukaCode: number | null = null; selectedTalukaName = '';
  selectedCityCode: number | null = null; selectedCityName = '';

  openPicker(field: PickerField) {
    // dependency checks
    if (field === 'state' && !this.selectedCountryCode) { this.toastr.error('Please select Country first.', 'Required'); return; }
    if (field === 'district' && !this.selectedStateCode) { this.toastr.error('Please select State first.'); return; }
    if (field === 'taluka' && !this.selectedDistrictCode) { this.toastr.error('Please select District first.'); return; }
    if (field === 'city' && !this.selectedTalukaCode) { this.toastr.error('Please select Taluka first.'); return; }

    this.pickerField = field;
    this.pickerTitle = this.titleForField(field);
    this.pickerSearch = '';
    this.pickerSelectedCode = null;
    this.pickerSelectedName = null;
    this.pickerOptions = [];
    this.pickerOptionsFiltered = [];
    this.pickerLoading = true;
    this.pickerOpen = true;
    this.dropdownOpen = false;
    document.body.style.overflow = 'hidden';

    this.loadPickerOptions(field);
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

  titleForField(f: PickerField) {
    switch (f) {
      case 'country': return 'Country';
      case 'state': return 'State';
      case 'district': return 'District';
      case 'taluka': return 'Taluka';
      case 'city': return 'City';
      default: return 'Item';
    }
  }

  private loadPickerOptions(field: PickerField) {
    this.pickerLoading = true;
    let apiUrl = '';
    const countryCode = this.selectedCountryCode ?? 14; // optional fallback — remove if not desired
    const stateCode = this.selectedStateCode ?? 0;
    const distCode = this.selectedDistrictCode ?? 0;
    const talukaCode = this.selectedTalukaCode ?? 0;

    debugger;

    switch (field) {
      case 'country': apiUrl = 'CountryMaster/GetAllCountries'; break;
      case 'state': apiUrl = `StateMaster/GetStates?countryCode=${countryCode}`; break;
      case 'district': apiUrl = `DistrictMaster/GetDistricts?countryCode=${countryCode}&stateCode=${stateCode}`; break;
      case 'taluka': apiUrl = `TalukaMaster/GetTalukas?countryCode=${countryCode}&stateCode=${stateCode}&distCode=${distCode}`; break;
      case 'city': apiUrl = `CityMaster/GetCities?countryCode=${countryCode}&stateCode=${stateCode}&distCode=${distCode}&talukaCode=${talukaCode}`; break;
    }

    this.api.get(apiUrl).subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : Object.values(res || {});
        const mapped: Option[] = (list || [])
          .filter(x => x && (x.code ?? x.Code) !== undefined)
          .map(x => ({ code: Number(x.code ?? x.Code), name: String(x.name ?? x.Name).trim() }))
          .sort((a, b) => a.name.localeCompare(b.name));

        this.pickerOptions = mapped;
        this.pickerOptionsFiltered = [...this.pickerOptions];
        this.pickerLoading = false;

        // open dropdown by default like login modal
        this.dropdownOpen = true;

        // small UX: if few items, auto-select first? (not enabled by default)
      },
      error: (err: any) => {
        console.error('Picker load error', err);
        this.pickerOptions = []; this.pickerOptionsFiltered = []; this.pickerLoading = false; this.dropdownOpen = false;
        this.toastr.error('Unable to load items. Please try again.');
      }
    });
  }

  // called from input (same name as login page handler)
  onSearchChange() {
    this.onPickerSearchChange();
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) this.onPickerSearchChange();
  }

  onPickerSearchChange() {
    const t = (this.pickerSearch || '').toLowerCase();
    if (!t) { this.pickerOptionsFiltered = [...this.pickerOptions]; return; }
    this.pickerOptionsFiltered = this.pickerOptions.filter(o => o.name.toLowerCase().includes(t) || String(o.code).includes(t));
  }

  pickOption(opt: Option) {
    // when an option is clicked, immediately close the dropdown and set the input text
    this.pickerSelectedCode = opt.code;
    this.pickerSelectedName = opt.name;
    this.pickerSearch = opt.name;
    this.dropdownOpen = false; // close dropdown immediately on selection
  }

  confirmPicker() {
    if (!this.pickerField || !this.pickerSelectedCode) return;
    const code = this.pickerSelectedCode;
    const name = this.pickerSelectedName ?? '';

    switch (this.pickerField) {
      case 'country':
        this.selectedCountryCode = code; this.selectedCountryName = name;
        this.selectedStateCode = null; this.selectedStateName = '';
        this.selectedDistrictCode = null; this.selectedDistrictName = '';
        this.selectedTalukaCode = null; this.selectedTalukaName = '';
        this.selectedCityCode = null; this.selectedCityName = '';
        break;
      case 'state':
        this.selectedStateCode = code; this.selectedStateName = name;
        this.selectedDistrictCode = null; this.selectedDistrictName = '';
        this.selectedTalukaCode = null; this.selectedTalukaName = '';
        this.selectedCityCode = null; this.selectedCityName = '';
        break;
      case 'district':
        this.selectedDistrictCode = code; this.selectedDistrictName = name;
        this.selectedTalukaCode = null; this.selectedTalukaName = '';
        this.selectedCityCode = null; this.selectedCityName = '';
        break;
      case 'taluka':
        this.selectedTalukaCode = code; this.selectedTalukaName = name;
        this.selectedCityCode = null; this.selectedCityName = '';
        break;
      case 'city':
        this.selectedCityCode = code; this.selectedCityName = name;
        break;
    }

    this.closePicker();
  }

  trackByCode(_: number, item: { code: number }) {
    return item.code;
  }
}
