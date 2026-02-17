# Testing Guide

This document explains how to run tests for the SocialAi project.

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose (for running with PostgreSQL)

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with coverage
```bash
npm test -- --coverage
```

## Test Structure

### Unit Tests
- **HealdecEngine Tests**: Verify the auto-healing engine functionality
  - Health check monitoring
  - Safe updates with validation
  - Rollback on failures
  
- **WorkerManager Tests**: Verify parallel worker orchestration
  - Worker startup and shutdown
  - Worker restart with retry logic
  - Worker health tracking

### Integration Tests
- **API Endpoints**: Verify REST API functionality
  - `GET /health` - Health check endpoint
  - `GET /api/workers/status` - Worker status endpoint

## Development Environment

### Using Docker Compose

Start the full stack with PostgreSQL:
```bash
docker-compose up
```

Start in detached mode:
```bash
docker-compose up -d
```

Stop the stack:
```bash
docker-compose down
```

View logs:
```bash
docker-compose logs -f
```

### Without Docker

1. Install PostgreSQL 14
2. Create the database:
   ```bash
   createdb socialai
   ```
3. Initialize the schema:
   ```bash
   npm run db:init
   ```
4. Start the node server:
   ```bash
   npm run dev
   ```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- Worker configuration (RPC URLs, API keys, etc.)

## Test Mocking

All tests use mocked database connections to avoid environment-specific failures. The PostgreSQL pool is automatically mocked via `vi.mock('pg')` in the test setup.

## CI/CD

Tests are automatically run in the CI pipeline. All tests must pass before merging PRs.
