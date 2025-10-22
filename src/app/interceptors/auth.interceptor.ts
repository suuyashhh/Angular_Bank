import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  const token = auth.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error.status === 401 || error.status === 403) {
        const lastRefresh = localStorage.getItem('session_refresh_timestamp');
        const now = Date.now();
        const isRefresh = lastRefresh && now - parseInt(lastRefresh) < 5000;

        if (isRefresh) return throwError(() => error);

        if (!auth.isLoggingOut && auth.isLoggedIn()) {
          toastr.warning('Your session has expired. Please log in again.', 'Session Ended');
          auth.logout('unauthorized');
        }
      }
      return throwError(() => error);
    })
  );
};
