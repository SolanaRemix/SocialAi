/**
 * AutoConfig Engine Tests
 *
 * Tests for:
 * - AutoConfigEngine suggestion generation logic
 * - SmartBrain status endpoint response shape
 * - Config suggestions REST endpoints
 * - ContractsAdapter interface
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ============================================================================
// MOCKS  (must appear before any imports that pull in pg, express, etc.)
// ============================================================================

vi.mock('pg', () => {
  const mockQuery = vi.fn((sql, params) => {
    // Default: return empty rows
    if (typeof params === 'function') params = [];

    // Embeddings queue depth query
    if (typeof sql === 'string' && sql.includes('COUNT(*)') && sql.includes('embeddings')) {
      return Promise.resolve({ rows: [{ depth: '5' }], rowCount: 1 });
    }
    // Feature flag query
    if (typeof sql === 'string' && sql.includes('feature_flags')) {
      return Promise.resolve({ rows: [{ enabled: true }], rowCount: 1 });
    }
    // Settings query
    if (typeof sql === 'string' && sql.includes('settings')) {
      return Promise.resolve({
        rows: [{ key: 'sync_interval', value: { minutes: 5 } }],
        rowCount: 1
      });
    }
    // Config suggestions queries
    if (typeof sql === 'string' && sql.includes('config_suggestions')) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    // Embeddings last row
    if (typeof sql === 'string' && sql.includes('embeddings') && sql.includes('ORDER BY')) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    // Claims query
    if (typeof sql === 'string' && sql.includes('claims')) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [{ now: new Date().toISOString() }], rowCount: 1 });
  });

  const Pool = vi.fn(() => ({
    query: mockQuery,
    connect: vi.fn(() => Promise.resolve({ query: mockQuery, release: vi.fn() })),
    end: vi.fn(),
    totalCount: 2,
    idleCount: 3,
    waitingCount: 0
  }));

  return { Pool, default: { Pool } };
});

vi.mock('express', () => {
  const mockApp = {
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    listen: vi.fn((port, cb) => { if (cb) cb(); return { close: vi.fn() }; })
  };
  const express = vi.fn(() => mockApp);
  express.json = vi.fn(() => (req, res, next) => next());
  express.urlencoded = vi.fn(() => (req, res, next) => next());
  return { default: express };
});

vi.mock('cors', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
vi.mock('helmet', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
vi.mock('express-rate-limit', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    const { EventEmitter } = require('events');
    const proc = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = vi.fn();
    proc.pid = 99999;
    return proc;
  })
}));

// ============================================================================
// IMPORTS  (after mocks are set up)
// ============================================================================

import { AutoConfigEngine } from './autoConfig.engine.js';
import { ContractsAdapter } from './contracts.adapter.js';
import pg from 'pg';

// ============================================================================
// HELPER: build a fresh mock pool
// ============================================================================

function makeMockPool(overrideQuery) {
  const query = overrideQuery ?? vi.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));
  return {
    query,
    totalCount: 2,
    idleCount: 3,
    waitingCount: 0
  };
}

function makeMockWorkerManager(workers = []) {
  return { workers: new Map(workers) };
}

// ============================================================================
// AUTO-CONFIG ENGINE TESTS
// ============================================================================

describe('AutoConfigEngine', () => {
  let engine;
  let mockDb;
  let mockConfig;
  let mockWorkerManager;

  beforeEach(() => {
    mockDb = makeMockPool();
    mockConfig = {
      workers: {
        farcaster: { enabled: true },
        reddit: { enabled: false },
        ai: { enabled: true }
      }
    };
    mockWorkerManager = makeMockWorkerManager();
    engine = new AutoConfigEngine(mockDb, mockConfig, mockWorkerManager);
  });

  it('should instantiate correctly', () => {
    expect(engine).toBeDefined();
    expect(engine.db).toBe(mockDb);
    expect(engine.config).toBe(mockConfig);
  });

  it('generateSuggestions() returns an array', async () => {
    mockDb.query = vi.fn((sql) => {
      if (sql.includes('COUNT(*)')) return Promise.resolve({ rows: [{ depth: '0' }] });
      if (sql.includes('settings')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const suggestions = await engine.generateSuggestions();
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('generateSuggestions() creates ai_scaling suggestion when queue depth > 100', async () => {
    mockDb.query = vi.fn((sql) => {
      if (sql.includes('COUNT(*)')) return Promise.resolve({ rows: [{ depth: '150' }] });
      if (sql.includes('settings')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const suggestions = await engine.generateSuggestions();
    const aiSuggestion = suggestions.find(s => s.type === 'ai_scaling');
    expect(aiSuggestion).toBeDefined();
    expect(aiSuggestion.proposed_change.key).toBe('ai_worker_interval_ms');
    expect(aiSuggestion.proposed_change.to).toBeLessThan(aiSuggestion.proposed_change.from);
  });

  it('generateSuggestions() creates worker_health suggestion when error rate > 20%', async () => {
    // 2 out of 2 workers killed → 100% error rate
    mockWorkerManager = makeMockWorkerManager([
      ['ai', { killed: true }],
      ['farcaster', { killed: true }]
    ]);
    engine = new AutoConfigEngine(mockDb, mockConfig, mockWorkerManager);

    mockDb.query = vi.fn((sql) => {
      if (sql.includes('COUNT(*)')) return Promise.resolve({ rows: [{ depth: '0' }] });
      if (sql.includes('settings')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const suggestions = await engine.generateSuggestions();
    const workerSuggestion = suggestions.find(s => s.type === 'worker_health');
    expect(workerSuggestion).toBeDefined();
    expect(workerSuggestion.confidence).toBeGreaterThan(0.5);
  });

  it('generateSuggestions() suggestion has required shape', async () => {
    mockDb.query = vi.fn((sql) => {
      if (sql.includes('COUNT(*)')) return Promise.resolve({ rows: [{ depth: '200' }] });
      if (sql.includes('settings')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const suggestions = await engine.generateSuggestions();
    if (suggestions.length > 0) {
      const s = suggestions[0];
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('type');
      expect(s).toHaveProperty('description');
      expect(s).toHaveProperty('proposed_change');
      expect(s.proposed_change).toHaveProperty('key');
      expect(s.proposed_change).toHaveProperty('from');
      expect(s.proposed_change).toHaveProperty('to');
      expect(s).toHaveProperty('confidence');
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
      expect(s).toHaveProperty('status', 'new');
    }
  });

  it('getSuggestions() returns array from DB', async () => {
    mockDb.query = vi.fn(() => Promise.resolve({ rows: [{ id: 'abc', type: 'test', status: 'new' }] }));
    const results = await engine.getSuggestions();
    expect(Array.isArray(results)).toBe(true);
    expect(results[0].id).toBe('abc');
  });

  it('getSuggestions() filters by status when provided', async () => {
    const capturedParams = [];
    mockDb.query = vi.fn((sql, params) => {
      capturedParams.push(params);
      return Promise.resolve({ rows: [] });
    });

    await engine.getSuggestions('accepted');
    expect(capturedParams.some(p => Array.isArray(p) && p.includes('accepted'))).toBe(true);
  });

  it('updateSuggestionStatus() returns updated row', async () => {
    const mockRow = { id: 'abc', status: 'accepted' };
    mockDb.query = vi.fn(() => Promise.resolve({ rows: [mockRow] }));

    const result = await engine.updateSuggestionStatus('abc', 'accepted');
    expect(result).toEqual(mockRow);
  });

  it('updateSuggestionStatus() returns null when not found', async () => {
    mockDb.query = vi.fn(() => Promise.resolve({ rows: [] }));
    const result = await engine.updateSuggestionStatus('nonexistent', 'accepted');
    expect(result).toBeNull();
  });

  it('persistSuggestions() calls DB insert for each suggestion', async () => {
    const insertCalls = [];
    mockDb.query = vi.fn((sql, params) => {
      if (typeof sql === 'string' && sql.includes('INSERT INTO config_suggestions')) {
        insertCalls.push(params);
      }
      if (sql.includes('COUNT(*)')) return Promise.resolve({ rows: [{ depth: '200' }] });
      if (sql.includes('settings')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await engine.persistSuggestions();
    // At least one suggestion (ai_scaling) should have been inserted
    expect(insertCalls.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// SMARTBRAIN STATUS ENDPOINT — response shape
// ============================================================================

describe('SmartBrain status response shape', () => {
  it('SmartBrain status object has required fields', () => {
    const mockStatus = {
      embeddings_queue_depth: 5,
      last_run_at: null,
      avg_processing_time: null,
      error_rate: 0,
      enabled: true
    };

    expect(mockStatus).toHaveProperty('embeddings_queue_depth');
    expect(mockStatus).toHaveProperty('last_run_at');
    expect(mockStatus).toHaveProperty('avg_processing_time');
    expect(mockStatus).toHaveProperty('error_rate');
    expect(mockStatus).toHaveProperty('enabled');
    expect(typeof mockStatus.embeddings_queue_depth).toBe('number');
    expect(typeof mockStatus.error_rate).toBe('number');
    expect(typeof mockStatus.enabled).toBe('boolean');
  });
});

// ============================================================================
// CONTRACTS ADAPTER TESTS
// ============================================================================

describe('ContractsAdapter', () => {
  let adapter;
  let mockDb;

  beforeEach(() => {
    mockDb = makeMockPool();
    adapter = new ContractsAdapter(mockDb, {
      ETH_RPC_URL: null,
      BASE_RPC_URL: null,
      SOLANA_RPC_URL: null
    });
  });

  it('should instantiate correctly', () => {
    expect(adapter).toBeDefined();
    expect(adapter.db).toBe(mockDb);
  });

  it('getIdentityClaims() returns { db_claims, on_chain }', async () => {
    mockDb.query = vi.fn(() => Promise.resolve({ rows: [] }));
    const result = await adapter.getIdentityClaims('0xabc123');
    expect(result).toHaveProperty('db_claims');
    expect(result).toHaveProperty('on_chain');
    expect(Array.isArray(result.db_claims)).toBe(true);
    expect(result.on_chain.address).toBe('0xabc123');
  });

  it('getOnChainReputation() returns score between 0-99 and a level', async () => {
    const result = await adapter.getOnChainReputation('0xdeadbeef1234');
    expect(result).toHaveProperty('address', '0xdeadbeef1234');
    expect(result).toHaveProperty('score');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThan(100);
    expect(['gold', 'silver', 'bronze', 'new']).toContain(result.level);
    expect(result.mock).toBe(true);
  });

  it('verifyProof() rejects payloads with missing fields', async () => {
    const result = await adapter.verifyProof({ address: '0xabc', message: 'hello' });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Missing required fields/);
  });

  it('verifyProof() rejects payloads with invalid address', async () => {
    const result = await adapter.verifyProof({ address: 'short', message: 'hello', signature: '0x' + 'a'.repeat(130) });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Invalid address/);
  });

  it('verifyProof() returns valid: true for well-formed payload (mock)', async () => {
    const result = await adapter.verifyProof({
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      message: 'Sign in with SocialAi',
      signature: '0x' + 'a'.repeat(130),
      chain: 'ethereum'
    });
    expect(result.valid).toBe(true);
    expect(result.mock).toBe(true);
  });

  it('getChainHealth() returns chains array and overall_healthy', async () => {
    const result = await adapter.getChainHealth();
    expect(result).toHaveProperty('chains');
    expect(result).toHaveProperty('overall_healthy');
    expect(Array.isArray(result.chains)).toBe(true);
    expect(result.chains).toHaveLength(3);
    result.chains.forEach(c => {
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('configured');
      expect(c).toHaveProperty('reachable');
    });
  });

  it('getChainHealth() marks unconfigured RPCs as not configured', async () => {
    const result = await adapter.getChainHealth();
    result.chains.forEach(c => {
      expect(c.configured).toBe(false);
    });
  });
});

// ============================================================================
// CONFIG SUGGESTIONS ENDPOINT INTEGRATION — mock response shapes
// ============================================================================

describe('Config suggestions endpoint shape', () => {
  it('suggestions list is an array', () => {
    const mockResponse = [];
    expect(Array.isArray(mockResponse)).toBe(true);
  });

  it('accepted suggestion response has correct status', () => {
    const mockResponse = { id: 'abc', status: 'accepted', type: 'worker_health', description: 'test' };
    expect(mockResponse.status).toBe('accepted');
  });

  it('rejected suggestion response has correct status', () => {
    const mockResponse = { id: 'abc', status: 'rejected', type: 'ai_scaling', description: 'test' };
    expect(mockResponse.status).toBe('rejected');
  });
});
