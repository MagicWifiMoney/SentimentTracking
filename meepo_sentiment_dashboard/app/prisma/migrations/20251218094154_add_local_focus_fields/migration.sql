-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "focus_local" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "state" TEXT;

-- CreateIndex
CREATE INDEX "brands_focus_local_idx" ON "brands"("focus_local");

-- CreateIndex
CREATE INDEX "brands_city_idx" ON "brands"("city");
