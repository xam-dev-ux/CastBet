import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './lib/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CastBet - Social Prediction Markets',
  description: 'Bet on Farcaster events with Solana-powered prediction markets',
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://castbet.app/og-image.png',
    'fc:frame:button:1': 'Explore Markets',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://castbet.app',
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
