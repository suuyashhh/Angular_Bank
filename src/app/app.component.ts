import { Component, OnInit  } from '@angular/core';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Angular_Bank';
  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    // Handle router events to detect refresh
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        // If it's a navigation to the current URL, it's likely a refresh
        if (event.navigationTrigger === 'imperative' && 
            event.restoredState === null) {
          // This is a fresh navigation, not a refresh
          localStorage.removeItem('prevent_logout_on_refresh');
        }
      }
    });

    // Initialize auth service
    this.auth.ensureInitialized().then(() => {
      console.log('Auth service initialized');
    });
  }
}
