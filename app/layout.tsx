import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './lib/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CastBet - Social Prediction Markets on Base',
  description: 'Decentralized prediction markets for Farcaster. Bet on outcomes, vote on resolutions, and earn on Base.',
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'CastBet - Social Prediction Markets',
    description: 'Decentralized prediction markets for Farcaster on Base',
    images: ['/og-image.svg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CastBet - Social Prediction Markets',
    description: 'Decentralized prediction markets for Farcaster on Base',
    images: ['/og-image.svg'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': '/og-image.svg',
    'fc:frame:button:1': 'Explore Markets',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': '/',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
