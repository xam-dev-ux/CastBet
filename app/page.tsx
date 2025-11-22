'use client';

import { useState } from 'react';
import { useActiveMarkets, useResolvedMarkets } from './hooks/useMarkets';
import { MarketCard } from './components/MarketCard';
import { CreateMarketForm } from './components/CreateMarketForm';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const [tab, setTab] = useState<'active' | 'resolved'>('active');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: activeMarkets, isLoading: loadingActive } = useActiveMarkets();
  const { data: resolvedMarkets, isLoading: loadingResolved } = useResolvedMarkets();

  const markets = tab === 'active' ? activeMarkets : resolvedMarkets;
  const isLoading = tab === 'active' ? loadingActive : loadingResolved;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary-600">CastBet</h1>
              <p className="text-sm text-gray-600 mt-1">
                Social Prediction Markets on Farcaster
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
              >
                {showCreateForm ? 'Close' : 'Create Market'}
              </button>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Market Form */}
        {showCreateForm && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-2xl font-bold mb-6">Create New Market</h2>
            <CreateMarketForm
              onSuccess={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tab === 'active'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Markets
            {activeMarkets && (
              <span className="ml-2 text-sm">({activeMarkets.length})</span>
            )}
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tab === 'resolved'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Resolved
            {resolvedMarkets && (
              <span className="ml-2 text-sm">({resolvedMarkets.length})</span>
            )}
          </button>
        </div>

        {/* Markets Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : markets && markets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((market) => (
              <MarketCard key={market.marketId.toString()} market={market} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {tab} markets yet
            </h3>
            <p className="text-gray-600 mb-6">
              {tab === 'active'
                ? 'Be the first to create a prediction market!'
                : 'No markets have been resolved yet.'}
            </p>
            {tab === 'active' && !showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
              >
                Create Market
              </button>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg p-8 border border-primary-100">
          <h2 className="text-2xl font-bold mb-4">How CastBet Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold mb-2">Create Markets</h3>
              <p className="text-sm text-gray-700">
                Create prediction markets about Farcaster events - casts, users, channels, and more.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-2">💰</div>
              <h3 className="font-semibold mb-2">Trade Shares</h3>
              <p className="text-sm text-gray-700">
                Buy YES or NO shares with USDC. Prices reflect real-time probability based on market demand.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-2">🏆</div>
              <h3 className="font-semibold mb-2">Win Rewards</h3>
              <p className="text-sm text-gray-700">
                Winning shares pay out $1 each. Social oracle voting ensures fair resolution.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>Built with EVM + Solidity + Farcaster</p>
            <p className="mt-2">Powered by social predictions</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
