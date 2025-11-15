import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PickerModalComponent } from './picker-modal.component';

describe('PickerModalComponent', () => {
  let component: PickerModalComponent;
  let fixture: ComponentFixture<PickerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PickerModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PickerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
