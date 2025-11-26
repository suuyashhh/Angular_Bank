import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitymstComponent } from './citymst.component';

describe('CitymstComponent', () => {
  let component: CitymstComponent;
  let fixture: ComponentFixture<CitymstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitymstComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CitymstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
