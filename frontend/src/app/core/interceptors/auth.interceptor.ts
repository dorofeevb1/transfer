import { Injectable } from '@angular/core';
import {
    HttpInterceptor,
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(private router: Router) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    // Токен истёк — очищаем localStorage и редиректим на логин
                    localStorage.removeItem('jwt-token');
                    localStorage.removeItem('refresh-token');
                    localStorage.removeItem('user-role');

                    // Перезагружаем страницу для редиректа на логин
                    window.location.href = '/login';
                }
                return throwError(() => error);
            })
        );
    }
}
