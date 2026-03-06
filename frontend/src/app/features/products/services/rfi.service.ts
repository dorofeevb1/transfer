import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ApiService } from 'src/app/core/services/api-service/api-service';
import {
  Rfi,
  RfiDetail,
  RfiListResponse,
  RfiLine,
  RfiStatus,
  RfiTemplate,
  RfiTransformPreview
} from '../models/rfi.interfaces';

@Injectable({
  providedIn: 'root'
})
export class RfiService {
  private rfiListSubject = new BehaviorSubject<Rfi[]>([]);
  private totalCountSubject = new BehaviorSubject<number>(0);

  public rfiList$ = this.rfiListSubject.asObservable();
  public totalCount$ = this.totalCountSubject.asObservable();

  constructor(private apiService: ApiService) {}

  // --- LIST ---

  loadRfiList(pageIndex: number, pageSize: number, search?: string, status?: RfiStatus): void {
    let params = new HttpParams()
      .set('page', pageIndex.toString())
      .set('size', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (status) {
      params = params.set('status', status);
    }

    this.apiService.get<RfiListResponse>('api/rfi/', params).subscribe(response => {
      this.rfiListSubject.next(response.items || []);
      this.totalCountSubject.next(response.totalCount || 0);
    });
  }

  // --- DETAIL ---

  getRfiDetail(id: string): Observable<RfiDetail> {
    return this.apiService.get<RfiDetail>(`api/rfi/${id}/`);
  }

  // --- CRUD ---

  createRfi(data: Partial<Rfi> & { template_id?: string; lines?: Partial<RfiLine>[] }): Observable<RfiDetail> {
    return this.apiService.post<RfiDetail>('api/rfi/', data);
  }

  updateRfi(id: string, data: Partial<Rfi>): Observable<RfiDetail> {
    return this.apiService.put<RfiDetail>(`api/rfi/${id}/`, data);
  }

  deleteRfi(id: string): Observable<void> {
    return this.apiService.delete<void>(`api/rfi/${id}/`);
  }

  // --- LINES ---

  updateRfiLine(rfiId: string, lineId: string, data: Partial<RfiLine>): Observable<RfiLine> {
    return this.apiService.put<RfiLine>(`api/rfi/${rfiId}/lines/${lineId}/`, data);
  }

  addRfiLine(rfiId: string, data: Partial<RfiLine>): Observable<RfiLine> {
    return this.apiService.post<RfiLine>(`api/rfi/${rfiId}/lines/`, data);
  }

  deleteRfiLine(rfiId: string, lineId: string): Observable<void> {
    return this.apiService.delete<void>(`api/rfi/${rfiId}/lines/${lineId}/`);
  }

  // --- STATUS ---

  changeStatus(id: string, newStatus: RfiStatus, comment?: string): Observable<RfiDetail> {
    return this.apiService.post<RfiDetail>(`api/rfi/${id}/status/`, { status: newStatus, comment });
  }

  // --- TEMPLATES ---

  getTemplates(): Observable<RfiTemplate[]> {
    return this.apiService.get<RfiTemplate[]>('api/rfi/templates/');
  }

  // --- TRANSFORM ---

  previewTransform(id: string): Observable<RfiTransformPreview> {
    return this.apiService.get<RfiTransformPreview>(`api/rfi/${id}/transform/preview/`);
  }

  confirmTransform(id: string): Observable<{ success: boolean; created: number; updated: number }> {
    return this.apiService.post<{ success: boolean; created: number; updated: number }>(
      `api/rfi/${id}/transform/confirm/`, {}
    );
  }
}
