export type NotificationType =
  // Trading events
  | 'TRADE_FILLED'
  | 'TRADE_PARTIAL_FILL'
  | 'TRADE_FAILED'
  // Position events
  | 'POSITION_PROFIT_MILESTONE'
  | 'POSITION_LOSS_WARNING'
  | 'POSITION_PRICE_MOVED'
  // Market events
  | 'MARKET_RESOLVED_WON'
  | 'MARKET_RESOLVED_LOST'
  | 'MARKET_CANCELLED'
  | 'MARKET_ENDING_SOON'
  // Wallet events
  | 'DEPOSIT_RECEIVED'
  | 'WITHDRAWAL_CONFIRMED'
  | 'LOW_ETH_GAS'
  | 'LOW_USDC_BALANCE'
  // Claims events
  | 'CLAIM_AVAILABLE'
  | 'CLAIM_CONFIRMED'
  // Analyst events
  | 'NEW_FOLLOWER'
  | 'FOLLOWER_MILESTONE'
  | 'NEW_ANALYST_PREDICTION'
  // LP events
  | 'LP_FEE_EARNED'
  // Vault alerts
  | 'VAULT_LOW_TVL'
  | 'VAULT_HIGH_UTILIZATION'
  | 'VAULT_LOW_DAILY_FEES'
  // System events
  | 'WS_DISCONNECTED'
  | 'NEW_FEATURE'
  | 'MAINTENANCE';

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
  actionLabel?: string;
  timestamp: Date;
  read: boolean;
  archived: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  // Trading events
  tradeFilled: boolean;
  tradePartialFill: boolean;
  tradeFailed: boolean;
  
  // Position events
  positionProfitMilestone: boolean;
  positionLossWarning: boolean;
  positionPriceMoved: boolean;
  profitMilestones: number[]; // [25, 50, 100]
  lossWarnings: number[]; // []
  
  // Market events
  marketResolved: boolean;
  claimAvailable: boolean;
  marketEndingSoon: boolean;
  marketEndingIn24h: boolean;
  
  // Wallet events
  depositReceived: boolean;
  withdrawalConfirmed: boolean;
  lowEthGas: boolean;
  lowUsdcBalance: boolean;
  
  // Toast settings
  toastEnabled: boolean;
  toastDurationMs: number;
  toastSoundEnabled: boolean;
  
  // Browser notifications
  browserNotificationsEnabled: boolean;
}
