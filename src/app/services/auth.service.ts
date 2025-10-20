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
        this.setupTabCloseDetection();
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
    const encrypted = this.storage.getItem('token');
    if (!encrypted) return null;

    const dec = this.decryptData(encrypted);
    if (!dec || typeof dec !== 'string') return null;

    this.inMemoryToken = dec;
    return dec;
  }

  private restoreUserFromStorage(): any {
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
  }

  // ===== Restore Token/User on App Init =====
  private async restoreFromStorage(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.inMemoryToken = this.restoreTokenFromStorage();
        this.inMemoryUser = this.restoreUserFromStorage();
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

    try {
      document.cookie = `authToken=${btoa(token)}; path=/; Secure; SameSite=Strict`;
    } catch {}

    this.resetInactivityTimer();
  }

  getUser(): any {
    return this.inMemoryUser ?? this.restoreUserFromStorage();
  }

  getToken(): string | null {
    return this.restoreTokenFromStorage();
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

    console.warn(`🚪 Logout triggered (${trigger})`, new Error().stack);

    alert('You have been logged out due to inactivity or tab closure.');
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
      this.clearStorage(); // removes token/userDetails
      localStorage.clear(); // remove JWT if stored separately
      document.cookie = 'authToken=; path=/; max-age=0';
    } catch {}

    this.clearInactivityTimer();
    this.isLoggingOut = false;

    // Navigate to login page and prevent back
    history.pushState(null, '', '/');
    this.router.navigate(['/'], { replaceUrl: true });

    // Disable Angular route reuse
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
  }

  // ===== Inactivity Tracking =====
  private setupInactivityTracking(): void {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev =>
      window.addEventListener(ev, () => {
        console.log('🔄 Inactivity timer reset by', ev);
        this.resetInactivityTimer();
      })
    );
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    this.clearInactivityTimer();
    this.ngZone.runOutsideAngular(() => {
      this.inactivityTimer = setTimeout(() => {
        this.ngZone.run(() => this.logout('inactivity timeout'));
      }, this.INACTIVITY_LIMIT);
    });
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = null;
  }

  // ===== Safe Tab-Close Detection =====
  private setupTabCloseDetection(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const HEARTBEAT_KEY = 'tab_heartbeat';
    const HEARTBEAT_INTERVAL = 2000; // 2 sec
    let heartbeatTimer: any;

    const startHeartbeat = () => {
      heartbeatTimer = setInterval(() => {
        localStorage.setItem(HEARTBEAT_KEY, Date.now().toString());
      }, HEARTBEAT_INTERVAL);
    };

    const stopHeartbeat = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    };

    startHeartbeat();

    window.addEventListener('beforeunload', () => {
      stopHeartbeat();

      const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const isReload = nav?.type === 'reload';
      if (isReload) {
        console.log('🔁 Page reload detected — skipping logout.');
        return;
      }

      const lastHeartbeat = parseInt(localStorage.getItem(HEARTBEAT_KEY) || '0', 10);
      const now = Date.now();

      if (now - lastHeartbeat <= HEARTBEAT_INTERVAL + 500) {
        console.log('🟢 Another tab active — skipping logout.');
        return;
      }

      if (this.isLoggedIn()) {
        console.warn('💀 Tab closed, triggering logout.');
        try {
          navigator.sendBeacon(`${this.baseUrl}Login/Logout`);
        } catch {}
        this.clearLocalSession();
      }
    });
  }
}
