import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent {
  @Output() importClick = new EventEmitter<void>();
  @Output() addColumnClick = new EventEmitter<void>();
}
