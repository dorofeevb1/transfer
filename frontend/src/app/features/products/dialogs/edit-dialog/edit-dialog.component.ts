import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { AddPhotoDialogComponent } from '../add-photo-dialog/add-photo-dialog.component';
import { ProductTableService } from 'src/app/core/services/api-service/product-table-service';

@Component({
  selector: 'app-edit-dialog',
  templateUrl: './edit-dialog.component.html',
  styleUrls: ['./edit-dialog.component.scss']
})
export class EditDialogComponent implements OnInit {
  form!: FormGroup;
  objectKeys = Object.keys;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    public productTableService: ProductTableService
  ) { }

  ngOnInit(): void {
    if (!this.data.images || !Array.isArray(this.data.images)) {
      this.data.images = [];
    }

    const formControls: { [key: string]: FormControl } = {};
    formControls['images'] = new FormControl(this.data.images);

    for (const key in this.data) {
      if (Object.prototype.hasOwnProperty.call(this.data, key) && key !== 'images') {
        formControls[key] = new FormControl(this.data[key]);
      }
    }

    this.form = this.fb.group(formControls);
    console.log('EditDialog: initialized with data.id:', this.data.id);
  }

  get imagesControl(): FormControl {
    return this.form.get('images') as FormControl;
  }

  openAddPhotoDialog(): void {
    const dialogRef = this.dialog.open(AddPhotoDialogComponent, {
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((result: string[]) => {
      if (result && Array.isArray(result) && result.length > 0) {
        const currentImages = this.imagesControl.value || [];
        this.imagesControl.setValue([...currentImages, ...result]);
        this.form.markAsDirty();
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
    console.log('🔄 EditDialog: onSave() called, data.id:', this.data.id);

    if (this.isSaving || this.form.invalid || !this.data.id) {
      console.error('❌ Form invalid or no ID:', {
        isSaving: this.isSaving,
        formValid: this.form.valid,
        dataId: this.data.id
      });
      return;
    }

    this.isSaving = true;
    console.log('📤 Sending updateRow request...');

    const updatedRow = {
      id: this.data.id,
      ...this.form.value
    };

    this.productTableService.updateRow(this.data.id as string, updatedRow).subscribe({
      next: (updatedFromServer) => {
        console.log('✅ UPDATE SUCCESS! Server response:', updatedFromServer);
        this.dialogRef.close(updatedFromServer);
      },
      error: (error) => {
        console.error('❌ UPDATE ERROR:', error);
        this.dialogRef.close(updatedRow);
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  onCancel(): void {
    console.log('EditDialog: onCancel clicked');
    this.dialogRef.close();
  }
}
