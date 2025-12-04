import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReligionmstComponent } from './religionmst.component';

describe('ReligionmstComponent', () => {
  let component: ReligionmstComponent;
  let fixture: ComponentFixture<ReligionmstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReligionmstComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReligionmstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
