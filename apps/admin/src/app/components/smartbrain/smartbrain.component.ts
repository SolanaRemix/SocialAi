import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmartBrainService } from '../../services/new-features.service';
import { SmartBrainStatus } from '../../models/admin.models';

@Component({
  selector: 'app-smartbrain',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './smartbrain.component.html',
  styleUrls: ['./smartbrain.component.css']
})
export class SmartBrainComponent implements OnInit {
  status: SmartBrainStatus | null = null;
  loading = true;
  error: string | null = null;
  actionMessage: string | null = null;

  constructor(private sbService: SmartBrainService) {}

  ngOnInit(): void {
    this.loadStatus();
    setInterval(() => this.loadStatus(), 15000);
  }

  loadStatus(): void {
    this.sbService.getStatus().subscribe({
      next: (s) => { this.status = s; this.loading = false; },
      error: () => { this.error = 'Failed to load SmartBrain status'; this.loading = false; }
    });
  }

  triggerAnalysis(): void {
    // TODO: wire to POST /api/ai/rerun endpoint when available
    this.actionMessage = 'Analysis re-run queued (stub — endpoint not yet implemented)';
    setTimeout(() => (this.actionMessage = null), 4000);
  }

  triggerClustering(): void {
    // TODO: wire to POST /api/ai/cluster endpoint when available
    this.actionMessage = 'Topic clustering triggered (stub — endpoint not yet implemented)';
    setTimeout(() => (this.actionMessage = null), 4000);
  }

  triggerSentimentRefresh(): void {
    // TODO: wire to POST /api/ai/sentiment endpoint when available
    this.actionMessage = 'Sentiment refresh triggered (stub — endpoint not yet implemented)';
    setTimeout(() => (this.actionMessage = null), 4000);
  }

  formatDate(d: string | null): string {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString();
  }
}
