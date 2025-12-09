import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommanmstF2Component } from './commanmst-f2.component';

describe('CommanmstF2Component', () => {
  let component: CommanmstF2Component;
  let fixture: ComponentFixture<CommanmstF2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommanmstF2Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CommanmstF2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
