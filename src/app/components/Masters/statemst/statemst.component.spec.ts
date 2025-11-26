import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatemstComponent } from './statemst.component';

describe('StatemstComponent', () => {
  let component: StatemstComponent;
  let fixture: ComponentFixture<StatemstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatemstComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StatemstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
