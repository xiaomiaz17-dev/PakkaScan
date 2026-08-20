import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'PakkaScan',
  description: 'AI-powered legal due diligence for Pakistani property',
  openGraph: {
    title: 'PakkaScan ' + String.fromCharCode(0x2014) + ' AI Legal Due Diligence for Pakistani Property',
    description: "Don't hand over bayana until PakkaScan has read the fine print you didn't.",
    url: 'https://pakkascan.com',
    siteName: 'PakkaScan',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'PakkaScan',
    description: "Don't hand over bayana until PakkaScan has read the fine print you didn't.",
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
              <AnalyticsProvider />
      </body>
    </html>
  );
}
