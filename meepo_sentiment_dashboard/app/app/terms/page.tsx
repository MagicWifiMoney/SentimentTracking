

import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - Reddit Brand Monitor',
  description: 'Terms of Service for Reddit Brand Monitor',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-xl text-gray-600">
            Last updated: September 24, 2025
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700">
                By accessing and using Reddit Brand Monitor ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p className="text-gray-700">
                Reddit Brand Monitor is a sentiment analysis platform that helps brands track and monitor mentions across Reddit communities. The Service provides analytics, insights, and reporting tools based on publicly available Reddit data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must provide accurate and complete information when creating an account</li>
                <li>You must notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
              <p className="text-gray-700 mb-3">You agree not to use the Service to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Attempt to gain unauthorized access to the Service or related systems</li>
                <li>Use the Service for any commercial purpose without our written consent</li>
                <li>Interfere with or disrupt the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data and Privacy</h2>
              <p className="text-gray-700">
                The Service analyzes publicly available Reddit data. We do not collect private or personal information from Reddit users. All data processing is performed in accordance with our Privacy Policy and applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Subscription and Payment</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Subscription fees are charged in advance on a monthly or annual basis</li>
                <li>All fees are non-refundable unless otherwise stated</li>
                <li>We reserve the right to change our pricing with 30 days notice</li>
                <li>Your subscription will automatically renew unless cancelled</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
              <p className="text-gray-700">
                In no event shall Reddit Brand Monitor be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
              <p className="text-gray-700">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
              <p className="text-gray-700">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
              <p className="text-gray-700">
                If you have any questions about these Terms, please contact us at support@redditbrandmonitor.com.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Link 
            href="/auth/signup" 
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            ← Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
