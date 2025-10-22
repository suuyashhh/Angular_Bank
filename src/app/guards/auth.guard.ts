import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // ✅ Wait for restore to finish
  await auth.ensureInitialized();

  // 🔐 Only now check login
  if (!auth.isLoggedIn()) {
    router.navigate(['/'], { replaceUrl: true });
    return false;
  }

  return true;
};
