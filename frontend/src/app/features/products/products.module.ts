import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TableComponent } from './components/table/table.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ProductsRoutingModule } from './products-routing.module';
import { ImportDialogComponent } from './dialogs/import-dialog/import-dialog.component';
import { PhotoViewerComponent } from './dialogs/photo-viewer/photo-viewer.component';
import { TableControlsComponent } from './components/table-controls/table-controls.component';
import { ProductsTableComponent } from './components/products-table/products-table.component';
import { EditDialogComponent } from './dialogs/edit-dialog/edit-dialog.component';
import { ConfirmationDeleteComponent } from './dialogs/confirmation-delete/confirmation-delete.component';
import { AddPhotoDialogComponent } from './dialogs/add-photo-dialog/add-photo-dialog.component';
import { AddColumnDialogComponent } from './dialogs/add-column-dialog/add-column-dialog.component';
import { FilterFormComponent } from './dialogs/filter-form/filter-form.component';
import { ProductsContainerComponent } from './components/products-container/products-container.component';
import { RfiListComponent } from './components/rfi-list/rfi-list.component';
import { RfiDetailComponent } from './components/rfi-detail/rfi-detail.component';
import { RfiCreateDialogComponent } from './dialogs/rfi-create-dialog/rfi-create-dialog.component';
import { RfiTransformDialogComponent } from './dialogs/rfi-transform-dialog/rfi-transform-dialog.component';

@NgModule({
    declarations: [
        TableComponent,
        ImportDialogComponent,
        PhotoViewerComponent,
        TableControlsComponent,
        ProductsTableComponent,
        EditDialogComponent,
        ConfirmationDeleteComponent,
        AddPhotoDialogComponent,
        AddColumnDialogComponent,
        FilterFormComponent,
        ProductsContainerComponent,
        RfiListComponent,
        RfiDetailComponent,
        RfiCreateDialogComponent,
        RfiTransformDialogComponent,
    ],
    imports: [
        CommonModule,
        SharedModule,
        ProductsRoutingModule
    ],
})
export class ProductsModule { }
