import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepositaccountOpeningComponent } from './depositaccount-opening.component';

describe('DepositaccountOpeningComponent', () => {
  let component: DepositaccountOpeningComponent;
  let fixture: ComponentFixture<DepositaccountOpeningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepositaccountOpeningComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DepositaccountOpeningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
