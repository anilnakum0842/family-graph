import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FamilyData } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class FamilyDataService {
  private http = inject(HttpClient);
  private dataUrl = 'assets/family-graph.json';

  getFamilyData(): Observable<FamilyData> {
    return this.http.get<FamilyData>(this.dataUrl);
  }
}