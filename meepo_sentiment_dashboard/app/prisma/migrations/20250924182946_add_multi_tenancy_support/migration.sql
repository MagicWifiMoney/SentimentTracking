
-- CreateTable
CREATE TABLE "brands" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "category" TEXT,
    "userId" TEXT NOT NULL,
    "subscription_tier" TEXT NOT NULL DEFAULT 'trial',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_subreddits" (
    "id" SERIAL NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "subreddit" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_subreddits_pkey" PRIMARY KEY ("id")
);

-- Add new columns to sentiment_data - these will remain nullable since there may be no existing data
ALTER TABLE "sentiment_data" ADD COLUMN "brand_id" INTEGER;
ALTER TABLE "sentiment_data" ADD COLUMN "is_negative_about_brand" BOOLEAN;

-- Only process if there is existing data
DO $$
BEGIN
  -- Check if the old column exists (meaning we're migrating from old schema)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'sentiment_data' 
             AND column_name = 'is_negative_about_meepo') THEN
    
    -- We have old data to migrate
    -- Create a default user if none exists
    IF NOT EXISTS (SELECT 1 FROM "User") THEN
      INSERT INTO "User" ("id", "email", "name", "createdAt", "updatedAt")
      VALUES ('default-user-id', 'admin@example.com', 'Default Admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    END IF;
    
    -- Create a migration brand for the old data
    INSERT INTO "brands" ("name", "website", "description", "category", "userId", "subscription_tier", "updatedAt")
    VALUES ('Legacy Brand', 'https://example.com', 'Migrated from legacy data', 'Other', 
            (SELECT id FROM "User" LIMIT 1), 'trial', CURRENT_TIMESTAMP);
    
    -- Update existing sentiment data to reference the migration brand
    UPDATE "sentiment_data" 
    SET "brand_id" = (SELECT id FROM "brands" WHERE name = 'Legacy Brand' LIMIT 1),
        "is_negative_about_brand" = "is_negative_about_meepo";
    
    -- Drop the old column
    ALTER TABLE "sentiment_data" DROP COLUMN "is_negative_about_meepo";
    
    -- Now make the columns NOT NULL since we migrated the data
    ALTER TABLE "sentiment_data" ALTER COLUMN "brand_id" SET NOT NULL;
    ALTER TABLE "sentiment_data" ALTER COLUMN "is_negative_about_brand" SET NOT NULL;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX "brands_userId_idx" ON "brands"("userId");
CREATE INDEX "brands_subscription_tier_idx" ON "brands"("subscription_tier");
CREATE INDEX "brands_is_active_idx" ON "brands"("is_active");

-- CreateIndex
CREATE INDEX "brand_subreddits_brand_id_idx" ON "brand_subreddits"("brand_id");
CREATE INDEX "brand_subreddits_is_active_idx" ON "brand_subreddits"("is_active");

-- CreateIndex
CREATE INDEX "sentiment_data_is_negative_about_brand_idx" ON "sentiment_data"("is_negative_about_brand");
CREATE INDEX "sentiment_data_brand_id_idx" ON "sentiment_data"("brand_id");
CREATE INDEX "sentiment_data_brand_id_subreddit_idx" ON "sentiment_data"("brand_id", "subreddit");

-- CreateIndex
CREATE UNIQUE INDEX "brand_subreddits_brand_id_subreddit_key" ON "brand_subreddits"("brand_id", "subreddit");

-- AddForeignKey
ALTER TABLE "sentiment_data" ADD CONSTRAINT "sentiment_data_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_subreddits" ADD CONSTRAINT "brand_subreddits_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
