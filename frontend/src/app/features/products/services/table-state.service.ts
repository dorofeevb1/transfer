import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { ColumnDefinition, SideFilters } from '../models/table.interfaces';

@Injectable({
    providedIn: 'root'
})
export class TableStateService {
    // --- Subjects для хранения исходного состояния ---
    private rawData$ = new BehaviorSubject<any[]>([]);
    private allColumns$ = new BehaviorSubject<ColumnDefinition[]>([]);
    private displayedColumns$ = new BehaviorSubject<string[]>(['select']);
    private globalFilter$ = new BehaviorSubject<string>('');
    private sideFilters$ = new BehaviorSubject<SideFilters>({});
    private sort$ = new BehaviorSubject<MatSort | null>(null);
    private paginator$ = new BehaviorSubject<MatPaginator | null>(null);

    // --- Публичные Observable для подписки в компонентах ---
    public readonly dataSource$: Observable<MatTableDataSource<any>>;
    public readonly allColumnsForForms$: Observable<ColumnDefinition[]>;
    public readonly displayedColumnsForTable$: Observable<string[]>;
    public readonly activeSideFilterCount$: Observable<number>;

    constructor() {
        this.allColumnsForForms$ = this.allColumns$.asObservable();
        this.displayedColumnsForTable$ = this.displayedColumns$.asObservable();

        // Главный Observable, который реагирует на любое изменение состояния
        this.dataSource$ = combineLatest([
            this.rawData$,
            this.globalFilter$,
            this.sideFilters$,
            this.sort$,
            this.paginator$
        ]).pipe(
            map(([data, globalFilter, sideFilters, sort, paginator]) => {
                // Создаем dataSource один раз
                const dataSource = new MatTableDataSource(data);

                // Подключаем пагинацию и сортировку
                dataSource.sort = sort;
                dataSource.paginator = paginator;

                // Применяем кастомный предикат фильтрации
                dataSource.filterPredicate = this.createFilterPredicate(sideFilters);
                dataSource.filter = globalFilter; // Глобальный фильтр работает через это свойство

                return dataSource;
            })
        );

        // Observable для подсчета активных фильтров
        this.activeSideFilterCount$ = this.sideFilters$.pipe(
            map(filters => Object.values(filters).filter(v => !!v).length),
            startWith(0)
        );
    }

    // --- Публичные методы для изменения состояния ---

    public setData(data: any[]): void {
        if (data?.length > 0) {
            const columns = this.deriveColumnsFromData(data);
            this.allColumns$.next(columns);
            const displayed = columns.map(c => c.id);
            this.displayedColumns$.next(['select', ...displayed]);
            this.rawData$.next(data);
        } else {
            this.rawData$.next([]);
            this.allColumns$.next([]);
            this.displayedColumns$.next(['select']);
        }
    }

    public setGlobalFilter(filterValue: string): void {
        this.globalFilter$.next(filterValue.trim().toLowerCase());
    }

    public setSideFilters(filters: SideFilters): void {
        this.sideFilters$.next(filters);
    }

    public setDisplayedColumns(columns: string[]): void {
        this.displayedColumns$.next(['select', ...columns]);
    }

    public setSort(sort: MatSort): void {
        this.sort$.next(sort);
    }

    public setPaginator(paginator: MatPaginator): void {
        this.paginator$.next(paginator);
    }

    // --- Приватные методы ---

    /**
     * ОПТИМИЗИРОВАННЫЙ Предикат. Он больше не использует JSON.parse!
     */
    private createFilterPredicate(sideFilters: SideFilters): (data: any, filter: string) => boolean {
        return (data: any, globalFilter: string): boolean => {
            const matchGlobal = JSON.stringify(data).toLowerCase().includes(globalFilter);

            const matchSide = Object.entries(sideFilters).every(([key, value]) => {
                if (!value) return true; // Если для этого ключа фильтр не задан, пропускаем
                return String(data[key] ?? '').toLowerCase().includes(value.toLowerCase());
            });

            return matchGlobal && matchSide;
        };
    }

    private deriveColumnsFromData(data: any[]): ColumnDefinition[] {
        return Object.keys(data[0]).map(key => ({ id: key, name: key }));
    }

    // --- Геттеры для синхронного получения значений ---
    public getAllColumns(): ColumnDefinition[] { return this.allColumns$.getValue(); }
    public getDisplayedColumns(): string[] { return this.displayedColumns$.getValue(); }
}
