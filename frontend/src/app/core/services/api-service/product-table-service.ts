import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api-service';
import { HttpParams } from '@angular/common/http'; // Добавлен импорт


export interface ExportPayload {
    ids: string[];
    columns: string[];
    searchQuery?: string;
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

    public rows$ = this.rowsSubject.asObservable();
    public columns$ = this.columnsSubject.asObservable();

    constructor(private apiService: ApiService) { }

    // --- ПОЛУЧЕНИЕ ДАННЫХ ---

    // Базовая загрузка (можно использовать для инициализации колонок)
    loadTableStructure(): void {
        this.apiService.get<Column[]>('api/products/columns').subscribe(columns => {
            this.columnsSubject.next(columns);
        });
    }
    downloadExcel(payload: ExportPayload): Observable<Blob> {
        return this.apiService.post<Blob>('api/products/export/excel', payload, { responseType: 'blob' } as any);
    }

    downloadCsv(payload: ExportPayload): Observable<Blob> {
        return this.apiService.post<Blob>('api/products/export/csv', payload, { responseType: 'blob' } as any);
    }


    // Загрузка данных с пагинацией, сортировкой и фильтрацией
    loadTableData(pageIndex: number, pageSize: number, sortField?: string, sortDirection?: string, filters?: any): void {
        let params = new HttpParams()
            .set('page', pageIndex.toString())
            .set('size', pageSize.toString());

        if (sortField && sortDirection) {
            params = params.set('sortField', sortField).set('sortDir', sortDirection);
        }

        if (filters) {
            // Превращаем объект фильтров в JSON-строку или отдельные параметры
            params = params.set('filters', JSON.stringify(filters));
        }

        this.apiService.get<{ rows: Row[], totalCount: number }>('api/products/data', params)
            .subscribe(response => {
                this.rowsSubject.next(response.rows);
                // Тут можно было бы обновить Subject для totalCount, если он есть
            });
    }

    // --- РЕДАКТИРОВАНИЕ ---

    // Создание новой строки
    createRow(row: Row): Observable<Row> {
        return this.apiService.post<Row>('api/products', row);
    }

    updateRow(rowId: string, row: Row): Observable<Row> {
        return this.apiService.put<Row>(`api/products/${rowId}`, row);
    }

    deleteRows(rowIds: string[]): Observable<void> {
        // Обычно для DELETE с body используют request, как у вас в ApiService, 
        // но иногда проще передать IDs через query params или использовать POST для batch delete
        return this.apiService.delete<void>('api/products', rowIds);
    }

    // --- КОЛОНКИ ---

    // Добавление новой колонки (динамические поля)
    addColumn(column: { name: string, type: string }): Observable<Column> {
        return this.apiService.post<Column>('api/products/columns', column);
    }

    // Удаление колонки
    deleteColumn(columnId: string): Observable<void> {
        return this.apiService.delete<void>(`api/products/columns/${columnId}`);
    }

    // --- ЭКСПОРТ / ИМПОРТ ---

    sendExportDataToBackend(filters: any): Observable<Blob> {
        // Запрос на генерацию Excel на бэкенде (если фронтенд не справляется или нужны полные данные)
        // Возвращаем Blob для скачивания файла
        return this.apiService.post('api/products/export', { filters }, { responseType: 'blob' } as any);
    }

    sendImportDataToBackend(data: any[], approved: boolean = false): Observable<{ success: boolean, message?: string, errors?: any[] }> {
        const payload = {
            data: data,
            approved: approved
        };
        return this.apiService.post('api/products/import', payload);
    }

    searchTableData(query: string): Observable<Row[]> {
        return this.apiService.post<Row[]>('api/products/search', { query });
    }
}
