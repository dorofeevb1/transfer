import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { ApiService } from './api-service';

export type UserRole = 'admin' | 'user' | null;

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserRole = new BehaviorSubject<UserRole>(null);
    public currentUserRole$ = this.currentUserRole.asObservable();

    private useMock = true;

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

    login(email: string, password: string): Observable<boolean> {
        if (this.useMock) {
            const user = this.mockUsers.find(u => u.email === email.toLowerCase() && u.password === password);
            if (user) {
                return of(true).pipe(
                    delay(500),
                    tap(() => {
                        this.setRole(user.role);
                        sessionStorage.setItem('jwt_token', user.token);
                    })
                );
            } else {
                return of(false).pipe(delay(500));
            }
        }
        else {
            return this.apiService.post<{ success: boolean; token?: string; role?: string }>('/auth/login', { email, password }).pipe(
                tap(response => {
                    if (response.success && response.token && response.role) {
                        sessionStorage.setItem('jwt_token', response.token);
                        this.setRole(response.role as UserRole);
                    }
                }),
                map(response => response.success)
            );
        }
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
}
