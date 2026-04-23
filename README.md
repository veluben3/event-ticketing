# EventHub — Events-Manage SaaS

A full-stack SaaS platform for discovering and hosting events.

- **B2B (Organizer):** list events (music concerts, games, conferences, festivals…), manage sales, upload banner images.
- **B2C (User):** browse events by location + category, purchase tickets with a mock payment flow powered by Kafka.

## Stack

| Layer      | Tech |
|------------|------|
| Frontend   | React 18, Vite, TypeScript, Tailwind CSS, React Router, react-query, react-hook-form + Zod |
| Backend    | Node.js 20, Express 4, TypeScript, Prisma, Zod, Pino |
| AI Backend | Python 3.11, FastAPI, LangChain, Qdrant |
| Database   | Postgres 16 |
| Cache/Sess | Redis 7 (sessions, cache, rate-limit, idempotency) |
| Messaging  | Kafka (kafkajs) — `payment.initiated` → `payment.result` → `ticket.confirmed` |
| Auth       | JWT access token (15 min) + HttpOnly refresh cookie + Redis sessions |
| Uploads    | multer → local `backend/uploads/` folder, served at `/static/*` |

## Repository layout

```
events-manage/
├── .skills/               # Agent SKILL.md files (reactjs, python, fastapi, langchain, etc.)
├── AI-backend/            # FastAPI + LangChain + Qdrant semantic search service
├── backend/               # Express + Prisma + Kafka + Redis API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/        # env, prisma, redis
│   │   ├── middleware/    # auth, upload (multer), errorHandler
│   │   ├── routes/        # auth, events, tickets, upload
│   │   ├── controllers/   # request → service glue, Zod validation
│   │   ├── services/      # session, auth, events, tickets
│   │   ├── kafka/         # client, producer, consumer, topics
│   │   ├── utils/         # jwt, logger, rate limiter, httpError, asyncHandler
│   │   └── index.ts       # entrypoint (also boots consumer by default)
│   └── uploads/           # runtime file storage (gitignored)
├── frontend/              # Vite + React SaaS app
│   └── src/
│       ├── api/           # axios client + endpoint helpers
│       ├── components/    # Navbar, EventCard, ProtectedRoute
│       ├── context/       # AuthContext
│       ├── pages/         # EventsList, EventDetail, Login, Register,
│       │                  # CreateEvent, OrganizerDashboard, MyTickets, Checkout
│       └── types/         # shared TS types
└── docker-compose.yml     # Postgres + Redis + Kafka + Zookeeper
```

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- (Optional) `pnpm` or `npm`

## 1. Start infrastructure

```bash
cd events-manage
docker compose up -d
```

This starts **Postgres (5432)**, **Redis (6379)**, **Kafka (9092)** and Zookeeper.

## Kafka: install & run (if you don't want Docker)

The recommended way (and the way this repo is pre-configured) is **Docker Compose** (see above).

If you prefer running Kafka locally, you have 2 common options:

### Option A (macOS): Homebrew (Kafka runs in KRaft mode)

```bash
brew update
brew install kafka

# Start Kafka (runs its own embedded controller using KRaft)
brew services start kafka

# Verify it is listening on 9092
nc -vz localhost 9092
```

Stop it:

```bash
brew services stop kafka
```

### Option B (any OS): Run Kafka via Docker only (no local install)

You already have this in `events-manage/docker-compose.yml`:

```bash
cd events-manage
docker compose up -d kafka
```

Verify:

```bash
nc -vz localhost 9092
```

### Backend Kafka config

The backend reads brokers from `.env`:

```env
KAFKA_BROKERS=localhost:9092
```

If your Kafka broker is not reachable at `localhost:9092`, update `KAFKA_BROKERS` accordingly.

## 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev -n init
npm run prisma:seed   # creates demo users + sample events
npm run dev           # API on http://localhost:4000
```

The backend will also auto-start a Kafka consumer in the same process for dev simplicity.
To run the consumer as a separate worker in production:

```bash
RUN_CONSUMER=false npm run start           # API only
npm run start:consumer                      # worker only
```

### Demo credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| B2B ORGANIZER | `organizer@example.com` | `Password123!` |
| B2C USER | `user@example.com` | `Password123!` |

## 3. Frontend

```bash
cd ../frontend
npm install
npm run dev           # app on http://localhost:5173
```

The Vite dev server proxies `/api` and `/static` to the backend, so CORS is a non-issue locally.

## Key flows

### Registration & login
- `POST /api/auth/register` creates a USER (or ORGANIZER with `companyName`).
- `POST /api/auth/login` returns a short-lived access token in JSON and sets an HttpOnly refresh cookie at `/auth`.
- Session metadata (userId, role, ip, UA, issuedAt) is written to Redis (`session:<id>`) with sliding TTL.
- `POST /api/auth/refresh` rotates both tokens (refresh token is revoked on use via Redis denylist).
- `requireAuth` middleware validates JWT **and** checks the Redis session is still alive → sign-out-all works by deleting the user's session set.

### Event listing (B2C)
- `GET /api/events?city=Chennai&category=MUSIC&q=festival&page=1&pageSize=24`
- List + detail responses are cached in Redis for 60–120s.
- `GET /api/events/cities` powers the location filter dropdown.

### Event management (B2B)
- `POST /api/events` (organizer role) creates an event (DRAFT or PUBLISHED).
- `PATCH /api/events/:id` updates; invalidates the Redis detail cache.
- `POST /api/upload/events/:eventId` uploads banner to `backend/uploads/events/<eventId>/…` and attaches a URL on the `EventImage` table. Files are served via `GET /static/…`.

### Ticket purchase (Kafka pipeline)
```
Client  ── POST /api/tickets/purchase (idempotency key)
          │
Backend ├─ Prisma tx: create Ticket(PENDING) + Payment(INITIATED), increment event.ticketsSold
        └─ publish "payment.initiated" to Kafka
                                                   Consumer:
                                                     reads payment.initiated
                                                     simulates gateway (300–1200ms, 85% success)
                                                     publishes "payment.result"

Backend (consumer) reads payment.result
        ├─ on SUCCESS → Ticket.PAID, Payment.SUCCEEDED, publish ticket.confirmed
        └─ on FAILURE → Ticket.FAILED, Payment.FAILED, decrement event.ticketsSold
```

The React checkout page polls `GET /api/tickets/:id` every 2s until status is terminal (`PAID`/`FAILED`).

### Rate limiting & idempotency
- Login: 10 attempts / 15 min per IP (sliding window in Redis).
- Purchase: 10 / minute per user + optional `Idempotency-Key` header → deduplicated response cached 24h.

## API surface (quick reference)

```
GET    /api/health

POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout          (auth)
GET    /api/auth/me              (auth)

GET    /api/events               (public, filters: city, category, q, fromDate, toDate, page, pageSize)
GET    /api/events/cities        (public)
GET    /api/events/mine          (organizer)
GET    /api/events/:id           (public, cached)
POST   /api/events               (organizer)
PATCH  /api/events/:id           (organizer, owner)

POST   /api/tickets/purchase     (auth; idempotency-key header)
GET    /api/tickets              (auth; own tickets)
GET    /api/tickets/:id          (auth; own)
GET    /api/tickets/organizer/sales  (organizer)

POST   /api/upload                       (organizer) – generic image
POST   /api/upload/events/:eventId       (organizer; owner of event)
GET    /static/*                         – serves uploaded files
```

## `.skills/`

Each subfolder contains a `SKILL.md` that AI coding agents (e.g. Cursor) should read when editing that layer:

- `.skills/nodejs/SKILL.md` — backend conventions (routes→controllers→services, auth, validation, Kafka).
- `.skills/postgres/SKILL.md` — schema design, Prisma, migration rules.
- `.skills/redis/SKILL.md` — session keys, cache TTLs, rate limiter, failure modes.
- `.skills/reactjs/SKILL.md` — frontend structure, SaaS UX patterns, B2B/B2C roles.

## Notes

- This is a reference scaffold. Dependencies are not installed; run `npm install` in both `backend/` and `frontend/` first.
- The payment "gateway" is mocked inside the Kafka consumer (300–1200ms latency, ~85% success). Swap `handlePaymentInitiated` for a real Stripe/Razorpay integration.
- For production, run the Kafka consumer as a separate worker (`RUN_CONSUMER=false npm start` for the API, `npm run start:consumer` for the worker).
