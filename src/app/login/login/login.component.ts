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
  ) {
    // If session exists, auto-select branch and navigate
    this.auth.isRestoringSession$.subscribe(restoring => {
      if (!restoring && this.auth.isLoggedIn()) {
        const user = this.auth.getUser();
        const code = user?.selectedBranchCode;
        const name = user?.selectedBranchName;

        if (code && name) {
          this.selectedBranch = { code, name };
          this.branchSearch = name;
          this.router.navigate(['USERMASTER']);
        } else {
          // Session exists but branch not selected → show branch selection modal
          this.loadBranches(user);
        }
      }
    });
  }

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
        this.loadBranches(res.userDetails);
      },
      error: () => {
        this.loader.hide();
        this.toastr.error('Invalid username or password.', 'Login failed');
      }
    });
  }

  private loadBranches(user: any): void {
    const allowAll = String(user?.alloW_BR_SELECTION ?? 'N').toUpperCase() === 'Y';
    const workingCode = Number(user?.workinG_BRANCH ?? 0);

    this.api.get('BranchMast/GetAllBranches').subscribe({
      next: (branches: any) => {
        let list: any[] = Array.isArray(branches) ? branches : Object.values(branches || {});
        let mapped: Branch[] = list
          .filter(x => x && (x.name ?? x.Name))
          .map(x => ({ code: Number(x.code ?? x.Code), name: String(x.name ?? x.Name).trim() }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!allowAll) {
          mapped = mapped.filter(b => b.code === workingCode);
          if (mapped.length === 0 && workingCode) {
            mapped = [{ code: workingCode, name: `Branch ${workingCode}` }];
          }
          this.selectedBranch = mapped[0] ?? null;
          this.branchSearch = this.selectedBranch?.name ?? '';
        }

        this.branches = mapped;
        this.filteredBranches = [...this.branches];
        this.showModel = !this.selectedBranch;
        this.loader.hide();

        // If branch auto-selected → navigate immediately
        if (this.selectedBranch) {
          this.continue();
        }
      },
      error: () => {
        this.loader.hide();
        this.toastr.error('Unable to load branches.', 'Error');
      }
    });
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

  // Branch dropdown helpers
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

  closeModal(): void { this.showModel = false; }

  trackByCode(_: number, item: { code: number }) { return item.code; }

  togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }
  pwReadonly = true;
  blockInput(e: Event) { e.preventDefault(); }
}
