import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DistrictmstComponent } from './districtmst.component';

describe('DistrictmstComponent', () => {
  let component: DistrictmstComponent;
  let fixture: ComponentFixture<DistrictmstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistrictmstComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DistrictmstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
