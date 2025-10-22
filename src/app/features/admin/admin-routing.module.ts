import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { UsersTableComponent } from './components/users-table/users-table.component';

const routes: Routes = [
  {
    path: '',
    component: AdminPanelComponent,
    children: [
      // По умолчанию открываем таблицу товаров
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      // Используем ваш уже существующий модуль продуктов
      {
        path: 'products',
        loadChildren: () => import('../products/products.module').then(m => m.ProductsModule)
      },
      // Маршрут для новой таблицы пользователей
      {
        path: 'users',
        component: UsersTableComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
