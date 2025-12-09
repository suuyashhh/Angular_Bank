import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MenuCommServiceService {

  private storageKey = 'selectedMenu';

  private menuSource = new BehaviorSubject<any>(this.loadMenuFromSession());
  menu$ = this.menuSource.asObservable();

  constructor() {}

  sendMenu(data: any) {
    this.menuSource.next(data);
    this.saveMenuToSession(data);
  }

  private saveMenuToSession(data: any) {
    sessionStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  private loadMenuFromSession() {
    const json = sessionStorage.getItem(this.storageKey);
    return json ? JSON.parse(json) : null;
  }
}
