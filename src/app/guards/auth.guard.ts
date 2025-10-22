import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true; // allow SSR

  // Wait until AuthService finished restoring session
  await auth.ensureInitialized();

  // If it still indicates restoring (race), wait until it becomes false once then continue
  if (auth.isRestoringSession$.value) {
    await firstValueFrom(auth.isRestoringSession$.pipe(
      // emit when false; rxjs import required
      // but firstValueFrom will resolve on the first emission we return; we map to the boolean and filter
    ));
    // fallback: small microtick delay to be safe (optional)
    await new Promise(r => setTimeout(r, 0));
  }

  if (!auth.isLoggedIn()) {
    router.navigate(['/'], { replaceUrl: true });
    return false;
  }
  return true;
};
