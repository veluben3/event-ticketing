---
name: postgres-data
description: Rules for Postgres schema design and Prisma migrations in events-manage. Use when editing prisma/schema.prisma or writing SQL.
---

# Postgres Data Skill – events-manage

## Stack

- **Database:** Postgres 16 (via docker-compose)
- **ORM:** Prisma 5
- **Migrations:** `prisma migrate dev` / `prisma migrate deploy`

## Models (current)

- **User** – `id`, `email` (unique), `passwordHash`, `name`, `role` (USER|ORGANIZER|ADMIN), `companyName` (B2B), timestamps.
- **Event** – `id`, `organizerId` → User, `title`, `description`, `category` (MUSIC|SPORTS|CONFERENCE|THEATRE|FESTIVAL|OTHER), `venue`, `city`, `state`, `country`, `latitude`, `longitude`, `startAt`, `endAt`, `priceCents`, `currency`, `capacity`, `ticketsSold`, `bannerUrl`, `status` (DRAFT|PUBLISHED|CANCELLED|SOLD_OUT), timestamps.
- **Ticket** – `id`, `eventId` → Event, `userId` → User, `quantity`, `totalCents`, `status` (PENDING|PAID|CANCELLED|FAILED), `paymentId`, `orderRef` (unique), timestamps.
- **EventImage** – `id`, `eventId`, `url`, `position`.
- **Payment** – `id`, `ticketId` (unique), `provider`, `providerRef`, `amountCents`, `status`, `rawResponse`.

## Conventions

1. Use **camelCase** in Prisma models; Postgres column names mapped via `@map` when necessary.
2. Every table has `id` (cuid), `createdAt`, `updatedAt`.
3. All foreign keys indexed. Add composite indexes for frequent filters:
   - `Event`: `@@index([city, startAt])`, `@@index([category, startAt])`, `@@index([status, startAt])`.
   - `Ticket`: `@@index([userId, createdAt])`, `@@index([eventId, status])`.
4. Money in **integer cents** + ISO currency code. Never use `Float` for money.
5. Enums are defined in `schema.prisma`, not as string constraints.
6. Timestamps stored in UTC (`@db.Timestamptz`).
7. Soft-delete via `status` fields, not actual deletion, unless GDPR requires.
8. Run `prisma format` before committing. Keep migrations small and named (`npx prisma migrate dev -n add_event_geo`).

## Anti-patterns to avoid

- Raw SQL `queryRaw` without parameter binding.
- Deleting migration files that are already applied upstream.
- Storing booleans as strings or status as numbers.
- Huge `JSON` columns holding domain data that needs querying – prefer normalized tables.
