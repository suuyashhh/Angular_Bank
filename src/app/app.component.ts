import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterOutlet, NavigationStart } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Angular_Bank';

  constructor(
    public auth: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
  this.auth.ensureInitialized().then(() => {
    console.log('✅ Auth session restored');
  });

  if (isPlatformBrowser(this.platformId)) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        try {
          // more robust: use navigation timing API
          const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          const navType = navEntries?.[0]?.type;
          const isReload = navType === 'reload' || navType === 'back_forward';

          // fallback: check session refresh timestamp (set in beforeunload)
          const lastRefresh = localStorage.getItem('session_refresh_timestamp');
          const now = Date.now();
          const isRecentRefresh = lastRefresh && (now - parseInt(lastRefresh, 10) < 5000);

          if ((isReload || isRecentRefresh) && this.auth.isLoggedIn()) {
            event.restoredState = { navigationId: 0 }; // prevent flicker
          }
        } catch (err) {
          console.warn('⚠️ reload detection error:', err);
        }
      }
    });
  }
}

}
