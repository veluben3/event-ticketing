---
name: redis-cache
description: Redis conventions for session management, caching, and rate limiting in events-manage. Use when editing anything that touches Redis.
---

# Redis Skill – events-manage

## Purpose in this app

1. **Session store** for authenticated users (sliding TTL, sign-out-all).
2. **Cache** for event list/detail responses.
3. **Rate limiter** for auth + ticket-purchase endpoints.
4. **Idempotency store** for POST /tickets/purchase.

## Key conventions

| Namespace | Type | TTL | Purpose |
|-----------|------|-----|---------|
| `session:<sessionId>` | Hash | `SESSION_TTL_SECONDS` (default 604800 / 7d) | userId, role, ip, userAgent, issuedAt |
| `user:<userId>:sessions` | Set | no TTL, managed by app | session IDs owned by user |
| `refresh:<tokenId>` | String | 7d | refresh token denylist/rotation |
| `events:list:<cityHash>` | String (JSON) | 60s | cached paginated list |
| `events:detail:<eventId>` | String (JSON) | 120s | cached detail |
| `rl:login:<ip>` | ZSet | window = 15m | sliding window rate limit |
| `rl:purchase:<userId>` | ZSet | window = 1m | purchase rate limit |
| `idemp:<key>` | Hash | 24h | cached idempotent responses |

**Always** use the helpers in `src/config/redis.ts` and `src/services/session.service.ts` — do not construct keys ad hoc.

## Patterns

- Use `SET key value EX ttl` (not `SETEX`) and `HSET` for structured data.
- Use `UNLINK` (not `DEL`) for potentially large keys.
- Wrap multi-step atomic operations in Lua scripts (see `src/utils/rateLimiter.ts`).
- Cache invalidation: event update → `UNLINK events:detail:<id>` + pattern scan for list keys using `SCAN` (never `KEYS`).
- Always set TTL on cache keys; never leave orphan keys.

## Failure handling

- Redis outages must **degrade gracefully**: the app should still serve data (bypass cache, skip session touch) and emit a metric `redis.unavailable`.
- Session lookup failure → respond `401` so the client re-authenticates.
- Rate limiter failure → fail **open** (allow) to avoid blocking users, log a warning.
