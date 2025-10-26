import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';

interface StorageLike {
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

  private STORAGE_KEY = 'authData';
  private inMemoryToken: string | null = null;
  private inMemoryUser: any = null;

  private secretKey = environment.ENCRYPT_KEY;
  private persist = environment.PERSIST_SESSION;
  private baseUrl = environment.BASE_URL;

  private inactivityTimer: any = null;
  private readonly INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 min
  private currentTabId = '';
  public isLoggingOut = false;
  public isRestoringSession$ = new BehaviorSubject<boolean>(true);
  private restorePromise: Promise<void>;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.currentTabId = this.generateTabId();
      this.safeSetStorage('active_tab_id', this.currentTabId);

      this.attachUnloadListener();

      this.restorePromise = this.restoreFromStorage().then(() => {
        this.setupInactivityTracking();
        this.setupSessionSync();
        this.setupSingleTabEnforcement();
      });
    } else {
      this.restorePromise = Promise.resolve();
    }
  }

  // ===== Safe Storage Operations =====
  private safeSetStorage(key: string, value: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.setItem(key, value); } catch (e) { console.warn(e); }
  }

  private safeGetStorage(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try { return localStorage.getItem(key); } catch (e) { console.warn(e); return null; }
  }

  private safeRemoveStorage(key: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.removeItem(key); } catch (e) { console.warn(e); }
  }

  private encrypt(data: any): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.secretKey).toString();
  }

  private decrypt(cipherText: string | null): any {
    if (!cipherText) return null;
    const bytes = CryptoJS.AES.decrypt(cipherText, this.secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted ? JSON.parse(decrypted) : null;
  }

  private attachUnloadListener() {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener('beforeunload', () => {
      const isReload = performance
        .getEntriesByType('navigation')
        .some((nav: any) => nav.type === 'reload');

      if (!isReload && this.isLoggedIn() && !this.isLoggingOut) {
        this.logout('tab-close');
      }
    });
  }

  private async restoreFromStorage(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) { this.isRestoringSession$.next(false); return; }

    try {
      const data = this.safeGetStorage(this.STORAGE_KEY);
      if (data) {
        const decrypted = this.decrypt(data);
        this.inMemoryToken = decrypted?.token ?? null;
        this.inMemoryUser = decrypted?.userDetails ?? null;
      }
    } catch (err) {
      console.warn('Failed to restore session', err);
    } finally {
      this.isRestoringSession$.next(false);
    }
  }

  async ensureInitialized(): Promise<void> {
    await this.restorePromise;
  }

  setToken(res: any): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.inMemoryToken = res?.token ?? null;
    this.inMemoryUser = res?.userDetails ?? null;

    const data = { token: this.inMemoryToken, userDetails: this.inMemoryUser };
    this.safeSetStorage(this.STORAGE_KEY, this.encrypt(data));
    this.resetInactivityTimer();
  }

  getToken(): string | null {
    if (!this.inMemoryToken) {
      const stored = this.safeGetStorage(this.STORAGE_KEY);
      if (stored) {
        const decrypted = this.decrypt(stored);
        this.inMemoryToken = decrypted?.token ?? null;
      }
    }
    return this.inMemoryToken;
  }

  getUser(): any {
    if (!this.inMemoryUser) {
      const stored = this.safeGetStorage(this.STORAGE_KEY);
      if (stored) {
        const decrypted = this.decrypt(stored);
        this.inMemoryUser = decrypted?.userDetails ?? null;
      }
    }
    return this.inMemoryUser;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  login(credentials: any) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.baseUrl}Login/Login`, credentials, { headers });
  }

  logout(trigger: string = 'manual'): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    this.safeRemoveStorage(this.STORAGE_KEY);
    sessionStorage.clear();
    this.inMemoryToken = null;
    this.inMemoryUser = null;
    this.clearInactivityTimer();

    // optional API logout call
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken() ? `Bearer ${this.getToken()}` : ''
    });
    this.http.post(`${this.baseUrl}Login/Logout`, {}, { headers }).subscribe({ next: () => {}, error: () => {} });

    this.ngZone.run(() => {
      this.router.navigate(['/'], { replaceUrl: true }).then(() => {
        this.isLoggingOut = false;
      });
    });
  }

  setSelectedBranch(code: number, name: string): void {
    const user = this.getUser() ?? {};
    const updated = { ...user, selectedBranchCode: code, selectedBranchName: name };
    this.inMemoryUser = updated;
    const data = { token: this.inMemoryToken, userDetails: updated };
    this.safeSetStorage(this.STORAGE_KEY, this.encrypt(data));
  }

  // ===== Inactivity Tracking =====
  private setupInactivityTracking(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const events = ['mousemove','mousedown','keydown','touchstart','scroll','click'];
    const handler = () => this.resetInactivityTimer();
    events.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
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
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  // ===== Session Synchronization Across Tabs =====
  private setupSessionSync(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener('storage', (event) => {
      if (event.key === this.STORAGE_KEY && !event.newValue) {
        if (this.isLoggedIn()) this.logout('another tab logout');
      }
      if (event.key === 'force_logout') {
        if (this.isLoggedIn()) this.logout('force logout');
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.resetInactivityTimer();
    });
  }

  private setupSingleTabEnforcement(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener('storage', (event) => {
      if (event.key === 'active_tab_id') {
        if (event.newValue && event.newValue !== this.currentTabId && this.isLoggedIn()) {
          this.toastr?.warning('Your session opened in another tab. Logging out.', 'Session Ended');
          this.logout('another tab login');
        }
      }
    });

    const activeTabId = this.safeGetStorage('active_tab_id');
    if (activeTabId && activeTabId !== this.currentTabId && this.isLoggedIn()) {
      this.toastr?.warning('Your session opened in another tab. Logging out.', 'Session Ended');
      this.logout('another tab login');
    }
  }

  private generateTabId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
