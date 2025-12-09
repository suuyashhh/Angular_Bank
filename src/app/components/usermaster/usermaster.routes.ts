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
        path: 'Commanmst',
        loadComponent: () =>
          import('../Masters/commanmst-f2/commanmst-f2.component').then((m) => m.CommanmstF2Component),
        title: 'Comman Master | SmartBank',
      },
      { path: 'castmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Cast Master | SmartBank' },          //1
      { path: 'grademast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Grade Master | SmartBank' },      //2
      { path: 'golditems', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Gold Items | SmartBank' },       //3
      { path: 'occumast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Occupation Master | SmartBank' }, //4
      { path: 'resnsmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Reason Master | SmartBank' },     //5
      { path: 'staffmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Staff Master | SmartBank' },      //6
      { path: 'talkmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Talk Master | SmartBank' },       //7
      { path: 'pertmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Pert Master | SmartBank' },       //8
      { path: 'villmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Village Master | SmartBank' },     //9
      { path: 'vehicle', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Vehicle Master | SmartBank' },      //10
      { path: 'zonemast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Zone Master | SmartBank' },        //11
      { path: 'subkgroup', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'SubK Group | SmartBank' },       //12
      { path: 'familymast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Family Master | SmartBank' },   //13
      { path: 'purpmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Purpose Master | SmartBank' },    //14
      { path: 'kycidmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'KYC ID Master | SmartBank' },     //15
      { path: 'kycaddrmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'KYC Address Master | SmartBank' }, //16
      { path: 'catgmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Category Master | SmartBank' },    //17
      { path: 'diermast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Dier Master | SmartBank' },       //18
      { path: 'heltmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Health Master | SmartBank' },     //19
      { path: 'secumast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Security Master | SmartBank' },   //20
      { path: 'lockergroup', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Locker Group | SmartBank' },    //21
      { path: 'ddcity', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'DD City Master | SmartBank' },      //22
      { path: 'clgtrntype', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Clg Trn Type | SmartBank' },    //23
      { path: 'grpmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Group Master | SmartBank' },       //24
      { path: 'compmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Company Master | SmartBank' },    //25
      { path: 'valuator', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Valuator Master | SmartBank' },   //26
      { path: 'bankmaster', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Bank Master | SmartBank' },     //27
      { path: 'itemgroupmaster', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Item Group Master | SmartBank' }, //28
      { path: 'itemmaster', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Item Master | SmartBank' },      //30

      // Additional items at bottom
      { path: 'divisionmaster', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Division Master | SmartBank' }, //36
      { path: 'localdirector', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Local Director | SmartBank' }, //50
      { path: 'areamaster', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Area Master | SmartBank' },       //51
      { path: 'lawadcourt', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Lawad Court Master | SmartBank' } //52
    ],
  },
  {
    path: 'CheckMenuId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../Tools/checkmenuid/checkmenuid.component').then((m) => m.CheckmenuidComponent),
    title: 'Check MenuId | SmartBank',
  },
  {
    path: 'DepositAccount',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../Accounts/depositaccount-opening/depositaccount-opening.component').then((m) => m.DepositaccountOpeningComponent),
    title: 'Check MenuId | SmartBank',
  }
];
