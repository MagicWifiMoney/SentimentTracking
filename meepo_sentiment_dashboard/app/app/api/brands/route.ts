
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/brands - Get all brands for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const brands = await prisma.brand.findMany({
      where: { userId: user.id },
      include: {
        subreddits: {
          where: { isActive: true },
          orderBy: { priority: 'asc' },
        },
        _count: {
          select: {
            sentimentData: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

// POST /api/brands - Create a new brand
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { 
      name, 
      website, 
      description, 
      category, 
      focusLocal,
      city,
      state,
      country,
      subreddits, 
      subscriptionTier = 'trial' 
    } = await request.json();

    // Validate required fields
    if (!name || !category || !Array.isArray(subreddits) || subreddits.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, and subreddits' },
        { status: 400 }
      );
    }
    
    // Validate local focus fields if enabled
    if (focusLocal && !city) {
      return NextResponse.json(
        { error: 'City is required when local focus is enabled' },
        { status: 400 }
      );
    }

    // Check subscription limits
    const limits = {
      trial: 3,
      starter: 5,
      professional: 15,
      enterprise: 50,
    };
    
    const maxSubreddits = limits[subscriptionTier as keyof typeof limits] || 3;
    if (subreddits.length > maxSubreddits) {
      return NextResponse.json(
        { error: `Too many subreddits. ${subscriptionTier} plan allows up to ${maxSubreddits} subreddits.` },
        { status: 400 }
      );
    }

    // Create brand with subreddits in a transaction
    const brand = await prisma.$transaction(async (tx) => {
      // Create the brand
      const newBrand = await tx.brand.create({
        data: {
          name,
          website: website || null,
          description: description || null,
          category,
          focusLocal: focusLocal || false,
          city: city || null,
          state: state || null,
          country: country || null,
          userId: user.id,
          subscriptionTier,
        },
      });

      // Create brand subreddits
      await tx.brandSubreddit.createMany({
        data: subreddits.map((subreddit: string, index: number) => ({
          brandId: newBrand.id,
          subreddit: subreddit.replace(/^r\//, ''), // Remove r/ prefix if present
          priority: index + 1,
        })),
      });

      return newBrand;
    });

    // Fetch the complete brand with subreddits
    const completeBrand = await prisma.brand.findUnique({
      where: { id: brand.id },
      include: {
        subreddits: {
          where: { isActive: true },
          orderBy: { priority: 'asc' },
        },
      },
    });

    return NextResponse.json({ brand: completeBrand }, { status: 201 });
  } catch (error) {
    console.error('Error creating brand:', error);
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A brand with this name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    );
  }
}
