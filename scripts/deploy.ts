import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying CastBet contracts...\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Network:", network.name, "- Chain ID:", network.chainId.toString());

  let usdcAddress: string;

  // Use real USDC on mainnet/base, deploy mock on testnets
  if (network.chainId === 8453n) {
    // Base Mainnet - Use real USDC
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("\n💰 Using Base Mainnet USDC:", usdcAddress);
  } else if (network.chainId === 84532n) {
    // Base Sepolia - Deploy MockUSDC
    console.log("\n📄 Deploying MockUSDC for testnet...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("✅ MockUSDC deployed to:", usdcAddress);
  } else {
    // Other networks - Deploy MockUSDC
    console.log("\n📄 Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("✅ MockUSDC deployed to:", usdcAddress);
  }

  // Deploy CastBet
  console.log("\n📄 Deploying CastBet...");
  const protocolFeeBps = 300; // 3%
  const CastBet = await ethers.getContractFactory("CastBet");
  const castbet = await CastBet.deploy(usdcAddress, protocolFeeBps);
  await castbet.waitForDeployment();
  const castbetAddress = await castbet.getAddress();
  console.log("✅ CastBet deployed to:", castbetAddress);

  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Contract Addresses:");
  console.log("=======================");
  console.log("USDC:", usdcAddress);
  console.log("CastBet:", castbetAddress);
  console.log("\n💡 Save these addresses to your .env file:");
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${usdcAddress}`);
  console.log(`NEXT_PUBLIC_CASTBET_ADDRESS=${castbetAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
