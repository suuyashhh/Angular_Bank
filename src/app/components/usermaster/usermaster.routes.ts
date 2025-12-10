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
        title: 'Dashboard | Pro Bank',
      },

      // Party Master
      {
        path: 'partymast',
        loadComponent: () =>
          import('./partymast/partymast.component').then(
            (m) => m.PartymastComponent
          ),
        title: 'Party Master | Pro Bank',
      },

      // Checkr
      {
        path: 'checkr',
        loadComponent: () =>
          import('../modal/modal/modal.component').then(
            (m) => m.ModalComponent
          ),
        title: 'Checkr | Pro Bank',
      },

      // Country Master
      {
        path: 'countrymst',
        loadComponent: () =>
          import('../Masters/countrymst/countrymst.component').then(
            (m) => m.CountrymstComponent
          ),
        title: 'Country Master | Pro Bank',
      },

      // User Master
      {
        path: 'usermst',
        loadComponent: () =>
          import('../Masters/usermst/usermst.component').then(
            (m) => m.UsermstComponent
          ),
        title: 'User Master | Pro Bank',
      },

      // District Master
      {
        path: 'districtmst',
        loadComponent: () =>
          import('../Masters/districtmst/districtmst.component').then(
            (m) => m.DistrictmstComponent
          ),
        title: 'District Master | Pro Bank',
      },

      // State Master
      {
        path: 'statemst',
        loadComponent: () =>
          import('../Masters/statemst/statemst.component').then(
            (m) => m.StatemstComponent
          ),
        title: 'State Master | Pro Bank',
      },

      // Taluka Master
      {
        path: 'talukamst',
        loadComponent: () =>
          import('../Masters/talukamst/talukamst.component').then(
            (m) => m.TalukamstComponent
          ),
        title: 'Taluka Master | Pro Bank',
      },

      // User Menu Access
      {
        path: 'UserMenuAccess',
        loadComponent: () =>
          import('../Tools/usermenuaccess/usermenuaccess.component').then(
            (m) => m.UsermenuaccessComponent
          ),
        title: 'User Menu Access | Pro Bank',
      },

      // Check Menu Id
      {
        path: 'CheckMenuId',
        loadComponent: () =>
          import('../Tools/checkmenuid/checkmenuid.component').then(
            (m) => m.CheckmenuidComponent
          ),
        title: 'Check Menu ID | Pro Bank',
      },

      {
        path: 'Commanmst',
        loadComponent: () =>
          import('../Masters/commanmst-f2/commanmst-f2.component').then((m) => m.CommanmstF2Component),
        title: 'Comman Master | Pro Bank',
      },
      { path: 'castmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Cast Master | Pro Bank' },          //1
      { path: 'grademast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Grade Master | Pro Bank' },      //2
      { path: 'golditems', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Gold Items | Pro Bank' },       //3
      { path: 'occumast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Occupation Master | Pro Bank' }, //4
      { path: 'resnsmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Reason Master | Pro Bank' },     //5
      { path: 'staffmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Staff Master | Pro Bank' },      //6
      { path: 'talkmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Talk Master | Pro Bank' },       //7
      { path: 'pertmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Pert Master | Pro Bank' },       //8
      { path: 'villmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Village Master | Pro Bank' },     //9
      { path: 'vehicle', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Vehicle Master | Pro Bank' },      //10
      { path: 'zonemast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Zone Master | Pro Bank' },        //11
      { path: 'subkgroup', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'SubK Group | Pro Bank' },       //12
      { path: 'familymast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Family Master | Pro Bank' },   //13
      { path: 'purpmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Purpose Master | Pro Bank' },    //14
      { path: 'kycidmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'KYC ID Master | Pro Bank' },     //15
      { path: 'kycaddrmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'KYC Address Master | Pro Bank' }, //16
      { path: 'catgmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Category Master | Pro Bank' },    //17
      { path: 'diermast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Dier Master | Pro Bank' },       //18
      { path: 'heltmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Health Master | Pro Bank' },     //19
      { path: 'secumast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Security Master | Pro Bank' },   //20
      { path: 'lockergroup', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Locker Group | Pro Bank' },    //21
      { path: 'ddcity', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'DD City Master | Pro Bank' },      //22
      { path: 'clgtrntype', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Clg Trn Type | Pro Bank' },    //23
      { path: 'grpmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Group Master | Pro Bank' },       //24
      { path: 'compmast', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Company Master | Pro Bank' },    //25
      { path: 'valuator', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Valuator Master | Pro Bank' },   //26
      { path: 'bankmaster', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Bank Master | Pro Bank' },     //27
      { path: 'itemgroupmaster', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Item Group Master | Pro Bank' }, //28
      { path: 'itemmaster', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Item Master | Pro Bank' },      //30

      // Additional items at bottom
      { path: 'divisionmaster', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Division Master | Pro Bank' }, //36
      { path: 'localdirector', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Local Director | Pro Bank' }, //50
      { path: 'areamaster', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Area Master | Pro Bank' },       //51
      { path: 'lawadcourt', loadComponent: () => import('../Masters/commanmst-f2/commanmst-f2.component').then(m => m.CommanmstF2Component), title: 'Lawad Court Master | Pro Bank' }, //52
      {
        path: 'CheckMenuId',
        loadComponent: () =>
          import('../Tools/checkmenuid/checkmenuid.component').then((m) => m.CheckmenuidComponent),
        title: 'Check MenuId | Pro Bank',
      },
      {
        path: 'DepositAccount',
        loadComponent: () =>
          import('../Accounts/depositaccount-opening/depositaccount-opening.component').then((m) => m.DepositaccountOpeningComponent),
        title: 'Check MenuId | Pro Bank',
      },
      {
        path: 'PendingVoucherPassing',
        loadComponent: () =>
          import('../DailyWork/pending-voucher-passing/pending-voucher-passing.component').then((m) => m.PendingVoucherPassingComponent),
        title: 'Pending Voucher Passing | Pro Bank',
      },
      { path: 'agentmst', loadComponent: () => import('../Masters/agentmst/agentmst.component').then(m => m.AgentmstComponent), title: 'Agent Master | SmartBank' }
    ],
  },

];
