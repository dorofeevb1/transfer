import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api-service';
import { HttpParams } from '@angular/common/http';

export interface ExportPayload {
    ids: string[];
    columns: string[];
    searchQuery?: string;
    selectAll?: boolean;
}

export interface Row {
    id?: string;
    [key: string]: any;
}

export interface Column {
    id: string;
    name: string;
    type?: string; // Тип колонки (text, number, date, select)
    editable?: boolean;
}

// Интерфейс ответа для пагинации
export interface TableDataResponse {
    rows: Row[];
    totalCount: number;
}

@Injectable({
    providedIn: 'root'
})
export class ProductTableService {
    private rowsSubject = new BehaviorSubject<Row[]>([]);
    private columnsSubject = new BehaviorSubject<Column[]>([]);
    private totalCountSubject = new BehaviorSubject<number>(0);

    public rows$ = this.rowsSubject.asObservable();
    public columns$ = this.columnsSubject.asObservable();
    public totalCount$ = this.totalCountSubject.asObservable();

    constructor(private apiService: ApiService) { }

    // --- ПОЛУЧЕНИЕ ДАННЫХ ---

    // Базовая загрузка (для инициализации колонок)
    loadTableStructure(): void {
        this.apiService.get<Column[]>('api/products/columns/').subscribe(columns => {
            this.columnsSubject.next(columns);
        });
    }

    downloadExcel(payload: ExportPayload): Observable<Blob> {
        return this.apiService.post<Blob>('api/products/export/excel/', payload, {
            responseType: 'blob'
        } as any);
    }

    downloadCsv(payload: ExportPayload): Observable<Blob> {
        return this.apiService.post<Blob>('api/products/export/csv/', payload, {
            responseType: 'blob'
        } as any);
    }

    // Загрузка данных с пагинацией, сортировкой и фильтрацией
    loadTableData(
        pageIndex: number,
        pageSize: number,
        sortField?: string,
        sortDirection?: string,
        filters?: any
    ): void {
        let params = new HttpParams()
            .set('page', pageIndex.toString())
            .set('size', pageSize.toString());

        if (sortField && sortDirection) {
            params = params.set('sortField', sortField).set('sortDir', sortDirection);
        }

        if (filters) {
            params = params.set('filters', JSON.stringify(filters));
        }

        this.apiService
            .get<{ rows: Row[]; totalCount: number }>('api/products/data/', params)
            .subscribe(response => {
                this.rowsSubject.next(response.rows);
                this.totalCountSubject.next(response.totalCount || 0);
            });
    }

    // --- РЕДАКТИРОВАНИЕ ---

    // Создание новой строки
    createRow(row: Row): Observable<Row> {
        return this.apiService.post<Row>('api/products/', row);
    }

    // Одиночное обновление
    updateRow(rowId: string, row: Row): Observable<Row> {
        return this.apiService.put<Row>(`api/products/${rowId}/`, row);
    }

    // МАССОВОЕ обновление (подключается к onSaveBulkChanges в table.component.ts)
    bulkUpdateRows(rows: Row[]): Observable<Row[]> {
        // эндпоинт можно поменять, если у тебя другой
        return this.apiService.put<Row[]>('api/products/bulk-update/', rows);
    }

    // МАССОВОЕ удаление
    deleteRows(rowIds: string[]): Observable<void> {
        // Если массив пустой - удаляем все записи
        return this.apiService.post<void>('api/products/delete/', { ids: rowIds, deleteAll: rowIds.length === 0 });
    }

    // --- КОЛОНКИ ---

    addColumn(column: { name: string; type: string }): Observable<Column> {
        return this.apiService.post<Column>('api/products/columns/', column);
    }

    deleteColumn(columnId: string): Observable<void> {
        return this.apiService.delete<void>(`api/products/columns/${columnId}/`);
    }

    // --- ЭКСПОРТ / ИМПОРТ ---

    sendExportDataToBackend(filters: any): Observable<Blob> {
        return this.apiService.post('api/products/export/', { filters }, {
            responseType: 'blob'
        } as any);
    }

    sendImportDataToBackend(
        data: any[],
        approved: boolean = false
    ): Observable<{ success: boolean; message?: string; errors?: any[] }> {
        const payload = {
            data,
            approved
        };
        return this.apiService.post('api/products/import/', payload);
    }

    searchTableData(query: string): Observable<Row[]> {
        return this.apiService.post<Row[]>('api/products/search/', { query });
    }

    // --- ФИЛЬТРЫ ---

    // Получение уникальных значений для фильтров
    getFilterOptions(): Observable<{ category1: string[], category2: string[], package: string[] }> {
        return this.apiService.get<{ category1: string[], category2: string[], package: string[] }>('api/products/filter-options/');
    }

    // Загрузка данных с применением фильтров
    loadTableDataWithFilters(
        pageIndex: number,
        pageSize: number,
        filters: {
            dateFrom?: Date | null;
            dateTo?: Date | null;
            category1?: string[];
            category2?: string[];
            package?: string[];
        }
    ): Observable<TableDataResponse> {
        const payload = {
            page: pageIndex,
            size: pageSize,
            filters: {
                dateFrom: filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : null,
                dateTo: filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : null,
                category1: filters.category1 || [],
                category2: filters.category2 || [],
                package: filters.package || []
            }
        };
        return this.apiService.post<TableDataResponse>('api/products/filter/', payload);
    }
}
