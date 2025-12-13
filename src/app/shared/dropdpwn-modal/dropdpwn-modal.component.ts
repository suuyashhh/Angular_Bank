import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Option {
  code?: number | string;
  name: string;
  // keep extra fields if needed
  [key: string]: any;
}

@Component({
  selector: 'app-dropdpwn-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dropdpwn-modal.component.html',
  styleUrls: ['./dropdpwn-modal.component.css']
})
export class DropdpwnModalComponent implements AfterViewInit, OnChanges {
  @ViewChild('modalSearchInput') modalSearchInput!: ElementRef<HTMLInputElement>;

  /** Inputs */
  @Input() open = false;
  @Input() title = 'Select';
  @Input() options: Option[] = [];
  @Input() selected: Option | null = null; // initial selection (optional)

  /** Outputs */
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<Option | null>();
  @Output() selectionChange = new EventEmitter<Option | null>(); // optional two-way-ish

  /** internal */
  dropdownOpen = true; // dropdown list under search input
  searchText = '';
  filtered: Option[] = [];
  tempSelected: Option | null = null;
  loading = false;

  ngAfterViewInit(): void {
    // focus when opened (we also handle changes in ngOnChanges)
    if (this.open) this.focusInput();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open'] && this.open) {
      // reset internal filtered list & temp selection on open
      this.searchText = '';
      this.filtered = [...(this.options || [])];
      this.tempSelected = this.selected ? { ...this.selected } : null;
      // wait briefly then focus
      setTimeout(() => this.focusInput(), 30);
      document.body.style.overflow = 'hidden';
    } else if (changes['open'] && !this.open) {
      document.body.style.overflow = '';
    }

    if (changes['options']) {
      // refresh filtered list if options change
      this.filtered = this.searchText ? this.filterList(this.searchText) : [...this.options];
    }
  }

  private focusInput() {
    try {
      this.modalSearchInput?.nativeElement?.focus();
    } catch { /* ignore */ }
  }

  onClose() {
    this.open = false;
    document.body.style.overflow = '';
    this.closed.emit();
  }

  onConfirm() {
    this.open = false;
    document.body.style.overflow = '';
    this.confirmed.emit(this.tempSelected);
  }

  pickOption(opt: Option) {
    this.tempSelected = opt;
    this.selectionChange.emit(opt);
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  onSearchChange(text: string) {
    this.searchText = (text || '').toLowerCase().trim();
    this.filtered = this.filterList(this.searchText);
    if (!this.dropdownOpen) this.dropdownOpen = true;
  }

  private filterList(term: string): Option[] {
    if (!term) return [...this.options];
    return (this.options || []).filter(o => {
      const name = (o.name ?? '').toString().toLowerCase();
      const code = (o.code ?? '').toString().toLowerCase();
      // generic search across a few common fields if present
      const other = (o['mobile'] ?? o['piN_CODE'] ?? '').toString().toLowerCase();
      return name.includes(term) || code.includes(term) || other.includes(term);
    });
  }

  // optional helper used by template to highlight selected class
  isSelected(opt: Option) {
    if (!this.tempSelected) return false;
    return String(this.tempSelected.code) === String(opt.code) && String(this.tempSelected.name) === String(opt.name);
  }
}
