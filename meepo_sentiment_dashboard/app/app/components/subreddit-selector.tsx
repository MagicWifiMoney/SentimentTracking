
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, TrendingUp, Users, Calendar, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Subreddit {
  name: string;
  subscribers?: number;
  description?: string;
  category?: string;
  activityLevel?: 'high' | 'medium' | 'low';
}

interface SubredditSelectorProps {
  selectedSubreddits: string[];
  onSelectionChange: (subreddits: string[]) => void;
  maxSelections: number;
  brandCategory?: string;
  autoSuggestions?: any[];
  brandName?: string;
  brandWebsite?: string;
}

// Curated subreddit suggestions based on brand category
const CATEGORY_SUGGESTIONS: Record<string, Subreddit[]> = {
  'E-commerce': [
    { name: 'BuyItForLife', subscribers: 1200000, description: 'Quality products that last', activityLevel: 'high' },
    { name: 'deals', subscribers: 800000, description: 'Best deals and discounts', activityLevel: 'high' },
    { name: 'reviews', subscribers: 450000, description: 'Product reviews and ratings', activityLevel: 'medium' },
    { name: 'shutupandtakemymoney', subscribers: 600000, description: 'Cool products to buy', activityLevel: 'medium' },
  ],
  'Gaming': [
    { name: 'gaming', subscribers: 32000000, description: 'All things gaming', activityLevel: 'high' },
    { name: 'pcmasterrace', subscribers: 5000000, description: 'PC gaming community', activityLevel: 'high' },
    { name: 'GameDeals', subscribers: 1800000, description: 'Gaming deals and discounts', activityLevel: 'high' },
    { name: 'IndieGaming', subscribers: 800000, description: 'Independent game discussion', activityLevel: 'medium' },
    { name: 'gamingsuggestions', subscribers: 300000, description: 'Game recommendations', activityLevel: 'medium' },
  ],
  'Fashion': [
    { name: 'streetwear', subscribers: 3200000, description: 'Street fashion community', activityLevel: 'high' },
    { name: 'malefashionadvice', subscribers: 4800000, description: 'Fashion advice for men', activityLevel: 'high' },
    { name: 'femalefashionadvice', subscribers: 1200000, description: 'Fashion advice for women', activityLevel: 'high' },
    { name: 'frugalmalefashion', subscribers: 1400000, description: 'Affordable mens fashion', activityLevel: 'high' },
    { name: 'womensstreetwear', subscribers: 200000, description: 'Womens street fashion', activityLevel: 'medium' },
  ],
  'Technology': [
    { name: 'technology', subscribers: 14000000, description: 'Technology news and discussion', activityLevel: 'high' },
    { name: 'gadgets', subscribers: 19000000, description: 'Latest gadgets and devices', activityLevel: 'high' },
    { name: 'startups', subscribers: 1000000, description: 'Startup community', activityLevel: 'medium' },
    { name: 'tech', subscribers: 500000, description: 'Tech discussion', activityLevel: 'medium' },
  ],
  'Health & Fitness': [
    { name: 'fitness', subscribers: 10000000, description: 'Fitness and exercise', activityLevel: 'high' },
    { name: 'loseit', subscribers: 2800000, description: 'Weight loss community', activityLevel: 'high' },
    { name: 'nutrition', subscribers: 2200000, description: 'Nutrition discussion', activityLevel: 'high' },
    { name: 'bodyweightfitness', subscribers: 2100000, description: 'Bodyweight exercises', activityLevel: 'high' },
  ]
};

// Popular general subreddits for any brand
const GENERAL_SUGGESTIONS: Subreddit[] = [
  { name: 'AskReddit', subscribers: 40000000, description: 'Ask the Reddit community', activityLevel: 'high' },
  { name: 'YouShouldKnow', subscribers: 4800000, description: 'Life tips and knowledge', activityLevel: 'high' },
  { name: 'LifeProTips', subscribers: 22000000, description: 'Life improvement tips', activityLevel: 'high' },
  { name: 'explainlikeimfive', subscribers: 20000000, description: 'Simple explanations', activityLevel: 'high' },
  { name: 'mildlyinteresting', subscribers: 22000000, description: 'Mildly interesting content', activityLevel: 'high' },
];

export default function SubredditSelector({ 
  selectedSubreddits, 
  onSelectionChange, 
  maxSelections, 
  brandCategory = 'E-commerce',
  autoSuggestions = [],
  brandName = '',
  brandWebsite = ''
}: SubredditSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customSubreddit, setCustomSubreddit] = useState('');

  // Prioritize auto-generated suggestions if available
  const suggestions = autoSuggestions.length > 0 
    ? autoSuggestions.filter(sub => 
        !selectedSubreddits.includes(sub.name) &&
        sub.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10)
    : [
        ...(CATEGORY_SUGGESTIONS[brandCategory] || CATEGORY_SUGGESTIONS['E-commerce']),
        ...GENERAL_SUGGESTIONS
      ].filter(sub => 
        !selectedSubreddits.includes(sub.name) &&
        sub.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8);

  const handleSelectSubreddit = (subredditName: string) => {
    if (selectedSubreddits.length >= maxSelections) {
      toast({
        title: "Selection limit reached",
        description: `You can only select up to ${maxSelections} subreddits for your current plan.`,
        variant: "destructive"
      });
      return;
    }

    if (!selectedSubreddits.includes(subredditName)) {
      onSelectionChange([...selectedSubreddits, subredditName]);
    }
  };

  const handleRemoveSubreddit = (subredditName: string) => {
    onSelectionChange(selectedSubreddits.filter(name => name !== subredditName));
  };

  const handleAddCustom = () => {
    const cleanName = customSubreddit.replace(/^r\//, '').trim();
    if (cleanName && !selectedSubreddits.includes(cleanName)) {
      handleSelectSubreddit(cleanName);
      setCustomSubreddit('');
    }
  };

  const getActivityIcon = (level?: string) => {
    switch (level) {
      case 'high': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'medium': return <Users className="w-3 h-3 text-yellow-500" />;
      case 'low': return <Calendar className="w-3 h-3 text-gray-500" />;
      default: return null;
    }
  };

  const formatSubscriberCount = (count?: number) => {
    if (!count) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <div className="space-y-6">
      {/* Selected Subreddits */}
      {selectedSubreddits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Selected Subreddits
              <Badge variant="outline">{selectedSubreddits.length}/{maxSelections}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedSubreddits.map((name) => (
                <Badge key={name} variant="secondary" className="flex items-center gap-2">
                  r/{name}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => handleRemoveSubreddit(name)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Add Custom */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Find Subreddits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search suggested subreddits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Add Custom Subreddit */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                r/
              </span>
              <Input
                placeholder="Enter custom subreddit name"
                value={customSubreddit}
                onChange={(e) => setCustomSubreddit(e.target.value)}
                className="pl-8"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
              />
            </div>
            <Button 
              onClick={handleAddCustom}
              disabled={!customSubreddit.trim() || selectedSubreddits.length >= maxSelections}
              size="default"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {autoSuggestions.length > 0 ? (
              <>
                <Sparkles className="w-5 h-5 text-blue-500" />
                Personalized for {brandName}
              </>
            ) : (
              <>
                Suggested for {brandCategory} brands
              </>
            )}
          </CardTitle>
          {autoSuggestions.length > 0 && (
            <p className="text-sm text-gray-600">
              AI-generated suggestions based on your brand name, website, and category
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {suggestions.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                No suggestions found. Try adjusting your search or add custom subreddits.
              </p>
            ) : (
              suggestions.map((sub) => (
                <div 
                  key={sub.name}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectSubreddit(sub.name)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">r/{sub.name}</span>
                      {getActivityIcon(sub.activityLevel)}
                      {sub.subscribers && (
                        <Badge variant="outline" className="text-xs">
                          {formatSubscriberCount(sub.subscribers)}
                        </Badge>
                      )}
                      {autoSuggestions.length > 0 && sub.relevanceScore && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(sub.relevanceScore * 100)}% match
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {autoSuggestions.length > 0 ? sub.reason || sub.description : sub.description}
                    </p>
                  </div>
                  <Plus className="w-5 h-5 text-gray-400" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
