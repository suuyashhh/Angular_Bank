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
  private baseUrl = environment.BASE_URL;

  private inactivityTimer: any = null;
  private readonly INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 min

  public isLoggingOut = false;
  public isRestoringSession$ = new BehaviorSubject<boolean>(true);
  private restorePromise: Promise<void>;

  constructor(private router: Router, private http: HttpClient) {
    if (isPlatformBrowser(this.platformId)) {
      this.restorePromise = this.restoreFromStorage().then(() => {
        this.setupInactivityTracking();
        this.setupSessionSync();
      });
    } else {
      this.restorePromise = Promise.resolve();
    }
  }

  // ===== AES Encryption / Decryption =====
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

  // ===== Storage Access =====
  private get storage() {
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

  // ===== Restore Token/User on App Init =====
  private async restoreFromStorage(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Check if this is a fresh page load or a refresh
        const currentTime = Date.now();
        const lastRefresh = localStorage.getItem('session_refresh_timestamp');
        
        // If last refresh was very recent (less than 5 seconds ago), it's likely a refresh
        const isRefresh = lastRefresh && (currentTime - parseInt(lastRefresh)) < 5000;
        
        if (!isRefresh) {
          // Fresh page load - restore from storage
          this.inMemoryToken = this.restoreTokenFromStorage() || localStorage.getItem('authToken');
          this.inMemoryUser = this.restoreUserFromStorage();
        } else {
          // It's a refresh - tokens should already be in memory
          console.log('Refresh detected - maintaining current session');
        }
        
        // Update refresh timestamp
        localStorage.setItem('session_refresh_timestamp', currentTime.toString());
        
        this.isRestoringSession$.next(false);
        resolve();
      }, 0);
    });
  }

  async ensureInitialized(): Promise<void> {
    await this.restorePromise;
  }

  // ===== Session Handling =====
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

  // ===== Login / Logout =====
  login(credentials: any) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.baseUrl}Login/Login`, credentials, { headers });
  }

  logout(trigger: string = 'manual'): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    if (trigger === 'inactivity timeout') {
      alert('You have been logged out due to inactivity.');
    }

    const token = this.getToken();
    const headers = token
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

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

  // ===== Inactivity Tracking =====
  private setupInactivityTracking(): void {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(ev =>
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

  // ===== Improved Session Sync (Removed Problematic Tab Close Detection) =====
  private setupSessionSync(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Listen for storage changes (other tabs logging out)
    window.addEventListener('storage', (event) => {
      if (event.key === 'authToken' && !event.newValue && this.isLoggedIn()) {
        this.clearLocalSession();
      }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Page became visible again, check session
        this.resetInactivityTimer();
      }
    });

    // Reliable beforeunload for actual tab close
    window.addEventListener('beforeunload', () => {
      this.clearInactivityTimer();
    });
  }

  // ===== Manual Refresh Protection =====
  preventAccidentalLogoutOnRefresh(): void {
    // This method can be called from your components before navigation
    localStorage.setItem('prevent_logout_on_refresh', 'true');
  }

  // ===== Public method to check session status =====
  public validateSession(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Add any additional token validation logic here
    return true;
  }
}
