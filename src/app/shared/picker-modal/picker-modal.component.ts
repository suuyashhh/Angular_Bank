import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerService } from '../../services/picker.service';

@Component({
  selector: 'app-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './picker-modal.component.html',
  styleUrls: ['./picker-modal.component.css']
})
export class PickerModalComponent {
  dropdownOpen = false;
  searchText = '';

  @ViewChild('modalSearchInput') modalSearchInput!: ElementRef;

  constructor(public picker: PickerService) {
    this.picker.pickerOpen$.subscribe(open => {
      if (open) {
        setTimeout(() => {
          if (this.modalSearchInput) {
            this.modalSearchInput.nativeElement.focus();
            this.dropdownOpen = true;
          }
        }, 50);
      }
    });

    /** 
     * Update search box ONLY for the field currently opened 
     * (prevents cross-field selection issues)
     */
    this.picker.pickerSelected$.subscribe(sel => {
      if (!sel) return;

      const currentField = this.picker.pickerField$.value;
      if (sel.field === currentField && sel.option) {
        this.searchText = sel.option.name;
      }
    });

    /** 
     * When switching pickers, load existing selected value 
     */
    this.picker.pickerField$.subscribe(field => {
      if (!field) return;

      const existing = this.picker.getSelected(field);
      this.searchText = existing ? existing.name : '';
    });
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.picker.filter(this.searchText);
    }
  }

  /** Select an option (temp selection only) */
  selectOption(opt: any) {
    this.picker.pickOption(opt);

    this.searchText = opt.name || '';

    this.dropdownOpen = false;
  }
}
