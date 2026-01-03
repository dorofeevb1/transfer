import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    constructor(private http: HttpClient) { }
    apiurl = 'https://37.77.104.201.sslip.io'
    private createAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('jwt-token');
        const lang = localStorage.getItem('lang') || 'ru';

        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', `Bearer ${token}`);
        }
        headers = headers.set('Accept-Language', lang);
        return headers;
    }


    get<T>(url: string, params?: HttpParams): Observable<T> {
        const headers = this.createAuthHeaders();
        return this.http.get<T>(this.apiurl + '/' + url, { headers, params });
    }

    post<T>(url: string, body: any, options: any = {}): Observable<T> {
        const headers = this.createAuthHeaders();
        // Fix: Cast options to 'any' to satisfy input types, 
        // and cast the result to 'Observable<T>' to satisfy return type
        return this.http.post<T>(this.apiurl + '/' + url, body, { headers, ...options } as any) as Observable<T>;
    }

    put<T>(url: string, body: any, options: any = {}): Observable<T> {
        const headers = this.createAuthHeaders();
        return this.http.put<T>(this.apiurl + '/' + url, body, { headers, ...options } as any) as Observable<T>;
    }

    delete<T>(url: string, body?: any): Observable<T> {
        const headers = this.createAuthHeaders();
        if (body) {
            return this.http.request<T>('delete', url, { headers, body });
        }
        return this.http.delete<T>(this.apiurl + '/' + url, { headers });
    }
}
