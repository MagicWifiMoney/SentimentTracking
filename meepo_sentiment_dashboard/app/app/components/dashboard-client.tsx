
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, Download, TrendingDown, TrendingUp, MessageCircle, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, RefreshCw, BarChart3, Lightbulb, Plus, Target, Tag, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import SentimentCharts from './sentiment-charts';
import ComplaintCategories from '@/components/complaint-categories';
import SuggestionsInsights from '@/components/suggestions-insights';
import BrandSwitcher from './brand-switcher';
import KeywordManager from './keyword-manager';

interface SentimentData {
  id: number;
  url: string;
  timestamp: string;
  content: string;
  author: string;
  subreddit: string;
  postTitle: string;
  sentimentScore: number;
  sentimentLabel: string;
  isNegativeAboutBrand: boolean;
  matchedKeywords: string[];
  postType: string;
  upvotes: number;
  numComments: number;
}

interface OverviewStats {
  totalMentions: number;
  negative: number;
  positive: number;
  neutral: number;
  negativeAboutBrand: number;
  negativePercentage: number;
  positivePercentage: number;
  neutralPercentage: number;
}

interface FilterOptions {
  subreddits: string[];
  sentimentLabels: string[];
  dateRange: {
    min: string;
    max: string;
  };
  scoreRange: {
    min: number;
    max: number;
  };
}

interface Brand {
  id: number;
  name: string;
  category: string;
  subscriptionTier: string;
  isActive: boolean;
}

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<SentimentData[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<{
    canRefresh: boolean;
    remainingDaily: number;
    remainingWeekly: number;
  } | null>(null);
  
  // Brand management state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentBrandId, setCurrentBrandId] = useState<number | null>(null);
  const [brandsLoading, setBrandsLoading] = useState(true);
  
  // Filter states
  const [sentiment, setSentiment] = useState('all');
  const [subreddit, setSubreddit] = useState('all');
  const [search, setSearch] = useState('');
  const [negativeOnly, setNegativeOnly] = useState(false);
  const [keyword, setKeyword] = useState('all');
  const [brandKeywords, setBrandKeywords] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [scanTimeRange, setScanTimeRange] = useState('month');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Tab state
  const [activeTab, setActiveTab] = useState('sentiment');

  // Authentication and brand loading
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchBrands();
    }
  }, [status, router]);

  // Fetch data when brand changes
  useEffect(() => {
    if (currentBrandId && !loading) {
      Promise.all([
        fetchStats(),
        fetchFilterOptions(),
        fetchBrandKeywords(),
        fetchData(),
        fetchRefreshStatus()
      ]);
    }
  }, [currentBrandId]);

  // Refetch data when filters change
  useEffect(() => {
    if (!loading) {
      setPage(1);
      fetchData();
    }
  }, [sentiment, subreddit, search, negativeOnly, keyword]);

  // Refetch data when page changes
  useEffect(() => {
    if (!loading && page > 1) {
      fetchData();
    }
  }, [page]);

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      const response = await fetch('/api/brands');
      
      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }
      
      const result = await response.json();
      const activeBrands = result.brands.filter((b: Brand) => b.isActive);
      
      setBrands(activeBrands);
      
      if (activeBrands.length === 0) {
        // No brands found, redirect to onboarding
        router.push('/onboarding');
        return;
      }
      
      // Set first brand as current if none selected
      if (!currentBrandId && activeBrands.length > 0) {
        setCurrentBrandId(activeBrands[0].id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error",
        description: "Failed to load brands. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBrandsLoading(false);
    }
  };

  const handleBrandChange = (brandId: number) => {
    setCurrentBrandId(brandId);
    // Reset filters when switching brands
    setSentiment('all');
    setSubreddit('all');
    setSearch('');
    setNegativeOnly(false);
    setKeyword('all');
    setPage(1);
  };

  const handleCreateBrand = () => {
    router.push('/onboarding');
  };

  const fetchStats = async () => {
    if (!currentBrandId) return;
    try {
      const response = await fetch(`/api/sentiment/stats?brandId=${currentBrandId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const result = await response.json();
      setStats(result.overview);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive"
      });
    }
  };

  const fetchFilterOptions = async () => {
    if (!currentBrandId) return;
    try {
      const response = await fetch(`/api/sentiment/filters?brandId=${currentBrandId}`);
      if (!response.ok) throw new Error('Failed to fetch filter options');
      const result = await response.json();
      setFilterOptions(result);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchBrandKeywords = async () => {
    if (!currentBrandId) return;
    try {
      const response = await fetch(`/api/brands/${currentBrandId}/keywords`);
      if (!response.ok) throw new Error('Failed to fetch keywords');
      const result = await response.json();
      const activeKeywords = result.keywords
        .filter((k: any) => k.isActive && k.type === 'track')
        .map((k: any) => k.keyword);
      setBrandKeywords(activeKeywords);
    } catch (error) {
      console.error('Error fetching keywords:', error);
    }
  };

  const fetchData = async () => {
    if (!currentBrandId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        brandId: currentBrandId.toString(),
        page: page.toString(),
        pageSize: pageSize.toString()
      });
      
      if (sentiment !== 'all') params.set('sentiment', sentiment);
      if (subreddit !== 'all') params.set('subreddit', subreddit);
      if (search) params.set('search', search);
      if (negativeOnly) params.set('negativeOnly', 'true');
      if (keyword !== 'all') params.set('keyword', keyword);
      
      const response = await fetch(`/api/sentiment?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      setData(result.data || []);
      setTotalPages(result.pagination?.totalPages || 0);
      setTotalCount(result.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load sentiment data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    if (!currentBrandId) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({
        brandId: currentBrandId.toString()
      });
      if (sentiment !== 'all') params.set('sentiment', sentiment);
      if (subreddit !== 'all') params.set('subreddit', subreddit);
      if (search) params.set('search', search);
      if (negativeOnly) params.set('negativeOnly', 'true');
      
      const response = await fetch(`/api/sentiment/export?${params}`);
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const currentBrand = brands.find(b => b.id === currentBrandId);
      a.download = `${currentBrand?.name || 'brand'}_sentiment_data_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Data exported successfully"
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error", 
        description: "Failed to export data",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const fetchRefreshStatus = async () => {
    if (!currentBrandId) return;
    try {
      const response = await fetch(`/api/sentiment/refresh?brandId=${currentBrandId}`);
      if (response.ok) {
        const data = await response.json();
        setRefreshStatus(data);
      }
    } catch (error) {
      console.error('Error fetching refresh status:', error);
    }
  };

  const refreshData = async () => {
    if (!refreshStatus?.canRefresh || !currentBrandId) return;
    
    setRefreshing(true);
    try {
      const response = await fetch('/api/sentiment/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId: currentBrandId, timeRange: scanTimeRange })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: result.message
        });
        
        // Refresh all data after successful extraction
        await Promise.all([
          fetchStats(),
          fetchFilterOptions(),
          fetchData(),
          fetchRefreshStatus()
        ]);
      } else {
        toast({
          title: "Refresh Limited",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
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

  if (brandsLoading || (loading && !stats)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
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
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reddit Brand Monitor</h1>
                <p className="text-sm text-gray-600">Multi-Brand Sentiment Dashboard</p>
              </div>
              {brands.length > 0 && (
                <div className="ml-8">
                  <BrandSwitcher
                    brands={brands}
                    currentBrandId={currentBrandId}
                    onBrandChange={handleBrandChange}
                    onCreateNew={handleCreateBrand}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => router.push('/research')}
                variant="outline"
                size="sm"
                className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
              >
                <Target className="w-4 h-4 mr-2" />
                Research Dashboard
              </Button>
              <div className="flex items-center border rounded-md overflow-hidden">
                <Select value={scanTimeRange} onValueChange={setScanTimeRange}>
                  <SelectTrigger className="border-0 h-9 w-[130px] text-xs focus:ring-0 focus:ring-offset-0">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Past 24 hours</SelectItem>
                    <SelectItem value="week">Past week</SelectItem>
                    <SelectItem value="month">Past month</SelectItem>
                    <SelectItem value="3month">Past 3 months</SelectItem>
                    <SelectItem value="6month">Past 6 months</SelectItem>
                    <SelectItem value="year">Past year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={refreshData}
                  disabled={refreshing || !refreshStatus?.canRefresh}
                  variant={refreshStatus?.canRefresh ? "default" : "outline"}
                  size="sm"
                  className="rounded-l-none border-l"
                >
                  {refreshing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Scan Reddit
                    </>
                  )}
                </Button>
              </div>
              <Button
                onClick={exportData}
                disabled={exporting}
                variant="outline"
                size="sm"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Rate Limit Status */}
        {refreshStatus && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between text-sm text-blue-800">
              <span>Data Refresh Limits:</span>
              <div className="flex space-x-4">
                <span>Today: {refreshStatus.remainingDaily}/10</span>
                <span>This Week: {refreshStatus.remainingWeekly}/50</span>
              </div>
            </div>
          </div>
        )}
        {/* Overview Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Mentions</CardTitle>
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stats.totalMentions?.toLocaleString() || 0}</div>
                <p className="text-xs text-gray-600 mt-1">Across all subreddits</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Negative Sentiment</CardTitle>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{stats.negative?.toLocaleString() || 0}</div>
                <p className="text-xs text-gray-600 mt-1">{stats.negativePercentage?.toFixed(1) || 0}% of total</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Positive Sentiment</CardTitle>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{stats.positive?.toLocaleString() || 0}</div>
                <p className="text-xs text-gray-600 mt-1">{stats.positivePercentage?.toFixed(1) || 0}% of total</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Critical Issues</CardTitle>
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">{stats.negativeAboutBrand?.toLocaleString() || 0}</div>
                <p className="text-xs text-gray-600 mt-1">Negative about brand</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State Banner - Show when no data */}
        {stats && stats.totalMentions === 0 && (
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Welcome! Let&apos;s collect your first data</h3>
                    <p className="text-gray-600">
                      Select a time range above and click &quot;Scan Reddit&quot; to search for brand mentions. Try &quot;Past year&quot; or &quot;All time&quot; for a broader scan.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={scanTimeRange} onValueChange={setScanTimeRange}>
                    <SelectTrigger className="h-10 w-[140px]">
                      <Clock className="w-4 h-4 mr-1.5 text-gray-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Past 24 hours</SelectItem>
                      <SelectItem value="week">Past week</SelectItem>
                      <SelectItem value="month">Past month</SelectItem>
                      <SelectItem value="3month">Past 3 months</SelectItem>
                      <SelectItem value="6month">Past 6 months</SelectItem>
                      <SelectItem value="year">Past year</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={refreshData}
                    disabled={refreshing || !refreshStatus?.canRefresh}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  >
                    {refreshing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Scan Reddit
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Section */}
        <SentimentCharts brandId={currentBrandId} />

        {/* Analytics Tabs */}
        <div className="bg-white rounded-xl shadow-sm border mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Analytics</h2>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 h-auto bg-gray-50 rounded-lg p-1.5 gap-1">
                <TabsTrigger 
                  value="sentiment" 
                  className="flex flex-col items-center justify-center gap-2 px-4 py-3 text-center transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-blue-700"
                  onClick={() => setActiveTab('sentiment')}
                >
                  <MessageCircle className="w-5 h-5" />
                  <div>
                    <div className="text-sm font-semibold">Sentiment Data</div>
                    <div className="text-xs opacity-75 mt-0.5">Raw data & filtering</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="keywords" 
                  className="flex flex-col items-center justify-center gap-2 px-4 py-3 text-center transition-all duration-200 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-purple-700"
                  onClick={() => setActiveTab('keywords')}
                >
                  <Tag className="w-5 h-5" />
                  <div>
                    <div className="text-sm font-semibold">Keywords</div>
                    <div className="text-xs opacity-75 mt-0.5">Track & exclude terms</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="categories" 
                  className="flex flex-col items-center justify-center gap-2 px-4 py-3 text-center transition-all duration-200 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-red-700"
                  onClick={() => setActiveTab('categories')}
                >
                  <BarChart3 className="w-5 h-5" />
                  <div>
                    <div className="text-sm font-semibold">Issue Categories</div>
                    <div className="text-xs opacity-75 mt-0.5">Problem classification</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="suggestions" 
                  className="flex flex-col items-center justify-center gap-2 px-4 py-3 text-center transition-all duration-200 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-gray-100 data-[state=active]:hover:bg-green-700"
                  onClick={() => setActiveTab('suggestions')}
                >
                  <Lightbulb className="w-5 h-5" />
                  <div>
                    <div className="text-sm font-semibold">Suggestions</div>
                    <div className="text-xs opacity-75 mt-0.5">Improvement insights</div>
                  </div>
                </TabsTrigger>
              </TabsList>

          <TabsContent value="sentiment" className="space-y-6 mt-6">
            {/* Filters */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Filters & Search</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Search Content</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search posts, comments..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Sentiment</label>
                    <Select value={sentiment} onValueChange={setSentiment}>
                      <SelectTrigger>
                        <SelectValue placeholder="All sentiment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sentiment</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Subreddit</label>
                    <Select value={subreddit} onValueChange={setSubreddit}>
                      <SelectTrigger>
                        <SelectValue placeholder="All subreddits" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subreddits</SelectItem>
                        {filterOptions?.subreddits?.map((sub) => (
                          <SelectItem key={sub} value={sub}>r/{sub}</SelectItem>
                        )) || []}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Keyword</label>
                    <Select value={keyword} onValueChange={setKeyword}>
                      <SelectTrigger>
                        <SelectValue placeholder="All keywords" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Keywords</SelectItem>
                        {brandKeywords.map((kw) => (
                          <SelectItem key={kw} value={kw}>{kw}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Focus</label>
                    <Button
                      variant={negativeOnly ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNegativeOnly(!negativeOnly)}
                      className="w-full"
                    >
                      {negativeOnly ? "Showing Critical Issues" : "Show All"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Table */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold">Sentiment Data</CardTitle>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Showing {data?.length || 0} of {totalCount?.toLocaleString() || 0} results
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0 pt-3">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Loading data...
                  </div>
                ) : data?.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    {stats?.totalMentions === 0 ? (
                      <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <RefreshCw className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Yet</h3>
                        <p className="text-gray-600 mb-6">
                          Click the &quot;Refresh Data&quot; button above to fetch Reddit mentions for your brand. 
                          We&apos;ll search your tracked subreddits for posts mentioning your brand and keywords.
                        </p>
                        <Button
                          onClick={refreshData}
                          disabled={refreshing || !refreshStatus?.canRefresh}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {refreshing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Collecting Data...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Collect Data Now
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        No data found matching your filters. Try adjusting your search criteria.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {data?.map((item, index) => (
                      <div key={item.id} className={`transition-colors ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'} hover:bg-blue-50/30`}>
                        <div className="p-3.5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                              <Badge className={getSentimentColor(item.sentimentLabel || '')}>
                                {getSentimentIcon(item.sentimentLabel || '')}
                                <span className="ml-1 capitalize">{item.sentimentLabel || 'unknown'}</span>
                              </Badge>
                              {item.isNegativeAboutBrand && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Critical
                                </Badge>
                              )}
                              <Badge variant="outline">
                                Score: {item.sentimentScore?.toFixed(2) || '0.00'}
                              </Badge>
                              {item.matchedKeywords && item.matchedKeywords.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Tag className="w-3 h-3 text-purple-600" />
                                  {item.matchedKeywords.slice(0, 3).map((keyword, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                      {keyword}
                                    </Badge>
                                  ))}
                                  {item.matchedKeywords.length > 3 && (
                                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                      +{item.matchedKeywords.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(item.id)}
                            >
                              {expandedItems.has(item.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-4 text-gray-600">
                                <span className="font-medium">u/{item.author || 'unknown'}</span>
                                <span>r/{item.subreddit || 'unknown'}</span>
                                <Badge variant="outline" className="text-xs capitalize">{item.postType || 'post'}</Badge>
                                <span className="flex items-center gap-0.5" title="Upvotes">▲ {item.upvotes ?? 0}</span>
                                <span className="flex items-center gap-0.5" title="Comments"><MessageCircle className="w-3 h-3" /> {item.numComments ?? 0}</span>
                                <span>{item.timestamp ? format(new Date(item.timestamp), 'MMM dd, yyyy HH:mm') : 'No date'}</span>
                              </div>
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  View
                                </a>
                              )}
                            </div>

                            {item.postTitle && (
                              <div className="text-sm">
                                <span className="text-gray-500">Post: </span>
                                <span className="font-medium text-gray-900">{item.postTitle}</span>
                              </div>
                            )}

                            <div className="text-sm text-gray-700">
                              {expandedItems.has(item.id) ? (
                                <p>{item.content || 'No content'}</p>
                              ) : (
                                <p>
                                  {item.content ? 
                                    (item.content.length > 200 ? 
                                      `${item.content.substring(0, 200)}...` : 
                                      item.content
                                    ) : 'No content'
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )) || []}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-gray-500">
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords" className="mt-6">
            <KeywordManager 
              brandId={currentBrandId!} 
              onKeywordsChange={() => {
                // Refetch keywords and data when keywords change
                fetchBrandKeywords();
                fetchData();
              }}
            />
          </TabsContent>

          <TabsContent value="categories">
            <ComplaintCategories brandId={currentBrandId} />
          </TabsContent>

          <TabsContent value="suggestions">
            <SuggestionsInsights brandId={currentBrandId} />
          </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
