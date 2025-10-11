import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, NgIf, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  loginObj = { INI: '', CODE: '' };
  isLoading = false;

  // new property
  showPassword = false;

  showModel = false;
  userName = '';

  GetBranches = '';
  constructor(
    private router: Router,
    private auth: AuthService,
    private toastr: ToastrService,
    private api: ApiService
  ) { }

  // ngOnInit(): void {
  //   if (this.auth.isLoggedIn()) {
  //     this.router.navigate(['USERMASTER']);
  //   }
  // }

  login(): void {
    if (!this.loginObj.INI || !this.loginObj.CODE) {
      this.toastr.warning('Please enter both username/email and password.', 'Required');
      return;
    }

    this.isLoading = true;
    debugger;
    this.api.get('BranchMast/GetAllBranches').subscribe((res: any) => {
      this.GetBranches = res;
      console.log(this.GetBranches);
    });
    this.auth.login(this.loginObj).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        const name = res?.userDetails?.name ?? 'User';
        this.userName = name;
        this.showModel = true;
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Invalid username or password.', 'Login failed');
      },
    });
  }

  closeModal(): void {
    this.showModel = false;
  }


  // simplified toggle
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
