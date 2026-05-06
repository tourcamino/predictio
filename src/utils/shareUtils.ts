// Interface definitions
interface SharePredictionData {
  marketName: string;
  teamA: string;
  teamB: string;
  outcome: string;
  amount: number;
  odds: number;
  potentialWin: number;
  sportEmoji: string;
  league: string;
}

interface ShareWinData {
  marketName: string;
  teamA: string;
  teamB: string;
  outcome: string;
  amount: number;
  profit: number;
  sportEmoji: string;
  league: string;
}

interface SharePortfolioData {
  totalProfit: number;
  winRate: number;
  totalPredictions: number;
  activePredictions: number;
}

interface ShareAnalystProfileData {
  displayName: string;
  avatar: string;
  roi: number;
  winRate: number;
  totalPredictions: number;
  sport: string[];
  tier: string;
}

interface ShareReferralData {
  displayName: string;
  referralCode: string;
  roi: number;
  winRate: number;
  sport: string[];
}

interface TraderPerformanceShareData {
  displayName: string;
  wallet: string;
  totalPnl: number;
  roi: number;
  winRate: number;
  totalTrades: number;
  totalVolume: number;
  isVerified?: boolean;
  verificationTier?: string;
}

// Helper to get the full market URL
export function getMarketUrl(marketId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/markets/${marketId}`;
  }
  return `/markets/${marketId}`;
}

// Helper to get the full analyst profile URL
export function getAnalystProfileUrl(analystId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/analysts/${analystId}`;
  }
  return `/analysts/${analystId}`;
}

// Helper to get the full referral URL
export function getReferralUrl(referralCode: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/join/${referralCode}`;
  }
  return `/join/${referralCode}`;
}

// Text generation functions
export function generatePredictionShareText(data: SharePredictionData): string {
  const { sportEmoji, teamA, teamB, outcome, odds, amount, league } = data;
  const probability = ((1 / odds) * 100).toFixed(0);
  
  return `${sportEmoji} Just bought ${outcome} shares in ${teamA} vs ${teamB}!

${league}
💰 Investment: $${amount.toLocaleString()} USDC
📊 Price: ${probability}%

Join me on @Predictio and trade on real events!
#Predictio #PredictionMarkets`;
}

export function generateWinShareText(data: ShareWinData): string {
  const { sportEmoji, teamA, teamB, outcome, profit, amount, league } = data;
  const roi = ((profit / amount) * 100).toFixed(0);
  
  return `${sportEmoji} I WON! 🎉

My ${outcome} shares in ${teamA} vs ${teamB} paid off!
${league}

💰 Profit: +$${profit.toLocaleString()} USDC
📈 ROI: +${roi}%

Trade on real events with @Predictio!
#Predictio #PredictionMarkets #Win`;
}

export function generatePortfolioShareText(data: SharePortfolioData): string {
  const { totalProfit, winRate, totalPredictions, activePredictions } = data;
  
  return `📊 My @Predictio Trading Stats:

💰 Total Profit: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toLocaleString()} USDC
🎯 Win Rate: ${winRate}%
📈 Total Positions: ${totalPredictions}
🔥 Active Now: ${activePredictions}

Think you can beat my performance? Join me!
#Predictio #PredictionMarkets`;
}

export function generateAnalystProfileShareText(data: ShareAnalystProfileData): string {
  const { displayName, avatar, roi, winRate, totalPredictions, sport, tier } = data;
  const tierEmoji = tier === 'elite' ? '🏆' : tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🥉';
  const sportEmojis = sport.map(s => {
    const emojiMap: Record<string, string> = {
      'Football': '⚽',
      'MMA': '🥊',
      'Cricket': '🏏',
      'Basketball': '🏀',
      'Tennis': '🎾',
    };
    return emojiMap[s] || '🎯';
  }).join(' ');
  
  return `${avatar} Check out my @Predictio analyst profile!

${tierEmoji} ${tier.toUpperCase()} Tier Analyst
${sportEmojis} ${sport.join(', ')}

📊 Stats:
• ROI: +${roi}%
• Win Rate: ${winRate}%
• Positions: ${totalPredictions}

Follow me and copy my trades!
#Predictio #PredictionMarkets`;
}

export function generateReferralShareText(data: ShareReferralData): string {
  const { displayName, roi, winRate, sport } = data;
  const sportEmojis = sport.map(s => {
    const emojiMap: Record<string, string> = {
      'Football': '⚽',
      'MMA': '🥊',
      'Cricket': '🏏',
      'Basketball': '🏀',
      'Tennis': '🎾',
    };
    return emojiMap[s] || '🎯';
  }).join(' ');
  
  return `🎯 Join me on @Predictio!

I'm ${displayName} ${sportEmojis}
• ${roi}% ROI
• ${winRate}% Win Rate

Sign up with my link and start trading on real sports events with USDC!

#Predictio #PredictionMarkets #Crypto`;
}

export function generateAnalystDashboardShareText(data: {
  displayName: string;
  totalEarned: number;
  validFollowers: number;
  tier: string;
}): string {
  const { displayName, totalEarned, validFollowers, tier } = data;
  const tierEmoji = tier === 'elite' ? '🏆' : tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🥉';
  
  return `${tierEmoji} Analyst Update from ${displayName}

💰 Total Earned: $${totalEarned.toLocaleString()} USDC
👥 Followers: ${validFollowers}
📈 Tier: ${tier.toUpperCase()}

Want to follow my trades? Join @Predictio!
#Predictio #PredictionMarkets`;
}

export function generateTraderPerformanceShareText(data: TraderPerformanceShareData): string {
  const { displayName, totalPnl, roi, winRate, totalTrades, totalVolume, isVerified, verificationTier } = data;
  
  const verifiedBadge = isVerified 
    ? verificationTier === 'elite' 
      ? '⭐' 
      : verificationTier === 'partner'
        ? '🛡️'
        : '✓'
    : '';
  
  return `${verifiedBadge} ${displayName || 'Trader'} Performance on @Predictio

📊 Stats:
💰 Total P&L: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()} USDC
📈 ROI: +${roi.toFixed(1)}%
🎯 Win Rate: ${winRate.toFixed(1)}%
📊 Trades: ${totalTrades}
💵 Volume: $${(totalVolume / 1000).toFixed(0)}K

${isVerified ? '✓ Verified Trader\n' : ''}Trade with me on Predictio!
#Predictio #PredictionMarkets #DeFi`;
}

export function generateTraderStatsShareText(data: {
  displayName: string;
  roi: number;
  winRate: number;
  totalTrades: number;
  isVerified?: boolean;
}): string {
  const { displayName, roi, winRate, totalTrades, isVerified } = data;
  
  return `${isVerified ? '✓ ' : ''}${displayName} on @Predictio

📈 ROI: +${roi.toFixed(1)}%
🎯 Win Rate: ${winRate.toFixed(1)}%
📊 ${totalTrades} trades

${isVerified ? 'Verified Trader | ' : ''}Join me on Predictio!
#PredictionMarkets`;
}

// Platform-specific share URL functions
export function getTwitterShareUrl(text: string, url?: string): string {
  const params = new URLSearchParams({
    text: text,
    ...(url && { url: url }),
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function getTelegramShareUrl(text: string, url?: string): string {
  const fullText = url ? `${text}\n\n${url}` : text;
  const params = new URLSearchParams({
    text: fullText,
  });
  return `https://t.me/share/url?${params.toString()}`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
