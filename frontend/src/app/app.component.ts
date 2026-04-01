import { Component } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'BrioTradeLogistic';
  showHeader = true; // По умолчанию хедер показывается

  constructor(private router: Router, private translate: TranslateService) {
    // Восстанавливаем язык из localStorage при загрузке
    const savedLang = localStorage.getItem('lang');
    if (savedLang) {
      this.translate.use(savedLang);
    }
    // Подписываемся на события навигации роутера
    this.router.events.pipe(
      // Фильтруем события, оставляя только NavigationEnd
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Проверяем URL после завершения навигации
      // Если URL начинается с '/auth', скрываем хедер
      if (event.urlAfterRedirects.startsWith('/auth')) {
        this.showHeader = false;
      } else {
        this.showHeader = true;
      }
    });
  }
  ara(){
    this.showHeader = false
  }
}
