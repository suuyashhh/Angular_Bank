import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.BASE_URL;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getHeaders(additionalHeaders: Record<string, string> = {}): HttpHeaders {
    const token = this.auth.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      ...additionalHeaders
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  get<T = any>(endpoint: string, params: any = {}) {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        httpParams = httpParams.set(key, params[key]);
      }
    });

    return this.http.get<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
      params: httpParams,
      observe: 'body'
    });
  }

  post<T = any>(endpoint: string, body: any, additionalHeaders: Record<string, string> = {}) {
    const user = this.auth.getUser();
    body.CRT_BY = user?.NAME ?? user?.ini ?? ''; // secure audit field

    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders(additionalHeaders),
      observe: 'body'
    });
  }

  put<T = any>(endpoint: string, body: any, additionalHeaders: Record<string, string> = {}) {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders(additionalHeaders),
      observe: 'body'
    });
  }

  delete<T = any>(endpoint: string, params: any = {}, additionalHeaders: Record<string, string> = {}) {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        httpParams = httpParams.set(key, params[key]);
      }
    });

    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(additionalHeaders),
      params: httpParams,
      observe: 'body'
    });
  }
}
