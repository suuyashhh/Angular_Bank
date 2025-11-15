import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsermstComponent } from './usermst.component';

describe('UsermstComponent', () => {
  let component: UsermstComponent;
  let fixture: ComponentFixture<UsermstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsermstComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsermstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
