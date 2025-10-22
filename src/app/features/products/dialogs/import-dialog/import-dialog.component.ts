import { Component } from '@angular/core';
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

  constructor(
    public dialogRef: MatDialogRef<ImportDialogComponent>,
    private excelService: ExcelProcessingService,
    private productTableService: ProductTableService
  ) { }

  /**
   * Срабатывает при выборе файлов через стандартное диалоговое окно.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
      // Сбрасываем значение input, чтобы можно было выбрать тот же файл повторно
      input.value = '';
    }
  }

  /**
   * Срабатывает, когда файлы перетаскивают над областью загрузки.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  /**
   * Срабатывает, когда файлы убирают из области загрузки.
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  /**
   * Срабатывает, когда файлы "бросают" в область загрузки.
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  /**
   * Добавляет файлы в список, избегая дубликатов.
   */
  addFiles(newFiles: File[]): void {
    const uniqueFiles = newFiles.filter(newFile =>
      !this.files.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)
    );
    this.files.push(...uniqueFiles);
  }

  /**
   * Удаляет файл из списка.
   */
  removeFile(fileToRemove: File): void {
    this.files = this.files.filter(file => file !== fileToRemove);
  }

  /**
   * Запускает процесс импорта: передает файлы в сервис и закрывает окно с результатом.
   */
  async onImport(): Promise<void> {
    if (this.files.length === 0) return;

    this.isLoading = true;
    try {
      // Получаем структурированный результат от сервиса
      const processingResult = await this.excelService.processFiles(this.files);
      if (processingResult && processingResult.mergedData && processingResult.mergedData.length > 0) {
        // Отправляем на бэк присланные данные
        this.productTableService.sendImportDataToBackend(processingResult.mergedData).subscribe({
          next: () => console.log('Данные импорта успешно отправлены на сервер'),
          error: err => console.error('Ошибка отправки данных импорта', err),
        });

        this.dialogRef.close(processingResult);
      }
    } catch (error) {
      console.error('Ошибка при обработке файлов:', error);
      // Можно добавить вывод ошибки пользователю
    } finally {
      this.isLoading = false;
    }
  }


  /**
   * Закрывает диалоговое окно без передачи данных.
   */

  onCancel(): void {
    this.dialogRef.close();
  }

}
