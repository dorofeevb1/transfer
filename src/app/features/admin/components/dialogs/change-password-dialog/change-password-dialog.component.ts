import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-change-password-dialog',
  templateUrl: './change-password-dialog.component.html',
})
export class ChangePasswordDialogComponent {
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ChangePasswordDialogComponent>
  ) {
    this.form = fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }
  passwordMatchValidator(frm: FormGroup) {
    return frm.get('password')?.value === frm.get('confirmPassword')?.value ? null : { 'mismatch': true };
  }
  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.get('password')?.value);
    }
  }
  onCancel(): void { this.dialogRef.close(); }
}
