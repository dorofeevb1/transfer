import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { RfiService } from '../../services/rfi.service';
import { Rfi, RfiStatus } from '../../models/rfi.interfaces';
import { RfiCreateDialogComponent } from '../../dialogs/rfi-create-dialog/rfi-create-dialog.component';
import { ConfirmationDeleteComponent } from '../../dialogs/confirmation-delete/confirmation-delete.component';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  selector: 'app-rfi-list',
  templateUrl: './rfi-list.component.html',
  styleUrls: ['./rfi-list.component.scss']
})
export class RfiListComponent implements OnInit {
  displayedColumns = ['select', 'number', 'status', 'supplier', 'created_at', 'deadline', 'author', 'lines_count'];
  dataSource = new MatTableDataSource<Rfi>();
  selection = new SelectionModel<Rfi>(true, []);
  totalCount = 0;
  searchQuery = '';
  statusFilter: RfiStatus | '' = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private rfiService: RfiService,
    private dialog: MatDialog,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.rfiService.rfiList$.subscribe(items => {
      this.dataSource.data = items;
    });
    this.rfiService.totalCount$.subscribe(count => {
      this.totalCount = count;
      if (this.paginator) {
        this.paginator.length = count;
      }
    });

    this.loadData();
  }

  loadData(): void {
    const pageIndex = this.paginator?.pageIndex ?? 0;
    const pageSize = this.paginator?.pageSize ?? 10;
    this.rfiService.loadRfiList(
      pageIndex,
      pageSize,
      this.searchQuery || undefined,
      this.statusFilter || undefined
    );
  }

  onPageChange(event: PageEvent): void {
    this.rfiService.loadRfiList(
      event.pageIndex,
      event.pageSize,
      this.searchQuery || undefined,
      this.statusFilter || undefined
    );
  }

  onSearch(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value.trim();
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadData();
  }

  onStatusFilter(status: RfiStatus | ''): void {
    this.statusFilter = status;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadData();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(RfiCreateDialogComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  openDetail(rfi: Rfi): void {
    this.router.navigate(['/products/rfi', rfi.id]);
  }

  deleteSelected(): void {
    const selected = this.selection.selected;
    if (selected.length === 0) return;

    this.translate.get([
      'RFI.CONFIRM_DELETE_TITLE',
      'RFI.CONFIRM_DELETE_MESSAGE'
    ], { count: selected.length }).subscribe(translations => {
      const dialogRef = this.dialog.open(ConfirmationDeleteComponent, {
        width: '400px',
        data: {
          title: translations['RFI.CONFIRM_DELETE_TITLE'],
          message: translations['RFI.CONFIRM_DELETE_MESSAGE']
        }
      });

      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          let completed = 0;
          selected.forEach(rfi => {
            this.rfiService.deleteRfi(rfi.id).subscribe({
              next: () => {
                completed++;
                if (completed === selected.length) {
                  this.selection.clear();
                  this.loadData();
                }
              },
              error: () => {
                completed++;
                if (completed === selected.length) {
                  this.selection.clear();
                  this.loadData();
                }
              }
            });
          });
        }
      });
    });
  }

  isAllSelected(): boolean {
    return this.selection.selected.length === this.dataSource.data.length && this.dataSource.data.length > 0;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach(row => this.selection.select(row));
    }
  }

  getStatusClass(status: RfiStatus): string {
    const map: Record<RfiStatus, string> = {
      draft: 'status-draft',
      ready_to_send: 'status-ready',
      sent: 'status-sent',
      in_progress: 'status-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      rejected: 'status-rejected'
    };
    return map[status] || '';
  }
}
