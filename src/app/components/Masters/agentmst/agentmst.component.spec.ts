import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentmstComponent } from './agentmst.component';

describe('AgentmstComponent', () => {
  let component: AgentmstComponent;
  let fixture: ComponentFixture<AgentmstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentmstComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AgentmstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
