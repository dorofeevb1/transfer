import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, tap, catchError } from 'rxjs/operators'; // Добавлен catchError
import { ApiService } from './api-service';

export type UserRole = 'admin' | 'user' | null;

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserRole = new BehaviorSubject<UserRole>(null);
    public currentUserRole$ = this.currentUserRole.asObservable();

    // Список мок-пользователей
    private mockUsers: { email: string; password: string; role: UserRole; token: string }[] = [
        { email: 'admin@gmail.com', password: 'admin', role: 'admin', token: 'mock-jwt-admin' },
        { email: 'user@gmail.com', password: 'user', role: 'user', token: 'mock-jwt-user' },
    ];

    constructor(private router: Router, private apiService: ApiService) {
        const storedRole = sessionStorage.getItem('userRole') as UserRole;
        if (storedRole) {
            this.currentUserRole.next(storedRole);
        }
    }

    // --- ОБНОВЛЕННЫЙ МЕТОД LOGIN ---
    login(email: string, password: string): Observable<boolean> {
        // 1. Проверяем мок-пользователей
        const mockUser = this.mockUsers.find(u => u.email === email.toLowerCase() && u.password === password);

        if (mockUser) {
            console.log('Auth: Mock user found, skipping backend.');
            return of(true).pipe(
                delay(500), // Имитация задержки сети
                tap(() => {
                    this.setRole(mockUser.role);
                    sessionStorage.setItem('jwt_token', mockUser.token);
                })
            );
        }

        // 2. Если не нашли в моках — идем на реальный бэкенд
        console.log('Auth: Mock user not found, requesting backend...');

        return this.apiService.post<{ success: boolean; token?: string; role?: string }>('/auth/login', { email, password }).pipe(
            tap(response => {
                // Если запрос успешен и пришли данные
                if (response.success && response.token && response.role) {
                    sessionStorage.setItem('jwt_token', response.token);
                    this.setRole(response.role as UserRole);
                }
            }),
            map(response => !!response.success), // Преобразуем ответ в true/false
            catchError(error => {
                console.error('Auth: Backend login failed', error);
                // В случае ошибки сервера возвращаем false, чтобы компонент показал ошибку
                return of(false);
            })
        );
    }

    logout(): void {
        sessionStorage.removeItem('jwt_token');
        sessionStorage.removeItem('userRole');
        this.currentUserRole.next(null);
        this.router.navigate(['/auth']);
    }

    private setRole(role: UserRole): void {
        this.currentUserRole.next(role);
        if (role) {
            sessionStorage.setItem('userRole', role);
        } else {
            sessionStorage.removeItem('userRole');
        }
    }

    isAdmin(): boolean {
        return this.currentUserRole.value === 'admin';
    }

    isAuthenticated(): boolean {
        return !!this.currentUserRole.value && !!sessionStorage.getItem('jwt_token');
    }

    // Метод просто для совместимости, если где-то используется старое название
    forgotPassword(email: string): Observable<void> {
        return this.requestPasswordReset(email);
    }

    requestPasswordReset(email: string): Observable<void> {
        return this.apiService.post<void>('/api/auth/forgot-password', { email });
    }

    resetPassword(token: string, newPassword: string): Observable<void> {
        return this.apiService.post<void>('/api/auth/reset-password', { token, password: newPassword });
    }

    refreshToken(): Observable<{ token: string }> {
        const refreshToken = localStorage.getItem('refresh_token');
        // Если refresh token нет, возвращаем пустой поток или ошибку, чтобы не слать пустой запрос
        if (!refreshToken) {
            return of({ token: '' });
        }

        return this.apiService.post<{ token: string }>('/api/auth/refresh', { refreshToken }).pipe(
            tap(response => {
                if (response.token) {
                    sessionStorage.setItem('jwt_token', response.token);
                }
            })
        );
    }
}
