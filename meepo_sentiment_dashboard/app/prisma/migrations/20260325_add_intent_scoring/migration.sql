-- AlterTable
ALTER TABLE "sentiment_data" ADD COLUMN "intent_type" TEXT;
ALTER TABLE "sentiment_data" ADD COLUMN "intent_score" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "sentiment_data_intent_type_idx" ON "sentiment_data"("intent_type");
