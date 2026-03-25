
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = "force-dynamic";

// Rate limiting: max 50x/week, 10x/day per brand
const DAILY_LIMIT = 10;
const WEEKLY_LIMIT = 50;

// Load Reddit credentials from environment variables
function getRedditCredentials() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT || 'RedditBrandMonitor/1.0';

  if (!clientId || !clientSecret) {
    console.error('Reddit credentials not configured in environment variables');
    return null;
  }

  return { clientId, clientSecret, userAgent };
}

// Get Reddit access token
async function getRedditAccessToken(credentials: { clientId: string; clientSecret: string; userAgent: string }) {
  const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
  
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': credentials.userAgent
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Reddit auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Analyze sentiment using simple VADER-like scoring
function analyzeSentiment(text: string) {
  const positiveWords = ['love', 'great', 'awesome', 'excellent', 'amazing', 'good', 'best', 'perfect', 'fantastic', 'wonderful', 'helpful', 'recommend', 'happy', 'satisfied', 'quality', 'reliable', 'fast', 'easy'];
  const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'worst', 'horrible', 'poor', 'scam', 'fraud', 'issue', 'problem', 'broken', 'failed', 'disappointed', 'complaint', 'refund', 'avoid', 'waste', 'sucks', 'slow', 'unreliable', 'never again', 'don\'t buy', 'stay away'];
  
  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });
  
  const total = positiveCount + negativeCount;
  let score = 0;
  
  if (total > 0) {
    score = (positiveCount - negativeCount) / Math.max(total, 1);
  }
  
  let label = 'neutral';
  if (score > 0.1) label = 'positive';
  else if (score < -0.1) label = 'negative';
  
  return {
    score: Math.max(-1, Math.min(1, score)),
    label,
    isNegative: label === 'negative'
  };
}

// Fetch posts from Reddit
// Valid Reddit time filter values
const VALID_TIME_RANGES = ['hour', 'day', 'week', 'month', '3month', '6month', 'year', 'all'] as const;
type AppTimeRange = typeof VALID_TIME_RANGES[number];

// Reddit API only supports: hour, day, week, month, year, all
// For 3month/6month we use 'year' on Reddit and filter by date afterward
function toRedditTimeParam(t: AppTimeRange): string {
  if (t === '3month' || t === '6month') return 'year';
  return t;
}

// How many pages to fetch per search query (each page = 100 results max)
const TIME_RANGE_PAGES: Record<AppTimeRange, number> = {
  hour: 1,
  day: 1,
  week: 1,
  month: 2,
  '3month': 3,
  '6month': 4,
  year: 3,
  all: 3,
};

// Sort strategies to use — using multiple catches more results
const SORT_STRATEGIES_BY_RANGE: Record<AppTimeRange, string[]> = {
  hour: ['new'],
  day: ['new', 'relevance'],
  week: ['new', 'relevance'],
  month: ['new', 'relevance', 'top'],
  '3month': ['new', 'relevance', 'top'],
  '6month': ['new', 'relevance', 'top'],
  year: ['new', 'relevance', 'top'],
  all: ['new', 'relevance', 'top'],
};

// Helper: fetch one page of Reddit search results
async function fetchRedditSearchPage(
  url: string,
  accessToken: string,
  userAgent: string
): Promise<{ posts: any[]; after: string | null }> {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': userAgent
    }
  });

  if (!response.ok) {
    console.log(`Reddit search failed: ${response.status} for ${url}`);
    return { posts: [], after: null };
  }

  const data = await response.json();
  return {
    posts: data?.data?.children || [],
    after: data?.data?.after || null
  };
}

async function fetchRedditPosts(
  accessToken: string, 
  userAgent: string,
  subreddits: string[], 
  brandName: string,
  keywords: string[],
  timeRange: AppTimeRange = 'month'
) {
  const results: any[] = [];
  const seenUrls = new Set<string>();
  const searchTerms = [brandName, ...keywords].filter(Boolean);
  const redditT = toRedditTimeParam(timeRange);
  const maxPages = TIME_RANGE_PAGES[timeRange] || 2;
  const sortStrategies = SORT_STRATEGIES_BY_RANGE[timeRange] || ['new'];

  // For 3month/6month, compute a cutoff date to filter results
  let cutoffTimestamp = 0;
  if (timeRange === '3month') {
    cutoffTimestamp = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
  } else if (timeRange === '6month') {
    cutoffTimestamp = Math.floor(Date.now() / 1000) - 180 * 24 * 60 * 60;
  }

  function processPost(postData: any, subreddit: string): any | null {
    // For 3month/6month, skip posts older than the cutoff
    if (cutoffTimestamp > 0 && postData.created_utc < cutoffTimestamp) return null;

    const permalink = postData.permalink;
    const url = `https://reddit.com${permalink}`;
    if (seenUrls.has(url)) return null;

    const content = `${postData.title || ''} ${postData.selftext || ''}`;
    const lowerContent = content.toLowerCase();
    const brandLower = brandName.toLowerCase();
    const matchedKeywords: string[] = [];

    if (lowerContent.includes(brandLower)) {
      matchedKeywords.push(brandName);
    }

    keywords.forEach(kw => {
      if (lowerContent.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw);
      }
    });

    if (matchedKeywords.length === 0) return null;

    seenUrls.add(url);
    const sentiment = analyzeSentiment(content);

    return {
      url,
      timestamp: new Date(postData.created_utc * 1000),
      content: postData.selftext || postData.title,
      author: postData.author || '[deleted]',
      subreddit: subreddit,
      postTitle: postData.title || '',
      postType: postData.is_self ? 'post' : (postData.link_flair_text === 'Comment' ? 'comment' : 'link'),
      upvotes: postData.score || 0,
      numComments: postData.num_comments || 0,
      sentimentScore: sentiment.score,
      sentimentLabel: sentiment.label,
      isNegativeAboutBrand: sentiment.isNegative,
      matchedKeywords
    };
  }
  
  for (const subreddit of subreddits) {
    try {
      // Limit to first 5 search terms
      for (const term of searchTerms.slice(0, 5)) {
        for (const sortBy of sortStrategies) {
          let after: string | null = null;

          for (let page = 0; page < maxPages; page++) {
            let searchUrl = `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(term)}&restrict_sr=1&sort=${sortBy}&limit=100&t=${redditT}`;
            if (after) {
              searchUrl += `&after=${after}`;
            }

            const result = await fetchRedditSearchPage(searchUrl, accessToken, userAgent);

            for (const post of result.posts) {
              const processed = processPost(post.data, subreddit);
              if (processed) results.push(processed);
            }

            after = result.after;
            if (!after || result.posts.length === 0) break;

            // Rate limit: delay between pages
            await new Promise(r => setTimeout(r, 250));
          }

          // Rate limit: delay between sort strategies
          await new Promise(r => setTimeout(r, 200));
        }
      }

      // Also search comments via a separate query
      for (const term of searchTerms.slice(0, 3)) {
        const commentUrl = `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(term)}&restrict_sr=1&sort=new&limit=100&t=${redditT}&type=comment`;
        const commentResult = await fetchRedditSearchPage(commentUrl, accessToken, userAgent);

        for (const item of commentResult.posts) {
          const commentData = item.data;

          // Apply cutoff filter
          if (cutoffTimestamp > 0 && commentData.created_utc < cutoffTimestamp) continue;

          const permalink = commentData.permalink || `/r/${subreddit}/comments/${commentData.link_id?.replace('t3_', '')}/_/${commentData.id}`;
          const url = `https://reddit.com${permalink}`;
          if (seenUrls.has(url)) continue;

          const content = commentData.body || '';
          const lowerContent = content.toLowerCase();
          const brandLower = brandName.toLowerCase();
          const matchedKeywords: string[] = [];

          if (lowerContent.includes(brandLower)) {
            matchedKeywords.push(brandName);
          }
          keywords.forEach(kw => {
            if (lowerContent.includes(kw.toLowerCase())) {
              matchedKeywords.push(kw);
            }
          });
          if (matchedKeywords.length === 0) continue;

          seenUrls.add(url);
          const sentiment = analyzeSentiment(content);

          results.push({
            url,
            timestamp: new Date(commentData.created_utc * 1000),
            content: content,
            author: commentData.author || '[deleted]',
            subreddit: subreddit,
            postTitle: commentData.link_title || '',
            postType: 'comment',
            upvotes: commentData.score || 0,
            numComments: 0,
            sentimentScore: sentiment.score,
            sentimentLabel: sentiment.label,
            isNegativeAboutBrand: sentiment.isNegative,
            matchedKeywords
          });
        }

        await new Promise(r => setTimeout(r, 200));
      }
    } catch (error) {
      console.error(`Error fetching from r/${subreddit}:`, error);
    }
  }
  
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, timeRange: rawTimeRange } = body;

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 });
    }

    // Validate time range (default to 'month')
    const timeRange: AppTimeRange = VALID_TIME_RANGES.includes(rawTimeRange) ? rawTimeRange : 'month';

    // Get user and verify brand access
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get brand with subreddits and keywords
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId: user.id },
      include: {
        subreddits: { where: { isActive: true } },
        keywords: { where: { isActive: true, type: 'track' } }
      }
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    if (brand.subreddits.length === 0) {
      return NextResponse.json({ 
        error: 'No subreddits configured',
        message: 'Please add at least one subreddit to track in brand settings.'
      }, { status: 400 });
    }

    // Check rate limiting for this brand
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dailyCount = await prisma.refreshLog.count({
      where: {
        brandId: brandId,
        refreshedAt: { gte: oneDayAgo },
        status: { in: ['success', 'failed'] }
      }
    });

    if (dailyCount >= DAILY_LIMIT) {
      return NextResponse.json({ 
        error: 'Daily limit reached',
        message: `You can only refresh ${DAILY_LIMIT} times per day. Try again tomorrow.`
      }, { status: 429 });
    }

    const weeklyCount = await prisma.refreshLog.count({
      where: {
        brandId: brandId,
        refreshedAt: { gte: oneWeekAgo },
        status: { in: ['success', 'failed'] }
      }
    });

    if (weeklyCount >= WEEKLY_LIMIT) {
      return NextResponse.json({ 
        error: 'Weekly limit reached',
        message: `You have reached the weekly limit of ${WEEKLY_LIMIT} refreshes.`
      }, { status: 429 });
    }

    // Get Reddit credentials
    const credentials = getRedditCredentials();
    if (!credentials || !credentials.clientId || !credentials.clientSecret) {
      await prisma.refreshLog.create({
        data: { brandId, status: 'failed', errorMsg: 'Reddit credentials not configured' }
      });
      return NextResponse.json({ 
        error: 'Configuration error',
        message: 'Reddit API credentials are not configured. Please contact support.'
      }, { status: 500 });
    }

    // Get Reddit access token
    let accessToken: string;
    try {
      accessToken = await getRedditAccessToken(credentials);
    } catch (error) {
      await prisma.refreshLog.create({
        data: { brandId, status: 'failed', errorMsg: 'Failed to authenticate with Reddit' }
      });
      return NextResponse.json({ 
        error: 'Reddit authentication failed',
        message: 'Could not connect to Reddit. Please try again later.'
      }, { status: 500 });
    }

    // Fetch data from Reddit
    const subredditNames = brand.subreddits.map(s => s.subreddit);
    const keywords = brand.keywords.map(k => k.keyword);
    
    let posts: any[];
    try {
      console.log(`[Refresh] Brand="${brand.name}" subreddits=${JSON.stringify(subredditNames)} keywords=${JSON.stringify(keywords)} timeRange=${timeRange}`);
      posts = await fetchRedditPosts(accessToken, credentials.userAgent, subredditNames, brand.name, keywords, timeRange);
      console.log(`[Refresh] Fetched ${posts.length} unique matching results from Reddit`);
    } catch (error) {
      await prisma.refreshLog.create({
        data: { brandId, status: 'failed', errorMsg: 'Failed to fetch Reddit data' }
      });
      return NextResponse.json({ 
        error: 'Data fetch failed',
        message: 'Could not fetch data from Reddit. Please try again.'
      }, { status: 500 });
    }

    // Store posts in database (unique per URL + brand)
    let newRecords = 0;
    let updatedRecords = 0;

    for (const post of posts) {
      try {
        // Use the composite unique key (url + brandId) to upsert per-brand
        await prisma.sentimentData.upsert({
          where: {
            url_brandId: {
              url: post.url,
              brandId: brandId
            }
          },
          update: {
            content: post.content,
            postType: post.postType,
            upvotes: post.upvotes,
            numComments: post.numComments,
            sentimentScore: post.sentimentScore,
            sentimentLabel: post.sentimentLabel,
            isNegativeAboutBrand: post.isNegativeAboutBrand,
            matchedKeywords: post.matchedKeywords,
            updatedAt: new Date()
          },
          create: {
            url: post.url,
            timestamp: post.timestamp,
            content: post.content,
            author: post.author,
            subreddit: post.subreddit,
            postTitle: post.postTitle,
            postType: post.postType,
            upvotes: post.upvotes,
            numComments: post.numComments,
            sentimentScore: post.sentimentScore,
            sentimentLabel: post.sentimentLabel,
            isNegativeAboutBrand: post.isNegativeAboutBrand,
            matchedKeywords: post.matchedKeywords,
            brandId: brandId
          }
        });
        // We count as new if it was just created (approximate — upsert doesn't tell us)
        newRecords++;
      } catch (error) {
        console.log(`Skipped record for ${post.url}:`, error);
      }
    }

    // Log successful refresh
    await prisma.refreshLog.create({
      data: {
        brandId,
        status: 'success',
        newRecords: newRecords
      }
    });

    const timeRangeLabels: Record<string, string> = {
      hour: 'past hour', day: 'past 24 hours', week: 'past week',
      month: 'past month', '3month': 'past 3 months', '6month': 'past 6 months',
      year: 'past year', all: 'all time'
    };

    return NextResponse.json({
      success: true,
      message: `Found ${newRecords} new mentions and updated ${updatedRecords} existing records (scanning ${timeRangeLabels[timeRange] || timeRange}).`,
      newRecords,
      updatedRecords,
      totalProcessed: posts.length,
      timeRange,
      remainingDaily: DAILY_LIMIT - (dailyCount + 1),
      remainingWeekly: WEEKLY_LIMIT - (weeklyCount + 1)
    });

  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: 'An unexpected error occurred during refresh' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 });
    }

    const brandIdNum = parseInt(brandId);

    // Get recent refresh logs for this brand
    const recentLogs = await prisma.refreshLog.findMany({
      where: { brandId: brandIdNum },
      orderBy: { refreshedAt: 'desc' },
      take: 5
    });

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dailyCount = await prisma.refreshLog.count({
      where: {
        brandId: brandIdNum,
        refreshedAt: { gte: oneDayAgo },
        status: { in: ['success', 'failed'] }
      }
    });

    const weeklyCount = await prisma.refreshLog.count({
      where: {
        brandId: brandIdNum,
        refreshedAt: { gte: oneWeekAgo },
        status: { in: ['success', 'failed'] }
      }
    });

    return NextResponse.json({
      canRefresh: dailyCount < DAILY_LIMIT && weeklyCount < WEEKLY_LIMIT,
      remainingDaily: DAILY_LIMIT - dailyCount,
      remainingWeekly: WEEKLY_LIMIT - weeklyCount,
      recentLogs: recentLogs.map(log => ({
        refreshedAt: log.refreshedAt,
        status: log.status,
        newRecords: log.newRecords,
        errorMsg: log.errorMsg
      }))
    });

  } catch (error) {
    console.error('Get refresh status error:', error);
    return NextResponse.json({ 
      error: 'Failed to get refresh status' 
    }, { status: 500 });
  }
}
