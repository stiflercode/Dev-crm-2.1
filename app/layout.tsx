import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { ThemeInitializer } from '@/components/layout/ThemeInitializer';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });

export const metadata: Metadata = {
  title: { default: '1930 Cyber Helpline CRM', template: '%s | 1930 CRM' },
  description: 'Next-Generation Cyber Crime Helpline Case Management System for Maharashtra Cyber Police',
  keywords: ['cyber crime', 'helpline', 'CRM', 'Maharashtra', '1930'],
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="font-inter antialiased min-h-screen" suppressHydrationWarning>
        <ThemeInitializer />
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}


