import { Routes } from '@angular/router';
import { LoginComponent } from './login/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [

  // ✅ PUBLIC LOGIN
  { 
    path: '', 
    component: LoginComponent, 
    title: 'Login | Pro Bank' 
  },

  // ✅ LAZY LOADED USERMASTER SHELL
  {
    path: 'USERMASTER',
    canActivate: [authGuard],

    loadComponent: () =>
      import('./components/usermaster/landing/landing.component')
        .then(m => m.LandingComponent),

    loadChildren: () =>
      import('./components/usermaster/usermaster.routes')
        .then(m => m.UserMaster_Routes),

    title: 'User Master | Pro Bank',
  },

  // ✅ FALLBACK
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
