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
      // Set our active tab id on load
      localStorage.setItem('active_tab_id', this.currentTabId);

      // start restore and then set up listeners
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

  // ===== Storage accessor =====
  private get storage(): StorageLike {
  if (!isPlatformBrowser(this.platformId)) {
    return {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {},
      setItem: () => {},
    } as unknown as StorageLike;
  }

  // Force localStorage in production to persist login across refresh
  const isHosted = window.location.hostname.includes('netlify.app') || window.location.protocol === 'https:';
  return isHosted ? localStorage : (this.persist ? localStorage : sessionStorage);
}


  private writeStorage(key: string, value: any): void {
    const encrypted = this.encryptData(value);
    if (isPlatformBrowser(this.platformId) && encrypted) this.storage.setItem(key, encrypted);
  }

  private restoreTokenFromStorage(): string | null {
    if (this.inMemoryToken) return this.inMemoryToken;
    try {
      const encrypted = this.storage.getItem('token');
      const dec = this.decryptData(encrypted);
      if (dec && typeof dec === 'string') { this.inMemoryToken = dec; return dec; }
    } catch {}
    return null;
  }

  private restoreUserFromStorage(): any {
    if (this.inMemoryUser) return this.inMemoryUser;
    try {
      const encrypted = this.storage.getItem('userDetails');
      const dec = this.decryptData(encrypted);
      if (dec && typeof dec === 'object') { this.inMemoryUser = dec; return dec; }
    } catch {}
    return null;
  }

  private clearStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.storage.removeItem('token');
    this.storage.removeItem('userDetails');
    // keep authToken fallback removal (if used)
    localStorage.removeItem('authToken');
    // DO NOT blindly remove active_tab_id here (other tabs may misinterpret)
  }

  // ===== Restore session =====
  private async restoreFromStorage(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Try encrypted locations first
    const tokenFromEncrypted = this.restoreTokenFromStorage();
    // fallback to plain localStorage key if present (legacy)
    const tokenFallback = localStorage.getItem('authToken');

    const token = tokenFromEncrypted || tokenFallback || null;
    const user = this.restoreUserFromStorage();

    this.inMemoryToken = token;
    this.inMemoryUser = user;

    // done restoring
    this.isRestoringSession$.next(false);
  }

  async ensureInitialized(): Promise<void> { await this.restorePromise; }

  // ===== Session Handling =====
  setToken(res: any): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = res?.token ?? '';
    const user = res?.userDetails ?? null;

    this.inMemoryToken = token || null;
    this.inMemoryUser = user;

    this.writeStorage('token', token);
    this.writeStorage('userDetails', user);
    // keep plain fallback copy for older code if required
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

    // attempt server logout but always clear local session afterwards
    this.http.post(`${this.baseUrl}Login/Logout`, {}, { headers }).subscribe({
      next: () => this.clearLocalSession(),
      error: () => this.clearLocalSession(),
    });
  }

  private clearLocalSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.inMemoryToken = null;
    this.inMemoryUser = null;

    // Only clear auth-related storage, not the refresh detection timestamp
    this.storage.removeItem('token');
    this.storage.removeItem('userDetails');
    localStorage.removeItem('authToken');

    // clear cookie
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
    if (this.inactivityTimer) { clearTimeout(this.inactivityTimer); this.inactivityTimer = null; }
  }

  // ===== Multi-tab & refresh safe =====
  private setupSessionSync(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener('storage', (event) => {
      // If token removed (explicit logout from another tab) or explicit force_logout key
      if ((event.key === 'authToken' && !event.newValue) || event.key === 'force_logout') {
        if (this.isLoggedIn()) this.clearLocalSession();
      }
    });

    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.resetInactivityTimer(); });
  }

  private setupTabCloseLogout(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Mark refresh in progress (set in sessionStorage)
    window.addEventListener('beforeunload', () => {
      // Mark this is a refresh/navigation; pagehide will check this
      try { sessionStorage.setItem('refresh_in_progress', 'true'); }
      catch {}
      // Also set a timestamp so AppComponent can detect quick reloads
      try { localStorage.setItem('session_refresh_timestamp', Date.now().toString()); }
      catch {}
    });

    window.addEventListener('pagehide', (event) => {
      // if refresh_in_progress is set, it is a navigation/refresh - do NOT clear storage
      const refresh = sessionStorage.getItem('refresh_in_progress');
      if (refresh) {
        // normal refresh: remove flag and KEEP session/state
        sessionStorage.removeItem('refresh_in_progress');
        return; // ← THIS IS THE KEY: Don't clear storage on refresh!
      }

      // At this point it's likely a tab close / unload that is not a refresh
      if (this.isLoggedIn()) {
        try {
          const token = this.getToken();
          if (token) {
            // use sendBeacon to notify server
            navigator.sendBeacon(`${this.baseUrl}Login/Logout`, JSON.stringify({ token }));
          }
        } catch {}
      }

      // Remove active_tab_id only on actual close (not refresh)
      try { localStorage.removeItem('active_tab_id'); } catch {}
      // clear encrypted local storage items for safety ONLY on tab close
      this.clearStorage(); // ← This only runs on tab close, not refresh
    });
  }

  private setupSingleTabEnforcement(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Only treat active_tab_id *set* to a different id as session takeover.
    window.addEventListener('storage', (event) => {
      if (event.key === 'active_tab_id') {
        // only handle when a new active tab id is set and it's not ours
        if (event.newValue && event.newValue !== this.currentTabId && this.isLoggedIn()) {
          this.toastr?.warning('Your session opened in another tab. Logging out.', 'Session Ended');
          this.logout('another tab login');
        }
      }
    });

    // Double-check on load (but only if an *existing* active_tab_id exists and isn't us)
    const activeTabId = localStorage.getItem('active_tab_id');
    if (activeTabId && activeTabId !== this.currentTabId && this.isLoggedIn()) {
      // Another tab is active — force logout
      this.toastr?.warning('Your session opened in another tab. Logging out.', 'Session Ended');
      this.logout('another tab login');
    }

    // do not remove active_tab_id in a beforeunload listener (this caused refresh -> removal -> other tabs logout)
    // we handle removal only in pagehide above when it's not a refresh
  }

  private generateTabId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
