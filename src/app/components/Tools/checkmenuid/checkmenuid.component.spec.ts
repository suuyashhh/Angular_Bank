import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckmenuidComponent } from './checkmenuid.component';

describe('CheckmenuidComponent', () => {
  let component: CheckmenuidComponent;
  let fixture: ComponentFixture<CheckmenuidComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckmenuidComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CheckmenuidComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
