import { Injectable } from '@angular/core';
import { ApiService } from './api-service';
import { Observable, of } from 'rxjs';

export interface UserData {
    id: number;
    fio: string;
    role: string;
    access: string;
    email: string;
    password?: string;
}

@Injectable({
    providedIn: 'root',
})
export class UserService {
    constructor(private apiService: ApiService) { }

    // Получить всех пользователей
    getAllUsers(): Observable<UserData[]> {
        const endpoint = 'api/users'; // Замените на актуальный URL API
        return this.apiService.get<UserData[]>(endpoint);
    }

    getUsersPage(pageIndex: number, pageSize: number): Observable<{ users: UserData[], totalCount: number }> {
        const endpoint = 'api/users/page'; // заменить URL
        return this.apiService.post<{ users: UserData[], totalCount: number }>(endpoint, { pageIndex, pageSize });
    }
    getRoles(): Observable<string[]> {
        // Возвращаем КЛЮЧИ для перевода, которые уже есть в JSON файлах
        return of([
            'USERS_TABLE.ROLES.MANAGER',
            'USERS_TABLE.ROLES.CLIENT',
            'USERS_TABLE.ROLES.MERCHANDISER'
        ]);
    }


    // НОВЫЙ МЕТОД: Получение уровней доступа
    getAccessLevels(): Observable<string[]> {
        // Возвращаем КЛЮЧИ для перевода
        return of([
            'USERS_TABLE.ACCESS_LEVELS.VIEW_EDIT',
            'USERS_TABLE.ACCESS_LEVELS.VIEW_ONLY'
        ]);
    }
    // Поиск пользователей по query
    searchUsers(query: string): Observable<UserData[]> {
        const endpoint = 'api/users/search'; // Замените на URL поиска
        return this.apiService.post<UserData[]>(endpoint, { query });
    }

    addUser(user: UserData): Observable<UserData> {
        const endpoint = 'api/users'; // URL API для создания пользователя
        return this.apiService.post<UserData>(endpoint, user);
    }

    updateUser(userId: number, userData: UserData): Observable<UserData> {
        const endpoint = `api/users/${userId}`;
        return this.apiService.put<UserData>(endpoint, userData);
    }

    // Массовое обновление пользователей
    bulkUpdateUsers(users: UserData[]): Observable<UserData[]> {
        const endpoint = 'api/users/bulk-update';
        return this.apiService.put<UserData[]>(endpoint, users);
    }
    changeUserEmail(userId: number, newEmail: string): Observable<any> {
        const endpoint = `api/users/${userId}/change-email`;
        return this.apiService.put(endpoint, { email: newEmail });
    }

    changeUserPassword(userId: number, newPassword: string): Observable<any> {
        const endpoint = `api/users/${userId}/change-password`;
        return this.apiService.put(endpoint, { password: newPassword });
    }

    deleteUser(userId: number): Observable<void> {
        const endpoint = `api/users/${userId}`;
        return this.apiService.delete<void>(endpoint);
    }

    // Для удаления нескольких пользователей
    deleteUsers(userIds: number[]): Observable<void> {
        const endpoint = 'api/users/bulk-delete';
        return this.apiService.delete<void>(endpoint, userIds);
    }

}
