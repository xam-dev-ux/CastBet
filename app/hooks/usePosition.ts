import { useReadContract, useAccount } from 'wagmi';
import { CASTBET_ABI, CASTBET_ADDRESS } from '../lib/contracts';
import { Position } from '../types';

export function usePosition(marketId: number | bigint) {
  const { address } = useAccount();

  const { data, ...rest } = useReadContract({
    address: CASTBET_ADDRESS,
    abi: CASTBET_ABI,
    functionName: 'getPosition',
    args: address && marketId ? [BigInt(marketId), address] : undefined,
    query: {
      enabled: !!address && marketId > 0,
      refetchInterval: 5000,
    },
  });

  return {
    data: data ? parsePosition(data) : null,
    ...rest,
  };
}

function parsePosition(data: any): Position {
  return {
    yesShares: data.yesShares,
    noShares: data.noShares,
    claimed: data.claimed,
  };
}

export function usePositionValue(position: Position | null, market: any) {
  if (!position || !market) {
    return { currentValue: 0, profitLoss: 0, profitLossPercent: 0 };
  }

  const yesShares = Number(position.yesShares) / 1e6;
  const noShares = Number(position.noShares) / 1e6;

  const yesPool = Number(market.yesPool) / 1e6;
  const noPool = Number(market.noPool) / 1e6;
  const totalYesShares = Number(market.totalYesShares) / 1e6;
  const totalNoShares = Number(market.totalNoShares) / 1e6;

  const yesValue = totalYesShares > 0 ? (yesShares / totalYesShares) * yesPool : 0;
  const noValue = totalNoShares > 0 ? (noShares / totalNoShares) * noPool : 0;
  const currentValue = yesValue + noValue;

  const totalInvested = yesShares + noShares;
  const profitLoss = currentValue - totalInvested;
  const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  return {
    currentValue,
    profitLoss,
    profitLossPercent,
  };
}
