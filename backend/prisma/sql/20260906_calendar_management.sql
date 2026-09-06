BEGIN;

ALTER TABLE "VillaBlockedDate"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "VillaBlockedDate" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE IF NOT EXISTS "CalendarAudit" (
  "id" TEXT NOT NULL,
  "villaId" TEXT NOT NULL,
  "actorId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalendarAudit_villaId_createdAt_idx"
  ON "CalendarAudit"("villaId", "createdAt");
CREATE INDEX IF NOT EXISTS "CalendarAudit_entityType_entityId_idx"
  ON "CalendarAudit"("entityType", "entityId");

DO $$ BEGIN
  ALTER TABLE "CalendarAudit"
    ADD CONSTRAINT "CalendarAudit_villaId_fkey"
    FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CalendarAudit"
    ADD CONSTRAINT "CalendarAudit_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
