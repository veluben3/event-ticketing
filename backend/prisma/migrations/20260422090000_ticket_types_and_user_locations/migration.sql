-- CreateTable
CREATE TABLE "EventTicketType" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "addressLine" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "ticketTypeId" TEXT;

-- CreateIndex
CREATE INDEX "EventTicketType_eventId_position_idx" ON "EventTicketType"("eventId", "position");

-- CreateIndex
CREATE INDEX "UserLocation_userId_createdAt_idx" ON "UserLocation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_ticketTypeId_idx" ON "Ticket"("ticketTypeId");

-- Backfill a default ticket type for existing events
INSERT INTO "EventTicketType" ("id", "eventId", "name", "description", "priceCents", "position", "createdAt", "updatedAt")
SELECT
    'legacy-' || "id",
    "id",
    'General Admission',
    'Default ticket tier',
    "priceCents",
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Event";

-- Link existing tickets to the backfilled ticket type
UPDATE "Ticket"
SET "ticketTypeId" = 'legacy-' || "eventId"
WHERE "ticketTypeId" IS NULL;

-- AddForeignKey
ALTER TABLE "EventTicketType" ADD CONSTRAINT "EventTicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "EventTicketType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
