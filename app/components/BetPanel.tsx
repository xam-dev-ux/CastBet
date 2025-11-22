'use client';

import { useState } from 'react';
import { Market, Outcome } from '../types';
import { usePlaceBet } from '../hooks/useBetting';
import { useMarketPrices } from '../hooks/useMarkets';
import { useAccount } from 'wagmi';

interface BetPanelProps {
  market: Market;
}

export function BetPanel({ market }: BetPanelProps) {
  const { address: wallet } = useAccount();
  const [outcome, setOutcome] = useState<Outcome>(Outcome.Yes);
  const [amount, setAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(1);

  const { data: prices } = useMarketPrices(Number(market.marketId));
  const placeBet = usePlaceBet();

  const yesPrice = prices ? Number((prices as [bigint, bigint])[0]) / 1e6 : 0.5;
  const noPrice = prices ? Number((prices as [bigint, bigint])[1]) / 1e6 : 0.5;
  const price = outcome === Outcome.Yes ? yesPrice : noPrice;
  const estimatedShares = amount ? parseFloat(amount) / price : 0;
  const potentialReturn = estimatedShares * 1.0; // $1 per winning share
  const potentialProfit = potentialReturn - (amount ? parseFloat(amount) : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !wallet) return;

    try {
      await placeBet.mutateAsync({
        marketId: Number(market.marketId),
        outcome,
        amount: parseFloat(amount),
        slippage,
      });

      setAmount('');
      alert('Bet placed successfully!');
    } catch (error) {
      console.error('Error placing bet:', error);
      alert('Failed to place bet. Check console for details.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-xl font-bold mb-6">Place Your Bet</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Outcome Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prediction
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOutcome(Outcome.Yes)}
              className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                outcome === Outcome.Yes
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              YES {(yesPrice * 100).toFixed(1)}%
            </button>
            <button
              type="button"
              onClick={() => setOutcome(Outcome.No)}
              className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                outcome === Outcome.No
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              NO {(noPrice * 100).toFixed(1)}%
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (USDC)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="mt-2 flex gap-2">
            {[10, 25, 50, 100].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                ${preset}
              </button>
            ))}
          </div>
        </div>

        {/* Slippage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slippage Tolerance: {slippage}%
          </label>
          <input
            type="range"
            value={slippage}
            onChange={(e) => setSlippage(parseFloat(e.target.value))}
            min="0.1"
            max="5"
            step="0.1"
            className="w-full"
          />
        </div>

        {/* Estimate */}
        {amount && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Avg. Price:</span>
              <span className="font-semibold">${price.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Est. Shares:</span>
              <span className="font-semibold">{estimatedShares.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Potential Return:</span>
              <span className="font-semibold">${potentialReturn.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span className="text-gray-600">Potential Profit:</span>
              <span className={`font-bold ${potentialProfit > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                +${potentialProfit.toFixed(2)} ({((potentialProfit / parseFloat(amount)) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!amount || !wallet || placeBet.isPending}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
            outcome === Outcome.Yes
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {placeBet.isPending ? 'Placing Bet...' : `Bet ${outcome === Outcome.Yes ? 'YES' : 'NO'}`}
        </button>
      </form>

      {!wallet && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Connect your wallet to place a bet
        </p>
      )}
    </div>
  );
}
