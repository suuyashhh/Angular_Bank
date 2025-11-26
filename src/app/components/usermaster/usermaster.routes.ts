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


  // Checkr (protected)
  {
    path: 'checkr',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../modal/modal/modal.component').then((m) => m.ModalComponent),
    title: 'Checkr | SmartBank',
  },

  // Country Master 
  {
    path: 'countrymst',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../Masters/countrymst/countrymst.component').then((m) => m.CountrymstComponent),
    title: 'Country Master | SmartBank',
  },
  {
    path: 'usermst',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../Masters/usermst/usermst.component').then((m) => m.UsermstComponent),
    title: 'User Master | SmartBank',
  },
  {
    path: 'districtmst',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../Masters/districtmst/districtmst.component').then((m) => m.DistrictmstComponent),
    title: 'District Master | SmartBank',
  }, {
    path: 'statemst',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../Masters/statemst/statemst.component').then((m) => m.StatemstComponent),
    title: 'State Master | SmartBank',
  },
  {
    path: 'talukamst',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../Masters/talukamst/talukamst.component').then((m) => m.TalukamstComponent),
    title: 'Taluka Master | SmartBank',
  },
  {
    path: 'UserMenuAccess',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../Tools/usermenuaccess/usermenuaccess.component').then((m) => m.UsermenuaccessComponent),
    title: 'User Menu Access | SmartBank',
  },
  {
    path: 'CheckMenuId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../Tools/checkmenuid/checkmenuid.component').then((m) => m.CheckmenuidComponent),
    title: 'Check MenuId | SmartBank',
  }
];
