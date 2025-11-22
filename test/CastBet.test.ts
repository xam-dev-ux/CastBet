import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { CastBet, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CastBet", function () {
  // Enums matching contract
  enum Outcome {
    None = 0,
    Yes = 1,
    No = 2,
  }

  enum MarketStatus {
    Active = 0,
    Resolved = 1,
    Cancelled = 2,
  }

  enum OracleType {
    Social = 0,
    Automated = 1,
  }

  async function deployFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();

    // Deploy CastBet
    const protocolFeeBps = 300; // 3%
    const CastBet = await ethers.getContractFactory("CastBet");
    const castbet = await CastBet.deploy(await usdc.getAddress(), protocolFeeBps);

    // Mint USDC to users
    const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
    await usdc.mint(user1.address, mintAmount);
    await usdc.mint(user2.address, mintAmount);
    await usdc.mint(user3.address, mintAmount);

    return { castbet, usdc, owner, user1, user2, user3 };
  }

  describe("1. Protocol Initialization", function () {
    it("should initialize with correct parameters", async function () {
      const { castbet, usdc, owner } = await loadFixture(deployFixture);

      expect(await castbet.usdc()).to.equal(await usdc.getAddress());
      expect(await castbet.protocolFeeBps()).to.equal(300);
      expect(await castbet.owner()).to.equal(owner.address);
      expect(await castbet.nextMarketId()).to.equal(1);
    });

    it("should reject fee over 5%", async function () {
      const { usdc } = await loadFixture(deployFixture);

      const highFeeBps = 600; // 6%
      const CastBet = await ethers.getContractFactory("CastBet");

      await expect(
        CastBet.deploy(await usdc.getAddress(), highFeeBps)
      ).to.be.revertedWithCustomError(CastBet, "FeeTooHigh");
    });

    it("should allow owner to update protocol fee", async function () {
      const { castbet } = await loadFixture(deployFixture);

      const newFee = 200; // 2%
      await castbet.setProtocolFee(newFee);

      expect(await castbet.protocolFeeBps()).to.equal(newFee);
    });
  });

  describe("2. Market Creation", function () {
    it("should create a new market", async function () {
      const { castbet, user1 } = await loadFixture(deployFixture);

      const question = "Will this cast reach 1000 likes?";
      const description = "Market resolves YES if the cast reaches 1000 likes by the deadline.";
      const resolutionTime = (await time.latest()) + 86400; // 24 hours from now

      await expect(
        castbet.connect(user1).createMarket(
          question,
          description,
          { castHash: "0xabcd", fid: 12345, channel: "crypto" },
          resolutionTime,
          OracleType.Social
        )
      )
        .to.emit(castbet, "MarketCreated")
        .withArgs(1, user1.address, question, resolutionTime, OracleType.Social);

      const market = await castbet.getMarket(1);
      expect(market.question).to.equal(question);
      expect(market.description).to.equal(description);
      expect(market.creator).to.equal(user1.address);
      expect(market.status).to.equal(MarketStatus.Active);
      expect(await castbet.nextMarketId()).to.equal(2);
    });

    it("should reject question over 200 chars", async function () {
      const { castbet, user1 } = await loadFixture(deployFixture);

      const longQuestion = "a".repeat(201);
      const resolutionTime = (await time.latest()) + 86400;

      await expect(
        castbet.connect(user1).createMarket(
          longQuestion,
          "Description",
          { castHash: "", fid: 0, channel: "" },
          resolutionTime,
          OracleType.Social
        )
      ).to.be.revertedWithCustomError(castbet, "QuestionTooLong");
    });

    it("should reject resolution time in the past", async function () {
      const { castbet, user1 } = await loadFixture(deployFixture);

      const pastTime = (await time.latest()) - 3600; // 1 hour ago

      await expect(
        castbet.connect(user1).createMarket(
          "Question",
          "Description",
          { castHash: "", fid: 0, channel: "" },
          pastTime,
          OracleType.Social
        )
      ).to.be.revertedWithCustomError(castbet, "InvalidResolutionTime");
    });
  });

  describe("3. Betting", function () {
    async function setupMarket() {
      const fixture = await loadFixture(deployFixture);
      const { castbet, usdc, user1 } = fixture;

      const resolutionTime = (await time.latest()) + 86400;
      await castbet.connect(user1).createMarket(
        "Test market",
        "Description",
        { castHash: "", fid: 0, channel: "" },
        resolutionTime,
        OracleType.Social
      );

      return { ...fixture, marketId: 1 };
    }

    it("should place a YES bet", async function () {
      const { castbet, usdc, user1, marketId } = await setupMarket();

      const betAmount = ethers.parseUnits("100", 6); // 100 USDC
      await usdc.connect(user1).approve(await castbet.getAddress(), betAmount);

      await expect(
        castbet.connect(user1).placeBet(marketId, Outcome.Yes, betAmount, 1)
      )
        .to.emit(castbet, "BetPlaced")
        .withArgs(marketId, user1.address, Outcome.Yes, betAmount, betAmount, await time.latest() + 1);

      const market = await castbet.getMarket(marketId);
      expect(market.yesPool).to.equal(betAmount);
      expect(market.totalVolume).to.equal(betAmount);

      const position = await castbet.getPosition(marketId, user1.address);
      expect(position.yesShares).to.be.greaterThan(0);
    });

    it("should place a NO bet from different user", async function () {
      const { castbet, usdc, user1, user2, marketId } = await setupMarket();

      // User1 bets YES first
      const bet1 = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await castbet.getAddress(), bet1);
      await castbet.connect(user1).placeBet(marketId, Outcome.Yes, bet1, 1);

      // User2 bets NO
      const bet2 = ethers.parseUnits("50", 6);
      await usdc.connect(user2).approve(await castbet.getAddress(), bet2);
      await castbet.connect(user2).placeBet(marketId, Outcome.No, bet2, 1);

      const market = await castbet.getMarket(marketId);
      expect(market.noPool).to.equal(bet2);
      expect(market.totalVolume).to.equal(bet1 + bet2);
    });

    it("should reject bet with zero amount", async function () {
      const { castbet, user1, marketId } = await setupMarket();

      await expect(
        castbet.connect(user1).placeBet(marketId, Outcome.Yes, 0, 0)
      ).to.be.revertedWithCustomError(castbet, "InvalidAmount");
    });

    it("should enforce slippage protection", async function () {
      const { castbet, usdc, user1, marketId } = await setupMarket();

      const betAmount = ethers.parseUnits("10", 6);
      const unrealisticMinShares = ethers.parseUnits("1000", 6);

      await usdc.connect(user1).approve(await castbet.getAddress(), betAmount);

      await expect(
        castbet.connect(user1).placeBet(marketId, Outcome.Yes, betAmount, unrealisticMinShares)
      ).to.be.revertedWithCustomError(castbet, "SlippageExceeded");
    });
  });

  describe("4. Selling Shares", function () {
    async function setupMarketWithBets() {
      const fixture = await setupMarket();
      const { castbet, usdc, user1 } = fixture;

      const betAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await castbet.getAddress(), betAmount);
      await castbet.connect(user1).placeBet(1, Outcome.Yes, betAmount, 1);

      return fixture;
    }

    async function setupMarket() {
      const fixture = await loadFixture(deployFixture);
      const { castbet, user1 } = fixture;

      const resolutionTime = (await time.latest()) + 86400;
      await castbet.connect(user1).createMarket(
        "Test market",
        "Description",
        { castHash: "", fid: 0, channel: "" },
        resolutionTime,
        OracleType.Social
      );

      return { ...fixture, marketId: 1 };
    }

    it("should sell shares", async function () {
      const { castbet, user1, marketId } = await setupMarketWithBets();

      const position = await castbet.getPosition(marketId, user1.address);
      const sharesToSell = position.yesShares / 2n;

      await castbet.connect(user1).sellShares(marketId, Outcome.Yes, sharesToSell, 1);

      const updatedPosition = await castbet.getPosition(marketId, user1.address);
      expect(updatedPosition.yesShares).to.be.lessThan(position.yesShares);
    });

    it("should reject selling more shares than owned", async function () {
      const { castbet, user1, marketId } = await setupMarketWithBets();

      const position = await castbet.getPosition(marketId, user1.address);
      const tooManyShares = position.yesShares + ethers.parseUnits("1", 6);

      await expect(
        castbet.connect(user1).sellShares(marketId, Outcome.Yes, tooManyShares, 1)
      ).to.be.revertedWithCustomError(castbet, "InsufficientShares");
    });
  });

  describe("5. Voting and Resolution", function () {
    async function setupExpiredMarket() {
      const fixture = await loadFixture(deployFixture);
      const { castbet, usdc, user1, user2 } = fixture;

      const resolutionTime = (await time.latest()) + 3600; // 1 hour
      await castbet.connect(user1).createMarket(
        "Test market",
        "Description",
        { castHash: "", fid: 0, channel: "" },
        resolutionTime,
        OracleType.Social
      );

      // Place bets
      const bet = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await castbet.getAddress(), bet);
      await castbet.connect(user1).placeBet(1, Outcome.Yes, bet, 1);

      await usdc.connect(user2).approve(await castbet.getAddress(), bet);
      await castbet.connect(user2).placeBet(1, Outcome.No, bet, 1);

      // Fast forward past resolution time
      await time.increase(3601);

      return { ...fixture, marketId: 1 };
    }

    it("should allow voting after market expiry", async function () {
      const { castbet, user1, marketId } = await setupExpiredMarket();

      await expect(castbet.connect(user1).voteOutcome(marketId, Outcome.Yes))
        .to.emit(castbet, "VoteCast");

      const market = await castbet.getMarket(marketId);
      expect(market.oracleData.yesVotes).to.be.greaterThan(0);
      expect(market.oracleData.totalVoters).to.equal(1);
    });

    it("should reject double voting", async function () {
      const { castbet, user1, marketId } = await setupExpiredMarket();

      await castbet.connect(user1).voteOutcome(marketId, Outcome.Yes);

      await expect(
        castbet.connect(user1).voteOutcome(marketId, Outcome.No)
      ).to.be.revertedWithCustomError(castbet, "AlreadyVoted");
    });

    it("should reject voting before expiry", async function () {
      const fixture = await loadFixture(deployFixture);
      const { castbet, usdc, user1 } = fixture;

      const resolutionTime = (await time.latest()) + 86400;
      await castbet.connect(user1).createMarket(
        "Test market",
        "Description",
        { castHash: "", fid: 0, channel: "" },
        resolutionTime,
        OracleType.Social
      );

      const bet = ethers.parseUnits("100", 6);
      await usdc.connect(user1).approve(await castbet.getAddress(), bet);
      await castbet.connect(user1).placeBet(1, Outcome.Yes, bet, 1);

      await expect(
        castbet.connect(user1).voteOutcome(1, Outcome.Yes)
      ).to.be.revertedWithCustomError(castbet, "MarketNotExpired");
    });

    it("should resolve market after voting period", async function () {
      const { castbet, user1, user2, marketId } = await setupExpiredMarket();

      // Both users vote YES
      await castbet.connect(user1).voteOutcome(marketId, Outcome.Yes);
      await castbet.connect(user2).voteOutcome(marketId, Outcome.Yes);

      // Fast forward 24 hours for voting period
      await time.increase(86400);

      await expect(castbet.resolveMarket(marketId))
        .to.emit(castbet, "MarketResolved")
        .withArgs(marketId, Outcome.Yes, await (await castbet.getMarket(marketId)).oracleData.yesVotes, 0, await time.latest() + 1);

      const market = await castbet.getMarket(marketId);
      expect(market.status).to.equal(MarketStatus.Resolved);
      expect(market.oracleData.resolvedOutcome).to.equal(Outcome.Yes);
    });
  });

  describe("6. Claiming Winnings", function () {
    async function setupResolvedMarket() {
      const fixture = await loadFixture(deployFixture);
      const { castbet, usdc, user1, user2 } = fixture;

      const resolutionTime = (await time.latest()) + 3600;
      await castbet.connect(user1).createMarket(
        "Test market",
        "Description",
        { castHash: "", fid: 0, channel: "" },
        resolutionTime,
        OracleType.Social
      );

      // Place bets
      const betYes = ethers.parseUnits("100", 6);
      const betNo = ethers.parseUnits("50", 6);

      await usdc.connect(user1).approve(await castbet.getAddress(), betYes);
      await castbet.connect(user1).placeBet(1, Outcome.Yes, betYes, 1);

      await usdc.connect(user2).approve(await castbet.getAddress(), betNo);
      await castbet.connect(user2).placeBet(1, Outcome.No, betNo, 1);

      // Resolve market (YES wins)
      await time.increase(3601);
      await castbet.connect(user1).voteOutcome(1, Outcome.Yes);
      await castbet.connect(user2).voteOutcome(1, Outcome.Yes);

      await time.increase(86400);
      await castbet.resolveMarket(1);

      return { ...fixture, marketId: 1 };
    }

    it("should allow winner to claim winnings", async function () {
      const { castbet, user1, marketId } = await setupResolvedMarket();

      const balanceBefore = await (await ethers.getContractAt("MockUSDC", await castbet.usdc())).balanceOf(user1.address);

      await expect(castbet.connect(user1).claimWinnings(marketId))
        .to.emit(castbet, "WinningsClaimed");

      const balanceAfter = await (await ethers.getContractAt("MockUSDC", await castbet.usdc())).balanceOf(user1.address);
      expect(balanceAfter).to.be.greaterThan(balanceBefore);

      const position = await castbet.getPosition(marketId, user1.address);
      expect(position.claimed).to.be.true;
    });

    it("should reject double claim", async function () {
      const { castbet, user1, marketId } = await setupResolvedMarket();

      await castbet.connect(user1).claimWinnings(marketId);

      await expect(
        castbet.connect(user1).claimWinnings(marketId)
      ).to.be.revertedWithCustomError(castbet, "AlreadyClaimed");
    });

    it("should reject claim for loser", async function () {
      const { castbet, user2, marketId } = await setupResolvedMarket();

      await expect(
        castbet.connect(user2).claimWinnings(marketId)
      ).to.be.revertedWithCustomError(castbet, "NoWinningShares");
    });
  });

  describe("7. Market Cancellation", function () {
    it("should allow creator to cancel market with no bets", async function () {
      const { castbet, user1 } = await loadFixture(deployFixture);

      const resolutionTime = (await time.latest()) + 86400;
      await castbet.connect(user1).createMarket(
        "Test market",
        "Description",
        { castHash: "", fid: 0, channel: "" },
        resolutionTime,
        OracleType.Social
      );

      await expect(castbet.connect(user1).cancelMarket(1))
        .to.emit(castbet, "MarketCancelled");

      const market = await castbet.getMarket(1);
      expect(market.status).to.equal(MarketStatus.Cancelled);
    });

    it("should reject cancellation by non-creator", async function () {
      const { castbet, user1, user2 } = await loadFixture(deployFixture);

      const resolutionTime = (await time.latest()) + 86400;
      await castbet.connect(user1).createMarket(
        "Test market",
        "Description",
        { castHash: "", fid: 0, channel: "" },
        resolutionTime,
        OracleType.Social
      );

      await expect(
        castbet.connect(user2).cancelMarket(1)
      ).to.be.revertedWithCustomError(castbet, "Unauthorized");
    });
  });

  describe("8. Admin Functions", function () {
    it("should allow owner to pause/unpause", async function () {
      const { castbet, owner } = await loadFixture(deployFixture);

      await castbet.connect(owner).pause();
      expect(await castbet.paused()).to.be.true;

      await castbet.connect(owner).unpause();
      expect(await castbet.paused()).to.be.false;
    });

    it("should reject operations when paused", async function () {
      const { castbet, owner, user1 } = await loadFixture(deployFixture);

      await castbet.connect(owner).pause();

      const resolutionTime = (await time.latest()) + 86400;
      await expect(
        castbet.connect(user1).createMarket(
          "Test",
          "Desc",
          { castHash: "", fid: 0, channel: "" },
          resolutionTime,
          OracleType.Social
        )
      ).to.be.revertedWithCustomError(castbet, "EnforcedPause");
    });
  });
});
