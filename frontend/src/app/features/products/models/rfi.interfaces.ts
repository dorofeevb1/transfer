export type RfiStatus = 'draft' | 'ready_to_send' | 'sent' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';

export interface RfiLine {
  id?: string;
  rfi_id: string;
  article?: string;
  name: string;
  quantity?: number;
  price?: number;
  comment?: string;
  [key: string]: any;
}

export interface Rfi {
  id: string;
  number: string;           // RFI-000001
  status: RfiStatus;
  supplier: string;
  deadline: string;          // ISO date
  author: string;
  created_at: string;
  updated_at: string;
  lines_count: number;
  template_id?: string;
  comment?: string;
}

export interface RfiDetail extends Rfi {
  lines: RfiLine[];
  history: RfiHistoryEntry[];
}

export interface RfiHistoryEntry {
  id: string;
  status_from: RfiStatus;
  status_to: RfiStatus;
  changed_by: string;
  changed_at: string;
  comment?: string;
}

export interface RfiTemplate {
  id: string;
  name: string;
  fields: RfiTemplateField[];
  version: number;
}

export interface RfiTemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];
}

export interface RfiListResponse {
  items: Rfi[];
  totalCount: number;
}

export interface RfiTransformPreview {
  create_count: number;
  update_count: number;
  error_count: number;
  conflict_count: number;
  errors: RfiTransformError[];
  conflicts: RfiTransformConflict[];
}

export interface RfiTransformError {
  line_index: number;
  article?: string;
  field: string;
  message: string;
}

export interface RfiTransformConflict {
  line_index: number;
  article: string;
  field: string;
  old_value: string;
  new_value: string;
}
