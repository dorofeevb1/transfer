import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserData, UserService } from 'src/app/core/services/api-service/users-table-service'; // Импортируем сервис
import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss']
})
export class UserDialogComponent implements OnInit {
  form: FormGroup;
  isEditMode: boolean;

  // Переменные для списков
  roles$!: Observable<string[]>;
  accessLevels$!: Observable<string[]>;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: UserData },
    private userService: UserService // Внедряем сервис
  ) {
    this.isEditMode = !!data.user;

    this.form = this.fb.group({
      id: [data.user?.id || null],
      fio: [data.user?.fio || '', Validators.required],
      role: [data.user?.role || '', Validators.required],     // Будет Select
      access: [data.user?.access || '', Validators.required], // Будет Select
      email: [data.user?.email || '', [Validators.required, Validators.email]],
      password: [''] // Пароль необязателен при редактировании
    });
  }

  ngOnInit(): void {
    // Загружаем справочники при открытии диалога
    this.roles$ = this.userService.getRoles();
    this.accessLevels$ = this.userService.getAccessLevels();
  }

  onSave(): void {
    if (this.form.valid) {
      // Если поле пароля пустое (при редактировании), удаляем его из объекта, чтобы не затереть хэш
      const formValue = { ...this.form.value };
      if (!formValue.password) {
        delete formValue.password;
      }
      this.dialogRef.close(formValue);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
