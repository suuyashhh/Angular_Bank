import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';

interface Storage {
  length: number;
  clear(): void;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private router = inject(Router);
  private http = inject(HttpClient);
  private toastr = inject(ToastrService, { optional: true });

  private inMemoryToken: string | null = null;
  private inMemoryUser: any = null;

  private secretKey = environment.ENCRYPT_KEY || 'fallback_dev_key';
  private persist = !!environment.PERSIST_SESSION;
  private baseUrl = environment.BASE_URL || '/api/';
  private inactivityTimer: any = null;
  private readonly INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 min
  private currentTabId = '';
  public isLoggingOut = false;
  public isRestoringSession$ = new BehaviorSubject<boolean>(true);
  private restorePromise: Promise<void>;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.currentTabId = this.generateTabId();
      localStorage.setItem('active_tab_id', this.currentTabId);

      this.restorePromise = this.restoreFromStorage().then(() => {
        this.setupInactivityTracking();
        this.setupSessionSync();
        this.setupTabCloseLogout();
        this.setupSingleTabEnforcement();
      });
    } else {
      this.restorePromise = Promise.resolve();
    }
  }

  // ===== Encryption / Decryption =====
  private encryptData(data: any): string | null {
    try { return CryptoJS.AES.encrypt(JSON.stringify(data), this.secretKey).toString(); }
    catch { return null; }
  }

  private decryptData(cipherText: string | null): any {
    try {
      if (!cipherText) return null;
      const bytes = CryptoJS.AES.decrypt(cipherText, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted ? JSON.parse(decrypted) : null;
    } catch { return null; }
  }

  // ===== Storage =====
  private get storage(): Storage {
    if (!isPlatformBrowser(this.platformId)) {
      return {
        length: 0,
        clear: () => {},
        getItem: () => null,
        key: () => null,
        removeItem: () => {},
        setItem: () => {},
      } as unknown as Storage;
    }
    return this.persist ? localStorage : sessionStorage;
  }

  private writeStorage(key: string, value: any): void {
    const encrypted = this.encryptData(value);
    if (isPlatformBrowser(this.platformId) && encrypted) this.storage.setItem(key, encrypted);
  }

  private restoreTokenFromStorage(): string | null {
    if (this.inMemoryToken) return this.inMemoryToken;
    const encrypted = this.storage.getItem('token');
    const dec = this.decryptData(encrypted);
    if (!dec || typeof dec !== 'string') return null;
    this.inMemoryToken = dec;
    return dec;
  }

  private restoreUserFromStorage(): any {
    if (this.inMemoryUser) return this.inMemoryUser;
    const encrypted = this.storage.getItem('userDetails');
    const dec = this.decryptData(encrypted);
    if (!dec || typeof dec !== 'object') return null;
    this.inMemoryUser = dec;
    return dec;
  }

  private clearStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.storage.removeItem('token');
    this.storage.removeItem('userDetails');
    localStorage.removeItem('authToken');
    localStorage.removeItem('active_tab_id');
  }

  // ===== Restore session =====
  private async restoreFromStorage(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = this.restoreTokenFromStorage() || localStorage.getItem('authToken');
    const user = this.restoreUserFromStorage();

    this.inMemoryToken = token;
    this.inMemoryUser = user;

    this.isRestoringSession$.next(false);
  }

  async ensureInitialized(): Promise<void> {
    await this.restorePromise;
  }

  // ===== Session Handling =====
  setToken(res: any): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = res?.token ?? '';
    const user = res?.userDetails ?? null;

    this.inMemoryToken = token || null;
    this.inMemoryUser = user;

    this.writeStorage('token', token);
    this.writeStorage('userDetails', user);
    localStorage.setItem('authToken', token);

    const isHttps = window.location.protocol === 'https:';
    try {
      document.cookie = `authToken=${btoa(token)}; path=/;${isHttps ? ' Secure;' : ''} SameSite=Strict`;
    } catch {}

    this.resetInactivityTimer();
  }

  getToken(): string | null {
    if (!this.inMemoryToken) {
      this.inMemoryToken = this.restoreTokenFromStorage() || (isPlatformBrowser(this.platformId) ? localStorage.getItem('authToken') : null);
    }
    return this.inMemoryToken;
  }

  getUser(): any { return this.inMemoryUser ?? this.restoreUserFromStorage(); }

  isLoggedIn(): boolean { return !!this.getToken(); }

  // ===== Login / Logout =====
  login(credentials: any) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.baseUrl}Login/Login`, credentials, { headers });
  }

  logout(trigger: string = 'manual'): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    if (trigger === 'inactivity timeout') alert('You have been logged out due to inactivity.');

    const token = this.getToken();
    const headers = token ? new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }) : new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.post(`${this.baseUrl}Login/Logout`, {}, { headers }).subscribe({
      next: () => this.clearLocalSession(),
      error: () => this.clearLocalSession(),
    });
  }

  private clearLocalSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.inMemoryToken = null;
    this.inMemoryUser = null;
    this.clearStorage();
    document.cookie = 'authToken=; path=/; max-age=0';
    this.clearInactivityTimer();
    this.isLoggingOut = false;

    this.ngZone.run(() => {
      this.router.navigate(['/'], { replaceUrl: true }).then(() => window.location.reload());
    });
  }

  // ===== Inactivity Tracking =====
  private setupInactivityTracking(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const events = ['mousemove','mousedown','keydown','touchstart','scroll','click'];
    events.forEach(ev => window.addEventListener(ev, () => this.resetInactivityTimer(), { passive: true }));
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.clearInactivityTimer();
    this.ngZone.runOutsideAngular(() => {
      this.inactivityTimer = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.isLoggedIn()) this.logout('inactivity timeout');
        });
      }, this.INACTIVITY_LIMIT);
    });
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) { clearTimeout(this.inactivityTimer); this.inactivityTimer = null; }
  }

  // ===== Multi-tab & refresh safe =====
  private setupSessionSync(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.addEventListener('storage', (event) => {
      if ((event.key === 'authToken' && !event.newValue) || event.key === 'force_logout') {
        if (this.isLoggedIn()) this.clearLocalSession();
      }
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.resetInactivityTimer(); });
  }

  private setupTabCloseLogout(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Mark refresh in progress
    window.addEventListener('beforeunload', () => {
      sessionStorage.setItem('refresh_in_progress', 'true');
    });

    window.addEventListener('pagehide', (event) => {
      const refresh = sessionStorage.getItem('refresh_in_progress');
      if (refresh) {
        sessionStorage.removeItem('refresh_in_progress'); // normal refresh
        return; // DO NOT logout
      }

      // Only logout if tab actually closed
      if (this.isLoggedIn() && event.persisted === false) {
        try {
          const token = this.getToken();
          if (token) navigator.sendBeacon(`${this.baseUrl}Login/Logout`, JSON.stringify({ token }));
        } catch {}
        this.clearStorage();
      }
    });
  }

  private setupSingleTabEnforcement(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener('storage', (event) => {
      if (event.key === 'active_tab_id' && event.newValue !== this.currentTabId && this.isLoggedIn()) {
        this.toastr?.warning('Your session opened in another tab. Logging out.', 'Session Ended');
        this.logout('another tab login');
      }
    });

    const activeTabId = localStorage.getItem('active_tab_id');
    if (activeTabId && activeTabId !== this.currentTabId && this.isLoggedIn()) {
      this.toastr?.warning('Your session opened in another tab. Logging out.', 'Session Ended');
      this.logout('another tab login');
    }

    window.addEventListener('beforeunload', () => { localStorage.removeItem('active_tab_id'); });
  }

  private generateTabId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
