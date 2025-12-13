import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownService } from '../services/dropdown.service';

@Component({
  selector: 'app-dropdpwn-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dropdpwn-modal.component.html',
  styleUrls: ['./dropdpwn-modal.component.css'],
})
export class DropdpwnModalComponent implements AfterViewInit, OnInit {
  @ViewChild('modalSearchInput') modalSearchInput!: ElementRef;


    constructor(public picker: DropdownService) {}
  ngOnInit(): void {
    this.picker.searchChanged$.subscribe(q => {
    this.picker.filter(q);
  });
  }


    ngAfterViewInit() {
    // When modal opens -> focus input
    this.picker.pickerOpen$.subscribe(isOpen => {
      if (isOpen) {
        setTimeout(() => {
          this.modalSearchInput?.nativeElement?.focus();
        }, 50);
      }
    });
  }

   toggleDropdown() {
    const current = this.picker.dropdownOpen$.value;
    this.picker.dropdownOpen$.next(!current);
  }

  get isSelected() {
    return !!this.picker.pickerSelectedTemp$.value;
  }
}