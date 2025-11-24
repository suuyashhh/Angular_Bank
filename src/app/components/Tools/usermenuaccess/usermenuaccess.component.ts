import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';

interface DTOUserGrade {
  code: number;
  name: string;
}

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
}

interface MenuNode {
  id: number;
  name: string;
  children: MenuNode[];
  parent?: MenuNode;
  checked: boolean;
  expanded: boolean;
}

@Component({
  selector: 'app-usermenuaccess',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './usermenuaccess.component.html',
  styleUrl: './usermenuaccess.component.css'
})
export class UsermenuaccessComponent implements OnInit {

  readonly programeId = 1;

  userGrades: DTOUserGrade[] = [];
  selectedUserGradeCode: number | null = null;

  menuTree: MenuNode[] = [];
  private flatMenus: DTOMenuMasterItem[] = [];

  loadingMenus = false;
  loadingSelection = false;
  saving = false;

  expandAllChecked = false;

  constructor(
    private api: ApiService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadUserGrades();
    this.loadMenuMaster(); // tree structure is same for all grades
  }

  // ---------- API calls ----------

  private loadUserGrades(): void {
    this.api.get('UserMenuAccess/UserGrades').subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res) list = [res];

        this.userGrades = (list || []).map(x => this.normalizeGrade(x));
      },
      error: err => {
        console.error('Failed to load user grades', err);
        this.toastr.error('Failed to load user grades');
      }
    });
  }

  private loadMenuMaster(): void {
    this.loadingMenus = true;
    this.api.get('UserMenuAccess/MenuMaster', { programeId: this.programeId }).subscribe({
      next: (res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res) list = [res];

        this.flatMenus = (list || []).map(x => this.normalizeMenu(x));
        this.menuTree = this.buildTreeFromMenus(this.flatMenus);
      },
      error: err => {
        console.error('Failed to load menu master', err);
        this.toastr.error('Failed to load menu structure');
      },
      complete: () => {
        this.loadingMenus = false;
      }
    });
  }

  private loadSelectedMenusForGrade(gradeCode: number): void {
    if (!gradeCode || gradeCode <= 0) {
      this.clearSelection();
      return;
    }
    this.loadingSelection = true;

    this.api.get('UserMenuAccess/SelectedMenus', {
      userGrad: gradeCode,
      programeId: this.programeId
    }).subscribe({
      next: (res: any) => {
        let list: number[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res !== null && res !== undefined) list = [Number(res)];

        const selectedSet = new Set((list || []).map(x => Number(x)));
        this.applySelection(selectedSet);
      },
      error: err => {
        console.error('Failed to load selected menus', err);
        this.toastr.error('Failed to load user menu access');
      },
      complete: () => {
        this.loadingSelection = false;
      }
    });
  }

  // ---------- Normalizers ----------

  private normalizeGrade(raw: any): DTOUserGrade {
    return {
      code: Number(raw.code ?? raw.Code ?? 0),
      name: String(raw.name ?? raw.Name ?? '')
    };
  }

  private normalizeMenu(raw: any): DTOMenuMasterItem {
    return {
      menuId: Number(raw.menuId ?? raw.MenuId ?? 0),
      menuName: String(raw.menuName ?? raw.MenuName ?? ''),
      programeId: Number(raw.programeId ?? raw.ProgrameId ?? 0),
      mainMenuId: Number(raw.mainMenuId ?? raw.MainMenuId ?? 0),
      seqNo1: Number(raw.seqNo1 ?? raw.SeqNo1 ?? 0),
      seqNo2: Number(raw.seqNo2 ?? raw.SeqNo2 ?? 0),
      seqNo3: Number(raw.seqNo3 ?? raw.SeqNo3 ?? 0),
      seqNo4: Number(raw.seqNo4 ?? raw.SeqNo4 ?? 0),
      seqNo5: Number(raw.seqNo5 ?? raw.SeqNo5 ?? 0)
    };
  }

  // ---------- Tree building (translation of RootNodes logic) ----------

  private buildTreeFromMenus(menus: DTOMenuMasterItem[]): MenuNode[] {
    const result: MenuNode[] = [];

    // Root nodes: SeqNo1 = 0 (like RootNodes main query)
    const roots = menus
      .filter(m => m.seqNo1 === 0)
      .sort((a, b) => a.mainMenuId - b.mainMenuId);

    for (const rootItem of roots) {
      const rootNode: MenuNode = {
        id: rootItem.menuId,
        name: rootItem.menuName,
        children: [],
        checked: false,
        expanded: false
      };

      // Level 1
      const level1 = menus
        .filter(m =>
          m.programeId === rootItem.programeId &&
          m.mainMenuId === rootItem.mainMenuId &&
          m.seqNo1 > 0 && m.seqNo2 === 0)
        .sort((a, b) => a.seqNo1 - b.seqNo1);

      for (const l1 of level1) {
        const node1 = this.createNodeFromItem(l1, rootNode);

        // Level 2
        const level2 = menus
          .filter(m =>
            m.programeId === rootItem.programeId &&
            m.mainMenuId === rootItem.mainMenuId &&
            m.seqNo1 === l1.seqNo1 &&
            m.seqNo2 > 0 && m.seqNo3 === 0)
          .sort((a, b) => a.seqNo2 - b.seqNo2);

        for (const l2 of level2) {
          const node2 = this.createNodeFromItem(l2, node1);

          // Level 3
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

            // Level 4
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

              // Level 5
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
      children: [],
      checked: false,
      expanded: false,
      parent
    };
    parent?.children.push(node);
    return node;
  }

  // ---------- Selection / checkboxes ----------

  private clearSelection(): void {
    const clearNode = (n: MenuNode) => {
      n.checked = false;
      n.expanded = false;
      n.children?.forEach(clearNode);
    };
    this.menuTree.forEach(clearNode);
    this.expandAllChecked = false;
  }

  private applySelection(selectedSet: Set<number>): void {
    const applyNode = (n: MenuNode) => {
      n.checked = selectedSet.has(n.id);
      n.children?.forEach(applyNode);
    };
    this.menuTree.forEach(applyNode);
    this.updateAllParentCheckStates();
  }

  private updateAllParentCheckStates(): void {
    const updateNode = (n: MenuNode) => {
      n.children?.forEach(updateNode);
      if (n.children && n.children.length > 0) {
        n.checked = n.children.some(c => c.checked);
      }
    };
    this.menuTree.forEach(updateNode);
  }

  toggleExpand(node: MenuNode): void {
    node.expanded = !node.expanded;
  }

  toggleCheck(node: MenuNode, checked: boolean): void {
    node.checked = checked;
    // propagate to children
    const setChildren = (n: MenuNode, value: boolean) => {
      n.children?.forEach(c => {
        c.checked = value;
        setChildren(c, value);
      });
    };
    setChildren(node, checked);
    // update parents
    this.updateParentCheckState(node.parent);
  }

  private updateParentCheckState(parent?: MenuNode): void {
    if (!parent) return;
    parent.checked = parent.children.some(c => c.checked);
    this.updateParentCheckState(parent.parent);
  }

  onExpandAllToggle(isChecked: boolean): void {
    const setExpanded = (n: MenuNode, value: boolean) => {
      n.expanded = value;
      n.children?.forEach(c => setExpanded(c, value));
    };
    this.menuTree.forEach(n => setExpanded(n, isChecked));
  }

  // ---------- UI actions ----------

  onUserGradeChange(gradeCode: number | null): void {
    this.clearSelection();
    if (gradeCode && gradeCode > 0) {
      this.loadSelectedMenusForGrade(gradeCode);
    }
  }

  onSave(): void {
    if (!this.selectedUserGradeCode || this.selectedUserGradeCode <= 0) {
      this.toastr.warning('Please select User Type');
      return;
    }

    const collectIds = (nodes: MenuNode[]): number[] => {
      const result: number[] = [];
      const walk = (n: MenuNode) => {
        if (n.checked) result.push(n.id);
        n.children?.forEach(walk);
      };
      nodes.forEach(walk);
      return result;
    };

    const selectedIds = collectIds(this.menuTree);

    const payload = {
      userGrad: this.selectedUserGradeCode,
      programeId: this.programeId,
      selectedMenuIds: selectedIds
    };

    this.saving = true;
    this.api.post('UserMenuAccess/Save', payload).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'Settings saved');
        this.saving = false;
      },
      error: err => {
        console.error('Save error', err);
        this.toastr.error('Failed to save menu access');
        this.saving = false;
      }
    });
  }

  onCancel(): void {
    this.selectedUserGradeCode = null;
    this.clearSelection();
  }
}
