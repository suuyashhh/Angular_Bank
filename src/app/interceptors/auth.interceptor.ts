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
    catchError((err) => {
      const url = req.url || '';

      // Diagnostic log for debugging
      console.warn('🧩 Interceptor caught error:', {
        url,
        status: err.status,
        message: err.message,
        error: err.error,
      });

      // Skip login/logout endpoints
      if (url.includes('Login/Login') || url.includes('Login/Logout')) {
        return throwError(() => err);
      }

      // Unauthorized / session expired
      if ((err.status === 401 || err.status === 403) && !auth.isLoggingOut) {
        console.warn('⚠️ 401/403 detected - logging out user.');
        auth.isLoggingOut = true;

        try {
          if (err.error?.toString().includes('Session expired')) {
            toast?.info(
              'You were logged out because you logged in from another device.',
              'Session Ended'
            );
          } else {
            toast?.warning(
              'Your session has expired. Please log in again.',
              'Logged Out'
            );
          }
        } catch (toastErr) {
          console.error('❌ Toast error:', toastErr);
        }

        // ✅ Safe logout without wiping unrelated localStorage
        auth.logout('interceptor 401/403'); // passes reason to diagnostic logs
        localStorage.clear(); // remove all stored items

        // Force redirect & prevent back navigation
        history.pushState(null, '', '/');
        router.navigate(['/'], { replaceUrl: true });

        // Disable Angular route reuse to prevent cached dashboard
        router.routeReuseStrategy.shouldReuseRoute = () => false;
        router.onSameUrlNavigation = 'reload';

        // Reset logout lock after short delay
        setTimeout(() => (auth.isLoggingOut = false), 3000);
      }

      // Network error
      else if (err.status === 0 && !auth.isLoggingOut) {
        console.warn('🌐 Network error - maybe backend offline or CORS issue.');
        auth.isLoggingOut = true;
        try {
          toast?.warning(
            'Network error. Please check your internet connection.',
            'Connection Lost'
          );
        } catch (toastErr) {
          console.error('❌ Toast error:', toastErr);
        }
        setTimeout(() => (auth.isLoggingOut = false), 3000);
      }

      return throwError(() => err);
    })
  );
};
