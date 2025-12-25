import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog'; // Добавили MatDialog
import { firstValueFrom } from 'rxjs'; // Необходим для async/await запросов
import { ProductTableService } from 'src/app/core/services/api-service/product-table-service';
import { ExcelProcessingService } from 'src/app/core/services/excel-processing.service';

// Импортируем компонент подтверждения. 
// Если у вас его нет, используйте ConfirmationDeleteComponent или создайте простой ConfirmationDialogComponent
import { ConfirmationDeleteComponent } from '../confirmation-delete/confirmation-delete.component';
// ИЛИ, если у вас есть общий диалог, используйте его. В примере ниже я использую ConfirmationDeleteComponent как заглушку, 
// но лучше создать отдельный ConfirmationDialogComponent (код для него в конце ответа).

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
    private dialog: MatDialog, // Инджектим сервис диалогов
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

    // 1. Сначала обрабатываем Excel/CSV файлы локально, чтобы получить JSON
    let processingResult;
    try {
      processingResult = await this.excelService.processFiles(this.files);
    } catch (error) {
      console.error('Ошибка парсинга файлов:', error);
      this.isLoading = false;
      return;
    }

    if (!processingResult || !processingResult.mergedData || processingResult.mergedData.length === 0) {
      console.warn('Нет данных для отправки');
      this.isLoading = false;
      return;
    }

    const dataToSend = processingResult.mergedData;

    // 2. Отправляем данные на бэкенд (первая попытка, approved = false)
    try {
      await firstValueFrom(this.productTableService.sendImportDataToBackend(dataToSend, false));

      // Если успех (бэкенд вернул 200 OK)
      this.dialogRef.close(processingResult);

    } catch (error: any) {
      console.error('Ошибка отправки на сервер:', error);

      // Логика обработки дубликатов
      // Проверяем ответ от бэкенда на наличие сообщения "поля повторяються"
      // Адаптируйте проверку (error.error?.massege) под точную структуру вашего ответа от API
      const responseMsg = error.error?.massege || error.error?.message || '';

      if (responseMsg.toLowerCase().includes('поля повторяються') || error.status === 409) {

        // Запускаем сценарий подтверждения
        await this.handleDuplicateConflict(dataToSend);

      } else {
        // Какая-то другая ошибка - просто выключаем лоадер
        this.isLoading = false;
      }
    }
    // finally здесь не нужен, так как isLoading управляется внутри веток
  }

  /**
   * Обработка конфликта дубликатов
   */
  private async handleDuplicateConflict(data: any): Promise<void> {
    this.isLoading = false; // Снимаем лоадер, чтобы показать диалог
    const dialogRef = this.dialog.open(ConfirmationDeleteComponent, {
      width: '450px',
      data: {
        title: 'Замена данных', // Заголовок
        message: 'Найдены повторяющиеся поля. Заменить их новыми данными из файла?', // Основной текст
        subtext: 'Старые значения будут потеряны', // Можно добавить предупреждение
        confirmText: 'Заменить', // Текст кнопки "Да"
        cancelText: 'Оставить старые', // Текст кнопки "Нет"
        confirmColor: 'primary' // Важно: делает кнопку синей (не пугает как красная warn)
      }
    });
    const result = await firstValueFrom(dialogRef.afterClosed());

    if (result === true) {
      // Пользователь нажал "ДА" (Заменить)
      this.isLoading = true;
      try {
        // Повторная отправка с approved = true
        await firstValueFrom(this.productTableService.sendImportDataToBackend(data, true));

        // Успех после подтверждения
        this.dialogRef.close({ mergedData: data });

      } catch (retryError) {
        console.error('Ошибка при повторной отправке (после апрува):', retryError);
        this.isLoading = false;
      }
    } else {
      // Пользователь нажал "НЕТ" (Оставить как есть)
      // Ничего не делаем, файлы остаются в списке, пользователь может их изменить
      console.log('Пользователь отменил замену дубликатов');
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
