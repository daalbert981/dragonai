-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STUDENT';

-- CreateTable
CREATE TABLE "rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "reset_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_key_key" ON "rate_limit"("key");

-- CreateIndex
CREATE INDEX "rate_limit_reset_time_idx" ON "rate_limit"("reset_time");


-- Backfill role from legacy class_id strings.
-- Verified against production 2026-07-03: values are exactly
-- 'student' (126), 'instructor' (1), 'admin' (1).
-- 'admin'/'superadmin' -> SUPERADMIN preserves the pre-enum behavior in
-- lib/auth-options.ts; lower() guards against case variants.
UPDATE "user" SET "role" = CASE
  WHEN lower("class_id") IN ('admin', 'superadmin') THEN 'SUPERADMIN'::"UserRole"
  WHEN lower("class_id") = 'instructor' THEN 'INSTRUCTOR'::"UserRole"
  ELSE 'STUDENT'::"UserRole"
END;
