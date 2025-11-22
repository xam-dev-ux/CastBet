'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMarket } from '../../hooks/useMarkets';
import { usePosition } from '../../hooks/usePosition';
import { BetPanel } from '../../components/BetPanel';
import { formatDistanceToNow, format } from 'date-fns';
import { MarketStatus, Outcome } from '../../types';
import { useVoteOutcome, useResolveMarket, useClaimWinnings } from '../../hooks/useBetting';
import { useAccount } from 'wagmi';

export default function MarketPage() {
  const params = useParams();
  const marketIdStr = params.id as string;
  const marketId = parseInt(marketIdStr);
  const { address: wallet } = useAccount();

  const { data: market, isLoading } = useMarket(marketId);
  const { data: position } = usePosition(marketId);
  const voteOutcome = useVoteOutcome();
  const resolveMarket = useResolveMarket();
  const claimWinnings = useClaimWinnings();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Market not found</h2>
          <Link href="/" className="text-primary-600 hover:underline">
            Back to markets
          </Link>
        </div>
      </div>
    );
  }

  const resolutionDate = new Date(market.resolutionTime * 1000);
  const canVote = market.status === MarketStatus.Active &&
    Date.now() >= market.resolutionTime * 1000 &&
    position &&
    (Number(position.yesShares) > 0 || Number(position.noShares) > 0);

  const canResolve = market.status === MarketStatus.Active &&
    Date.now() >= (market.resolutionTime + 86400) * 1000; // 24h after resolution time

  const canClaim = market.status === MarketStatus.Resolved &&
    position &&
    !position.claimed &&
    ((market.oracleData.resolvedOutcome === Outcome.Yes && Number(position.yesShares) > 0) ||
     (market.oracleData.resolvedOutcome === Outcome.No && Number(position.noShares) > 0));

  const handleVote = async (outcome: Outcome) => {
    try {
      await voteOutcome.mutateAsync({
        marketId: marketId,
        outcome,
      });
      alert('Vote submitted successfully!');
    } catch (error) {
      console.error('Vote error:', error);
      alert('Failed to vote. You may have already voted.');
    }
  };

  const handleResolve = async () => {
    try {
      await resolveMarket.mutateAsync({ marketId: marketId });
      alert('Market resolved successfully!');
    } catch (error) {
      console.error('Resolve error:', error);
      alert('Failed to resolve market.');
    }
  };

  const handleClaim = async () => {
    try {
      await claimWinnings.mutateAsync({
        marketId: marketId,
      });
      alert('Winnings claimed successfully!');
    } catch (error) {
      console.error('Claim error:', error);
      alert('Failed to claim winnings.');
    }
  };

  const yesVotes = Number(market.oracleData.yesVotes) / 1_000_000;
  const noVotes = Number(market.oracleData.noVotes) / 1_000_000;
  const totalVotes = yesVotes + noVotes;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-primary-600 hover:underline text-sm">
            ← Back to markets
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Info */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{market.question}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    market.status === MarketStatus.Active
                      ? 'bg-green-100 text-green-800'
                      : market.status === MarketStatus.Resolved
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {market.status}
                </span>
              </div>

              <p className="text-gray-700 mb-6">{market.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Created</span>
                  <p className="font-semibold">
                    {format(new Date(market.createdAt * 1000), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Resolves</span>
                  <p className="font-semibold">
                    {formatDistanceToNow(resolutionDate, { addSuffix: true })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Volume</span>
                  <p className="font-semibold">${(Number(market.totalVolume) / 1_000_000).toFixed(0)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Liquidity</span>
                  <p className="font-semibold">
                    ${((Number(market.yesPool) + Number(market.noPool)) / 1_000_000).toFixed(0)}
                  </p>
                </div>
              </div>

              {market.farcasterContext.channel && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Channel: </span>
                  <span className="text-sm font-semibold text-purple-600">
                    /{market.farcasterContext.channel}
                  </span>
                </div>
              )}
            </div>

            {/* Voting Section */}
            {canVote && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-4">Vote on Outcome</h3>
                <p className="text-sm text-gray-700 mb-4">
                  The resolution period has started. As a shareholder, you can vote on the outcome.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleVote(Outcome.Yes)}
                    disabled={voteOutcome.isPending}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-50"
                  >
                    Vote YES
                  </button>
                  <button
                    onClick={() => handleVote(Outcome.No)}
                    disabled={voteOutcome.isPending}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg disabled:opacity-50"
                  >
                    Vote NO
                  </button>
                </div>
              </div>
            )}

            {/* Voting Results */}
            {totalVotes > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-bold mb-4">Voting Results</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-green-700">YES</span>
                      <span>{totalVotes > 0 ? ((yesVotes / totalVotes) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-600 h-3 rounded-full"
                        style={{ width: `${totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-red-700">NO</span>
                      <span>{totalVotes > 0 ? ((noVotes / totalVotes) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-red-600 h-3 rounded-full"
                        style={{ width: `${totalVotes > 0 ? (noVotes / totalVotes) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Total voters: {market.oracleData.totalVoters}
                  </p>
                </div>

                {canResolve && (
                  <button
                    onClick={handleResolve}
                    disabled={resolveMarket.isPending}
                    className="mt-4 w-full py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg disabled:opacity-50"
                  >
                    {resolveMarket.isPending ? 'Resolving...' : 'Resolve Market'}
                  </button>
                )}
              </div>
            )}

            {/* Claim Winnings */}
            {canClaim && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2 text-green-900">Congratulations! 🎉</h3>
                <p className="text-sm text-green-800 mb-4">
                  You have winning shares to claim.
                </p>
                <button
                  onClick={handleClaim}
                  disabled={claimWinnings.isPending}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {claimWinnings.isPending ? 'Claiming...' : 'Claim Winnings'}
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bet Panel */}
            {market.status === MarketStatus.Active &&
              Date.now() < market.resolutionTime * 1000 && (
                <BetPanel market={market} />
              )}

            {/* User Position */}
            {position && wallet && (
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-bold mb-4">Your Position</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">YES Shares</span>
                    <span className="font-semibold">
                      {(Number(position.yesShares) / 1_000_000).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NO Shares</span>
                    <span className="font-semibold">
                      {(Number(position.noShares) / 1_000_000).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
