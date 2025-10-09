import { Routes } from '@angular/router';
import { LoginComponent } from './login/login/login.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  {
    path: 'USERMASTER',
    loadComponent: () =>
      import('./components/usermaster/landing/landing.component').then(m => m.LandingComponent),
    loadChildren: () =>
      import('./components/usermaster/usermaster.routes').then(m => m.UserMaster_Routes)
  },
  { path: '**', redirectTo: '' }
];
