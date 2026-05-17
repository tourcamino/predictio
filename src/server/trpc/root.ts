import {
  createCallerFactory,
  createTRPCRouter,
  baseProcedure,
} from "./main";
import { getMarketDetail } from "./procedures/getMarketDetail";
import { getMarketSummaries } from "./procedures/getMarketSummaries";
import { getAzuroMarkets } from "./procedures/getAzuroMarkets";
import { checkAzuroResolutions } from "./procedures/checkAzuroResolutions";
import { placePrediction } from "./procedures/placePrediction";
import { syncUserAccount } from "./procedures/syncUserAccount";
import { getLeaderboard } from "./procedures/getLeaderboard";
import { getLiveActivityFeed } from "./procedures/getLiveActivityFeed";
import { closePosition } from "./procedures/closePosition";
import { resolvePaperPositions } from "./procedures/resolvePaperPositions";
import { refundPaperMarket } from "./procedures/refundPaperMarket";
import { disputePaperMarket } from "./procedures/disputePaperMarket";
import { generateMarketOGImage } from "./procedures/generateMarketOGImage";
import { generateTraderOGImage } from "./procedures/generateTraderOGImage";
import { getMinioBaseUrl } from "./procedures/getMinioBaseUrl";
import { depositUSDC } from "./procedures/depositUSDC";
import { withdrawUSDC } from "./procedures/withdrawUSDC";
import { getTransactionHistory } from "./procedures/getTransactionHistory";
import { getAnalystDetail } from "./procedures/getAnalystDetail";
import { getAnalystPredictionAnalytics } from "./procedures/getAnalystPredictionAnalytics";
import { getAnalystLeaderboard } from "./procedures/getAnalystLeaderboard";
import { followAnalyst } from "./procedures/followAnalyst";
import { getFollowedAnalysts } from "./procedures/getFollowedAnalysts";
import { unfollowAnalyst } from "./procedures/unfollowAnalyst";
import { getAnalystFollowers } from "./procedures/getAnalystFollowers";
import { getAnalystDashboard } from "./procedures/getAnalystDashboard";
import { updateAnalystProfile } from "./procedures/updateAnalystProfile";
import { registerAsAnalyst } from "./procedures/registerAsAnalyst";
import { getAnalystByReferralCode } from "./procedures/getAnalystByReferralCode";
import { calculateAnalystRewards } from "./procedures/calculateAnalystRewards";
import { claimAnalystRewards } from "./procedures/claimAnalystRewards";
import { updateAnalystMetrics } from "./procedures/updateAnalystMetrics";
import { getUserPositions } from "./procedures/getUserPositions";
import { getDbRuntimeIdentity } from "./procedures/getDbRuntimeIdentity";
import { getPaperWalletBalance } from "./procedures/getPaperWalletBalance";
import { getPortfolioSummary } from "./procedures/getPortfolioSummary";
import { getPortfolioPerformanceHistory } from "./procedures/getPortfolioPerformanceHistory";
import { claimHoldingRewards } from "./procedures/claimHoldingRewards";
import { submitAppeal } from "./procedures/submitAppeal";
import { getFeeRevenue } from "./procedures/getFeeRevenue";
import { getLPMarkets } from "./procedures/getLPMarkets";
import { getUserLPPositions } from "./procedures/getUserLPPositions";
import { provideLiquidity } from "./procedures/provideLiquidity";
import { withdrawLiquidity } from "./procedures/withdrawLiquidity";
import { claimLPFees } from "./procedures/claimLPFees";
import { distributeLPFees } from "./procedures/distributeLPFees";
import { updateLPPoolShares } from "./procedures/updateLPPoolShares";
import { getLPAnalytics } from "./procedures/getLPAnalytics";
import { getLPLeaderboard } from "./procedures/getLPLeaderboard";
import { getMarketAPYHistory } from "./procedures/getMarketAPYHistory";
import { isFollowingAnalyst } from "./procedures/isFollowingAnalyst";
import { getBlogPosts } from "./procedures/getBlogPosts";
import { getBlogPostDetail } from "./procedures/getBlogPostDetail";
import { createBlogPost } from "./procedures/admin/createBlogPost";
import { updateBlogPost } from "./procedures/admin/updateBlogPost";
import { deleteBlogPost } from "./procedures/admin/deleteBlogPost";
import { getJobPositions } from "./procedures/getJobPositions";
import { getJobPositionDetail } from "./procedures/getJobPositionDetail";
import { createJobPosition } from "./procedures/admin/createJobPosition";
import { updateJobPosition } from "./procedures/admin/updateJobPosition";
import { deleteJobPosition } from "./procedures/admin/deleteJobPosition";
import { completeOnboarding } from "./procedures/completeOnboarding";
import { getNotifications } from "./procedures/getNotifications";
import { markNotificationRead } from "./procedures/markNotificationRead";
import { markAllNotificationsRead } from "./procedures/markAllNotificationsRead";
import { createNotification } from "./procedures/createNotification";
import { notifyAffiliatesCommissionUpdate } from "./procedures/notifyAffiliatesCommissionUpdate";
import { creditPoints } from "./procedures/points/creditPoints";
import { getPointsSummary } from "./procedures/points/getPointsSummary";
import { getPointsLeaderboard } from "./procedures/points/getPointsLeaderboard";
import { registerLPWaitlist } from "./procedures/registerLPWaitlist";
import { getProtocolVaultStats } from "./procedures/getProtocolVaultStats";
import { getCanonicalLiquidityState } from "./procedures/getCanonicalLiquidityState";
import { getCatalogLiquidityVersion } from "./procedures/getCatalogLiquidityVersion";
import { getLPWaitlistCount } from "./procedures/getLPWaitlistCount";
import { getProtocolVaultPosition } from "./procedures/getProtocolVaultPosition";
import { getLPEarningsHistory } from "./procedures/getLPEarningsHistory";
import { getLPEarningsChartData } from "./procedures/getLPEarningsChartData";
import { toggleLPAutoCompound } from "./procedures/toggleLPAutoCompound";
import { getVaultState } from "./procedures/vault/getVaultState";
import { getVaultAllocations } from "./procedures/vault/getVaultAllocations";
import { getVaultPerformanceHistory } from "./procedures/vault/getVaultPerformanceHistory";
import { getVaultAlertThresholds } from "./procedures/vault/getVaultAlertThresholds";
import { updateVaultAlertThresholds } from "./procedures/vault/updateVaultAlertThresholds";
import { checkVaultAlerts } from "./procedures/vault/checkVaultAlerts";
import { placeAmmOrder } from "./procedures/amm/placeAmmOrder";
import { fillAmmOrder } from "./procedures/amm/fillAmmOrder";
import { cancelAmmOrder } from "./procedures/amm/cancelAmmOrder";
import { getAmmOrders } from "./procedures/amm/getAmmOrders";
import { updateBotHeartbeat } from "./procedures/amm/updateBotHeartbeat";
import { getBotHeartbeat } from "./procedures/amm/getBotHeartbeat";
import { getMarketMakerConfig } from "./procedures/marketMaker/getMarketMakerConfig";
import { updateMarketMakerConfig } from "./procedures/marketMaker/updateMarketMakerConfig";
import { addToWatchlist } from "./procedures/addToWatchlist";
import { removeFromWatchlist } from "./procedures/removeFromWatchlist";
import { getWatchlist } from "./procedures/getWatchlist";
import { createPriceAlert } from "./procedures/createPriceAlert";
import { getPriceAlerts } from "./procedures/getPriceAlerts";
import { deletePriceAlert } from "./procedures/deletePriceAlert";
import { getReferralEarnings } from "./procedures/getReferralEarnings";
import { getPayoutHistory } from "./procedures/getPayoutHistory";
import { getReferralAnalytics } from "./procedures/getReferralAnalytics";
import { startCopyTrading } from "./procedures/startCopyTrading";
import { stopCopyTrading } from "./procedures/stopCopyTrading";
import { getCopyRelationship } from "./procedures/getCopyRelationship";
import { getTraderPerformanceHistory } from "./procedures/getTraderPerformanceHistory";
import { chatbotStream } from "./procedures/chatbotStream";
import { marketAiInsight } from "./procedures/marketAiInsight";
import { expandMarketSearch } from "./procedures/expandMarketSearch";
import { askMarketAi } from "./procedures/askMarketAi";
import {
  verifyAnalyst,
  unverifyAnalyst,
} from "./procedures/admin/verifyAnalyst";
import { runtimeReconciliationReport } from "./procedures/runtimeReconciliationReport";
import { getMarketSettlementDiagnostic } from "./procedures/getMarketSettlementDiagnostic";
import { getMarketProtocolTimeline } from "./procedures/getMarketProtocolTimeline";
import { getSettlementProtocolHealth } from "./procedures/getSettlementProtocolHealth";
import { getSettlementForensicsDashboard } from "./procedures/getSettlementForensicsDashboard";
import { getProtocolPulseSnapshot } from "./procedures/getProtocolPulseSnapshot";

export const appRouter = createTRPCRouter({
  getMarketDetail,
  getMarketSummaries,
  getAzuroMarkets,
  checkAzuroResolutions,
  runtimeReconciliationReport,
  getMarketSettlementDiagnostic,
  getMarketProtocolTimeline,
  getSettlementProtocolHealth,
  getSettlementForensicsDashboard,
  getProtocolPulseSnapshot,
  placePrediction,
  closePosition,
  syncUserAccount,
  getLeaderboard,
  getLiveActivityFeed,
  resolvePaperPositions,
  refundPaperMarket,
  disputePaperMarket,
  generateMarketOGImage,
  generateTraderOGImage,
  getMinioBaseUrl,
  depositUSDC,
  withdrawUSDC,
  getTransactionHistory,
  getAnalystDetail,
  getAnalystPredictionAnalytics,
  getAnalystLeaderboard,
  followAnalyst,
  unfollowAnalyst,
  getFollowedAnalysts,
  isFollowingAnalyst,
  getAnalystFollowers,
  getAnalystDashboard,
  updateAnalystProfile,
  registerAsAnalyst,
  getAnalystByReferralCode,
  calculateAnalystRewards,
  claimAnalystRewards,
  updateAnalystMetrics,
  getUserPositions,
  getDbRuntimeIdentity,
  getPaperWalletBalance,
  getPortfolioSummary,
  getPortfolioPerformanceHistory,
  claimHoldingRewards,
  submitAppeal,
  getFeeRevenue,
  getLPMarkets,
  getUserLPPositions,
  provideLiquidity,
  withdrawLiquidity,
  claimLPFees,
  distributeLPFees,
  updateLPPoolShares,
  getLPAnalytics,
  getLPLeaderboard,
  getMarketAPYHistory,
  getBlogPosts,
  getBlogPostDetail,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getJobPositions,
  getJobPositionDetail,
  createJobPosition,
  updateJobPosition,
  deleteJobPosition,
  completeOnboarding,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  notifyAffiliatesCommissionUpdate,
  // Points procedures
  creditPoints,
  getPointsSummary,
  getPointsLeaderboard,
  registerLPWaitlist,
  getProtocolVaultStats,
  getCanonicalLiquidityState,
  getCatalogLiquidityVersion,
  getLPWaitlistCount,
  getProtocolVaultPosition,
  getLPEarningsHistory,
  getLPEarningsChartData,
  toggleLPAutoCompound,
  // Vault procedures
  getVaultState,
  getVaultAllocations,
  getVaultPerformanceHistory,
  getVaultAlertThresholds,
  updateVaultAlertThresholds,
  checkVaultAlerts,
  // AMM procedures
  placeAmmOrder,
  fillAmmOrder,
  cancelAmmOrder,
  getAmmOrders,
  updateBotHeartbeat,
  getBotHeartbeat,
  // Market Maker procedures
  getMarketMakerConfig,
  updateMarketMakerConfig,
  // Watchlist procedures
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  // Price Alert procedures
  createPriceAlert,
  getPriceAlerts,
  deletePriceAlert,
  getReferralEarnings,
  getPayoutHistory,
  getReferralAnalytics,
  // Copy Trading procedures
  startCopyTrading,
  stopCopyTrading,
  getCopyRelationship,
  getTraderPerformanceHistory,
  // Chatbot & AI helpers
  chatbotStream,
  marketAiInsight,
  expandMarketSearch,
  askMarketAi,
  // Admin procedures
  verifyAnalyst,
  unverifyAnalyst,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
