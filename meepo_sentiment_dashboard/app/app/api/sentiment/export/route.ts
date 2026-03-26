
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { categorizeComplaint, extractSuggestions, COMPLAINT_CATEGORIES, getCategoryByid } from '@/lib/categorization';

export const dynamic = "force-dynamic";

const esc = (val: string | null | undefined) => {
  if (!val) return '""';
  return `"${val.replace(/"/g, '""')}"`;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get('type') || 'sentiment'; // sentiment | categories | suggestions | all
    const brandId = searchParams.get('brandId');
    const sentiment = searchParams.get('sentiment');
    const subreddit = searchParams.get('subreddit');
    const search = searchParams.get('search');
    const negativeOnly = searchParams.get('negativeOnly') === 'true';

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 });
    }

    const brandIdNum = parseInt(brandId);

    // Get brand name for filename
    const brand = await prisma.brand.findUnique({
      where: { id: brandIdNum },
      select: { name: true }
    });
    const brandSlug = brand?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'brand';
    const timestamp = new Date().toISOString().split('T')[0];

    // Build shared where clause
    const where: any = { brandId: brandIdNum };
    if (sentiment && sentiment !== 'all') where.sentimentLabel = sentiment;
    if (subreddit && subreddit !== 'all') where.subreddit = subreddit;
    if (negativeOnly) where.isNegativeAboutBrand = true;
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { postTitle: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get all data
    const data = await prisma.sentimentData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    let csv: string;
    let filename: string;

    if (exportType === 'categories') {
      // --- CATEGORIES EXPORT ---
      const negativeData = data.filter(d => d.isNegativeAboutBrand);
      const categoryRows: any[] = [];

      negativeData.forEach(item => {
        const categories = categorizeComplaint(item.content, item.postTitle);
        categories.forEach(catId => {
          const cat = getCategoryByid(catId);
          categoryRows.push({
            category: cat?.name || 'General Issues',
            categoryId: catId,
            url: item.url,
            subreddit: item.subreddit,
            postTitle: item.postTitle,
            content: item.content,
            author: item.author,
            sentimentScore: item.sentimentScore,
            date: item.timestamp?.toISOString()?.split('T')[0],
            upvotes: item.upvotes,
            numComments: item.numComments,
          });
        });
      });

      const headers = ['Category', 'Category ID', 'Mention Link', 'Community', 'Post Title', 'Mention', 'Author', 'Sentiment Score', 'Date', 'Upvotes', 'Comments'];
      const rows = categoryRows.map(r => [
        esc(r.category), esc(r.categoryId), esc(r.url), esc(`r/${r.subreddit}`),
        esc(r.postTitle), esc(r.content?.substring(0, 2000)), esc(r.author),
        (r.sentimentScore ?? 0).toFixed(2), esc(r.date), r.upvotes ?? 0, r.numComments ?? 0,
      ].join(','));

      // Add summary section at top
      const categoryCounts: Record<string, number> = {};
      categoryRows.forEach(r => { categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1; });
      const summaryRows = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([cat, count]) => `${esc(cat)},${count},${((count / negativeData.length) * 100).toFixed(1)}%`);

      csv = [
        '=== CATEGORY SUMMARY ===',
        'Category,Count,% of Complaints',
        ...summaryRows,
        '',
        `Total Complaints,${negativeData.length}`,
        '',
        '=== DETAILED DATA ===',
        headers.join(','),
        ...rows,
      ].join('\n');

      filename = `${brandSlug}_issue_categories_${timestamp}.csv`;

    } else if (exportType === 'suggestions') {
      // --- SUGGESTIONS EXPORT ---
      const suggestions = data
        .filter(item => extractSuggestions(item.content, item.postTitle))
        .map(item => ({
          ...item,
          categories: categorizeComplaint(item.content, item.postTitle),
          suggestionType: determineSuggestionType(item.content, item.postTitle),
        }));

      const headers = ['Suggestion Type', 'Categories', 'Mention Link', 'Community', 'Post Title', 'Mention', 'Author', 'Sentiment', 'Sentiment Score', 'Date', 'Upvotes', 'Comments'];
      const rows = suggestions.map(s => [
        esc(s.suggestionType),
        esc(s.categories.map(c => getCategoryByid(c)?.name || c).join('; ')),
        esc(s.url), esc(`r/${s.subreddit}`), esc(s.postTitle),
        esc(s.content?.substring(0, 2000)), esc(s.author),
        esc(s.sentimentLabel), (s.sentimentScore ?? 0).toFixed(2),
        esc(s.timestamp?.toISOString()?.split('T')[0]),
        s.upvotes ?? 0, s.numComments ?? 0,
      ].join(','));

      // Summary
      const typeCounts: Record<string, number> = {};
      suggestions.forEach(s => { typeCounts[s.suggestionType] = (typeCounts[s.suggestionType] || 0) + 1; });
      const summaryRows = Object.entries(typeCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([type, count]) => `${esc(type)},${count},${((count / suggestions.length) * 100).toFixed(1)}%`);

      csv = [
        '=== SUGGESTION THEMES SUMMARY ===',
        'Theme,Count,% of Suggestions',
        ...summaryRows,
        '',
        `Total Suggestions,${suggestions.length}`,
        '',
        '=== DETAILED DATA ===',
        headers.join(','),
        ...rows,
      ].join('\n');

      filename = `${brandSlug}_suggestions_insights_${timestamp}.csv`;

    } else if (exportType === 'all') {
      // --- COMBINED EXPORT (3 sections) ---
      const negativeData = data.filter(d => d.isNegativeAboutBrand);
      const suggestions = data.filter(item => extractSuggestions(item.content, item.postTitle));

      // Section 1: Sentiment overview
      const sentimentHeaders = ['Mention Link', 'Community', 'Mention', 'Post Title', 'Type', 'Upvotes', 'Comments', 'Sentiment', 'Score', 'Author', 'Date', 'Critical', 'Keywords'];
      const sentimentRows = data.map(row => [
        esc(row.url), esc(`r/${row.subreddit}`), esc(row.content?.substring(0, 2000)),
        esc(row.postTitle), esc(row.postType || 'post'), row.upvotes ?? 0, row.numComments ?? 0,
        esc(row.sentimentLabel), (row.sentimentScore ?? 0).toFixed(2), esc(row.author),
        esc(row.timestamp?.toISOString()?.split('T')[0]),
        row.isNegativeAboutBrand ? 'Yes' : 'No',
        esc((row.matchedKeywords || []).join('; ')),
      ].join(','));

      // Section 2: Categories
      const categoryCounts: Record<string, number> = {};
      negativeData.forEach(item => {
        categorizeComplaint(item.content, item.postTitle).forEach(catId => {
          const cat = getCategoryByid(catId);
          categoryCounts[cat?.name || 'General'] = (categoryCounts[cat?.name || 'General'] || 0) + 1;
        });
      });
      const catSummary = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([cat, count]) => `${esc(cat)},${count},${negativeData.length > 0 ? ((count / negativeData.length) * 100).toFixed(1) : 0}%`);

      // Section 3: Suggestion themes
      const typeCounts: Record<string, number> = {};
      suggestions.forEach(s => {
        const type = determineSuggestionType(s.content, s.postTitle);
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      const suggSummary = Object.entries(typeCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([type, count]) => `${esc(type)},${count},${suggestions.length > 0 ? ((count / suggestions.length) * 100).toFixed(1) : 0}%`);

      csv = [
        `=== ${brand?.name?.toUpperCase() || 'BRAND'} SENTIMENT REPORT - ${timestamp} ===`,
        '',
        `Total Mentions,${data.length}`,
        `Positive,${data.filter(d => d.sentimentLabel === 'positive').length}`,
        `Negative,${data.filter(d => d.sentimentLabel === 'negative').length}`,
        `Neutral,${data.filter(d => d.sentimentLabel === 'neutral').length}`,
        `Critical (Brand Negative),${negativeData.length}`,
        `Posts with Suggestions,${suggestions.length}`,
        '',
        '=== ISSUE CATEGORIES ===',
        'Category,Count,% of Complaints',
        ...catSummary,
        '',
        '=== SUGGESTION THEMES ===',
        'Theme,Count,% of Suggestions',
        ...suggSummary,
        '',
        '=== ALL SENTIMENT DATA ===',
        sentimentHeaders.join(','),
        ...sentimentRows,
      ].join('\n');

      filename = `${brandSlug}_full_report_${timestamp}.csv`;

    } else {
      // --- DEFAULT: SENTIMENT DATA EXPORT ---
      const headers = ['Mention Link', 'Community', 'Mention', 'Post Title', 'Type', 'Upvotes', 'Comments', 'Sentiment', 'Score', 'Author', 'Date', 'Critical', 'Keywords'];
      const rows = data.map(row => [
        esc(row.url), esc(`r/${row.subreddit}`), esc(row.content?.substring(0, 2000)),
        esc(row.postTitle), esc(row.postType || 'post'), row.upvotes ?? 0, row.numComments ?? 0,
        esc(row.sentimentLabel), (row.sentimentScore ?? 0).toFixed(2), esc(row.author),
        esc(row.timestamp?.toISOString()?.split('T')[0]),
        row.isNegativeAboutBrand ? 'Yes' : 'No',
        esc((row.matchedKeywords || []).join('; ')),
      ].join(','));

      csv = [headers.join(','), ...rows].join('\n');
      filename = `${brandSlug}_sentiment_data_${timestamp}.csv`;
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

function determineSuggestionType(content: string, postTitle: string = ''): string {
  const text = (content + ' ' + postTitle).toLowerCase();
  if (text.includes('should add') || text.includes('would be better') || text.includes('improve') || text.includes('upgrade')) return 'Product Improvement';
  if (text.includes('feature') || text.includes('wish') || text.includes('hope') || text.includes('would like')) return 'Feature Request';
  if (text.includes('quality') || text.includes('reliable') || text.includes('durable') || text.includes('fix')) return 'Quality Enhancement';
  if (text.includes('customer service') || text.includes('support') || text.includes('shipping')) return 'Service Improvement';
  if (text.includes('price') || text.includes('cost') || text.includes('value') || text.includes('expensive')) return 'Pricing Feedback';
  return 'General Suggestion';
}
