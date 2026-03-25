
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, X, Calendar, Target, Search, Hash, Lightbulb } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ResearchQueryBuilderProps {
  onQueryCreated: (query: any) => void;
  onCancel: () => void;
}

export default function ResearchQueryBuilder({ onQueryCreated, onCancel }: ResearchQueryBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subreddits: [] as string[],
    keywords: [] as string[],
    excludeKeywords: [] as string[],
    dateFrom: '',
    dateTo: '',
    minScore: '',
    maxResults: '1000',
  });

  const [currentSubreddit, setCurrentSubreddit] = useState('');
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [currentExcludeKeyword, setCurrentExcludeKeyword] = useState('');

  const addSubreddit = () => {
    if (currentSubreddit.trim() && !formData.subreddits.includes(currentSubreddit.trim())) {
      const subreddit = currentSubreddit.trim().replace(/^r\//, ''); // Remove r/ prefix if present
      setFormData(prev => ({
        ...prev,
        subreddits: [...prev.subreddits, subreddit]
      }));
      setCurrentSubreddit('');
    }
  };

  const removeSubreddit = (subreddit: string) => {
    setFormData(prev => ({
      ...prev,
      subreddits: prev.subreddits.filter(s => s !== subreddit)
    }));
  };

  const addKeyword = () => {
    if (currentKeyword.trim() && !formData.keywords.includes(currentKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, currentKeyword.trim()]
      }));
      setCurrentKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const addExcludeKeyword = () => {
    if (currentExcludeKeyword.trim() && !formData.excludeKeywords.includes(currentExcludeKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        excludeKeywords: [...prev.excludeKeywords, currentExcludeKeyword.trim()]
      }));
      setCurrentExcludeKeyword('');
    }
  };

  const removeExcludeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      excludeKeywords: prev.excludeKeywords.filter(k => k !== keyword)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Research name is required",
        variant: "destructive"
      });
      return;
    }

    if (formData.subreddits.length === 0) {
      toast({
        title: "Error",
        description: "At least one subreddit is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        subreddits: formData.subreddits,
        keywords: formData.keywords,
        excludeKeywords: formData.excludeKeywords,
        dateFrom: formData.dateFrom || null,
        dateTo: formData.dateTo || null,
        minScore: formData.minScore ? parseInt(formData.minScore) : null,
        maxResults: parseInt(formData.maxResults),
      };

      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create research query');
      }

      const result = await response.json();
      onQueryCreated(result.query);
      
    } catch (error) {
      console.error('Error creating research query:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create research query",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="pb-6">
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
          <Target className="w-6 h-6 mr-2 text-purple-600" />
          Create Industry Research Query
        </CardTitle>
        <p className="text-gray-600">
          Define research parameters to discover pain points, trends, and opportunities in any industry or theme
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Search className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Research Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., 'SaaS Pricing Complaints', 'Remote Work Challenges', 'Fitness App Frustrations'"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Research goals: e.g., 'Find common pricing objections for SaaS', 'Identify remote work productivity issues', 'Understand mobile app UX complaints'"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Preset Templates */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Lightbulb className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Quick Start Templates</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  name: "SaaS Pricing Issues",
                  description: "Find pricing complaints in business communities",
                  subreddits: ["startups", "entrepreneur", "smallbusiness", "SaaS"],
                  keywords: ["expensive", "pricing", "cost", "overpriced", "too much"]
                },
                {
                  name: "Remote Work Pain Points", 
                  description: "Discover challenges with remote work tools & processes",
                  subreddits: ["remotework", "digitalnomad", "productivity", "WorkFromHome"],
                  keywords: ["difficult", "slow", "confusing", "inefficient", "frustrating"]
                },
                {
                  name: "Fitness App Complaints",
                  description: "Identify user experience issues with fitness apps",
                  subreddits: ["fitness", "loseit", "bodyweightfitness", "xxfitness"],
                  keywords: ["buggy", "crashes", "confusing", "hard to use", "annoying"]
                },
                {
                  name: "E-commerce Shopping Issues",
                  description: "Research online shopping frustrations & barriers",
                  subreddits: ["ecommerce", "onlineshopping", "amazon", "shopify"],
                  keywords: ["slow checkout", "confusing", "expensive shipping", "hard to find"]
                },
                {
                  name: "Crypto Trading Problems",
                  description: "Find pain points with crypto platforms & tools",
                  subreddits: ["cryptocurrency", "Bitcoin", "ethereum", "CryptoCurrency"],
                  keywords: ["high fees", "confusing", "slow", "unreliable", "scam"]
                },
                {
                  name: "Tech Support Complaints",
                  description: "Analyze customer service & support issues",
                  subreddits: ["techsupport", "CustomerService", "mildlyinfuriating"],
                  keywords: ["unhelpful", "slow response", "rude", "no solution", "terrible service"]
                }
              ].map((template, index) => (
                <Card 
                  key={index} 
                  className="cursor-pointer border hover:border-purple-300 hover:shadow-md transition-all duration-200"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      name: template.name,
                      description: template.description,
                      subreddits: template.subreddits,
                      keywords: template.keywords
                    }));
                  }}
                >
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm text-gray-900 mb-2">{template.name}</h4>
                    <p className="text-xs text-gray-600 mb-3">{template.description}</p>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {template.subreddits.slice(0, 3).map(sub => (
                          <Badge key={sub} variant="outline" className="text-xs">r/{sub}</Badge>
                        ))}
                        {template.subreddits.length > 3 && (
                          <span className="text-xs text-gray-500">+{template.subreddits.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Subreddits */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Hash className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Target Subreddits *</h3>
            </div>
            
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter subreddit name (e.g., startups, entrepreneur, productivity, fitness, investing)"
                  value={currentSubreddit}
                  onChange={(e) => setCurrentSubreddit(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubreddit())}
                />
              </div>
              <Button type="button" onClick={addSubreddit} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {formData.subreddits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.subreddits.map((subreddit) => (
                  <Badge key={subreddit} variant="secondary" className="flex items-center">
                    r/{subreddit}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer" 
                      onClick={() => removeSubreddit(subreddit)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Keywords */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Keywords & Filters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Include Keywords */}
              <div>
                <Label>Include Keywords (Optional)</Label>
                <p className="text-sm text-gray-500 mb-2">Posts must contain these terms</p>
                <div className="flex space-x-2">
                  <Input
                    placeholder="e.g., expensive, confusing, slow, buggy, difficult"
                    value={currentKeyword}
                    onChange={(e) => setCurrentKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" onClick={addKeyword} variant="outline" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.keywords.map((keyword) => (
                      <Badge key={keyword} variant="default" className="flex items-center">
                        {keyword}
                        <X 
                          className="w-3 h-3 ml-1 cursor-pointer" 
                          onClick={() => removeKeyword(keyword)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Exclude Keywords */}
              <div>
                <Label>Exclude Keywords (Optional)</Label>
                <p className="text-sm text-gray-500 mb-2">Filter out posts with these terms</p>
                <div className="flex space-x-2">
                  <Input
                    placeholder="e.g., spam, promotion"
                    value={currentExcludeKeyword}
                    onChange={(e) => setCurrentExcludeKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExcludeKeyword())}
                  />
                  <Button type="button" onClick={addExcludeKeyword} variant="outline" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.excludeKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.excludeKeywords.map((keyword) => (
                      <Badge key={keyword} variant="destructive" className="flex items-center">
                        {keyword}
                        <X 
                          className="w-3 h-3 ml-1 cursor-pointer" 
                          onClick={() => removeExcludeKeyword(keyword)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Advanced Filters */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={formData.dateFrom}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={formData.dateTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="minScore">Min Score</Label>
                <Input
                  id="minScore"
                  type="number"
                  placeholder="e.g., 10"
                  value={formData.minScore}
                  onChange={(e) => setFormData(prev => ({ ...prev, minScore: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxResults">Max Results</Label>
                <Input
                  id="maxResults"
                  type="number"
                  placeholder="1000"
                  value={formData.maxResults}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxResults: e.target.value }))}
                  className="mt-1"
                  min="10"
                  max="5000"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim() || formData.subreddits.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Create Research Query
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
