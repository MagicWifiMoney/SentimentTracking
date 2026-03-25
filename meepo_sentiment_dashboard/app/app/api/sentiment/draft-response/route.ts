import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { askGemini } from '@/lib/gemini';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sentimentId, tone } = await request.json();

    if (!sentimentId) {
      return NextResponse.json({ error: 'Sentiment data ID required' }, { status: 400 });
    }

    // Get the sentiment data with brand info
    const sentimentData = await prisma.sentimentData.findUnique({
      where: { id: parseInt(sentimentId) },
      include: { brand: true },
    });

    if (!sentimentData) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Verify user owns this brand
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || sentimentData.brand.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const responseTone = tone || 'professional';

    const prompt = `You are a community manager for "${sentimentData.brand.name}" (${sentimentData.brand.category || 'consumer brand'}). Draft a Reddit response to this ${sentimentData.sentimentLabel} post.

ORIGINAL POST:
Subreddit: r/${sentimentData.subreddit}
Title: ${sentimentData.postTitle}
Content: ${sentimentData.content?.substring(0, 500)}
Author: u/${sentimentData.author}
Upvotes: ${sentimentData.upvotes}

RESPONSE GUIDELINES:
- Tone: ${responseTone} (options: professional, empathetic, casual, technical)
- Be authentic and human -- Reddit users hate corporate-speak
- Acknowledge the issue directly, don't deflect
- If it's a complaint, offer a specific next step (DM for support, link to fix, etc.)
- If it's a question, give a helpful answer
- If it's praise, thank them genuinely without being sycophantic
- Keep it concise (2-4 sentences max for Reddit)
- Don't use hashtags or marketing language
- Match the subreddit's communication style (r/${sentimentData.subreddit})

Draft 2 response options:
1. A direct response to the post
2. An alternative approach (different angle or tone)

Respond in JSON:
{
  "responses": [
    {
      "label": "Direct Response",
      "text": "...",
      "approach": "Brief description of the approach"
    },
    {
      "label": "Alternative",
      "text": "...",
      "approach": "Brief description of the approach"
    }
  ],
  "tips": ["One tip about engaging in this subreddit"]
}

Respond with raw JSON only.`;

    const content = await askGemini(prompt, { maxTokens: 1000, temperature: 0.7 });

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // If JSON parsing fails, return the raw text as a single response
      parsed = {
        responses: [{ label: 'Response', text: content, approach: 'AI-generated' }],
        tips: [],
      };
    }

    return NextResponse.json({
      success: true,
      postTitle: sentimentData.postTitle,
      subreddit: sentimentData.subreddit,
      sentiment: sentimentData.sentimentLabel,
      ...parsed,
    });

  } catch (error) {
    console.error('Error drafting response:', error);
    return NextResponse.json({ error: 'Failed to draft response' }, { status: 500 });
  }
}
