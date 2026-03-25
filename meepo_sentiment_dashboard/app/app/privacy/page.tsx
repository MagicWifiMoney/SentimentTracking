

import { Building2, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - Reddit Brand Monitor',
  description: 'Privacy Policy for Reddit Brand Monitor',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-600">
            Last updated: September 24, 2025
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-green-600" />
              Your Privacy Matters
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-gray-700">
                Reddit Brand Monitor ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our brand monitoring service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium mb-2 text-gray-800">Personal Information</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                <li>Name and email address (for account creation)</li>
                <li>Payment information (processed by third-party providers)</li>
                <li>Brand information you choose to monitor</li>
                <li>Usage patterns and preferences</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 text-gray-800">Reddit Data</h3>
              <p className="text-gray-700">
                We collect and analyze publicly available Reddit posts and comments that mention your brand or related keywords. This data is sourced from Reddit's public API and includes post content, usernames, timestamps, and subreddit information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Provide sentiment analysis and brand monitoring services</li>
                <li>Generate reports and insights about your brand</li>
                <li>Maintain and improve our platform</li>
                <li>Communicate with you about your account and service updates</li>
                <li>Process payments and manage subscriptions</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-3">We do not sell your personal information. We may share information in the following circumstances:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Service Providers:</strong> With trusted third parties who assist in operating our service</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfer:</strong> In the event of a merger, sale, or asset transfer</li>
                <li><strong>Consent:</strong> With your explicit consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
              <p className="text-gray-700">
                We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Personal account data: Retained while your account is active plus 30 days after deletion</li>
                <li>Reddit sentiment data: Retained for up to 2 years for analytics purposes</li>
                <li>Payment information: Processed by third parties; we do not store credit card details</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
              <p className="text-gray-700 mb-3">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Delete your personal information</li>
                <li>Restrict or object to processing</li>
                <li>Data portability</li>
                <li>Withdraw consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Cookies and Tracking</h2>
              <p className="text-gray-700">
                We use cookies and similar technologies to enhance your experience, analyze usage patterns, and provide personalized content. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Third-Party Services</h2>
              <p className="text-gray-700">
                Our service integrates with Reddit's API and various analytics tools. These third parties have their own privacy policies governing their use of your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
              <p className="text-gray-700">
                Our service is not intended for users under 18. We do not knowingly collect personal information from children under 18.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. International Data Transfers</h2>
              <p className="text-gray-700">
                Your information may be processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Changes to Privacy Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about this Privacy Policy or our data practices, please contact us at privacy@redditbrandmonitor.com.
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
