// Описывает структуру колонки
export interface ColumnDefinition {
    id: string;
    name: string;
}

// Описывает структуру фильтра, используемого в боковой панели
export interface SideFilters {
    [key: string]: string | null;
}

// Описывает состояние таблицы, которым управляет сервис
export interface TableState {
    rawData: any[];
    allColumns: ColumnDefinition[];
    displayedColumns: string[];
    globalFilter: string;
    sideFilters: SideFilters;
}
