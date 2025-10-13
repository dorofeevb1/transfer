import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Импортируем компонент, который будет отображаться по этому маршруту
import { TableComponent } from './components/table/table.component';

// Определяем маршруты для этого модуля
const routes: Routes = [
    {
        path: '',
        component: TableComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ProductsRoutingModule { }
