// src/app/services/search.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchTermSource = new BehaviorSubject<string>('');
  currentSearchTerm$ = this.searchTermSource.asObservable();

  updateSearchTerm(term: string) {
    this.searchTermSource.next(term);
  }
}
