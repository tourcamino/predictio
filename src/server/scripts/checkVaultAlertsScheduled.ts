import { db } from "~/server/db";
import { env } from "~/server/env";

/**
 * Scheduled script to check vault performance metrics against alert thresholds
 * This should be run periodically (e.g., every hour) via cron or similar
 */
export async function checkVaultAlertsScheduled() {
  console.log('[Vault Alerts] Starting scheduled alert check...');

  try {
    // Get admin wallet from environment variable
    const adminWallet = env.TREASURY_WALLET ?? env.FOUNDER_WALLET;
    
    if (!adminWallet) {
      console.warn('[Vault Alerts] No admin wallet configured, skipping alert check');
      return;
    }

    // Get alert configuration
    const alertConfig = await db.vaultAlertThresholds.findUnique({
      where: { id: 'singleton' },
    });

    if (!alertConfig || !alertConfig.alertsEnabled) {
      console.log('[Vault Alerts] Alerts are disabled, skipping check');
      return;
    }

    // Get current vault state
    const vaultState = await db.vaultState.findUnique({
      where: { id: 'singleton' },
    });

    if (!vaultState) {
      console.error('[Vault Alerts] Vault state not found');
      return;
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

    console.log('[Vault Alerts] Current metrics:', {
      tvl: vaultState.totalTvl,
      utilizationRate: (utilizationRate * 100).toFixed(2) + '%',
      dailyFees,
    });

    const alertsSent: string[] = [];
    const now = new Date();
    const normalizedWallet = adminWallet.toLowerCase();

    // Check if we've sent an alert in the last 24 hours to prevent spam
    const canSendAlert = !alertConfig.lastAlertSent || 
      (now.getTime() - alertConfig.lastAlertSent.getTime()) > 24 * 60 * 60 * 1000;

    if (!canSendAlert) {
      console.log('[Vault Alerts] Alert cooldown active (24h between alerts)');
      return;
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
      console.log('[Vault Alerts] ⚠️  TVL alert sent');
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
      console.log('[Vault Alerts] ⚠️  High utilization alert sent');
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
      console.log('[Vault Alerts] 📊 Low fees alert sent');
    }

    // Update last alert sent timestamp if any alerts were sent
    if (alertsSent.length > 0) {
      await db.vaultAlertThresholds.update({
        where: { id: 'singleton' },
        data: { lastAlertSent: now },
      });
      console.log(`[Vault Alerts] ✅ Sent ${alertsSent.length} alert(s):`, alertsSent);
    } else {
      console.log('[Vault Alerts] ✅ All metrics within thresholds, no alerts sent');
    }

  } catch (error) {
    console.error('[Vault Alerts] Error checking alerts:', error);
  }
}

// Allow running this script directly
if (require.main === module) {
  checkVaultAlertsScheduled()
    .then(() => {
      console.log('[Vault Alerts] Check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Vault Alerts] Fatal error:', error);
      process.exit(1);
    });
}
