import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { on } from 'events';
import { AuthService } from '../../../services/auth.service';

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

  constructor(private auth:AuthService) {}
  ngOnInit(): void {
    console.log(this.auth.getUser());

  }

  onFileChange(event: any, key: string) {
    const file = event.target.files[0];
    console.log(file);

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
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
  }
}
