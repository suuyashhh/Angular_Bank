import { Component } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { LoaderService } from '../../services/loader.service';

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
  showPassword = false;

  showModel = false;
  userName = '';
  branches: Branch[] = [];
  filteredBranches: Branch[] = [];
  branchSearch = '';
  dropdownOpen = false;
  selectedBranch: Branch | null = null;

  loading$ = this.loader.loading$;

  constructor(
    private router: Router,
    private auth: AuthService,
    private toastr: ToastrService,
    private api: ApiService,
    private loader: LoaderService
  ) { }

login(): void {
  if (!this.loginObj.INI || !this.loginObj.CODE) {
    this.toastr.warning('Please enter both username/email and password.', 'Required');
    return;
  }

  this.loader.show();

  this.auth.login(this.loginObj).subscribe({
    next: (res: any) => {
      this.auth.setToken(res);
      this.userName = res?.userDetails?.name ?? 'User';

      // Read user details after successful login
      const user = this.auth.getUser() || {};
      const allowAll = String(user.alloW_BR_SELECTION ?? 'N').toUpperCase() === 'Y';
      const workingCode = Number(user.workinG_BRANCH ?? 0);

      this.api.get('BranchMast/GetAllBranches').subscribe({
        next: (branches: any) => {
          const list: any[] = Array.isArray(branches) ? branches : Object.values(branches || {});

          // Normalize the list
          let mapped: Branch[] = (list || [])
            .filter(x => x && (x.name ?? x.Name))
            .map(x => ({
              code: Number(x.code ?? x.Code),
              name: String(x.name ?? x.Name).trim(),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          // If user is not allowed to select any branch
          if (!allowAll) {
            mapped = mapped.filter(b => b.code === workingCode);

            // Fallback in case API doesn’t return that branch
            if (mapped.length === 0 && workingCode) {
              mapped = [{ code: workingCode, name: `Branch ${workingCode}` }];
            }

            // ✅ Auto-select the working branch
            this.selectedBranch = mapped[0] ?? null;
            this.branchSearch = this.selectedBranch?.name ?? '';
          }

          this.branches = mapped;
          this.filteredBranches = [...this.branches];
          this.showModel = true;
          this.loader.hide();
        },
        error: () => {
          this.loader.hide();
          this.toastr.error('Unable to load branches.', 'Error');
        }
      });
    },
    error: () => {
      this.loader.hide();
      this.toastr.error('Invalid username or password.', 'Login failed');
    }
  });
}



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
    this.auth.setSelectedBranch(this.selectedBranch.code, this.selectedBranch.name);
    this.showModel = false;
    this.toastr.success('Login successful!', 'Login');
    this.router.navigate(['USERMASTER']);
  }
  closeModal(): void { this.showModel = false; }
  trackByCode(_: number, item: { code: number }) { return item.code; }

  // password helpers (unchanged)
  togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }
  pwReadonly = true;
  blockInput(e: Event) { e.preventDefault(); }
}
