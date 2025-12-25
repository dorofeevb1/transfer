import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api-service';

export interface Row {
    id?: string;
    [key: string]: any;
}

export interface Column {
    id: string;
    name: string;
    // можно расширить: type, editable и т.д.
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

    loadTableData(): void {
        this.apiService.get<{ rows: Row[], columns: Column[] }>('/table/data').subscribe(({ rows, columns }) => {
            this.rowsSubject.next(rows);
            this.columnsSubject.next(columns);
        });
    }

    updateRow(rowId: string, row: Row): Observable<Row> {
        return this.apiService.put<Row>(`/table/rows/${rowId}`, row);
    }

    deleteRows(rowIds: string[]): Observable<void> {
        return this.apiService.delete<void>('/table/rows', rowIds);
    }

    sendExportDataToBackend(data: any[]): Observable<any> {
        const endpoint = 'your/api/endpoint';
        return this.apiService.post(endpoint, data);
    }

    /**
     * Отправка данных импорта.
     * @param data Массив данных из Excel
     * @param approved Флаг подтверждения перезаписи (true - заменить, false - проверить)
     */
    sendImportDataToBackend(data: any[], approved: boolean = false): Observable<any> {
        const endpoint = 'your/api/import-endpoint';

        // Отправляем объект с данными и флагом
        const payload = {
            data: data,
            approved: approved
        };

        return this.apiService.post(endpoint, payload);
    }

    sendNewColumnToBackend(columnId: string): Observable<any> {
        const endpoint = 'your/api/column/add';
        return this.apiService.post(endpoint, { columnId });
    }

    searchTableData(query: string): Observable<any[]> {
        const endpoint = 'your/api/search-endpoint';
        return this.apiService.post(endpoint, { query });
    }
}
