import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
import { RfiService } from '../../services/rfi.service';
import { RfiDetail, RfiLine, RfiStatus } from '../../models/rfi.interfaces';
import { RfiTransformDialogComponent } from '../../dialogs/rfi-transform-dialog/rfi-transform-dialog.component';
import { ConfirmationDeleteComponent } from '../../dialogs/confirmation-delete/confirmation-delete.component';

interface StatusTransition {
  label: string;
  target: RfiStatus;
  color: string;
}

@Component({
  selector: 'app-rfi-detail',
  templateUrl: './rfi-detail.component.html',
  styleUrls: ['./rfi-detail.component.scss']
})
export class RfiDetailComponent implements OnInit {
  rfi: RfiDetail | null = null;
  isLoading = true;
  linesDataSource = new MatTableDataSource<RfiLine>();
  lineColumns = ['article', 'name', 'quantity', 'price', 'comment'];

  private rfiId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rfiService: RfiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.rfiId = this.route.snapshot.paramMap.get('id') || '';
    if (this.rfiId) {
      this.loadDetail();
    }
  }

  loadDetail(): void {
    this.isLoading = true;
    this.rfiService.getRfiDetail(this.rfiId).subscribe({
      next: (detail) => {
        this.rfi = detail;
        this.linesDataSource.data = detail.lines || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/products/rfi']);
  }

  getAvailableTransitions(): StatusTransition[] {
    if (!this.rfi) return [];

    const transitions: Record<RfiStatus, StatusTransition[]> = {
      draft: [
        { label: 'RFI.ACTION.MARK_READY', target: 'ready_to_send', color: 'primary' },
        { label: 'RFI.ACTION.CANCEL', target: 'cancelled', color: '' }
      ],
      ready_to_send: [
        { label: 'RFI.ACTION.SEND', target: 'sent', color: 'primary' },
        { label: 'RFI.ACTION.BACK_TO_DRAFT', target: 'draft', color: '' }
      ],
      sent: [
        { label: 'RFI.ACTION.START_PROGRESS', target: 'in_progress', color: 'primary' },
        { label: 'RFI.ACTION.CANCEL', target: 'cancelled', color: '' }
      ],
      in_progress: [
        { label: 'RFI.ACTION.COMPLETE', target: 'completed', color: 'primary' },
        { label: 'RFI.ACTION.REJECT', target: 'rejected', color: 'warn' }
      ],
      completed: [
        { label: 'RFI.ACTION.TRANSFORM', target: 'completed', color: 'accent' }
      ],
      cancelled: [],
      rejected: [
        { label: 'RFI.ACTION.BACK_TO_DRAFT', target: 'draft', color: '' }
      ]
    };

    return transitions[this.rfi.status] || [];
  }

  onStatusChange(transition: StatusTransition): void {
    if (!this.rfi) return;

    // Transform is a special action
    if (transition.target === 'completed' && this.rfi.status === 'completed') {
      this.openTransformDialog();
      return;
    }

    this.rfiService.changeStatus(this.rfi.id, transition.target).subscribe({
      next: (updated) => {
        this.rfi = updated;
        this.linesDataSource.data = updated.lines || [];
      },
      error: (err) => {
        const msg = err.error?.error || 'Error';
        this.snackBar.open(msg, this.translate.instant('DIALOGS.CLOSE_BUTTON'), { duration: 4000 });
      }
    });
  }

  openTransformDialog(): void {
    if (!this.rfi) return;

    const dialogRef = this.dialog.open(RfiTransformDialogComponent, {
      width: '600px',
      data: { rfiId: this.rfi.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.loadDetail();
        this.snackBar.open(
          this.translate.instant('RFI.TRANSFORM_SUCCESS'),
          this.translate.instant('DIALOGS.CLOSE_BUTTON'),
          { duration: 4000 }
        );
      }
    });
  }

  deleteRfi(): void {
    if (!this.rfi) return;

    this.translate.get('RFI.CONFIRM_DELETE_SINGLE').subscribe(message => {
      const dialogRef = this.dialog.open(ConfirmationDeleteComponent, {
        width: '400px',
        data: { title: message, message: '' }
      });

      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed && this.rfi) {
          this.rfiService.deleteRfi(this.rfi.id).subscribe(() => {
            this.goBack();
          });
        }
      });
    });
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
