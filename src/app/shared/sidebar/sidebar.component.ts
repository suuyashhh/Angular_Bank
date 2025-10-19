import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, OnDestroy, OnInit, ElementRef, ViewChild, inject, NgZone, Renderer2 } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, AfterViewChecked, OnDestroy {
  user: any;

  private initialized = false;
  private resizeListener!: () => void;

  // Inject Angular services correctly
  private ngZone: NgZone = inject(NgZone);
  private renderer: Renderer2 = inject(Renderer2);

  @ViewChild('layoutMenu', { static: false }) layoutMenuRef!: ElementRef;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    // Only keep minimal user info to avoid exposing sensitive data
    const fullUser = this.auth.getUser();
    this.user = fullUser
      ? { ini: fullUser.ini, workinG_BRANCH: fullUser.workinG_BRANCH }
      : null;
  }

  ngAfterViewChecked(): void {
    // Initialize menu once after view is ready and on desktop only
    if (!this.initialized && window.innerWidth >= 1200 && this.layoutMenuRef?.nativeElement) {
      this.ngZone.runOutsideAngular(() => this.initializeMenu());
      this.initialized = true;
    }
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

    // Setup debounced resize listener
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

  ngOnDestroy(): void {
    // Remove resize listener to prevent memory leaks
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }
}
