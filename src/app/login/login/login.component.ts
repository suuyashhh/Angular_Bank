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

  // Password show/hide
  showPassword = false;

  // Modal
  showModel = false;
  userName = '';

  // Branch dropdown state
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
      error: () => {
        this.toastr.error('Unable to load branches.', 'Error');
      }
    });

    this.auth.login(this.loginObj).subscribe({
      next: (res: any) => {
        this.isLoading = false;

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

  // Dropdown helpers
  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.filteredBranches = this.filterBy(this.branchSearch);
    }
  }
  //here search exicute
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
    this.branchSearch = b.name; // show name in the box
    this.dropdownOpen = false;  // close list
  }

  continue(): void {
    debugger;
    if (!this.selectedBranch) {
      this.toastr.warning('Please select a branch.', 'Required');
      return;
    }

    sessionStorage.setItem('branchCode', String(this.selectedBranch.code));

    // this.auth.setBranchCode(this.selectedBranch.code);

    this.showModel = false;

    if (this.selectedBranch.code) {
      this.toastr.success('Login successful...!', 'Login');
      this.router.navigate(['USERMASTER']);
    } else {
      this.toastr.error('Login failed. Invalid response.', 'Error');
    }
  }

  closeModal(): void {
    this.showModel = false;
  }

  // anywhere inside the LoginComponent class
  trackByCode(index: number, item: { code: number }): number {
    return item.code;
  }


  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
