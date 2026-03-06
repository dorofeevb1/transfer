import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/core/services/api-service/auth.service';
import { ApiService } from 'src/app/core/services/api-service/api-service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  currentLang: string;
  isAdmin$: Observable<boolean>;

  // Данные пользователя
  userName: string = 'User';
  userRole: string = 'client';

  constructor(
    private translate: TranslateService,
    private authService: AuthService,
    private apiService: ApiService
  ) {
    this.currentLang = this.translate.currentLang || 'ru';

    // Проверка прав админа
    this.isAdmin$ = this.authService.currentUserRole$.pipe(
      map(role => role === 'admin')
    );
  }

  ngOnInit(): void {
    // Подписка на роль для обновления UI
    this.authService.currentUserRole$.subscribe(role => {
      this.userRole = role || 'client';
    });

    // Загрузка имени из профиля
    this.apiService.get<{ fio: string; email: string }>('api/profile/').subscribe({
      next: (profile) => {
        this.userName = profile.fio || profile.email || 'User';
      },
      error: () => {
        this.userName = 'User';
      }
    });
  }

  switchLang(lang: string): void {
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
    this.currentLang = lang;
  }

  logout(): void {
    this.authService.logout();
  }
}
