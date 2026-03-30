import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractsService } from '../../services/new-features.service';
import { ContractsHealth, ChainHealth } from '../../models/admin.models';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contracts.component.html',
  styleUrls: ['./contracts.component.css']
})
export class ContractsComponent implements OnInit {
  health: ContractsHealth | null = null;
  loading = true;
  error: string | null = null;

  constructor(private contractsService: ContractsService) {}

  ngOnInit(): void {
    this.loadHealth();
    setInterval(() => this.loadHealth(), 30000);
  }

  loadHealth(): void {
    this.contractsService.getHealth().subscribe({
      next: (h) => { this.health = h; this.loading = false; },
      error: () => { this.error = 'Failed to load chain health'; this.loading = false; }
    });
  }

  statusIcon(chain: ChainHealth): string {
    if (!chain.configured) return '⚪';
    return chain.reachable ? '🟢' : '🔴';
  }

  latencyLabel(chain: ChainHealth): string {
    if (!chain.configured) return 'Not configured';
    if (chain.latency_ms == null) return 'N/A';
    return `${chain.latency_ms}ms`;
  }
}
