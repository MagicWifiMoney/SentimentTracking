
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { categorizeComplaint, COMPLAINT_CATEGORIES, getCategoryByid } from '@/lib/categorization';
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
    const useAI = searchParams.get('ai') !== 'false'; // AI on by default

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the target brandId
    let targetBrandId = brandId ? parseInt(brandId) : null;
    if (!targetBrandId) {
      const firstBrand = await prisma.brand.findFirst({
        where: { userId: user.id, isActive: true },
        select: { id: true }
      });
      if (!firstBrand) {
        return NextResponse.json({
          categories: [],
          totalNegativeComplaints: 0,
          aiAnalysis: null,
          summary: { mostCommonIssue: 'None', totalCategories: 0, averageIssuesPerComplaint: 0 }
        });
      }
      targetBrandId = firstBrand.id;
    }

    // Build where clause for negative sentiment data
    const where: any = {
      brandId: targetBrandId,
      isNegativeAboutBrand: true
    };

    if (subreddit && subreddit !== 'all') {
      where.subreddit = subreddit;
    }

    // Get all negative sentiment data
    const data = await prisma.sentimentData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    // Categorize each item with keyword matching
    const categorizedResults: { [key: string]: any[] } = {};
    const categoryStats: { [key: string]: number } = {};

    COMPLAINT_CATEGORIES.forEach(cat => {
      categorizedResults[cat.id] = [];
      categoryStats[cat.id] = 0;
    });

    categorizedResults['general'] = [];
    categoryStats['general'] = 0;

    data.forEach(item => {
      const categories = categorizeComplaint(item.content, item.postTitle);

      categories.forEach(categoryId => {
        if (!categorizedResults[categoryId]) {
          categorizedResults[categoryId] = [];
          categoryStats[categoryId] = 0;
        }

        categorizedResults[categoryId].push({
          ...item,
          categories: categories
        });
        categoryStats[categoryId]++;
      });
    });

    // Prepare category response
    const totalNegative = data.length;
    const categoryData = Object.keys(categoryStats).map(categoryId => {
      const category = getCategoryByid(categoryId);
      const count = categoryStats[categoryId];

      return {
        id: categoryId,
        name: category?.name || 'General Issues',
        description: category?.description || 'General complaints and issues',
        color: category?.color || 'bg-gray-100 text-gray-800 border-gray-200',
        icon: category?.icon || '!',
        count,
        percentage: totalNegative > 0 ? (count / totalNegative) * 100 : 0,
        items: categorizedResults[categoryId]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10)
      };
    }).filter(cat => cat.count > 0).sort((a, b) => b.count - a.count);

    // AI-powered deep analysis of categories
    let aiAnalysis = null;
    if (useAI && data.length > 0) {
      aiAnalysis = await generateCategoryAnalysis(data, categoryData);
    }

    return NextResponse.json({
      categories: categoryData,
      totalNegativeComplaints: totalNegative,
      aiAnalysis,
      summary: {
        mostCommonIssue: categoryData[0]?.name || 'None',
        totalCategories: categoryData.length,
        averageIssuesPerComplaint: totalNegative > 0 ?
          Object.values(categoryStats).reduce((a, b) => a + b, 0) / totalNegative : 0
      }
    });

  } catch (error) {
    console.error('Error fetching categorized data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categorized data' },
      { status: 500 }
    );
  }
}

async function generateCategoryAnalysis(complaints: any[], categoryData: any[]): Promise<any> {
  const categorySummary = categoryData.slice(0, 7).map(c =>
    `${c.name}: ${c.count} complaints (${c.percentage.toFixed(0)}%)`
  ).join('\n');

  // Sample complaints that might be miscategorized or need reclassification
  const uncategorized = complaints
    .filter(c => {
      const cats = categorizeComplaint(c.content, c.postTitle);
      return cats.length === 1 && cats[0] === 'general';
    })
    .slice(0, 10);

  const uncategorizedSamples = uncategorized.map(c =>
    `- "${c.content?.substring(0, 200)}"`
  ).join('\n');

  const prompt = `Analyze these complaint categories from Reddit brand monitoring data.

CURRENT CATEGORY BREAKDOWN:
${categorySummary}

UNCATEGORIZED COMPLAINTS (classified as "General"):
${uncategorizedSamples || 'None'}

Provide:
1. reclassifications: For each uncategorized complaint, suggest a better category (or confirm "general" if truly miscellaneous)
2. emergingIssues: Any patterns in the complaints that don't fit existing categories (suggest new category names)
3. severityAssessment: For each top category, rate overall severity (1-10) and whether it's trending up/down/stable
4. rootCauseHypotheses: For the top 3 categories, suggest likely root causes

Respond in JSON:
{
  "reclassifications": [
    { "content_preview": "...", "suggested_category": "motors", "confidence": 0.85 }
  ],
  "emergingIssues": [
    { "name": "Firmware Bugs", "description": "...", "count_estimate": 5 }
  ],
  "severityAssessment": {
    "battery": { "severity": 8, "trend": "up", "note": "..." }
  },
  "rootCauseHypotheses": {
    "battery": ["...", "..."]
  }
}

Respond with raw JSON only.`;

  try {
    return await askGeminiJSON(prompt, { maxTokens: 2000, temperature: 0.4 });
  } catch (error) {
    console.error('AI category analysis failed:', error);
    return null;
  }
}
