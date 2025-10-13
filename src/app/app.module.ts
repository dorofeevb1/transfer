import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Основные модули приложения
// import { CoreModule } from './core/core.module';
import { LayoutModule } from './layout/layout.module';
import { SharedModule } from './shared/shared.module';


@NgModule({
  // Корневой компонент приложения
  declarations: [
    AppComponent
  ],
  // Подключаемые модули
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,        
    AppRoutingModule,              
    LayoutModule,
    SharedModule             
  ],
  // Провайдеры сервисов (остаются пустыми, т.к. сервисы предоставляются в CoreModule)
  providers: [],
  // Компонент, с которого запускается приложение
  bootstrap: [AppComponent]
})
export class AppModule { }
