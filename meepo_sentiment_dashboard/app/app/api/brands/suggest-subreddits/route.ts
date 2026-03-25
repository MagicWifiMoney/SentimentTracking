import { NextRequest, NextResponse } from 'next/server';

interface SubredditSuggestion {
  name: string;
  relevanceScore: number;
  reason: string;
  subscribers?: string;
  activityLevel?: 'high' | 'medium' | 'low';
}

interface LLMSuggestion {
  subreddit: string;
  reason: string;
  relevance: number;
  activity: string;
  subscribers: string;
}

// Use LLM to generate intelligent subreddit recommendations
async function generateAISuggestions(
  brandName: string,
  website: string,
  category: string,
  focusLocal: boolean,
  city: string,
  state: string,
  country: string
): Promise<SubredditSuggestion[]> {
  const locationContext = focusLocal && city 
    ? `The brand operates locally in ${city}${state ? `, ${state}` : ''}${country ? `, ${country}` : ''}. Include relevant city/regional subreddits.`
    : 'The brand operates nationally/globally.';

  const prompt = `You are a Reddit expert helping a brand find the most relevant subreddits to monitor for sentiment analysis and customer feedback.

Brand Details:
- Brand Name: ${brandName}
- Website: ${website || 'Not provided'}
- Industry Category: ${category}
- ${locationContext}

Your task: Suggest 12-15 highly relevant Reddit communities where this brand would find:
1. Direct brand mentions and discussions
2. Industry-specific conversations
3. Customer complaints and feedback
4. Competitor discussions
5. Target audience discussions

IMPORTANT GUIDELINES:
- Prioritize SPECIFIC niche subreddits over generic large ones
- Include the brand's dedicated subreddit if it likely exists (r/brandname)
- For local businesses, include city-specific subreddits
- Consider product-specific subreddits (e.g., r/espresso for coffee brands)
- Include "ask" subreddits where people seek recommendations
- Include review/complaint subreddits relevant to the industry
- Avoid overly generic subreddits unless highly relevant
- Use REAL subreddit names that actually exist on Reddit

Respond in JSON format:
{
  "suggestions": [
    {
      "subreddit": "subredditname",
      "reason": "Brief explanation of relevance (max 15 words)",
      "relevance": 0.95,
      "activity": "high",
      "subscribers": "500K+"
    }
  ]
}

Relevance scores: 0.9-1.0 = direct match, 0.7-0.89 = highly relevant, 0.5-0.69 = moderately relevant
Activity levels: high = very active daily posts, medium = regular activity, low = occasional posts
Subscriber estimates: Use format like "50K+", "500K+", "2M+"

Respond with raw JSON only. No markdown or code blocks.`;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in LLM response');
    }

    const parsed = JSON.parse(content);
    const suggestions: SubredditSuggestion[] = (parsed.suggestions || []).map((s: LLMSuggestion) => ({
      name: s.subreddit.replace(/^r\//, ''),
      relevanceScore: s.relevance,
      reason: s.reason,
      subscribers: s.subscribers,
      activityLevel: s.activity as 'high' | 'medium' | 'low'
    }));

    return suggestions.slice(0, 15);
  } catch (error) {
    console.error('LLM suggestion error:', error);
    // Fall back to basic suggestions
    return getFallbackSuggestions(brandName, category, focusLocal, city, country);
  }
}

// Fallback suggestions if LLM fails
function getFallbackSuggestions(
  brandName: string,
  category: string,
  focusLocal: boolean,
  city: string,
  country: string
): SubredditSuggestion[] {
  const suggestions: SubredditSuggestion[] = [];
  
  // Brand-specific subreddit
  const cleanBrandName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
  suggestions.push({
    name: cleanBrandName,
    relevanceScore: 0.95,
    reason: `Potential dedicated ${brandName} community`,
    subscribers: 'Unknown',
    activityLevel: 'medium'
  });

  // Category-based fallbacks
  const categoryMap: Record<string, SubredditSuggestion[]> = {
    'E-commerce': [
      { name: 'BuyItForLife', relevanceScore: 0.85, reason: 'Quality product discussions', subscribers: '1.2M+', activityLevel: 'high' },
      { name: 'Frugal', relevanceScore: 0.75, reason: 'Budget-conscious consumers', subscribers: '2M+', activityLevel: 'high' },
      { name: 'deals', relevanceScore: 0.8, reason: 'Deal hunters and reviews', subscribers: '800K+', activityLevel: 'high' },
    ],
    'Technology': [
      { name: 'technology', relevanceScore: 0.85, reason: 'Tech news and discussions', subscribers: '14M+', activityLevel: 'high' },
      { name: 'gadgets', relevanceScore: 0.85, reason: 'Consumer electronics', subscribers: '19M+', activityLevel: 'high' },
      { name: 'techsupport', relevanceScore: 0.75, reason: 'Customer support issues', subscribers: '1.5M+', activityLevel: 'high' },
    ],
    'Gaming': [
      { name: 'gaming', relevanceScore: 0.9, reason: 'General gaming community', subscribers: '35M+', activityLevel: 'high' },
      { name: 'pcgaming', relevanceScore: 0.85, reason: 'PC gaming discussions', subscribers: '3M+', activityLevel: 'high' },
      { name: 'Games', relevanceScore: 0.8, reason: 'In-depth game discussions', subscribers: '3M+', activityLevel: 'high' },
    ],
    'Fashion': [
      { name: 'malefashionadvice', relevanceScore: 0.85, reason: 'Men\'s fashion community', subscribers: '5M+', activityLevel: 'high' },
      { name: 'femalefashionadvice', relevanceScore: 0.85, reason: 'Women\'s fashion community', subscribers: '1.5M+', activityLevel: 'high' },
      { name: 'streetwear', relevanceScore: 0.8, reason: 'Street fashion trends', subscribers: '3M+', activityLevel: 'high' },
    ],
    'Health & Fitness': [
      { name: 'fitness', relevanceScore: 0.9, reason: 'Fitness community', subscribers: '10M+', activityLevel: 'high' },
      { name: 'nutrition', relevanceScore: 0.85, reason: 'Nutrition discussions', subscribers: '2.5M+', activityLevel: 'high' },
      { name: 'supplements', relevanceScore: 0.8, reason: 'Supplement reviews', subscribers: '500K+', activityLevel: 'high' },
    ],
    'Food & Beverage': [
      { name: 'food', relevanceScore: 0.9, reason: 'Food enthusiasts', subscribers: '25M+', activityLevel: 'high' },
      { name: 'Cooking', relevanceScore: 0.85, reason: 'Home cooking community', subscribers: '3M+', activityLevel: 'high' },
      { name: 'foodhacks', relevanceScore: 0.75, reason: 'Food tips and tricks', subscribers: '1M+', activityLevel: 'medium' },
    ],
    'Automotive': [
      { name: 'cars', relevanceScore: 0.9, reason: 'Car enthusiasts', subscribers: '4M+', activityLevel: 'high' },
      { name: 'Autos', relevanceScore: 0.85, reason: 'Auto discussions', subscribers: '500K+', activityLevel: 'medium' },
      { name: 'MechanicAdvice', relevanceScore: 0.8, reason: 'Car problems and solutions', subscribers: '1M+', activityLevel: 'high' },
    ],
    'Software & SaaS': [
      { name: 'SaaS', relevanceScore: 0.9, reason: 'SaaS industry discussions', subscribers: '50K+', activityLevel: 'medium' },
      { name: 'Entrepreneur', relevanceScore: 0.8, reason: 'Business software users', subscribers: '2M+', activityLevel: 'high' },
      { name: 'smallbusiness', relevanceScore: 0.8, reason: 'Small business software needs', subscribers: '1.5M+', activityLevel: 'high' },
    ],
    'Finance & Banking': [
      { name: 'personalfinance', relevanceScore: 0.9, reason: 'Personal finance discussions', subscribers: '18M+', activityLevel: 'high' },
      { name: 'CreditCards', relevanceScore: 0.85, reason: 'Credit card reviews', subscribers: '500K+', activityLevel: 'high' },
      { name: 'Banking', relevanceScore: 0.85, reason: 'Banking services', subscribers: '100K+', activityLevel: 'medium' },
    ],
    'Travel & Hospitality': [
      { name: 'travel', relevanceScore: 0.9, reason: 'Travel community', subscribers: '8M+', activityLevel: 'high' },
      { name: 'TravelHacks', relevanceScore: 0.8, reason: 'Travel tips and deals', subscribers: '500K+', activityLevel: 'high' },
      { name: 'hotels', relevanceScore: 0.85, reason: 'Hotel reviews', subscribers: '100K+', activityLevel: 'medium' },
    ],
    'Beauty & Cosmetics': [
      { name: 'SkincareAddiction', relevanceScore: 0.9, reason: 'Skincare community', subscribers: '2M+', activityLevel: 'high' },
      { name: 'MakeupAddiction', relevanceScore: 0.9, reason: 'Makeup enthusiasts', subscribers: '3M+', activityLevel: 'high' },
      { name: 'beauty', relevanceScore: 0.85, reason: 'General beauty', subscribers: '500K+', activityLevel: 'high' },
    ],
    'Home & Garden': [
      { name: 'HomeImprovement', relevanceScore: 0.9, reason: 'Home improvement projects', subscribers: '4M+', activityLevel: 'high' },
      { name: 'gardening', relevanceScore: 0.85, reason: 'Gardening community', subscribers: '5M+', activityLevel: 'high' },
      { name: 'homeowners', relevanceScore: 0.8, reason: 'Homeowner discussions', subscribers: '200K+', activityLevel: 'medium' },
    ],
    'Pet & Animal': [
      { name: 'dogs', relevanceScore: 0.9, reason: 'Dog owners community', subscribers: '8M+', activityLevel: 'high' },
      { name: 'cats', relevanceScore: 0.9, reason: 'Cat owners community', subscribers: '5M+', activityLevel: 'high' },
      { name: 'Pets', relevanceScore: 0.85, reason: 'General pet discussions', subscribers: '500K+', activityLevel: 'high' },
    ],
    'Education': [
      { name: 'college', relevanceScore: 0.85, reason: 'College students', subscribers: '1M+', activityLevel: 'high' },
      { name: 'education', relevanceScore: 0.85, reason: 'Education discussions', subscribers: '500K+', activityLevel: 'medium' },
      { name: 'learnprogramming', relevanceScore: 0.8, reason: 'Online learning', subscribers: '3M+', activityLevel: 'high' },
    ],
    'Entertainment': [
      { name: 'movies', relevanceScore: 0.9, reason: 'Movie discussions', subscribers: '30M+', activityLevel: 'high' },
      { name: 'television', relevanceScore: 0.85, reason: 'TV show discussions', subscribers: '20M+', activityLevel: 'high' },
      { name: 'Music', relevanceScore: 0.85, reason: 'Music community', subscribers: '30M+', activityLevel: 'high' },
    ],
    'Sports': [
      { name: 'sports', relevanceScore: 0.9, reason: 'General sports', subscribers: '20M+', activityLevel: 'high' },
      { name: 'nba', relevanceScore: 0.85, reason: 'Basketball fans', subscribers: '10M+', activityLevel: 'high' },
      { name: 'nfl', relevanceScore: 0.85, reason: 'Football fans', subscribers: '5M+', activityLevel: 'high' },
    ],
    'Other': [
      { name: 'reviews', relevanceScore: 0.8, reason: 'Product reviews', subscribers: '100K+', activityLevel: 'medium' },
      { name: 'Entrepreneur', relevanceScore: 0.75, reason: 'Business discussions', subscribers: '2M+', activityLevel: 'high' },
    ],
  };

  const categorySuggestions = categoryMap[category] || categoryMap['Other'];
  suggestions.push(...categorySuggestions);

  // Add city subreddits for local focus
  if (focusLocal && city) {
    const cityClean = city.toLowerCase().replace(/\s+/g, '');
    suggestions.unshift({
      name: cityClean,
      relevanceScore: 0.95,
      reason: `${city} main community`,
      subscribers: 'Varies',
      activityLevel: 'high'
    });
    suggestions.unshift({
      name: `Ask${city.replace(/\s+/g, '')}`,
      relevanceScore: 0.9,
      reason: `${city} questions and recommendations`,
      subscribers: 'Varies',
      activityLevel: 'medium'
    });
  }

  return suggestions.slice(0, 12);
}

export async function POST(request: NextRequest) {
  try {
    const { brandName, website, category, focusLocal, city, state, country } = await request.json();
    
    if (!brandName || !category) {
      return NextResponse.json(
        { error: 'Brand name and category are required' },
        { status: 400 }
      );
    }
    
    const locationInfo = focusLocal && city ? ` - ${city}, ${state || ''} ${country}` : '';
    console.log(`Generating AI subreddit suggestions for: ${brandName} (${category})${locationInfo} - ${website}`);
    
    // Use AI to generate intelligent suggestions
    const suggestions = await generateAISuggestions(
      brandName, 
      website || '', 
      category,
      focusLocal || false,
      city || '',
      state || '',
      country || ''
    );
    
    // Format the response
    const formattedSuggestions = suggestions.map(sub => ({
      name: sub.name,
      reason: sub.reason,
      subscribers: sub.subscribers,
      activityLevel: sub.activityLevel,
      relevanceScore: Math.round(sub.relevanceScore * 100) / 100
    }));
    
    return NextResponse.json({ 
      suggestions: formattedSuggestions,
      totalSuggestions: formattedSuggestions.length,
      analysisDetails: {
        brandName,
        category,
        website: website || 'Not provided',
        localFocus: focusLocal ? `${city}, ${state || ''} ${country || ''}`.trim() : 'None',
        method: 'AI-powered analysis'
      }
    });
  } catch (error) {
    console.error('Error generating subreddit suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
