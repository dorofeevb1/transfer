import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RfiService } from '../../services/rfi.service';
import { RfiTransformPreview } from '../../models/rfi.interfaces';

@Component({
  selector: 'app-rfi-transform-dialog',
  templateUrl: './rfi-transform-dialog.component.html',
  styleUrls: ['./rfi-transform-dialog.component.scss']
})
export class RfiTransformDialogComponent implements OnInit {
  preview: RfiTransformPreview | null = null;
  isLoading = true;
  isTransforming = false;
  errorMessage = '';

  constructor(
    public dialogRef: MatDialogRef<RfiTransformDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { rfiId: string },
    private rfiService: RfiService
  ) {}

  ngOnInit(): void {
    this.loadPreview();
  }

  loadPreview(): void {
    this.isLoading = true;
    this.rfiService.previewTransform(this.data.rfiId).subscribe({
      next: (preview) => {
        this.preview = preview;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to load preview';
        this.isLoading = false;
      }
    });
  }

  get hasErrors(): boolean {
    return (this.preview?.error_count ?? 0) > 0;
  }

  get hasConflicts(): boolean {
    return (this.preview?.conflict_count ?? 0) > 0;
  }

  onConfirm(): void {
    if (this.isTransforming) return;

    this.isTransforming = true;
    this.rfiService.confirmTransform(this.data.rfiId).subscribe({
      next: (result) => {
        this.dialogRef.close({ ...result, success: true });
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Transform failed';
        this.isTransforming = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
