import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true; // allow SSR

  // Wait for restore to complete
  await auth.ensureInitialized();

  // Wait for BehaviorSubject flag too
  if (auth.isRestoringSession$.value) {
    await new Promise((resolve) =>
      auth.isRestoringSession$.subscribe((restoring) => !restoring && resolve(true))
    );
  }

  if (!auth.isLoggedIn()) {
    router.navigate(['/'], { replaceUrl: true });
    return false;
  }

  return true;
};
