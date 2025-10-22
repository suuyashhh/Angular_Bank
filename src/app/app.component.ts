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
    // Initialize auth service and wait for session restore
    this.auth.ensureInitialized().then(() => {
      console.log('✅ Auth session restored');
    });

    // Only access localStorage on the browser
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.subscribe(event => {
        if (event instanceof NavigationStart) {
          try {
            const lastRefresh = localStorage.getItem('session_refresh_timestamp');
            const now = Date.now();
            const isRefresh = lastRefresh && now - parseInt(lastRefresh, 10) < 5000;

            if (isRefresh && this.auth.isLoggedIn()) {
              // Prevent navigation flicker on reload
              event.restoredState = { navigationId: 0 };
            }
          } catch (err) {
            console.warn('⚠️ localStorage access error:', err);
          }
        }
      });
    }
  }
}
