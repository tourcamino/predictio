-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "marketType" TEXT NOT NULL DEFAULT 'moneyline',
    "outcomes" JSONB NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "predictions" INTEGER NOT NULL DEFAULT 0,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "winner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolutionType" TEXT NOT NULL DEFAULT 'automatic',
    "description" TEXT,
    "tags" TEXT[],
    "resolutionReason" TEXT,
    "disputeReason" TEXT,
    "adminSignatures" JSONB,
    "voidedAt" TIMESTAMP(3),
    "refundAmount" DOUBLE PRECISION,
    "totalLPPool" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "shares" DOUBLE PRECISION,
    "avgPrice" DOUBLE PRECISION,
    "odds" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'open',
    "pnl" DOUBLE PRECISION,
    "orderType" TEXT NOT NULL DEFAULT 'MARKET',
    "limitPrice" DOUBLE PRECISION,
    "heldSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "predictions" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "pendingHoldingRewards" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "claimedHoldingRewards" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "virtualBalance" DOUBLE PRECISION NOT NULL DEFAULT 1000.00,
    "totalPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradesCount" INTEGER NOT NULL DEFAULT 0,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedUser" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "engagementCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'new',
    "lastInteraction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "marketId" TEXT,
    "handle" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceBefore" DOUBLE PRECISION,
    "balanceAfter" DOUBLE PRECISION,
    "marketId" TEXT,
    "orderId" TEXT,
    "txHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "metadata" JSONB,
    "feePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analyst" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "twitterUrl" TEXT,
    "telegramUrl" TEXT,
    "websiteUrl" TEXT,
    "sport" TEXT[],
    "roi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPredictions" INTEGER NOT NULL DEFAULT 0,
    "avgOdds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "volumeGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingRewards" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoCompound" BOOLEAN NOT NULL DEFAULT false,
    "activityDays" INTEGER NOT NULL DEFAULT 0,
    "validFollowers" INTEGER NOT NULL DEFAULT 0,
    "onchainRegistered" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationTier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analyst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalystFollow" (
    "id" TEXT NOT NULL,
    "userWallet" TEXT NOT NULL,
    "analystId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalystFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sport" TEXT[],
    "platform" TEXT NOT NULL,
    "followers" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "handles" JSONB NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'identified',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "fitScore" INTEGER NOT NULL DEFAULT 0,
    "estimatedValue" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateInteraction" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateNetwork" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "reach" TEXT NOT NULL,
    "affiliatesCount" INTEGER NOT NULL DEFAULT 0,
    "verticals" TEXT[],
    "contact" TEXT NOT NULL,
    "proposedRevShare" DOUBLE PRECISION NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'identified',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "userWallet" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidityPosition" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "userWallet" TEXT NOT NULL,
    "depositedAmount" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "poolShare" DOUBLE PRECISION NOT NULL,
    "feesEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feesPending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoCompound" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "LiquidityPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LPFeeEarning" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "marketVolume" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LPFeeEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "featuredImage" TEXT,
    "tags" TEXT[],
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keySuffix" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Default',
    "permissions" JSONB,
    "nonceUsed" TEXT NOT NULL,
    "paperMode" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthChallenge" (
    "nonce" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("nonce")
);

-- CreateTable
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "latencyMs" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "targetPrice" DOUBLE PRECISION NOT NULL,
    "direction" TEXT NOT NULL,
    "triggered" BOOLEAN NOT NULL DEFAULT false,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "marketId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsLedger" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsTotal" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "season" INTEGER NOT NULL DEFAULT 1,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointsTotal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LPWaitlist" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pointsCredited" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LPWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "totalTvl" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "availableLiquidity" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "exposedLiquidity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feeCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastRebalance" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultAllocation" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "allocatedUsdc" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "maxCap" DOUBLE PRECISION NOT NULL,
    "currentExposure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultAlertThresholds" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "minTvlThreshold" DOUBLE PRECISION,
    "maxUtilizationRate" DOUBLE PRECISION,
    "minDailyFeesThreshold" DOUBLE PRECISION,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastAlertSent" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultAlertThresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmmOrder" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "azuroFairValue" DOUBLE PRECISION,
    "spreadApplied" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filledAt" TIMESTAMP(3),

    CONSTRAINT "AmmOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotHeartbeat" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "lastRun" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRun" TIMESTAMP(3),
    "marketsProcessed" INTEGER NOT NULL DEFAULT 0,
    "ordersPlaced" INTEGER NOT NULL DEFAULT 0,
    "rebalancesDone" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliate" (
    "walletAddress" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "isFounder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalVolumeUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRewardsUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingRewardsUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingRewardsEur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPayoutAt" TIMESTAMP(3),

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("walletAddress")
);

-- CreateTable
CREATE TABLE "ReferralTracking" (
    "id" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "referredWallet" TEXT NOT NULL,
    "attributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cookieExpires" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ReferralTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateReward" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "refCode" TEXT,
    "tradeId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "volumeUsd" DOUBLE PRECISION NOT NULL,
    "feeTotalUsd" DOUBLE PRECISION NOT NULL,
    "rewardUsd" DOUBLE PRECISION NOT NULL,
    "rewardEur" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "txHash" TEXT,
    "notes" TEXT,

    CONSTRAINT "AffiliateReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutLog" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "amountEur" DOUBLE PRECISION NOT NULL,
    "txHash" TEXT,
    "paidBy" TEXT NOT NULL,
    "rewardIds" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryLog" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "walletFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopyRelationship" (
    "id" TEXT NOT NULL,
    "copierWallet" TEXT NOT NULL,
    "analystWallet" TEXT NOT NULL,
    "maxPerTradeUsd" DOUBLE PRECISION NOT NULL,
    "copyMode" TEXT NOT NULL DEFAULT 'all',
    "selectedMarkets" TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalVolumeCopied" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "CopyRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leaderboard" (
    "walletAddress" TEXT NOT NULL,
    "displayName" TEXT,
    "rank" INTEGER NOT NULL,
    "totalVolumeUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeCopiers" INTEGER NOT NULL DEFAULT 0,
    "analystRewardsUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralRewardsUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsSeason1" INTEGER NOT NULL DEFAULT 0,
    "lastTradeAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("walletAddress")
);

-- CreateTable
CREATE TABLE "MarketMakerConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "targetSpread" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "maxExposurePerMarket" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "rebalanceIntervalMs" INTEGER NOT NULL DEFAULT 1800000,
    "minLiquidity" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "enabledMarkets" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketMakerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Market_status_sport_idx" ON "Market"("status", "sport");

-- CreateIndex
CREATE INDEX "Market_closesAt_idx" ON "Market"("closesAt");

-- CreateIndex
CREATE INDEX "Market_marketType_idx" ON "Market"("marketType");

-- CreateIndex
CREATE INDEX "Order_wallet_status_idx" ON "Order"("wallet", "status");

-- CreateIndex
CREATE INDEX "Order_marketId_idx" ON "Order"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_key" ON "User"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedUser_handle_key" ON "TrackedUser"("handle");

-- CreateIndex
CREATE INDEX "TrackedUser_status_sport_idx" ON "TrackedUser"("status", "sport");

-- CreateIndex
CREATE INDEX "GrowthLog_type_createdAt_idx" ON "GrowthLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_wallet_createdAt_idx" ON "Transaction"("wallet", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_type_createdAt_idx" ON "Transaction"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Analyst_wallet_key" ON "Analyst"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "Analyst_referralCode_key" ON "Analyst"("referralCode");

-- CreateIndex
CREATE INDEX "Analyst_totalEarned_idx" ON "Analyst"("totalEarned");

-- CreateIndex
CREATE INDEX "Analyst_referralCode_idx" ON "Analyst"("referralCode");

-- CreateIndex
CREATE INDEX "Analyst_isVerified_idx" ON "Analyst"("isVerified");

-- CreateIndex
CREATE INDEX "AnalystFollow_userWallet_idx" ON "AnalystFollow"("userWallet");

-- CreateIndex
CREATE INDEX "AnalystFollow_analystId_idx" ON "AnalystFollow"("analystId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalystFollow_userWallet_analystId_key" ON "AnalystFollow"("userWallet", "analystId");

-- CreateIndex
CREATE INDEX "AffiliateContact_stage_priority_idx" ON "AffiliateContact"("stage", "priority");

-- CreateIndex
CREATE INDEX "AffiliateInteraction_contactId_createdAt_idx" ON "AffiliateInteraction"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateNetwork_stage_idx" ON "AffiliateNetwork"("stage");

-- CreateIndex
CREATE INDEX "Appeal_marketId_idx" ON "Appeal"("marketId");

-- CreateIndex
CREATE INDEX "Appeal_userWallet_idx" ON "Appeal"("userWallet");

-- CreateIndex
CREATE INDEX "Appeal_status_idx" ON "Appeal"("status");

-- CreateIndex
CREATE INDEX "LiquidityPosition_userWallet_status_idx" ON "LiquidityPosition"("userWallet", "status");

-- CreateIndex
CREATE INDEX "LiquidityPosition_marketId_status_idx" ON "LiquidityPosition"("marketId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidityPosition_marketId_userWallet_status_key" ON "LiquidityPosition"("marketId", "userWallet", "status");

-- CreateIndex
CREATE INDEX "LPFeeEarning_positionId_createdAt_idx" ON "LPFeeEarning"("positionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_published_createdAt_idx" ON "BlogPost"("published", "createdAt");

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "JobPosition_isOpen_createdAt_idx" ON "JobPosition"("isOpen", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_walletAddress_idx" ON "ApiKey"("walletAddress");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_walletAddress_isActive_idx" ON "ApiKey"("walletAddress", "isActive");

-- CreateIndex
CREATE INDEX "AuthChallenge_walletAddress_idx" ON "AuthChallenge"("walletAddress");

-- CreateIndex
CREATE INDEX "AuthChallenge_expiresAt_idx" ON "AuthChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "ApiUsage_apiKeyId_timestamp_idx" ON "ApiUsage"("apiKeyId", "timestamp");

-- CreateIndex
CREATE INDEX "ApiUsage_endpoint_idx" ON "ApiUsage"("endpoint");

-- CreateIndex
CREATE INDEX "Watchlist_walletAddress_idx" ON "Watchlist"("walletAddress");

-- CreateIndex
CREATE INDEX "Watchlist_marketId_idx" ON "Watchlist"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_walletAddress_marketId_key" ON "Watchlist"("walletAddress", "marketId");

-- CreateIndex
CREATE INDEX "PriceAlert_walletAddress_triggered_idx" ON "PriceAlert"("walletAddress", "triggered");

-- CreateIndex
CREATE INDEX "PriceAlert_marketId_triggered_idx" ON "PriceAlert"("marketId", "triggered");

-- CreateIndex
CREATE INDEX "Notification_walletAddress_read_idx" ON "Notification"("walletAddress", "read");

-- CreateIndex
CREATE INDEX "Notification_walletAddress_createdAt_idx" ON "Notification"("walletAddress", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "PointsLedger_walletAddress_createdAt_idx" ON "PointsLedger"("walletAddress", "createdAt");

-- CreateIndex
CREATE INDEX "PointsLedger_actionType_idx" ON "PointsLedger"("actionType");

-- CreateIndex
CREATE UNIQUE INDEX "PointsTotal_walletAddress_key" ON "PointsTotal"("walletAddress");

-- CreateIndex
CREATE INDEX "PointsTotal_season_totalPoints_idx" ON "PointsTotal"("season", "totalPoints");

-- CreateIndex
CREATE INDEX "PointsTotal_tier_idx" ON "PointsTotal"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "LPWaitlist_walletAddress_key" ON "LPWaitlist"("walletAddress");

-- CreateIndex
CREATE INDEX "LPWaitlist_registeredAt_idx" ON "LPWaitlist"("registeredAt");

-- CreateIndex
CREATE INDEX "VaultState_updatedAt_idx" ON "VaultState"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VaultAllocation_marketId_key" ON "VaultAllocation"("marketId");

-- CreateIndex
CREATE INDEX "VaultAllocation_marketId_idx" ON "VaultAllocation"("marketId");

-- CreateIndex
CREATE INDEX "VaultAllocation_updatedAt_idx" ON "VaultAllocation"("updatedAt");

-- CreateIndex
CREATE INDEX "VaultAlertThresholds_updatedAt_idx" ON "VaultAlertThresholds"("updatedAt");

-- CreateIndex
CREATE INDEX "AmmOrder_marketId_status_idx" ON "AmmOrder"("marketId", "status");

-- CreateIndex
CREATE INDEX "AmmOrder_status_createdAt_idx" ON "AmmOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AmmOrder_createdAt_idx" ON "AmmOrder"("createdAt");

-- CreateIndex
CREATE INDEX "BotHeartbeat_status_updatedAt_idx" ON "BotHeartbeat"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_refCode_key" ON "Affiliate"("refCode");

-- CreateIndex
CREATE INDEX "Affiliate_refCode_idx" ON "Affiliate"("refCode");

-- CreateIndex
CREATE INDEX "Affiliate_walletAddress_idx" ON "Affiliate"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralTracking_referredWallet_key" ON "ReferralTracking"("referredWallet");

-- CreateIndex
CREATE INDEX "ReferralTracking_refCode_idx" ON "ReferralTracking"("refCode");

-- CreateIndex
CREATE INDEX "ReferralTracking_referredWallet_idx" ON "ReferralTracking"("referredWallet");

-- CreateIndex
CREATE INDEX "AffiliateReward_walletAddress_status_idx" ON "AffiliateReward"("walletAddress", "status");

-- CreateIndex
CREATE INDEX "AffiliateReward_status_createdAt_idx" ON "AffiliateReward"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateReward_tradeId_idx" ON "AffiliateReward"("tradeId");

-- CreateIndex
CREATE INDEX "PayoutLog_walletAddress_createdAt_idx" ON "PayoutLog"("walletAddress", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutLog_createdAt_idx" ON "PayoutLog"("createdAt");

-- CreateIndex
CREATE INDEX "TreasuryLog_reason_createdAt_idx" ON "TreasuryLog"("reason", "createdAt");

-- CreateIndex
CREATE INDEX "TreasuryLog_tradeId_idx" ON "TreasuryLog"("tradeId");

-- CreateIndex
CREATE INDEX "CopyRelationship_copierWallet_isActive_idx" ON "CopyRelationship"("copierWallet", "isActive");

-- CreateIndex
CREATE INDEX "CopyRelationship_analystWallet_isActive_idx" ON "CopyRelationship"("analystWallet", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CopyRelationship_copierWallet_analystWallet_key" ON "CopyRelationship"("copierWallet", "analystWallet");

-- CreateIndex
CREATE INDEX "Leaderboard_rank_idx" ON "Leaderboard"("rank");

-- CreateIndex
CREATE INDEX "Leaderboard_totalVolumeUsd_idx" ON "Leaderboard"("totalVolumeUsd");

-- CreateIndex
CREATE INDEX "Leaderboard_activeCopiers_idx" ON "Leaderboard"("activeCopiers");

-- CreateIndex
CREATE INDEX "Leaderboard_lastUpdated_idx" ON "Leaderboard"("lastUpdated");

-- CreateIndex
CREATE INDEX "MarketMakerConfig_updatedAt_idx" ON "MarketMakerConfig"("updatedAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystFollow" ADD CONSTRAINT "AnalystFollow_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateInteraction" ADD CONSTRAINT "AffiliateInteraction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "AffiliateContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LPFeeEarning" ADD CONSTRAINT "LPFeeEarning_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "LiquidityPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiUsage" ADD CONSTRAINT "ApiUsage_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
