
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('queryId');

    if (queryId) {
      // Get specific research query with results
      const query = await prisma.researchQuery.findFirst({
        where: {
          id: parseInt(queryId),
          userId: (session.user as any).id,
        },
        include: {
          results: {
            orderBy: [
              { relevanceScore: 'desc' },
              { painPointSeverity: 'desc' },
              { timestamp: 'desc' }
            ],
            take: 100, // Limit results for performance
          },
        },
      });

      if (!query) {
        return NextResponse.json({ error: 'Research query not found' }, { status: 404 });
      }

      return NextResponse.json({ query });
    } else {
      // Get all user's research queries
      const queries = await prisma.researchQuery.findMany({
        where: {
          userId: (session.user as any).id,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { results: true },
          },
        },
      });

      return NextResponse.json({ queries });
    }
  } catch (error) {
    console.error('Error fetching research queries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.subreddits || !Array.isArray(data.subreddits) || data.subreddits.length === 0) {
      return NextResponse.json({ 
        error: 'Name and at least one subreddit are required' 
      }, { status: 400 });
    }

    // Create research query
    const query = await prisma.researchQuery.create({
      data: {
        name: data.name,
        description: data.description,
        subreddits: data.subreddits,
        keywords: data.keywords || [],
        excludeKeywords: data.excludeKeywords || [],
        dateFrom: data.dateFrom ? new Date(data.dateFrom) : null,
        dateTo: data.dateTo ? new Date(data.dateTo) : null,
        minScore: data.minScore,
        maxResults: Math.min(data.maxResults || 1000, 5000), // Cap at 5000
        userId: (session.user as any).id,
      },
    });

    // TODO: Trigger background research job here
    // For now, we'll create a simple API endpoint to start the research

    return NextResponse.json({ query }, { status: 201 });
  } catch (error) {
    console.error('Error creating research query:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    // Verify ownership and delete
    const query = await prisma.researchQuery.findFirst({
      where: {
        id: parseInt(queryId),
        userId: (session.user as any).id,
      },
    });

    if (!query) {
      return NextResponse.json({ error: 'Research query not found' }, { status: 404 });
    }

    await prisma.researchQuery.delete({
      where: { id: parseInt(queryId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting research query:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
