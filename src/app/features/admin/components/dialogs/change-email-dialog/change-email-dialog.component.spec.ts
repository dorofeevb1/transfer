import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeEmailDialogComponent } from './change-email-dialog.component';

describe('ChangeEmailDialogComponent', () => {
  let component: ChangeEmailDialogComponent;
  let fixture: ComponentFixture<ChangeEmailDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChangeEmailDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangeEmailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
