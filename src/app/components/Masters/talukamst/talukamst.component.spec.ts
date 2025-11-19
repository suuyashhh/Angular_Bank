import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TalukamstComponent } from './talukamst.component';

describe('TalukamstComponent', () => {
  let component: TalukamstComponent;
  let fixture: ComponentFixture<TalukamstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TalukamstComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TalukamstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
