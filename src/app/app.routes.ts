import { Routes } from '@angular/router';
import { LoginComponent } from './login/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // 🔹 Public route
  { 
    path: '', 
    component: LoginComponent, 
    title: 'Login | SmartBank' 
  },

  // 🔹 Protected lazy module for USERMASTER
  {
    path: 'USERMASTER',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/usermaster/landing/landing.component').then(
        (m) => m.LandingComponent
      ),
    loadChildren: () =>
      import('./components/usermaster/usermaster.routes').then(
        (m) => m.UserMaster_Routes
      ),
    title: 'User Master | SmartBank',
  },

  // 🔹 Wildcard route
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
