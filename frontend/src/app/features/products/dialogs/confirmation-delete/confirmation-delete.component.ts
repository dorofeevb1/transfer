import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ThemePalette } from '@angular/material/core';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  subtext?: string;        // Опциональный подтекст
  confirmText?: string;    // Текст кнопки подтверждения
  cancelText?: string;     // Текст кнопки отмены
  confirmColor?: ThemePalette; // Цвет кнопки (warn/primary/accent)
}

@Component({
  selector: 'app-confirmation-delete',
  templateUrl: './confirmation-delete.component.html',
  styleUrls: ['./confirmation-delete.component.scss']
})
export class ConfirmationDeleteComponent {

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) { }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
