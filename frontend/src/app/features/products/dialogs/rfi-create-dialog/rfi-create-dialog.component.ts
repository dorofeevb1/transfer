import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { RfiService } from '../../services/rfi.service';
import { RfiTemplate } from '../../models/rfi.interfaces';

@Component({
  selector: 'app-rfi-create-dialog',
  templateUrl: './rfi-create-dialog.component.html',
  styleUrls: ['./rfi-create-dialog.component.scss']
})
export class RfiCreateDialogComponent implements OnInit {
  form!: FormGroup;
  templates: RfiTemplate[] = [];
  selectedTemplate: RfiTemplate | null = null;
  isLoading = false;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RfiCreateDialogComponent>,
    private rfiService: RfiService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      supplier: ['', Validators.required],
      deadline: ['', Validators.required],
      template_id: [''],
      comment: [''],
      lines: this.fb.array([])
    });

    this.isLoading = true;
    this.rfiService.getTemplates().subscribe({
      next: (templates) => {
        this.templates = templates;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  get linesArray(): FormArray {
    return this.form.get('lines') as FormArray;
  }

  onTemplateChange(templateId: string): void {
    this.selectedTemplate = this.templates.find(t => t.id === templateId) || null;
    // Clear existing lines and add template fields
    this.linesArray.clear();
    if (this.selectedTemplate) {
      this.addLine();
    }
  }

  addLine(): void {
    const lineGroup: { [key: string]: any } = {
      name: ['', Validators.required],
      article: [''],
      quantity: [null],
      price: [null],
      comment: ['']
    };
    this.linesArray.push(this.fb.group(lineGroup));
  }

  removeLine(index: number): void {
    this.linesArray.removeAt(index);
  }

  onSave(): void {
    if (this.form.invalid || this.isSaving) return;

    this.isSaving = true;
    const value = this.form.value;

    this.rfiService.createRfi({
      supplier: value.supplier,
      deadline: value.deadline,
      template_id: value.template_id || undefined,
      comment: value.comment || undefined,
      lines: value.lines
    }).subscribe({
      next: (created) => {
        this.dialogRef.close(created);
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
