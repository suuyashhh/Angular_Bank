import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterOutlet, NavigationStart } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LoaderComponent } from './services/loader.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, LoaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Angular_Bank';
  sessionRestored = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Wait for session restoration before rendering sensitive UI
    this.auth.isRestoringSession$.subscribe(restoring => {
  if (!restoring) {
    this.sessionRestored = true;
    console.log('✅ Auth session restored');

    // Auto-navigate if session exists
    if (this.auth.isLoggedIn() && this.router.url === '/') {
      this.router.navigate(['USERMASTER'], { replaceUrl: true });
    }
  }
});


    // Clean old refresh timestamps
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.pipe(
        filter(event => event instanceof NavigationStart)
      ).subscribe(() => {
        try {
          const lastRefresh = localStorage.getItem('last_unload_time');
          const now = Date.now();
          if (lastRefresh && (now - parseInt(lastRefresh, 10) > 10000)) {
            localStorage.removeItem('last_unload_time');
          }
        } catch (err) {
          console.warn('⚠️ Refresh cleanup error:', err);
        }
      });
    }
  }
}
