
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

    // Get unique values for filter dropdowns
    const [subreddits, sentimentLabels, dateRange] = await Promise.all([
      prisma.sentimentData.findMany({
        where: whereClause,
        select: { subreddit: true },
        distinct: ['subreddit'],
        orderBy: { subreddit: 'asc' }
      }),
      prisma.sentimentData.findMany({
        where: whereClause,
        select: { sentimentLabel: true },
        distinct: ['sentimentLabel'],
        orderBy: { sentimentLabel: 'asc' }
      }),
      prisma.sentimentData.aggregate({
        where: whereClause,
        _min: { timestamp: true, sentimentScore: true },
        _max: { timestamp: true, sentimentScore: true }
      })
    ]);
    
    return NextResponse.json({
      subreddits: subreddits?.map(s => s.subreddit) || [],
      sentimentLabels: sentimentLabels?.map(s => s.sentimentLabel) || [],
      dateRange: {
        min: dateRange?._min?.timestamp || new Date(),
        max: dateRange?._max?.timestamp || new Date()
      },
      scoreRange: {
        min: dateRange?._min?.sentimentScore || -1,
        max: dateRange?._max?.sentimentScore || 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
