import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);

  private inMemoryToken: string | null = null;
  private inMemoryUser: any = null;

  private secretKey = environment.ENCRYPT_KEY || 'fallback_dev_key';
  private persist = !!environment.PERSIST_SESSION;
  private baseUrl = environment.BASE_URL || '/api/';

  private inactivityTimer: any = null;
  private readonly INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 minutes

  public isLoggingOut = false;
  public isRestoringSession$ = new BehaviorSubject<boolean>(true);
  private restorePromise: Promise<void>;

  constructor(private router: Router, private http: HttpClient) {
    if (isPlatformBrowser(this.platformId)) {
      this.restorePromise = this.restoreFromStorage().then(() => {
        this.setupInactivityTracking();
        this.setupSessionSync();
        this.setupTabCloseLogout();
      });
    } else {
      this.restorePromise = Promise.resolve();
    }
  }

  // ===============================
  // AES Encryption / Decryption
  // ===============================
  private encryptData(data: any): string | null {
    try {
      return CryptoJS.AES.encrypt(JSON.stringify(data), this.secretKey).toString();
    } catch {
      return null;
    }
  }

  private decryptData(cipherText: string | null): any {
    try {
      if (!cipherText) return null;
      const bytes = CryptoJS.AES.decrypt(cipherText, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) return null;
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  // ===============================
  // Storage Handling
  // ===============================
  private get storage(): Storage {
    return this.persist ? localStorage : sessionStorage;
  }

  private restoreTokenFromStorage(): string | null {
    if (this.inMemoryToken) return this.inMemoryToken;

    const encrypted = this.storage.getItem('token');
    if (!encrypted) return null;

    const dec = this.decryptData(encrypted);
    if (!dec || typeof dec !== 'string') return null;

    this.inMemoryToken = dec;
    return dec;
  }

  private restoreUserFromStorage(): any {
    if (this.inMemoryUser) return this.inMemoryUser;

    const encrypted = this.storage.getItem('userDetails');
    if (!encrypted) return null;

    const dec = this.decryptData(encrypted);
    if (!dec || typeof dec !== 'object') return null;

    this.inMemoryUser = dec;
    return dec;
  }

  private writeStorage(key: string, value: any): void {
    const encrypted = this.encryptData(value);
    if (encrypted) this.storage.setItem(key, encrypted);
  }

  private clearStorage(): void {
    this.storage.removeItem('token');
    this.storage.removeItem('userDetails');
    localStorage.removeItem('authToken');
    localStorage.removeItem('session_refresh_timestamp');
  }

  // ===============================
  // Restore on app start / refresh
  // ===============================
private async restoreFromStorage(): Promise<void> {
  return new Promise((resolve) => {
    const now = Date.now();
    const lastRefresh = localStorage.getItem('session_refresh_timestamp');
    const isRefresh = lastRefresh && now - parseInt(lastRefresh, 10) < 5000;

    // ⚡️ No async delay — restore immediately
    if (!isRefresh) {
      this.inMemoryToken = this.restoreTokenFromStorage() || localStorage.getItem('authToken');
      this.inMemoryUser = this.restoreUserFromStorage();
    }

    // Always update timestamp
    localStorage.setItem('session_refresh_timestamp', now.toString());

    this.isRestoringSession$.next(false);
    resolve();
  });
}


  async ensureInitialized(): Promise<void> {
    await this.restorePromise;
  }

  // ===============================
  // Token + User Accessors
  // ===============================
  setToken(res: any): void {
    const token = res?.token ?? '';
    const user = res?.userDetails ?? null;

    this.inMemoryToken = token || null;
    this.inMemoryUser = user;

    this.writeStorage('token', token);
    this.writeStorage('userDetails', user);
    localStorage.setItem('authToken', token);
    localStorage.setItem('session_refresh_timestamp', Date.now().toString());

    try {
      document.cookie = `authToken=${btoa(token)}; path=/; Secure; SameSite=Strict`;
    } catch {}

    this.resetInactivityTimer();

    // Broadcast login event for other tabs
    localStorage.setItem('session_event', 'login_' + Date.now());
  }

  getUser(): any {
    return this.inMemoryUser ?? this.restoreUserFromStorage();
  }

  getToken(): string | null {
    if (!this.inMemoryToken) {
      this.inMemoryToken = this.restoreTokenFromStorage() || localStorage.getItem('authToken');
    }
    return this.inMemoryToken;
  }

  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return !!this.getToken();
  }

  // ===============================
  // Login / Logout
  // ===============================
  login(credentials: any) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.baseUrl}Login/Login`, credentials, { headers });
  }

  logout(trigger: string = 'manual'): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    const token = this.getToken();
    const headers = token
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    // Notify all tabs to logout
    localStorage.setItem('session_event', 'logout_' + Date.now());

    this.http.post(`${this.baseUrl}Login/Logout`, {}, { headers }).subscribe({
      next: () => this.clearLocalSession(),
      error: () => this.clearLocalSession(),
    });
  }

  private clearLocalSession(): void {
    this.inMemoryToken = null;
    this.inMemoryUser = null;
    try {
      this.clearStorage();
      document.cookie = 'authToken=; path=/; max-age=0';
    } catch {}

    this.clearInactivityTimer();
    this.isLoggingOut = false;

    this.ngZone.run(() => {
      this.router.navigate(['/'], { replaceUrl: true }).then(() => {
        window.location.reload();
      });
    });
  }

  // ===============================
  // Inactivity Tracking
  // ===============================
  private setupInactivityTracking(): void {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((ev) =>
      window.addEventListener(ev, () => this.resetInactivityTimer(), { passive: true })
    );
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    this.clearInactivityTimer();
    this.ngZone.runOutsideAngular(() => {
      this.inactivityTimer = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.isLoggedIn()) {
            this.logout('inactivity timeout');
          }
        });
      }, this.INACTIVITY_LIMIT);
    });
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  // ===============================
  // Cross-tab Session Sync
  // ===============================
  private setupSessionSync(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener('storage', (event) => {
      const val = event.newValue || '';
      if (event.key === 'session_event') {
        // 🧩 Another tab logged in — force logout here
        if (val.startsWith('login_') && this.isLoggedIn()) {
          this.clearLocalSession();
        }
        // 🧩 Another tab logged out — logout here too
        if (val.startsWith('logout_')) {
          this.clearLocalSession();
        }
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.resetInactivityTimer();
    });
  }

  // ===============================
  // Logout on real tab close only (not refresh)
  // ===============================
  private setupTabCloseLogout(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Mark refresh
    window.addEventListener('beforeunload', () => {
      sessionStorage.setItem('refresh_in_progress', 'true');
    });

    window.addEventListener('load', () => {
      setTimeout(() => sessionStorage.removeItem('refresh_in_progress'), 500);
    });

    // Detect true close
    window.addEventListener('pagehide', () => {
      if (sessionStorage.getItem('refresh_in_progress')) return;

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
