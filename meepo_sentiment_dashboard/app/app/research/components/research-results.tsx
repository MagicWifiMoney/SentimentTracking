
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Play, RefreshCw, ExternalLink, TrendingDown, TrendingUp, AlertTriangle, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ResearchResultsProps {
  queryId: number;
  query: any;
  onQueryUpdated: () => void;
}

interface ResearchResult {
  id: number;
  url: string;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  score: number;
  numComments: number;
  timestamp: string;
  sentimentScore: number;
  sentimentLabel: string;
  painPointCategory: string | null;
  painPointSeverity: string | null;
  keywordsFound: string[];
  relevanceScore: number;
  businessOpportunity: string | null;
}

interface QueryWithResults {
  id: number;
  name: string;
  status: string;
  progressMessage: string | null;
  totalResults: number;
  painPointsFound: number;
  results: ResearchResult[];
}

export default function ResearchResults({ queryId, query, onQueryUpdated }: ResearchResultsProps) {
  const [queryData, setQueryData] = useState<QueryWithResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (queryId) {
      fetchQueryWithResults();
    }
  }, [queryId]);

  const fetchQueryWithResults = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/research?queryId=${queryId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch research results');
      }
      
      const data = await response.json();
      setQueryData(data.query);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: "Error",
        description: "Failed to load research results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = async () => {
    try {
      setAnalyzing(true);
      const response = await fetch('/api/research/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      toast({
        title: "Analysis Complete",
        description: `Found ${result.resultsCount} results with ${result.painPointsFound} pain points`
      });

      // Refresh the query data
      await fetchQueryWithResults();
      onQueryUpdated();
      
    } catch (error) {
      console.error('Error starting analysis:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Analysis failed",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
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

  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'negative': return <TrendingDown className="w-4 h-4" />;
      case 'positive': return <TrendingUp className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading results...
      </div>
    );
  }

  if (!queryData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Failed to load query data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Query Status */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">{queryData.name}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {query.subreddits?.length || 0} subreddit(s) • {query.keywords?.length || 0} keyword(s)
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={`${
                queryData.status === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : queryData.status === 'processing'
                  ? 'bg-blue-100 text-blue-800'
                  : queryData.status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {queryData.status}
              </Badge>
              {queryData.status === 'pending' && (
                <Button
                  onClick={startAnalysis}
                  disabled={analyzing}
                  size="sm"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Analysis
                    </>
                  )}
                </Button>
              )}
              {queryData.status === 'completed' && (
                <Button
                  onClick={() => fetchQueryWithResults()}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {queryData.progressMessage && (
          <CardContent className="pt-0">
            <p className="text-sm text-gray-600">{queryData.progressMessage}</p>
          </CardContent>
        )}
      </Card>

      {/* Results Summary */}
      {queryData.status === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Results</p>
                  <p className="text-2xl font-bold text-gray-900">{queryData.totalResults}</p>
                </div>
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pain Points</p>
                  <p className="text-2xl font-bold text-red-700">{queryData.painPointsFound}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pain Point Rate</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {queryData.totalResults > 0 ? Math.round((queryData.painPointsFound / queryData.totalResults) * 100) : 0}%
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results List */}
      {queryData.results && queryData.results.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Research Results</CardTitle>
            <p className="text-sm text-gray-600">
              Showing {queryData.results.length} results, sorted by relevance
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {queryData.results.map((result, index) => (
                <div key={result.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Badge className={getSentimentColor(result.sentimentLabel)}>
                          {getSentimentIcon(result.sentimentLabel)}
                          <span className="ml-1 capitalize">{result.sentimentLabel}</span>
                        </Badge>
                        {result.painPointCategory && (
                          <Badge variant="destructive" className="flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {result.painPointCategory}
                          </Badge>
                        )}
                        {result.painPointSeverity && (
                          <Badge className={getSeverityColor(result.painPointSeverity)}>
                            {result.painPointSeverity}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          Relevance: {Math.round(result.relevanceScore * 100)}%
                        </Badge>
                      </div>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Post
                      </a>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span className="font-medium">u/{result.author}</span>
                          <span>r/{result.subreddit}</span>
                          <span>{format(new Date(result.timestamp), 'MMM dd, yyyy')}</span>
                          <span>{result.score} points</span>
                          <span>{result.numComments} comments</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">{result.title}</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{result.content}</p>
                      </div>

                      {result.keywordsFound && result.keywordsFound.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Keywords:</span>
                          <div className="flex flex-wrap gap-1">
                            {result.keywordsFound.map((keyword) => (
                              <Badge key={keyword} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.businessOpportunity && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center mt-0.5">
                              <span className="text-white text-xs font-bold">💡</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-900">Business Opportunity</p>
                              <p className="text-sm text-green-800 mt-1">{result.businessOpportunity}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {queryData.status === 'completed' && (!queryData.results || queryData.results.length === 0) && (
        <Card className="bg-white shadow-sm">
          <CardContent className="p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-600">
              No posts were found matching your search criteria. Try adjusting your keywords or subreddit selection.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
