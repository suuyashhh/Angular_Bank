import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';

export const UserMaster_Routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],     // 🔒 Apply guard ONCE here
    children: [
      // Default redirect → dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        title: 'Dashboard | SmartBank',
      },

      // Party Master
      {
        path: 'partymast',
        loadComponent: () =>
          import('./partymast/partymast.component').then(
            (m) => m.PartymastComponent
          ),
        title: 'Party Master | SmartBank',
      },

      // Checkr
      {
        path: 'checkr',
        loadComponent: () =>
          import('../modal/modal/modal.component').then(
            (m) => m.ModalComponent
          ),
        title: 'Checkr | SmartBank',
      },

      // Country Master
      {
        path: 'countrymst',
        loadComponent: () =>
          import('../Masters/countrymst/countrymst.component').then(
            (m) => m.CountrymstComponent
          ),
        title: 'Country Master | SmartBank',
      },

      // User Master
      {
        path: 'usermst',
        loadComponent: () =>
          import('../Masters/usermst/usermst.component').then(
            (m) => m.UsermstComponent
          ),
        title: 'User Master | SmartBank',
      },

      // District Master
      {
        path: 'districtmst',
        loadComponent: () =>
          import('../Masters/districtmst/districtmst.component').then(
            (m) => m.DistrictmstComponent
          ),
        title: 'District Master | SmartBank',
      },

      // State Master
      {
        path: 'statemst',
        loadComponent: () =>
          import('../Masters/statemst/statemst.component').then(
            (m) => m.StatemstComponent
          ),
        title: 'State Master | SmartBank',
      },

      // Taluka Master
      {
        path: 'talukamst',
        loadComponent: () =>
          import('../Masters/talukamst/talukamst.component').then(
            (m) => m.TalukamstComponent
          ),
        title: 'Taluka Master | SmartBank',
      },

      // User Menu Access
      {
        path: 'UserMenuAccess',
        loadComponent: () =>
          import('../Tools/usermenuaccess/usermenuaccess.component').then(
            (m) => m.UsermenuaccessComponent
          ),
        title: 'User Menu Access | SmartBank',
      },

      // Check Menu Id
      {
        path: 'CheckMenuId',
        loadComponent: () =>
          import('../Tools/checkmenuid/checkmenuid.component').then(
            (m) => m.CheckmenuidComponent
          ),
        title: 'Check Menu ID | SmartBank',
      },

      {
        path: 'Commanmst-f2',
        loadComponent: () =>
          import('../Masters/commanmst-f2/commanmst-f2.component').then((m) => m.CommanmstF2Component),
        title: 'Comman Master | SmartBank',
      },
    ],
  },
];
