import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-filter-form',
  templateUrl: './filter-form.component.html',
  styleUrls: ['./filter-form.component.scss']
})
export class FilterFormComponent {
  // Принимаем FormGroup от родителя, если нужно управлять валидацией извне
  @Input() form!: FormGroup;

  @Output() apply = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  // Локальные модели для UI фильтров
  // В реальном приложении их лучше вынести в formControl внутри FormGroup
  dateFilterValue: string = 'all';
  customDate: Date | null = null;
  photoFilter: string = 'all';
  videoFilter: string = 'all';

  constructor() { }

  onClose(): void {
    this.close.emit();
  }

  onApply(): void {
    // Здесь можно собрать данные:
    // const filterData = {
    //   date: this.dateFilterValue,
    //   customDate: this.customDate,
    //   ...
    // };
    this.apply.emit();
  }

  onReset(): void {
    // Сброс локальных значений
    this.dateFilterValue = 'all';
    this.customDate = null;
    this.photoFilter = 'all';
    this.videoFilter = 'all';

    // Сброс формы Angular, если она используется
    if (this.form) {
      this.form.reset();
    }

    this.reset.emit();
  }
}
