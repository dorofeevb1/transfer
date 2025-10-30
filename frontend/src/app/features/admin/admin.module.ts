// src/app/features/admin/admin.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { AdminRoutingModule } from './admin-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { UsersTableComponent } from './components/users-table/users-table.component';
import { UserDialogComponent } from './components/dialogs/user-dialog/user-dialog.component';
import { ChangeEmailDialogComponent } from './components/dialogs/change-email-dialog/change-email-dialog.component';
import { ChangePasswordDialogComponent } from './components/dialogs/change-password-dialog/change-password-dialog.component';
import { SuccessDialogComponent } from './components/dialogs/success-dialog/success-dialog.component';

@NgModule({
  declarations: [
    AdminPanelComponent,
    UsersTableComponent,
    UserDialogComponent,
    ChangeEmailDialogComponent,
    ChangePasswordDialogComponent,
    SuccessDialogComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    SharedModule 
  ]
})
export class AdminModule { }
