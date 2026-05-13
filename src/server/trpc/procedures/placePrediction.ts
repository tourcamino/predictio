import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import type { Market } from "~/data/mockMarkets";
import { db } from "~/server/db";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import { ensureMarketRowForPaperTrade } from "~/server/utils/paperMarketPersistence";
import { getOrderRole } from "~/utils/marketUtils";
import { calculateFeeSplit, recordFeeDistribution, TAKER_FEE_RATE } from "~/server/services/feeCalculation";
import {
  creditWalletPoints,
  POINT_ACTION_VALUES,
} from "~/server/utils/pointsLedger";
import {
  logPurchaseFlowServer,
  logPurchaseFlowServerError,
  newTrpcPurchaseRequestId,
} from "~/server/lib/purchaseFlowDiagnosticServer";

function marketEventLabel(m: Market): string {
  return m.event ?? `${m.teamA} vs ${m.teamB}`;
}

async function bumpMarketPaperStats(marketId: string, volumeDelta: number) {
  try {
    await db.market.update({
      where: { id: marketId },
      data: {
        volume: { increment: volumeDelta },
        predictions: { increment: 1 },
      },
    });
  } catch {
    /* Row should exist after ensureMarketRowForPaperTrade */
  }
}

export const placePrediction = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
      outcome: z.string(), // e.g., "YES", "NO"
      amount: z.number().positive().max(10000),
      walletAddress: z.string(),
      currentBalance: z.number().optional(),
      orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET'),
      limitPrice: z.number().min(0.01).max(0.99).optional(),
    })
  )
  .mutation(async ({ input }) => {
    // #region agent log
    const purchaseDiagRequestId = newTrpcPurchaseRequestId();
    const purchaseDiagUserId = input.walletAddress?.trim().toLowerCase() ?? null;
    const purchaseDiagPayload = {
      marketId: input.marketId,
      outcome: input.outcome,
      amount: input.amount,
      orderType: input.orderType,
      limitPrice: input.limitPrice,
    };
    logPurchaseFlowServer({
      requestId: purchaseDiagRequestId,
      userId: purchaseDiagUserId,
      location: "placePrediction.ts:mutation",
      phase: "trpc.place_prediction.enter",
      payloadReceived: purchaseDiagPayload,
    });
    // #endregion

    try {
    const market = await loadMarketUiById(input.marketId);
    if (!market) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Market not found. Only Azuro-backed events can be traded.",
      });
    }

    if (market.start_time && new Date() >= market.start_time) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Trading is closed — kickoff has passed.",
      });
    }

    if (market.status === "resolved") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This market is resolved.",
      });
    }

    // TODO CURSOR C1: Server-side trading lock validation
    // ====================================================
    // Replace this with real-time check against Azuro GraphQL:
    // 1. Fetch game.startsAt from Azuro
    // 2. Check if current time >= game.startsAt
    // 3. If locked, reject trade with clear error message
    // 4. Also check game.status !== 'Canceled' and !== 'Resolved'
    // 
    // Example:
    // const azuroGame = await fetchAzuroGameDetail(market.azuroGameId);
    // if (Date.now() >= azuroGame.startsAt * 1000) {
    //   throw new TRPCError({
    //     code: "BAD_REQUEST",
    //     message: "Trading is closed - match has started",
    //   });
    // }
    
    // Check if market is still open
    if (market.closesAt < new Date()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This market has already closed",
      });
    }

    const upperOutcome = input.outcome.toUpperCase();
    const allowDraw = market.percentDraw != null && market.percentDraw > 0;
    const outcomeOk =
      upperOutcome === "YES" ||
      upperOutcome === "NO" ||
      (allowDraw && upperOutcome === "DRAW");

    if (!outcomeOk) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid outcome",
      });
    }

    const wallet = input.walletAddress.trim().toLowerCase();
    if (!wallet) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Wallet address is required",
      });
    }

    // Validate limit order
    if (input.orderType === 'LIMIT' && !input.limitPrice) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Limit price is required for limit orders",
      });
    }

    // Ensure DB row exists (syncUserAccount may not have run yet after connect / Strict Mode).
    const user = await db.user.upsert({
      where: { wallet },
      create: {
        wallet,
        virtualBalance: 1000.0,
        totalPnl: 0,
        tradesCount: 0,
        firstSeen: new Date(),
        lastActive: new Date(),
        totalVolume: 0,
        predictions: 0,
        wins: 0,
        losses: 0,
      },
      update: {
        lastActive: new Date(),
      },
    });

    await ensureMarketRowForPaperTrade(input.marketId, market);

    const predictionId = `pred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const balanceBefore = user.virtualBalance;

    // Calculate shares and price
    const currentPrice =
      upperOutcome === "YES"
        ? market.yesPrice
        : upperOutcome === "DRAW" && market.percentDraw != null
          ? market.percentDraw / 100
          : market.noPrice;

    if (
      !Number.isFinite(currentPrice) ||
      currentPrice <= 0 ||
      currentPrice >= 1
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid market price — cannot execute trade.",
      });
    }

    const effectivePrice =
      input.orderType === "LIMIT" && input.limitPrice
        ? input.limitPrice
        : currentPrice;

    if (
      !Number.isFinite(effectivePrice) ||
      effectivePrice <= 0 ||
      effectivePrice >= 1
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid execution price — cannot execute trade.",
      });
    }

    const shares = input.amount / effectivePrice;

    if (!Number.isFinite(shares) || shares <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Could not compute share size for this trade.",
      });
    }

    // Calculate fee - Fixed 1% for takers, 0% for makers
    const fee = input.orderType === 'LIMIT' ? 0 : input.amount * TAKER_FEE_RATE;
    const orderRole = getOrderRole(input.orderType);
    const totalCost = input.amount + fee;
    
    // Check sufficient balance
    if (totalCost > balanceBefore) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${balanceBefore.toFixed(2)}`,
      });
    }
    
    const balanceAfter = balanceBefore - totalCost;

    // Update user balance and stats
    await db.user.update({
      where: { wallet },
      data: {
        virtualBalance: balanceAfter,
        tradesCount: { increment: 1 },
        totalVolume: { increment: input.amount },
        predictions: { increment: 1 },
        lastActive: new Date(),
      },
    });

    // Calculate odds for metadata
    let odds = 1.0;
    if (upperOutcome === "YES") {
      odds = 1 / market.yesPrice;
    } else if (upperOutcome === "NO") {
      odds = 1 / market.noPrice;
    } else if (upperOutcome === "DRAW" && market.percentDraw != null) {
      const p = market.percentDraw / 100;
      odds = p > 0 ? 1 / p : 1;
    }

    // Record bet transaction in database
    await db.transaction.create({
      data: {
        wallet,
        type: 'bet_placed',
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        marketId: input.marketId,
        orderId: predictionId,
        status: 'completed',
        feePaid: fee,
        metadata: {
          outcome: input.outcome,
          odds,
          potentialWin: shares * 1.0, // Each winning share = $1
          marketEvent: marketEventLabel(market),
          sport: market.sport,
          orderType: input.orderType,
          orderRole,
          limitPrice: input.limitPrice,
          shares,
          avgPrice: effectivePrice,
        },
      },
    });

    // Create order record
    await db.order.create({
      data: {
        id: predictionId,
        marketId: input.marketId,
        wallet,
        outcome: upperOutcome,
        amount: input.amount,
        shares,
        avgPrice: effectivePrice,
        status: 'open',
        orderType: input.orderType,
        limitPrice: input.limitPrice,
        heldSince: new Date(),
      },
    });

    // #region agent log
    logPurchaseFlowServer({
      requestId: purchaseDiagRequestId,
      userId: purchaseDiagUserId,
      location: "placePrediction.ts:after_order_create",
      phase: "trpc.db.order_created",
      dbWrite: {
        model: "Order",
        summary: {
          id: predictionId,
          marketId: input.marketId,
          wallet,
          outcome: upperOutcome,
          amount: input.amount,
          shares,
          avgPrice: effectivePrice,
          orderType: input.orderType,
        },
      },
    });
    // #endregion

    await bumpMarketPaperStats(input.marketId, input.amount);

    // Process copy trading - mirror this trade to active copiers if trader is an analyst
    try {
      const analyst = await db.analyst.findUnique({
        where: { wallet },
      });

      if (analyst) {
        // Find all active copiers for this analyst
        const activeCopiers = await db.copyRelationship.findMany({
          where: {
            analystWallet: wallet,
            isActive: true,
          },
        });

        if (activeCopiers.length > 0) {
          console.log(`[COPY TRADING] ${analyst.displayName} has ${activeCopiers.length} active copiers`);

          for (const copyRelationship of activeCopiers) {
            try {
              // Get copier's user record to check balance
              const copierUser = await db.user.findUnique({
                where: { wallet: copyRelationship.copierWallet },
              });

              if (!copierUser) {
                console.warn(`[COPY TRADING] Copier ${copyRelationship.copierWallet} not found, skipping`);
                continue;
              }

              // Determine copy amount (use max_per_trade_usd, capped by copier's balance)
              const copyAmount = Math.min(
                copyRelationship.maxPerTradeUsd,
                copierUser.virtualBalance * 0.95 // Leave 5% buffer for fees
              );

              if (copyAmount < 1) {
                console.warn(`[COPY TRADING] Copier ${copyRelationship.copierWallet} has insufficient balance, skipping`);
                continue;
              }

              // Check if copier wants to copy this specific market (if selective mode)
              if (copyRelationship.copyMode === 'selective' && 
                  !copyRelationship.selectedMarkets.includes(input.marketId)) {
                console.log(`[COPY TRADING] Copier ${copyRelationship.copierWallet} not copying this market (selective mode)`);
                continue;
              }

              // Calculate copy trade details
              const copyShares = copyAmount / effectivePrice;
              const copyFee = copyAmount * TAKER_FEE_RATE; // Copiers always pay taker fee
              const copyTotalCost = copyAmount + copyFee;

              // Check if copier has enough balance
              if (copyTotalCost > copierUser.virtualBalance) {
                console.warn(`[COPY TRADING] Copier ${copyRelationship.copierWallet} insufficient balance for copy trade`);
                continue;
              }

              // Create copy order
              const copyOrderId = `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              
              await db.$transaction([
                // Update copier's balance
                db.user.update({
                  where: { wallet: copyRelationship.copierWallet },
                  data: {
                    virtualBalance: { decrement: copyTotalCost },
                    tradesCount: { increment: 1 },
                    totalVolume: { increment: copyAmount },
                    predictions: { increment: 1 },
                    lastActive: new Date(),
                  },
                }),
                // Create copy order
                db.order.create({
                  data: {
                    id: copyOrderId,
                    marketId: input.marketId,
                    wallet: copyRelationship.copierWallet,
                    outcome: input.outcome.toUpperCase(),
                    amount: copyAmount,
                    shares: copyShares,
                    avgPrice: effectivePrice,
                    status: 'open',
                    orderType: 'MARKET', // Copy trades are always market orders
                    heldSince: new Date(),
                  },
                }),
                // Record transaction
                db.transaction.create({
                  data: {
                    wallet: copyRelationship.copierWallet,
                    type: 'bet_placed',
                    amount: copyAmount,
                    balanceBefore: copierUser.virtualBalance,
                    balanceAfter: copierUser.virtualBalance - copyTotalCost,
                    marketId: input.marketId,
                    orderId: copyOrderId,
                    status: 'completed',
                    feePaid: copyFee,
                    metadata: {
                      outcome: input.outcome,
                      odds,
                      potentialWin: copyShares * 1.0,
                      marketEvent: marketEventLabel(market),
                      sport: market.sport,
                      orderType: 'MARKET',
                      orderRole: 'TAKER',
                      shares: copyShares,
                      avgPrice: effectivePrice,
                      copiedFrom: analyst.displayName,
                      copiedFromWallet: analyst.wallet,
                    },
                  },
                }),
                // Update copy relationship stats
                db.copyRelationship.update({
                  where: { id: copyRelationship.id },
                  data: {
                    totalVolumeCopied: { increment: copyAmount },
                  },
                }),
              ]);

              await bumpMarketPaperStats(input.marketId, copyAmount);

              // Process fee distribution for copy trade (analyst gets 35%)
              const copyDistribution = await calculateFeeSplit({
                tradeId: copyOrderId,
                traderWallet: copyRelationship.copierWallet,
                volume: copyAmount,
                analystWallet: analyst.wallet, // Analyst gets 35% of copy trade fees
                referralWallet: null, // Copy trades don't have referral attribution
              });

              await recordFeeDistribution(
                {
                  tradeId: copyOrderId,
                  traderWallet: copyRelationship.copierWallet,
                  volume: copyAmount,
                  analystWallet: copyDistribution.analystWallet,
                  referralWallet: copyDistribution.referralWallet,
                },
                copyDistribution
              );

              console.log(`[COPY TRADING] Successfully copied trade to ${copyRelationship.copierWallet}: $${copyAmount} ${input.outcome}`);

              // Create notification for copier
              await db.notification.create({
                data: {
                  walletAddress: copyRelationship.copierWallet,
                  type: 'COPY_TRADE_EXECUTED',
                  title: `Copy Trade Executed`,
                  message: `${analyst.displayName} bought ${input.outcome} on ${marketEventLabel(market)}. Your copy trade: $${copyAmount.toFixed(2)}`,
                  marketId: input.marketId,
                },
              }).catch((err) => {
                console.error('[COPY TRADING] Failed to create copier notification:', err);
              });

            } catch (copyError) {
              console.error(`[COPY TRADING] Failed to copy trade for ${copyRelationship.copierWallet}:`, copyError);
              // Continue with other copiers even if one fails
            }
          }
        }
      }
    } catch (error) {
      console.error('[COPY TRADING] Error processing copy trades:', error);
      // Don't fail the main trade if copy trading fails
    }

    // Process fee distribution using new 50/35/15 logic
    if (fee > 0) {
      try {
        // Check if user is copying an analyst
        const copyRelationship = await db.copyRelationship.findFirst({
          where: {
            copierWallet: wallet,
            isActive: true,
          },
        });

        // Check if user has a referral attribution
        const referralTracking = await db.referralTracking.findUnique({
          where: {
            referredWallet: wallet,
          },
        });

        // Calculate fee split
        const distribution = await calculateFeeSplit({
          tradeId: predictionId,
          traderWallet: wallet,
          volume: input.amount,
          analystWallet: copyRelationship?.analystWallet || null,
          referralWallet: referralTracking?.refCode ? 
            (await db.affiliate.findUnique({ where: { refCode: referralTracking.refCode } }))?.walletAddress || null 
            : null,
        });

        // Record fee distribution in database
        await recordFeeDistribution(
          {
            tradeId: predictionId,
            traderWallet: wallet,
            volume: input.amount,
            analystWallet: distribution.analystWallet,
            referralWallet: distribution.referralWallet,
          },
          distribution
        );

        console.log(`[Fee Distribution] Trade ${predictionId}: Vault=${distribution.vaultAmount.toFixed(2)}, Analyst=${distribution.analystAmount.toFixed(2)}, Referral=${distribution.referralAmount.toFixed(2)}, Treasury=${distribution.treasuryAmount.toFixed(2)}`);
      } catch (error) {
        console.error('[Fee Distribution] Failed to process fees:', error);
        // Don't fail the trade if fee distribution fails
      }
    }

    // In-app bell: notify on every successful buy (paper / production)
    await db.notification
      .create({
        data: {
          walletAddress: wallet,
          type: 'TRADE_FILLED',
          title: 'Trade filled',
          message: `${input.outcome.toUpperCase()} · $${input.amount.toFixed(2)} on ${marketEventLabel(market)} · ~${shares.toFixed(2)} shares @ $${effectivePrice.toFixed(3)}`,
          marketId: input.marketId,
        },
      })
      .catch((err) => {
        console.error('[Notifications] Failed to create TRADE_FILLED notification:', err);
      });

    // Check if user is an analyst and notify followers
    try {
      const analyst = await db.analyst.findUnique({
        where: { wallet },
        include: {
          follows: {
            select: {
              userWallet: true,
            },
          },
        },
      });

      if (analyst && analyst.follows.length > 0) {
        console.log(`[Analyst Predictions] ${analyst.displayName} made a prediction, notifying ${analyst.follows.length} followers`);

        // Create notifications for all followers
        const notificationPromises = analyst.follows.map((follow) =>
          db.notification.create({
            data: {
              walletAddress: follow.userWallet,
              type: 'NEW_ANALYST_PREDICTION',
              title: `${analyst.displayName} made a new prediction`,
              message: `${analyst.displayName} predicted ${input.outcome.toUpperCase()} on ${marketEventLabel(market)} with $${input.amount.toFixed(2)}`,
              marketId: input.marketId,
            },
          }).catch((err) => {
            console.error(`[Analyst Predictions] Failed to notify follower ${follow.userWallet}:`, err);
          })
        );

        await Promise.all(notificationPromises);
        console.log(`[Analyst Predictions] Successfully notified ${analyst.follows.length} followers`);
      }
    } catch (error) {
      console.error('[Analyst Predictions] Error notifying followers:', error);
      // Don't fail the prediction if notification fails
    }

    // Credit points for trade
    try {
      const w = wallet;
      const firstTradeEntry = await db.pointsLedger.findFirst({
        where: {
          walletAddress: w,
          actionType: "FIRST_TRADE",
        },
      });

      let totalPointsEarned = 0;

      if (!firstTradeEntry) {
        await creditWalletPoints(w, "FIRST_TRADE", 500, {
          marketId: input.marketId,
        });
        totalPointsEarned += 500;
      }

      await creditWalletPoints(w, "TRADE_PLACED", 50, {
        marketId: input.marketId,
        amount: input.amount,
        outcome: input.outcome,
      });
      totalPointsEarned += 50;

      // Referrer points: first trade by a referred wallet (affiliate refCode tracking only).
      if (!firstTradeEntry) {
        try {
          const refTrack = await db.referralTracking.findUnique({
            where: { referredWallet: w },
          });
          if (refTrack?.isActive && refTrack.refCode) {
            const affiliate = await db.affiliate.findUnique({
              where: { refCode: refTrack.refCode },
            });
            const referrer = affiliate?.walletAddress?.toLowerCase();
            if (referrer && referrer !== w) {
              const dup = await db.pointsLedger.findFirst({
                where: {
                  walletAddress: referrer,
                  actionType: "REFERRAL_CONVERTED",
                  metadata: {
                    path: ["referredWallet"],
                    equals: w,
                  },
                },
              });
              if (!dup) {
                await creditWalletPoints(
                  referrer,
                  "REFERRAL_CONVERTED",
                  POINT_ACTION_VALUES.REFERRAL_CONVERTED,
                  {
                    referredWallet: w,
                    refCode: refTrack.refCode,
                    marketId: input.marketId,
                  },
                );
                console.log(
                  `[Points] Credited ${POINT_ACTION_VALUES.REFERRAL_CONVERTED} pts to ${referrer} for REFERRAL_CONVERTED (${w})`,
                );
              }
            }
          }
        } catch (refPtsErr) {
          console.error("[Points] Failed to credit REFERRAL_CONVERTED:", refPtsErr);
        }
      }

      console.log(`[Points] Credited ${totalPointsEarned} pts for trade`);
    } catch (error) {
      console.error('[Points] Failed to credit trade points:', error);
    }

    console.log(`[Paper Trading] Trade executed: ${wallet} bought ${shares.toFixed(2)} ${input.outcome} shares for $${totalCost.toFixed(2)}`);

    const apiResponse = {
      success: true,
      predictionId,
      message: input.orderType === 'LIMIT' 
        ? "Limit order placed successfully (0% fee)"
        : "Prediction placed successfully",
      newBalance: balanceAfter,
      fee,
      orderRole,
    };

    // #region agent log
    logPurchaseFlowServer({
      requestId: purchaseDiagRequestId,
      userId: purchaseDiagUserId,
      location: "placePrediction.ts:mutation",
      phase: "trpc.place_prediction.success",
      apiResponse,
    });
    // #endregion

    return apiResponse;
    } catch (purchaseDiagErr) {
      // #region agent log
      logPurchaseFlowServerError(
        {
          requestId: purchaseDiagRequestId,
          userId: purchaseDiagUserId,
          location: "placePrediction.ts:mutation",
        },
        "trpc.place_prediction.error",
        purchaseDiagErr,
        { payloadReceived: purchaseDiagPayload },
      );
      // #endregion
      throw purchaseDiagErr;
    }
  });
