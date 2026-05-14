import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'InvestIA — Dashboard de Mercado',
  description: 'Dashboard de mercado financeiro com análise por inteligência artificial. Ações, FIIs, Renda Fixa e Internacional.',
  manifest: '/manifest.json',
  themeColor: '#378ADD',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InvestIA',
  },
  icons: {
    apple: '/icon-192.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="InvestIA" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
