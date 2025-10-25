import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

type PreviewKey = 'photo' | 'sign' | 'pan' | 'aadhaarFront' | 'aadhaarBack';

@Component({
  selector: 'app-partymast',
  standalone: true,
  imports: [CommonModule, FormsModule,RouterModule],
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

  constructor() {}

  ngOnInit(): void {}

  // accept only keys that exist in previews
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

    // try clearing actual file input element (best-effort)
    try {
      switch (key) {
        case 'photo': if (this.photoInput) this.photoInput.nativeElement.value = ''; break;
        case 'sign': if (this.signInput) this.signInput.nativeElement.value = ''; break;
        case 'pan': if (this.panInput) this.panInput.nativeElement.value = ''; break;
        case 'aadhaarFront': if (this.aadhaarFrontInput) this.aadhaarFrontInput.nativeElement.value = ''; break;
        case 'aadhaarBack': if (this.aadhaarBackInput) this.aadhaarBackInput.nativeElement.value = ''; break;
      }
    } catch {
      // ignore if ViewChild not available
    }

    this.closePreview();
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscKey(_: KeyboardEvent) {
    if (this.modalOpen) this.closePreview();
  }
}
