import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private router = inject(Router);
  private zone = inject(NgZone);
  private toastr = inject(ToastrService);

  private tokenSubject = new BehaviorSubject<string | null>(null);
  private loggedInSubject = new BehaviorSubject<boolean>(false);

  isLoggingOut = false;
  private initialized = false;
  baseUrl = environment.BASE_URL;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.ensureInitialized();
      this.setupStorageSync();
      this.setupTabCloseLogout();
    }
  }

  // ==============================
  // 🧠 Initialization
  // ==============================
  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Restore token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.tokenSubject.next(token);
      this.loggedInSubject.next(true);
    }

    // Optional: short async step to let guards wait
    await Promise.resolve();
  }

  // ==============================
  // 🔐 Auth state accessors
  // ==============================
  getToken(): string | null {
    return this.tokenSubject.value;
  }

  isLoggedIn(): boolean {
    return this.loggedInSubject.value;
  }

  // ==============================
  // 🚀 Login + Logout
  // ==============================
  login(token: string): void {
    localStorage.setItem('auth_token', token);
    this.tokenSubject.next(token);
    this.loggedInSubject.next(true);
    this.toastr.success('Welcome back!', 'Login Successful');
  }

  logout(reason: string = 'manual'): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    try {
      this.clearStorage();
      this.zone.run(() => {
        this.router.navigate(['/'], { replaceUrl: true });
        this.toastr.info('You have been logged out.', 'Session Ended');
      });
    } finally {
      this.isLoggingOut = false;
    }
  }

  // ==============================
  // 🧽 Clear only our auth data
  // ==============================
  private clearStorage(): void {
    localStorage.removeItem('auth_token');
    this.tokenSubject.next(null);
    this.loggedInSubject.next(false);
  }

  // ==============================
  // 🔄 Multi-tab session sync
  // ==============================
  private setupStorageSync(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth_token' && !event.newValue) {
        // Token removed — logout in this tab too
        this.zone.run(() => this.logout('sync'));
      }
    });
  }

  // ==============================
  // 🚪 Logout only on real tab close (not refresh)
  // ==============================
  private setupTabCloseLogout(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Mark refresh intent
    window.addEventListener('beforeunload', () => {
      sessionStorage.setItem('refresh_in_progress', 'true');
    });

    // When page loads back, clear refresh flag
    window.addEventListener('load', () => {
      setTimeout(() => sessionStorage.removeItem('refresh_in_progress'), 500);
    });

    // Detect true close (pagehide fires even on refresh)
    window.addEventListener('pagehide', () => {
      const isRefresh = sessionStorage.getItem('refresh_in_progress');
      if (isRefresh) return; // Skip logout on refresh

      // True tab close
      if (this.isLoggedIn()) {
        try {
          const token = this.getToken();
          if (token) {
            navigator.sendBeacon(
              `${this.baseUrl}Login/Logout`,
              JSON.stringify({ token })
            );
          }
        } catch (err) {
          console.warn('Beacon logout failed:', err);
        }

        this.clearStorage();
      }
    });
  }
}
