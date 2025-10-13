import { AfterViewInit, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSort } from '@angular/material/sort';
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
  @Input() isAllSelected = false; // Получаем готовое значение от родителя
  @Input() isBulkEditMode = false;

  @Output() removeColumnClick = new EventEmitter<{ columnId: string, event: MouseEvent }>();
  @Output() photoViewerClick = new EventEmitter<string[]>();
  @Output() masterToggleClick = new EventEmitter<void>(); // Новое событие
  @Output() rowToggleClick = new EventEmitter<any>();    // Новое событие
  @Output() sortChange = new EventEmitter<MatSort>();

  @ViewChild(MatSort) sort!: MatSort;

  ngAfterViewInit() {
    this.sortChange.emit(this.sort);
  }

  isImageArray(value: any): boolean {
    return Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0].startsWith('data:image');
  }

  checkboxLabel(row?: any): string {
    if (!row) {
      return `${this.isAllSelected ? 'снять' : 'выбрать'} все`;
    }
    return `${this.selection.isSelected(row) ? 'снять' : 'выбрать'} строку`;
  }
}