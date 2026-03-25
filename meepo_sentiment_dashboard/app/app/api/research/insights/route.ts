
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { askGemini } from '@/lib/gemini';

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('queryId');

    if (!queryId) {
      return NextResponse.json({ error: 'Query ID is required' }, { status: 400 });
    }

    // Get research results for analysis
    const results = await prisma.researchResult.findMany({
      where: {
        query: {
          id: parseInt(queryId),
          userId: (session.user as any).id,
        },
      },
      orderBy: [
        { relevanceScore: 'desc' },
        { timestamp: 'desc' }
      ],
    });

    if (results.length === 0) {
      return NextResponse.json({
        insights: {
          painPointAnalysis: {},
          sentimentTrends: {},
          topOpportunities: [],
          subredditBreakdown: {},
          timeline: [],
          summary: "No data available for analysis."
        }
      });
    }

    // Analyze pain points
    const painPointAnalysis = analyzePainPoints(results);

    // Analyze sentiment trends
    const sentimentTrends = analyzeSentimentTrends(results);

    // Generate top business opportunities
    const topOpportunities = generateTopOpportunities(results);

    // Analyze subreddit breakdown
    const subredditBreakdown = analyzeSubredditBreakdown(results);

    // Generate timeline data
    const timeline = generateTimelineData(results);

    // Generate AI-powered summary
    const summary = await generateAISummary(results, painPointAnalysis, sentimentTrends, subredditBreakdown);

    const insights = {
      painPointAnalysis,
      sentimentTrends,
      topOpportunities,
      subredditBreakdown,
      timeline,
      summary,
      totalResults: results.length,
    };

    return NextResponse.json({ insights });

  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}

async function generateAISummary(results: any[], painPointAnalysis: any, sentimentTrends: any, subredditBreakdown: any): Promise<string> {
  // Build a data snapshot for the AI
  const topPainPoints = Object.entries(painPointAnalysis.categories)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([name, count]) => `${name}: ${count} mentions`);

  const sampleNegative = results
    .filter(r => r.sentimentLabel === 'negative')
    .slice(0, 8)
    .map(r => `- [r/${r.subreddit}] "${r.content?.substring(0, 150)}"`);

  const samplePositive = results
    .filter(r => r.sentimentLabel === 'positive')
    .slice(0, 5)
    .map(r => `- [r/${r.subreddit}] "${r.content?.substring(0, 150)}"`);

  const prompt = `You are a brand intelligence analyst. Analyze this Reddit sentiment data and write an executive summary with actionable recommendations.

DATA SNAPSHOT:
- Total mentions: ${results.length}
- Sentiment: ${sentimentTrends.percentages.positive}% positive, ${sentimentTrends.percentages.negative}% negative, ${sentimentTrends.percentages.neutral}% neutral
- Average sentiment score: ${sentimentTrends.averageScore} (scale: -1 to +1)
- Pain points found: ${painPointAnalysis.totalPainPoints}
- Top pain points: ${topPainPoints.join(', ') || 'None identified'}
- Subreddits covered: ${Object.keys(subredditBreakdown).join(', ')}

SAMPLE NEGATIVE MENTIONS:
${sampleNegative.join('\n') || 'None'}

SAMPLE POSITIVE MENTIONS:
${samplePositive.join('\n') || 'None'}

Write a 3-4 paragraph executive summary that includes:
1. Overall brand health assessment based on the sentiment breakdown
2. The most critical issues customers are reporting and their severity
3. Specific, actionable recommendations to address the top pain points
4. Any positive trends or strengths the brand should leverage

Be direct and specific. Reference actual data points. No generic filler.`;

  try {
    return await askGemini(prompt, { maxTokens: 1000, temperature: 0.5 });
  } catch (error) {
    console.error('AI summary generation failed, using fallback:', error);
    return generateFallbackSummary(results, painPointAnalysis, sentimentTrends);
  }
}

function generateFallbackSummary(results: any[], painPointAnalysis: any, sentimentTrends: any): string {
  const totalResults = results.length;
  const painPointCount = painPointAnalysis.totalPainPoints;
  const negativePercentage = sentimentTrends.percentages.negative;
  const topPainPoint = Object.entries(painPointAnalysis.categories)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0];

  return `Analysis of ${totalResults} posts revealed ${painPointCount} pain points (${Math.round((painPointCount/totalResults)*100)}% of posts). Sentiment is ${negativePercentage}% negative overall. ${topPainPoint ? `The top pain point is "${topPainPoint[0]}" with ${topPainPoint[1]} mentions.` : ''} Key opportunities exist in improving ${topPainPoint ? topPainPoint[0] : 'user experience'} and addressing community concerns.`;
}

function analyzePainPoints(results: any[]) {
  const painPointCounts: { [key: string]: number } = {};
  const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  const painPointExamples: { [key: string]: any[] } = {};

  results.forEach(result => {
    if (result.painPointCategory) {
      painPointCounts[result.painPointCategory] = (painPointCounts[result.painPointCategory] || 0) + 1;

      if (result.painPointSeverity) {
        severityCounts[result.painPointSeverity as keyof typeof severityCounts]++;
      }

      if (!painPointExamples[result.painPointCategory]) {
        painPointExamples[result.painPointCategory] = [];
      }
      if (painPointExamples[result.painPointCategory].length < 3) {
        painPointExamples[result.painPointCategory].push({
          content: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
          url: result.url,
          subreddit: result.subreddit,
          score: result.score,
        });
      }
    }
  });

  return {
    categories: painPointCounts,
    severity: severityCounts,
    examples: painPointExamples,
    totalPainPoints: Object.values(painPointCounts).reduce((a: number, b: number) => a + b, 0),
  };
}

function analyzeSentimentTrends(results: any[]) {
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
  let totalSentimentScore = 0;

  results.forEach(result => {
    sentimentCounts[result.sentimentLabel as keyof typeof sentimentCounts]++;
    totalSentimentScore += result.sentimentScore;
  });

  const averageSentiment = totalSentimentScore / results.length;

  return {
    distribution: sentimentCounts,
    averageScore: parseFloat(averageSentiment.toFixed(3)),
    percentages: {
      positive: Math.round((sentimentCounts.positive / results.length) * 100),
      negative: Math.round((sentimentCounts.negative / results.length) * 100),
      neutral: Math.round((sentimentCounts.neutral / results.length) * 100),
    },
  };
}

function generateTopOpportunities(results: any[]) {
  const opportunities: { [key: string]: any } = {};

  results.forEach(result => {
    if (result.businessOpportunity && result.painPointCategory) {
      if (!opportunities[result.painPointCategory]) {
        opportunities[result.painPointCategory] = {
          category: result.painPointCategory,
          opportunity: result.businessOpportunity,
          frequency: 0,
          examples: [],
        };
      }
      opportunities[result.painPointCategory].frequency++;

      if (opportunities[result.painPointCategory].examples.length < 2) {
        opportunities[result.painPointCategory].examples.push({
          content: result.content.substring(0, 150) + '...',
          subreddit: result.subreddit,
        });
      }
    }
  });

  return Object.values(opportunities)
    .sort((a: any, b: any) => b.frequency - a.frequency)
    .slice(0, 5);
}

function analyzeSubredditBreakdown(results: any[]) {
  const subredditStats: { [key: string]: any } = {};

  results.forEach(result => {
    if (!subredditStats[result.subreddit]) {
      subredditStats[result.subreddit] = {
        total: 0,
        sentiment: { positive: 0, negative: 0, neutral: 0 },
        painPoints: 0,
        avgScore: 0,
        totalScore: 0,
      };
    }

    const stats = subredditStats[result.subreddit];
    stats.total++;
    stats.sentiment[result.sentimentLabel as keyof typeof stats.sentiment]++;
    stats.totalScore += result.score;
    stats.avgScore = Math.round(stats.totalScore / stats.total);

    if (result.painPointCategory) {
      stats.painPoints++;
    }
  });

  return subredditStats;
}

function generateTimelineData(results: any[]) {
  const timelineData: { [key: string]: any } = {};

  results.forEach(result => {
    const date = new Date(result.timestamp).toISOString().split('T')[0];

    if (!timelineData[date]) {
      timelineData[date] = {
        date,
        total: 0,
        negative: 0,
        painPoints: 0,
      };
    }

    timelineData[date].total++;
    if (result.sentimentLabel === 'negative') {
      timelineData[date].negative++;
    }
    if (result.painPointCategory) {
      timelineData[date].painPoints++;
    }
  });

  return Object.values(timelineData).sort((a: any, b: any) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
