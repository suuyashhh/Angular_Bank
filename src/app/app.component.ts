import { Component, OnInit, Inject, PLATFORM_ID, NgZone, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, Event } from '@angular/router';
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
  private devToolsCheckInterval: any;
  private touchTimeout: any;

  constructor(
    public auth: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // 1️⃣ Wait for session restoration
    this.auth.isRestoringSession$.subscribe(restoring => {
      if (!restoring) {
        this.sessionRestored = true;
        console.log('✅ Auth session restored');

        if (this.auth.isLoggedIn()) {
          const lastRoute = this.auth.getLastRoute();
          if (lastRoute && lastRoute !== '/') {
            this.router.navigate([lastRoute], { replaceUrl: true });
          }
        }
      }
    });

    // 2️⃣ Track last route on every navigation
    if (isPlatformBrowser(this.platformId)) {
      this.router.events
        .pipe(
          filter((event: Event): event is NavigationStart => event instanceof NavigationStart)
        )
        .subscribe(event => {
          this.auth.setLastRoute(event.url);
        });

      // ---------- 3️⃣ Disable right-click ----------
      //window.addEventListener('contextmenu', (e) => e.preventDefault());

      // ---------- 4️⃣ Disable keyboard shortcuts ----------
      // window.addEventListener('keydown', (e: KeyboardEvent) => {
      //   const target = e.target as HTMLElement;
      //   const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      //   if (inInput) return;

      //   if (
      //     e.key === 'F12' ||
      //     (e.ctrlKey && e.shiftKey && ['I','J','C','K'].includes(e.key)) ||
      //     (e.ctrlKey && ['U','S','H','A'].includes(e.key))
      //   ) {
      //     e.preventDefault();
      //     console.warn('Blocked DevTools shortcut:', e.key);
      //   }
      // });

      // ---------- 5️⃣ Disable mobile long-press context menu ----------
      // window.addEventListener('touchstart', (e) => {
      //   this.touchTimeout = setTimeout(() => e.preventDefault(), 500);
      // });
      // window.addEventListener('touchend', () => clearTimeout(this.touchTimeout));

      // ---------- 6️⃣ Detect DevTools in real-time ----------
      // this.ngZone.runOutsideAngular(() => {
      //   this.devToolsCheckInterval = setInterval(() => {
      //     const threshold = 160;
      //     const widthDiff = window.outerWidth - window.innerWidth > threshold;
      //     const heightDiff = window.outerHeight - window.innerHeight > threshold;

      //     if (widthDiff || heightDiff) {
      //       console.warn('⚠️ DevTools detected!');
      //       this.ngZone.run(() => {
      //         this.auth.logout();
      //         alert('DevTools detected! You have been logged out for security reasons.');
      //       });
      //     }
      //   }, 1000);
      // });
    }
  }

  ngOnDestroy(): void {
    if (this.devToolsCheckInterval) clearInterval(this.devToolsCheckInterval);
    clearTimeout(this.touchTimeout);
  }
}
