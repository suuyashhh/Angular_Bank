import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-partymast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './partymast.component.html',
  styleUrl: './partymast.component.css'
})
export class PartymastComponent implements OnInit {
  previews: any = {
    photo: null,
    sign: null,
    pan: null,
    aadhaarFront: null,
    aadhaarBack: null
  };

  // Modal state
  modalOpen = false;
  activeKey: string | null = null;

  // ViewChild references for file inputs (so we can clear them cleanly)
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('signInput') signInput!: ElementRef<HTMLInputElement>;
  @ViewChild('panInput') panInput!: ElementRef<HTMLInputElement>;
  @ViewChild('aadhaarFrontInput') aadhaarFrontInput!: ElementRef<HTMLInputElement>;
  @ViewChild('aadhaarBackInput') aadhaarBackInput!: ElementRef<HTMLInputElement>;

  constructor(private auth: AuthService, private api: ApiService) {}

  ngOnInit(): void {
    console.log(this.auth.getUser());
    this.api.get('BranchMast/GetAllBranches').subscribe({
      next: (res: any) => {
        console.log(res);
      },
    });
  }

  onFileChange(event: any, key: string) {
    const file = event.target.files[0];
    console.log(file);

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      // Using data URLs for compatibility with current isImage() logic
      this.previews[key] = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  isImage(preview: string | null): boolean {
    return preview ? preview.startsWith('data:image/') : false;
  }

  clearAllImages() {
    this.previews = {
      photo: null,
      sign: null,
      pan: null,
      aadhaarFront: null,
      aadhaarBack: null
    };

    // Reset file inputs
    const fileInputs = document.querySelectorAll('.file-input') as NodeListOf<HTMLInputElement>;
    fileInputs.forEach(input => {
      input.value = '';
    });

    // Also clear ViewChild inputs if present
    try {
      if (this.photoInput) this.photoInput.nativeElement.value = '';
      if (this.signInput) this.signInput.nativeElement.value = '';
      if (this.panInput) this.panInput.nativeElement.value = '';
      if (this.aadhaarFrontInput) this.aadhaarFrontInput.nativeElement.value = '';
      if (this.aadhaarBackInput) this.aadhaarBackInput.nativeElement.value = '';
    } catch (err) {
      // ignore if ViewChild not ready
    }
  }

  // ---------------------------
  // Modal related methods
  // ---------------------------

  openPreview(key: string) {
    this.activeKey = key;
    this.modalOpen = true;
    // prevent body scroll when modal open
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

    // Clear the preview data
    if (this.previews && this.previews[key]) {
      this.previews[key] = null;
    }

    // Clear the file input - prefer ViewChild if available
    try {
      switch (key) {
        case 'photo':
          if (this.photoInput) this.photoInput.nativeElement.value = '';
          break;
        case 'sign':
          if (this.signInput) this.signInput.nativeElement.value = '';
          break;
        case 'pan':
          if (this.panInput) this.panInput.nativeElement.value = '';
          break;
        case 'aadhaarFront':
          if (this.aadhaarFrontInput) this.aadhaarFrontInput.nativeElement.value = '';
          break;
        case 'aadhaarBack':
          if (this.aadhaarBackInput) this.aadhaarBackInput.nativeElement.value = '';
          break;
        default:
          // fallback: query selector by data-key
          const el = document.querySelector(`input[data-key="${key}"]`) as HTMLInputElement | null;
          if (el) el.value = '';
      }
    } catch (err) {
      // fallback to DOM query if any error
      const el = document.querySelector(`input[data-key="${key}"]`) as HTMLInputElement | null;
      if (el) el.value = '';
    }

    // close modal after removal
    this.closePreview();
  }
}
