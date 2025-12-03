import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffmstComponent } from './staffmst.component';

describe('StaffmstComponent', () => {
  let component: StaffmstComponent;
  let fixture: ComponentFixture<StaffmstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffmstComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StaffmstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
