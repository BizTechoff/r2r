import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DemoEnumComponent } from './demo-enum.component';

describe('DemoEnumComponent', () => {
  let component: DemoEnumComponent;
  let fixture: ComponentFixture<DemoEnumComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DemoEnumComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DemoEnumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
