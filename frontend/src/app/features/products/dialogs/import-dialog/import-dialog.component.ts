import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ProductTableService } from 'src/app/core/services/api-service/product-table-service';
import { ExcelProcessingService } from 'src/app/core/services/excel-processing.service';
import { ConfirmationDeleteComponent } from '../confirmation-delete/confirmation-delete.component';
import { ImportPreviewResponse } from '../../models/import.interfaces';

type ImportStep = 'upload' | 'preview';

@Component({
  selector: 'app-import-dialog',
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss']
})
export class ImportDialogComponent {
  files: File[] = [];
  isLoading = false;
  isDragOver = false;
  step: ImportStep = 'upload';

  preview: ImportPreviewResponse | null = null;
  isCommitting = false;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    public dialogRef: MatDialogRef<ImportDialogComponent>,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private excelService: ExcelProcessingService,
    private productTableService: ProductTableService
  ) {}

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

  // Step 1: Parse files and get preview from backend
  async onImport(): Promise<void> {
    if (this.files.length === 0) return;

    this.isLoading = true;

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

    try {
      // Try preview endpoint first
      const previewResponse = await firstValueFrom(
        this.productTableService.previewImport(dataToSend)
      );
      this.preview = previewResponse;
      this.step = 'preview';
      this.isLoading = false;
    } catch (previewError: any) {
      // Fallback to old import flow if preview endpoint doesn't exist (404)
      if (previewError.status === 404) {
        await this.legacyImport(dataToSend);
      } else {
        console.error('Ошибка предпросмотра:', previewError);
        const errorMsg = previewError.error?.error || previewError.message || 'Произошла ошибка';
        this.snackBar.open(errorMsg, 'Закрыть', { duration: 5000 });
        this.isLoading = false;
      }
    }
  }

  // Step 2: Confirm and commit import
  async onCommit(): Promise<void> {
    if (!this.preview || this.isCommitting) return;

    // Check for mass change warnings
    if (this.preview.warnings && this.preview.warnings.length > 0) {
      const confirmed = await this.confirmMassChanges();
      if (!confirmed) return;
    }

    this.isCommitting = true;

    try {
      await firstValueFrom(
        this.productTableService.commitImport(this.preview.session_id, true)
      );
      this.dialogRef.close({ success: true });
    } catch (error: any) {
      console.error('Ошибка коммита импорта:', error);

      const responseMsg = error.error?.massege || error.error?.message || '';
      if (responseMsg.toLowerCase().includes('поля повторяються') || error.status === 409) {
        await this.handleDuplicateConflictForCommit();
      } else {
        const errorMsg = error.error?.error || error.message || 'Произошла ошибка';
        this.snackBar.open(errorMsg, 'Закрыть', { duration: 5000 });
        this.isCommitting = false;
      }
    }
  }

  private async confirmMassChanges(): Promise<boolean> {
    const warnings = this.preview!.warnings;
    const message = warnings.map(w => w.message).join('\n');

    const dialogRef = this.dialog.open(ConfirmationDeleteComponent, {
      width: '450px',
      data: {
        title: 'Предупреждение',
        message: message,
        confirmText: 'Продолжить',
        cancelText: 'Отмена'
      }
    });

    return (await firstValueFrom(dialogRef.afterClosed())) === true;
  }

  private async handleDuplicateConflictForCommit(): Promise<void> {
    this.isCommitting = false;
    const dialogRef = this.dialog.open(ConfirmationDeleteComponent, {
      width: '450px',
      data: {
        title: 'Замена данных',
        message: 'Найдены повторяющиеся поля. Заменить их новыми данными из файла?',
        confirmText: 'Заменить',
        cancelText: 'Оставить старые',
        confirmColor: 'primary'
      }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result === true && this.preview) {
      this.isCommitting = true;
      try {
        await firstValueFrom(
          this.productTableService.commitImport(this.preview.session_id, true)
        );
        this.dialogRef.close({ success: true });
      } catch (retryError) {
        console.error('Ошибка при повторной отправке:', retryError);
        this.isCommitting = false;
      }
    }
  }

  // Fallback: legacy import flow (no preview endpoint)
  private async legacyImport(dataToSend: any[]): Promise<void> {
    try {
      await firstValueFrom(this.productTableService.sendImportDataToBackend(dataToSend, false));
      this.dialogRef.close({ success: true });
    } catch (error: any) {
      console.error('Ошибка отправки на сервер:', error);
      const responseMsg = error.error?.massege || error.error?.message || '';

      if (responseMsg.toLowerCase().includes('поля повторяються') || error.status === 409) {
        await this.handleDuplicateConflict(dataToSend);
      } else if (error.status === 403) {
        const errorMsg = error.error?.error || 'Доступ запрещен';
        this.snackBar.open(errorMsg, 'Закрыть', { duration: 5000, panelClass: ['error-snackbar'] });
        this.isLoading = false;
      } else {
        const errorMsg = error.error?.error || error.message || 'Произошла ошибка';
        this.snackBar.open(errorMsg, 'Закрыть', { duration: 5000, panelClass: ['error-snackbar'] });
        this.isLoading = false;
      }
    }
  }

  private async handleDuplicateConflict(data: any): Promise<void> {
    this.isLoading = false;
    const dialogRef = this.dialog.open(ConfirmationDeleteComponent, {
      width: '450px',
      data: {
        title: 'Замена данных',
        message: 'Найдены повторяющиеся поля. Заменить их новыми данными из файла?',
        subtext: 'Старые значения будут потеряны',
        confirmText: 'Заменить',
        cancelText: 'Оставить старые',
        confirmColor: 'primary'
      }
    });
    const result = await firstValueFrom(dialogRef.afterClosed());

    if (result === true) {
      this.isLoading = true;
      try {
        await firstValueFrom(this.productTableService.sendImportDataToBackend(data, true));
        this.dialogRef.close({ success: true });
      } catch (retryError) {
        console.error('Ошибка при повторной отправке (после апрува):', retryError);
        this.isLoading = false;
      }
    }
  }

  backToUpload(): void {
    this.step = 'upload';
    this.preview = null;
    this.isCommitting = false;
  }

  get hasPreviewErrors(): boolean {
    return (this.preview?.error_count ?? 0) > 0;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
