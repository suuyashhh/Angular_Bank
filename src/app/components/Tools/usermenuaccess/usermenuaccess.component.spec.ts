import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsermenuaccessComponent } from './usermenuaccess.component';

describe('UsermenuaccessComponent', () => {
  let component: UsermenuaccessComponent;
  let fixture: ComponentFixture<UsermenuaccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsermenuaccessComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsermenuaccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
