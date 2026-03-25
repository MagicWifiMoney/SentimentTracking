
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, TrendingUp, Target, BarChart3, Lightbulb, Plus, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ResearchQueryBuilder from './research-query-builder';
import ResearchResults from './research-results';
import ResearchInsights from './research-insights';

interface ResearchQuery {
  id: number;
  name: string;
  description: string;
  subreddits: string[];
  keywords: string[];
  excludeKeywords: string[];
  dateFrom: string | null;
  dateTo: string | null;
  minScore: number | null;
  maxResults: number;
  status: string;
  progressMessage: string | null;
  totalResults: number;
  painPointsFound: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    results: number;
  };
}

export default function ResearchDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [queries, setQueries] = useState<ResearchQuery[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchQueries();
    }
  }, [status, router]);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/research');
      
      if (!response.ok) {
        throw new Error('Failed to fetch research queries');
      }
      
      const data = await response.json();
      setQueries(data.queries || []);
    } catch (error) {
      console.error('Error fetching queries:', error);
      toast({
        title: "Error",
        description: "Failed to load research queries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQueryCreated = (newQuery: ResearchQuery) => {
    setQueries(prev => [newQuery, ...prev]);
    setShowQueryBuilder(false);
    setSelectedQueryId(newQuery.id);
    setActiveTab('results');
    toast({
      title: "Success",
      description: "Research query created successfully"
    });
  };

  const handleDeleteQuery = async (queryId: number) => {
    try {
      const response = await fetch(`/api/research?queryId=${queryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete query');
      }

      setQueries(prev => prev.filter(q => q.id !== queryId));
      if (selectedQueryId === queryId) {
        setSelectedQueryId(null);
        setActiveTab('overview');
      }
      
      toast({
        title: "Success",
        description: "Research query deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting query:', error);
      toast({
        title: "Error",
        description: "Failed to delete query",
        variant: "destructive"
      });
    }
  };

  const selectedQuery = queries.find(q => q.id === selectedQueryId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading research dashboard...</span>
      </div>
    );
  }

  if (showQueryBuilder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setShowQueryBuilder(false)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Research Dashboard
            </Button>
          </div>
          <ResearchQueryBuilder
            onQueryCreated={handleQueryCreated}
            onCancel={() => setShowQueryBuilder(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Search className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Industry Sentiment Research</h1>
                <p className="text-sm text-gray-600">Discover Pain Points & Market Opportunities</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button
                onClick={() => setShowQueryBuilder(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Industry Research
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-16 bg-gray-50 rounded-lg p-2 gap-2">
            <TabsTrigger 
              value="overview" 
              className="flex flex-col items-center justify-center gap-2 h-full px-6 py-3 text-center transition-all duration-200 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-100 data-[state=active]:hover:bg-purple-700"
            >
              <Target className="w-6 h-6" />
              <div className="space-y-1">
                <div className="text-sm font-semibold">Overview</div>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="results"
              disabled={!selectedQuery}
              className="flex flex-col items-center justify-center gap-2 h-full px-6 py-3 text-center transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-100 data-[state=active]:hover:bg-blue-700 disabled:opacity-50"
            >
              <BarChart3 className="w-6 h-6" />
              <div className="space-y-1">
                <div className="text-sm font-semibold">Results</div>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="insights"
              disabled={!selectedQuery || selectedQuery.status !== 'completed'}
              className="flex flex-col items-center justify-center gap-2 h-full px-6 py-3 text-center transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-gray-100 data-[state=active]:hover:bg-green-700 disabled:opacity-50"
            >
              <Lightbulb className="w-6 h-6" />
              <div className="space-y-1">
                <div className="text-sm font-semibold">Insights</div>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Queries</CardTitle>
                  <Search className="w-5 h-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{queries.length}</div>
                  <p className="text-xs text-gray-600 mt-1">Research projects</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">
                    {queries.filter(q => q.status === 'completed').length}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Finished analyses</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Results</CardTitle>
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">
                    {queries.reduce((sum, q) => sum + (q._count?.results || 0), 0)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Posts analyzed</p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Pain Points</CardTitle>
                  <Target className="w-5 h-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700">
                    {queries.reduce((sum, q) => sum + (q.painPointsFound || 0), 0)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Issues identified</p>
                </CardContent>
              </Card>
            </div>

            {/* Research Queries List */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Research Queries</CardTitle>
              </CardHeader>
              <CardContent>
                {queries.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No research queries yet</h3>
                    <p className="text-gray-600 mb-4">
                      Start your first research to discover pain points, trends, and market opportunities across any industry
                    </p>
                    <Button onClick={() => setShowQueryBuilder(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Start Industry Research
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {queries.map((query) => (
                      <div
                        key={query.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedQueryId === query.id
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedQueryId(query.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{query.name}</h4>
                            {query.description && (
                              <p className="text-sm text-gray-600 mt-1">{query.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>{query.subreddits.length} subreddit(s)</span>
                              <span>{query.keywords.length} keyword(s)</span>
                              <span>{query._count?.results || 0} results</span>
                              {query.painPointsFound > 0 && (
                                <span className="text-red-600 font-medium">
                                  {query.painPointsFound} pain points
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              query.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : query.status === 'processing'
                                ? 'bg-blue-100 text-blue-800'
                                : query.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {query.status}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuery(query.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            {selectedQuery ? (
              <ResearchResults 
                queryId={selectedQuery.id} 
                query={selectedQuery}
                onQueryUpdated={fetchQueries}
              />
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No query selected</h3>
                <p className="text-gray-600">Select a research query from the overview tab to view results</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights">
            {selectedQuery && selectedQuery.status === 'completed' ? (
              <ResearchInsights queryId={selectedQuery.id} query={selectedQuery} />
            ) : (
              <div className="text-center py-12">
                <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedQuery ? 'Analysis not completed' : 'No query selected'}
                </h3>
                <p className="text-gray-600">
                  {selectedQuery 
                    ? 'Complete the analysis to view insights and opportunities'
                    : 'Select and complete a research query to view insights'
                  }
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
