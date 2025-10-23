import { Routes } from '@angular/router';
import { LoginComponent } from './login/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // 🔹 Public route
  { path: '', component: LoginComponent, title: 'Login | SmartBank' },

  // 🔹 Protected route (User Master Section)
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

  // 🔹 Wildcard route (404 or redirect)
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
