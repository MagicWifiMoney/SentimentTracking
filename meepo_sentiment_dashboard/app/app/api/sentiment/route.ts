
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
    
    // Parse query parameters
    const brandId = searchParams.get('brandId');
    const sentiment = searchParams.get('sentiment');
    const subreddit = searchParams.get('subreddit');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const negativeOnly = searchParams.get('negativeOnly') === 'true';
    const keyword = searchParams.get('keyword'); // Filter by specific keyword

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
    
    // Build where clause
    const where: any = {
      brandId: targetBrandId, // Always filter by brand
    };
    
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
    
    // Filter by keyword if specified
    if (keyword && keyword !== 'all') {
      where.matchedKeywords = {
        has: keyword.toLowerCase()
      };
    }
    
    // Get total count for pagination
    const totalCount = await prisma.sentimentData.count({ where });
    
    // Get paginated data
    const data = await prisma.sentimentData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    
    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      },
      brand: {
        id: brand.id,
        name: brand.name,
        category: brand.category
      }
    });
    
  } catch (error) {
    console.error('Error fetching sentiment data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sentiment data' },
      { status: 500 }
    );
  }
}
