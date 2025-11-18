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
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (!isPlatformBrowser(platformId)) return throwError(() => error);

      const alreadyLoggingOut = auth.isLoggingOut;

      // Extract message safely
      let serverMsg = '';
      if (error?.error?.message) serverMsg = error.error.message;
      else if (typeof error.error === 'string') serverMsg = error.error;
      serverMsg = serverMsg.toUpperCase();

      // Network failure / server unreachable
      if (error.status === 0 && !alreadyLoggingOut) {
        toastr?.warning('Network error. Check your connection.', 'Connection Lost');
        return throwError(() => error);
      }

      // Unauthorized or Forbidden
      if ((error.status === 401 || error.status === 403) && !alreadyLoggingOut) {
        if (auth.isLoggedIn()) {

          if (serverMsg.includes('LOGGED_OUT_OTHER_DEVICE')) {
            toastr?.warning(
              'Your session ended because you logged in on another device.',
              'Session Ended'
            );
          } else if (serverMsg.includes('INVALID_TOKEN')) {
            toastr?.warning('Your session is invalid. Please login again.', 'Session Ended');
          } else {
            toastr?.warning(
              'Your session has expired. Please log in again.',
              'Session Ended'
            );
          }

          setTimeout(() => auth.logout('unauthorized'), 500);
        } else {
          router.navigate(['/']).catch(() => {});
        }
      }

      return throwError(() => error);
    })
  );
};
