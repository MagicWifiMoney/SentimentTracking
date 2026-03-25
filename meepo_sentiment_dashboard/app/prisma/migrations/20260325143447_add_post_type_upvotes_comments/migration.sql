-- AlterTable
ALTER TABLE "sentiment_data" ADD COLUMN     "num_comments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "post_type" TEXT NOT NULL DEFAULT 'post',
ADD COLUMN     "upvotes" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "sentiment_data_upvotes_idx" ON "sentiment_data"("upvotes");
