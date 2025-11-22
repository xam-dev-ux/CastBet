export enum Outcome {
  None = 0,
  Yes = 1,
  No = 2,
}

export enum MarketStatus {
  Active = 0,
  Resolved = 1,
  Cancelled = 2,
}

export enum OracleType {
  Social = 0,
  Automated = 1,
}

export interface FarcasterContext {
  castHash?: string;
  fid?: number;
  channel?: string;
}

export interface OracleData {
  yesVotes: bigint;
  noVotes: bigint;
  totalVoters: number;
  resolvedOutcome: Outcome;
  resolved: boolean;
}

export interface Market {
  marketId: bigint;
  creator: string;
  question: string;
  description: string;
  farcasterContext: FarcasterContext;
  createdAt: number;
  resolutionTime: number;
  resolvedAt?: number;
  oracleType: OracleType;
  status: MarketStatus;
  yesPool: bigint;
  noPool: bigint;
  totalYesShares: bigint;
  totalNoShares: bigint;
  totalVolume: bigint;
  oracleData: OracleData;
}

export interface Position {
  yesShares: bigint;
  noShares: bigint;
  claimed: boolean;
}

export interface Vote {
  outcome: Outcome;
  votingPower: bigint;
  hasVoted: boolean;
}

// UI Types
export interface MarketCard {
  market: Market;
  yesPrice: number;
  noPrice: number;
  totalLiquidity: number;
  volume24h?: number;
}

export interface UserPosition {
  position: Position;
  market: Market;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export interface BetInput {
  marketId: string;
  outcome: Outcome;
  amount: number;
  slippage: number;
}

// Farcaster Types
export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  custody: string;
  verifications: string[];
}

export interface FarcasterCast {
  hash: string;
  author: FarcasterUser;
  text: string;
  timestamp: number;
  reactions: {
    likes: number;
    recasts: number;
    replies: number;
  };
}
