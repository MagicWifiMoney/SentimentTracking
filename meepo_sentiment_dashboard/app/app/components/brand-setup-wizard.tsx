
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle, Building, Globe, Tag, MessageSquare, Sparkles, MapPin } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import SubredditSelector from './subreddit-selector';

interface BrandData {
  name: string;
  website: string;
  description: string;
  category: string;
  focusLocal: boolean;
  city: string;
  state: string;
  country: string;
  subreddits: string[];
}

interface BrandSetupWizardProps {
  onComplete: (brandData: BrandData) => void;
  subscriptionTier?: string;
}

const BRAND_CATEGORIES = [
  { value: 'E-commerce', label: 'E-commerce / Retail', description: 'Online stores, product brands' },
  { value: 'Technology', label: 'Technology / Hardware', description: 'Electronics, gadgets, devices' },
  { value: 'Software & SaaS', label: 'Software & SaaS', description: 'Apps, software, cloud services' },
  { value: 'Gaming', label: 'Gaming', description: 'Video games, gaming hardware' },
  { value: 'Fashion', label: 'Fashion & Apparel', description: 'Clothing, accessories, style' },
  { value: 'Beauty & Cosmetics', label: 'Beauty & Cosmetics', description: 'Skincare, makeup, personal care' },
  { value: 'Health & Fitness', label: 'Health & Fitness', description: 'Wellness, fitness, supplements' },
  { value: 'Food & Beverage', label: 'Food & Beverage', description: 'Restaurants, food products, drinks' },
  { value: 'Automotive', label: 'Automotive', description: 'Cars, motorcycles, auto parts' },
  { value: 'Travel & Hospitality', label: 'Travel & Hospitality', description: 'Hotels, travel, tourism' },
  { value: 'Finance & Banking', label: 'Finance & Banking', description: 'Banking, fintech, investments' },
  { value: 'Home & Garden', label: 'Home & Garden', description: 'Home improvement, furniture, gardening' },
  { value: 'Pet & Animal', label: 'Pet & Animal', description: 'Pet products, pet services' },
  { value: 'Education', label: 'Education', description: 'Learning platforms, courses, schools' },
  { value: 'Entertainment', label: 'Entertainment', description: 'Media, streaming, content' },
  { value: 'Sports', label: 'Sports & Outdoors', description: 'Sports gear, outdoor activities' },
  { value: 'Other', label: 'Other', description: 'Other industry or service' },
];

const SUBSCRIPTION_LIMITS = {
  trial: { subreddits: 3, description: '7-day free trial' },
  starter: { subreddits: 5, description: 'Basic monitoring' },
  professional: { subreddits: 15, description: 'Advanced analytics' },
  enterprise: { subreddits: 50, description: 'Full-scale monitoring' },
};

export default function BrandSetupWizard({ 
  onComplete, 
  subscriptionTier = 'trial' 
}: BrandSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [autoSuggestions, setAutoSuggestions] = useState<any[]>([]);
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(false);
  const [brandData, setBrandData] = useState<BrandData>({
    name: '',
    website: '',
    description: '',
    category: '',
    focusLocal: false,
    city: '',
    state: '',
    country: 'USA',
    subreddits: [],
  });

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;
  const limits = SUBSCRIPTION_LIMITS[subscriptionTier as keyof typeof SUBSCRIPTION_LIMITS] || SUBSCRIPTION_LIMITS.trial;

  const fetchSubredditSuggestions = async () => {
    if (!brandData.name || !brandData.category) {
      return;
    }

    setSuggestionsLoading(true);
    try {
      const response = await fetch('/api/brands/suggest-subreddits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: brandData.name,
          website: brandData.website,
          category: brandData.category,
          focusLocal: brandData.focusLocal,
          city: brandData.city,
          state: brandData.state,
          country: brandData.country,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAutoSuggestions(data.suggestions || []);
        setSuggestionsGenerated(true);
        
        toast({
          title: "Smart suggestions generated!",
          description: `Found ${data.suggestions?.length || 0} personalized subreddit suggestions for ${brandData.name}`,
        });
      } else {
        console.error('Failed to fetch suggestions');
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast({
        title: "Suggestion Error",
        description: "Unable to generate personalized suggestions. You can still select subreddits manually.",
        variant: "destructive"
      });
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      // If moving from step 2 to step 3, fetch subreddit suggestions
      if (currentStep === 2 && !suggestionsGenerated) {
        await fetchSubredditSuggestions();
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Validate required fields
      if (!brandData.name.trim()) {
        throw new Error('Brand name is required');
      }
      if (!brandData.category) {
        throw new Error('Please select a brand category');
      }
      if (brandData.subreddits.length === 0) {
        throw new Error('Please select at least one subreddit to monitor');
      }

      await onComplete(brandData);
      
      toast({
        title: "Brand setup complete!",
        description: "Your brand has been configured successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Setup Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceedFromStep1 = brandData.name.trim() && brandData.category;
  const canProceedFromStep2 = true; // Website and description are optional
  const canComplete = brandData.name.trim() && brandData.category && brandData.subreddits.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-2xl font-bold">Brand Setup</CardTitle>
            <Badge variant="outline">
              {limits.description}
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-600 mt-2">
            Step {currentStep} of {totalSteps}
          </p>
        </CardHeader>
      </Card>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Basic Brand Information
            </CardTitle>
            <p className="text-gray-600">
              Tell us about your brand so we can customize your monitoring experience.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name *
              </label>
              <Input
                placeholder="e.g., Tesla, Nike, Coca-Cola"
                value={brandData.name}
                onChange={(e) => setBrandData({ ...brandData, name: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry Category *
              </label>
              <Select
                value={brandData.category}
                onValueChange={(value) => setBrandData({ ...brandData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div>
                        <div className="font-medium">{cat.label}</div>
                        <div className="text-sm text-gray-500">{cat.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleNext}
                disabled={!canProceedFromStep1}
                className="flex items-center gap-2"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Additional Details */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Additional Details
            </CardTitle>
            <p className="text-gray-600">
              Optional information to help us better understand your brand.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <Input
                placeholder="https://www.yourbrand.com"
                value={brandData.website}
                onChange={(e) => setBrandData({ ...brandData, website: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Description
              </label>
              <Textarea
                placeholder="Describe what your brand does, your products, or services..."
                value={brandData.description}
                onChange={(e) => setBrandData({ ...brandData, description: e.target.value })}
                className="w-full min-h-[100px]"
              />
            </div>

            {/* Local Focus Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                  <Label htmlFor="local-focus" className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Focus on Local Markets
                  </Label>
                  <p className="text-sm text-gray-500">
                    Target city/region-specific subreddits for local businesses
                  </p>
                </div>
                <Switch
                  id="local-focus"
                  checked={brandData.focusLocal}
                  onCheckedChange={(checked) => setBrandData({ ...brandData, focusLocal: checked })}
                />
              </div>

              {brandData.focusLocal && (
                <div className="space-y-3 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <Input
                        placeholder="e.g., Chicago, Austin"
                        value={brandData.city}
                        onChange={(e) => setBrandData({ ...brandData, city: e.target.value })}
                        className="w-full bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State/Province
                      </label>
                      <Input
                        placeholder="e.g., IL, TX"
                        value={brandData.state}
                        onChange={(e) => setBrandData({ ...brandData, state: e.target.value })}
                        className="w-full bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <Select
                      value={brandData.country}
                      onValueChange={(value) => setBrandData({ ...brandData, country: value })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USA">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-blue-700 flex items-start gap-1 mt-2">
                    <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>We'll automatically suggest city and regional subreddits based on your location!</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button 
                onClick={handleBack}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button 
                onClick={handleNext}
                disabled={suggestionsLoading}
                className="flex items-center gap-2"
              >
                {suggestionsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating suggestions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Subreddit Suggestions
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Subreddit Selection */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Choose Subreddits to Monitor
              </CardTitle>
              <p className="text-gray-600">
                Select up to {limits.subreddits} subreddits where you want to track mentions of your brand.
              </p>
            </CardHeader>
          </Card>

          <SubredditSelector
            selectedSubreddits={brandData.subreddits}
            onSelectionChange={(subreddits) => setBrandData({ ...brandData, subreddits })}
            maxSelections={limits.subreddits}
            brandCategory={brandData.category}
            autoSuggestions={autoSuggestions}
            brandName={brandData.name}
            brandWebsite={brandData.website}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <Button 
                  onClick={handleBack}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button 
                  onClick={handleComplete}
                  disabled={!canComplete || loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Complete Setup
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
