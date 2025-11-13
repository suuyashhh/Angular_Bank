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

  pickerField: any = null;
  selectedTemp: any = null;

  @ViewChild('modalSearchInput') modalSearchInput!: ElementRef;

  constructor(public picker: PickerService) {

    /** Focus search box when modal opens */
    this.picker.pickerOpen$.subscribe(open => {
      if (open) {
        setTimeout(() => {
          if (this.modalSearchInput) {
            this.modalSearchInput.nativeElement.focus();
            this.dropdownOpen = true;
          }
        }, 40);
      }
    });

    /** Store currently opened field */
    this.picker.pickerField$.subscribe(f => {
      this.pickerField = f;

      const exist = this.picker.getSelected(f!, this.picker.currentTarget);
      this.searchText = exist ? exist.name : '';
    });

    /** Temp selection updates searchBox */
    this.picker.pickerTempSelected$.subscribe(sel => {
      this.selectedTemp = sel;

      if (sel?.option) {
        this.searchText = sel.option.name;
      }
    });

  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.picker.filter(this.searchText);
    }
  }

  selectOption(opt: any) {
    this.picker.pickOption(opt);
    this.searchText = opt.name;
    this.dropdownOpen = false;
  }
}
