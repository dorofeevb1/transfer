import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { AddPhotoDialogComponent } from '../add-photo-dialog/add-photo-dialog.component';
import { ProductTableService } from 'src/app/core/services/api-service/product-table-service';

@Component({
  selector: 'app-edit-dialog',
  templateUrl: './edit-dialog.component.html',
  styleUrls: ['./edit-dialog.component.scss']
})
export class EditDialogComponent implements OnInit {
  form: FormGroup;
  objectKeys = Object.keys;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    public productTableService: ProductTableService
  ) {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    // Гарантируем наличие поля images
    if (!this.data.images || !Array.isArray(this.data.images)) {
      this.data.images = [];
    }

    // Создаем контролы для всех полей
    const formControls: { [key: string]: FormControl } = {};

    // Сначала добавляем images явно, чтобы он попал в форму даже если его нет в ключах объекта
    formControls['images'] = new FormControl(this.data.images);

    for (const key in this.data) {
      if (Object.prototype.hasOwnProperty.call(this.data, key) && key !== 'images') {
        formControls[key] = new FormControl(this.data[key]);
      }
    }
    this.form = this.fb.group(formControls);
  }

  get imagesControl(): FormControl {
    return this.form.get('images') as FormControl;
  }

  openAddPhotoDialog(): void {
    const dialogRef = this.dialog.open(AddPhotoDialogComponent, {
      width: '600px',
      // panelClass можно добавить для кастомных стилей диалога
    });

    dialogRef.afterClosed().subscribe((result: string[]) => {
      // Ожидаем массив base64 строк
      if (result && Array.isArray(result) && result.length > 0) {
        const currentImages = this.imagesControl.value || [];
        // Объединяем текущие и новые (можно добавить проверку на дубликаты)
        this.imagesControl.setValue([...currentImages, ...result]);
        this.form.markAsDirty(); // Помечаем форму как измененную
      }
    });
  }

  removeImage(index: number): void {
    const currentImages = [...(this.imagesControl.value || [])];
    currentImages.splice(index, 1);
    this.imagesControl.setValue(currentImages);
    this.form.markAsDirty();
  }

  onSave(): void {
    if (this.form.valid) {
      // Возвращаем ID вместе с формой, так как он часто нужен для апдейта
      const result = {
        id: this.data.id,
        ...this.form.value
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
