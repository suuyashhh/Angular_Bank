import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import {
  provideHttpClient,
  withInterceptors,
  withFetch
} from '@angular/common/http';

import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { provideClientHydration } from '@angular/platform-browser';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // ✅ Router setup
    provideRouter(routes),

    // ✅ Enables hydration if you ever use SSR (safe even for CSR)
    provideClientHydration(),

    // ✅ HttpClient + interceptor setup
    provideHttpClient(
      // You can comment out `withFetch()` if not using SSR (Node runtime)
      withFetch(),
      withInterceptors([authInterceptor])
    ),

    // ✅ Enable animations + Toastr
    provideAnimations(),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      progressBar: true,
      closeButton: true,
      preventDuplicates: true,
    }),
  ],
};
