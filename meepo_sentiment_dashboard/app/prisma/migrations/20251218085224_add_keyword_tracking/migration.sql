-- AlterTable
ALTER TABLE "sentiment_data" ADD COLUMN     "matched_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "brand_keywords" (
    "id" SERIAL NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'track',
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_queries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subreddits" TEXT[],
    "keywords" TEXT[],
    "excludeKeywords" TEXT[],
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "minScore" INTEGER,
    "maxResults" INTEGER NOT NULL DEFAULT 1000,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progressMessage" TEXT,
    "totalResults" INTEGER NOT NULL DEFAULT 0,
    "painPointsFound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_results" (
    "id" SERIAL NOT NULL,
    "queryId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "numComments" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "sentimentScore" DOUBLE PRECISION NOT NULL,
    "sentimentLabel" TEXT NOT NULL,
    "painPointCategory" TEXT,
    "painPointSeverity" TEXT,
    "keywordsFound" TEXT[],
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "businessOpportunity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_keywords_brand_id_idx" ON "brand_keywords"("brand_id");

-- CreateIndex
CREATE INDEX "brand_keywords_is_active_idx" ON "brand_keywords"("is_active");

-- CreateIndex
CREATE INDEX "brand_keywords_type_idx" ON "brand_keywords"("type");

-- CreateIndex
CREATE UNIQUE INDEX "brand_keywords_brand_id_keyword_key" ON "brand_keywords"("brand_id", "keyword");

-- CreateIndex
CREATE INDEX "research_queries_userId_idx" ON "research_queries"("userId");

-- CreateIndex
CREATE INDEX "research_queries_status_idx" ON "research_queries"("status");

-- CreateIndex
CREATE INDEX "research_queries_createdAt_idx" ON "research_queries"("createdAt");

-- CreateIndex
CREATE INDEX "research_results_queryId_idx" ON "research_results"("queryId");

-- CreateIndex
CREATE INDEX "research_results_subreddit_idx" ON "research_results"("subreddit");

-- CreateIndex
CREATE INDEX "research_results_painPointCategory_idx" ON "research_results"("painPointCategory");

-- CreateIndex
CREATE INDEX "research_results_sentimentLabel_idx" ON "research_results"("sentimentLabel");

-- CreateIndex
CREATE INDEX "research_results_relevanceScore_idx" ON "research_results"("relevanceScore");

-- CreateIndex
CREATE INDEX "research_results_timestamp_idx" ON "research_results"("timestamp");

-- AddForeignKey
ALTER TABLE "brand_keywords" ADD CONSTRAINT "brand_keywords_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_queries" ADD CONSTRAINT "research_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_results" ADD CONSTRAINT "research_results_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "research_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
