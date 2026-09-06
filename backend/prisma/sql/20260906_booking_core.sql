BEGIN;

DO $$ BEGIN
  CREATE TYPE "BookingStatus" AS ENUM ('HOLD', 'CONFIRMED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BookingChannel" AS ENUM ('WEBSITE', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Booking" (
  "id" TEXT NOT NULL,
  "villaId" TEXT NOT NULL,
  "guestId" TEXT,
  "status" "BookingStatus" NOT NULL,
  "channel" "BookingChannel" NOT NULL,
  "checkIn" DATE NOT NULL,
  "checkOut" DATE NOT NULL,
  "adults" INTEGER NOT NULL,
  "children" INTEGER NOT NULL DEFAULT 0,
  "infants" INTEGER NOT NULL DEFAULT 0,
  "customerName" TEXT,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "currency" TEXT NOT NULL,
  "accommodationAmount" INTEGER NOT NULL,
  "cleaningFeeAmount" INTEGER NOT NULL,
  "depositAmount" INTEGER NOT NULL,
  "totalAmount" INTEGER NOT NULL,
  "priceSnapshot" JSONB NOT NULL,
  "holdExpiresAt" TIMESTAMPTZ(3),
  "confirmedAt" TIMESTAMPTZ(3),
  "cancelledAt" TIMESTAMPTZ(3),
  "cancellationNote" TEXT,
  "idempotencyOwner" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Booking_villaId_status_checkIn_checkOut_idx"
  ON "Booking"("villaId", "status", "checkIn", "checkOut");
CREATE INDEX IF NOT EXISTS "Booking_guestId_createdAt_idx"
  ON "Booking"("guestId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_idempotencyOwner_idempotencyKey_key"
  ON "Booking"("idempotencyOwner", "idempotencyKey");

DO $$ BEGIN
  ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_villaId_fkey"
    FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_guestId_fkey"
    FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_valid_range" CHECK ("checkIn" < "checkOut");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_valid_guests" CHECK (
    "adults" >= 1 AND "children" >= 0 AND "infants" >= 0
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_valid_amounts" CHECK (
    "accommodationAmount" >= 0
    AND "cleaningFeeAmount" >= 0
    AND "depositAmount" >= 0
    AND "totalAmount" = "accommodationAmount" + "cleaningFeeAmount"
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_status_timestamps" CHECK (
    ("status" <> 'HOLD' OR "holdExpiresAt" IS NOT NULL)
    AND ("status" <> 'CONFIRMED' OR "confirmedAt" IS NOT NULL)
    AND ("status" <> 'EXPIRED' OR "holdExpiresAt" IS NOT NULL)
    AND ("status" <> 'CANCELLED' OR "cancelledAt" IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_no_active_overlap') THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_no_active_overlap"
      EXCLUDE USING gist (
        "villaId" WITH =,
        daterange("checkIn", "checkOut", '[)') WITH &&
      ) WHERE ("status" IN ('HOLD', 'CONFIRMED'));
  END IF;
END $$;

COMMIT;
