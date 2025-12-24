import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService, UserRole } from 'src/app/core/services/api-service/auth.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  currentLang: string;
  isAdmin$: Observable<boolean>;

  constructor(
    public translate: TranslateService,
    private auth: AuthService,
  ) {
    translate.addLangs(['ru', 'zh']);
    translate.setDefaultLang('ru');

    const browserLang = translate.getBrowserLang();
    this.currentLang = browserLang?.match(/ru|zh/) ? browserLang : 'ru';
    translate.use(this.currentLang);

    this.isAdmin$ = this.auth.currentUserRole$.pipe(
      map((role: UserRole) => role === 'admin')
    );
  }

  switchLang(lang: string): void {
    if (lang) {
      this.translate.use(lang);
      this.currentLang = lang;
    }
  }
  logout() {
    this.auth.logout(); // Или ваш метод выхода
  }
}
