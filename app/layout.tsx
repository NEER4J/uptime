import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { createClient } from '@/utils/supabase/server';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Navigation from '@/components/Navigation';
import { ThemeProvider } from '@/components/theme-provider';

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Uptime Monitor',
  description: 'Monitor your websites, SSL certificates, and domain names',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" className={GeistSans.className} suppressHydrationWarning>
      <body className="bg-background min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navigation />
          <main className="flex-1 flex flex-col items-center justify-center">
            {children}
          </main>
          <footer className="border-t border-border py-6 md:py-0">
            <div className="container mx-auto px-4 md:flex md:items-center md:justify-between md:h-16">
              <div className="text-sm text-muted-foreground text-center md:text-left">
                © {new Date().getFullYear()} Uptime Monitor. All rights reserved.
              </div>
              <div className="mt-4 md:mt-0 flex justify-center md:justify-end space-x-6">
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-brand text-sm"
                >
                  Privacy Policy
                </a>
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-brand text-sm"
                >
                  Terms of Service
                </a>
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-brand text-sm"
                >
                  Contact
                </a>
              </div>
            </div>
          </footer>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
