import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';

export const UserMaster_Routes: Routes = [
  // Default redirect to dashboard
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },

  // Dashboard (protected)
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Dashboard | SmartBank',
  },

  // Party Master (protected)
  {
    path: 'partymast',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./partymast/partymast.component').then((m) => m.PartymastComponent),
    title: 'Party Master | SmartBank',
  },

  // Country Master 
  {
    path: 'countrymst',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./countrymst/countrymst.component').then((m) => m.CountrymstComponent),
    title: 'Country Master | SmartBank',
  },
];
