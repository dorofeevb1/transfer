import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    constructor(private http: HttpClient) { }

    private createAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('jwt_token');
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    }

    get<T>(url: string, params?: HttpParams): Observable<T> {
        const headers = this.createAuthHeaders();
        return this.http.get<T>(url, { headers, params });
    }

    post<T>(url: string, body: any): Observable<T> {
        const headers = this.createAuthHeaders();
        return this.http.post<T>(url, body, { headers });
    }

    put<T>(url: string, body: any): Observable<T> {
        const headers = this.createAuthHeaders();
        return this.http.put<T>(url, body, { headers });
    }

    delete<T>(url: string, body?: any): Observable<T> {
        const headers = this.createAuthHeaders();
        if (body) {
            return this.http.request<T>('delete', url, { headers, body });
        }
        return this.http.delete<T>(url, { headers });
    }
}
