import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ProductTableService } from 'src/app/core/services/api-service/product-table-service';
import { ExcelProcessingService } from 'src/app/core/services/excel-processing.service';

@Component({
  selector: 'app-import-dialog',
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss']
})
export class ImportDialogComponent {
  files: File[] = [];
  isLoading = false;
  isDragOver = false;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    public dialogRef: MatDialogRef<ImportDialogComponent>,
    private excelService: ExcelProcessingService,
    private productTableService: ProductTableService
  ) { }

  triggerFileUpload(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
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

  addFiles(newFiles: File[]): void {
    const uniqueFiles = newFiles.filter(newFile =>
      !this.files.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)
    );
    this.files.push(...uniqueFiles);
  }

  removeFile(fileToRemove: File): void {
    this.files = this.files.filter(file => file !== fileToRemove);
  }

  async onImport(): Promise<void> {
    if (this.files.length === 0) return;

    this.isLoading = true;
    try {
      // 1. Обрабатываем файлы (парсим Excel + картинки)
      const processingResult = await this.excelService.processFiles(this.files);

      if (processingResult && processingResult.mergedData && processingResult.mergedData.length > 0) {

        console.warn('⚠️ РЕЖИМ БЕЗ БЭКЕНДА: Отправка на сервер пропущена. Данные обновляются только локально.');

        // --- БЛОК ОТПРАВКИ НА СЕРВЕР (ОТКЛЮЧЕН) ---
        // Если бэкенд появится, раскомментируйте это и добавьте import { firstValueFrom } from 'rxjs';
        /*
        await firstValueFrom(this.productTableService.sendImportDataToBackend(processingResult.mergedData));
        */
        // ------------------------------------------

        // 2. Возвращаем данные в родительский компонент, чтобы таблица обновилась
        this.dialogRef.close(processingResult);
      } else {
        console.warn('Файлы обработаны, но данных не найдено');
      }

    } catch (error) {
      console.error('Ошибка при обработке файлов:', error);
    } finally {
      this.isLoading = false;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
