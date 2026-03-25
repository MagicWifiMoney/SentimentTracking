-- DropIndex (old global unique on url)
DROP INDEX IF EXISTS "sentiment_data_url_key";

-- CreateIndex (composite unique per brand)
CREATE UNIQUE INDEX IF NOT EXISTS "sentiment_data_url_brand_id_key" ON "sentiment_data"("url", "brand_id");
