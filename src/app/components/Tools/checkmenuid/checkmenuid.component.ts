import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { LoaderService } from '../../../services/loader.service';

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
  selector: 'app-checkmenuid',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './checkmenuid.component.html',
  styleUrl: './checkmenuid.component.css'
})
export class CheckmenuidComponent implements OnInit {

  readonly programeId = 1;

  userGrades: DTOUserGrade[] = [];

  // We only support multiple-grade mode now
  multiMode = true;
  selectedGradesMulti: number[] = [];

  showMultiGradeDropdown = false; // no longer used in markup, kept harmlessly

  menuTree: MenuNode[] = [];
  private flatMenus: DTOMenuMasterItem[] = [];

  loadingMenus = false;
  saving = false;

  expandAllChecked = false;

  constructor(
    private api: ApiService,
    private toastr: ToastrService,
    private loader: LoaderService
  ) { }

  ngOnInit(): void {
    this.loadUserGrades();
    this.loadMenuMaster();
  }

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
        this.toastr.error('Failed to load menu structure');
      },
      complete: () => {
        this.loadingMenus = false;
      }
    });
  }

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

  private buildTreeFromMenus(menus: DTOMenuMasterItem[]): MenuNode[] {
    const result: MenuNode[] = [];

    const roots = menus.filter(m => m.seqNo1 === 0).sort((a, b) => a.mainMenuId - b.mainMenuId);

    for (const rootItem of roots) {
      const rootNode: MenuNode = {
        id: rootItem.menuId,
        name: rootItem.menuName,
        children: [],
        checked: false,
        expanded: false
      };

      const level1 = menus
        .filter(m =>
          m.programeId === rootItem.programeId &&
          m.mainMenuId === rootItem.mainMenuId &&
          m.seqNo1 > 0 && m.seqNo2 === 0)
        .sort((a, b) => a.seqNo1 - b.seqNo1);

      for (const l1 of level1) {
        const node1 = this.createNodeFromItem(l1, rootNode);

        const level2 = menus
          .filter(m =>
            m.programeId === rootItem.programeId &&
            m.mainMenuId === rootItem.mainMenuId &&
            m.seqNo1 === l1.seqNo1 &&
            m.seqNo2 > 0 && m.seqNo3 === 0)
          .sort((a, b) => a.seqNo2 - b.seqNo2);

        for (const l2 of level2) {
          const node2 = this.createNodeFromItem(l2, node1);

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

  private clearSelection(): void {
    const clearNode = (n: MenuNode) => {
      n.checked = false;
      n.expanded = false;
      n.children?.forEach(clearNode);
    };
    this.menuTree.forEach(clearNode);
    this.expandAllChecked = false;
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

    const setChildren = (n: MenuNode, value: boolean) => {
      n.children?.forEach(c => {
        c.checked = value;
        setChildren(c, value);
      });
    };
    setChildren(node, checked);

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

  // Multi-grade helpers
  isGradeSelectedMulti(code: number): boolean {
    return this.selectedGradesMulti.includes(code);
  }

  onMultiGradeCheckboxChange(code: number, checked: boolean): void {
    if (checked) {
      if (!this.selectedGradesMulti.includes(code)) {
        this.selectedGradesMulti.push(code);
      }
    } else {
      this.selectedGradesMulti = this.selectedGradesMulti.filter(x => x !== code);
    }
  }

  onSave(): void {
    if (this.selectedGradesMulti.length === 0) {
      this.toastr.warning('Please select at least one User Grade');
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

    if (selectedIds.length === 0) {
      this.toastr.warning('Please select at least one menu');
      return;
    }

    this.saving = true;
    const payload = {
      selectedusergradelist: this.selectedGradesMulti,
      programeId: this.programeId,
      selectedMenuIds: selectedIds
    };
    this.loader.show();
    this.api.post('UserMenuAccess/MultipleGradeSave', payload).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message ?? 'Settings saved for selected grades');
        this.saving = false;
        this.loader.hide();
        // clear selection or reload if needed
        this.clearSelection();
      },
      error: err => {
        this.toastr.error('Failed to save menu access for selected grades');
        this.saving = false;
        this.loader.hide();
      }
    });
  }

  onCancel(): void {
    this.selectedGradesMulti = [];
    this.clearSelection();
  }
}
