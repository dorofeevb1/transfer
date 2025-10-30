import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-add-column-dialog',
  templateUrl: './add-column-dialog.component.html',
  styleUrls: ['./add-column-dialog.component.scss']
})
export class AddColumnDialogComponent {
  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<AddColumnDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string },
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.name);
    }
  }
}
