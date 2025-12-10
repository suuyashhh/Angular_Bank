import { Component } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { LoaderService } from '../../services/loader.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

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
  userImage: SafeUrl | string = '../../assets/img/avatars/1.png'; // Default image

  branches: Branch[] = [];
  filteredBranches: Branch[] = [];
  branchSearch = '';
  dropdownOpen = false;
  selectedBranch: Branch | null = null;

  loading$ = this.loader.loading$;

  constructor(
    private router: Router,
    public auth: AuthService,
    private toastr: ToastrService,
    private api: ApiService,
    private loader: LoaderService,
    private sanitizer: DomSanitizer // Add DomSanitizer for safe URL
  ) { }

  // ------------------------------------------------------------------
  // ⭐ SECURED BANKING LOGIN
  // ------------------------------------------------------------------
  login(): void {
    if (!this.loginObj.INI || !this.loginObj.CODE) {
      this.toastr.warning('Please enter both username and password.', 'Required');
      return;
    }

    this.loader.show();

    this.auth.login(this.loginObj).subscribe({
      next: (res: any) => {
        const decryptedRes = this.api.decryptResponse(res);
        if (!decryptedRes || !decryptedRes.token) {
          this.toastr.error('Invalid encrypted server response');
          return;
        }

        this.auth.setToken(decryptedRes);

        const user = this.auth.getUser() || {};
        this.userName = user.NAME ?? "User";

        const allowAll = String(user.ALLOW_BR_SELECTION ?? "N").toUpperCase() === "Y";
        const workingCode = Number(user.WORKING_BRANCH ?? 0);
        const userId = String(user.INI ?? '');

        // Inside the login method, update the image fetching part:
        this.api.get(`UserMenuAccess/GetUserImage/${userId}`).subscribe({
          next: (UserImg: any) => {
            const decryptedImg = this.api.decryptResponse(UserImg);

            let imageData = '';
            if (decryptedImg && decryptedImg.user_img) {
              imageData = decryptedImg.user_img;
              // Store the image in AuthService (ADD THIS LINE)
              this.auth.setUserImage(imageData);
            }

            this.fetchBranches(allowAll, workingCode);
          },
          error: (imgError) => {
            console.error('Error fetching user image:', imgError);
            this.fetchBranches(allowAll, workingCode);
          }
        });
      },

      error: () => {
        this.loader.hide();
        this.toastr.error('Invalid username or password.', 'Login Failed');
      }
    });
  }

  // Helper method to fetch branches (separated for cleaner code)
  private fetchBranches(allowAll: boolean, workingCode: number): void {
    // ⭐ Fetch Branch List
    this.api.get('BranchMast/GetAllBranches').subscribe({
      next: (branchesResp: any) => {
        // ⭐ DECRYPT RESPONSE FIRST
        const decrypted = this.api["decryptResponse"](branchesResp);
        console.log("DECRYPTED:", decrypted);

        const list: any[] = Array.isArray(decrypted)
          ? decrypted
          : Object.values(decrypted || {});

        let mapped: Branch[] = (list || [])
          .filter(x => x && (x.Name || x.name || x.NAME))
          .map(x => ({
            code: Number(x.Code ?? x.code ?? x.CODE),
            name: String(x.Name ?? x.name ?? x.NAME).trim()
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        console.log("MAPPED:", mapped);

        if (!allowAll && workingCode > 0) {
          mapped = mapped.filter(b => b.code === workingCode);

          if (mapped.length === 0) {
            mapped = [{ code: workingCode, name: `Branch ${workingCode}` }];
          }

          this.selectedBranch = mapped[0] ?? null;
          this.branchSearch = this.selectedBranch?.name ?? "";
        }

        this.branches = mapped;
        this.filteredBranches = [...mapped];

        this.showModel = true;
        this.loader.hide();
      },

      error: () => {
        this.loader.hide();
        this.toastr.error('Unable to load branches.', 'Error');
      }
    });
  }

  // ------------------------------------------------------------------
  // UI Helpers
  // ------------------------------------------------------------------
  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) this.filteredBranches = this.filterBy(this.branchSearch);
  }

  onSearchChange(): void {
    this.filteredBranches = this.filterBy(this.branchSearch);
  }

  private filterBy(term: string): Branch[] {
    const t = (term || "").toLowerCase();
    if (!t) return [...this.branches];
    return this.branches.filter(b => b.name.toLowerCase().includes(t));
  }

  pickBranch(b: Branch): void {
    this.selectedBranch = b;
    this.branchSearch = b.name;
    this.dropdownOpen = false;
  }

  // ------------------------------------------------------------------
  // ⭐ Final Step: Save branch & go inside system
  // ------------------------------------------------------------------
  continue(): void {
    if (!this.selectedBranch) {
      this.toastr.warning('Please select a branch.', 'Required');
      return;
    }

    sessionStorage.setItem("branchCode", String(this.selectedBranch.code));

    this.auth.setSelectedBranch(
      this.selectedBranch.code,
      this.selectedBranch.name
    );

    this.showModel = false;
    this.toastr.success("Login successful!", "Login");
    this.router.navigate(["USERMASTER"]);
  }

  closeModal(): void {
    this.showModel = false;
  }

  trackByCode(_: number, item: { code: number }) {
    return item.code;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  pwReadonly = true;
  blockInput(e: Event) {
    e.preventDefault();
  }
}