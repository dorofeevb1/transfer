import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-change-email-dialog',
  templateUrl: './change-email-dialog.component.html',
})
export class ChangeEmailDialogComponent {
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ChangeEmailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { email: string }
  ) {
    this.form = fb.group({
      newEmail: ['', [Validators.required, Validators.email]]
    });
  }
  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
  onCancel(): void { this.dialogRef.close(); }
}
