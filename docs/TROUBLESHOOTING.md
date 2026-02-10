# SocialAi Troubleshooting Guide

This guide helps you diagnose and resolve common issues with SocialAi. Follow the troubleshooting steps for your specific issue.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Database Problems](#database-problems)
3. [Worker Failures](#worker-failures)
4. [API Errors](#api-errors)
5. [Performance Issues](#performance-issues)
6. [Frontend Problems](#frontend-problems)
7. [AI Feature Issues](#ai-feature-issues)
8. [Network & Connectivity](#network--connectivity)
9. [Common Error Messages](#common-error-messages)
10. [Getting Help](#getting-help)

---

## Installation Issues

### npm install fails

**Problem**: Dependencies fail to install

**Solutions**:

1. **Clear npm cache**:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

2. **Use correct Node.js version**:
```bash
# Check version
node --version  # Should be 18+

# Use nvm to switch
nvm install 18
nvm use 18
```

3. **Check disk space**:
```bash
df -h
```

### Database schema creation fails

**Problem**: `psql -f db/schema.sql` errors

**Solutions**:

1. **Check PostgreSQL is running**:
```bash
pg_isready
# If not running:
sudo systemctl start postgresql
```

2. **Verify database exists**:
```bash
psql -U postgres -c "\l" | grep socialai
# If not exists:
createdb socialai
```

3. **Check PostgreSQL version**:
```bash
psql --version  # Should be 14+
```

4. **Run with correct user**:
```bash
psql -U postgres -d socialai -f db/schema.sql
```

---

## Database Problems

### Connection refused

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions**:

1. **Check PostgreSQL status**:
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

2. **Verify connection string**:
```bash
# Check .env file
cat .env | grep DATABASE_URL
# Should be: postgresql://user:password@localhost:5432/socialai
```

3. **Test connection manually**:
```bash
psql -U postgres -d socialai -c "SELECT NOW();"
```

4. **Check pg_hba.conf** (if authentication fails):
```bash
# Location varies by OS
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add or verify:
# local   all   postgres   trust
# local   all   all        md5
```

### Too many connections

**Error**: `FATAL: sorry, too many clients already`

**Solutions**:

1. **Check current connections**:
```sql
SELECT count(*) FROM pg_stat_activity;
```

2. **Kill idle connections**:
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes';
```

3. **Increase max_connections** (postgresql.conf):
```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
# max_connections = 200  # Increase from 100

sudo systemctl restart postgresql
```

4. **Use connection pooling** (in code):
```javascript
const pool = new Pool({
  max: 20,  // Limit per process
  idleTimeoutMillis: 30000
});
```

### Slow queries

**Problem**: Database queries are slow

**Solutions**:

1. **Check for missing indexes**:
```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

2. **Analyze query performance**:
```sql
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = 'uuid';
```

3. **Update table statistics**:
```sql
VACUUM ANALYZE posts;
VACUUM ANALYZE profiles;
VACUUM ANALYZE embeddings;
```

4. **Add indexes for common queries**:
```sql
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

---

## Worker Failures

### Worker keeps crashing

**Problem**: Worker process exits immediately

**Solutions**:

1. **Check worker logs**:
```bash
# Workers log to console where backend is running
npm run dev

# Look for error messages from specific worker
# [farcaster] ERROR: ...
```

2. **Run worker directly**:
```bash
cd workers
node farcaster.worker.js
# See full error output
```

3. **Check environment variables**:
```bash
# Verify required variables are set
env | grep FARCASTER
env | grep DATABASE_URL
```

4. **Verify database schema**:
```sql
-- Check if required tables exist
\dt

-- Verify external_posts table
\d external_posts
```

5. **Check restart count**:
```javascript
// If restart count exceeds max (default: 3)
// Worker stops restarting

// Solution: Fix underlying issue and restart backend
```

### Worker not processing data

**Problem**: Worker runs but doesn't sync data

**Solutions**:

1. **Check feature flags**:
```sql
SELECT flag_name, enabled FROM feature_flags 
WHERE flag_name LIKE '%sync%';

-- Enable if disabled:
UPDATE feature_flags SET enabled = true 
WHERE flag_name = 'farcaster_sync';
```

2. **Verify external API credentials**:
```bash
# Check .env for API keys
cat .env | grep API_KEY
cat .env | grep HUB_URL
```

3. **Test external API manually**:
```bash
# For Farcaster
curl https://hub.farcaster.xyz/v1/health

# For OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

4. **Check worker interval**:
```javascript
// In worker code, verify interval is reasonable
const SYNC_INTERVAL = 60000;  // 1 minute

// If too long, worker appears inactive
```

### High worker error rate

**Problem**: Worker errors frequently

**Solutions**:

1. **Review error logs**:
```bash
# Check worker service logs for error patterns
# If using Docker Compose:
docker compose logs worker -n 200 | grep -i "error" || true

# If not using Docker, review the worker process logs or console output
# and look for repeated error messages for the same worker.
```

2. **Check API rate limits**:
```javascript
// Most APIs have rate limits
// Increase sync interval if hitting limits

const SYNC_INTERVAL = 120000;  // 2 minutes instead of 1
```

3. **Implement retry logic**:
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

---

## API Errors

### 500 Internal Server Error

**Problem**: API returns 500 errors

**Solutions**:

1. **Check backend logs**:
```bash
npm run dev
# Look for stack traces in console
```

2. **Test database connection**:
```bash
curl http://localhost:3000/health
```

3. **Verify route exists**:
```bash
# Check if endpoint is defined
grep -r "GET /api/posts" node/
```

4. **Check for missing middleware**:
```javascript
// Ensure error handler is configured
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});
```

### 404 Not Found

**Problem**: Endpoint returns 404

**Solutions**:

1. **Verify URL is correct**:
```bash
# Check available routes
curl http://localhost:3000/api/users
curl http://localhost:3000/api/profiles
```

2. **Check route registration**:
```javascript
// In node/socialai.node.js
// Ensure routes are defined
app.get('/api/users', async (req, res) => { ... });
```

3. **Verify backend is running**:
```bash
curl http://localhost:3000/health
```

### 429 Too Many Requests

**Problem**: Rate limit exceeded

**Solutions**:

1. **Check rate limit configuration**:
```javascript
// In node/socialai.node.js
const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100              // 100 requests per minute
});
```

2. **Adjust rate limit**:
```javascript
// Increase limit for development
max: 1000  // 1000 requests per minute
```

3. **Implement backoff in client**:
```javascript
async function fetchWithRetry(url) {
  try {
    return await fetch(url);
  } catch (error) {
    if (error.status === 429) {
      await sleep(60000);  // Wait 1 minute
      return fetchWithRetry(url);
    }
    throw error;
  }
}
```

---

## Performance Issues

### Slow page loads

**Problem**: Frontend pages load slowly

**Solutions**:

1. **Check backend response time**:
```bash
curl -w "@-" -o /dev/null -s http://localhost:3000/api/posts <<'EOF'
  time_namelookup:  %{time_namelookup}\n
  time_connect:  %{time_connect}\n
  time_starttransfer:  %{time_starttransfer}\n
  time_total:  %{time_total}\n
EOF
```

2. **Optimize database queries**:
```sql
-- Add pagination
SELECT * FROM posts 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 0;

-- Use indexes
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

3. **Enable caching**:
```javascript
// In-memory cache for frequent queries
const cache = new Map();
const CACHE_TTL = 60000;  // 1 minute

async function getCachedData(key, fetchFn) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFn();
  cache.set(key, { data, ts: Date.now() });
  return data;
}
```

4. **Build frontend for production**:
```bash
cd apps/public
npm run build

cd apps/admin
npm run build
```

### High memory usage

**Problem**: Backend uses excessive memory

**Solutions**:

1. **Check memory usage**:
```bash
# Monitor process memory
ps aux | grep node

# Detailed memory breakdown
node --expose-gc node/socialai.node.js
```

2. **Clear caches periodically**:
```javascript
setInterval(() => {
  cache.clear();
  if (global.gc) global.gc();
}, 3600000);  // Every hour
```

3. **Limit worker memory**:
```bash
# Start workers with memory limit
node --max-old-space-size=512 workers/farcaster.worker.js
```

4. **Use streaming for large queries**:
```javascript
// Instead of loading all at once
const cursor = await db.query('SELECT * FROM posts');
// Use cursor-based pagination
```

### High CPU usage

**Problem**: CPU usage is very high

**Solutions**:

1. **Identify bottleneck**:
```bash
# Use top or htop
htop

# Profile Node.js process
node --prof node/socialai.node.js
```

2. **Optimize worker intervals**:
```javascript
// Reduce frequency if not needed
const SYNC_INTERVAL = 300000;  // 5 minutes instead of 1
```

3. **Use worker pools**:
```javascript
// Limit concurrent operations
const queue = new PQueue({ concurrency: 5 });
```

---

## Frontend Problems

### Public app won't start

**Problem**: `npm run dev:public` fails

**Solutions**:

1. **Check dependencies**:
```bash
cd apps/public
npm install
```

2. **Verify Astro version**:
```bash
cd apps/public
npm list astro
# Should be 5.x
```

3. **Check for syntax errors**:
```bash
cd apps/public
npm run build
# See build errors
```

4. **Verify port is free**:
```bash
# Check if port 4321 is in use
lsof -i :4321

# Kill process if needed
kill -9 <PID>
```

### Admin console won't start

**Problem**: `npm run dev:admin` fails

**Solutions**:

1. **Check Angular version**:
```bash
cd apps/admin
ng version
```

2. **Clear Angular cache**:
```bash
cd apps/admin
rm -rf .angular
npm install
```

3. **Verify port availability**:
```bash
lsof -i :4200
```

4. **Check for missing dependencies**:
```bash
cd apps/admin
npm install
```

### Build fails

**Problem**: Production build errors

**Solutions**:

1. **Check TypeScript errors**:
```bash
cd apps/public
npx tsc --noEmit
```

2. **Update dependencies**:
```bash
npm update
```

3. **Clear build cache**:
```bash
cd apps/public
rm -rf dist .astro
npm run build

cd apps/admin
rm -rf dist
npm run build
```

---

## AI Feature Issues

### Embeddings not generating

**Problem**: AI worker doesn't create embeddings

**Solutions**:

1. **Check OpenAI API key**:
```bash
echo $OPENAI_API_KEY
# Should start with sk-
```

2. **Test API directly**:
```bash
curl https://api.openai.com/v1/embeddings \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "test",
    "model": "text-embedding-ada-002"
  }'
```

3. **Check feature flags**:
```sql
UPDATE feature_flags SET enabled = true 
WHERE flag_name = 'ai_embeddings';
```

4. **Verify pgvector extension**:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';

-- If not installed:
CREATE EXTENSION vector;
```

### OpenAI rate limit errors

**Problem**: Too many API requests

**Solutions**:

1. **Reduce batch size**:
```javascript
// In workers/ai.worker.js
const BATCH_SIZE = 5;  // Reduce from 10
```

2. **Increase interval**:
```javascript
const PROCESSING_INTERVAL = 180000;  // 3 minutes
```

3. **Implement queue**:
```javascript
// Process items over time instead of all at once
const queue = items.slice(0, 5);  // Process 5 at a time
```

---

## Network & Connectivity

### Cannot reach external APIs

**Problem**: Workers can't connect to Farcaster, OpenAI, etc.

**Solutions**:

1. **Check internet connection**:
```bash
ping 8.8.8.8
curl https://google.com
```

2. **Verify firewall settings**:
```bash
# Check if outbound HTTPS is allowed
sudo ufw status
```

3. **Test DNS resolution**:
```bash
nslookup hub.farcaster.xyz
nslookup api.openai.com
```

4. **Use proxy if needed**:
```bash
export HTTP_PROXY=http://proxy:port
export HTTPS_PROXY=http://proxy:port
```

### CORS errors in browser

**Problem**: Browser blocks API requests

**Solutions**:

1. **Check CORS configuration**:
```javascript
// In node/socialai.node.js
app.use(cors({
  origin: ['http://localhost:4321', 'http://localhost:4200'],
  credentials: true
}));
```

2. **Add allowed origin**:
```javascript
origin: [
  'http://localhost:4321',
  'http://localhost:4200',
  'http://yourfrontend.com'
]
```

3. **Check preflight requests**:
```bash
curl -X OPTIONS http://localhost:3000/api/users \
  -H "Origin: http://localhost:4321" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

---

## Common Error Messages

### "Worker farcaster failed, max restarts reached"

**Cause**: Worker crashed 3+ times

**Solution**:
1. Check worker logs for errors
2. Fix underlying issue
3. Restart backend: `npm run dev`

### "Database connection pool exhausted"

**Cause**: Too many open connections

**Solution**:
```javascript
// Reduce pool size or close connections properly
await db.end();  // Close when done
```

### "EADDRINUSE: address already in use"

**Cause**: Port is already occupied

**Solution**:
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### "Cannot find module"

**Cause**: Missing dependency

**Solution**:
```bash
npm install
# Or install specific module
npm install missing-module
```

---

## Getting Help

### Before Asking for Help

1. ✅ Check this troubleshooting guide
2. ✅ Review error messages carefully
3. ✅ Check system logs
4. ✅ Try solutions listed above
5. ✅ Search existing GitHub issues

### Where to Get Help

1. **GitHub Issues**: [Create an issue](https://github.com/SolanaRemix/SocialAi/issues/new)
   - Include error messages
   - Describe steps to reproduce
   - Mention your environment (OS, Node version, etc.)

2. **GitHub Discussions**: [Ask questions](https://github.com/SolanaRemix/SocialAi/discussions)
   - For general questions
   - Feature requests
   - Best practices

3. **Documentation**: Check other docs
   - [Installation Guide](INSTALLATION.md)
   - [Architecture](ARCHITECTURE.md)
   - [API Reference](API.md)

### Information to Include

When reporting issues, include:

```
**Environment**:
- OS: Ubuntu 22.04
- Node.js: v18.17.0
- PostgreSQL: 14.9
- Browser: Chrome 119

**Error Message**:
[Full error message here]

**Steps to Reproduce**:
1. Start backend: npm run dev
2. Navigate to http://localhost:3000
3. Click on...

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Logs**:
[Relevant log output]
```

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Status**: Complete
