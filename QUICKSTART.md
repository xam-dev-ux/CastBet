# CastBet - Quick Start Guide 🚀

Get CastBet running in 5 minutes with EVM wallets!

## ⚡ Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Compile Contracts

```bash
npx hardhat compile
```

### 3. Run Tests

```bash
npx hardhat test
```

Expected output:
```
  CastBet
    1. Protocol Initialization
      ✔ should initialize with correct parameters
      ✔ should reject fee over 5%
      ✔ should allow owner to update protocol fee
    2. Market Creation
      ✔ should create a new market
      ✔ should reject question over 200 chars
      ...

  25 passing
```

### 4. Deploy Locally

Terminal 1 - Start local node:
```bash
npx hardhat node
```

Terminal 2 - Deploy contracts:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

Save the output addresses:
```
✅ MockUSDC deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ CastBet deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

### 5. Configure Frontend

Create `.env.local`:
```bash
NEXT_PUBLIC_CASTBET_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_USDC_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

Get WalletConnect Project ID: https://cloud.walletconnect.com/

### 6. Start Frontend

```bash
npm run dev
```

Open http://localhost:3000

### 7. Connect Wallet

1. Click "Connect Wallet" button (RainbowKit)
2. Select wallet (MetaMask, WalletConnect, etc.)
3. Switch to Localhost network (Chain ID: 1337)
4. Approve connection

### 8. Get Test USDC

In Hardhat console or create a script:
```javascript
const usdc = await ethers.getContractAt("MockUSDC", "0x5FbDB...");
await usdc.faucet(ethers.parseUnits("1000", 6)); // 1000 USDC
```

Or call `faucet()` function directly from the contract using etherscan-like interface.

## 🎯 Test the App

### Create Your First Market

1. Click "Create Market" button
2. Fill in the form:
   - Question: "Will @vitalik.eth post about Ethereum this week?"
   - Description: "Resolves YES if Vitalik posts about ETH by Friday"
   - Resolution Time: 7 days
   - Oracle: Social
3. Click "Create Market"
4. Approve MetaMask transaction

### Place a Bet

1. Click on a market card
2. Select YES or NO
3. Enter amount (e.g., 100 USDC)
4. First time: Approve USDC spending
5. Click "Bet YES" or "Bet NO"
6. Confirm transaction

### Vote & Resolve (After Market Expires)

1. Wait for resolution time (or fast-forward time in local node)
2. Click "Vote YES" or "Vote NO"
3. After 24h voting period, click "Resolve Market"
4. Winners can claim winnings

## 🌐 Deploy to Base Sepolia (Testnet)

### 1. Setup

Get Base Sepolia ETH: https://www.coinbase.com/faucets

Create `.env`:
```bash
PRIVATE_KEY=your_private_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

### 2. Deploy

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

### 3. Verify Contracts

```bash
npx hardhat verify --network baseSepolia CASTBET_ADDRESS "USDC_ADDRESS" 300
```

### 4. Update Frontend

Update `.env.local` with deployed addresses and restart frontend.

## 🔧 Troubleshooting

### "Insufficient funds"
- Get more ETH from faucet
- Ensure wallet has USDC (call `faucet()` on MockUSDC)

### "User rejected transaction"
- Try again
- Check gas settings in wallet

### "Contract not deployed"
- Ensure you ran `npx hardhat node` and `deploy.ts`
- Check contract addresses in `.env.local`

### "Wallet not connecting"
- Clear browser cache
- Try different wallet
- Check you're on correct network (localhost/Base Sepolia)

### Frontend won't start
- Run `npm install` again
- Delete `.next` folder and restart
- Check Node.js version (need 18+)

## 📚 Next Steps

1. **Read the full README.md** for architecture details
2. **Explore the smart contract** in `contracts/CastBet.sol`
3. **Check the test suite** in `test/CastBet.test.ts`
4. **Customize the frontend** in `app/` directory
5. **Deploy to mainnet** when ready (Base recommended)

## 🚀 Deploy to Production

When ready for mainnet:

1. **Audit the smart contract** (mandatory!)
2. **Test thoroughly on testnets**
3. **Update USDC address** to mainnet USDC
4. **Deploy to Base** (lowest fees, Farcaster ecosystem)
5. **Verify contracts** on Basescan
6. **Update frontend** environment variables
7. **Deploy frontend** to Vercel/Netlify
8. **Configure Farcaster** integration

## 💡 Tips

- **Use Base** for lowest fees (~$0.01 per transaction)
- **Test on Base Sepolia** before mainnet
- **Enable gas reporter**: Set `REPORT_GAS=true` in `.env`
- **Get coverage report**: Run `npx hardhat coverage`
- **Monitor events**: Use block explorer to watch transactions

## 🎓 Learning Resources

- **Hardhat Docs**: https://hardhat.org/docs
- **Wagmi Docs**: https://wagmi.sh
- **RainbowKit Docs**: https://rainbowkit.com/docs
- **Base Docs**: https://docs.base.org
- **Farcaster Docs**: https://docs.farcaster.xyz

---

**Need help?** Open an issue on GitHub!

**Ready to ship?** Deploy to Base and share on Farcaster! 🎉
