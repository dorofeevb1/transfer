import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserData } from '../../users-table/users-table.component';


@Component({
  selector: 'app-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss']
})
export class UserDialogComponent {
  form: FormGroup;
  isEditMode: boolean;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: UserData | null }
  ) {
    this.isEditMode = !!data.user;
    const userData: Partial<UserData> = data.user || {};

    this.form = this.fb.group({
      id: [userData.id],
      fio: [userData.fio || '', Validators.required],
      role: [userData.role || '', Validators.required],
      access: [userData.access || '', Validators.required],
      email: [userData.email || '', [Validators.required, Validators.email]],
      password: [''], // Поле для нового пароля, не обязательное при редактировании
    });
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
