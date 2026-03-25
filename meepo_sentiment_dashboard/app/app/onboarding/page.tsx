
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BrandSetupWizard from '../components/brand-setup-wizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BrandData {
  name: string;
  website: string;
  description: string;
  category: string;
  subreddits: string[];
}

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const handleBrandSetup = async (brandData: BrandData) => {
    setCreating(true);
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...brandData,
          subscriptionTier: 'trial',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create brand');
      }

      const result = await response.json();
      
      toast({
        title: "Welcome to your Brand Dashboard!",
        description: "Your brand has been set up successfully. Redirecting to your dashboard...",
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error: any) {
      console.error('Error creating brand:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to create your brand. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  if (creating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Setting up your brand...</h2>
              <p className="text-gray-600 text-center">
                We're configuring your Reddit sentiment monitoring dashboard. This will only take a moment.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <Building2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Reddit Brand Monitor
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track what people are saying about your brand across Reddit communities. 
            Let's set up your first brand monitoring project.
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Real-time Sentiment</h3>
              <p className="text-sm text-gray-600">
                Monitor positive, negative, and neutral mentions across multiple subreddits
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Issue Detection</h3>
              <p className="text-sm text-gray-600">
                Automatically categorize and prioritize brand-related issues and complaints
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Multi-Brand Support</h3>
              <p className="text-sm text-gray-600">
                Manage multiple brands and compare performance across different subreddits
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Setup Wizard */}
        <BrandSetupWizard 
          onComplete={handleBrandSetup}
          subscriptionTier="trial"
        />
      </div>
    </div>
  );
}
