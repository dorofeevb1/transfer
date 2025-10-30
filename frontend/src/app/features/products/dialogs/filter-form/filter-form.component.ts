import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-filter-form',
  templateUrl: './filter-form.component.html',
  styleUrls: ['./filter-form.component.scss']
})
export class FilterFormComponent {
  @Input() form!: FormGroup;
  @Output() apply = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  objectKeys = Object.keys;
}
