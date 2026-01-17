import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ProductTableService } from 'src/app/core/services/api-service/product-table-service';

export interface FilterOption {
  name: string;
  value: string;
  selected: boolean;
}

export interface FilterData {
  dateFrom: Date | null;
  dateTo: Date | null;
  category1: string[];
  category2: string[];
  package: string[];
}

@Component({
  selector: 'app-filter-form',
  templateUrl: './filter-form.component.html',
  styleUrls: ['./filter-form.component.scss']
})
export class FilterFormComponent implements OnInit {
  @Input() form!: FormGroup;

  @Output() apply = new EventEmitter<FilterData>();
  @Output() reset = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  // Даты (диапазон)
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  // Категория 1
  category1All = false;
  category1Options: FilterOption[] = [];

  // Категория 2
  category2All = false;
  category2Options: FilterOption[] = [];

  // Упаковка
  packageAll = false;
  packageOptions: FilterOption[] = [];

  constructor(private productTableService: ProductTableService) { }

  ngOnInit(): void {
    this.loadFilterOptions();
  }

  loadFilterOptions(): void {
    // Загружаем уникальные значения для фильтров с бэкенда
    this.productTableService.getFilterOptions().subscribe({
      next: (options) => {
        this.category1Options = (options.category1 || []).map((name: string) => ({
          name,
          value: name,
          selected: false
        }));
        this.category2Options = (options.category2 || []).map((name: string) => ({
          name,
          value: name,
          selected: false
        }));
        this.packageOptions = (options.package || []).map((name: string) => ({
          name,
          value: name,
          selected: false
        }));
      },
      error: (err) => {
        console.error('Ошибка загрузки опций фильтров:', err);
        // Fallback данные
        this.category1Options = [
          { name: 'Косметика', value: 'Косметика', selected: false },
          { name: 'Бытовая химия', value: 'Бытовая химия', selected: false }
        ];
        this.category2Options = [
          { name: 'Крем для рук', value: 'Крем для рук', selected: false },
          { name: 'Крем для ног', value: 'Крем для ног', selected: false },
          { name: 'Крем для лица', value: 'Крем для лица', selected: false }
        ];
        this.packageOptions = [
          { name: 'Коробка', value: 'Коробка', selected: false },
          { name: 'Пакет', value: 'Пакет', selected: false }
        ];
      }
    });
  }

  // Категория 1
  toggleAllCategory1(): void {
    this.category1Options.forEach(opt => opt.selected = this.category1All);
  }

  onCategory1Change(): void {
    this.category1All = this.category1Options.every(opt => opt.selected);
  }

  // Категория 2
  toggleAllCategory2(): void {
    this.category2Options.forEach(opt => opt.selected = this.category2All);
  }

  onCategory2Change(): void {
    this.category2All = this.category2Options.every(opt => opt.selected);
  }

  // Упаковка
  toggleAllPackage(): void {
    this.packageOptions.forEach(opt => opt.selected = this.packageAll);
  }

  onPackageChange(): void {
    this.packageAll = this.packageOptions.every(opt => opt.selected);
  }

  onClose(): void {
    this.close.emit();
  }

  onApply(): void {
    const filterData: FilterData = {
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      category1: this.category1Options.filter(o => o.selected).map(o => o.value),
      category2: this.category2Options.filter(o => o.selected).map(o => o.value),
      package: this.packageOptions.filter(o => o.selected).map(o => o.value)
    };
    this.apply.emit(filterData);
  }

  onReset(): void {
    this.dateFrom = null;
    this.dateTo = null;
    this.category1All = false;
    this.category1Options.forEach(opt => opt.selected = false);
    this.category2All = false;
    this.category2Options.forEach(opt => opt.selected = false);
    this.packageAll = false;
    this.packageOptions.forEach(opt => opt.selected = false);

    if (this.form) {
      this.form.reset();
    }

    this.reset.emit();
  }
}
