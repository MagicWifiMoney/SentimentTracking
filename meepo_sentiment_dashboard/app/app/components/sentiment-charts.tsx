
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Loader2, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

interface ChartData {
  subredditBreakdown: Array<{
    subreddit: string;
    count: number;
  }>;
  recentActivity: Array<{
    timestamp: string;
    sentimentLabel: string;
    subreddit: string;
  }>;
}

interface SentimentChartsProps {
  brandId?: number | null;
}

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#80D8C3', '#A19AD3'];
const SENTIMENT_COLORS = {
  negative: '#FF6363',
  positive: '#72BF78', 
  neutral: '#A19AD3'
};

export default function SentimentCharts({ brandId }: SentimentChartsProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (brandId) {
      fetchChartData();
    }
  }, [brandId]);

  const fetchChartData = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/sentiment/stats?brandId=${brandId}`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      const result = await response.json();
      setChartData({
        subredditBreakdown: result.subredditBreakdown || [],
        recentActivity: result.recentActivity || []
      });
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTimelineData = () => {
    if (!chartData?.recentActivity) return [];

    // Group by day and sentiment
    const dailyData: { [key: string]: { date: string; negative: number; positive: number; neutral: number } } = {};
    
    chartData.recentActivity.forEach((item) => {
      const date = format(new Date(item.timestamp), 'MMM dd');
      if (!dailyData[date]) {
        dailyData[date] = { date, negative: 0, positive: 0, neutral: 0 };
      }
      if (item.sentimentLabel) {
        dailyData[date][item.sentimentLabel as keyof typeof dailyData[string]]++;
      }
    });

    return Object.values(dailyData)
      .sort((a, b) => new Date(`2024 ${a.date}`).getTime() - new Date(`2024 ${b.date}`).getTime())
      .slice(-14); // Last 14 days
  };

  const processSentimentDistribution = () => {
    if (!chartData?.recentActivity) return [];

    const sentimentCounts = chartData.recentActivity.reduce((acc, item) => {
      const sentiment = item.sentimentLabel || 'unknown';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(sentimentCounts).map(([sentiment, count]) => ({
      sentiment: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
      count,
      fill: SENTIMENT_COLORS[sentiment as keyof typeof SENTIMENT_COLORS] || '#A19AD3'
    }));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white shadow-sm">
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading charts...
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading charts...
          </CardContent>
        </Card>
      </div>
    );
  }

  const timelineData = processTimelineData();
  const sentimentDistribution = processSentimentDistribution();

  // Show empty state if no data
  if (!chartData?.recentActivity?.length && !chartData?.subredditBreakdown?.length) {
    return (
      <Card className="mb-8 bg-white shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chart data yet</h3>
          <p className="text-gray-500 text-center max-w-sm">
            Charts will appear here once you collect data. Click the &quot;Collect Data&quot; button to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
      {/* Sentiment Over Time */}
      <Card className="bg-white shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Sentiment Trends (Last 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <XAxis 
                dataKey="date" 
                tickLine={false}
                tick={{ fontSize: 10 }}
                label={{ value: 'Date', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fontSize: 11 } }}
              />
              <YAxis 
                tickLine={false}
                tick={{ fontSize: 10 }}
                label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }}
              />
              <Tooltip 
                wrapperStyle={{ fontSize: 11 }}
                contentStyle={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}
              />
              <Line 
                type="monotone" 
                dataKey="negative" 
                stroke={SENTIMENT_COLORS.negative} 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Negative"
              />
              <Line 
                type="monotone" 
                dataKey="positive" 
                stroke={SENTIMENT_COLORS.positive} 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Positive"
              />
              <Line 
                type="monotone" 
                dataKey="neutral" 
                stroke={SENTIMENT_COLORS.neutral} 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Neutral"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sentiment Distribution */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Sentiment Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sentimentDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="count"
                label={({ sentiment, count, percent }: any) => 
                  `${sentiment}: ${count} (${(percent * 100).toFixed(1)}%)`
                }
              >
                {sentimentDistribution?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                )) || []}
              </Pie>
              <Tooltip 
                wrapperStyle={{ fontSize: 11 }}
                contentStyle={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Subreddit Breakdown */}
      <Card className="bg-white shadow-sm lg:col-span-2 xl:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Activity by Subreddit</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData?.subredditBreakdown?.slice(0, 8) || []}>
              <XAxis 
                dataKey="subreddit" 
                tickLine={false}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                label={{ value: 'Subreddit', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fontSize: 11 } }}
              />
              <YAxis 
                tickLine={false}
                tick={{ fontSize: 10 }}
                label={{ value: 'Mentions', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }}
              />
              <Tooltip 
                wrapperStyle={{ fontSize: 11 }}
                contentStyle={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}
                formatter={(value: any) => [`${value} mentions`, 'Count']}
                labelFormatter={(label: any) => `r/${label}`}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData?.subredditBreakdown?.slice(0, 8)?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                )) || []}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
