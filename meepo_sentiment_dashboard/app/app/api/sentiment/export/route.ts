
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters (same as main route)
    const brandId = searchParams.get('brandId');
    const sentiment = searchParams.get('sentiment');
    const subreddit = searchParams.get('subreddit'); 
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const negativeOnly = searchParams.get('negativeOnly') === 'true';
    
    // Build where clause (same logic as main route)
    const where: any = {};
    
    // Filter by brand if specified
    if (brandId) {
      where.brandId = parseInt(brandId);
    }
    
    if (sentiment && sentiment !== 'all') {
      where.sentimentLabel = sentiment;
    }
    
    if (subreddit && subreddit !== 'all') {
      where.subreddit = subreddit;
    }
    
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { postTitle: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (startDate) {
      where.timestamp = {
        ...where.timestamp,
        gte: new Date(startDate)
      };
    }
    
    if (endDate) {
      where.timestamp = {
        ...where.timestamp,
        lte: new Date(endDate)
      };
    }
    
    if (minScore !== null && minScore !== undefined) {
      where.sentimentScore = {
        ...where.sentimentScore,
        gte: parseFloat(minScore)
      };
    }
    
    if (maxScore !== null && maxScore !== undefined) {
      where.sentimentScore = {
        ...where.sentimentScore,
        lte: parseFloat(maxScore)
      };
    }
    
    if (negativeOnly) {
      where.isNegativeAboutBrand = true;
    }
    
    // Get all data matching filters (no pagination for export)
    const data = await prisma.sentimentData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });
    
    // Helper to escape CSV values
    const esc = (val: string | null | undefined) => {
      if (!val) return '""';
      return `"${val.replace(/"/g, '""')}"`;
    };

    // Convert to CSV with requested columns
    const headers = [
      'Mention Link',
      'Community',
      'Mention',
      'Post Title',
      'Type',
      'UpVotes',
      'Comments',
      'Sentiment',
      'Sentiment Score',
      'Author',
      'Date',
      'Negative About Brand',
      'Matched Keywords'
    ];
    
    const csvRows = [
      headers.join(','),
      ...data.map(row => [
        esc(row.url),
        esc(row.subreddit ? `r/${row.subreddit}` : ''),
        esc(row.content?.substring(0, 2000)),
        esc(row.postTitle),
        esc(row.postType || 'post'),
        row.upvotes ?? 0,
        row.numComments ?? 0,
        esc(row.sentimentLabel),
        (row.sentimentScore ?? 0).toFixed(2),
        esc(row.author),
        esc(row.timestamp?.toISOString()?.split('T')[0]),
        row.isNegativeAboutBrand ? 'Yes' : 'No',
        esc((row.matchedKeywords || []).join('; '))
      ].join(','))
    ];
    
    const csv = csvRows.join('\n');
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Get brand name for filename if brandId is specified
    let filename = `sentiment_data_${timestamp}.csv`;
    if (brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: parseInt(brandId) },
        select: { name: true }
      });
      if (brand) {
        const brandSlug = brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        filename = `${brandSlug}_sentiment_data_${timestamp}.csv`;
      }
    }
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
    
  } catch (error) {
    console.error('Error exporting sentiment data:', error);
    return NextResponse.json(
      { error: 'Failed to export sentiment data' },
      { status: 500 }
    );
  }
}
