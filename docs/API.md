# SocialAi API Reference

Complete API documentation for the SocialAi backend. This document covers all REST endpoints, request/response formats, authentication, and error handling.

**API Version**: 1.0  
**Last Updated**: February 2026

---

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Pagination](#pagination)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health & Status](#health--status)
  - [Users](#users)
  - [Profiles](#profiles)
  - [Posts](#posts)
  - [External Posts](#external-posts)
  - [Timeline](#timeline)
  - [Feature Flags](#feature-flags)
  - [Settings](#settings)
  - [AI Features](#ai-features)
  - [Workers](#workers)
- [WebSocket Support](#websocket-support)
- [CORS](#cors)

---

## Base URL

**Development**:
```
http://localhost:3000
```

**Production**:
```
https://api.socialai.com
```

## Authentication

Currently, most endpoints are public. Authentication via Farcaster and SIWE will be required for:
- Creating posts
- Claiming profiles
- Modifying user data

## Endpoints

### Health & Status

#### GET /health

Check system health and worker status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-28T04:00:00.000Z",
  "workers": [
    {
      "name": "farcaster",
      "healthy": true
    }
  ]
}
```

#### GET /api/workers/status

Get detailed worker status.

**Response:**
```json
[
  {
    "name": "farcaster",
    "healthy": true,
    "enabled": true
  }
]
```

---

### Users

#### GET /api/users

List all users (paginated).

**Query Parameters:**
- None (returns first 100)

**Response:**
```json
[
  {
    "id": "uuid",
    "farcaster_id": 1234,
    "ethereum_address": "0x...",
    "ens_name": "user.eth",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/users/:id

Get a specific user by ID.

**Parameters:**
- `id` (string) - User UUID

**Response:**
```json
{
  "id": "uuid",
  "farcaster_id": 1234,
  "ethereum_address": "0x...",
  "ens_name": "user.eth",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `404` - User not found

---

### Profiles

#### GET /api/profiles

List all profiles (paginated).

**Query Parameters:**
- None (returns first 100)

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "username": "alice",
    "display_name": "Alice",
    "bio": "Builder",
    "avatar_url": "https://...",
    "banner_url": "https://...",
    "website_url": "https://...",
    "twitter_handle": "alice",
    "claimed": true,
    "verified": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/profiles/:username

Get a specific profile by username.

**Parameters:**
- `username` (string) - Profile username

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "username": "alice",
  "display_name": "Alice",
  "bio": "Builder",
  "avatar_url": "https://...",
  "claimed": true,
  "verified": true
}
```

**Error Responses:**
- `404` - Profile not found

---

### Posts

#### GET /api/posts

List all internal posts (paginated).

**Query Parameters:**
- None (returns first 100, ordered by created_at DESC)

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "content": "Hello world!",
    "media_urls": ["https://..."],
    "parent_id": null,
    "root_id": null,
    "reply_count": 0,
    "recast_count": 0,
    "like_count": 5,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/posts/:id

Get a specific post by ID.

**Parameters:**
- `id` (string) - Post UUID

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "content": "Hello world!",
  "reply_count": 0,
  "like_count": 5,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `404` - Post not found

---

### External Posts

#### GET /api/external-posts

List external posts from Farcaster, Reddit, etc.

**Query Parameters:**
- `source` (optional) - Filter by source: `farcaster`, `reddit`

**Response:**
```json
[
  {
    "id": "uuid",
    "external_id": "farcaster_12345",
    "source": "farcaster",
    "author_id": "1234",
    "author_name": "alice",
    "content": "Cast content",
    "url": "https://...",
    "metadata": { "fid": 1234 },
    "created_at": "2024-01-01T00:00:00.000Z",
    "synced_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Timeline

#### GET /api/timeline/:username

Get a user's timeline (posts from followed users).

**Parameters:**
- `username` (string) - Profile username

**Response:**
```json
[
  {
    "id": "uuid",
    "content": "Post content",
    "username": "bob",
    "display_name": "Bob",
    "avatar_url": "https://...",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Feature Flags

#### GET /api/feature-flags

List all feature flags.

**Response:**
```json
[
  {
    "id": "uuid",
    "flag_name": "farcaster_sync",
    "enabled": true,
    "description": "Enable Farcaster data synchronization",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

#### PUT /api/feature-flags/:name

Update a feature flag.

**Parameters:**
- `name` (string) - Flag name

**Request Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "flag_name": "farcaster_sync",
  "enabled": true,
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `404` - Feature flag not found

---

### Settings

#### GET /api/settings

List all system settings.

**Response:**
```json
[
  {
    "id": "uuid",
    "key": "sync_interval",
    "value": { "minutes": 5 },
    "description": "Interval for worker synchronization",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### AI Features

#### GET /api/ai/summary/:postId

Generate an AI summary of a post.

**Parameters:**
- `postId` (string) - Post UUID

**Response:**
```json
{
  "summary": "This post discusses...",
  "topics": ["web3", "social"],
  "sentiment": "neutral"
}
```

**Error Responses:**
- `404` - Post not found

#### GET /api/ai/recommendations/:userId

Get AI-powered recommendations for a user.

**Parameters:**
- `userId` (string) - User UUID

**Response:**
```json
[
  {
    "id": "uuid",
    "username": "recommended_user",
    "display_name": "Recommended User",
    "bio": "..."
  }
]
```

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

Error response format:
```json
{
  "error": "Error message"
}
```

## Rate Limiting

API requests are rate limited to:
- **100 requests per minute** per IP address

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

Currently, endpoints return a fixed number of results:
- Most list endpoints: 100 items
- Timeline: 100 items
- Posts: 100 items

Future versions will include proper pagination with `limit` and `offset` or cursor-based pagination.

## CORS

CORS is enabled for all origins in development. In production, configure allowed origins via environment variables.

---

### Workers

#### GET /api/workers/status

Get detailed status of all workers.

**Response:**
```json
[
  {
    "name": "farcaster",
    "healthy": true,
    "enabled": true,
    "lastRun": "2024-01-01T00:00:00Z",
    "errorRate": 0.01,
    "restartCount": 0
  },
  {
    "name": "ai",
    "healthy": true,
    "enabled": true,
    "lastRun": "2024-01-01T00:00:00Z",
    "errorRate": 0.02,
    "restartCount": 0
  }
]
```

#### POST /api/workers/restart/:name

Restart a specific worker (Admin only).

**Parameters:**
- `name` (string) - Worker name (e.g., "farcaster", "ai")

**Response:**
```json
{
  "success": true,
  "message": "Worker restarted successfully"
}
```

**Error Responses:**
- `404` - Worker not found
- `403` - Unauthorized (Admin only)

---

## SmartBrain Status

### GET /api/smartbrain/status

Returns live AI queue metrics and SmartBrain health.

**Response:**
```json
{
  "embeddings_queue_depth": 12,
  "last_run_at": "2026-03-06T11:00:00.000Z",
  "avg_processing_time": null,
  "error_rate": 0,
  "enabled": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `embeddings_queue_depth` | number | Number of pending embeddings (rows without a vector) |
| `last_run_at` | string \| null | ISO timestamp of the last embedding created |
| `avg_processing_time` | number \| null | Average processing time in ms (null if not tracked) |
| `error_rate` | number | Error rate 0–1 |
| `enabled` | boolean | Whether `ai_summaries` feature flag is enabled |

---

## Config Suggestions

### GET /api/config/suggestions

List all config suggestions. Optionally filter by `status`.

**Query Parameters:**
- `status` (optional) — `new`, `accepted`, or `rejected`

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "ai_scaling",
    "description": "Embedding queue depth is 150. Suggest reducing AI worker interval.",
    "proposed_change": { "key": "ai_worker_interval_ms", "from": 60000, "to": 30000 },
    "confidence": 0.75,
    "status": "new",
    "created_at": "2026-03-06T12:00:00.000Z"
  }
]
```

### POST /api/config/suggestions/:id/accept

Mark a suggestion as accepted.

**Response:** Updated suggestion object with `status: "accepted"`.

**Error Responses:**
- `404` - Suggestion not found

### POST /api/config/suggestions/:id/reject

Mark a suggestion as rejected.

**Response:** Updated suggestion object with `status: "rejected"`.

**Error Responses:**
- `404` - Suggestion not found

---

## Contracts

### GET /api/contracts/health

Check reachability of all configured RPC endpoints.

**Response:**
```json
{
  "chains": [
    { "name": "ethereum", "configured": true, "reachable": true, "latency_ms": 45 },
    { "name": "base", "configured": true, "reachable": true, "latency_ms": 38 },
    { "name": "solana", "configured": false, "reachable": false, "latency_ms": null }
  ],
  "overall_healthy": true
}
```

**Requires:** `ETH_RPC_URL`, `BASE_RPC_URL`, `SOLANA_RPC_URL` environment variables.

### GET /api/contracts/claims/:address

Return identity claims for an on-chain address.

**Parameters:**
- `address` — Ethereum or Solana address

**Response:**
```json
{
  "db_claims": [
    { "id": "uuid", "claim_type": "farcaster", "claim_value": "...", "verified": true }
  ],
  "on_chain": {
    "address": "0xabc...",
    "mock": true,
    "claims": [{ "type": "farcaster", "verified": true }]
  }
}
```

**Note:** `on_chain.mock: true` indicates full chain reads are not yet implemented.

---

## WebSocket Support

WebSocket support for real-time updates is planned for future releases.

**Planned Features**:
- Real-time post updates
- Live timeline feeds
- Notification push
- Worker status monitoring
