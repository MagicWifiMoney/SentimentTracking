-- AlterTable
ALTER TABLE "refresh_logs" ADD COLUMN     "brand_id" INTEGER;

-- CreateIndex
CREATE INDEX "refresh_logs_brand_id_idx" ON "refresh_logs"("brand_id");

-- AddForeignKey
ALTER TABLE "refresh_logs" ADD CONSTRAINT "refresh_logs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
