import { Routes } from "@angular/router";
import { authGuard } from "../../guards/auth.guard";

export const UserMaster_Routes: Routes = [
  {
    path: '',
    redirectTo:'dashboard',
    pathMatch:"full"   
  },
  {
    path: 'dashboard',
    canActivate:[authGuard],
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path:'partymast',
    canActivate:[authGuard],
    loadComponent: ()=> import('./partymast/partymast.component').then(m=>m.PartymastComponent)
  }
];
