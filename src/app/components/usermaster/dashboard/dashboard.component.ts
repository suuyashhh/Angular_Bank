import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Init } from 'v8';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule,CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  user: any;
  currentdate!: string;

  // --- minimal data + state
  private items = [
    { pathName: 'Home', link: '/USERMASTER/dashboard' },
    { pathName: 'Customer Party Account', link: '/USERMASTER/partymast' },
    { pathName: 'Country Master', link: '/USERMASTER/countrymst' },
    { pathName: 'District Master', link: '/USERMASTER/districtmst' },
  ];
  filtered: Array<{ pathName: string; link: string }> = []; // empty initially → "No records found"

  constructor(private auth: AuthService) {}

  ngOnInit() {
    this.user = this.auth.getUser();

    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    this.currentdate = today.toLocaleDateString('en-GB', options).replace(',', '');
  }

  onSearch(q: string) {
    const s = q.trim().toLowerCase();
    if (!s) {
      // no query → show empty table (as requested)
      this.filtered = [];
      return;
    }
    this.filtered = this.items.filter(x => x.pathName.toLowerCase().includes(s));
  }
}

