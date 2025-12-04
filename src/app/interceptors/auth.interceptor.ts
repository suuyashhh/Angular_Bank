import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { isPlatformBrowser } from '@angular/common';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService, { optional: true });
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return next(req);

  const token = auth.getToken();
  const deviceId = auth.getDeviceId();
  const appKey = environment.APP_KEY;

  const unixTime = Math.floor(Date.now() / 1000);

  const url = new URL(req.url, window.location.origin);
  const method = req.method.toUpperCase();
  const path = url.pathname.toLowerCase();

  let bodyString = '';
  if (req.body) {
    try { bodyString = JSON.stringify(req.body); }
    catch { bodyString = ''; }
  }

  const hmacPayload = `${method}\n${path}\n${unixTime}\n${bodyString}`;
  const hmacSecret = environment.HMAC_KEY;

  const signature = CryptoJS.HmacSHA256(hmacPayload, hmacSecret)
    .toString(CryptoJS.enc.Hex)
    .toUpperCase();

  let secureReq = req.clone({
    setHeaders: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-APP-KEY': appKey,
      'X-REQ-TIME': unixTime.toString(),
      'X-REQ-SIGN': signature,
      'X-DEVICE-ID': deviceId,
      'Cache-Control': 'no-store',
      Pragma: 'no-cache'
    }
  });

  return next(secureReq).pipe(
    catchError((error) => {

      if (error.status === 0) {
        toastr?.warning('Network error. Check your connection.', 'Connection Lost');
        return throwError(() => error);
      }

      const alreadyLoggingOut = auth.isLoggingOut;

      let serverMsg = '';
      if (error?.error?.message) serverMsg = error.error.message;
      else if (typeof error.error === 'string') serverMsg = error.error;
      serverMsg = serverMsg.toUpperCase();

      if ((error.status === 401 || error.status === 403) && !alreadyLoggingOut) {

        if (auth.isLoggedIn()) {

          if (serverMsg.includes('LOGGED_OUT_OTHER_DEVICE')) {
            toastr?.warning('Your session ended because you logged in on another device.', 'Session Ended');
          }
          else if (serverMsg.includes('INVALID_TOKEN')) {
            toastr?.warning('Your session is invalid. Please login again.', 'Session Ended');
          }
          else if (serverMsg.includes('INVALID_SIGNATURE') || serverMsg.includes('MISSING_SIGNATURE')) {
            toastr?.error('Security validation failed.', 'Blocked');
          }
          else {
            toastr?.warning('Your session has expired. Please log in again.', 'Session Ended');
          }

          setTimeout(() => auth.logout('unauthorized'), 300);
        } 
        else {
          router.navigate(['/'], { replaceUrl: true });
        }
      }

      return throwError(() => error);
    })
  );
};
