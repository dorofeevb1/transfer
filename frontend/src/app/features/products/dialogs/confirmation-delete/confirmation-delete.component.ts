import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmationDialogData {
  title: string;
  message: string;
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
