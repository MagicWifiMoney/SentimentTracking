
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lightbulb, TrendingUp, ExternalLink, Users, MessageSquare, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SuggestionsInsightsProps {
  brandId?: number | null;
}

interface Suggestion {
  id: number;
  content: string;
  author: string;
  subreddit: string;
  url: string;
  timestamp: string;
  postTitle: string;
  sentimentScore: number;
  sentimentLabel: string;
  categories: string[];
  suggestionType: string;
}

interface SuggestionTheme {
  type: string;
  count: number;
  percentage: number;
  examples: Suggestion[];
}

interface SuggestionsData {
  suggestions: Suggestion[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalSuggestions: number;
    positiveVsNegativeSuggestions: {
      positive: number;
      negative: number;
      neutral: number;
    };
    topThemes: SuggestionTheme[];
  };
}

export default function SuggestionsInsights({ brandId }: SuggestionsInsightsProps) {
  const [data, setData] = useState<SuggestionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [subredditFilter, setSubredditFilter] = useState('all');

  useEffect(() => {
    if (brandId) {
      fetchSuggestions();
    }
  }, [subredditFilter, page, brandId]);

  const fetchSuggestions = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        brandId: brandId.toString(),
        page: page.toString(),
        pageSize: '10'
      });
      
      if (subredditFilter !== 'all') {
        params.set('subreddit', subredditFilter);
      }

      const response = await fetch(`/api/sentiment/suggestions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to load suggestions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label) {
      case 'negative': return 'bg-red-100 text-red-800 border-red-200';
      case 'positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'neutral': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getThemeIcon = (type: string) => {
    switch (type) {
      case 'Product Improvement': return '🔧';
      case 'Feature Request': return '⭐';
      case 'Quality Enhancement': return '💎';
      case 'Service Improvement': return '🎯';
      case 'Pricing Feedback': return '💰';
      default: return '💡';
    }
  };

  const getThemeColor = (type: string) => {
    switch (type) {
      case 'Product Improvement': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Feature Request': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Quality Enhancement': return 'bg-green-100 text-green-800 border-green-200';
      case 'Service Improvement': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Pricing Feedback': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredSuggestions = selectedTheme === 'all' 
    ? data?.suggestions || []
    : data?.suggestions.filter(s => s.suggestionType === selectedTheme) || [];

  if (loading && !data) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading suggestions...
        </CardContent>
      </Card>
    );
  }

  if (!data || data.suggestions.length === 0) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="text-center py-8 text-gray-500">
          No suggestions found in the data
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-700">{data.summary.totalSuggestions}</div>
            <div className="text-sm text-green-600">Total Suggestions</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-700">{data.summary.positiveVsNegativeSuggestions.positive}</div>
            <div className="text-sm text-blue-600">Positive Suggestions</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-700">{data.summary.topThemes.length}</div>
            <div className="text-sm text-purple-600">Suggestion Types</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="text-lg font-bold text-orange-700">
              {data.summary.topThemes[0]?.type || 'N/A'}
            </div>
            <div className="text-sm text-orange-600">Most Common Type</div>
          </CardContent>
        </Card>
      </div>

      {/* Suggestion Themes Overview */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Suggestion Themes Analysis
          </CardTitle>
          <p className="text-sm text-gray-600">
            User suggestions and recommendations categorized by type
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.summary.topThemes.map((theme) => (
              <Card key={theme.type} className="border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{getThemeIcon(theme.type)}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{theme.type}</h3>
                      <p className="text-xs text-gray-600">{theme.count} suggestions</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={getThemeColor(theme.type)}>
                        {theme.count} items
                      </Badge>
                      <span className="text-sm font-medium">
                        {theme.percentage.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600"
                        style={{ width: `${Math.min(theme.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Suggestions List */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              User Suggestions & Recommendations
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Showing {filteredSuggestions.length} of {data.suggestions.length} suggestions
            </p>
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Themes</SelectItem>
                {data.summary.topThemes.map(theme => (
                  <SelectItem key={theme.type} value={theme.type}>
                    {getThemeIcon(theme.type)} {theme.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No suggestions match the selected filters
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSuggestions.map((suggestion, index) => (
                <div key={suggestion.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-green-50' : 'bg-white'}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Badge className={getSentimentColor(suggestion.sentimentLabel)}>
                          {suggestion.sentimentLabel === 'positive' && <TrendingUp className="w-3 h-3 mr-1" />}
                          <span className="capitalize">{suggestion.sentimentLabel}</span>
                        </Badge>
                        
                        <Badge className={getThemeColor(suggestion.suggestionType)}>
                          {getThemeIcon(suggestion.suggestionType)}
                          <span className="ml-1">{suggestion.suggestionType}</span>
                        </Badge>
                        
                        <Badge variant="outline">
                          Score: {suggestion.sentimentScore?.toFixed(2)}
                        </Badge>
                      </div>
                      
                      {suggestion.url && (
                        <a
                          href={suggestion.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </a>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4 text-gray-600">
                          <span className="font-medium">u/{suggestion.author}</span>
                          <span>r/{suggestion.subreddit}</span>
                          <span>{format(new Date(suggestion.timestamp), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                      </div>

                      {suggestion.postTitle && (
                        <div className="text-sm">
                          <span className="text-gray-500">Post: </span>
                          <span className="font-medium text-gray-900">{suggestion.postTitle}</span>
                        </div>
                      )}

                      <div className="text-sm text-gray-700 bg-green-50 p-3 rounded border-l-4 border-green-400">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="italic">
                            {suggestion.content.length > 400 ? 
                              `${suggestion.content.substring(0, 400)}...` : 
                              suggestion.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-gray-500">
                Page {data.pagination.page} of {data.pagination.totalPages} 
                ({data.pagination.total} total suggestions)
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.pagination.totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
