import type { Metadata, Viewport } from 'next';
import { Inter_Tight, Archivo_Black, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { Footer } from '@/components/shared/Footer';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import 'flag-icons/css/flag-icons.min.css';
import './globals.css';

const inter = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Polla Mundialista',
    template: '%s · Polla Mundialista',
  },
  description: 'Vive el Mundial de Fútbol con tus amigos. Pronostica y compite.',
  applicationName: 'Polla Mundialista',
  authors: [{ name: 'Polla Mundialista' }],
  keywords: ['polla', 'mundial', 'fútbol', 'pronósticos', 'quiniela'],
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF7' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0F1A' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${display.variable} ${mono.variable} min-h-screen flex flex-col bg-background`}
      >
        <ThemeProvider>
          {/* Wrapper flex-1 para que el footer quede pegado al fondo
            * incluso cuando el contenido es corto (login, onboarding). */}
          <div className="flex-1 flex flex-col">{children}</div>
          <Footer />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
