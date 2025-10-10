import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);

  constructor(private router: Router, private http: HttpClient, private api: ApiService) { }


  setToken(res: any): void {
    localStorage.setItem('token', res?.token ?? '');

    const minimalUser = {
      ini: res.userDetails.ini ?? null,
      workinG_BRANCH: res.userDetails.workinG_BRANCH ?? null,
    };

    localStorage.setItem('userDetails', JSON.stringify(minimalUser));
    document.cookie = `authToken=${res?.token ?? ''}; path=/`;
  }


  getUser(): any {
    const userJson = localStorage.getItem('userDetails');
    return userJson ? JSON.parse(userJson) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isTokenValid(): boolean {
    const token = this.getToken();
    return !!token;
  }

  isLoggedIn(): boolean {
    return isPlatformBrowser(this.platformId) && this.isTokenValid();
  }

  login(credentials: any) {
    debugger;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.api.baseurl}Login/Login`, credentials, { headers });
  }

  logout(): void {
    const token = this.getToken();
    const headers = token
      ? new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.post(`${this.api.baseurl}Login/Logout`, {}, { headers }).subscribe({
      next: () => this.clearLocalSession(),
      error: () => this.clearLocalSession(),
    });
  }

  private clearLocalSession(): void {
    localStorage.clear();
    document.cookie = 'authToken=; path=/; max-age=0';
    this.router.navigate(['/']);
  }
}
