import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartymastComponent } from './partymast.component';

describe('PartymastComponent', () => {
  let component: PartymastComponent;
  let fixture: ComponentFixture<PartymastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartymastComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PartymastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
