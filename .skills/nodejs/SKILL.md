---
name: nodejs-backend
description: Conventions for the Node.js + Express + TypeScript backend in events-manage. Use when editing anything under backend/.
---

# Node.js Backend Skill – events-manage

Follow these rules when editing code inside `events-manage/backend/`.

## Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript (strict)
- **Framework:** Express 4
- **ORM:** Prisma (Postgres)
- **Cache / Session:** Redis (via `ioredis`)
- **Messaging:** Kafka (via `kafkajs`)
- **Auth:** JWT access token (15 min) + Redis session (sliding 7d), bcrypt passwords
- **Validation:** Zod
- **Uploads:** multer (local `uploads/` folder)

## Layout

```
backend/src/
  config/       // prisma, redis, kafka, env
  middleware/   // auth, errorHandler, upload, requireRole
  routes/       // express routers (one file per resource)
  controllers/  // request/response handling
  services/     // business logic, DB + cache + kafka calls
  kafka/        // producer + consumers + topics constants
  utils/        // jwt, hash, logger helpers
  types/        // shared TS types
```

## Conventions

1. Every route goes `router → controller → service`. Controllers **never** access Prisma/Redis directly.
2. All async handlers wrap in `asyncHandler(fn)` so errors land in `errorHandler`.
3. Validate every request body/params with a Zod schema; return `422` with a consistent error envelope:
   ```json
   { "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [...] } }
   ```
4. Never return raw Prisma entities; map to DTOs to control PII (e.g. strip `passwordHash`).
5. Session keys in Redis: `session:<sessionId>` (Hash). User→session index: `user:<id>:sessions` (Set). TTL: `SESSION_TTL_SECONDS`.
6. Kafka topics are declared in `src/kafka/topics.ts`. Each event payload is typed.
7. File uploads go under `uploads/events/<eventId>/<uuid>.<ext>`. Serve via `/static/*`.
8. Role model: `USER` (B2C buyer), `ORGANIZER` (B2B event creator), `ADMIN`. Enforce with `requireRole(...)` middleware.
9. Log via `utils/logger.ts` (`pino`). Never `console.log` in prod paths.
10. Add an integration test whenever you add a new route (kept separate, not scaffolded here).

## Common tasks

- **New resource:** create `routes/x.routes.ts`, `controllers/x.controller.ts`, `services/x.service.ts`, mount under `routes/index.ts`.
- **New Kafka event:** add topic in `kafka/topics.ts`, producer method, consumer handler. Keep payloads backward-compatible (additive fields only).
- **New Prisma model:** edit `prisma/schema.prisma`, run `npx prisma migrate dev -n <name>`, regenerate types.
