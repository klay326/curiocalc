import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { Nav } from '@/components/nav';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CurioCalc — The Calculator Collection Community',
  description: 'Browse, catalog, and share your calculator collection. From everyday scientific models to the bizarre and obscure.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CurioCalc',
  },
  openGraph: {
    siteName: 'CurioCalc',
    type: 'website',
    title: 'CurioCalc — The Calculator Collection Community',
    description: 'Browse, catalog, and share your calculator collection. From everyday scientific models to the bizarre and obscure.',
  },
  twitter: {
    card: 'summary',
    title: 'CurioCalc — The Calculator Collection Community',
    description: 'Browse, catalog, and share your calculator collection. From everyday scientific models to the bizarre and obscure.',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

// Inline script runs before React hydrates — prevents flash of wrong theme
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('cc-theme') || 'obsidian';
    var valid = ['obsidian','crimson','terminal','ocean','ember','paper'];
    document.documentElement.setAttribute('data-theme', valid.includes(t) ? t : 'obsidian');
  } catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="obsidian" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="alternate" type="application/rss+xml" title="CurioCalc — New Calculators"
          href="https://api.curiocalc.org/api/v1/calculators/rss" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100 min-h-screen`}>
        <ThemeProvider>
          <AuthProvider>
            <Nav />
            <main>{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
