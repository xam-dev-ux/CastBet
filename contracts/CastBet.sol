// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CastBet
 * @notice Social Prediction Markets for Farcaster
 * @dev Implements binary prediction markets with AMM pricing and social oracle resolution
 */
contract CastBet is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ========== STRUCTS ==========

    struct FarcasterContext {
        string castHash;
        uint256 fid;
        string channel;
    }

    struct Market {
        uint256 marketId;
        address creator;
        string question;
        string description;
        FarcasterContext farcasterContext;
        uint256 createdAt;
        uint256 resolutionTime;
        uint256 resolvedAt;
        OracleType oracleType;
        MarketStatus status;
        uint256 yesPool;
        uint256 noPool;
        uint256 totalYesShares;
        uint256 totalNoShares;
        uint256 totalVolume;
        OracleData oracleData;
    }

    struct OracleData {
        uint256 yesVotes;
        uint256 noVotes;
        uint256 totalVoters;
        Outcome resolvedOutcome;
        bool resolved;
    }

    struct Position {
        uint256 yesShares;
        uint256 noShares;
        bool claimed;
    }

    struct Vote {
        Outcome outcome;
        uint256 votingPower;
        bool hasVoted;
    }

    // ========== ENUMS ==========

    enum Outcome {
        None,
        Yes,
        No
    }

    enum MarketStatus {
        Active,
        Resolved,
        Cancelled
    }

    enum OracleType {
        Social,
        Automated
    }

    // ========== STATE VARIABLES ==========

    IERC20 public immutable usdc;
    uint256 public protocolFeeBps; // Basis points (100 = 1%)
    uint256 public constant MAX_FEE_BPS = 500; // 5% max
    uint256 public constant BPS_DIVISOR = 10000;

    uint256 public totalVolume;
    uint256 public totalMarkets;
    uint256 public nextMarketId;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(uint256 => mapping(address => Vote)) public votes;

    // ========== EVENTS ==========

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        uint256 resolutionTime,
        OracleType oracleType
    );

    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        Outcome outcome,
        uint256 amount,
        uint256 shares,
        uint256 timestamp
    );

    event SharesSold(
        uint256 indexed marketId,
        address indexed user,
        Outcome outcome,
        uint256 shares,
        uint256 payout,
        uint256 timestamp
    );

    event VoteCast(
        uint256 indexed marketId,
        address indexed user,
        Outcome outcome,
        uint256 votingPower,
        uint256 timestamp
    );

    event MarketResolved(
        uint256 indexed marketId,
        Outcome outcome,
        uint256 yesVotes,
        uint256 noVotes,
        uint256 timestamp
    );

    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount,
        uint256 fee,
        uint256 timestamp
    );

    event MarketCancelled(uint256 indexed marketId, uint256 timestamp);
    event ProtocolFeeUpdated(uint256 newFeeBps);

    // ========== ERRORS ==========

    error FeeTooHigh();
    error QuestionTooLong();
    error DescriptionTooLong();
    error InvalidResolutionTime();
    error InvalidAmount();
    error MarketNotActive();
    error MarketExpired();
    error SlippageExceeded();
    error InsufficientShares();
    error InvalidOracleType();
    error MarketNotExpired();
    error NoSharesHeld();
    error AlreadyVoted();
    error VotingPeriodActive();
    error TiedVote();
    error MarketNotResolved();
    error NoWinningShares();
    error AlreadyClaimed();
    error Unauthorized();
    error MarketHasBets();
    error InvalidMarket();

    // ========== CONSTRUCTOR ==========

    constructor(address _usdc, uint256 _protocolFeeBps) Ownable(msg.sender) {
        if (_protocolFeeBps > MAX_FEE_BPS) revert FeeTooHigh();

        usdc = IERC20(_usdc);
        protocolFeeBps = _protocolFeeBps;
        nextMarketId = 1;
    }

    // ========== MARKET CREATION ==========

    /**
     * @notice Create a new prediction market
     * @param question Market question (max 200 chars)
     * @param description Detailed description (max 1000 chars)
     * @param farcasterContext Optional Farcaster context
     * @param resolutionTime Unix timestamp when market can be resolved
     * @param oracleType Type of oracle (Social or Automated)
     */
    function createMarket(
        string calldata question,
        string calldata description,
        FarcasterContext calldata farcasterContext,
        uint256 resolutionTime,
        OracleType oracleType
    ) external whenNotPaused returns (uint256) {
        if (bytes(question).length > 200) revert QuestionTooLong();
        if (bytes(description).length > 1000) revert DescriptionTooLong();
        if (resolutionTime <= block.timestamp) revert InvalidResolutionTime();

        uint256 marketId = nextMarketId++;

        Market storage market = markets[marketId];
        market.marketId = marketId;
        market.creator = msg.sender;
        market.question = question;
        market.description = description;
        market.farcasterContext = farcasterContext;
        market.createdAt = block.timestamp;
        market.resolutionTime = resolutionTime;
        market.oracleType = oracleType;
        market.status = MarketStatus.Active;

        totalMarkets++;

        emit MarketCreated(marketId, msg.sender, question, resolutionTime, oracleType);

        return marketId;
    }

    // ========== BETTING ==========

    /**
     * @notice Place a bet on market outcome
     * @param marketId Market identifier
     * @param outcome YES or NO
     * @param amount USDC amount to bet
     * @param minShares Minimum shares to receive (slippage protection)
     */
    function placeBet(
        uint256 marketId,
        Outcome outcome,
        uint256 amount,
        uint256 minShares
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (outcome == Outcome.None) revert InvalidAmount();

        Market storage market = markets[marketId];
        if (market.status != MarketStatus.Active) revert MarketNotActive();
        if (block.timestamp >= market.resolutionTime) revert MarketExpired();

        // Calculate shares using AMM formula
        uint256 shares = _calculateShares(
            amount,
            outcome == Outcome.Yes ? market.yesPool : market.noPool,
            outcome == Outcome.Yes ? market.noPool : market.yesPool
        );

        if (shares < minShares) revert SlippageExceeded();

        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update market pools
        if (outcome == Outcome.Yes) {
            market.yesPool += amount;
            market.totalYesShares += shares;
        } else {
            market.noPool += amount;
            market.totalNoShares += shares;
        }
        market.totalVolume += amount;
        totalVolume += amount;

        // Update user position
        Position storage position = positions[marketId][msg.sender];
        if (outcome == Outcome.Yes) {
            position.yesShares += shares;
        } else {
            position.noShares += shares;
        }

        emit BetPlaced(marketId, msg.sender, outcome, amount, shares, block.timestamp);
    }

    /**
     * @notice Sell shares back to market
     * @param marketId Market identifier
     * @param outcome YES or NO shares to sell
     * @param shares Amount of shares to sell
     * @param minAmount Minimum USDC to receive (slippage protection)
     */
    function sellShares(
        uint256 marketId,
        Outcome outcome,
        uint256 shares,
        uint256 minAmount
    ) external nonReentrant whenNotPaused {
        if (shares == 0) revert InvalidAmount();

        Market storage market = markets[marketId];
        if (market.status != MarketStatus.Active) revert MarketNotActive();

        Position storage position = positions[marketId][msg.sender];

        // Verify user has enough shares
        uint256 userShares = outcome == Outcome.Yes ? position.yesShares : position.noShares;
        if (userShares < shares) revert InsufficientShares();

        // Calculate payout
        uint256 payout = _calculatePayout(
            shares,
            outcome == Outcome.Yes ? market.yesPool : market.noPool,
            outcome == Outcome.Yes ? market.totalYesShares : market.totalNoShares
        );

        if (payout < minAmount) revert SlippageExceeded();

        // Update position
        if (outcome == Outcome.Yes) {
            position.yesShares -= shares;
            market.yesPool -= payout;
            market.totalYesShares -= shares;
        } else {
            position.noShares -= shares;
            market.noPool -= payout;
            market.totalNoShares -= shares;
        }

        // Transfer USDC to user
        usdc.safeTransfer(msg.sender, payout);

        emit SharesSold(marketId, msg.sender, outcome, shares, payout, block.timestamp);
    }

    // ========== ORACLE & RESOLUTION ==========

    /**
     * @notice Vote on market outcome (social oracle only)
     * @param marketId Market identifier
     * @param outcome Voted outcome
     */
    function voteOutcome(uint256 marketId, Outcome outcome) external whenNotPaused {
        Market storage market = markets[marketId];

        if (market.oracleType != OracleType.Social) revert InvalidOracleType();
        if (block.timestamp < market.resolutionTime) revert MarketNotExpired();
        if (market.status != MarketStatus.Active) revert MarketNotActive();

        Position storage position = positions[marketId][msg.sender];
        uint256 totalShares = position.yesShares + position.noShares;
        if (totalShares == 0) revert NoSharesHeld();

        Vote storage vote = votes[marketId][msg.sender];
        if (vote.hasVoted) revert AlreadyVoted();

        // Record vote weighted by shares held
        vote.outcome = outcome;
        vote.votingPower = totalShares;
        vote.hasVoted = true;

        // Update oracle data
        if (outcome == Outcome.Yes) {
            market.oracleData.yesVotes += totalShares;
        } else {
            market.oracleData.noVotes += totalShares;
        }
        market.oracleData.totalVoters++;

        emit VoteCast(marketId, msg.sender, outcome, totalShares, block.timestamp);
    }

    /**
     * @notice Resolve market based on votes
     * @param marketId Market identifier
     */
    function resolveMarket(uint256 marketId) external whenNotPaused {
        Market storage market = markets[marketId];

        if (market.status != MarketStatus.Active) revert MarketNotActive();
        if (block.timestamp < market.resolutionTime + 1 days) revert VotingPeriodActive();

        OracleData storage oracle = market.oracleData;

        // Determine outcome
        Outcome outcome;
        if (oracle.yesVotes > oracle.noVotes) {
            outcome = Outcome.Yes;
        } else if (oracle.noVotes > oracle.yesVotes) {
            outcome = Outcome.No;
        } else {
            revert TiedVote();
        }

        oracle.resolvedOutcome = outcome;
        oracle.resolved = true;
        market.status = MarketStatus.Resolved;
        market.resolvedAt = block.timestamp;

        emit MarketResolved(
            marketId,
            outcome,
            oracle.yesVotes,
            oracle.noVotes,
            block.timestamp
        );
    }

    // ========== CLAIMING ==========

    /**
     * @notice Claim winnings after market resolution
     * @param marketId Market identifier
     */
    function claimWinnings(uint256 marketId) external nonReentrant whenNotPaused {
        Market storage market = markets[marketId];

        if (market.status != MarketStatus.Resolved) revert MarketNotResolved();

        Position storage position = positions[marketId][msg.sender];
        if (position.claimed) revert AlreadyClaimed();

        OracleData storage oracle = market.oracleData;
        Outcome winningOutcome = oracle.resolvedOutcome;

        // Get winning shares and pool info
        uint256 winningShares;
        uint256 totalWinningShares;
        uint256 losingPool;

        if (winningOutcome == Outcome.Yes) {
            winningShares = position.yesShares;
            totalWinningShares = market.totalYesShares;
            losingPool = market.noPool;
        } else {
            winningShares = position.noShares;
            totalWinningShares = market.totalNoShares;
            losingPool = market.yesPool;
        }

        if (winningShares == 0) revert NoWinningShares();

        // Calculate winnings: initial bet + share of losing pool - fees
        uint256 shareOfLosingPool = (losingPool * winningShares) / totalWinningShares;
        uint256 grossWinnings = winningShares + shareOfLosingPool;
        uint256 fee = (grossWinnings * protocolFeeBps) / BPS_DIVISOR;
        uint256 netWinnings = grossWinnings - fee;

        position.claimed = true;

        // Transfer winnings
        usdc.safeTransfer(msg.sender, netWinnings);

        // Transfer fees to owner
        if (fee > 0) {
            usdc.safeTransfer(owner(), fee);
        }

        emit WinningsClaimed(marketId, msg.sender, netWinnings, fee, block.timestamp);
    }

    // ========== MARKET MANAGEMENT ==========

    /**
     * @notice Cancel market (only creator, no bets placed)
     * @param marketId Market identifier
     */
    function cancelMarket(uint256 marketId) external {
        Market storage market = markets[marketId];

        if (market.creator != msg.sender) revert Unauthorized();
        if (market.totalVolume > 0) revert MarketHasBets();

        market.status = MarketStatus.Cancelled;

        emit MarketCancelled(marketId, block.timestamp);
    }

    // ========== AMM CALCULATIONS ==========

    /**
     * @notice Calculate shares received for a bet
     * @param amount Amount to bet
     * @param bettingPool Pool being bet on
     * @param opposingPool Opposing pool
     * @return shares Number of shares to receive
     */
    function _calculateShares(
        uint256 amount,
        uint256 bettingPool,
        uint256 opposingPool
    ) internal pure returns (uint256 shares) {
        if (bettingPool == 0 || opposingPool == 0) {
            // Initial liquidity: 1:1 ratio
            return amount;
        }

        // Simplified AMM: linear pricing with pool ratio
        shares = (amount * opposingPool) / (bettingPool + amount);

        // Minimum 1 share (in wei)
        return shares > 0 ? shares : 1;
    }

    /**
     * @notice Calculate payout for selling shares
     * @param shares Shares to sell
     * @param pool Pool to sell to
     * @param totalShares Total shares in pool
     * @return payout USDC payout
     */
    function _calculatePayout(
        uint256 shares,
        uint256 pool,
        uint256 totalShares
    ) internal pure returns (uint256 payout) {
        if (totalShares == 0) revert InvalidAmount();

        // Payout proportional to share of pool
        payout = (pool * shares) / totalShares;
        return payout;
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get market details
     */
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    /**
     * @notice Get user position in market
     */
    function getPosition(uint256 marketId, address user) external view returns (Position memory) {
        return positions[marketId][user];
    }

    /**
     * @notice Get user vote in market
     */
    function getVote(uint256 marketId, address user) external view returns (Vote memory) {
        return votes[marketId][user];
    }

    /**
     * @notice Calculate current market prices
     * @return yesPrice Price of YES shares (in basis points)
     * @return noPrice Price of NO shares (in basis points)
     */
    function getMarketPrices(uint256 marketId) external view returns (uint256 yesPrice, uint256 noPrice) {
        Market storage market = markets[marketId];

        if (market.yesPool == 0 && market.noPool == 0) {
            return (5000, 5000); // 50/50 if no liquidity
        }

        uint256 totalPool = market.yesPool + market.noPool;
        yesPrice = (market.noPool * BPS_DIVISOR) / totalPool;
        noPrice = (market.yesPool * BPS_DIVISOR) / totalPool;
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Update protocol fee
     */
    function setProtocolFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(newFeeBps);
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
