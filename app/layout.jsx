import './globals.css';

export const metadata = {
  title: 'InvestIA Dashboard',
  description: 'Dashboard de mercado financeiro com analise por IA',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#2563EB" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="InvestIA" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ margin:0, padding:0 }}>{children}</body>
    </html>
  );
}
