import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
export class AppComponent {
  title = 'Angular_Bank';
  constructor(public auth: AuthService,private meta: Meta) {}
  ngOnInit() {
  this.meta.addTag({ 'http-equiv': 'Cache-Control', content: 'no-cache, no-store, must-revalidate' });
  this.meta.addTag({ 'http-equiv': 'Pragma', content: 'no-cache' });
  this.meta.addTag({ 'http-equiv': 'Expires', content: '0' });
}
}
