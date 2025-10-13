import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { AddPhotoDialogComponent } from '../add-photo-dialog/add-photo-dialog.component';

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
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    // Инициализируем поле images, если его нет
    if (!this.data.images || !Array.isArray(this.data.images)) {
      this.data.images = [];
    }

    // Создаем форму, исключая нестандартные поля вроде id
    const formControls: { [key: string]: FormControl } = {};
    for (const key in this.data) {
      if (Object.prototype.hasOwnProperty.call(this.data, key)) {
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
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && Array.isArray(result)) {
        const newImageUrls = result.map(preview => preview.base64);
        const currentImages = this.imagesControl.value || [];
        this.imagesControl.setValue([...currentImages, ...newImageUrls]);
      }
    });
  }

  removeImage(index: number): void {
    const currentImages = this.imagesControl.value;
    currentImages.splice(index, 1);
    this.imagesControl.setValue([...currentImages]);
  }

  onSave(): void {
    this.dialogRef.close(this.form.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
