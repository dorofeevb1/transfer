import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { HeaderComponent } from './components/header/header.component';
import { SharedModule } from '../shared/shared.module';
import { FooterComponent } from './components/footer/footer.component';

@NgModule({
    // Компоненты, принадлежащие этому модулю
    declarations: [
        HeaderComponent,
        FooterComponent,
    ],
    // Модули, которые используются в шаблонах компонентов этого модуля
    imports: [
        CommonModule,
        RouterModule,
        SharedModule
    ],
    // Компоненты, которые будут доступны другим модулям, импортирующим LayoutModule
    exports: [
        FooterComponent,
        HeaderComponent
    ]
})
export class LayoutModule { }
