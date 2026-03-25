
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { askGeminiJSON } from '@/lib/gemini';

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { queryId } = await request.json();

    if (!queryId) {
      return NextResponse.json({ error: 'Query ID is required' }, { status: 400 });
    }

    // Get the research query
    const query = await prisma.researchQuery.findFirst({
      where: {
        id: parseInt(queryId),
        userId: (session.user as any).id,
      },
    });

    if (!query) {
      return NextResponse.json({ error: 'Research query not found' }, { status: 404 });
    }

    // Update status to processing
    await prisma.researchQuery.update({
      where: { id: parseInt(queryId) },
      data: {
        status: 'processing',
        progressMessage: 'Fetching Reddit data...',
      },
    });

    // Fetch real Reddit posts via the app's own sentiment data
    // or use Reddit search if no local data exists
    const existingData = await prisma.sentimentData.findMany({
      where: {
        subreddit: { in: query.subreddits },
        ...(query.dateFrom ? { timestamp: { gte: query.dateFrom } } : {}),
        ...(query.dateTo ? { timestamp: { lte: query.dateTo } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(query.maxResults ?? 100, 200),
    });

    await prisma.researchQuery.update({
      where: { id: parseInt(queryId) },
      data: { progressMessage: 'Analyzing with AI...' },
    });

    // Use AI to analyze the posts for pain points and opportunities
    const analyzedResults = await analyzeWithAI(existingData, query);

    // Save results to database
    await prisma.researchResult.createMany({
      data: analyzedResults.map(result => ({
        ...result,
        queryId: parseInt(queryId),
      })),
    });

    // Update query status
    await prisma.researchQuery.update({
      where: { id: parseInt(queryId) },
      data: {
        status: 'completed',
        progressMessage: 'Analysis completed successfully',
        totalResults: analyzedResults.length,
        painPointsFound: analyzedResults.filter(r => r.painPointCategory).length,
      },
    });

    return NextResponse.json({
      success: true,
      resultsCount: analyzedResults.length,
      painPointsFound: analyzedResults.filter(r => r.painPointCategory).length,
    });

  } catch (error) {
    console.error('Error analyzing research query:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

async function analyzeWithAI(posts: any[], query: any): Promise<any[]> {
  if (posts.length === 0) return [];

  // Process in batches of 20 to stay within token limits
  const batchSize = 20;
  const allResults: any[] = [];

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);

    const postsForPrompt = batch.map((p, idx) =>
      `[${idx}] r/${p.subreddit} | "${p.postTitle}" | Score: ${p.sentimentScore?.toFixed(2) ?? 'N/A'}\n${p.content?.substring(0, 300) || '(no content)'}`
    ).join('\n\n');

    const prompt = `You are a brand intelligence analyst. Analyze these Reddit posts about "${query.keywords?.join(', ') || 'the brand'}" and classify each one.

POSTS:
${postsForPrompt}

For each post, determine:
1. painPointCategory: one of [pricing, usability, support, quality, shipping, features, compatibility, performance, design, availability] or null if not a complaint
2. painPointSeverity: one of [low, medium, high, critical] or null
3. businessOpportunity: a specific, actionable recommendation if a pain point exists, or null
4. relevanceScore: 0.0-1.0 how relevant this post is to the brand/keywords

Respond in JSON format:
{
  "analyses": [
    {
      "index": 0,
      "painPointCategory": "quality",
      "painPointSeverity": "high",
      "businessOpportunity": "Improve motor QC testing before shipment",
      "relevanceScore": 0.92
    }
  ]
}

Respond with raw JSON only.`;

    try {
      const aiResult = await askGeminiJSON<{ analyses: any[] }>(prompt, { maxTokens: 2000, temperature: 0.3 });

      for (const analysis of aiResult.analyses || []) {
        const post = batch[analysis.index];
        if (!post) continue;

        allResults.push({
          url: post.url,
          title: post.postTitle,
          content: post.content || '',
          author: post.author,
          subreddit: post.subreddit,
          score: post.upvotes ?? 0,
          numComments: post.numComments ?? 0,
          timestamp: post.timestamp,
          sentimentScore: post.sentimentScore ?? 0,
          sentimentLabel: post.sentimentLabel || 'neutral',
          painPointCategory: analysis.painPointCategory || null,
          painPointSeverity: analysis.painPointSeverity || null,
          keywordsFound: query.keywords || [],
          relevanceScore: analysis.relevanceScore ?? 0.5,
          businessOpportunity: analysis.businessOpportunity || null,
        });
      }
    } catch (error) {
      console.error(`AI analysis failed for batch starting at ${i}, using fallback:`, error);
      // Fallback: include posts without AI enrichment
      for (const post of batch) {
        allResults.push({
          url: post.url,
          title: post.postTitle,
          content: post.content || '',
          author: post.author,
          subreddit: post.subreddit,
          score: post.upvotes ?? 0,
          numComments: post.numComments ?? 0,
          timestamp: post.timestamp,
          sentimentScore: post.sentimentScore ?? 0,
          sentimentLabel: post.sentimentLabel || 'neutral',
          painPointCategory: null,
          painPointSeverity: null,
          keywordsFound: query.keywords || [],
          relevanceScore: 0.5,
          businessOpportunity: null,
        });
      }
    }
  }

  return allResults;
}
