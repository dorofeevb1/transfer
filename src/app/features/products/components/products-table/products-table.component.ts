import { AfterViewInit, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSort } from '@angular/material/sort';
import { TranslateService } from '@ngx-translate/core';
@Component({
  selector: 'app-products-table',
  templateUrl: './products-table.component.html',
  styleUrls: ['./products-table.component.scss']
})
export class ProductsTableComponent implements AfterViewInit {
  @Input() dataSource!: MatTableDataSource<any>;
  @Input() selection!: SelectionModel<any>;
  @Input() allColumns: { id: string, name: string }[] = [];
  @Input() columnsToRender: string[] = [];
  @Input() isAllSelected = false;
  @Input() isBulkEditMode = false;

  @Output() removeColumnClick = new EventEmitter<{ columnId: string, event: MouseEvent }>();
  @Output() photoViewerClick = new EventEmitter<string[]>();
  @Output() masterToggleClick = new EventEmitter<void>();
  @Output() rowToggleClick = new EventEmitter<any>();
  @Output() sortChange = new EventEmitter<MatSort>();

  @ViewChild(MatSort) sort!: MatSort;
  constructor(
    private translate: TranslateService
  ) { }
  
  ngAfterViewInit() {
    this.sortChange.emit(this.sort);
  }

  isImageArray(value: any): boolean {
    return Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0].startsWith('data:image');
  }

  checkboxLabel(row?: any): string {
    if (!row) {
      const labelKey = this.isAllSelected ? 'TABLE.DESELECT_ALL_ARIA' : 'TABLE.SELECT_ALL_ARIA';
      return this.translate.instant(labelKey);
    }
    const labelKey = this.selection.isSelected(row) ? 'TABLE.DESELECT_ROW_ARIA' : 'TABLE.SELECT_ROW_ARIA';
    return this.translate.instant(labelKey);
  }
}