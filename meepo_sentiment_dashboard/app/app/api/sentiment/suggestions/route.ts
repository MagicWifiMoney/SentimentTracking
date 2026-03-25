
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extractSuggestions, categorizeComplaint } from '@/lib/categorization';

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
        select: { id: true }
      });
      if (!firstBrand) {
        return NextResponse.json({
          suggestions: [],
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
    
    // Build where clause - get all data for this brand
    const where: any = {
      brandId: targetBrandId
    };
    
    if (subreddit && subreddit !== 'all') {
      where.subreddit = subreddit;
    }
    
    // Get all data to analyze for suggestions
    const allData = await prisma.sentimentData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });
    
    // Filter for suggestions and categorize
    const suggestions = allData
      .filter(item => extractSuggestions(item.content, item.postTitle))
      .map(item => ({
        ...item,
        categories: categorizeComplaint(item.content, item.postTitle),
        suggestionType: determineSuggestionType(item.content, item.postTitle)
      }));
    
    // Get paginated suggestions
    const totalCount = suggestions.length;
    const paginatedSuggestions = suggestions.slice(
      (page - 1) * pageSize,
      page * pageSize
    );
    
    // Group suggestions by type
    const suggestionsByType = suggestions.reduce((acc: any, suggestion) => {
      const type = suggestion.suggestionType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(suggestion);
      return acc;
    }, {});
    
    // Get top suggestion themes
    const topThemes = Object.keys(suggestionsByType)
      .map(type => ({
        type,
        count: suggestionsByType[type].length,
        percentage: (suggestionsByType[type].length / suggestions.length) * 100,
        examples: suggestionsByType[type].slice(0, 3)
      }))
      .sort((a, b) => b.count - a.count);
    
    return NextResponse.json({
      suggestions: paginatedSuggestions,
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

function determineSuggestionType(content: string, postTitle: string = ''): string {
  const text = (content + ' ' + postTitle).toLowerCase();
  
  // Product improvement suggestions
  if (text.includes('should add') || text.includes('would be better') || 
      text.includes('improve') || text.includes('upgrade') || text.includes('enhance')) {
    return 'Product Improvement';
  }
  
  // Feature requests
  if (text.includes('feature') || text.includes('wish') || text.includes('hope') ||
      text.includes('would like') || text.includes('if only')) {
    return 'Feature Request';
  }
  
  // Quality/reliability suggestions
  if (text.includes('quality') || text.includes('reliable') || text.includes('durable') ||
      text.includes('fix') || text.includes('better build')) {
    return 'Quality Enhancement';
  }
  
  // Service improvements
  if (text.includes('customer service') || text.includes('support') || 
      text.includes('shipping') || text.includes('communication')) {
    return 'Service Improvement';
  }
  
  // Price/value suggestions
  if (text.includes('price') || text.includes('cost') || text.includes('value') ||
      text.includes('cheaper') || text.includes('expensive')) {
    return 'Pricing Feedback';
  }
  
  return 'General Suggestion';
}
