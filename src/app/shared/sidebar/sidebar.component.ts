import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  OnDestroy,
  OnInit,
  ElementRef,
  ViewChild,
  inject,
  NgZone,
  Renderer2
} from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

interface DTOMenuMasterItem {
  menuId: number;
  menuName: string;
  programeId: number;
  mainMenuId: number;
  seqNo1: number;
  seqNo2: number;
  seqNo3: number;
  seqNo4: number;
  seqNo5: number;
  pageName?: string | null; 
}

interface MenuNode {
  id: number;
  name: string;
  pageName?: string | null;
  routerLink?: string | any[];
  children: MenuNode[];
  parent?: MenuNode | null;
  visible: boolean; 
  expanded: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, AfterViewChecked, OnDestroy {
  user: any = null;

  private flatMenus: DTOMenuMasterItem[] = [];
  private selectedMenuSet: Set<number> = new Set(); 

  menuTree: MenuNode[] = [];

  private initialized = false;
  private resizeListener!: () => void;

  private ngZone: NgZone = inject(NgZone);
  private renderer: Renderer2 = inject(Renderer2);

  @ViewChild('layoutMenu', { static: false }) layoutMenuRef!: ElementRef;

  private routerSub?: Subscription;

  constructor(private auth: AuthService, private api: ApiService, private router: Router) { }

  ngOnInit(): void {
    const fullUser = this.auth.getUser();
    this.user = fullUser ? { ini: fullUser.INI, workinG_BRANCH: fullUser.WORKING_BRANCH } : null;

    this.loadMenuMasterAndAccess();
  }

  ngAfterViewChecked(): void {
    if (!this.initialized && window.innerWidth >= 1200 && this.layoutMenuRef?.nativeElement) {
      this.ngZone.runOutsideAngular(() => this.initializeMenu());
      this.initialized = true;
    }
  }

  ngOnDestroy(): void {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
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
        this.menuTree = [];
      }
    });
  }

  private loadSelectedMenusForCurrentUser(programId: number = 1): void {
    const fullUser = this.auth.getUser();
    const userLevel = fullUser?.USER_LAVEL;

    if (!userLevel) {
      this.selectedMenuSet = new Set();
      this.menuTree = this.buildTreeFromMenus(this.flatMenus); 
      this.computeVisibility();

      if (!this.routerSub) this.setupActiveWatcher();
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
        this.menuTree = this.buildTreeFromMenus(this.flatMenus);
        this.computeVisibility();

        if (!this.routerSub) this.setupActiveWatcher();
      },
      error: (err) => {
        console.error('Error fetching selected menus:', err);
        this.selectedMenuSet = new Set();
        this.menuTree = this.buildTreeFromMenus(this.flatMenus);
        this.computeVisibility();

        if (!this.routerSub) this.setupActiveWatcher();
      }
    });
  }

  private normalizeMenu(raw: any): DTOMenuMasterItem {
    return {
      menuId: Number(raw.menuId ?? raw.Menu_ID ?? raw.MenuId ?? 0),
      menuName: String(raw.menuName ?? raw.Menu_Name ?? raw.MenuName ?? ''),
      programeId: Number(raw.programeId ?? raw.Programe_ID ?? raw.ProgrameId ?? 0),
      mainMenuId: Number(raw.mainMenuId ?? raw.Main_Menu_ID ?? raw.MainMenuId ?? 0),
      seqNo1: Number(raw.seqNo1 ?? raw.Seq_No1 ?? raw.SeqNo1 ?? 0),
      seqNo2: Number(raw.seqNo2 ?? raw.Seq_No2 ?? raw.SeqNo2 ?? 0),
      seqNo3: Number(raw.seqNo3 ?? raw.Seq_No3 ?? raw.SeqNo3 ?? 0),
      seqNo4: Number(raw.seqNo4 ?? raw.Seq_No4 ?? raw.SeqNo4 ?? 0),
      seqNo5: Number(raw.seqNo5 ?? raw.Seq_No5 ?? raw.SeqNo5 ?? 0),
      pageName: String(raw.pageName ?? raw.Page_Name ?? raw.PageName ?? '') || null
    };
  }


  private buildTreeFromMenus(menus: DTOMenuMasterItem[]): MenuNode[] {
    const result: MenuNode[] = [];

    const roots = menus
      .filter(m => m.seqNo1 === 0)
      .sort((a, b) => a.mainMenuId - b.mainMenuId);

    for (const rootItem of roots) {
      const rootNode: MenuNode = {
        id: rootItem.menuId,
        name: rootItem.menuName,
        pageName: rootItem.pageName ?? null,
        routerLink: this.normalizePageNameToRouterLink(rootItem.pageName),
        children: [],
        parent: null,
        visible: false,
        expanded: false
      };

      // Level1
      const level1 = menus
        .filter(m =>
          m.programeId === rootItem.programeId &&
          m.mainMenuId === rootItem.mainMenuId &&
          m.seqNo1 > 0 && m.seqNo2 === 0)
        .sort((a, b) => a.seqNo1 - b.seqNo1);

      for (const l1 of level1) {
        const node1 = this.createNodeFromItem(l1, rootNode);

        // Level2
        const level2 = menus
          .filter(m =>
            m.programeId === rootItem.programeId &&
            m.mainMenuId === rootItem.mainMenuId &&
            m.seqNo1 === l1.seqNo1 &&
            m.seqNo2 > 0 && m.seqNo3 === 0)
          .sort((a, b) => a.seqNo2 - b.seqNo2);

        for (const l2 of level2) {
          const node2 = this.createNodeFromItem(l2, node1);

          // Level3
          const level3 = menus
            .filter(m =>
              m.programeId === rootItem.programeId &&
              m.mainMenuId === rootItem.mainMenuId &&
              m.seqNo1 === l1.seqNo1 &&
              m.seqNo2 === l2.seqNo2 &&
              m.seqNo3 > 0 && m.seqNo4 === 0)
            .sort((a, b) => a.seqNo3 - b.seqNo3);

          for (const l3 of level3) {
            const node3 = this.createNodeFromItem(l3, node2);

            // Level4
            const level4 = menus
              .filter(m =>
                m.programeId === rootItem.programeId &&
                m.mainMenuId === rootItem.mainMenuId &&
                m.seqNo1 === l1.seqNo1 &&
                m.seqNo2 === l2.seqNo2 &&
                m.seqNo3 === l3.seqNo3 &&
                m.seqNo4 > 0 && m.seqNo5 === 0)
              .sort((a, b) => a.seqNo4 - b.seqNo4);

            for (const l4 of level4) {
              const node4 = this.createNodeFromItem(l4, node3);

              // Level5
              const level5 = menus
                .filter(m =>
                  m.programeId === rootItem.programeId &&
                  m.mainMenuId === rootItem.mainMenuId &&
                  m.seqNo1 === l1.seqNo1 &&
                  m.seqNo2 === l2.seqNo2 &&
                  m.seqNo3 === l3.seqNo3 &&
                  m.seqNo4 === l4.seqNo4 &&
                  m.seqNo5 > 0)
                .sort((a, b) => a.seqNo5 - b.seqNo5);

              for (const l5 of level5) {
                this.createNodeFromItem(l5, node4);
              }
            }
          }
        }
      }

      result.push(rootNode);
    }

    return result;
  }

  private createNodeFromItem(item: DTOMenuMasterItem, parent?: MenuNode): MenuNode {
    const node: MenuNode = {
      id: item.menuId,
      name: item.menuName,
      pageName: item.pageName ?? null,
      routerLink: this.normalizePageNameToRouterLink(item.pageName),
      children: [],
      parent: parent ?? null,
      visible: false,
      expanded: false
    };
    parent?.children.push(node);
    return node;
  }

  private computeVisibility(): void {
    const computeNode = (n: MenuNode): boolean => {
      const selfAllowed = this.selectedMenuSet.has(n.id);
      let childAllowed = false;
      n.children.forEach(c => {
        const cAllowed = computeNode(c);
        childAllowed = childAllowed || cAllowed;
      });
      n.visible = selfAllowed || childAllowed;
      n.expanded = childAllowed;
      return n.visible;
    };

    this.menuTree.forEach(root => computeNode(root));
  }

  private normalizePageNameToRouterLink(pageName?: string | null): string | undefined {
    if (!pageName) return undefined;
    const trimmed = String(pageName).trim();
    if (!trimmed) return undefined;
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // ---------- UI/menu helpers ----------
  toggleExpand(node: MenuNode): void {
    node.expanded = !node.expanded;
  }

  private initializeMenu(): void {
    try {
      const win: any = window;
      if (win?.Menu && typeof win.Menu === 'function') {
        new win.Menu(this.layoutMenuRef.nativeElement, {
          orientation: 'vertical',
          closeChildren: false,
        });
      }
    } catch (error) {
      console.warn('Sidebar menu initialization failed:', error);
    }

    let resizeTimeout: any;
    this.resizeListener = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (window.innerWidth >= 1200 && this.layoutMenuRef?.nativeElement) {
          this.ngZone.runOutsideAngular(() => this.initializeMenu());
        }
      }, 300);
    };
    window.addEventListener('resize', this.resizeListener);
  }

  hasVisibleChildren(node: MenuNode | null | undefined): boolean {
    return !!(node && node.children && node.children.some(c => !!c.visible));
  }

  isVisibleLeaf(node: MenuNode | null | undefined): boolean {
    return !!node && !this.hasVisibleChildren(node) && !!node.visible;
  }

  // ------------ New: router watcher to auto-expand ancestors of active route ------------
  private setupActiveWatcher(): void {
    this.updateActiveAndExpand(this.router.url);

    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((ev: any) => {
      this.updateActiveAndExpand(ev.urlAfterRedirects ?? ev.url);
    });
  }

  private updateActiveAndExpand(url: string): void {
    // first collapse all
    const collapseAll = (n: MenuNode) => {
      n.expanded = false;
      n.children.forEach(c => collapseAll(c));
    };
    this.menuTree.forEach(root => collapseAll(root));

    const normalizeLink = (rl: string | undefined | any[]): string | undefined => {
      if (!rl) return undefined;
      if (Array.isArray(rl)) return '/' + rl.join('/');
      return String(rl);
    };

    const markAncestors = (node?: MenuNode | null) => {
      while (node) {
        node.expanded = true;
        node = node.parent ?? null;
      }
    };

    const findMatch = (node: MenuNode): boolean => {
      const link = normalizeLink(node.routerLink as any);
      if (link) {
        try {
          if (this.router.isActive(link, false)) {
            markAncestors(node.parent);
            node.expanded = node.children.length > 0 ? true : node.expanded;
            return true;
          }
        } catch {
        }
        if (url === link || (link !== '/' && url.startsWith(link))) {
          markAncestors(node.parent);
          node.expanded = node.children.length > 0 ? true : node.expanded;
          return true;
        }
      }

      // check children
      for (const c of node.children) {
        if (findMatch(c)) {
          node.expanded = true;
          return true;
        }
      }
      return false;
    };

    this.menuTree.forEach(root => findMatch(root));
  }
}
