'use client';

import { Market, MarketStatus } from '../types';
import { useMarketPrices } from '../hooks/useMarkets';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const { data: prices } = useMarketPrices(Number(market.marketId));

  const yesPrice = prices ? Number((prices as [bigint, bigint])[0]) / 1e6 : 0.5;
  const noPrice = prices ? Number((prices as [bigint, bigint])[1]) / 1e6 : 0.5;

  const resolutionDate = new Date(market.resolutionTime * 1000);
  const totalLiquidity = (Number(market.yesPool) + Number(market.noPool)) / 1_000_000;
  const volume = Number(market.totalVolume) / 1_000_000;

  const getStatusColor = () => {
    switch (market.status) {
      case MarketStatus.Active:
        return 'bg-green-100 text-green-800';
      case MarketStatus.Resolved:
        return 'bg-blue-100 text-blue-800';
      case MarketStatus.Cancelled:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Link href={`/market/${market.marketId.toString()}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer border border-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {market.question}
            </h3>
            {market.farcasterContext.channel && (
              <span className="text-xs text-purple-600 font-medium">
                /{market.farcasterContext.channel}
              </span>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {market.status}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{market.description}</p>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="text-xs text-green-700 font-medium mb-1">YES</div>
            <div className="text-2xl font-bold text-green-900">
              {(yesPrice * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-green-600 mt-1">
              ${yesPrice.toFixed(2)} per share
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="text-xs text-red-700 font-medium mb-1">NO</div>
            <div className="text-2xl font-bold text-red-900">
              {(noPrice * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-red-600 mt-1">
              ${noPrice.toFixed(2)} per share
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-medium text-gray-700">${totalLiquidity.toFixed(0)}</span>
              <span className="ml-1">liquidity</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">${volume.toFixed(0)}</span>
              <span className="ml-1">volume</span>
            </div>
          </div>
          <div className="text-xs">
            {market.status === MarketStatus.Active ? (
              <>Closes {formatDistanceToNow(resolutionDate, { addSuffix: true })}</>
            ) : (
              <>Closed</>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
