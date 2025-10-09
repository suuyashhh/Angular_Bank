import { Routes } from '@angular/router';
import { LoginComponent } from './login/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  {
    path: 'USERMASTER',
    canActivate:[authGuard],
    loadComponent: () =>
      import('./components/usermaster/landing/landing.component').then(m => m.LandingComponent),
    loadChildren: () =>
      import('./components/usermaster/usermaster.routes').then(m => m.UserMaster_Routes)
  },
  { path: '**', redirectTo: '' }
];
