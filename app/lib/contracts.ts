export const CASTBET_ADDRESS = (process.env.NEXT_PUBLIC_CASTBET_ADDRESS || '0x') as `0x${string}`;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x') as `0x${string}`;

export const CASTBET_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_usdc', type: 'address' },
      { name: '_protocolFeeBps', type: 'uint256' }
    ],
  },
  {
    type: 'function',
    name: 'createMarket',
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'description', type: 'string' },
      {
        name: 'farcasterContext',
        type: 'tuple',
        components: [
          { name: 'castHash', type: 'string' },
          { name: 'fid', type: 'uint256' },
          { name: 'channel', type: 'string' }
        ]
      },
      { name: 'resolutionTime', type: 'uint256' },
      { name: 'oracleType', type: 'uint8' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'placeBet',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'outcome', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
      { name: 'minShares', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'sellShares',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'outcome', type: 'uint8' },
      { name: 'shares', type: 'uint256' },
      { name: 'minAmount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'voteOutcome',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'outcome', type: 'uint8' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'resolveMarket',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimWinnings',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelMarket',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getMarket',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'marketId', type: 'uint256' },
          { name: 'creator', type: 'address' },
          { name: 'question', type: 'string' },
          { name: 'description', type: 'string' },
          {
            name: 'farcasterContext',
            type: 'tuple',
            components: [
              { name: 'castHash', type: 'string' },
              { name: 'fid', type: 'uint256' },
              { name: 'channel', type: 'string' }
            ]
          },
          { name: 'createdAt', type: 'uint256' },
          { name: 'resolutionTime', type: 'uint256' },
          { name: 'resolvedAt', type: 'uint256' },
          { name: 'oracleType', type: 'uint8' },
          { name: 'status', type: 'uint8' },
          { name: 'yesPool', type: 'uint256' },
          { name: 'noPool', type: 'uint256' },
          { name: 'totalYesShares', type: 'uint256' },
          { name: 'totalNoShares', type: 'uint256' },
          { name: 'totalVolume', type: 'uint256' },
          {
            name: 'oracleData',
            type: 'tuple',
            components: [
              { name: 'yesVotes', type: 'uint256' },
              { name: 'noVotes', type: 'uint256' },
              { name: 'totalVoters', type: 'uint256' },
              { name: 'resolvedOutcome', type: 'uint8' },
              { name: 'resolved', type: 'bool' }
            ]
          }
        ]
      }
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPosition',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'user', type: 'address' }
    ],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'yesShares', type: 'uint256' },
          { name: 'noShares', type: 'uint256' },
          { name: 'claimed', type: 'bool' }
        ]
      }
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMarketPrices',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      { name: 'yesPrice', type: 'uint256' },
      { name: 'noPrice', type: 'uint256' }
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextMarketId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'MarketCreated',
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'question', type: 'string', indexed: false },
      { name: 'resolutionTime', type: 'uint256', indexed: false },
      { name: 'oracleType', type: 'uint8', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'BetPlaced',
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'outcome', type: 'uint8', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'shares', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ],
  },
  {
    type: 'event',
    name: 'MarketResolved',
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
      { name: 'outcome', type: 'uint8', indexed: false },
      { name: 'yesVotes', type: 'uint256', indexed: false },
      { name: 'noVotes', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ],
  },
] as const;

export const USDC_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'faucet',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;
