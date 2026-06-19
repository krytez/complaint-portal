import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  matricNumber?: string | null;
  role: 'STUDENT' | 'ADMIN';
}

export interface SuperAdminComplaint {
  id: string;
  description: string;
  status: string;
  createdAt: string;
  adminComment: string | null;
  student: { name: string; email: string };
}

export interface DeleteResult {
  deleted: number;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/super-admin`;

  getUsers(): Observable<SuperAdminUser[]> {
    return this.http.get<ApiResponse<SuperAdminUser[]>>(`${this.base}/users`).pipe(
      map(res => res.data)
    );
  }

  deleteAllUsers(password: string): Observable<DeleteResult> {
    return this.http.delete<ApiResponse<DeleteResult>>(`${this.base}/users`, {
      body: { password },
    }).pipe(
      map(res => res.data)
    );
  }

  deleteSelectedUsers(ids: string[], password: string): Observable<DeleteResult> {
    return this.http.delete<ApiResponse<DeleteResult>>(`${this.base}/users/batch`, {
      body: { ids, password },
    }).pipe(
      map(res => res.data)
    );
  }

  getComplaints(): Observable<SuperAdminComplaint[]> {
    return this.http.get<ApiResponse<SuperAdminComplaint[]>>(`${this.base}/complaints`).pipe(
      map(res => res.data)
    );
  }

  deleteAllComplaints(password: string): Observable<DeleteResult> {
    return this.http.delete<ApiResponse<DeleteResult>>(`${this.base}/complaints`, {
      body: { password },
    }).pipe(
      map(res => res.data)
    );
  }

  deleteSelectedComplaints(ids: string[], password: string): Observable<DeleteResult> {
    return this.http.delete<ApiResponse<DeleteResult>>(`${this.base}/complaints/batch`, {
      body: { ids, password },
    }).pipe(
      map(res => res.data)
    );
  }

  resetApplication(password: string): Observable<DeleteResult> {
    return this.http.delete<ApiResponse<DeleteResult>>(`${this.base}/reset`, {
      body: { password },
    }).pipe(
      map(res => res.data)
    );
  }
}
