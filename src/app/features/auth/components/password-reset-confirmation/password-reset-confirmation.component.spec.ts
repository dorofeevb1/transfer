import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordResetConfirmationComponent } from './password-reset-confirmation.component';

describe('PasswordResetConfirmationComponent', () => {
  let component: PasswordResetConfirmationComponent;
  let fixture: ComponentFixture<PasswordResetConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PasswordResetConfirmationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasswordResetConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
