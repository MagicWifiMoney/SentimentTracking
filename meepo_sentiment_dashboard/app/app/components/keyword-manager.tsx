'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Tag, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Keyword {
  id: number;
  keyword: string;
  type: 'track' | 'exclude';
  category: string | null;
  isActive: boolean;
  addedAt: string;
}

interface KeywordManagerProps {
  brandId: number;
  onKeywordsChange?: () => void;
}

export default function KeywordManager({ brandId, onKeywordsChange }: KeywordManagerProps) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordType, setNewKeywordType] = useState<'track' | 'exclude'>('track');
  const [newKeywordCategory, setNewKeywordCategory] = useState<string>('');

  useEffect(() => {
    if (brandId) {
      fetchKeywords();
    }
  }, [brandId]);

  const fetchKeywords = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/brands/${brandId}/keywords`);
      if (!response.ok) throw new Error('Failed to fetch keywords');
      const data = await response.json();
      setKeywords(data.keywords || []);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      toast({
        title: "Error",
        description: "Failed to load keywords",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a keyword",
        variant: "destructive"
      });
      return;
    }

    try {
      setAdding(true);
      const response = await fetch(`/api/brands/${brandId}/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: newKeyword,
          type: newKeywordType,
          category: newKeywordCategory || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add keyword');
      }

      toast({
        title: "Success",
        description: "Keyword added successfully"
      });

      setNewKeyword('');
      setNewKeywordCategory('');
      fetchKeywords();
      if (onKeywordsChange) onKeywordsChange();
    } catch (error: any) {
      console.error('Error adding keyword:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add keyword",
        variant: "destructive"
      });
    } finally {
      setAdding(false);
    }
  };

  const toggleKeyword = async (keywordId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/brands/${brandId}/keywords`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId, isActive: !isActive }),
      });

      if (!response.ok) throw new Error('Failed to toggle keyword');

      toast({
        title: "Success",
        description: `Keyword ${!isActive ? 'activated' : 'deactivated'}`
      });

      fetchKeywords();
      if (onKeywordsChange) onKeywordsChange();
    } catch (error) {
      console.error('Error toggling keyword:', error);
      toast({
        title: "Error",
        description: "Failed to update keyword",
        variant: "destructive"
      });
    }
  };

  const deleteKeyword = async (keywordId: number) => {
    if (!confirm('Are you sure you want to delete this keyword?')) return;

    try {
      const response = await fetch(`/api/brands/${brandId}/keywords?keywordId=${keywordId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete keyword');

      toast({
        title: "Success",
        description: "Keyword deleted successfully"
      });

      fetchKeywords();
      if (onKeywordsChange) onKeywordsChange();
    } catch (error) {
      console.error('Error deleting keyword:', error);
      toast({
        title: "Error",
        description: "Failed to delete keyword",
        variant: "destructive"
      });
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'track' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-red-100 text-red-800 border-red-200';
  };

  if (loading) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading keywords...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center">
          <Tag className="w-5 h-5 mr-2" />
          Keyword Tracking
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Track specific keywords or phrases in sentiment data. Use "track" keywords to find mentions and "exclude" keywords to filter out irrelevant content.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Keyword Form */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="text-sm font-semibold mb-3">Add New Keyword</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="Enter keyword or phrase..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              />
            </div>
            <Select value={newKeywordType} onValueChange={(value: 'track' | 'exclude') => setNewKeywordType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="track">Track</SelectItem>
                <SelectItem value="exclude">Exclude</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Category (optional)"
              value={newKeywordCategory}
              onChange={(e) => setNewKeywordCategory(e.target.value)}
            />
          </div>
          <Button
            onClick={addKeyword}
            disabled={adding || !newKeyword.trim()}
            size="sm"
            className="mt-3 w-full md:w-auto"
          >
            {adding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Keyword
              </>
            )}
          </Button>
        </div>

        {/* Keywords List */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Active Keywords ({keywords.filter(k => k.isActive).length})
          </h4>
          {keywords.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              No keywords added yet. Add keywords above to start tracking specific terms.
            </div>
          ) : (
            <div className="space-y-2">
              {keywords.map((kw) => (
                <div
                  key={kw.id}
                  className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                    kw.isActive ? 'bg-white' : 'bg-gray-100 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Badge className={getTypeColor(kw.type)}>
                      {kw.type}
                    </Badge>
                    <span className="font-medium text-sm">{kw.keyword}</span>
                    {kw.category && (
                      <Badge variant="outline" className="text-xs">
                        {kw.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={kw.isActive ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleKeyword(kw.id, kw.isActive)}
                    >
                      {kw.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteKeyword(kw.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
