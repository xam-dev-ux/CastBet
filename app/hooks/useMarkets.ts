import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CASTBET_ABI, CASTBET_ADDRESS } from '../lib/contracts';
import { Market, FarcasterContext, OracleType, MarketStatus } from '../types';

export function useNextMarketId() {
  return useReadContract({
    address: CASTBET_ADDRESS,
    abi: CASTBET_ABI,
    functionName: 'nextMarketId',
  });
}

export function useMarket(marketId: number | bigint) {
  const { data, ...rest } = useReadContract({
    address: CASTBET_ADDRESS,
    abi: CASTBET_ABI,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
    query: {
      enabled: marketId > 0,
      refetchInterval: 5000,
    },
  });

  return {
    data: data ? parseMarket(data, marketId) : null,
    ...rest,
  };
}

export function useMarketPrices(marketId: number | bigint) {
  return useReadContract({
    address: CASTBET_ADDRESS,
    abi: CASTBET_ABI,
    functionName: 'getMarketPrices',
    args: [BigInt(marketId)],
    query: {
      enabled: marketId > 0,
      refetchInterval: 5000,
    },
  });
}

export function useCreateMarket() {
  const { writeContract, data: hash } = useWriteContract();
  const queryClient = useQueryClient();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  const mutate = async ({
    question,
    description,
    farcasterContext,
    resolutionTime,
    oracleType,
  }: {
    question: string;
    description: string;
    farcasterContext: FarcasterContext;
    resolutionTime: Date;
    oracleType: OracleType;
  }) => {
    const resolutionTimestamp = BigInt(Math.floor(resolutionTime.getTime() / 1000));
    const oracleTypeEnum = oracleType === OracleType.Social ? 0 : 1;

    return writeContract({
      address: CASTBET_ADDRESS,
      abi: CASTBET_ABI,
      functionName: 'createMarket',
      args: [
        question,
        description,
        {
          castHash: farcasterContext.castHash || '',
          fid: BigInt(farcasterContext.fid || 0),
          channel: farcasterContext.channel || '',
        },
        resolutionTimestamp,
        oracleTypeEnum,
      ],
    });
  };

  return useMutation({
    mutationFn: mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nextMarketId'] });
    },
  });
}

// Helper function to parse market data from contract
function parseMarket(data: any, marketId: number | bigint): Market {
  return {
    marketId: BigInt(marketId),
    creator: data.creator,
    question: data.question,
    description: data.description,
    farcasterContext: {
      castHash: data.farcasterContext.castHash || undefined,
      fid: Number(data.farcasterContext.fid) || undefined,
      channel: data.farcasterContext.channel || undefined,
    },
    createdAt: Number(data.createdAt),
    resolutionTime: Number(data.resolutionTime),
    resolvedAt: Number(data.resolvedAt) || undefined,
    oracleType: data.oracleType === 0 ? OracleType.Social : OracleType.Automated,
    status: data.status === 0 ? MarketStatus.Active : data.status === 1 ? MarketStatus.Resolved : MarketStatus.Cancelled,
    yesPool: data.yesPool,
    noPool: data.noPool,
    totalYesShares: data.totalYesShares,
    totalNoShares: data.totalNoShares,
    totalVolume: data.totalVolume,
    oracleData: {
      yesVotes: data.oracleData.yesVotes,
      noVotes: data.oracleData.noVotes,
      totalVoters: Number(data.oracleData.totalVoters),
      resolvedOutcome: data.oracleData.resolvedOutcome,
      resolved: data.oracleData.resolved,
    },
  };
}

// Hook to get multiple markets (you'll need to implement events indexing or backend)
export function useMarkets() {
  const { data: nextId } = useNextMarketId();

  // For now, we'll fetch markets sequentially
  // In production, use event indexing (The Graph, etc.)
  const queries = useQuery({
    queryKey: ['markets', nextId],
    queryFn: async () => {
      if (!nextId) return [];

      const markets: Market[] = [];
      const maxId = Number(nextId);

      // Fetch last 20 markets
      const startId = Math.max(1, maxId - 20);

      for (let i = startId; i < maxId; i++) {
        try {
          const market = await fetch(`/api/market/${i}`).then(r => r.json());
          if (market) markets.push(market);
        } catch (e) {
          // Market doesn't exist or error
        }
      }

      return markets;
    },
    enabled: !!nextId,
    refetchInterval: 10000,
  });

  return queries;
}

export function useActiveMarkets() {
  const { data: markets, ...rest } = useMarkets();
  return {
    data: markets?.filter(m => m.status === MarketStatus.Active),
    ...rest,
  };
}

export function useResolvedMarkets() {
  const { data: markets, ...rest } = useMarkets();
  return {
    data: markets?.filter(m => m.status === MarketStatus.Resolved),
    ...rest,
  };
}
