import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'GESchool — Gérer, Apprendre, Réussir',
  description: 'Application de gestion scolaire pour les établissements du Congo-Brazzaville',
  manifest: '/manifest.json',
  metadataBase: new URL('https://ecole-congo.com'),
  openGraph: {
    title: 'GESchool — Gérer, Apprendre, Réussir',
    description: 'Application de gestion scolaire pour les établissements du Congo-Brazzaville',
    type: 'website',
    locale: 'fr_FR',
    images: [{ url: '/icon-512x512.png', width: 512, height: 512, alt: 'GESchool' }],
  },
  twitter: {
    card: 'summary',
    title: 'GESchool — Gérer, Apprendre, Réussir',
    description: 'Application de gestion scolaire pour les établissements du Congo-Brazzaville',
    images: ['/icon-512x512.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GESchool',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '64x64 32x32 16x16', type: 'image/x-icon' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#FF6600',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`font-sans ${outfit.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <PwaRegister />
            <ToastProvider />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}