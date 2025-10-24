import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterOutlet, NavigationStart } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LoaderComponent } from './services/loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule,LoaderComponent],
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
            // Clean up old refresh timestamp if it's too old
            const lastRefresh = localStorage.getItem('last_unload_time');
            const now = Date.now();
            if (lastRefresh && (now - parseInt(lastRefresh, 10) > 10000)) {
              localStorage.removeItem('last_unload_time');
            }
          } catch (err) {
            console.warn('⚠️ refresh cleanup error:', err);
          }
        }
      });
    }
  }
}
