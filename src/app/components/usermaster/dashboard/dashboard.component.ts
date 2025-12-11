import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';

interface MenuItem {
  menuId: number;
  menuName: string;
  pageName?: string | null;
  mainMenuId: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: any;
  currentdate!: string;
  userImage = '../../assets/img/avatars/1.png';
  
  // Modal control properties
  showImageModal = false;
  modalImageUrl = '';
  modalImageAlt = '';

  // Menu data
  private flatMenus: MenuItem[] = [];
  private selectedMenuSet: Set<number> = new Set();
  
  // Search state
  filtered: Array<{ pathName: string; link: string }> = [];
  private allItems: Array<{ pathName: string; link: string }> = [];
  isSearching = false;

  constructor(
    private auth: AuthService, 
    private api: ApiService
  ) { }

  ngOnInit() {
    this.user = this.auth.getUser();
    this.userImage = this.auth.getUserImage();

    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    this.currentdate = today.toLocaleDateString('en-GB', options).replace(',', '');

    this.loadMenuMasterAndAccess();
  }

  private loadMenuMasterAndAccess(programId: number = 1): void {
    this.api.get('UserMenuAccess/MenuMaster', { programeId: programId }).subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res) list = [res];

        this.flatMenus = (list || []).map(x => this.normalizeMenu(x));
        this.loadSelectedMenusForCurrentUser(programId);
      },
      error: (err) => {
        console.error('Failed to load MenuMaster', err);
        this.flatMenus = [];
        this.allItems = [];
        this.filtered = [];
      }
    });
  }

  private loadSelectedMenusForCurrentUser(programId: number = 1): void {
    const fullUser = this.auth.getUser();
    const userLevel = fullUser?.USER_LAVEL;

    if (!userLevel) {
      this.selectedMenuSet = new Set();
      this.buildMenuItems();
      return;
    }

    const url = `UserMenuAccess/SelectedMenus?userGrad=${encodeURIComponent(userLevel)}&programeId=${encodeURIComponent(programId)}`;
    this.api.get(url).subscribe({
      next: (res: any) => {
        let ids: number[] = [];
        if (Array.isArray(res)) ids = res.map((x: any) => Number(x));
        else if (res?.data && Array.isArray(res.data)) ids = res.data.map((x: any) => Number(x));
        else if (res !== null && res !== undefined) ids = [Number(res)];

        this.selectedMenuSet = new Set((ids || []).map(x => Number(x)));
        this.buildMenuItems();
      },
      error: (err) => {
        console.error('Error fetching selected menus:', err);
        this.selectedMenuSet = new Set();
        this.buildMenuItems();
      }
    });
  }

  private normalizeMenu(raw: any): MenuItem {
    return {
      menuId: Number(raw.menuId ?? raw.Menu_ID ?? raw.MenuId ?? 0),
      menuName: String(raw.menuName ?? raw.Menu_Name ?? raw.MenuName ?? ''),
      pageName: String(raw.pageName ?? raw.Page_Name ?? raw.PageName ?? '') || null,
      mainMenuId: Number(raw.mainMenuId ?? raw.Main_Menu_ID ?? raw.MainMenuId ?? 0)
    };
  }

  private buildMenuItems(): void {
    this.allItems = [];
    
    // Filter accessible menus and create clickable items
    for (const menu of this.flatMenus) {
      if (this.selectedMenuSet.has(menu.menuId) && menu.pageName?.trim()) {
        const routerLink = this.normalizePageNameToRouterLink(menu.pageName);
        if (routerLink) {
          this.allItems.push({
            pathName: menu.menuName,
            link: routerLink
          });
        }
      }
    }
    
    // Sort by menu name
    this.allItems.sort((a, b) => a.pathName.localeCompare(b.pathName));
    
    this.filtered = [];
    this.isSearching = false;
  }

  private normalizePageNameToRouterLink(pageName?: string | null): string | undefined {
    if (!pageName) return undefined;
    const trimmed = String(pageName).trim();
    if (!trimmed) return undefined;
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  onSearch(query: string) {
    const searchTerm = query.trim().toLowerCase();
    this.isSearching = searchTerm.length > 0;
    
    if (!searchTerm) {
      this.filtered = [];
      return;
    }
    
    this.filtered = this.allItems.filter(item => 
      item.pathName.toLowerCase().includes(searchTerm)
    );
  }

  openImagePreview() {
    this.modalImageUrl = this.userImage;
    this.modalImageAlt = `${this.user?.NAME || 'User'}'s profile picture`;
    this.showImageModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeImagePreview() {
    this.showImageModal = false;
    document.body.style.overflow = 'auto';
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeImagePreview();
    }
  }
}