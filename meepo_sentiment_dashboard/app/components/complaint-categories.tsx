
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingDown, ExternalLink, Eye, Clock, User, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  count: number;
  percentage: number;
  items: any[];
}

interface CategorizedData {
  categories: Category[];
  totalNegativeComplaints: number;
  summary: {
    mostCommonIssue: string;
    totalCategories: number;
    averageIssuesPerComplaint: number;
  };
}

interface ComplaintCategoriesProps {
  brandId?: number | null;
}

export default function ComplaintCategories({ brandId }: ComplaintCategoriesProps) {
  const [data, setData] = useState<CategorizedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [subredditFilter, setSubredditFilter] = useState('all');

  useEffect(() => {
    if (brandId) {
      fetchCategories();
    }
  }, [subredditFilter, brandId]);

  const fetchCategories = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('brandId', brandId.toString());
      if (subredditFilter !== 'all') {
        params.set('subreddit', subredditFilter);
      }

      const response = await fetch(`/api/sentiment/categories?${params}`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const result = await response.json();
      setData(result);
      // Set first category as default active
      if (result.categories.length > 0) {
        setActiveCategory(result.categories[0].id);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load complaint categories",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColorClass = (color: string) => {
    // Extract just the background color for tabs
    const colorMap: { [key: string]: string } = {
      'bg-red-100': 'border-red-500 data-[state=active]:bg-red-50 data-[state=active]:text-red-700',
      'bg-orange-100': 'border-orange-500 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700',
      'bg-blue-100': 'border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700',
      'bg-purple-100': 'border-purple-500 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700',
      'bg-green-100': 'border-green-500 data-[state=active]:bg-green-50 data-[state=active]:text-green-700',
      'bg-yellow-100': 'border-yellow-500 data-[state=active]:bg-yellow-50 data-[state=active]:text-yellow-700',
      'bg-gray-100': 'border-gray-500 data-[state=active]:bg-gray-50 data-[state=active]:text-gray-700',
    };
    
    const bgColor = color.split(' ')[0];
    return colorMap[bgColor] || 'border-gray-500 data-[state=active]:bg-gray-50';
  };

  if (loading) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading complaint categories...
        </CardContent>
      </Card>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="text-center py-8 text-gray-500">
          No categorized complaints found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-700">{data.totalNegativeComplaints}</div>
            <div className="text-sm text-red-600">Total Complaints</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-700">{data.summary.totalCategories}</div>
            <div className="text-sm text-orange-600">Issue Categories</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="text-lg font-bold text-blue-700">{data.summary.mostCommonIssue}</div>
            <div className="text-sm text-blue-600">Most Common Issue</div>
          </CardContent>
        </Card>
      </div>

      {/* Categories with Tabbed Interface */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Complaint Categories Analysis
          </CardTitle>
          <p className="text-sm text-gray-600">
            Click on category tabs below to view examples sorted by most recent
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            {/* Category Tabs */}
            <div className="px-6 pt-2 pb-4 border-b bg-gray-50/50">
              <TabsList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 h-auto bg-transparent">
                {data.categories.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className={`p-3 rounded-lg border-2 border-transparent transition-all duration-200 hover:shadow-md ${getCategoryColorClass(category.color)}`}
                  >
                    <div className="flex flex-col items-center space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.icon}</span>
                        <span className="font-medium text-xs truncate max-w-[120px]">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs px-2 py-0">
                          {category.count} issues
                        </Badge>
                        <span className="text-xs font-bold">
                          {category.percentage.toFixed(1)}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="h-1 rounded-full bg-gradient-to-r from-red-400 to-red-600"
                          style={{ width: `${Math.min(category.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Category Content */}
            {data.categories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="px-6 pb-6 pt-4 mt-0">
                <div className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        {category.icon} {category.name}
                        <Badge className={category.color}>
                          {category.count} complaints
                        </Badge>
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-600">{category.percentage.toFixed(1)}%</div>
                      <div className="text-xs text-gray-500">of all complaints</div>
                    </div>
                  </div>

                  {/* Recent Examples */}
                  {category.items.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 border-b pb-2">
                        <Eye className="w-4 h-4" />
                        <span className="font-medium">Recent Examples (sorted by newest first)</span>
                      </div>
                      
                      {category.items
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .slice(0, 5)
                        .map((item, index) => (
                          <Card key={item.id} className="bg-gray-50/50 border border-gray-200 hover:shadow-sm transition-shadow">
                            <CardContent className="p-4">
                              {/* Header with user info and timestamp */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2 text-sm">
                                  <User className="w-3 h-3 text-gray-500" />
                                  <span className="font-medium text-blue-600">u/{item.author}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-purple-600 font-medium">r/{item.subreddit}</span>
                                  <span className="text-gray-400">•</span>
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{format(new Date(item.timestamp), 'MMM dd, HH:mm')}</span>
                                  </div>
                                </div>
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View Post
                                  </a>
                                )}
                              </div>

                              {/* Post title */}
                              {item.postTitle && (
                                <div className="text-sm font-semibold mb-2 text-gray-800">
                                  📝 {item.postTitle}
                                </div>
                              )}

                              {/* Content */}
                              <div className="text-sm text-gray-700 leading-relaxed mb-3">
                                {item.content.length > 250 ? 
                                  `${item.content.substring(0, 250)}...` : 
                                  item.content}
                              </div>

                              {/* Sentiment and categories */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={item.sentimentScore < -0.5 ? "destructive" : "outline"} 
                                    className="text-xs"
                                  >
                                    Sentiment: {item.sentimentScore?.toFixed(2)}
                                  </Badge>
                                  {item.categories?.slice(0, 2).map((cat: string) => (
                                    <Badge key={cat} variant="secondary" className="text-xs">
                                      {data.categories.find(c => c.id === cat)?.name || cat}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {index === 0 && '🔥 Most Recent'}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No examples found for this category
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
