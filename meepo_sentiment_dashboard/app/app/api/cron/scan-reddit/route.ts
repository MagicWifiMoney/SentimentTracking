import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for cron

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] Starting automated Reddit scan...');

  // Get all active brands with their subreddits and keywords
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    include: {
      subreddits: { where: { isActive: true } },
      keywords: { where: { isActive: true, type: 'track' } },
    },
  });

  console.log(`[Cron] Found ${brands.length} active brands to scan`);

  const results: any[] = [];

  for (const brand of brands) {
    if (brand.subreddits.length === 0) continue;

    try {
      // Call our own refresh endpoint internally
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      // We bypass the refresh endpoint and do the scan directly
      // to avoid auth requirements on the cron job
      const scanResult = await scanBrand(brand);
      results.push({
        brand: brand.name,
        brandId: brand.id,
        ...scanResult,
      });

      console.log(`[Cron] Brand "${brand.name}": ${scanResult.newRecords} new records`);
    } catch (error) {
      console.error(`[Cron] Error scanning brand "${brand.name}":`, error);
      results.push({
        brand: brand.name,
        brandId: brand.id,
        error: String(error),
      });
    }

    // Rate limit between brands
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('[Cron] Scan complete');

  return NextResponse.json({
    success: true,
    scannedBrands: results.length,
    results,
  });
}

// Inline scan logic (simplified version of refresh route, no auth/rate-limit needed for cron)
async function scanBrand(brand: any) {
  const credentials = getRedditCredentials();
  if (!credentials) throw new Error('Reddit credentials not configured');

  const accessToken = await getRedditAccessToken(credentials);
  const subredditNames = brand.subreddits.map((s: any) => s.subreddit);
  const keywords = brand.keywords.map((k: any) => k.keyword);

  const posts = await fetchRedditPosts(accessToken, credentials.userAgent, subredditNames, brand.name, keywords);

  let newRecords = 0;
  for (const post of posts) {
    try {
      await prisma.sentimentData.upsert({
        where: {
          url_brandId: { url: post.url, brandId: brand.id },
        },
        update: {
          content: post.content,
          upvotes: post.upvotes,
          numComments: post.numComments,
          sentimentScore: post.sentimentScore,
          sentimentLabel: post.sentimentLabel,
          isNegativeAboutBrand: post.isNegativeAboutBrand,
          matchedKeywords: post.matchedKeywords,
          updatedAt: new Date(),
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
          brandId: brand.id,
        },
      });
      newRecords++;
    } catch (error) {
      // Skip duplicates
    }
  }

  // Log the cron scan
  await prisma.refreshLog.create({
    data: { brandId: brand.id, status: 'success', newRecords },
  });

  return { newRecords, totalProcessed: posts.length };
}

// --- Reddit API helpers (duplicated from refresh route to avoid import issues) ---

function getRedditCredentials() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT || 'RedditBrandMonitor/1.0';
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, userAgent };
}

async function getRedditAccessToken(credentials: { clientId: string; clientSecret: string; userAgent: string }) {
  const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': credentials.userAgent,
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) throw new Error(`Reddit auth failed: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}

function analyzeSentiment(text: string) {
  const positiveWords = ['love', 'great', 'awesome', 'excellent', 'amazing', 'good', 'best', 'perfect', 'fantastic', 'wonderful', 'helpful', 'recommend', 'happy', 'satisfied', 'quality', 'reliable', 'fast', 'easy'];
  const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'worst', 'horrible', 'poor', 'scam', 'fraud', 'issue', 'problem', 'broken', 'failed', 'disappointed', 'complaint', 'refund', 'avoid', 'waste', 'sucks', 'slow', 'unreliable', "never again", "don't buy", 'stay away'];
  const lowerText = text.toLowerCase();
  let pos = 0, neg = 0;
  positiveWords.forEach(w => { if (lowerText.includes(w)) pos++; });
  negativeWords.forEach(w => { if (lowerText.includes(w)) neg++; });
  const total = pos + neg;
  let score = total > 0 ? (pos - neg) / Math.max(total, 1) : 0;
  score = Math.max(-1, Math.min(1, score));
  let label = 'neutral';
  if (score > 0.1) label = 'positive';
  else if (score < -0.1) label = 'negative';
  return { score, label, isNegative: label === 'negative' };
}

async function fetchRedditPosts(accessToken: string, userAgent: string, subreddits: string[], brandName: string, keywords: string[]) {
  const results: any[] = [];
  const seenUrls = new Set<string>();
  const searchTerms = [brandName, ...keywords].filter(Boolean);

  for (const subreddit of subreddits) {
    try {
      for (const term of searchTerms.slice(0, 5)) {
        const url = `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(term)}&restrict_sr=1&sort=new&limit=100&t=week`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': userAgent },
        });
        if (!response.ok) continue;
        const data = await response.json();

        for (const post of data?.data?.children || []) {
          const pd = post.data;
          const postUrl = `https://reddit.com${pd.permalink}`;
          if (seenUrls.has(postUrl)) continue;

          const content = `${pd.title || ''} ${pd.selftext || ''}`;
          const lowerContent = content.toLowerCase();
          const matched: string[] = [];
          if (lowerContent.includes(brandName.toLowerCase())) matched.push(brandName);
          keywords.forEach(kw => { if (lowerContent.includes(kw.toLowerCase())) matched.push(kw); });
          if (matched.length === 0) continue;

          seenUrls.add(postUrl);
          const sentiment = analyzeSentiment(content);
          results.push({
            url: postUrl,
            timestamp: new Date(pd.created_utc * 1000),
            content: pd.selftext || pd.title,
            author: pd.author || '[deleted]',
            subreddit,
            postTitle: pd.title || '',
            postType: pd.is_self ? 'post' : 'link',
            upvotes: pd.score || 0,
            numComments: pd.num_comments || 0,
            sentimentScore: sentiment.score,
            sentimentLabel: sentiment.label,
            isNegativeAboutBrand: sentiment.isNegative,
            matchedKeywords: matched,
          });
        }
        await new Promise(r => setTimeout(r, 250));
      }
    } catch (error) {
      console.error(`[Cron] Error fetching r/${subreddit}:`, error);
    }
  }
  return results;
}
