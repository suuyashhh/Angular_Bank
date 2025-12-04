import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import * as CryptoJS from 'crypto-js';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.BASE_URL.replace(/\/+$/, '') + '/';

  constructor(private http: HttpClient, private auth: AuthService) {}

  // AES KEY + FIXED IV (MUST MATCH BACKEND)
  private key = CryptoJS.enc.Utf8.parse(environment.ENCRYPT_KEY);
  private iv = CryptoJS.enc.Utf8.parse("0000000000000000");

  // Encrypt outgoing request body
  private encryptObject(obj: any): string {
    return CryptoJS.AES.encrypt(
      JSON.stringify(obj),
      this.key,
      { iv: this.iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    ).toString();
  }

  // Decrypt backend response if encrypted
  public decryptResponse(res: any): any {
    try {
      if (!res || !res.data) return res;

      const bytes = CryptoJS.AES.decrypt(
        res.data,
        this.key,
        { iv: this.iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
      );

      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted);
    } catch (e) {
      console.error("❌ Failed to decrypt API response:", e);
      return res;
    }
  }

  private normalizeEndpoint(endpoint: string): string {
    return endpoint.replace(/^https?:\/\//i, '').replace(/^\/+/, '');
  }

  private getHeaders(extra: Record<string, string> = {}): HttpHeaders {
    const token = this.auth.getToken();

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
      'X-APP-KEY': environment.APP_KEY,
      'X-DEVICE-ID': this.auth.getDeviceId(),
      ...extra
    });

    if (token) headers = headers.set('Authorization', `Bearer ${token}`);

    return headers;
  }

  // GET (decrypt response)
  get<T = any>(endpoint: string, params: any = {}) {
    const ep = this.normalizeEndpoint(endpoint);

    let httpParams = new HttpParams();
    Object.keys(params).forEach(k => {
      if (params[k] != null) httpParams = httpParams.set(k, params[k]);
    });

    return this.http.get<any>(`${this.baseUrl}${ep}`, {
      headers: this.getHeaders(),
      params: httpParams
    })
    .pipe(map(res => this.decryptResponse(res)));
  }

  // POST (encrypt request, decrypt response)
  post<T = any>(endpoint: string, body: any, extraHeaders: Record<string, string> = {}) {
    const ep = this.normalizeEndpoint(endpoint);

    const encryptedBody = {
      data: this.encryptObject(body)
    };

    return this.http.post<any>(`${this.baseUrl}${ep}`, encryptedBody, {
      headers: this.getHeaders(extraHeaders)
    })
    .pipe(map(res => this.decryptResponse(res)));
  }

  // PUT (encrypt + decrypt)
  put<T = any>(endpoint: string, body: any, extraHeaders: Record<string, string> = {}) {
    const ep = this.normalizeEndpoint(endpoint);

    const encryptedBody = {
      data: this.encryptObject(body)
    };

    return this.http.put<any>(`${this.baseUrl}${ep}`, encryptedBody, {
      headers: this.getHeaders(extraHeaders)
    })
    .pipe(map(res => this.decryptResponse(res)));
  }

  // DELETE (decrypt response only)
  delete<T = any>(endpoint: string, params: any = {}, extraHeaders: Record<string, string> = {}) {
    const ep = this.normalizeEndpoint(endpoint);

    let httpParams = new HttpParams();
    Object.keys(params).forEach(k => {
      if (params[k] != null) httpParams = httpParams.set(k, params[k]);
    });

    return this.http.delete<any>(`${this.baseUrl}${ep}`, {
      headers: this.getHeaders(extraHeaders),
      params: httpParams
    })
    .pipe(map(res => this.decryptResponse(res)));
  }
}
