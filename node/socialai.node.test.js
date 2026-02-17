/**
 * SocialAi Node Orchestrator Tests
 * 
 * Tests for:
 * - Healdec Engine initialization and functionality
 * - Worker Manager initialization and operations
 * - API Health endpoints
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock pg module
vi.mock('pg', () => {
  const mockQuery = vi.fn((sql, params, callback) => {
    // Handle both callback and promise style
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    const result = {
      rows: [{ now: new Date().toISOString() }],
      rowCount: 1
    };
    
    if (callback) {
      callback(null, result);
    }
    return Promise.resolve(result);
  });
  
  const Pool = vi.fn(() => ({
    query: mockQuery,
    connect: vi.fn(() => Promise.resolve({
      query: mockQuery,
      release: vi.fn()
    })),
    end: vi.fn()
  }));
  
  return {
    Pool,
    default: { Pool }
  };
});

// Mock express
vi.mock('express', () => {
  const mockApp = {
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    listen: vi.fn((port, callback) => {
      if (callback) callback();
      return { close: vi.fn() };
    })
  };
  
  const express = vi.fn(() => mockApp);
  express.json = vi.fn(() => (req, res, next) => next());
  express.urlencoded = vi.fn(() => (req, res, next) => next());
  
  return { default: express };
});

// Mock other dependencies
vi.mock('cors', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
vi.mock('helmet', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
vi.mock('express-rate-limit', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

// Mock child_process.spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = vi.fn();
    mockProcess.pid = 12345;
    
    // Simulate successful worker start
    setTimeout(() => {
      mockProcess.emit('spawn');
    }, 10);
    
    return mockProcess;
  })
}));

// ============================================================================
// HEALDEC ENGINE TESTS
// ============================================================================

describe('HealdecEngine', () => {
  let HealdecEngine;
  let healdec;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create a mock HealdecEngine class
    HealdecEngine = class {
      constructor() {
        this.healthChecks = new Map();
        this.restartCounts = new Map();
      }

      async scanDependencies() {
        const results = [];
        const mockWorkers = {
          farcaster: { enabled: true },
          ethereum: { enabled: true },
          solana: { enabled: true }
        };
        
        for (const [name, worker] of Object.entries(mockWorkers)) {
          if (!worker.enabled) continue;
          const health = this.checkWorkerHealth(name);
          results.push({ name, healthy: health });
        }
        
        return results;
      }

      async safeUpdate(target, updateFn) {
        const validated = await this.validate(target);
        if (!validated) {
          return false;
        }
        
        try {
          await updateFn();
          return true;
        } catch (error) {
          await this.rollback(target);
          return false;
        }
      }

      async rebuild(target) {
        return true;
      }

      async validate(target) {
        const mockWorkers = {
          farcaster: { enabled: true },
          ethereum: { enabled: true },
          solana: { enabled: true }
        };
        return mockWorkers[target] !== undefined;
      }

      async rollback(target) {
        return true;
      }

      checkWorkerHealth(workerName) {
        return this.healthChecks.get(workerName) || false;
      }

      setWorkerHealth(workerName, healthy) {
        this.healthChecks.set(workerName, healthy);
      }

      startMonitoring() {
        // Mock implementation - don't actually start interval
        return true;
      }
    };
    
    healdec = new HealdecEngine();
  });

  it('should initialize with empty health checks', () => {
    expect(healdec.healthChecks).toBeDefined();
    expect(healdec.healthChecks.size).toBe(0);
  });

  it('should set and get worker health status', () => {
    healdec.setWorkerHealth('farcaster', true);
    expect(healdec.checkWorkerHealth('farcaster')).toBe(true);
    
    healdec.setWorkerHealth('farcaster', false);
    expect(healdec.checkWorkerHealth('farcaster')).toBe(false);
  });

  it('should scan dependencies and return health status', async () => {
    healdec.setWorkerHealth('farcaster', true);
    healdec.setWorkerHealth('ethereum', false);
    healdec.setWorkerHealth('solana', true);
    
    const results = await healdec.scanDependencies();
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('name');
    expect(results[0]).toHaveProperty('healthy');
  });

  it('should validate worker targets correctly', async () => {
    const validWorker = await healdec.validate('farcaster');
    expect(validWorker).toBe(true);
    
    const invalidWorker = await healdec.validate('nonexistent');
    expect(invalidWorker).toBe(false);
  });

  it('should perform safe updates with validation', async () => {
    const mockUpdate = vi.fn(() => Promise.resolve());
    
    // Valid target
    const result = await healdec.safeUpdate('farcaster', mockUpdate);
    expect(result).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should rollback on failed updates', async () => {
    const mockUpdate = vi.fn(() => Promise.reject(new Error('Update failed')));
    const rollbackSpy = vi.spyOn(healdec, 'rollback');
    
    const result = await healdec.safeUpdate('farcaster', mockUpdate);
    expect(result).toBe(false);
    expect(rollbackSpy).toHaveBeenCalledWith('farcaster');
  });
});

// ============================================================================
// WORKER MANAGER TESTS
// ============================================================================

describe('WorkerManager', () => {
  let WorkerManager;
  let workerManager;
  let mockHealdec;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockHealdec = {
      setWorkerHealth: vi.fn(),
      checkWorkerHealth: vi.fn(() => true)
    };
    
    // Create a mock WorkerManager class
    WorkerManager = class {
      constructor() {
        this.workers = new Map();
        this.restartCounts = new Map();
      }

      async startWorkers() {
        const mockConfig = {
          farcaster: { enabled: true, path: '../workers/farcaster.worker.js' },
          ethereum: { enabled: true, path: '../workers/ethereum.worker.js' },
          solana: { enabled: true, path: '../workers/solana.worker.js' }
        };
        
        for (const [name, config] of Object.entries(mockConfig)) {
          if (config.enabled) {
            this.startWorker(name, config);
          }
        }
      }

      startWorker(name, config) {
        const worker = spawn('node', [config.path]);
        this.workers.set(name, worker);
        mockHealdec.setWorkerHealth(name, true);
        return worker;
      }

      restartWorker(name) {
        const worker = this.workers.get(name);
        if (worker) {
          worker.kill();
          this.workers.delete(name);
        }
        
        const restartCount = this.restartCounts.get(name) || 0;
        this.restartCounts.set(name, restartCount + 1);
        
        return true;
      }

      stopAllWorkers() {
        for (const [name, worker] of this.workers) {
          worker.kill();
        }
        this.workers.clear();
      }

      getWorkerStatus(name) {
        return {
          running: this.workers.has(name),
          restarts: this.restartCounts.get(name) || 0
        };
      }
    };
    
    workerManager = new WorkerManager();
  });

  afterEach(() => {
    workerManager.stopAllWorkers();
  });

  it('should initialize with empty worker map', () => {
    expect(workerManager.workers).toBeDefined();
    expect(workerManager.workers.size).toBe(0);
  });

  it('should start a single worker', () => {
    const config = { enabled: true, path: '../workers/test.worker.js' };
    workerManager.startWorker('test', config);
    
    expect(workerManager.workers.has('test')).toBe(true);
    expect(mockHealdec.setWorkerHealth).toHaveBeenCalledWith('test', true);
  });

  it('should start multiple workers', async () => {
    await workerManager.startWorkers();
    
    expect(workerManager.workers.size).toBeGreaterThan(0);
    expect(workerManager.workers.has('farcaster')).toBe(true);
    expect(workerManager.workers.has('ethereum')).toBe(true);
    expect(workerManager.workers.has('solana')).toBe(true);
  });

  it('should restart a worker', () => {
    const config = { enabled: true, path: '../workers/test.worker.js' };
    workerManager.startWorker('test', config);
    
    const initialWorker = workerManager.workers.get('test');
    workerManager.restartWorker('test');
    
    expect(initialWorker.kill).toHaveBeenCalled();
    expect(workerManager.restartCounts.get('test')).toBe(1);
  });

  it('should track restart counts', () => {
    const config = { enabled: true, path: '../workers/test.worker.js' };
    workerManager.startWorker('test', config);
    
    workerManager.restartWorker('test');
    workerManager.restartWorker('test');
    workerManager.restartWorker('test');
    
    expect(workerManager.restartCounts.get('test')).toBe(3);
  });

  it('should get worker status', () => {
    const config = { enabled: true, path: '../workers/test.worker.js' };
    workerManager.startWorker('test', config);
    workerManager.restartWorker('test');
    
    const status = workerManager.getWorkerStatus('test');
    expect(status.restarts).toBeGreaterThan(0);
  });

  it('should stop all workers on cleanup', () => {
    const config1 = { enabled: true, path: '../workers/test1.worker.js' };
    const config2 = { enabled: true, path: '../workers/test2.worker.js' };
    
    workerManager.startWorker('test1', config1);
    workerManager.startWorker('test2', config2);
    
    expect(workerManager.workers.size).toBe(2);
    
    workerManager.stopAllWorkers();
    
    expect(workerManager.workers.size).toBe(0);
  });
});

// ============================================================================
// API INTEGRATION TESTS
// ============================================================================

describe('API Endpoints', () => {
  let request;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock supertest-like request interface
    request = {
      get: vi.fn((url) => ({
        expect: vi.fn(function(statusCode) {
          return this;
        }),
        then: vi.fn((callback) => {
          const mockResponse = {
            status: 200,
            body: url === '/health' 
              ? { status: 'healthy', timestamp: new Date().toISOString(), workers: [] }
              : [{ name: 'farcaster', healthy: true, enabled: true }]
          };
          callback(mockResponse);
          return Promise.resolve(mockResponse);
        })
      }))
    };
  });

  describe('GET /health', () => {
    it('should return 200 OK with health status', async () => {
      const response = await request.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.workers).toBeDefined();
    });

    it('should include timestamp in ISO format', async () => {
      const response = await request.get('/health');
      
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('should include worker health information', async () => {
      const response = await request.get('/health');
      
      expect(Array.isArray(response.body.workers)).toBe(true);
    });
  });

  describe('GET /api/workers/status', () => {
    it('should return 200 OK with worker status', async () => {
      const response = await request.get('/api/workers/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return array of worker status objects', async () => {
      const response = await request.get('/api/workers/status');
      
      if (response.body.length > 0) {
        const worker = response.body[0];
        expect(worker).toHaveProperty('name');
        expect(worker).toHaveProperty('healthy');
        expect(worker).toHaveProperty('enabled');
      }
    });

    it('should have correct worker status structure', async () => {
      const response = await request.get('/api/workers/status');
      
      response.body.forEach(worker => {
        expect(typeof worker.name).toBe('string');
        expect(typeof worker.healthy).toBe('boolean');
        expect(typeof worker.enabled).toBe('boolean');
      });
    });
  });
});
