import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ProductsContainerComponent } from './components/products-container/products-container.component';
import { TableComponent } from './components/table/table.component';
import { RfiListComponent } from './components/rfi-list/rfi-list.component';
import { RfiDetailComponent } from './components/rfi-detail/rfi-detail.component';

const routes: Routes = [
    {
        path: '',
        component: ProductsContainerComponent,
        children: [
            { path: '', redirectTo: 'catalog', pathMatch: 'full' },
            { path: 'catalog', component: TableComponent },
            { path: 'rfi', component: RfiListComponent },
            { path: 'rfi/:id', component: RfiDetailComponent }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ProductsRoutingModule { }
