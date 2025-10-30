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
    sendImportDataToBackend(data: any[]): Observable<any> {
        const endpoint = 'your/api/import-endpoint'; // заменить на актуальный
        return this.apiService.post(endpoint, data);
    }
    sendNewColumnToBackend(columnId: string): Observable<any> {
        const endpoint = 'your/api/column/add'; // URL API для добавления колонки
        return this.apiService.post(endpoint, { columnId });
    }
    searchTableData(query: string): Observable<any[]> {
        const endpoint = 'your/api/search-endpoint'; // подставьте реальный URL
        return this.apiService.post(endpoint, { query });
    }


}
