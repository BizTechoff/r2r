import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DemoIdColumnComponent } from './demo-id-column.component';

describe('DemoIdColumnComponent', () => {
  let component: DemoIdColumnComponent;
  let fixture: ComponentFixture<DemoIdColumnComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DemoIdColumnComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DemoIdColumnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
