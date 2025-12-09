import { Injectable, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, filter, take } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private router = inject(Router);
  private http = inject(HttpClient);
  private toastr = inject(ToastrService, { optional: true });

  private STORAGE_KEY = "authData";
  private LAST_ROUTE_KEY = "last_route";

  private inMemoryToken: string | null = null;
  private inMemoryUser: any = null;

  private secretKey = environment.ENCRYPT_KEY;
  private persist = environment.PERSIST_SESSION;
  private baseUrl = environment.BASE_URL.replace(/\/+$/, "") + "/";

  private inactivityTimer: any = null;
  private readonly INACTIVITY_LIMIT = 20 * 60 * 1000;

  private currentTabId = "";
  public isLoggingOut = false;

  public isRestoringSession$ = new BehaviorSubject<boolean>(true);
  private restorePromise: Promise<void>;

  private authorizeInterval: any = null;

  private DEVICE_ID_KEY = "device_id";

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.currentTabId = this.generateTabId();
      this.safeSetStorage("active_tab_id", this.currentTabId);

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

  // DEVICE ID
  private getOrCreateDeviceId(): string {
    let id = this.safeGetStorage(this.DEVICE_ID_KEY);

    if (!id) {
      id = crypto.randomUUID();
      this.safeSetStorage(this.DEVICE_ID_KEY, id);
    }

    return id;
  }

  getDeviceId(): string {
    return this.getOrCreateDeviceId();
  }

  // Safe Storage
  private safeSetStorage(key: string, value: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.setItem(key, value); } catch { }
  }

  private safeGetStorage(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private safeRemoveStorage(key: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try { localStorage.removeItem(key); } catch { }
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

  // --------------------------------------------------------------------
  // ⭐ LOGIN — AES ENCRYPT + APP-KEY (HMAC added by interceptor)
  // --------------------------------------------------------------------
login(credentials: any) {
  const key = CryptoJS.enc.Utf8.parse(this.secretKey);
  const iv = CryptoJS.enc.Utf8.parse("0000000000000000");

  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(credentials),
    key,
    { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  ).toString();

  const body = { data: encryptedPayload };

  const ts = Date.now().toString();
  const device = this.getDeviceId();
  const raw = encryptedPayload + "|" + ts + "|" + device;
  const signature = CryptoJS.HmacSHA256(raw, environment.HMAC_KEY).toString();

  return this.http.post(`${this.baseUrl}Login/Login`, body, {
    headers: new HttpHeaders({
      "Content-Type": "application/json",
      "X-APP-KEY": environment.APP_KEY,
      "X-DEVICE-ID": device,
      "X-TIMESTAMP": ts,
      "X-SIGNATURE": signature
    })
  });
}



  // --------------------------------------------------------------------

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

      if (this.isLoggedIn()) {
        this.startAuthorizeHeartbeat();
      }
    }



  }

  async ensureInitialized(): Promise<void> {
    await this.restorePromise;
  }

  // Store session
setToken(res: any): void {
  try {
    if (!res || !res.token) {
      console.error("❌ setToken(): Missing token:", res);
      return;
    }

    // store in memory
    this.inMemoryToken = res.token;
    this.inMemoryUser = res.userDetails;

    // store encrypted in localStorage
    const sessionObj = {
      token: res.token,
      userDetails: res.userDetails
    };

    const encrypted = this.encrypt(sessionObj);
    this.safeSetStorage(this.STORAGE_KEY, encrypted);

    console.log("✅ Token saved successfully");

    this.startAuthorizeHeartbeat();
    this.resetInactivityTimer();
  } catch (err) {
    console.error("❌ setToken() failed:", err);
  }
}


  getToken(): string | null {
  if (this.inMemoryToken) return this.inMemoryToken;

  const stored = this.safeGetStorage(this.STORAGE_KEY);
  if (!stored) return null;

  let decrypted: any = null;
  try {
    decrypted = this.decrypt(stored);
  } catch (e) {
    console.error("❌ Failed to decrypt stored session:", e);
    return null;
  }

  if (!decrypted || !decrypted.token) return null;

  this.inMemoryToken = decrypted.token;
  this.inMemoryUser = decrypted.userDetails;

  return decrypted.token;
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
  try {
    const token = this.getToken();
    if (!token) return false;
    if (token.length < 20) return false;

    return true;
  } catch {
    return false;
  }
}



  logout(trigger: string = "manual"): void {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    this.safeRemoveStorage(this.STORAGE_KEY);
    sessionStorage.clear();
    this.inMemoryToken = null;
    this.inMemoryUser = null;
    this.clearInactivityTimer();

    this.ngZone.run(() => {
      this.router.navigate(['/'], { replaceUrl: true }).then(() => {
        this.isLoggingOut = false;
      });
    });
  }

  // Heartbeat token validation
  startAuthorizeHeartbeat() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.authorizeInterval) return;

    this.authorizeInterval = setInterval(() => {
      if (!this.isLoggedIn()) return;

      const token = this.getToken();
      if (!token) return;

      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        "X-APP-KEY": environment.APP_KEY,
        "X-DEVICE-ID": this.getDeviceId()
      });

      this.http.get(`${this.baseUrl}Login/CheckAuthorize`, { headers })
        .subscribe({
          next: () => { },
          error: () => this.logout("unauthorized")
        });

    }, 30000);
  }

  // Branch selection
setSelectedBranch(code: number, name: string): void {
  // recover token if missing
  if (!this.inMemoryToken) {
    this.inMemoryToken = this.getToken();
  }

  const existingUser = this.getUser() ?? {};

  const updatedUser = {
    ...existingUser,
    selectedBranchCode: code,
    selectedBranchName: name
  };

  this.inMemoryUser = updatedUser;

  const session = {
    token: this.inMemoryToken,
    userDetails: updatedUser
  };

  const encrypted = this.encrypt(session);
  this.safeSetStorage(this.STORAGE_KEY, encrypted);

  console.log("✔ Branch stored without breaking session:", session);
}


  // Inactivity
  private setupInactivityTracking(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const events = ["mousemove", "mousedown", "keydown", "scroll", "click", "touchstart"];
    const handler = () => this.resetInactivityTimer();

    events.forEach(ev => window.addEventListener(ev, handler, { passive: true }));

    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    this.clearInactivityTimer();

    this.ngZone.runOutsideAngular(() => {
      this.inactivityTimer = setTimeout(() => {
        this.ngZone.run(() => this.logout("idle"));
      }, this.INACTIVITY_LIMIT);
    });
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
  }

  // Sync across tabs
  private setupSessionSync(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener("storage", event => {
      if (event.key === this.STORAGE_KEY && !event.newValue) {
        this.logout("another-tab");
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.resetInactivityTimer();
    });
  }

  // Single tab enforcement
  private setupSingleTabEnforcement(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const existing = this.safeGetStorage("active_tab_id");

    if (existing && existing !== this.currentTabId && this.isLoggedIn()) {
      this.toastr?.warning("Your session is active in another tab");
      this.logout("other-tab");
    }

    window.addEventListener("storage", event => {
      if (event.key === "active_tab_id") {
        const newId = event.newValue;
        if (newId && newId !== this.currentTabId && this.isLoggedIn()) {
          this.logout("other-tab");
        }
      }
    });
  }

  private generateTabId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  setLastRoute(url: string) {
    this.safeSetStorage(this.LAST_ROUTE_KEY, url);
  }

  getLastRoute(): string | null {
    return this.safeGetStorage(this.LAST_ROUTE_KEY);
  }
}
