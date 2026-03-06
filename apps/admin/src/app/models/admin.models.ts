export interface Worker {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'stopped';
  type: string;
  lastHeartbeat: Date;
  uptime: number;
  tasksProcessed: number;
  errorCount: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemMetrics {
  totalWorkers: number;
  activeWorkers: number;
  totalTasks: number;
  tasksProcessed: number;
  errorRate: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface SyncControl {
  id: string;
  source: string;
  status: 'idle' | 'syncing' | 'error';
  lastSync: Date;
  nextSync: Date;
  enabled: boolean;
  recordsProcessed: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface SmartBrainStatus {
  embeddings_queue_depth: number;
  last_run_at: string | null;
  avg_processing_time: number | null;
  error_rate: number;
  enabled: boolean;
}

export interface ConfigSuggestion {
  id: string;
  type: string;
  description: string;
  proposed_change: { key: string; from: unknown; to: unknown };
  confidence: number;
  status: 'new' | 'accepted' | 'rejected';
  created_at: string;
}

export interface ChainHealth {
  name: string;
  configured: boolean;
  reachable: boolean;
  latency_ms: number | null;
  error?: string;
}

export interface ContractsHealth {
  chains: ChainHealth[];
  overall_healthy: boolean;
}

export interface Setting {
  id: string;
  key: string;
  value: unknown;
  description: string;
  updated_at: string;
}
