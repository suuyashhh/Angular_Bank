import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CountrymstComponent } from './countrymst.component';

describe('CountrymstComponent', () => {
  let component: CountrymstComponent;
  let fixture: ComponentFixture<CountrymstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountrymstComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CountrymstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
