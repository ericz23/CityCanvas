-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('ACTIVE', 'CANCELED', 'SOLD_OUT');

-- CreateEnum
CREATE TYPE "public"."SourceKind" AS ENUM ('OFFICIAL_CAL', 'BLOG', 'TICKET_SITE', 'MEDIA', 'AGGREGATOR', 'SOCIAL');

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "tz" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "ticketUrl" TEXT,
    "imageUrl" TEXT,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "venueName" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "categories" TEXT[],
    "tags" TEXT[],
    "sourceId" TEXT NOT NULL,
    "sourceConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "sourceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Source" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "public"."SourceKind" NOT NULL,
    "lastSeen" TIMESTAMP(3),

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_sourceHash_key" ON "public"."Event"("sourceHash");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "public"."Event"("startsAt");

-- CreateIndex
CREATE INDEX "Event_lat_lng_idx" ON "public"."Event"("lat", "lng");

-- CreateIndex
CREATE INDEX "Event_sourceHash_idx" ON "public"."Event"("sourceHash");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "public"."Event"("status");

-- CreateIndex
CREATE INDEX "Event_categories_idx" ON "public"."Event"("categories");

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "public"."Source"("url");

-- CreateIndex
CREATE INDEX "Source_kind_idx" ON "public"."Source"("kind");

-- CreateIndex
CREATE INDEX "Source_lastSeen_idx" ON "public"."Source"("lastSeen");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
