import { Component, Output, EventEmitter, Input } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Input() isFullWidth: boolean = false;

  user: any;
  constructor(private auth:AuthService, private toster:ToastrService){}
  ngOnInit():void{
    this.user=this.auth.getUser();
  }

  logout(){
    this.auth.logout();
    this.toster.success('LogOut SuccessFul..!','Logout');
  }

}