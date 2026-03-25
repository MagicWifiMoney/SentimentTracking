
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingDown, TrendingUp, Target, Lightbulb, PieChart, BarChart3, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ResearchInsightsProps {
  queryId: number;
  query: any;
}

interface PainPointAnalysis {
  categories: Record<string, number>;
  severity: Record<string, number>;
  examples: Record<string, Array<{
    content: string;
    url: string;
    subreddit: string;
    score: number;
  }>>;
  totalPainPoints: number;
}

interface SentimentTrends {
  distribution: Record<string, number>;
  averageScore: number;
  percentages: Record<string, number>;
}

interface BusinessOpportunity {
  category: string;
  opportunity: string;
  frequency: number;
  examples: Array<{
    content: string;
    subreddit: string;
  }>;
}

interface SubredditStats {
  [key: string]: {
    total: number;
    sentiment: Record<string, number>;
    painPoints: number;
    avgScore: number;
  };
}

interface TimelineData {
  date: string;
  total: number;
  negative: number;
  painPoints: number;
}

interface Insights {
  painPointAnalysis: PainPointAnalysis;
  sentimentTrends: SentimentTrends;
  topOpportunities: BusinessOpportunity[];
  subredditBreakdown: SubredditStats;
  timeline: TimelineData[];
  summary: string;
  totalResults: number;
}

export default function ResearchInsights({ queryId, query }: ResearchInsightsProps) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (queryId) {
      fetchInsights();
    }
  }, [queryId]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/research/insights?queryId=${queryId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }
      
      const data = await response.json();
      setInsights(data.insights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast({
        title: "Error",
        description: "Failed to load insights",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading insights...
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Failed to load insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
            <Lightbulb className="w-6 h-6 mr-2 text-purple-600" />
            Research Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-800 leading-relaxed">{insights.summary}</p>
        </CardContent>
      </Card>

      {/* Insights Tabs */}
      <Tabs defaultValue="painpoints" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-16 bg-gray-50 rounded-lg p-2 gap-2">
          <TabsTrigger 
            value="painpoints" 
            className="flex flex-col items-center justify-center gap-2 h-full px-4 py-2 text-center transition-all duration-200 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-100 data-[state=active]:hover:bg-red-700"
          >
            <Target className="w-5 h-5" />
            <span className="text-xs font-medium">Pain Points</span>
          </TabsTrigger>
          <TabsTrigger 
            value="sentiment"
            className="flex flex-col items-center justify-center gap-2 h-full px-4 py-2 text-center transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-100 data-[state=active]:hover:bg-blue-700"
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-medium">Sentiment</span>
          </TabsTrigger>
          <TabsTrigger 
            value="opportunities"
            className="flex flex-col items-center justify-center gap-2 h-full px-4 py-2 text-center transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-100 data-[state=active]:hover:bg-green-700"
          >
            <Lightbulb className="w-5 h-5" />
            <span className="text-xs font-medium">Opportunities</span>
          </TabsTrigger>
          <TabsTrigger 
            value="breakdown"
            className="flex flex-col items-center justify-center gap-2 h-full px-4 py-2 text-center transition-all duration-200 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-100 data-[state=active]:hover:bg-purple-700"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-medium">Breakdown</span>
          </TabsTrigger>
        </TabsList>

        {/* Pain Points Analysis */}
        <TabsContent value="painpoints" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pain Point Categories */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Target className="w-5 h-5 mr-2 text-red-600" />
                  Pain Point Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(insights.painPointAnalysis.categories)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900 capitalize">{category}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{count} mentions</span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round((count / insights.painPointAnalysis.totalPainPoints) * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Severity Distribution */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center">
                  <TrendingDown className="w-5 h-5 mr-2 text-orange-600" />
                  Severity Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(insights.painPointAnalysis.severity)
                    .sort(([a], [b]) => {
                      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                      return severityOrder[a as keyof typeof severityOrder] - severityOrder[b as keyof typeof severityOrder];
                    })
                    .map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            severity === 'critical' ? 'bg-red-600' :
                            severity === 'high' ? 'bg-orange-500' :
                            severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}></div>
                          <span className="text-sm font-medium text-gray-900 capitalize">{severity}</span>
                        </div>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pain Point Examples */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Pain Point Examples</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(insights.painPointAnalysis.examples).map(([category, examples]) => (
                  <div key={category}>
                    <h4 className="font-medium text-gray-900 mb-3 capitalize">{category} Issues</h4>
                    <div className="space-y-3">
                      {examples.map((example, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-800 mb-2">"{example.content}"</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>r/{example.subreddit}</span>
                            <span>{example.score} points</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sentiment Analysis */}
        <TabsContent value="sentiment" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center">
                  <PieChart className="w-5 h-5 mr-2 text-blue-600" />
                  Sentiment Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {insights.sentimentTrends.averageScore.toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-600">Average Sentiment Score</p>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(insights.sentimentTrends.percentages).map(([sentiment, percentage]) => (
                      <div key={sentiment} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            sentiment === 'positive' ? 'bg-green-500' :
                            sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-400'
                          }`}></div>
                          <span className="text-sm font-medium text-gray-900 capitalize">{sentiment}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {insights.sentimentTrends.distribution[sentiment]} posts
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {percentage}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                  Timeline Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.timeline.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{new Date(day.date).toLocaleDateString()}</span>
                      <div className="flex items-center space-x-3 text-xs">
                        <span className="text-gray-600">{day.total} total</span>
                        <span className="text-red-600">{day.negative} negative</span>
                        <span className="text-orange-600">{day.painPoints} pain points</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business Opportunities */}
        <TabsContent value="opportunities" className="space-y-6">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-green-600" />
                Top Business Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {insights.topOpportunities.map((opportunity, index) => (
                  <div key={opportunity.category} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <h4 className="font-semibold text-green-900 capitalize">{opportunity.category}</h4>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        {opportunity.frequency} mentions
                      </Badge>
                    </div>
                    <p className="text-green-800 mb-4 leading-relaxed">{opportunity.opportunity}</p>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-green-900">Examples:</h5>
                      {opportunity.examples.map((example, exIndex) => (
                        <div key={exIndex} className="p-2 bg-green-100 rounded text-sm">
                          <p className="text-green-800">"{example.content}"</p>
                          <p className="text-green-600 text-xs mt-1">— r/{example.subreddit}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subreddit Breakdown */}
        <TabsContent value="breakdown" className="space-y-6">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                Subreddit Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(insights.subredditBreakdown)
                  .sort(([,a], [,b]) => b.total - a.total)
                  .map(([subreddit, stats]) => (
                    <div key={subreddit} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">r/{subreddit}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{stats.total} posts</span>
                          <span>Avg: {stats.avgScore} points</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Positive:</span>
                          <span className="ml-1 font-medium text-green-600">{stats.sentiment.positive}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Negative:</span>
                          <span className="ml-1 font-medium text-red-600">{stats.sentiment.negative}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Neutral:</span>
                          <span className="ml-1 font-medium text-gray-600">{stats.sentiment.neutral}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Pain Points:</span>
                          <span className="ml-1 font-medium text-orange-600">{stats.painPoints}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
