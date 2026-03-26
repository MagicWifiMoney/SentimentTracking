
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Download, TrendingDown, TrendingUp, MessageCircle, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, RefreshCw, BarChart3, Lightbulb, Target, Tag, Clock, Activity, Zap, Shield, Eye, FileDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
  intentType?: string;
  intentScore?: number;
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
  dateRange: { min: string; max: string };
  scoreRange: { min: number; max: number };
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

  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentBrandId, setCurrentBrandId] = useState<number | null>(null);
  const [brandsLoading, setBrandsLoading] = useState(true);

  const [sentiment, setSentiment] = useState('all');
  const [subreddit, setSubreddit] = useState('all');
  const [search, setSearch] = useState('');
  const [negativeOnly, setNegativeOnly] = useState(false);
  const [keyword, setKeyword] = useState('all');
  const [brandKeywords, setBrandKeywords] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [scanTimeRange, setScanTimeRange] = useState('month');

  const [draftingId, setDraftingId] = useState<number | null>(null);
  const [draftResponses, setDraftResponses] = useState<{ [key: number]: any }>({});
  const [draftLoading, setDraftLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const [activeTab, setActiveTab] = useState('sentiment');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/auth/signin'); return; }
    if (status === 'authenticated') { fetchBrands(); }
  }, [status, router]);

  useEffect(() => {
    if (currentBrandId && !loading) {
      Promise.all([fetchStats(), fetchFilterOptions(), fetchBrandKeywords(), fetchData(), fetchRefreshStatus()]);
    }
  }, [currentBrandId]);

  useEffect(() => {
    if (!loading) { setPage(1); fetchData(); }
  }, [sentiment, subreddit, search, negativeOnly, keyword]);

  useEffect(() => {
    if (!loading && page > 1) { fetchData(); }
  }, [page]);

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      const response = await fetch('/api/brands');
      if (!response.ok) throw new Error('Failed to fetch brands');
      const result = await response.json();
      const activeBrands = result.brands.filter((b: Brand) => b.isActive);
      setBrands(activeBrands);
      if (activeBrands.length === 0) { router.push('/onboarding'); return; }
      if (!currentBrandId && activeBrands.length > 0) { setCurrentBrandId(activeBrands[0].id); }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({ title: "Error", description: "Failed to load brands.", variant: "destructive" });
    } finally { setBrandsLoading(false); }
  };

  const handleBrandChange = (brandId: number) => {
    setCurrentBrandId(brandId);
    setSentiment('all'); setSubreddit('all'); setSearch(''); setNegativeOnly(false); setKeyword('all'); setPage(1);
  };

  const fetchStats = async () => {
    if (!currentBrandId) return;
    try {
      const response = await fetch(`/api/sentiment/stats?brandId=${currentBrandId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const result = await response.json();
      setStats(result.overview);
    } catch (error) { console.error('Error fetching stats:', error); }
  };

  const fetchFilterOptions = async () => {
    if (!currentBrandId) return;
    try {
      const response = await fetch(`/api/sentiment/filters?brandId=${currentBrandId}`);
      if (!response.ok) throw new Error('Failed');
      setFilterOptions(await response.json());
    } catch (error) { console.error('Error fetching filter options:', error); }
  };

  const fetchBrandKeywords = async () => {
    if (!currentBrandId) return;
    try {
      const response = await fetch(`/api/brands/${currentBrandId}/keywords`);
      if (!response.ok) throw new Error('Failed');
      const result = await response.json();
      setBrandKeywords(result.keywords.filter((k: any) => k.isActive && k.type === 'track').map((k: any) => k.keyword));
    } catch (error) { console.error('Error fetching keywords:', error); }
  };

  const fetchData = async () => {
    if (!currentBrandId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ brandId: currentBrandId.toString(), page: page.toString(), pageSize: pageSize.toString() });
      if (sentiment !== 'all') params.set('sentiment', sentiment);
      if (subreddit !== 'all') params.set('subreddit', subreddit);
      if (search) params.set('search', search);
      if (negativeOnly) params.set('negativeOnly', 'true');
      if (keyword !== 'all') params.set('keyword', keyword);
      const response = await fetch(`/api/sentiment?${params}`);
      if (!response.ok) throw new Error('Failed');
      const result = await response.json();
      setData(result.data || []);
      setTotalPages(result.pagination?.totalPages || 0);
      setTotalCount(result.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error", description: "Failed to load sentiment data", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const exportData = async (type: 'sentiment' | 'categories' | 'suggestions' | 'all' = 'sentiment') => {
    if (!currentBrandId) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ brandId: currentBrandId.toString(), type });
      if (sentiment !== 'all') params.set('sentiment', sentiment);
      if (subreddit !== 'all') params.set('subreddit', subreddit);
      if (search) params.set('search', search);
      if (negativeOnly) params.set('negativeOnly', 'true');
      const response = await fetch(`/api/sentiment/export?${params}`);
      if (!response.ok) throw new Error('Failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ''; // Let Content-Disposition handle filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      const labels = { sentiment: 'Sentiment data', categories: 'Issue categories', suggestions: 'Suggestions', all: 'Full report' };
      toast({ title: "Exported", description: `${labels[type]} downloaded` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export data", variant: "destructive" });
    } finally { setExporting(false); }
  };

  const fetchRefreshStatus = async () => {
    if (!currentBrandId) return;
    try {
      const response = await fetch(`/api/sentiment/refresh?brandId=${currentBrandId}`);
      if (response.ok) setRefreshStatus(await response.json());
    } catch (error) { console.error('Error fetching refresh status:', error); }
  };

  const refreshData = async () => {
    if (!refreshStatus?.canRefresh || !currentBrandId) return;
    setRefreshing(true);
    try {
      const response = await fetch('/api/sentiment/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: currentBrandId, timeRange: scanTimeRange })
      });
      const result = await response.json();
      if (response.ok) {
        toast({ title: "Scan Complete", description: result.message });
        await Promise.all([fetchStats(), fetchFilterOptions(), fetchData(), fetchRefreshStatus()]);
      } else {
        toast({ title: "Rate Limited", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Scan failed. Try again later.", variant: "destructive" });
    } finally { setRefreshing(false); }
  };

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) newExpanded.delete(id); else newExpanded.add(id);
    setExpandedItems(newExpanded);
  };

  const draftResponse = async (itemId: number) => {
    setDraftLoading(true); setDraftingId(itemId);
    try {
      const response = await fetch('/api/sentiment/draft-response', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentimentId: itemId, tone: 'professional' }),
      });
      if (!response.ok) throw new Error('Failed');
      const result = await response.json();
      setDraftResponses(prev => ({ ...prev, [itemId]: result }));
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate response draft', variant: 'destructive' });
    } finally { setDraftLoading(false); setDraftingId(null); }
  };

  const getSentimentStyle = (label: string) => {
    switch (label) {
      case 'negative': return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'positive': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'neutral': return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
      default: return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
    }
  };

  const getIntentStyle = (intentType: string) => {
    switch (intentType) {
      case 'purchase': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'complaint': return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'comparison': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'question': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'praise': return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
      default: return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'negative': return <TrendingDown className="w-3.5 h-3.5" />;
      case 'positive': return <TrendingUp className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

  if (brandsLoading || (loading && !stats)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background noise-bg">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <Shield className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground font-mono tracking-wide">INITIALIZING SENTINEL</p>
      </div>
    );
  }

  const currentBrand = brands.find(b => b.id === currentBrandId);

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold tracking-tight text-foreground">SENTINEL</h1>
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest">BRAND INTELLIGENCE</p>
                </div>
              </div>
              <div className="h-6 w-px bg-border/60" />
              {brands.length > 0 && (
                <BrandSwitcher
                  brands={brands}
                  currentBrandId={currentBrandId}
                  onBrandChange={handleBrandChange}
                  onCreateNew={() => router.push('/onboarding')}
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push('/research')}
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Research
              </Button>
              <div className="h-4 w-px bg-border/60" />
              <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
                <Select value={scanTimeRange} onValueChange={setScanTimeRange}>
                  <SelectTrigger className="border-0 h-7 w-[110px] text-xs bg-transparent focus:ring-0 focus:ring-offset-0 text-muted-foreground">
                    <Clock className="w-3 h-3 mr-1 opacity-50" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">24 hours</SelectItem>
                    <SelectItem value="week">7 days</SelectItem>
                    <SelectItem value="month">30 days</SelectItem>
                    <SelectItem value="3month">3 months</SelectItem>
                    <SelectItem value="6month">6 months</SelectItem>
                    <SelectItem value="year">1 year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={refreshData}
                  disabled={refreshing || !refreshStatus?.canRefresh}
                  size="sm"
                  className="h-7 text-xs bg-primary/10 text-primary hover:bg-primary/20 border-0 rounded-md"
                >
                  {refreshing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Scan
                    </>
                  )}
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" disabled={exporting}>
                    {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5 mr-1" />Export</>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => exportData('sentiment')} className="text-xs">
                    <MessageCircle className="w-3.5 h-3.5 mr-2" />
                    Sentiment Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData('categories')} className="text-xs">
                    <BarChart3 className="w-3.5 h-3.5 mr-2" />
                    Issue Categories
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData('suggestions')} className="text-xs">
                    <Lightbulb className="w-3.5 h-3.5 mr-2" />
                    Suggestions & Insights
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => exportData('all')} className="text-xs font-medium">
                    <FileDown className="w-3.5 h-3.5 mr-2" />
                    Full Report (All)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6 fade-in">
        {/* Rate Limit Bar */}
        {refreshStatus && (
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              AUTO-SCAN ACTIVE
            </span>
            <div className="flex gap-4">
              <span>DAILY {refreshStatus.remainingDaily}/10</span>
              <span>WEEKLY {refreshStatus.remainingWeekly}/50</span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 slide-up">
            <div className="stat-card glow-blue">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-muted-foreground tracking-wider">MENTIONS</span>
                <MessageCircle className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-foreground tracking-tight font-mono">
                {stats.totalMentions?.toLocaleString() || '0'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">across all subreddits</div>
            </div>

            <div className="stat-card glow-red">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-muted-foreground tracking-wider">NEGATIVE</span>
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-3xl font-bold text-red-400 tracking-tight font-mono">
                {stats.negative?.toLocaleString() || '0'}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-red-500/60 rounded-full transition-all duration-700" style={{ width: `${stats.negativePercentage || 0}%` }} />
                </div>
                <span className="text-xs font-mono text-red-400">{stats.negativePercentage?.toFixed(1) || 0}%</span>
              </div>
            </div>

            <div className="stat-card glow-green">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-muted-foreground tracking-wider">POSITIVE</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-emerald-400 tracking-tight font-mono">
                {stats.positive?.toLocaleString() || '0'}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-emerald-500/60 rounded-full transition-all duration-700" style={{ width: `${stats.positivePercentage || 0}%` }} />
                </div>
                <span className="text-xs font-mono text-emerald-400">{stats.positivePercentage?.toFixed(1) || 0}%</span>
              </div>
            </div>

            <div className="stat-card glow-amber">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-muted-foreground tracking-wider">CRITICAL</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-amber-400 tracking-tight font-mono">
                {stats.negativeAboutBrand?.toLocaleString() || '0'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">direct brand complaints</div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats && stats.totalMentions === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/50 p-12 text-center slide-up">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Ready to scan</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Select a time range and hit Scan to start collecting Reddit mentions for {currentBrand?.name || 'your brand'}.
            </p>
            <Button
              onClick={refreshData}
              disabled={refreshing || !refreshStatus?.canRefresh}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {refreshing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" />Start First Scan</>
              )}
            </Button>
          </div>
        )}

        {/* Charts */}
        <SentimentCharts brandId={currentBrandId} />

        {/* Analytics Section */}
        <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-border/60 px-1 pt-1">
              <TabsList className="h-10 bg-transparent gap-0 p-0 w-full justify-start">
                {[
                  { value: 'sentiment', label: 'Feed', icon: MessageCircle },
                  { value: 'keywords', label: 'Keywords', icon: Tag },
                  { value: 'categories', label: 'Categories', icon: BarChart3 },
                  { value: 'suggestions', label: 'Insights', icon: Lightbulb },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-10 px-4 text-xs font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-colors"
                  >
                    <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="sentiment" className="p-4 space-y-4 mt-0">
              {/* Filters */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-secondary/50 border-border/60"
                  />
                </div>
                <Select value={sentiment} onValueChange={setSentiment}>
                  <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border/60">
                    <SelectValue placeholder="Sentiment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiment</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={subreddit} onValueChange={setSubreddit}>
                  <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border/60">
                    <SelectValue placeholder="Subreddit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subreddits</SelectItem>
                    {filterOptions?.subreddits?.map((sub) => (
                      <SelectItem key={sub} value={sub}>r/{sub}</SelectItem>
                    )) || []}
                  </SelectContent>
                </Select>
                <Select value={keyword} onValueChange={setKeyword}>
                  <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border/60">
                    <SelectValue placeholder="Keyword" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Keywords</SelectItem>
                    {brandKeywords.map((kw) => (
                      <SelectItem key={kw} value={kw}>{kw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={negativeOnly ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setNegativeOnly(!negativeOnly)}
                  className={`h-8 text-xs ${negativeOnly ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' : 'text-muted-foreground border border-border/60'}`}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {negativeOnly ? 'Critical Only' : 'All Posts'}
                </Button>
              </div>

              {/* Results Header */}
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1">
                <span>{totalCount?.toLocaleString() || 0} RESULTS</span>
                <span>PAGE {page}/{totalPages || 1}</span>
              </div>

              {/* Data Feed */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : data?.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm text-muted-foreground">
                    {stats?.totalMentions === 0 ? 'No data yet. Run a scan to start.' : 'No results match your filters.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {data?.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border/40 bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(item.id)}
                    >
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Top row: badges */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                              <Badge className={`${getSentimentStyle(item.sentimentLabel)} text-[10px] border px-1.5 py-0`}>
                                {getSentimentIcon(item.sentimentLabel)}
                                <span className="ml-1 capitalize">{item.sentimentLabel}</span>
                              </Badge>
                              {item.isNegativeAboutBrand && (
                                <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] px-1.5 py-0">
                                  <Zap className="w-2.5 h-2.5 mr-0.5" />
                                  CRITICAL
                                </Badge>
                              )}
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {item.sentimentScore?.toFixed(2)}
                              </span>
                              {item.intentType && (
                                <Badge className={`${getIntentStyle(item.intentType)} text-[10px] border px-1.5 py-0`}>
                                  <Target className="w-2.5 h-2.5 mr-0.5" />
                                  {item.intentType}
                                </Badge>
                              )}
                            </div>

                            {/* Title */}
                            {item.postTitle && (
                              <p className="text-sm font-medium text-foreground/90 mb-1 truncate">
                                {item.postTitle}
                              </p>
                            )}

                            {/* Content preview */}
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {expandedItems.has(item.id)
                                ? item.content || 'No content'
                                : (item.content?.length > 180 ? `${item.content.substring(0, 180)}...` : item.content || 'No content')
                              }
                            </p>

                            {/* Meta row */}
                            <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-muted-foreground">
                              <span className="text-foreground/60">u/{item.author}</span>
                              <span className="text-primary/70">r/{item.subreddit}</span>
                              <span>+{item.upvotes ?? 0}</span>
                              <span>{item.numComments ?? 0} comments</span>
                              <span>{item.timestamp ? format(new Date(item.timestamp), 'MMM dd, yy') : ''}</span>
                              {item.matchedKeywords?.length > 0 && (
                                <span className="text-violet-400/70">{item.matchedKeywords.slice(0, 2).join(', ')}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {expandedItems.has(item.id) ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                          </div>
                        </div>

                        {/* Expanded: Draft Response */}
                        {expandedItems.has(item.id) && (
                          <div className="mt-3 pt-3 border-t border-border/30">
                            {!draftResponses[item.id] ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); draftResponse(item.id); }}
                                disabled={draftLoading && draftingId === item.id}
                                className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                              >
                                {draftLoading && draftingId === item.id ? (
                                  <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Generating...</>
                                ) : (
                                  <><Lightbulb className="w-3 h-3 mr-1.5" />Draft Response</>
                                )}
                              </Button>
                            ) : (
                              <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                <span className="text-[10px] font-mono text-muted-foreground tracking-wider">AI DRAFTS</span>
                                {draftResponses[item.id]?.responses?.map((resp: any, idx: number) => (
                                  <div key={idx} className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[10px] font-semibold text-primary">{resp.label}</span>
                                      <Button
                                        variant="ghost" size="sm" className="h-5 text-[10px] text-muted-foreground px-2"
                                        onClick={() => navigator.clipboard.writeText(resp.text)}
                                      >Copy</Button>
                                    </div>
                                    <p className="text-xs text-foreground/80 leading-relaxed">{resp.text}</p>
                                  </div>
                                ))}
                                {draftResponses[item.id]?.tips?.[0] && (
                                  <p className="text-[10px] text-muted-foreground pl-1">
                                    TIP: {draftResponses[item.id].tips[0]}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1} className="h-7 text-xs text-muted-foreground">
                    Previous
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="h-7 text-xs text-muted-foreground">
                    Next
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="keywords" className="p-4 mt-0">
              <KeywordManager brandId={currentBrandId!} onKeywordsChange={() => { fetchBrandKeywords(); fetchData(); }} />
            </TabsContent>

            <TabsContent value="categories" className="p-4 mt-0">
              <ComplaintCategories brandId={currentBrandId} />
            </TabsContent>

            <TabsContent value="suggestions" className="p-4 mt-0">
              <SuggestionsInsights brandId={currentBrandId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
