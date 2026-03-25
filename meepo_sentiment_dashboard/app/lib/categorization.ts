
export interface ComplaintCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  color: string;
  icon: string;
}

export interface SuggestionType {
  id: string;
  name: string;
  keywords: string[];
}

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  {
    id: 'battery',
    name: 'Battery Issues',
    description: 'Battery failures, charging problems, range issues',
    keywords: ['battery', 'charge', 'charging', 'dead', 'stopped working', 'range', 'power loss', 'degradation'],
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '🔋'
  },
  {
    id: 'quality',
    name: 'Quality & Durability',
    description: 'Build quality, hardware failures, fragility issues',
    keywords: ['quality', 'broke', 'broken', 'fragile', 'cheap', 'shitshow', 'qa issues', 'build quality', 'durability'],
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '⚡'
  },
  {
    id: 'motors',
    name: 'Motor Problems',
    description: 'Hub motor failures, motor-related issues',
    keywords: ['motor', 'hub', 'magnets', 'motor broke', 'motor failure', 'torque'],
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '⚙️'
  },
  {
    id: 'customer_service',
    name: 'Customer Service',
    description: 'Support experience, communication issues',
    keywords: ['customer service', 'support', 'service', 'response', 'help', 'contact', 'trash'],
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '📞'
  },
  {
    id: 'price',
    name: 'Price & Value',
    description: 'Cost concerns, value for money',
    keywords: ['price', 'cost', 'expensive', 'cheap', 'value', 'money', 'budget'],
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '💰'
  },
  {
    id: 'shipping',
    name: 'Shipping & Delivery',
    description: 'Shipping delays, delivery issues',
    keywords: ['shipping', 'delivery', 'arrived', 'package', 'ship', 'delayed'],
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: '📦'
  },
  {
    id: 'specs',
    name: 'Product Specifications',
    description: 'Wrong specs, misleading product information',
    keywords: ['specs', 'specification', 'listed', 'advertised', 'supposed to', 'changed the listing', 'mismatch'],
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '📋'
  }
];

export const SUGGESTION_KEYWORDS = [
  'should', 'could', 'recommend', 'suggest', 'fix', 'improve', 'would be better', 
  'needs to', 'wish', 'hope', 'if only', 'upgrade', 'change', 'add', 'remove',
  'better if', 'would like', 'feature request', 'enhancement'
];

export function categorizeComplaint(content: string, postTitle: string = ''): string[] {
  const text = (content + ' ' + postTitle).toLowerCase();
  const categories: string[] = [];
  
  COMPLAINT_CATEGORIES.forEach(category => {
    const hasKeywords = category.keywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    if (hasKeywords) {
      categories.push(category.id);
    }
  });
  
  // If no specific category found, classify as 'general'
  if (categories.length === 0) {
    categories.push('general');
  }
  
  return categories;
}

export function extractSuggestions(content: string, postTitle: string = ''): boolean {
  const text = (content + ' ' + postTitle).toLowerCase();
  
  return SUGGESTION_KEYWORDS.some(keyword => 
    text.includes(keyword.toLowerCase())
  );
}

export function getCategoryByid(id: string): ComplaintCategory | undefined {
  return COMPLAINT_CATEGORIES.find(cat => cat.id === id);
}

export interface CategorizedData {
  category: string;
  count: number;
  percentage: number;
  items: any[];
}

export interface SuggestionData {
  id: number;
  content: string;
  author: string;
  subreddit: string;
  url: string;
  timestamp: string;
  postTitle: string;
  sentimentScore: number;
  categories: string[];
}
