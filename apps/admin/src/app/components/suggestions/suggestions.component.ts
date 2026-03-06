import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigSuggestionsService } from '../../services/new-features.service';
import { ConfigSuggestion } from '../../models/admin.models';

@Component({
  selector: 'app-suggestions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './suggestions.component.html',
  styleUrls: ['./suggestions.component.css']
})
export class SuggestionsComponent implements OnInit {
  suggestions: ConfigSuggestion[] = [];
  loading = true;
  error: string | null = null;
  filterStatus = '';

  constructor(private suggestionsService: ConfigSuggestionsService) {}

  ngOnInit(): void {
    this.loadSuggestions();
  }

  loadSuggestions(): void {
    this.loading = true;
    this.suggestionsService.getSuggestions(this.filterStatus || undefined).subscribe({
      next: (s) => { this.suggestions = s; this.loading = false; },
      error: () => { this.error = 'Failed to load suggestions'; this.loading = false; }
    });
  }

  accept(id: string): void {
    this.suggestionsService.acceptSuggestion(id).subscribe({
      next: () => this.loadSuggestions(),
      error: () => { this.error = 'Failed to accept suggestion'; }
    });
  }

  reject(id: string): void {
    this.suggestionsService.rejectSuggestion(id).subscribe({
      next: () => this.loadSuggestions(),
      error: () => { this.error = 'Failed to reject suggestion'; }
    });
  }

  confidencePct(c: number): string {
    return `${Math.round(c * 100)}%`;
  }

  formatType(t: string): string {
    return t.replace(/_/g, ' ');
  }
}
