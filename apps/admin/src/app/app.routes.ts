import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'workers',
    loadComponent: () => import('./components/worker-health/worker-health.component').then(m => m.WorkerHealthComponent)
  },
  {
    path: 'feature-flags',
    loadComponent: () => import('./components/feature-flags/feature-flags.component').then(m => m.FeatureFlagsComponent)
  },
  {
    path: 'sync-controls',
    loadComponent: () => import('./components/sync-controls/sync-controls.component').then(m => m.SyncControlsComponent)
  },
  {
    path: 'smartbrain',
    loadComponent: () => import('./components/smartbrain/smartbrain.component').then(m => m.SmartBrainComponent)
  },
  {
    path: 'config',
    loadComponent: () => import('./components/config-view/config-view.component').then(m => m.ConfigViewComponent)
  },
  {
    path: 'suggestions',
    loadComponent: () => import('./components/suggestions/suggestions.component').then(m => m.SuggestionsComponent)
  },
  {
    path: 'contracts',
    loadComponent: () => import('./components/contracts/contracts.component').then(m => m.ContractsComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
