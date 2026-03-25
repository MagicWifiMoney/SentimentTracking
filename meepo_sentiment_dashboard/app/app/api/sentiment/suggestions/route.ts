
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extractSuggestions, categorizeComplaint } from '@/lib/categorization';
import { askGeminiJSON } from '@/lib/gemini';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subreddit = searchParams.get('subreddit');
    const brandId = searchParams.get('brandId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get target brand
    let targetBrandId = brandId ? parseInt(brandId) : null;
    if (!targetBrandId) {
      const firstBrand = await prisma.brand.findFirst({
        where: { userId: user.id, isActive: true },
        select: { id: true, name: true }
      });
      if (!firstBrand) {
        return NextResponse.json({
          suggestions: [],
          aiRecommendations: [],
          pagination: { page: 1, pageSize, total: 0, totalPages: 0 },
          summary: {
            totalSuggestions: 0,
            positiveVsNegativeSuggestions: { positive: 0, negative: 0, neutral: 0 },
            topThemes: []
          }
        });
      }
      targetBrandId = firstBrand.id;
    }

    // Get brand name for AI context
    const brand = await prisma.brand.findUnique({
      where: { id: targetBrandId },
      select: { name: true }
    });

    // Build where clause
    const where: any = { brandId: targetBrandId };
    if (subreddit && subreddit !== 'all') {
      where.subreddit = subreddit;
    }

    // Get all data to analyze
    const allData = await prisma.sentimentData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    // Filter for suggestions using keyword matching
    const suggestions = allData
      .filter(item => extractSuggestions(item.content, item.postTitle))
      .map(item => ({
        ...item,
        categories: categorizeComplaint(item.content, item.postTitle),
        suggestionType: determineSuggestionType(item.content, item.postTitle)
      }));

    // Paginate
    const totalCount = suggestions.length;
    const paginatedSuggestions = suggestions.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    // Group by type
    const suggestionsByType = suggestions.reduce((acc: any, suggestion) => {
      const type = suggestion.suggestionType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(suggestion);
      return acc;
    }, {});

    const topThemes = Object.keys(suggestionsByType)
      .map(type => ({
        type,
        count: suggestionsByType[type].length,
        percentage: suggestions.length > 0 ? (suggestionsByType[type].length / suggestions.length) * 100 : 0,
        examples: suggestionsByType[type].slice(0, 3)
      }))
      .sort((a, b) => b.count - a.count);

    // Generate AI-powered strategic recommendations
    const aiRecommendations = await generateAIRecommendations(
      brand?.name || 'the brand',
      suggestions.slice(0, 30),
      topThemes
    );

    return NextResponse.json({
      suggestions: paginatedSuggestions,
      aiRecommendations,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      },
      summary: {
        totalSuggestions: suggestions.length,
        positiveVsNegativeSuggestions: {
          positive: suggestions.filter(s => s.sentimentLabel === 'positive').length,
          negative: suggestions.filter(s => s.sentimentLabel === 'negative').length,
          neutral: suggestions.filter(s => s.sentimentLabel === 'neutral').length,
        },
        topThemes
      }
    });

  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

async function generateAIRecommendations(brandName: string, suggestions: any[], topThemes: any[]): Promise<any[]> {
  if (suggestions.length === 0) return [];

  const themeSummary = topThemes.slice(0, 5).map(t =>
    `${t.type}: ${t.count} mentions (${t.percentage.toFixed(0)}%)`
  ).join('\n');

  const samplePosts = suggestions.slice(0, 15).map(s =>
    `- [${s.suggestionType}] "${s.content?.substring(0, 200)}"`
  ).join('\n');

  const prompt = `You are a brand strategist analyzing Reddit feedback for "${brandName}".

TOP THEMES FROM USER FEEDBACK:
${themeSummary}

SAMPLE POSTS WITH SUGGESTIONS:
${samplePosts}

Generate 5 strategic recommendations. For each, provide:
1. title: Short action-oriented title (e.g., "Launch a Battery Warranty Program")
2. priority: "high", "medium", or "low"
3. category: Which theme this addresses
4. description: 2-3 sentence explanation of what to do and why
5. impact: Expected impact on customer sentiment
6. effort: "low", "medium", or "high" implementation effort

Respond in JSON:
{
  "recommendations": [
    {
      "title": "...",
      "priority": "high",
      "category": "Quality Enhancement",
      "description": "...",
      "impact": "...",
      "effort": "medium"
    }
  ]
}

Be specific to the actual feedback. No generic advice. Respond with raw JSON only.`;

  try {
    const result = await askGeminiJSON<{ recommendations: any[] }>(prompt, { maxTokens: 1500, temperature: 0.5 });
    return result.recommendations || [];
  } catch (error) {
    console.error('AI recommendations failed:', error);
    return [];
  }
}

function determineSuggestionType(content: string, postTitle: string = ''): string {
  const text = (content + ' ' + postTitle).toLowerCase();

  if (text.includes('should add') || text.includes('would be better') ||
      text.includes('improve') || text.includes('upgrade') || text.includes('enhance')) {
    return 'Product Improvement';
  }
  if (text.includes('feature') || text.includes('wish') || text.includes('hope') ||
      text.includes('would like') || text.includes('if only')) {
    return 'Feature Request';
  }
  if (text.includes('quality') || text.includes('reliable') || text.includes('durable') ||
      text.includes('fix') || text.includes('better build')) {
    return 'Quality Enhancement';
  }
  if (text.includes('customer service') || text.includes('support') ||
      text.includes('shipping') || text.includes('communication')) {
    return 'Service Improvement';
  }
  if (text.includes('price') || text.includes('cost') || text.includes('value') ||
      text.includes('cheaper') || text.includes('expensive')) {
    return 'Pricing Feedback';
  }
  return 'General Suggestion';
}
