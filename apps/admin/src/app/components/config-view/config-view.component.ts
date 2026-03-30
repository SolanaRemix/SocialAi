import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigViewService } from '../../services/new-features.service';
import { Setting } from '../../models/admin.models';

@Component({
  selector: 'app-config-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './config-view.component.html',
  styleUrls: ['./config-view.component.css']
})
export class ConfigViewComponent implements OnInit {
  settings: Setting[] = [];
  featureFlags: { flag_name: string; enabled: boolean; description: string }[] = [];
  loading = true;
  error: string | null = null;

  constructor(private configService: ConfigViewService) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    this.configService.getSettings().subscribe({
      next: (s) => { this.settings = s; this.checkDone(); },
      error: () => { this.error = 'Failed to load settings'; this.checkDone(); }
    });
    this.configService.getFeatureFlags().subscribe({
      next: (f) => { this.featureFlags = f; this.checkDone(); },
      error: () => { this.error = (this.error ?? '') + ' Failed to load feature flags'; this.checkDone(); }
    });
  }

  private _done = 0;
  private checkDone() {
    this._done++;
    if (this._done >= 2) this.loading = false;
  }

  formatValue(v: unknown): string {
    if (typeof v === 'object') return JSON.stringify(v, null, 2);
    return String(v);
  }
}
