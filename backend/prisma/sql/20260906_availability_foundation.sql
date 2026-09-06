BEGIN;

-- DateTime -> DATE dönüşümünde saati sessizce kaybetmeyelim.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "VillaPriceRule"
    WHERE "startDate" <> date_trunc('day', "startDate")
       OR "endDate" <> date_trunc('day', "endDate")
  ) OR EXISTS (
    SELECT 1 FROM "VillaBlockedDate"
    WHERE "startDate" <> date_trunc('day', "startDate")
       OR "endDate" <> date_trunc('day', "endDate")
  ) THEN
    RAISE EXCEPTION 'Takvim kayıtlarında saat bilgisi var; DATE dönüşümünden önce manuel inceleme gerekli.';
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "VillaSalesStatus" AS ENUM ('OPEN', 'PAUSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VillaBlockedDateKind" AS ENUM ('MANUAL', 'MAINTENANCE', 'OWNER_USE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VillaBlockedDateState" AS ENUM ('ACTIVE', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Villa"
  ADD COLUMN IF NOT EXISTS "salesStatus" "VillaSalesStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul';

ALTER TABLE "VillaPriceRule"
  ALTER COLUMN "startDate" TYPE DATE USING "startDate"::date,
  ALTER COLUMN "endDate" TYPE DATE USING "endDate"::date;

ALTER TABLE "VillaBlockedDate"
  ALTER COLUMN "startDate" TYPE DATE USING "startDate"::date,
  ALTER COLUMN "endDate" TYPE DATE USING "endDate"::date,
  ADD COLUMN IF NOT EXISTS "kind" "VillaBlockedDateKind" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "state" "VillaBlockedDateState" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "VillaPriceRule"
    ADD CONSTRAINT "VillaPriceRule_valid_range" CHECK ("startDate" < "endDate");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "VillaBlockedDate"
    ADD CONSTRAINT "VillaBlockedDate_valid_range" CHECK ("startDate" < "endDate");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "VillaBlockedDate"
    ADD CONSTRAINT "VillaBlockedDate_release_consistency" CHECK (
      ("state" = 'ACTIVE' AND "releasedAt" IS NULL)
      OR ("state" = 'RELEASED' AND "releasedAt" IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Aynı villada çakışan sezon kuralı varsa sessizce birini seçmek yerine migration durur.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "VillaPriceRule" a
    JOIN "VillaPriceRule" b
      ON a."villaId" = b."villaId"
     AND a.id < b.id
     AND daterange(a."startDate", a."endDate", '[)') && daterange(b."startDate", b."endDate", '[)')
  ) THEN
    RAISE EXCEPTION 'Çakışan VillaPriceRule kayıtları var; migration öncesi manuel çözüm gerekli.';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VillaPriceRule_no_overlap'
  ) THEN
    ALTER TABLE "VillaPriceRule"
      ADD CONSTRAINT "VillaPriceRule_no_overlap"
      EXCLUDE USING gist (
        "villaId" WITH =,
        daterange("startDate", "endDate", '[)') WITH &&
      );
  END IF;
END $$;

DROP INDEX IF EXISTS "VillaBlockedDate_villaId_startDate_idx";
CREATE INDEX IF NOT EXISTS "VillaBlockedDate_villaId_state_startDate_idx"
  ON "VillaBlockedDate"("villaId", "state", "startDate");

COMMIT;
