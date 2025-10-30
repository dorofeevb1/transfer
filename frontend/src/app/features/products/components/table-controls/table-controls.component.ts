import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AppliedFilter } from '../table/table.component';

@Component({
  selector: 'app-table-controls',
  templateUrl: './table-controls.component.html',
  styleUrls: ['./table-controls.component.scss']
})
export class TableControlsComponent {
  @Input() allColumns: { id: string, name: string }[] = [];
  @Input() columnsForm!: FormGroup;
  @Input() activeFilterCount = 0;
  @Input() appliedFilters: AppliedFilter[] = [];
  @Input() selectionHasValue = false;
  @Input() selectionCount = 0;
  @Input() isBulkEditMode = false;

  @Output() editClick = new EventEmitter<void>();
  @Output() saveClick = new EventEmitter<void>();
  @Output() cancelClick = new EventEmitter<void>();
  @Output() deleteClick = new EventEmitter<void>();
  @Output() globalFilterChange = new EventEmitter<Event>();
  @Output() toggleFilter = new EventEmitter<void>();
  @Output() applyColumnChanges = new EventEmitter<void>();
  @Output() removeFilter = new EventEmitter<string>();
  @Output() exportToExcel = new EventEmitter<void>();
  @Output() exportToCsv = new EventEmitter<void>();
}
