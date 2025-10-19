import { Component } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

type Branch = { code: number; name: string };

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, NgClass, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  loginObj = { INI: '', CODE: '' };
  isLoading = false;
  showPassword = false;

  showModel = false;
  userName = '';

  branches: Branch[] = [];
  filteredBranches: Branch[] = [];
  branchSearch = '';
  dropdownOpen = false;
  selectedBranch: Branch | null = null;

  constructor(
    private router: Router,
    private auth: AuthService,
    private toastr: ToastrService,
    private api: ApiService
  ) {}

  login(): void {
    if (!this.loginObj.INI || !this.loginObj.CODE) {
      this.toastr.warning('Please enter both username/email and password.', 'Required');
      return;
    }

    this.isLoading = true;

    // Load branches first
    this.api.get('BranchMast/GetAllBranches').subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : Object.values(res || {});
        this.branches = (list || [])
          .filter(x => x && (x.name ?? x.Name))
          .map(x => ({
            code: Number(x.code ?? x.Code),
            name: String(x.name ?? x.Name).trim(),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        this.filteredBranches = [...this.branches];
      },
      error: () => this.toastr.error('Unable to load branches.', 'Error')
    });

    // Perform login
    this.auth.login(this.loginObj).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        // AES + in-memory storage
        this.auth.setToken(res);

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

  // Branch selection
  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) this.filteredBranches = this.filterBy(this.branchSearch);
  }

  onSearchChange(): void {
    this.filteredBranches = this.filterBy(this.branchSearch);
  }

  private filterBy(term: string): Branch[] {
    const t = (term || '').toLowerCase();
    if (!t) return [...this.branches];
    return this.branches.filter(b => b.name.toLowerCase().includes(t));
  }

  pickBranch(b: Branch): void {
    this.selectedBranch = b;
    this.branchSearch = b.name;
    this.dropdownOpen = false;
  }

  continue(): void {
    if (!this.selectedBranch) {
      this.toastr.warning('Please select a branch.', 'Required');
      return;
    }

    sessionStorage.setItem('branchCode', String(this.selectedBranch.code));

    this.showModel = false;

    this.toastr.success('Login successful!', 'Login');
    this.router.navigate(['USERMASTER']);
  }

  closeModal(): void {
    this.showModel = false;
  }

  trackByCode(index: number, item: { code: number }): number {
    return item.code;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
