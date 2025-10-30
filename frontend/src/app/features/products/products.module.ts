import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Импорт вашего компонента
import { TableComponent } from './components/table/table.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ProductsRoutingModule } from './products-routing.module';
import { ImportDialogComponent } from './dialogs/import-dialog/import-dialog.component';
import { PhotoViewerComponent } from './dialogs/photo-viewer/photo-viewer.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { TableControlsComponent } from './components/table-controls/table-controls.component';
import { ProductsTableComponent } from './components/products-table/products-table.component';
import { EditDialogComponent } from './dialogs/edit-dialog/edit-dialog.component';
import { ConfirmationDeleteComponent } from './dialogs/confirmation-delete/confirmation-delete.component';
import { AddPhotoDialogComponent } from './dialogs/add-photo-dialog/add-photo-dialog.component';
import { AddColumnDialogComponent } from './dialogs/add-column-dialog/add-column-dialog.component';
import { FilterFormComponent } from './dialogs/filter-form/filter-form.component';



@NgModule({
    // Объявляем компонент, принадлежащий этому модулю
    declarations: [
        TableComponent,
        ImportDialogComponent,
        PhotoViewerComponent,
        PageHeaderComponent,
        TableControlsComponent,
        ProductsTableComponent,
        EditDialogComponent,
        ConfirmationDeleteComponent,
        AddPhotoDialogComponent,
        AddColumnDialogComponent,
        FilterFormComponent,
        
    ],
    // Импортируем все, что нужно для работы компонентов этого модуля
    imports: [
        CommonModule,
        SharedModule,
        ProductsRoutingModule

    ],
    // Экспортировать компонент не обязательно, если он используется только внутри этого модуля через роутинг
})
export class ProductsModule { }
