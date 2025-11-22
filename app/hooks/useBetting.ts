import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { parseUnits } from 'viem';
import { CASTBET_ABI, CASTBET_ADDRESS, USDC_ABI, USDC_ADDRESS } from '../lib/contracts';
import { Outcome } from '../types';

export function usePlaceBet() {
  const { writeContract, data: hash } = useWriteContract();
  const queryClient = useQueryClient();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  const mutate = async ({
    marketId,
    outcome,
    amount,
    slippage = 1,
  }: {
    marketId: number;
    outcome: Outcome;
    amount: number;
    slippage?: number;
  }) => {
    const amountWei = parseUnits(amount.toString(), 6); // USDC has 6 decimals
    const minShares = (amountWei * BigInt(100 - slippage)) / BigInt(100);

    return writeContract({
      address: CASTBET_ADDRESS,
      abi: CASTBET_ABI,
      functionName: 'placeBet',
      args: [
        BigInt(marketId),
        outcome === Outcome.Yes ? 1 : 2,
        amountWei,
        minShares,
      ],
    });
  };

  return useMutation({
    mutationFn: mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['position'] });
    },
  });
}

export function useSellShares() {
  const { writeContract, data: hash } = useWriteContract();
  const queryClient = useQueryClient();

  const mutate = async ({
    marketId,
    outcome,
    shares,
    slippage = 1,
  }: {
    marketId: number;
    outcome: Outcome;
    shares: number;
    slippage?: number;
  }) => {
    const sharesWei = parseUnits(shares.toString(), 6);
    const minAmount = (sharesWei * BigInt(100 - slippage)) / BigInt(100);

    return writeContract({
      address: CASTBET_ADDRESS,
      abi: CASTBET_ABI,
      functionName: 'sellShares',
      args: [
        BigInt(marketId),
        outcome === Outcome.Yes ? 1 : 2,
        sharesWei,
        minAmount,
      ],
    });
  };

  return useMutation({
    mutationFn: mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['position'] });
    },
  });
}

export function useVoteOutcome() {
  const { writeContract } = useWriteContract();
  const queryClient = useQueryClient();

  const mutate = async ({
    marketId,
    outcome,
  }: {
    marketId: number;
    outcome: Outcome;
  }) => {
    return writeContract({
      address: CASTBET_ADDRESS,
      abi: CASTBET_ABI,
      functionName: 'voteOutcome',
      args: [BigInt(marketId), outcome === Outcome.Yes ? 1 : 2],
    });
  };

  return useMutation({
    mutationFn: mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
    },
  });
}

export function useResolveMarket() {
  const { writeContract } = useWriteContract();
  const queryClient = useQueryClient();

  const mutate = async ({ marketId }: { marketId: number }) => {
    return writeContract({
      address: CASTBET_ADDRESS,
      abi: CASTBET_ABI,
      functionName: 'resolveMarket',
      args: [BigInt(marketId)],
    });
  };

  return useMutation({
    mutationFn: mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
    },
  });
}

export function useClaimWinnings() {
  const { writeContract } = useWriteContract();
  const queryClient = useQueryClient();

  const mutate = async ({ marketId }: { marketId: number }) => {
    return writeContract({
      address: CASTBET_ADDRESS,
      abi: CASTBET_ABI,
      functionName: 'claimWinnings',
      args: [BigInt(marketId)],
    });
  };

  return useMutation({
    mutationFn: mutate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['position'] });
    },
  });
}

export function useApproveUSDC() {
  const { writeContract } = useWriteContract();

  const mutate = async ({ amount }: { amount: bigint }) => {
    return writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [CASTBET_ADDRESS, amount],
    });
  };

  return useMutation({
    mutationFn: mutate,
  });
}
