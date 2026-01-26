import { Component, EventEmitter, Output } from '@angular/core';
import { AuthService } from 'src/app/core/services/api-service/auth.service';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent {
  @Output() importClick = new EventEmitter<void>();
  @Output() addColumnClick = new EventEmitter<void>();

  constructor(private authService: AuthService) {}

  get canImport(): boolean {
    return !this.authService.isManager();
  }
}
