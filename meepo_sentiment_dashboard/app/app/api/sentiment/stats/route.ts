
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
    const brandId = searchParams.get('brandId');

    // Get user and verify brand access
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If no brandId specified, get the first brand for the user
    let targetBrandId = brandId ? parseInt(brandId) : null;
    if (!targetBrandId) {
      const firstBrand = await prisma.brand.findFirst({
        where: { userId: user.id, isActive: true },
        select: { id: true },
      });
      
      if (!firstBrand) {
        return NextResponse.json({ 
          error: 'No brands found. Please create a brand first.' 
        }, { status: 404 });
      }
      
      targetBrandId = firstBrand.id;
    }

    // Verify user has access to this brand
    const brand = await prisma.brand.findFirst({
      where: { id: targetBrandId, userId: user.id },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 403 });
    }

    // Build where clause for brand filtering
    const whereClause = { brandId: targetBrandId };

    // Get overview statistics
    const [
      totalCount,
      negativeCount,
      positiveCount, 
      neutralCount,
      negativeAboutBrandCount,
      subredditCounts,
      recentData
    ] = await Promise.all([
      prisma.sentimentData.count({ where: whereClause }),
      prisma.sentimentData.count({ where: { ...whereClause, sentimentLabel: 'negative' } }),
      prisma.sentimentData.count({ where: { ...whereClause, sentimentLabel: 'positive' } }),
      prisma.sentimentData.count({ where: { ...whereClause, sentimentLabel: 'neutral' } }),
      prisma.sentimentData.count({ where: { ...whereClause, isNegativeAboutBrand: true } }),
      prisma.sentimentData.groupBy({
        by: ['subreddit'],
        where: whereClause,
        _count: { subreddit: true },
        orderBy: { _count: { subreddit: 'desc' } }
      }),
      // Get recent activity for timeline
      prisma.sentimentData.findMany({
        where: whereClause,
        select: {
          timestamp: true,
          sentimentLabel: true,
          subreddit: true
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      })
    ]);
    
    return NextResponse.json({
      overview: {
        totalMentions: totalCount,
        negative: negativeCount,
        positive: positiveCount,
        neutral: neutralCount,
        negativeAboutBrand: negativeAboutBrandCount,
        negativePercentage: totalCount > 0 ? ((negativeCount / totalCount) * 100) : 0,
        positivePercentage: totalCount > 0 ? ((positiveCount / totalCount) * 100) : 0,
        neutralPercentage: totalCount > 0 ? ((neutralCount / totalCount) * 100) : 0
      },
      subredditBreakdown: subredditCounts?.map(item => ({
        subreddit: item.subreddit,
        count: item._count?.subreddit || 0
      })) || [],
      recentActivity: recentData || []
    });
    
  } catch (error) {
    console.error('Error fetching sentiment stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sentiment statistics' },
      { status: 500 }
    );
  }
}
