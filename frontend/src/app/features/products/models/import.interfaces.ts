export interface ImportPreviewResponse {
  create_count: number;
  update_count: number;
  error_count: number;
  conflict_count: number;
  errors: ImportRowError[];
  conflicts: ImportConflict[];
  preview_rows: ImportPreviewRow[];
  session_id: string;
  warnings: ImportWarning[];
}

export interface ImportRowError {
  row_index: number;
  field: string;
  message: string;
  value?: string;
}

export interface ImportConflict {
  row_index: number;
  article: string;
  field: string;
  old_value: string;
  new_value: string;
}

export interface ImportPreviewRow {
  row_index: number;
  article: string;
  name: string;
  action: 'create' | 'update' | 'error';
  generated_article?: string;
}

export interface ImportWarning {
  type: 'mass_change' | 'price_change';
  message: string;
  affected_count: number;
  threshold: string;
}
