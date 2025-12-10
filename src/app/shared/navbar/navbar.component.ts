import { Component, Output, EventEmitter, Input, OnDestroy, HostListener, OnInit } from '@angular/core';

import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { interval, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() hiddenChange = new EventEmitter<boolean>();
  @Input() isFullWidth: boolean = false;

  user: any;
  userImage = '../../assets/img/avatars/1.png';

  // Modal control properties
  showImageModal = false;
  modalImageUrl = '';
  modalImageAlt = '';

  private totalSeconds = 20 * 60; // 20 minutes
  remainingSeconds = this.totalSeconds;
  private tickSub?: Subscription;
  private isLoggedOut = false;

  // --- Auto-hide feature state ---
  autoHide = false;          // whether auto-hide is enabled (controlled by switch)
  hovering = false;          // true when mouse is over hotspot or navbar (keeps it shown)

  constructor(private auth: AuthService, private toster: ToastrService) { }

  ngOnInit(): void {
    this.user = this.auth.getUser();
    this.userImage = this.auth.getUserImage();
    this.tickSub = interval(1000).subscribe(() => {
      this.remainingSeconds = Math.max(0, this.remainingSeconds - 1);
      if (this.remainingSeconds === 0) {
        this.logout(); // Auto-logout when time is up
      }
    });
  }

  ngOnDestroy(): void {
    this.tickSub?.unsubscribe();
  }

  logout() {
    if (this.isLoggedOut) return;
    this.isLoggedOut = true;
    this.tickSub?.unsubscribe();
    this.auth.logout();
    this.toster.success('LogOut SuccessFul..!', 'Logout');
  }

  //  Reset timer on ANY click anywhere on the page
  @HostListener('document:click')
  onAnyDocumentClick() {
    if (this.isLoggedOut) return;
    this.resetTimer();
  }

  private resetTimer() {
    this.remainingSeconds = this.totalSeconds;
  }

  // Format as MM:SS
  get countdown(): string {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${this.pad(m)}:${this.pad(s)}`;
  }

  private pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

  // --- Auto-hide controls (hotspot and navbar mouse events call these) ---
  onHotspotEnter() {
    this.hovering = true;
    this.emitHidden();
  }
  onHotspotLeave() {
    this.hovering = false;
    this.emitHidden();
  }
  onNavbarEnter() {
    this.hovering = true;
    this.emitHidden();
  }
  onNavbarLeave() {
    this.hovering = false;
    this.emitHidden();
  }

  toggleAutoHide() {
    this.autoHide = !this.autoHide;
    if (!this.autoHide) {
      this.hovering = true;
      setTimeout(() => this.hovering = true, 0);
    } else {
      this.hovering = false;
    }
    this.emitHidden();
  }

  // send the current "hidden" boolean to parent (true means hidden)
  private emitHidden() {
    const hidden = this.autoHide && !this.hovering;
    this.hiddenChange.emit(hidden);
  }
  // Open image preview modal
  openImagePreview() {
    this.modalImageUrl = this.userImage;
    this.modalImageAlt = `${this.user?.NAME || 'User'}'s profile picture`;
    this.showImageModal = true;
    
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
  }

  // Close image preview modal
  closeImagePreview() {
    this.showImageModal = false;
    document.body.style.overflow = 'auto';
  }

  // Close modal when clicking on backdrop (outside image)
  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeImagePreview();
    }
  }
}
