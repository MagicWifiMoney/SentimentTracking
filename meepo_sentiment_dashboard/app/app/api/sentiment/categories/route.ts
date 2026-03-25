
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { categorizeComplaint, COMPLAINT_CATEGORIES, getCategoryByid } from '@/lib/categorization';

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
          summary: { mostCommonIssue: 'None', totalCategories: 0, averageIssuesPerComplaint: 0 }
        });
      }
      targetBrandId = firstBrand.id;
    }
    
    // Build where clause for negative sentiment data
    const where: any = {
      brandId: targetBrandId,
      isNegativeAboutBrand: true // Focus on negative mentions about the brand
    };
    
    if (subreddit && subreddit !== 'all') {
      where.subreddit = subreddit;
    }
    
    // Get all negative sentiment data
    const data = await prisma.sentimentData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });
    
    // Categorize each item
    const categorizedResults: { [key: string]: any[] } = {};
    const categoryStats: { [key: string]: number } = {};
    
    // Initialize categories
    COMPLAINT_CATEGORIES.forEach(cat => {
      categorizedResults[cat.id] = [];
      categoryStats[cat.id] = 0;
    });
    
    categorizedResults['general'] = [];
    categoryStats['general'] = 0;
    
    // Process each item
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
    
    // Prepare response
    const totalNegative = data.length;
    const categoryData = Object.keys(categoryStats).map(categoryId => {
      const category = getCategoryByid(categoryId);
      const count = categoryStats[categoryId];
      
      return {
        id: categoryId,
        name: category?.name || 'General Issues',
        description: category?.description || 'General complaints and issues',
        color: category?.color || 'bg-gray-100 text-gray-800 border-gray-200',
        icon: category?.icon || '❗',
        count,
        percentage: totalNegative > 0 ? (count / totalNegative) * 100 : 0,
        items: categorizedResults[categoryId]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10) // Return top 10 most recent items per category
      };
    }).filter(cat => cat.count > 0).sort((a, b) => b.count - a.count);
    
    return NextResponse.json({
      categories: categoryData,
      totalNegativeComplaints: totalNegative,
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
