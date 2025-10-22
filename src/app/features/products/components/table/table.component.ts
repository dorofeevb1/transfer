import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { TranslateService } from '@ngx-translate/core';
import { ImportDialogComponent } from '../../dialogs/import-dialog/import-dialog.component';
import { SelectionModel } from '@angular/cdk/collections';
import { PhotoViewerComponent } from '../../dialogs/photo-viewer/photo-viewer.component';
import { EditDialogComponent } from '../../dialogs/edit-dialog/edit-dialog.component';
import { ConfirmationDeleteComponent } from '../../dialogs/confirmation-delete/confirmation-delete.component';
import { AddColumnDialogComponent } from '../../dialogs/add-column-dialog/add-column-dialog.component';
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

  allColumns: { id: string, name: string }[] = [];
  displayedColumns: string[] = [];
  columnsForm: FormGroup;
  isBulkEditMode = false;

  filterForm: FormGroup;
  activeFilterCount = 0;
  appliedFilters: AppliedFilter[] = [];

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

    // Загрузка данных через сервис
    this.productTableService.loadTableData();
    this.productTableService.rows$.subscribe(data => {
      this.updateTableData(data);
    });
    this.productTableService.columns$.subscribe(columns => {
      this.allColumns = columns;
      this.displayedColumns = ['select', ...columns.map(c => c.id)];
      this.setupForms();
    });
  }


  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
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

  updateTableData(data: any[]): void {
    if (data && data.length > 0) {
      const columns = data.reduce((acc: string[], obj: any) => {
        Object.keys(obj).forEach(key => !acc.includes(key) && acc.push(key));
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
      // взять изменённые данные из editCache, если используете
      return this.editCache.get(item.id) ?? item;
    });

    // Отправить обновления на сервер
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

  // onDeleteSelected(): void {
  //   const selectedCount = this.selection.selected.length;
  //   if (selectedCount === 0) return;

  //   this.translate.get([
  //     'DIALOGS.CONFIRM_DELETE_TITLE',
  //     'DIALOGS.CONFIRM_DELETE_MESSAGE'
  //   ], { count: selectedCount }).subscribe(translations => {
  //     const dialogRef = this.dialog.open(ConfirmationDeleteComponent, {
  //       width: '400px',
  //       data: {
  //         title: translations['DIALOGS.CONFIRM_DELETE_TITLE'],
  //         message: translations['DIALOGS.CONFIRM_DELETE_MESSAGE']
  //       }
  //     });
  //     dialogRef.afterClosed().subscribe(confirmed => {
  //       if (confirmed) {
  //         const idsToDelete = new Set(this.selection.selected.map(item => item.id));

  //         this.dataSource.data = this.dataSource.data.filter(item => !idsToDelete.has(item.id));
  //         this.selection.clear();
  //       }
  //     });
  //   });
  // }

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
            // Обновляем локальные данные таблицы после удаления
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
      // Если строка поиска очищена, можно заново загрузить все данные
      this.productTableService.loadTableData();
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

  // addColumn(): void {
  //   this.translate.get('DIALOGS.ADD_COLUMN_TITLE').subscribe(title => {
  //     const dialogRef = this.dialog.open(AddColumnDialogComponent, {
  //       width: '400px',
  //       data: { title: title }
  //     });

  //     dialogRef.afterClosed().subscribe(newColumnName => {
  //       if (newColumnName && !this.allColumns.some(c => c.id === newColumnName)) {
  //         this.allColumns.push({ id: newColumnName, name: newColumnName });
  //         this.dataSource.data.forEach(row => row[newColumnName] = '');
  //         this.setupForms();
  //         this.dataSource.data = [...this.dataSource.data];
  //       }
  //     });
  //   });
  // }
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
          this.productTableService.sendNewColumnToBackend(newColumnName).subscribe({
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

  async handleExportToExcel(): Promise<void> {
    const dataToExport = this.dataSource.data;

    if (!dataToExport || dataToExport.length === 0 || this.isExporting) {
      if (this.isExporting) console.log('Экспорт уже выполняется...');
      else console.warn('Нет данных для экспорта.');
      return;
    }

    const imageKey = '_Images';
    const specialKeysToExclude = ['select', 'actions', imageKey];

    if (!this.allColumns) {
      console.error(
        'Конфигурация колонок (allColumns) не найдена. Экспорт невозможен.'
      );
      return;
    }

    const columnsConfig = this.allColumns
      .filter((col) => !specialKeysToExclude.includes(col.id))
      .map((col) => ({
        key: col.id,
        header: col.name,
      }));

    this.isExporting = true;
    console.log('Начинается экспорт в Excel, формируем файл...');

    try {
      await this.exportService.exportAsExcelWithImages(
        dataToExport,
        'brio_trade_export',
        columnsConfig,
        imageKey
      );
      this.productTableService.sendExportDataToBackend(dataToExport).subscribe({
        next: () => console.log('Данные успешно отправлены на сервер'),
        error: (error) => console.error('Ошибка отправки данных на сервер', error),
      });
    } catch (error) {
      console.error(
        'Произошла критическая ошибка во время экспорта:',
        error
      );
    } finally {
      this.isExporting = false;
      console.log('Экспорт в Excel завершен!');
    }
  }

  handleExportToCsv(): void {
    const dataToExport = this.dataSource.data;
    if (dataToExport && dataToExport.length > 0) {
      this.exportService.exportAsCsvFile(dataToExport, 'brio_trade_export');
    } else {
      console.warn('Нет данных для экспорта.');
    }
  }

}






































