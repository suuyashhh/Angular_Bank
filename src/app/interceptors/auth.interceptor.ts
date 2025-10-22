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

  // 🧠 Skip all token logic on the server (SSR-safe)
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const token = auth.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      // Skip client-only actions if SSR
      if (!isPlatformBrowser(platformId)) {
        return throwError(() => error);
      }

      // 🧩 Handle unauthorized or forbidden
      if ((error.status === 401 || error.status === 403) && !auth.isLoggingOut) {
        if (auth.isLoggedIn()) {
          toastr?.warning('Your session has expired. Please log in again.', 'Session Ended', {
            timeOut: 3000,
            positionClass: 'toast-top-center',
          });

          // Add a short delay before logout to ensure toast shows
          setTimeout(() => {
            auth.logout('unauthorized');
          }, 500);
        }
      }
      // 🌐 Handle network errors (server unreachable)
      else if (error.status === 0 && !auth.isLoggingOut) {
        toastr?.warning('Network error. Please check your internet connection.', 'Connection Lost', {
          timeOut: 3000,
          positionClass: 'toast-top-center',
        });
      }

      return throwError(() => error);
    })
  );
};
