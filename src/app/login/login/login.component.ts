import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, NgIf, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  @ViewChild('passwordIcon', { static: false }) passwordIcon!: ElementRef<HTMLElement>;

  loginObj = { INI: '', CODE: '' };
  isLoading = false;

  constructor(
    private router: Router,
    private auth: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['USERMASTER']);
    }
  }

  login(): void {
    if (!this.loginObj.INI || !this.loginObj.CODE) {
      this.toastr.warning('Please enter both username/email and password.', 'Required');
      return;
    }

    this.isLoading = true;
        debugger;
    this.auth.login(this.loginObj).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res?.token) {
          this.auth.setToken(res);
          this.toastr.success('Login successful!', 'Welcome');
          this.router.navigate(['USERMASTER']);
        } else {
          this.toastr.error('Login failed. Invalid response.', 'Error');
        }
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Invalid username or password.', 'Login failed');
      },
    });
  }

  togglePasswordVisibility(passwordInput: HTMLInputElement): void {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    if (!this.passwordIcon) return;
    const cl = this.passwordIcon.nativeElement.classList;
    cl.toggle('ri-eye-off-line', !isPassword);
    cl.toggle('ri-eye-line', isPassword);
  }
}
