import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';

import { ImportDialogComponent } from '../../dialogs/import-dialog/import-dialog.component';
import { SelectionModel } from '@angular/cdk/collections';
import { PhotoViewerComponent } from '../../dialogs/photo-viewer/photo-viewer.component';
import { EditDialogComponent } from '../../dialogs/edit-dialog/edit-dialog.component';
import { ConfirmationDeleteComponent } from '../../dialogs/confirmation-delete/confirmation-delete.component';
import { AddColumnDialogComponent } from '../../dialogs/add-column-dialog/add-column-dialog.component';

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

  private editCache = new Map<string, any>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('filterSidenav') filterSidenav!: MatSidenav;

  constructor(
    public dialog: MatDialog,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({});
    this.columnsForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = this.createFilterPredicate();
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
    const dialogRef = this.dialog.open(ConfirmationDeleteComponent, {
      width: '400px',
      data: { title: 'Удалить товары', message: `Вы уверены, что хотите удалить выбранные товары (${selectedCount} шт.)?` }
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        const idsToDelete = new Set(this.selection.selected.map(item => item.id));
        this.dataSource.data = this.dataSource.data.filter(item => !idsToDelete.has(item.id));
        this.selection.clear();
      }
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
    const dialogRef = this.dialog.open(AddColumnDialogComponent, { width: '400px' });
    dialogRef.afterClosed().subscribe(newColName => {
      if (newColName && !this.allColumns.some(c => c.id === newColName)) {
        this.allColumns.push({ id: newColName, name: newColName });
        this.dataSource.data.forEach(row => row[newColName] = '');
        this.dataSource.data = [...this.dataSource.data];
        this.setupForms();
        this.applyColumnChanges();
      }
    });
  }

  removeColumn(columnName: string, event: MouseEvent): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(ConfirmationDeleteComponent, {
      width: '400px',
      data: { title: 'Удалить колонку', message: `Вы уверены, что хотите удалить колонку "${columnName}"? Это действие нельзя будет отменить.` }
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
}
