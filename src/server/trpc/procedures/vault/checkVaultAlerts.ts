import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const checkVaultAlerts = baseProcedure
  .input(
    z.object({
      adminWallet: z.string(), // Wallet address to send alerts to
    })
  )
  .mutation(async ({ input }) => {
    const { adminWallet } = input;

    // Get alert configuration
    const alertConfig = await db.vaultAlertThresholds.findUnique({
      where: { id: 'singleton' },
    });

    if (!alertConfig || !alertConfig.alertsEnabled) {
      return { success: true, alertsSent: 0, message: 'Alerts are disabled' };
    }

    // Get current vault state
    const vaultState = await db.vaultState.findUnique({
      where: { id: 'singleton' },
    });

    if (!vaultState) {
      return { success: false, error: 'Vault state not found' };
    }

    const utilizationRate = vaultState.totalTvl > 0 
      ? vaultState.exposedLiquidity / vaultState.totalTvl 
      : 0;

    // Calculate daily fees (fees collected in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFees = await db.lPFeeEarning.aggregate({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
      },
      _sum: {
        amount: true,
      },
    });
    const dailyFees = recentFees._sum.amount || 0;

    const alertsSent: string[] = [];
    const now = new Date();
    const normalizedWallet = adminWallet.toLowerCase();

    // Check if we've sent an alert in the last 24 hours to prevent spam
    const canSendAlert = !alertConfig.lastAlertSent || 
      (now.getTime() - alertConfig.lastAlertSent.getTime()) > 24 * 60 * 60 * 1000;

    if (!canSendAlert) {
      return { 
        success: true, 
        alertsSent: 0, 
        message: 'Alert cooldown active (24h between alerts)' 
      };
    }

    // Check TVL threshold
    if (alertConfig.minTvlThreshold && vaultState.totalTvl < alertConfig.minTvlThreshold) {
      await db.notification.create({
        data: {
          walletAddress: normalizedWallet,
          type: 'VAULT_LOW_TVL',
          title: '⚠️ Vault TVL Below Threshold',
          message: `Protocol vault TVL has fallen to $${vaultState.totalTvl.toFixed(2)}, below the configured threshold of $${alertConfig.minTvlThreshold.toFixed(2)}.`,
        },
      });
      alertsSent.push('VAULT_LOW_TVL');
    }

    // Check utilization rate threshold
    if (alertConfig.maxUtilizationRate && utilizationRate > alertConfig.maxUtilizationRate) {
      await db.notification.create({
        data: {
          walletAddress: normalizedWallet,
          type: 'VAULT_HIGH_UTILIZATION',
          title: '⚠️ High Vault Utilization',
          message: `Protocol vault utilization rate is ${(utilizationRate * 100).toFixed(1)}%, exceeding the configured threshold of ${(alertConfig.maxUtilizationRate * 100).toFixed(1)}%. Consider adding more liquidity.`,
        },
      });
      alertsSent.push('VAULT_HIGH_UTILIZATION');
    }

    // Check daily fees threshold
    if (alertConfig.minDailyFeesThreshold && dailyFees < alertConfig.minDailyFeesThreshold) {
      await db.notification.create({
        data: {
          walletAddress: normalizedWallet,
          type: 'VAULT_LOW_DAILY_FEES',
          title: '📊 Low Daily Fee Collection',
          message: `Protocol vault collected only $${dailyFees.toFixed(2)} in fees over the last 24 hours, below the configured threshold of $${alertConfig.minDailyFeesThreshold.toFixed(2)}.`,
        },
      });
      alertsSent.push('VAULT_LOW_DAILY_FEES');
    }

    // Update last alert sent timestamp if any alerts were sent
    if (alertsSent.length > 0) {
      await db.vaultAlertThresholds.update({
        where: { id: 'singleton' },
        data: { lastAlertSent: now },
      });
    }

    return {
      success: true,
      alertsSent: alertsSent.length,
      alerts: alertsSent,
      metrics: {
        tvl: vaultState.totalTvl,
        utilizationRate: utilizationRate * 100,
        dailyFees,
      },
    };
  });
