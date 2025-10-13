import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { HeaderComponent } from './components/header/header.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
    // Компоненты, принадлежащие этому модулю
    declarations: [
        HeaderComponent,
        // MainLayoutComponent
    ],
    // Модули, которые используются в шаблонах компонентов этого модуля
    imports: [
        CommonModule,
        RouterModule,
        SharedModule
    ],
    // Компоненты, которые будут доступны другим модулям, импортирующим LayoutModule
    exports: [
        HeaderComponent
    ]
})
export class LayoutModule { }
