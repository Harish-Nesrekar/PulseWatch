
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

import { Toaster } from 'sonner';
import { AuthGate } from '@/components/auth-gate';
import { AuroraBackground } from '@/components/aurora-background';

export const metadata: Metadata = {
  title: {
    default: 'PulseWatch — Uptime & API Monitoring',
    template: '%s | PulseWatch',
  },
  description:
    'Know when your services go down. Before your customers do. Monitor websites, APIs, incidents, and service availability with PulseWatch.',
  applicationName: 'PulseWatch',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {/* Global Aurora background */}
        <AuroraBackground />

        {/* Application theme and authentication */}
        <div className="app-theme selection:bg-blue-100 selection:text-slate-900">
          <AuthGate>{children}</AuthGate>
        </div>

        {/* Global notifications */}
        <Toaster
          position="bottom-right"
          theme="light"
          richColors
          closeButton
          expand={false}
        />
      </body>
    </html>
  );
}
