import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

interface ImagePreview {
  file: File;
  url: SafeUrl;
  base64: string;
}

@Component({
  selector: 'app-add-photo-dialog',
  templateUrl: './add-photo-dialog.component.html',
  styleUrls: ['./add-photo-dialog.component.scss']
})
export class AddPhotoDialogComponent {
  previews: ImagePreview[] = [];
  isDragOver = false;

  constructor(
    public dialogRef: MatDialogRef<AddPhotoDialogComponent>,
    private sanitizer: DomSanitizer
  ) { }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
    // Сбрасываем value, чтобы можно было выбрать тот же файл повторно
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  addFiles(files: File[]): void {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previews.push({
            file: file,
            // Используем sanitizer только для превью в HTML
            url: this.sanitizer.bypassSecurityTrustUrl(e.target.result),
            // Сохраняем чистую строку base64 для отправки
            base64: e.target.result
          });
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeFile(index: number): void {
    this.previews.splice(index, 1);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    // Возвращаем массив строк base64, чтобы таблица могла их отобразить
    const result = this.previews.map(p => p.base64);
    this.dialogRef.close(result);
  }
}
