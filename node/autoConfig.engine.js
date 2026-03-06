/**
 * AutoConfig Engine
 *
 * Reads runtime metrics from the worker manager and database settings,
 * then produces ranked config-change suggestions (no direct mutations).
 *
 * Suggestions are persisted to the `config_suggestions` table and exposed
 * via the REST API.  They can be accepted or rejected through the API and
 * the engine runs on a 24-hour cadence via the orchestrator.
 */

import { randomUUID } from 'crypto';

// ============================================================================
// SUGGESTION TYPES
// ============================================================================

/**
 * @typedef {Object} Suggestion
 * @property {string} id
 * @property {string} type
 * @property {string} description
 * @property {{ key: string, from: any, to: any }} proposed_change
 * @property {number} confidence  0-1
 * @property {string} status      'new' | 'accepted' | 'rejected'
 * @property {string} created_at
 */

// ============================================================================
// AUTO-CONFIG ENGINE CLASS
// ============================================================================

export class AutoConfigEngine {
  /**
   * @param {import('pg').Pool} db
   * @param {{ workers: Object }} config      project CONFIG reference
   * @param {Object} workerManager            WorkerManager instance (duck-typed)
   */
  constructor(db, config, workerManager) {
    this.db = db;
    this.config = config;
    this.workerManager = workerManager;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Evaluate current metrics and generate suggestion objects.
   * Does NOT write to the database — call `persistSuggestions()` for that.
   *
   * @returns {Promise<Suggestion[]>}
   */
  async generateSuggestions() {
    const suggestions = [];

    const metrics = await this._collectMetrics();
    const settings = await this._loadSettings();

    // Rule 1: high worker error rate → suggest enabling auto-test
    if (metrics.workerErrorRate > 0.2) {
      suggestions.push({
        id: this._uuid(),
        type: 'worker_health',
        description: `Worker error rate is ${(metrics.workerErrorRate * 100).toFixed(1)}% (>20%). Consider enabling auto-test mode.`,
        proposed_change: { key: 'auto_test_enabled', from: false, to: true },
        confidence: Math.min(0.95, 0.5 + metrics.workerErrorRate),
        status: 'new',
        created_at: new Date().toISOString()
      });
    }

    // Rule 2: high DB connection usage → suggest increasing sync interval
    if (metrics.dbConnectionUsage > 0.8) {
      const currentInterval = settings.sync_interval?.minutes ?? 5;
      const proposed = currentInterval + 5;
      suggestions.push({
        id: this._uuid(),
        type: 'db_capacity',
        description: `DB connection usage at ${(metrics.dbConnectionUsage * 100).toFixed(0)}% (>80%). Suggest increasing sync interval to ${proposed} minutes.`,
        proposed_change: { key: 'sync_interval', from: { minutes: currentInterval }, to: { minutes: proposed } },
        confidence: 0.8,
        status: 'new',
        created_at: new Date().toISOString()
      });
    }

    // Rule 3: large embedding queue → suggest scaling AI worker interval down
    if (metrics.embeddingQueueDepth > 100) {
      suggestions.push({
        id: this._uuid(),
        type: 'ai_scaling',
        description: `Embedding queue depth is ${metrics.embeddingQueueDepth} (>100). Suggest reducing AI worker interval to process faster.`,
        proposed_change: { key: 'ai_worker_interval_ms', from: 60000, to: 30000 },
        confidence: 0.75,
        status: 'new',
        created_at: new Date().toISOString()
      });
    }

    // Rule 4: all workers unhealthy → suggest system restart
    if (metrics.unhealthyWorkerCount === metrics.totalWorkerCount && metrics.totalWorkerCount > 0) {
      suggestions.push({
        id: this._uuid(),
        type: 'system_restart',
        description: `All ${metrics.totalWorkerCount} workers are unhealthy. A full system restart may be required.`,
        proposed_change: { key: 'restart_all_workers', from: false, to: true },
        confidence: 0.9,
        status: 'new',
        created_at: new Date().toISOString()
      });
    }

    return suggestions;
  }

  /**
   * Generate suggestions and write them to `config_suggestions` table.
   *
   * @returns {Promise<Suggestion[]>}
   */
  async persistSuggestions() {
    const suggestions = await this.generateSuggestions();

    for (const s of suggestions) {
      try {
        await this.db.query(
          `INSERT INTO config_suggestions (id, type, description, proposed_change, confidence, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.type, s.description, JSON.stringify(s.proposed_change), s.confidence, s.status, s.created_at]
        );
      } catch (err) {
        console.error('[AutoConfig] Failed to persist suggestion:', err.message);
      }
    }

    return suggestions;
  }

  /**
   * Return all suggestions from the DB, optionally filtered by status.
   *
   * @param {string|null} status
   * @returns {Promise<Suggestion[]>}
   */
  async getSuggestions(status = null) {
    try {
      let query = 'SELECT * FROM config_suggestions ORDER BY created_at DESC LIMIT 200';
      const params = [];

      if (status) {
        query = 'SELECT * FROM config_suggestions WHERE status = $1 ORDER BY created_at DESC LIMIT 200';
        params.push(status);
      }

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (err) {
      console.error('[AutoConfig] getSuggestions error:', err.message);
      return [];
    }
  }

  /**
   * Update status of a single suggestion.
   *
   * @param {string} id
   * @param {'accepted'|'rejected'} status
   * @returns {Promise<Suggestion|null>}
   */
  async updateSuggestionStatus(id, status) {
    try {
      const result = await this.db.query(
        `UPDATE config_suggestions SET status = $1 WHERE id = $2 RETURNING *`,
        [status, id]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error('[AutoConfig] updateSuggestionStatus error:', err.message);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  async _collectMetrics() {
    // Worker error rate derived from healdec health map
    const workerEntries = this.workerManager?.workers
      ? [...this.workerManager.workers.entries()]
      : [];

    const totalWorkerCount = workerEntries.length || Object.keys(this.config?.workers ?? {}).length;
    const unhealthyWorkerCount = workerEntries.filter(([, w]) => w?.killed).length;
    const workerErrorRate = totalWorkerCount > 0 ? unhealthyWorkerCount / totalWorkerCount : 0;

    // DB connection usage (pool idleCount / totalCount)
    let dbConnectionUsage = 0;
    try {
      const pool = this.db;
      const total = (pool.totalCount ?? 0) + (pool.idleCount ?? 0) + (pool.waitingCount ?? 0);
      const active = pool.totalCount ?? 0;
      dbConnectionUsage = total > 0 ? active / total : 0;
    } catch (_) { /* non-fatal */ }

    // Embedding queue depth
    let embeddingQueueDepth = 0;
    try {
      const result = await this.db.query(
        `SELECT COUNT(*) AS depth FROM embeddings WHERE embedding IS NULL`
      );
      embeddingQueueDepth = parseInt(result.rows[0]?.depth ?? '0', 10);
    } catch (_) { /* non-fatal */ }

    return { workerErrorRate, dbConnectionUsage, embeddingQueueDepth, unhealthyWorkerCount, totalWorkerCount };
  }

  async _loadSettings() {
    try {
      const result = await this.db.query('SELECT key, value FROM settings');
      return Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    } catch (_) {
      return {};
    }
  }

  _uuid() {
    return randomUUID();
  }
}
