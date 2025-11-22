# CastBet - Social Prediction Markets on Farcaster 🎯

CastBet is a decentralized prediction market platform built with **Solidity** and **EVM**, designed specifically for the Farcaster ecosystem. Create and participate in prediction markets about social events, casts, channels, and community trends using any EVM-compatible wallet.

## 🎯 Features

### Smart Contract (Solidity)
- **Binary Prediction Markets**: YES/NO outcomes with USDC collateral
- **Constant Product AMM**: Automated market maker for price discovery
- **Social Oracle**: Community-driven resolution via weighted voting
- **Slippage Protection**: Minimum share guarantees for all trades
- **Protocol Fees**: Configurable fee system (max 5%)
- **Position Management**: Buy, sell, and claim winnings seamlessly
- **Security**: ReentrancyGuard, Pausable, Ownable patterns
- **Gas Optimized**: Efficient Solidity with minimal storage

### Frontend (Next.js + TypeScript)
- **EVM Wallet Support**: MetaMask, WalletConnect, Coinbase Wallet via RainbowKit
- **Real-time Updates**: Live market data with wagmi + React Query
- **Responsive Design**: Mobile-first with TailwindCSS
- **Farcaster Context**: Deep integration with casts, channels, and FIDs
- **User Positions**: Track your bets and P&L in real-time
- **Multi-chain**: Deploy on Base, Optimism, Arbitrum, or any EVM chain

## 🏗️ Architecture

### Smart Contract Structure

```
contracts/CastBet.sol (~480 lines)
├── Core Functions
│   ├── createMarket          - Create new prediction market
│   ├── placeBet              - Buy YES/NO shares
│   ├── sellShares            - Exit positions
│   ├── voteOutcome           - Vote on resolution (shareholders)
│   ├── resolveMarket         - Finalize outcome
│   ├── claimWinnings         - Collect payouts
│   └── cancelMarket          - Creator cancellation
├── State
│   ├── Market (struct)       - Market data & pools
│   ├── Position (struct)     - User share holdings
│   └── Vote (struct)         - Oracle vote records
├── AMM Logic
│   ├── _calculateShares      - Price discovery
│   └── _calculatePayout      - Exit pricing
└── Admin
    ├── setProtocolFee        - Update fees
    ├── pause/unpause         - Emergency controls
    └── Ownable               - Access control
```

### Frontend Structure

```
app/
├── components/
│   ├── MarketCard.tsx         - Market preview cards
│   ├── BetPanel.tsx           - Trading interface
│   └── CreateMarketForm.tsx   - Market creation
├── hooks/
│   ├── useMarkets.ts          - Market queries (wagmi)
│   ├── useBetting.ts          - Betting operations (wagmi)
│   └── usePosition.ts         - Position management (wagmi)
├── lib/
│   ├── contracts.ts           - ABIs & addresses
│   └── providers.tsx          - Wagmi + RainbowKit setup
└── pages/
    ├── page.tsx               - Market list
    └── market/[id]/page.tsx   - Market details
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- EVM wallet (MetaMask, etc.)
- USDC on Base Sepolia (testnet) or your preferred chain

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd CastBet

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Start local node (separate terminal)
npx hardhat node

# Deploy contracts (localhost)
npx hardhat run scripts/deploy.ts --network localhost

# Start frontend
npm run dev
```

### Configuration

1. **Environment Variables**: Create `.env` file:

```bash
# Deployment
PRIVATE_KEY=your_private_key_here

# RPCs
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_RPC_URL=https://mainnet.base.org

# Block Explorers
BASESCAN_API_KEY=your_api_key

# Frontend
NEXT_PUBLIC_CASTBET_ADDRESS=deployed_contract_address
NEXT_PUBLIC_USDC_ADDRESS=usdc_token_address
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

2. **Deploy to Base Sepolia**:

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

3. **Update Frontend**: Copy contract addresses to `.env`

## 📖 How It Works

### 1. Market Creation

Anyone can create a prediction market by providing:
- **Question**: What's being predicted (max 200 chars)
- **Description**: Resolution criteria (max 1000 chars)
- **Farcaster Context**: Cast hash, FID, or channel (optional)
- **Resolution Time**: When voting period begins
- **Oracle Type**: Social (voting) or Automated

### 2. Trading

Users buy YES or NO shares using USDC:
- **Price Discovery**: Constant product AMM determines prices
- **Pool Ratio**: `YES price = NO pool / Total pool`
- **Slippage Protection**: Set minimum shares to receive
- **Exit Anytime**: Sell shares back to the pool before resolution
- **Approval Required**: First approve USDC spending to contract

### 3. Resolution

After the resolution time:
1. **Voting Period** (24 hours): Shareholders vote weighted by holdings
2. **Resolution**: Anyone can finalize after voting period
3. **Payout**: Winning shares = $1 each, minus protocol fee

### 4. Example Scenario

```
Market: "Will @dwr.eth cast about AI this week?"
Initial State: 0 YES pool, 0 NO pool

Alice bets 100 USDC on YES
→ Gets 100 YES shares (1:1 initial)
→ State: 100 YES pool, 0 NO pool

Bob bets 50 USDC on NO
→ Gets ~33 NO shares (AMM pricing)
→ State: 100 YES pool, 50 NO pool

Resolution time arrives:
- Alice votes YES (100 voting power)
- Bob votes NO (33 voting power)
- Market resolves: YES wins

Alice claims:
- Initial 100 USDC back
- Plus her share of Bob's 50 USDC
- Minus 3% protocol fee
- Total: ~145 USDC payout
```

## 🧪 Testing

The test suite covers 25+ scenarios:

```bash
npx hardhat test
```

Test categories:
1. ✅ Protocol initialization with fee validation
2. ✅ Market creation with validation
3. ✅ Betting (YES/NO) with slippage protection
4. ✅ Selling shares with sufficient balance checks
5. ✅ Voting mechanism and double-vote prevention
6. ✅ Market resolution with tie handling
7. ✅ Claiming winnings with fee calculation
8. ✅ Market cancellation permissions
9. ✅ Admin functions (pause/unpause)
10. ✅ Gas optimization verification

Coverage report:
```bash
npx hardhat coverage
```

## 🔒 Security Considerations

### Smart Contract
- ✅ ReentrancyGuard on all state-changing functions
- ✅ Ownership checks on privileged operations
- ✅ Slippage protection on trades
- ✅ SafeERC20 for token transfers
- ✅ Integer overflow protection (Solidity 0.8+)
- ✅ Fee cap at 5% (protocol-level)
- ✅ Pausable for emergency stops
- ✅ No proxy patterns (immutable logic)

### Recommended Audits
Before mainnet deployment:
- [ ] Smart contract audit (e.g., OpenZeppelin, Trail of Bits)
- [ ] Economic model review
- [ ] Frontend security review
- [ ] Integration testing with real USDC
- [ ] Penetration testing

## 📊 Economics

### Fee Structure
- Protocol fee: 3% (configurable by owner, max 5%)
- Applied only on winnings, not principal
- Distributed to contract owner

### Market Mechanics
- **Full Collateralization**: Every $1 in pools backed by $1 USDC
- **Zero-Sum**: Total payouts = Total deposits - Fees
- **Price Efficiency**: AMM ensures prices sum to ~$1

## 🌐 Supported Networks

CastBet can be deployed on any EVM-compatible chain:

- ✅ **Base** (Recommended - lowest fees, Farcaster ecosystem)
- ✅ **Base Sepolia** (Testnet)
- ✅ **Optimism** (Low fees, scaling)
- ✅ **Arbitrum** (Low fees, scaling)
- ✅ **Ethereum Mainnet** (High fees)

USDC Addresses:
- Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Base Sepolia: Deploy MockUSDC for testing
- Optimism: `0x7F5c764cBc14f9669B88837ca1490cCa17c31607`
- Arbitrum: `0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8`

## 🛣️ Roadmap

### Phase 1: MVP ✅
- [x] Core smart contract (Solidity)
- [x] Basic frontend (wagmi/viem)
- [x] Market creation & betting
- [x] Social oracle voting
- [x] Comprehensive test suite (25+ tests)

### Phase 2: Enhancement
- [ ] Automated oracle via Farcaster API
- [ ] The Graph subgraph for efficient querying
- [ ] Market categories & filtering
- [ ] User profiles & leaderboards
- [ ] Market charts & analytics
- [ ] Mobile app (React Native)

### Phase 3: Advanced
- [ ] Multi-outcome markets (>2 options)
- [ ] Liquidity mining rewards
- [ ] DAO governance token
- [ ] Cross-chain deployment
- [ ] Farcaster Frames v2 integration
- [ ] Conditional markets (if X then Y)

## 🤝 Contributing

Contributions are welcome! Areas of focus:
- Smart contract optimizations
- Frontend UX improvements
- Additional oracle types
- Subgraph development
- Documentation
- Bug reports

## 📜 License

MIT License - see LICENSE file

## 🔗 Links

- **Farcaster**: [farcaster.xyz](https://farcaster.xyz)
- **Base**: [base.org](https://base.org)
- **Wagmi**: [wagmi.sh](https://wagmi.sh)
- **RainbowKit**: [rainbowkit.com](https://rainbowkit.com)
- **Polymarket Docs**: [docs.polymarket.com](https://docs.polymarket.com)

## 💡 Inspiration

CastBet is inspired by:
- **Polymarket**: Peer-to-peer prediction markets
- **Farcaster**: Decentralized social protocol
- **Augur**: Decentralized oracle and prediction market protocol
- **Gnosis Conditional Tokens**: Multi-outcome prediction markets

---

**Built with ❤️ for the Farcaster community on Base**

*Deploy on Base for the lowest fees and best Farcaster integration!*
