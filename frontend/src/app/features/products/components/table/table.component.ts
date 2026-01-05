import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { SelectionModel } from '@angular/cdk/collections';

// Компоненты диалогов
import { ImportDialogComponent } from '../../dialogs/import-dialog/import-dialog.component';
import { PhotoViewerComponent } from '../../dialogs/photo-viewer/photo-viewer.component';
import { EditDialogComponent } from '../../dialogs/edit-dialog/edit-dialog.component';
import { ConfirmationDeleteComponent } from '../../dialogs/confirmation-delete/confirmation-delete.component';
import { AddColumnDialogComponent } from '../../dialogs/add-column-dialog/add-column-dialog.component';

// Сервисы
import { ExportService } from 'src/app/core/services/export.service';
import { ProductTableService } from 'src/app/core/services/api-service/product-table-service';

export interface AppliedFilter {
  key: string;
  value: string;
}

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit, AfterViewInit {
  private langSub: any;

  allColumns: { id: string, name: string }[] = [];
  displayedColumns: string[] = [];
  columnsForm: FormGroup;
  isBulkEditMode = false;

  filterForm: FormGroup;
  activeFilterCount = 0;
  appliedFilters: AppliedFilter[] = [];

  searchQuery = '';

  totalCount = 0;
  dataSource = new MatTableDataSource<any>();
  selection = new SelectionModel<any>(true, []);

  isExporting = false;
  private editCache = new Map<string, any>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('filterSidenav') filterSidenav!: MatSidenav;

  constructor(
    public dialog: MatDialog,
    private fb: FormBuilder,
    private exportService: ExportService,
    private translate: TranslateService,
    private productTableService: ProductTableService
  ) {
    this.filterForm = this.fb.group({});
    this.columnsForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = this.createFilterPredicate();

    this.productTableService.loadTableData(0, 10);
    this.productTableService.rows$.subscribe(data => {
      this.updateTableData(data);
    });
    this.langSub = this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      // перезагружаем таблицу при смене языка
      const pageIndex = this.paginator?.pageIndex ?? 0;
      const pageSize = this.paginator?.pageSize ?? 10;
      const sortField = this.dataSource.sort?.active;
      const sortDir = this.dataSource.sort?.direction;
      const filters = this.filterForm.value;

      this.productTableService.loadTableData(pageIndex, pageSize, sortField, sortDir, filters);
    });

    // 👇 ИСПРАВЛЕНИЕ ЗДЕСЬ 👇
    this.productTableService.columns$.subscribe(columns => {
      const junkKeys = ['фотографии', 'фото', 'image', 'img', 'picture', 'изображение'];
      // Колонки, которые НЕ фильтруем (наши правильные колонки с фото)
      const allowedPhotoColumns = ['photos', 'photos_list'];

      // Фильтруем колонки, пришедшие с сервера
      const cleanColumns = columns.filter(col => {
        const lowerKey = col.id.toLowerCase();
        // Если это наша правильная колонка - пропускаем
        if (allowedPhotoColumns.includes(lowerKey)) {
          return true;
        }
        // Если ключ содержит запрещенное слово - фильтруем
        const isJunk = junkKeys.some(junk => lowerKey.includes(junk));
        return !isJunk;
      });

      this.allColumns = cleanColumns;
      this.displayedColumns = ['select', ...cleanColumns.map(c => c.id)];
      this.setupForms();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void {
    if (this.langSub) {
      this.langSub.unsubscribe();
    }
  }

  setSort(sort: MatSort): void {
    this.dataSource.sort = sort;
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(ImportDialogComponent, { width: '550px', disableClose: true });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.mergedData && result.mergedData.length > 0) {
        this.updateTableData([...this.dataSource.data, ...result.mergedData]);
      }
    });
  }

  // --- ОБНОВЛЕНИЕ ТАБЛИЦЫ ---
  updateTableData(data: any[]): void {
    if (data && data.length > 0) {
      // Ключевые слова-мусор
      const junkKeys = ['фотографии', 'фото', 'image', 'img', 'picture', 'изображение'];
      // Колонки, которые НЕ фильтруем (наши правильные колонки с фото)
      const allowedPhotoColumns = ['photos', 'photos_list'];

      const columns = data.reduce((acc: string[], obj: any) => {
        Object.keys(obj).forEach(key => {
          const lowerKey = key.toLowerCase();

          // Если уже добавили - пропускаем
          if (acc.includes(key)) return;

          // Если это наша правильная колонка - добавляем
          if (allowedPhotoColumns.includes(lowerKey)) {
            acc.push(key);
            return;
          }

          // Фильтр мусора: если ключ содержит запрещенное слово - не добавляем
          if (junkKeys.some(junk => lowerKey.includes(junk))) {
            return;
          }

          acc.push(key);
        });
        return acc;
      }, []);

      this.allColumns = columns.map(col => ({ id: col, name: col }));
      this.displayedColumns = ['select', ...columns];
      this.setupForms();
      this.dataSource.data = data;
    } else {
      this.dataSource.data = [];
      this.allColumns = [];
      this.displayedColumns = [];
      this.setupForms();
    }
  }

  // ... (методы onEditClick, onSaveBulkChanges, onCancelBulkEdit, onDeleteSelected - без изменений) ...
  onEditClick(): void {
    const selectedItems = this.selection.selected;
    if (selectedItems.length === 1) {
      const dialogRef = this.dialog.open(EditDialogComponent, {
        data: { ...selectedItems[0] },
        height: '100vh', width: '500px', position: { top: '0', right: '0' },
        hasBackdrop: false, panelClass: 'edit-dialog-panel'
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          const index = this.dataSource.data.findIndex(item => item.id === result.id);
          if (index !== -1) {
            this.dataSource.data[index] = result;
            this.dataSource.data = [...this.dataSource.data];
          }
        }
        this.selection.clear();
      });
    } else if (selectedItems.length > 1) {
      selectedItems.forEach(item => this.editCache.set(item.id, { ...item }));
      this.isBulkEditMode = true;
    }
  }

  onSaveBulkChanges(): void {
    const changedRows = this.selection.selected.map(item => {
      return this.editCache.get(item.id) ?? item;
    });

    changedRows.forEach(row => {
      this.productTableService.updateRow(row.id, row).subscribe(updatedRow => {
        const index = this.dataSource.data.findIndex(d => d.id === updatedRow.id);
        if (index !== -1) {
          this.dataSource.data[index] = updatedRow;
        }
      });
    });

    this.isBulkEditMode = false;
    this.selection.clear();
    this.editCache.clear();
  }

  onCancelBulkEdit(): void {
    this.selection.selected.forEach(row => {
      const originalRow = this.editCache.get(row.id);
      if (originalRow) {
        const index = this.dataSource.data.findIndex(item => item.id === row.id);
        if (index !== -1) this.dataSource.data[index] = originalRow;
      }
    });
    this.dataSource.data = [...this.dataSource.data];
    this.isBulkEditMode = false;
    this.selection.clear();
    this.editCache.clear();
  }

  onDeleteSelected(): void {
    const selectedCount = this.selection.selected.length;
    if (selectedCount === 0) return;

    this.translate.get([
      'DIALOGS.CONFIRM_DELETE_TITLE',
      'DIALOGS.CONFIRM_DELETE_MESSAGE'
    ], { count: selectedCount }).subscribe(translations => {
      const dialogRef = this.dialog.open(ConfirmationDeleteComponent, {
        width: '400px',
        data: {
          title: translations['DIALOGS.CONFIRM_DELETE_TITLE'],
          message: translations['DIALOGS.CONFIRM_DELETE_MESSAGE']
        }
      });
      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          const idsToDelete = this.selection.selected.map(item => item.id);
          this.productTableService.deleteRows(idsToDelete).subscribe(() => {
            this.dataSource.data = this.dataSource.data.filter(item => !idsToDelete.includes(item.id));
            this.selection.clear();
          });
        }
      });
    });
  }


  openPhotoViewer(photos: string[]): void {
    if (Array.isArray(photos) && photos.length > 0 && typeof photos[0] === 'string' && photos[0].startsWith('data:image')) {
      this.dialog.open(PhotoViewerComponent, { width: '80vw', height: '80vh', data: { photos } });
    }
  }


  setupForms(): void {
    const filterControls: { [key: string]: FormControl } = {};
    const columnControls: { [key: string]: FormControl } = {};
    this.allColumns.forEach(col => {
      filterControls[col.id] = new FormControl('');
      columnControls[col.id] = new FormControl(this.displayedColumns.includes(col.id));
    });
    this.filterForm = this.fb.group(filterControls);
    this.columnsForm = this.fb.group(columnControls);
  }


  applySideNavFilters(): void {
    const values = this.filterForm.value;
    this.appliedFilters = Object.entries(values)
      .filter(([_, value]) => !!value)
      .map(([key, value]) => ({ key, value: String(value) }));
    this.activeFilterCount = this.appliedFilters.length;
    this.dataSource.filter = JSON.stringify(values);
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
    this.filterSidenav.close();
  }


  resetSideNavFilters(): void {
    this.filterForm.reset();
    this.applySideNavFilters();
  }


  onRemoveFilter(key: string): void {
    this.filterForm.get(key)?.setValue('');
    this.applySideNavFilters();
  }


  applyGlobalFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchQuery = filterValue;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
    if (filterValue.length > 0) {
      this.productTableService.searchTableData(filterValue).subscribe({
        next: (searchResults) => {
          this.updateTableData(searchResults);
        },
        error: (err) => console.error('Ошибка поиска на сервере: ', err),
      });
    } else {
      this.productTableService.loadTableData(0, 100);
    }
  }


  createFilterPredicate(): (data: any, filter: string) => boolean {
    return (data: any, filter: string): boolean => {
      try {
        const searchTerms = JSON.parse(filter);
        return Object.keys(searchTerms).every(key => {
          const term = searchTerms[key];
          if (!term) return true;
          return String(data[key]).toLowerCase().includes(term.toLowerCase());
        });
      } catch (e) {
        return JSON.stringify(data).toLowerCase().includes(filter);
      }
    };
  }


  applyColumnChanges(): void {
    this.displayedColumns = this.allColumns
      .filter(col => this.columnsForm.value[col.id])
      .map(col => col.id);
    this.displayedColumns.unshift('select');
  }


  addColumn(): void {
    this.translate.get('DIALOGS.ADD_COLUMN_TITLE').subscribe(title => {
      const dialogRef = this.dialog.open(AddColumnDialogComponent, {
        width: '400px',
        data: { title: title }
      });
      dialogRef.afterClosed().subscribe(newColumnName => {
        if (newColumnName && !this.allColumns.some(c => c.id === newColumnName)) {
          this.allColumns.push({ id: newColumnName, name: newColumnName });
          this.dataSource.data.forEach(row => row[newColumnName] = '');
          this.setupForms();
          this.dataSource.data = [...this.dataSource.data];
          this.productTableService.addColumn({ name: newColumnName, type: 'text' }).subscribe({
            next: () => console.log('Новый столбец успешно отправлен на сервер'),
            error: (err: any) => console.error('Ошибка отправки нового столбца', err),
          });
        }
      });
    });
  }


  removeColumn(columnName: string, event: MouseEvent): void {
    event.stopPropagation();
    this.translate.get([
      'DIALOGS.CONFIRM_DELETE_COLUMN_TITLE',
      'DIALOGS.CONFIRM_DELETE_COLUMN_MESSAGE'
    ], { columnName: columnName }).subscribe(translations => {
      const dialogRef = this.dialog.open(ConfirmationDeleteComponent, {
        width: '400px',
        data: {
          title: translations['DIALOGS.CONFIRM_DELETE_COLUMN_TITLE'],
          message: translations['DIALOGS.CONFIRM_DELETE_COLUMN_MESSAGE']
        }
      });
      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.allColumns = this.allColumns.filter(c => c.id !== columnName);
          this.displayedColumns = this.displayedColumns.filter(id => id !== columnName);
          this.dataSource.data.forEach(row => delete row[columnName]);
          this.setupForms();
          this.dataSource.data = [...this.dataSource.data];
        }
      });
    });
  }


  get columnsToRender(): string[] {
    return this.displayedColumns;
  }


  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }


  masterToggle(): void {
    this.isAllSelected() ? this.selection.clear() : this.dataSource.data.forEach(row => this.selection.select(row));
  }


  handleExportToExcel(): void {
    if (this.isExporting) return;
    this.isExporting = true;
    console.log('Запрос Excel файла с сервера...');

    const currentFilters = this.filterForm.value;
    const currentSearch = this.dataSource.filter;
    const selectedIds: string[] = this.selection.selected.map(row => row.id);
    const selectedColumns: string[] = this.getSelectedColumnIds(); // ← добавили колонки

    // Твой нужный payload
    const payload = {
      ids: selectedIds,
      columns: selectedColumns,
      searchQuery: currentSearch || ''
    };

    this.productTableService.downloadExcel(payload).subscribe({
      next: (blob: Blob) => {
        const prefix = selectedIds.length > 0 ? 'selected_' : '';
        const fileName = `${prefix}products_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        this.saveFile(blob, fileName);
        this.isExporting = false;
      },
      error: (err) => {
        console.error('Ошибка при скачивании Excel:', err);
        this.isExporting = false;
      }
    });
  }

  private getSelectedColumnIds(): string[] {
    const formValue = this.columnsForm.value;
    return Object.keys(formValue)
      .filter(key => formValue[key]); // только отмеченные чекбоксы колонок
  }

  // --- ЭКСПОРТ CSV ---
  handleExportToCsv(): void {
    if (this.isExporting) return;
    this.isExporting = true;
    console.log('Запрос CSV файла с сервера...');

    const currentFilters = this.filterForm.value;
    const currentSearch = this.dataSource.filter;
    const selectedIds: string[] = this.selection.selected.map(row => row.id);
    const selectedColumns: string[] = this.getSelectedColumnIds(); // ← добавили колонки

    // Твой нужный payload
    const payload = {
      ids: selectedIds,
      columns: selectedColumns,
      searchQuery: currentSearch || ''
    };

    this.productTableService.downloadCsv(payload).subscribe({
      next: (blob: Blob) => {
        const prefix = selectedIds.length > 0 ? 'selected_' : '';
        const fileName = `${prefix}products_export_${new Date().toISOString().slice(0, 10)}.csv`;
        this.saveFile(blob, fileName);
        this.isExporting = false;
      },
      error: (err) => {
        console.error('Ошибка при скачивании CSV:', err);
        this.isExporting = false;
      }
    });
  }

  /**
   * Вспомогательный метод для сохранения Blob как файла в браузере
   */
  private saveFile(blob: Blob, fileName: string): void {
    // Создаем ссылку на данные
    const url = window.URL.createObjectURL(blob);

    // Создаем временный элемент ссылки
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    // Кликаем по ней программно
    document.body.appendChild(a);
    a.click();

    // Удаляем элемент и освобождаем память
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  onPageChange(event: PageEvent): void {
    const pageIndex = event.pageIndex;
    const pageSize = event.pageSize;

    // Получаем текущие фильтры и сортировку
    const sortField = this.dataSource.sort?.active;
    const sortDir = this.dataSource.sort?.direction;
    const filters = this.filterForm.value;

    this.productTableService.loadTableData(pageIndex, pageSize, sortField, sortDir, filters);
  }

}
