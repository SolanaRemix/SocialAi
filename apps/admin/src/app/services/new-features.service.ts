import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { SmartBrainStatus, ConfigSuggestion, ContractsHealth, Setting } from '../models/admin.models';

const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class SmartBrainService {
  constructor(private http: HttpClient) {}

  getStatus(): Observable<SmartBrainStatus> {
    return this.http.get<SmartBrainStatus>(`${API_URL}/smartbrain/status`).pipe(
      catchError(() => of({
        embeddings_queue_depth: 0,
        last_run_at: null,
        avg_processing_time: null,
        error_rate: 0,
        enabled: true
      }))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class ConfigSuggestionsService {
  constructor(private http: HttpClient) {}

  getSuggestions(status?: string): Observable<ConfigSuggestion[]> {
    const url = status
      ? `${API_URL}/config/suggestions?status=${status}`
      : `${API_URL}/config/suggestions`;
    return this.http.get<ConfigSuggestion[]>(url).pipe(catchError(() => of([])));
  }

  acceptSuggestion(id: string): Observable<ConfigSuggestion | null> {
    return this.http.post<ConfigSuggestion>(`${API_URL}/config/suggestions/${id}/accept`, {}).pipe(
      catchError(() => of(null))
    );
  }

  rejectSuggestion(id: string): Observable<ConfigSuggestion | null> {
    return this.http.post<ConfigSuggestion>(`${API_URL}/config/suggestions/${id}/reject`, {}).pipe(
      catchError(() => of(null))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class ContractsService {
  constructor(private http: HttpClient) {}

  getHealth(): Observable<ContractsHealth> {
    return this.http.get<ContractsHealth>(`${API_URL}/contracts/health`).pipe(
      catchError(() => of({ chains: [], overall_healthy: false }))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class ConfigViewService {
  constructor(private http: HttpClient) {}

  getSettings(): Observable<Setting[]> {
    return this.http.get<Setting[]>(`${API_URL}/settings`).pipe(catchError(() => of([])));
  }

  getFeatureFlags(): Observable<{ flag_name: string; enabled: boolean; description: string }[]> {
    return this.http.get<{ flag_name: string; enabled: boolean; description: string }[]>(
      `${API_URL}/feature-flags`
    ).pipe(catchError(() => of([])));
  }
}
