import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiService {
  baseurl = 'https://localhost:7265/api/';
  // baseurl = 'https://backend.suyashpatil.in/api/';
  // baseurl = 'https://labmvcapi.bsite.net/api/';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  get(api: string, params: any = {}) {
    return this.http.get(this.baseurl + api, { headers: this.getHeaders(), params });
  }

  post(api: string, data: any) {
    const userDetails = JSON.parse(localStorage.getItem('userDetails') || '{}');
    data.CRT_BY = userDetails?.NAME ?? userDetails?.name ?? '';
    return this.http.post(this.baseurl + api, data, { headers: this.getHeaders() });
  }

  put(api: string, data: any) {
    return this.http.put(this.baseurl + api, data, { headers: this.getHeaders() });
  }

  delete(api: string, params: any = {}) {
    return this.http.delete(this.baseurl + api, { headers: this.getHeaders(), params });
  }
}
