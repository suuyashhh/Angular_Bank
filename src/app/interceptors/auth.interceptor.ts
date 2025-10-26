import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { isPlatformBrowser } from '@angular/common';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService, { optional: true });
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return next(req);

  const token = auth.getToken();
  let authReq = req;
  if (token) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (!isPlatformBrowser(platformId)) return throwError(() => error);

      if ((error.status === 401 || error.status === 403) && !auth.isLoggingOut) {
        if (auth.isLoggedIn()) {
          toastr?.warning('Your session has expired. Please log in again.', 'Session Ended');
          setTimeout(() => auth.logout('unauthorized'), 500);
        }
      } else if (error.status === 0 && !auth.isLoggingOut) {
        toastr?.warning('Network error. Check your connection.', 'Connection Lost');
      }

      return throwError(() => error);
    })
  );
};
