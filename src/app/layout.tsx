import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { LanguageProvider } from '@/hooks/use-language';
import { ThemeProvider } from '@/components/app/theme-provider';
import { OfflineBanner } from '@/components/pwa/offline-banner';
import { SWRegistry } from '@/components/pwa/sw-registry';

export const metadata: Metadata = {
  title: 'CropChain',
  description: 'Your digital agriculture ecosystem.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3e%3cdefs%3e%3clinearGradient id='grad1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3e%3cstop offset='0%25' style='stop-color:%23f97316;stop-opacity:1' /%3e%3cstop offset='100%25' style='stop-color:%23d946ef;stop-opacity:1' /%3e%3c/linearGradient%3e%3c/defs%3e%3ctext x='50' y='50' font-family='Verdana' font-size='80' font-weight='bold' fill='url(%23grad1)' text-anchor='middle' dominant-baseline='middle'%3eS%3c/text%3e%3c/svg%3e" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <FirebaseClientProvider>
          <LanguageProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
              <OfflineBanner />
              <SWRegistry />
            </ThemeProvider>
          </LanguageProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
