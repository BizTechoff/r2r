import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SendWappComponent } from './send-wapp.component';

describe('SendWappComponent', () => {
  let component: SendWappComponent;
  let fixture: ComponentFixture<SendWappComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SendWappComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SendWappComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
