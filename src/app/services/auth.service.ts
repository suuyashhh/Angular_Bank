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
      console.log('🏗️ AuthService initializing in browser environment');
      console.log('🌐 Base URL:', this.baseUrl);
      console.log('💾 Persist Session:', this.persist);

      this.currentTabId = this.generateTabId();
      // Set our active tab id on load
      this.safeSetStorage('active_tab_id', this.currentTabId);

      // start restore and then set up listeners
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
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('⚠️ localStorage set failed:', e);
    }
  }

  private safeGetStorage(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('⚠️ localStorage get failed:', e);
      return null;
    }
  }

  private safeRemoveStorage(key: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('⚠️ localStorage remove failed:', e);
    }
  }

  // ===== Encryption / Decryption =====
  private encryptData(data: any): string | null {
    try {
      return CryptoJS.AES.encrypt(JSON.stringify(data), this.secretKey).toString();
    } catch (e) {
      console.warn('⚠️ Encryption failed:', e);
      return null;
    }
  }

  private decryptData(cipherText: string | null): any {
    try {
      if (!cipherText) return null;
      const bytes = CryptoJS.AES.decrypt(cipherText, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted ? JSON.parse(decrypted) : null;
    } catch (e) {
      console.warn('⚠️ Decryption failed:', e);
      return null;
    }
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
    // Use localStorage for better persistence in hosted environments
    return localStorage;
  }

  private writeStorage(key: string, value: any): void {
    const encrypted = this.encryptData(value);
    if (isPlatformBrowser(this.platformId) && encrypted) {
      try {
        this.storage.setItem(key, encrypted);
      } catch (e) {
        console.warn('⚠️ Storage write failed:', e);
      }
    }
  }

  private restoreTokenFromStorage(): string | null {
    if (this.inMemoryToken) return this.inMemoryToken;
    try {
      // Try encrypted storage first
      const encrypted = this.storage.getItem('token');
      const dec = this.decryptData(encrypted);
      if (dec && typeof dec === 'string') {
        this.inMemoryToken = dec;
        return dec;
      }

      // Fallback to plain token (legacy support)
      const plainToken = this.safeGetStorage('authToken');
      if (plainToken) {
        this.inMemoryToken = plainToken;
        return plainToken;
      }
    } catch (e) {
      console.warn('⚠️ Token restoration failed:', e);
    }
    return null;
  }

  private restoreUserFromStorage(): any {
    if (this.inMemoryUser) return this.inMemoryUser;
    try {
      const encrypted = this.storage.getItem('userDetails');
      const dec = this.decryptData(encrypted);
      if (dec && typeof dec === 'object') {
        this.inMemoryUser = dec;
        return dec;
      }
    } catch (e) {
      console.warn('⚠️ User restoration failed:', e);
    }
    return null;
  }

  private clearStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      this.storage.removeItem('token');
      this.storage.removeItem('userDetails');
      this.safeRemoveStorage('authToken');
      // Keep active_tab_id for multi-tab detection
    } catch (e) {
      console.warn('⚠️ Storage clear failed:', e);
    }
  }

  // ===== Restore session =====
  private async restoreFromStorage(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.isRestoringSession$.next(false);
      return;
    }

    console.log('🔄 Starting session restoration...');

    // Add delay to ensure storage is ready in hosted environments
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const token = this.restoreTokenFromStorage();
      const user = this.restoreUserFromStorage();

      this.inMemoryToken = token;
      this.inMemoryUser = user;

      console.log('✅ Session restoration completed');
      console.log('🔑 Token exists:', !!token);
      console.log('👤 User exists:', !!user);
      console.log('🔐 Storage type:', this.persist ? 'persistent' : 'session');

    } catch (error) {
      console.error('❌ Session restoration failed:', error);
    } finally {
      this.isRestoringSession$.next(false);
    }
  }

  async ensureInitialized(): Promise<void> {
    await this.restorePromise;
  }

  // ===== Session Handling =====
  setToken(res: any): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = res?.token ?? '';
    const user = res?.userDetails ?? null;

    console.log('💾 Setting token and user data');

    this.inMemoryToken = token || null;
    this.inMemoryUser = user;

    // Write to encrypted storage
    this.writeStorage('token', token);
    this.writeStorage('userDetails', user);

    // Write plain token as fallback
    this.safeSetStorage('authToken', token);

    // Set secure cookie
    const isHttps = window.location.protocol === 'https:';
    try {
      document.cookie = `authToken=${btoa(token)}; path=/; max-age=${60 * 60 * 24 * 7};${isHttps ? ' Secure;' : ''} SameSite=Strict`;
    } catch (e) {
      console.warn('⚠️ Cookie set failed:', e);
    }

    this.resetInactivityTimer();
  }

  /** Persist the user’s selected branch into userDetails (and memory) */
setSelectedBranch(code: number, name: string): void {
  if (!isPlatformBrowser(this.platformId)) return;

  // Start from the currently stored userDetails (or a blank object)
  const current = this.getUser() ?? {};

  // Merge (don’t drop any other existing fields)
  const updated = {
    ...current,
    selectedBranchCode: code,
    selectedBranchName: name,
  };

  // Save in memory
  this.inMemoryUser = updated;

  // Save encrypted in storage (same key you already use for userDetails)
  this.writeStorage('userDetails', updated);
}


  getToken(): string | null {
    if (!this.inMemoryToken) {
      this.inMemoryToken = this.restoreTokenFromStorage();
    }
    return this.inMemoryToken;
  }

  getUser(): any {
    return this.inMemoryUser ?? this.restoreUserFromStorage();
  }

  isLoggedIn(): boolean {
    const loggedIn = !!this.getToken();
    console.log('🔐 Login check:', loggedIn);
    return loggedIn;
  }

  // ===== Login / Logout =====
  login(credentials: any) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    console.log('🚀 Attempting login to:', `${this.baseUrl}Login/Login`);
    return this.http.post(`${this.baseUrl}Login/Login`, credentials, { headers });
  }

  logout(trigger: string = 'manual'): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    console.log('🚪 Logging out, trigger:', trigger);

    if (trigger === 'inactivity timeout') {
      this.toastr?.warning('You have been logged out due to inactivity.', 'Session Ended');
    }

    const token = this.getToken();
    const headers = token ?
      new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }) :
      new HttpHeaders({ 'Content-Type': 'application/json' });

    // Always clear local session, attempt server logout if possible
    this.http.post(`${this.baseUrl}Login/Logout`, {}, { headers }).subscribe({
      next: () => this.clearLocalSession(),
      error: () => this.clearLocalSession(),
    });
  }

  private clearLocalSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    console.log('🧹 Clearing local session');

    this.inMemoryToken = null;
    this.inMemoryUser = null;

    this.clearStorage();

    // Clear cookie
    document.cookie = 'authToken=; path=/; max-age=0';
    this.clearInactivityTimer();
    this.isLoggingOut = false;

    this.ngZone.run(() => {
      this.router.navigate(['/'], { replaceUrl: true });
    });
  }

  // ===== Inactivity Tracking =====
  private setupInactivityTracking(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const events = ['mousemove','mousedown','keydown','touchstart','scroll','click'];
    const handler = () => this.resetInactivityTimer();

    events.forEach(ev => {
      window.addEventListener(ev, handler, { passive: true });
    });

    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.clearInactivityTimer();
    this.ngZone.runOutsideAngular(() => {
      this.inactivityTimer = setTimeout(() => {
        this.ngZone.run(() => {
          if (this.isLoggedIn()) {
            console.log('⏰ Inactivity timeout reached');
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

  // ===== Multi-tab & refresh safe =====
  private setupSessionSync(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener('storage', (event) => {
      console.log('🔄 Storage event:', event.key, event.newValue);

      if (event.key === 'authToken' && !event.newValue) {
        console.log('🗑️ Token cleared in another tab');
        if (this.isLoggedIn()) this.clearLocalSession();
      }

      if (event.key === 'force_logout') {
        console.log('🔒 Force logout from another tab');
        if (this.isLoggedIn()) this.clearLocalSession();
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
          console.log('🚫 Another tab took over the session');
          this.toastr?.warning('Your session opened in another tab. Logging out.', 'Session Ended');
          this.logout('another tab login');
        }
      }
    });

    // Check on load if another tab is already active
    const activeTabId = this.safeGetStorage('active_tab_id');
    if (activeTabId && activeTabId !== this.currentTabId && this.isLoggedIn()) {
      console.log('🚫 This tab is not the active session tab');
      this.toastr?.warning('Your session opened in another tab. Logging out.', 'Session Ended');
      this.logout('another tab login');
    }
  }

  private generateTabId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
