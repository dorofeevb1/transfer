import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableControlsComponent } from './table-controls.component';

describe('TableControlsComponent', () => {
  let component: TableControlsComponent;
  let fixture: ComponentFixture<TableControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TableControlsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
