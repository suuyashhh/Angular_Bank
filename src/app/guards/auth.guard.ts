import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

function isReload(): boolean {
  const nav = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  return !!nav[0] && nav[0].type === 'reload';
}

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastrService, { optional: true });

  const url = state.url || '';

  // Detect manual navigation (first load, not internal)
  const isInitialNav = !router.getCurrentNavigation()?.previousNavigation;

  // Deep links under /USERMASTER/... (not just /USERMASTER)
  const isUserMasterDeep = url.startsWith('/USERMASTER/') && url !== '/USERMASTER';

  // Block direct address-bar access
  if (isInitialNav && !isReload() && isUserMasterDeep) {
    auth.logout(); // clear localStorage/session
    try {
      toast?.info('Direct URL access is blocked. Please use the app menus.', 'Logged out');
    } catch {}
    
    // navigate() can use replaceUrl, createUrlTree cannot
    router.navigate(['/'], { replaceUrl: true });
    return false;
  }

  // Regular login check
  if (auth.isLoggedIn()) {
    return true;
  } else {
    router.navigate(['/'], { replaceUrl: true });
     toast?.info('This ID opens other side', 'Logged out');
    return false;
  }
};
