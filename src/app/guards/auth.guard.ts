import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { firstValueFrom, filter } from 'rxjs';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  console.log('🛡️ Auth guard checking...');

  await auth.ensureInitialized();

  if (auth.isRestoringSession$.value) {
    console.log('⏳ Auth guard waiting for session restoration...');
    await firstValueFrom(auth.isRestoringSession$.pipe(
      filter(restoring => !restoring)
    ));
  }

  const isLoggedIn = auth.isLoggedIn();
  console.log('🛡️ Auth guard result:', isLoggedIn);

  if (!isLoggedIn) {
    console.log('🚫 Auth guard: Redirecting to home');
    router.navigate(['/'], { replaceUrl: true });
    return false;
  }

  console.log('✅ Auth guard: Access granted');
  return true;
};
