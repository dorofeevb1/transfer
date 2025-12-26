import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, tap, catchError } from 'rxjs/operators';
import { ApiService } from './api-service';

export type UserRole = 'admin' | 'user' | null;

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserRole = new BehaviorSubject<UserRole>(null);
    public currentUserRole$ = this.currentUserRole.asObservable();

    // КОНСТАНТЫ
    private readonly TOKEN_KEY = 'jwt-token';
    private readonly REFRESH_KEY = 'refresh-token';
    private readonly ROLE_KEY = 'user-role';

    // Список мок-пользователей
    private mockUsers: { email: string; password: string; role: UserRole; token: string }[] = [
        { email: 'admin@gmail.com', password: 'admin', role: 'admin', token: 'mock-jwt-admin' },
        { email: 'user@gmail.com', password: 'user', role: 'user', token: 'mock-jwt-user' },
    ];

    constructor(private router: Router, private apiService: ApiService) {
        // Восстановление сессии при обновлении страницы
        const storedRole = localStorage.getItem(this.ROLE_KEY) as UserRole;
        if (storedRole) {
            this.currentUserRole.next(storedRole);
        }
    }

    login(email: string, password: string): Observable<boolean> {
        // 1. Проверяем мок-пользователей
        const mockUser = this.mockUsers.find(u => u.email === email.toLowerCase() && u.password === password);

        if (mockUser) {
            console.log('Auth: Mock user found, skipping backend.');
            return of(true).pipe(
                delay(500),
                tap(() => {
                    this.setSession(mockUser.token, mockUser.role, 'mock-refresh-token');
                    // !!! РЕДИРЕКТ ПОСЛЕ УСПЕШНОГО ВХОДА (MOCK) !!!
                    this.redirectUser(mockUser.role);
                })
            );
        }

        // 2. Реальный бэкенд
        console.log('Auth: Mock user not found, requesting backend...');

        return this.apiService.post<{ success: boolean; token?: string; role?: string; refreshToken?: string }>(
            '/api/auth/login',
            { email, password }
        ).pipe(
            tap(response => {
                if (response.success && response.token && response.role) {
                    this.setSession(response.token, response.role as UserRole, response.refreshToken);
                    // !!! РЕДИРЕКТ ПОСЛЕ УСПЕШНОГО ВХОДА (BACKEND) !!!
                    this.redirectUser(response.role as UserRole);
                }
            }),
            map(response => !!response.success),
            catchError(error => {
                console.error('Auth: Backend login failed', error);
                return of(false);
            })
        );
    }

    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.ROLE_KEY);
        localStorage.removeItem(this.REFRESH_KEY);

        this.currentUserRole.next(null);
        this.router.navigate(['/auth']);
    }

    /**
     * Логика перенаправления в зависимости от роли
     */
    private redirectUser(role: UserRole): void {
        if (role === 'admin') {
            this.router.navigate(['/admin-panel']);
        } else {
            // Для обычных пользователей или user
            this.router.navigate(['/products']);
        }
    }

    private setSession(token: string, role: UserRole, refreshToken?: string): void {
        localStorage.setItem(this.TOKEN_KEY, token);

        if (role) {
            localStorage.setItem(this.ROLE_KEY, role);
            this.currentUserRole.next(role);
        }

        if (refreshToken) {
            localStorage.setItem(this.REFRESH_KEY, refreshToken);
        }
    }

    isAdmin(): boolean {
        return this.currentUserRole.value === 'admin';
    }

    isAuthenticated(): boolean {
        const token = localStorage.getItem(this.TOKEN_KEY);
        return !!this.currentUserRole.value && !!token;
    }

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
        const refreshToken = localStorage.getItem(this.REFRESH_KEY);

        if (!refreshToken) {
            return of({ token: '' });
        }

        return this.apiService.post<{ token: string }>('/api/auth/refresh', { refreshToken }).pipe(
            tap(response => {
                if (response.token) {
                    localStorage.setItem(this.TOKEN_KEY, response.token);
                }
            })
        );
    }
}
