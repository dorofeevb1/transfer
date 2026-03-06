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
import { FilterData } from '../../dialogs/filter-form/filter-form.component';

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
  showTable = true; // Флаг для пересоздания таблицы при смене языка

  filterForm: FormGroup;
  activeFilterCount = 0;
  appliedFilters: AppliedFilter[] = [];
  currentFilters: FilterData | null = null;

  searchQuery = '';

  totalCount = 0;
  dataSource = new MatTableDataSource<any>();
  selection = new SelectionModel<any>(true, []);
  selectAllRecords = false; // Флаг для выбора всех записей (не только на странице)
  showSelectAllBanner = false; // Показывать баннер с предложением выбрать все

  isExporting = false;
  private editCache = new Map<string, any>();
  private currentPageSize = 100;

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

    // Загружаем колонки с бэкенда (с локализацией)
    this.productTableService.loadTableStructure();

    // Загружаем данные
    this.productTableService.loadTableData(0, 100);
    this.productTableService.rows$.subscribe(data => {
      this.dataSource.data = data || [];
    });

    // Подписываемся на totalCount для пагинации
    this.productTableService.totalCount$.subscribe(count => {
      this.totalCount = count;
      if (this.paginator) {
        this.paginator.length = count;
      }
    });

    this.langSub = this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      // Обновляем localStorage перед запросом (на случай если ещё не обновился)
      localStorage.setItem('lang', event.lang);

      // Скрываем таблицу чтобы Angular пересоздал её с новыми колонками
      this.showTable = false;

      // перезагружаем колонки и данные при смене языка
      this.productTableService.loadTableStructure();

      const pageIndex = this.paginator?.pageIndex ?? 0;
      const pageSize = this.paginator?.pageSize ?? 100;
      const sortField = this.dataSource.sort?.active;
      const sortDir = this.dataSource.sort?.direction;
      const filters = this.filterForm.value;

      this.productTableService.loadTableData(pageIndex, pageSize, sortField, sortDir, filters);
      // showTable будет включен в подписке на columns$ после получения новых колонок
    });

    // Подписка на колонки с бэкенда
    this.productTableService.columns$.subscribe(columns => {
      const junkKeys = ['фотографии', 'фото', 'image', 'img', 'picture', 'изображение'];
      // Колонки, которые НЕ фильтруем (наши правильные колонки с фото)
      const allowedPhotoColumns = ['photos', 'photos_list'];
      // Колонки, которые скрываем
      const hiddenColumns = ['id', 'video_link'];

      // Порядок колонок согласно Excel шаблону
      const columnOrder = [
        'date_creation',
        'category_1',
        'category_2',
        'photos_list',
        'article',
        'name',
        'composition',
        'size_goods',
        'package_goods',
        'group_package',
        'quantum',
        'price_actual',
        'transport_box_load',
        'width_cm',
        'height_cm',
        'length_cm',
        'cbm',
        'gross_weight',
        'tn_ved_code',
        'tp',
        'rd',
        'risk',
        'vat',
        'amount_stores',
        'amount_pieces',
        'comments',
      ];


      // Фильтруем колонки, пришедшие с сервера
      const cleanColumns = columns.filter(col => {
        const lowerKey = col.id.toLowerCase();
        // Скрываем колонки из списка hiddenColumns
        if (hiddenColumns.includes(col.id)) {
          return false;
        }
        // Если это наша правильная колонка - пропускаем
        if (allowedPhotoColumns.includes(lowerKey)) {
          return true;
        }
        // Если ключ содержит запрещенное слово - фильтруем
        const isJunk = junkKeys.some(junk => lowerKey.includes(junk));
        return !isJunk;
      });

      // Сортируем колонки по заданному порядку
      const sortedColumns = cleanColumns.sort((a, b) => {
        const indexA = columnOrder.indexOf(a.id);
        const indexB = columnOrder.indexOf(b.id);
        // Если колонка не найдена в порядке - ставим в конец
        const orderA = indexA === -1 ? 999 : indexA;
        const orderB = indexB === -1 ? 999 : indexB;
        return orderA - orderB;
      });

      // Переименовываем колонки используя сервис переводов
      const renamedColumns = sortedColumns.map(col => ({
        ...col,
        name: this.translate.instant(`COLUMNS.${col.id}`) || col.name
      }));

      this.allColumns = renamedColumns;
      this.displayedColumns = ['select', ...renamedColumns.map(c => c.id)];
      this.setupForms();

      // Показываем таблицу после обновления колонок (с небольшой задержкой для Angular)
      if (!this.showTable) {
        setTimeout(() => {
          this.showTable = true;
        }, 10);
      }
    });
  }

  ngAfterViewInit(): void {
    // Не назначаем paginator на dataSource — используем серверную пагинацию
    // this.dataSource.paginator = this.paginator;
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
      if (result && result.success) {
        // После успешного импорта перезагружаем данные с сервера
        const pageIndex = this.paginator?.pageIndex ?? 0;
        const pageSize = this.paginator?.pageSize ?? 100;
        this.productTableService.loadTableData(pageIndex, pageSize);
      }
    });
  }

  // --- ОБНОВЛЕНИЕ ТАБЛИЦЫ ---
  updateTableData(data: any[]): void {
    // Теперь колонки приходят с бэкенда через columns$, здесь только данные
    this.dataSource.data = data || [];
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
    console.log('=== onSaveBulkChanges called ===');
    console.log('selection.selected:', this.selection.selected);
    console.log('selection.selected.length:', this.selection.selected.length);

    // Копируем массив ДО очистки selection
    const changedRows: any[] = [...this.selection.selected];

    if (changedRows.length === 0) {
      console.warn('No rows to save!');
      this.isBulkEditMode = false;
      return;
    }

    let completedCount = 0;
    const totalCount = changedRows.length;

    changedRows.forEach(row => {
      console.log('Saving row:', row, 'id:', row.id);
      if (!row.id) {
        console.error('Row has no id:', row);
        completedCount++;
        return;
      }
      this.productTableService.updateRow(row.id, row).subscribe({
        next: (updatedRow) => {
          console.log('Update success:', updatedRow);
          completedCount++;
          // Когда все запросы завершены - перезагружаем данные
          if (completedCount === totalCount) {
            const pageIndex = this.paginator?.pageIndex ?? 0;
            const pageSize = this.paginator?.pageSize ?? 100;
            this.productTableService.loadTableData(pageIndex, pageSize);
          }
        },
        error: (err) => {
          console.error('Error updating row:', err);
          completedCount++;
          // Даже при ошибке проверяем завершение
          if (completedCount === totalCount) {
            const pageIndex = this.paginator?.pageIndex ?? 0;
            const pageSize = this.paginator?.pageSize ?? 100;
            this.productTableService.loadTableData(pageIndex, pageSize);
          }
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
    this.clearSelection();
    this.editCache.clear();
  }

  onDeleteSelected(): void {
    const selectedCount = this.selectAllRecords ? this.totalCount : this.selection.selected.length;
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
          const idsToDelete = this.selectAllRecords ? [] : this.selection.selected.map(item => item.id);
          this.productTableService.deleteRows(idsToDelete).subscribe(() => {
            // Перезагружаем данные после удаления
            const pageIndex = this.paginator?.pageIndex ?? 0;
            const pageSize = this.paginator?.pageSize ?? 100;
            this.productTableService.loadTableData(pageIndex, pageSize);
            this.clearSelection();
          });
        }
      });
    });
  }


  openPhotoViewer(photos: string[]): void {
    if (!Array.isArray(photos) || photos.length === 0 || typeof photos[0] !== 'string') {
      return;
    }
    const first = photos[0];
    // Проверяем base64, URL или локальный путь /media/
    const isValidPhoto = first.startsWith('data:image') ||
      first.startsWith('http://') ||
      first.startsWith('https://') ||
      first.startsWith('/media/');
    if (isValidPhoto) {
      this.dialog.open(PhotoViewerComponent, { width: '80vw', height: '80vh', data: { photos } });
    }
  }

  openSinglePhoto(photo: string): void {
    if (!photo || typeof photo !== 'string') {
      return;
    }
    const isValidPhoto = photo.startsWith('data:image') ||
      photo.startsWith('http://') ||
      photo.startsWith('https://') ||
      photo.startsWith('/media/');
    if (isValidPhoto) {
      this.dialog.open(PhotoViewerComponent, {
        width: '80vw',
        height: '80vh',
        data: { photos: [photo], singleMode: true }
      });
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


  applySideNavFilters(filterData: FilterData): void {
    this.currentFilters = filterData;

    // Подсчитываем количество активных фильтров
    let count = 0;
    const applied: AppliedFilter[] = [];

    if (filterData.dateFrom || filterData.dateTo) {
      count++;
      const fromStr = filterData.dateFrom ? filterData.dateFrom.toLocaleDateString('ru-RU') : '';
      const toStr = filterData.dateTo ? filterData.dateTo.toLocaleDateString('ru-RU') : '';
      const dateValue = fromStr && toStr ? `${fromStr} - ${toStr}` : (fromStr || toStr);
      applied.push({ key: 'Дата', value: dateValue });
    }
    if (filterData.category1 && filterData.category1.length > 0) {
      count++;
      applied.push({ key: 'Категория 1', value: filterData.category1.join(', ') });
    }
    if (filterData.category2 && filterData.category2.length > 0) {
      count++;
      applied.push({ key: 'Категория 2', value: filterData.category2.join(', ') });
    }
    if (filterData.package && filterData.package.length > 0) {
      count++;
      applied.push({ key: 'Упаковка', value: filterData.package.join(', ') });
    }

    this.activeFilterCount = count;
    this.appliedFilters = applied;

    // Отправляем запрос на бэкенд
    const pageIndex = this.paginator?.pageIndex ?? 0;
    const pageSize = this.paginator?.pageSize ?? 100;

    this.productTableService.loadTableDataWithFilters(
      pageIndex,
      pageSize,
      filterData
    ).subscribe({
      next: (response) => {
        this.dataSource.data = response.rows || [];
        this.totalCount = response.totalCount || 0;
        if (this.paginator) {
          this.paginator.length = this.totalCount;
        }
      },
      error: (err) => console.error('Ошибка фильтрации:', err)
    });

    this.filterSidenav.close();
  }


  resetSideNavFilters(): void {
    this.filterForm.reset();
    this.currentFilters = null;
    this.activeFilterCount = 0;
    this.appliedFilters = [];

    // Перезагружаем данные без фильтров
    const pageIndex = this.paginator?.pageIndex ?? 0;
    const pageSize = this.paginator?.pageSize ?? 100;
    this.productTableService.loadTableData(pageIndex, pageSize);
  }


  onRemoveFilter(key: string): void {
    // Удаляем фильтр из списка примененных
    this.appliedFilters = this.appliedFilters.filter(f => f.key !== key);
    this.activeFilterCount = this.appliedFilters.length;

    // Обновляем currentFilters
    if (this.currentFilters) {
      if (key === 'Дата') {
        this.currentFilters.dateFrom = null;
        this.currentFilters.dateTo = null;
      } else if (key === 'Категория 1') {
        this.currentFilters.category1 = [];
      } else if (key === 'Категория 2') {
        this.currentFilters.category2 = [];
      } else if (key === 'Упаковка') {
        this.currentFilters.package = [];
      }

      // Перезапрашиваем данные с обновленными фильтрами
      const pageIndex = this.paginator?.pageIndex ?? 0;
      const pageSize = this.paginator?.pageSize ?? 100;

      if (this.activeFilterCount > 0) {
        this.productTableService.loadTableDataWithFilters(
          pageIndex,
          pageSize,
          this.currentFilters
        ).subscribe({
          next: (response) => {
            this.dataSource.data = response.rows || [];
            this.totalCount = response.totalCount || 0;
            if (this.paginator) {
              this.paginator.length = this.totalCount;
            }
          },
          error: (err) => console.error('Ошибка фильтрации:', err)
        });
      } else {
        this.productTableService.loadTableData(pageIndex, pageSize);
      }
    }
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
    return numSelected === numRows && numRows > 0;
  }


  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      this.selectAllRecords = false;
      this.showSelectAllBanner = false;
    } else {
      this.dataSource.data.forEach(row => this.selection.select(row));
      // Показываем баннер только если есть больше записей чем на странице
      this.showSelectAllBanner = this.totalCount > this.dataSource.data.length;
      this.selectAllRecords = false;
    }
  }

  selectAllRecordsAction(): void {
    this.selectAllRecords = true;
    this.showSelectAllBanner = false;
  }

  clearSelection(): void {
    this.selection.clear();
    this.selectAllRecords = false;
    this.showSelectAllBanner = false;
  }


  handleExportToExcel(): void {
    if (this.isExporting) return;
    this.isExporting = true;
    console.log('Запрос Excel файла с сервера...');

    const currentFilters = this.filterForm.value;
    const currentSearch = this.dataSource.filter;
    const selectedColumns: string[] = this.getSelectedColumnIds();

    // Если выбраны все записи - отправляем пустой массив ids (бэкенд вернет все)
    const selectedIds: string[] = this.selectAllRecords ? [] : this.selection.selected.map(row => row.id);

    const payload = {
      ids: selectedIds,
      columns: selectedColumns,
      searchQuery: currentSearch || '',
      selectAll: this.selectAllRecords // Флаг для бэкенда
    };

    this.productTableService.downloadExcel(payload).subscribe({
      next: (blob: Blob) => {
        const prefix = this.selectAllRecords ? 'all_' : (selectedIds.length > 0 ? 'selected_' : '');
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
    const selectedColumns: string[] = this.getSelectedColumnIds();

    // Если выбраны все записи - отправляем пустой массив ids (бэкенд вернет все)
    const selectedIds: string[] = this.selectAllRecords ? [] : this.selection.selected.map(row => row.id);

    const payload = {
      ids: selectedIds,
      columns: selectedColumns,
      searchQuery: currentSearch || '',
      selectAll: this.selectAllRecords // Флаг для бэкенда
    };

    this.productTableService.downloadCsv(payload).subscribe({
      next: (blob: Blob) => {
        const prefix = this.selectAllRecords ? 'all_' : (selectedIds.length > 0 ? 'selected_' : '');
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

    // Если изменился размер страницы - сбрасываем на первую страницу
    const pageSizeChanged = this.currentPageSize !== pageSize;
    const actualPageIndex = pageSizeChanged ? 0 : pageIndex;

    // Сохраняем новый размер страницы
    this.currentPageSize = pageSize;

    // Сбрасываем выбор всех записей при смене страницы
    this.selectAllRecords = false;
    this.showSelectAllBanner = false;

    // Получаем текущие фильтры и сортировку
    const sortField = this.dataSource.sort?.active;
    const sortDir = this.dataSource.sort?.direction;
    const filters = this.filterForm.value;

    this.productTableService.loadTableData(actualPageIndex, pageSize, sortField, sortDir, filters);

    // Обновляем paginator если сбросили страницу
    if (pageSizeChanged && actualPageIndex !== pageIndex) {
      setTimeout(() => {
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
      });
    }
  }

}
