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
  const toast = inject(ToastrService, { optional: true });

  const token = auth.getToken();
  const clonedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(clonedReq).pipe(
    catchError(err => {
      const url = req.url || '';

      // Skip login/logout endpoints
      if (url.includes('Login/Login') || url.includes('Login/Logout')) {
        return throwError(() => err);
      }

      // Handle unauthorized / session expired
      if ((err.status === 401 || err.status === 403) && !auth.isLoggingOut) {
        auth.isLoggingOut = true;

        try {
          if (err.error && typeof err.error === 'string' && err.error.includes('Session expired')) {
            toast?.info('You were logged out because you logged in from another device.', 'Session Ended');
          } else {
            toast?.info('Session expired or unauthorized. Please log in again.', 'Logged Out');
          }
        } catch {}

        auth.logout();

        if (window.location.pathname !== '/') {
          router.navigate(['/'], { replaceUrl: true });
        }

        setTimeout(() => (auth.isLoggingOut = false), 3000);

      } else if (err.status === 0 && !auth.isLoggingOut) {
        // Network errors
        auth.isLoggingOut = true;
        try {
          toast?.warning('Network error. Please check your connection.', 'Connection Lost');
        } catch {}
        setTimeout(() => (auth.isLoggingOut = false), 3000);
      }

      return throwError(() => err);
    })
  );
};
