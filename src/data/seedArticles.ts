export interface Article {
  slug: string;
  title: string;
  category: 'getting-started' | 'how-markets-work' | 'trading-strategies' | 'defi-wallets' | 'risks';
  readTime: number;
  content: string;
  nextArticle?: string;
  prevArticle?: string;
}

export const ARTICLE_CATEGORIES = {
  'getting-started': { name: 'Getting Started', emoji: '🎯', count: 5 },
  'how-markets-work': { name: 'How Markets Work', emoji: '📊', count: 5 },
  'trading-strategies': { name: 'Trading Strategies', emoji: '💰', count: 0 },
  'defi-wallets': { name: 'DeFi & Wallets', emoji: '🔐', count: 0 },
  'risks': { name: 'Risks & Responsibilities', emoji: '⚠️', count: 0 },
};

export const SEED_ARTICLES: Article[] = [
  {
    slug: 'what-is-predictio',
    title: 'What is Predictio?',
    category: 'getting-started',
    readTime: 3,
    content: `# What is Predictio?

Predictio is a decentralized prediction market platform where you can trade on the outcomes of real-world sports events. Unlike traditional sportsbooks, Predictio operates as a peer-to-peer marketplace where prices are determined by supply and demand.

## How It Works

When you trade on Predictio, you're buying and selling shares that represent event outcomes. Each share pays $1 if the outcome happens, $0 if it doesn't. If you buy a YES share for $0.65, you're essentially saying there's a 65% chance of that outcome occurring.

## Key Differences from Sportsbooks

- **No House Edge**: Prices are set by the market, not by a bookmaker
- **Trade Anytime**: Buy and sell before the event ends
- **Transparent Pricing**: All orders visible in the orderbook
- **Non-Custodial**: You control your funds via your wallet

## Why Prediction Markets?

Prediction markets aggregate information from thousands of traders, often producing more accurate probability estimates than expert forecasts. The wisdom of the crowd, combined with real money at stake, creates powerful incentives for accurate pricing.

## Getting Started

To begin trading, you'll need to connect a Web3 wallet like MetaMask and deposit funds. Once connected, you can browse live markets, place orders, and manage your positions all from your dashboard.

Ready to get started? Connect your wallet and explore live markets.`,
    nextArticle: 'your-first-prediction',
  },
  {
    slug: 'your-first-prediction',
    title: 'Making Your First Prediction',
    category: 'getting-started',
    readTime: 4,
    content: `# Making Your First Prediction

Ready to place your first trade? This guide will walk you through the process step-by-step, from finding a market to executing your first order.

## Step 1: Choose a Market

Browse the available markets on the homepage. Look for events you're knowledgeable about—sports you follow, teams you understand. Your edge comes from information and analysis, so start with familiar territory.

## Step 2: Analyze the Market

Before trading, examine the current price. A YES share priced at $0.70 implies a 70% probability. Ask yourself: does this seem accurate? Do you have information or analysis that suggests the true probability is different?

## Step 3: Decide Your Position

If you think the probability is higher than the market price, buy YES shares. If you think it's lower, buy NO shares (or sell YES if you already own them). Remember: you're not just predicting the outcome, you're predicting whether the market has mispriced it.

## Step 4: Place Your Order

Enter the quantity of shares you want to buy and review the total cost. You can place a market order (executes immediately at current price) or a limit order (executes only at your specified price or better).

## Step 5: Confirm the Transaction

Review the details carefully: outcome, quantity, price, and total cost. Once confirmed, you'll sign the transaction with your wallet. After blockchain confirmation, the shares appear in your portfolio.

## Managing Your Position

After buying, you can hold until settlement or sell early if the price moves in your favor. Check your portfolio regularly to track performance and consider taking profits or cutting losses as new information emerges.

## Tips for Beginners

- Start small while learning
- Don't invest more than you can afford to lose
- Research events thoroughly before trading
- Watch how prices move in response to news
- Learn from both winning and losing trades`,
    nextArticle: 'understanding-shares',
    prevArticle: 'what-is-predictio',
  },
  {
    slug: 'understanding-shares',
    title: 'Understanding Shares and Pricing',
    category: 'getting-started',
    readTime: 4,
    content: `# Understanding Shares and Pricing

Prediction market shares work differently from traditional betting. Understanding how they're priced and what they represent is crucial for successful trading.

## What Are Shares?

Each share represents a claim on $1 if a specific outcome occurs. If you own 10 YES shares and the outcome happens, you receive $10. If it doesn't happen, your shares expire worthless.

## Price as Probability

The market price of a share reflects the crowd's collective estimate of probability. A YES share trading at $0.65 suggests the market believes there's a 65% chance of that outcome. This is fundamentally different from traditional odds.

## Calculating Potential Returns

If you buy YES at $0.65:
- **Cost**: $0.65 per share
- **Payout if correct**: $1.00 per share
- **Profit if correct**: $0.35 per share (54% return)
- **Loss if wrong**: $0.65 per share (100% loss)

## YES vs NO Shares

YES and NO shares always sum to $1. If YES trades at $0.65, NO trades at $0.35. Buying NO at $0.35 is economically equivalent to selling YES at $0.65—both profit if the outcome doesn't occur.

## Why Prices Change

Prices fluctuate based on:
- New information (injuries, weather, news)
- Trading activity (large orders moving the market)
- Time decay (as events approach, uncertainty resolves)
- External events (related outcomes affecting probabilities)

## Fair Value vs Market Price

Your edge comes from identifying when market price diverges from fair value. If you calculate a 75% probability but YES trades at $0.65, that's a potential opportunity. However, remember the market aggregates many perspectives—be confident in your analysis before trading against consensus.

## Implied Odds Comparison

For sports bettors: a $0.65 YES share is roughly equivalent to -186 American odds or 1.54 decimal odds. However, prediction markets offer more flexibility since you can sell before settlement.`,
    nextArticle: 'reading-the-orderbook',
    prevArticle: 'your-first-prediction',
  },
  {
    slug: 'reading-the-orderbook',
    title: 'Reading the Orderbook',
    category: 'getting-started',
    readTime: 4,
    content: `# Reading the Orderbook

The orderbook is the heart of Predictio's marketplace. Learning to read it effectively helps you understand market depth, find better prices, and execute smarter trades.

## Orderbook Basics

The orderbook displays all open buy and sell orders. The left side shows bids (buy orders), the right shows asks (sell orders). The spread between the highest bid and lowest ask represents the current market.

## Key Components

**Bids (Buy Orders)**: Traders willing to buy shares at specified prices, sorted highest to lowest. The top bid is the best price you can currently sell at.

**Asks (Sell Orders)**: Traders willing to sell shares at specified prices, sorted lowest to highest. The top ask is the best price you can currently buy at.

**Spread**: The difference between best bid and best ask. Tighter spreads indicate more liquid markets with lower trading costs.

## Reading Depth

The orderbook shows not just the best prices, but all available orders. This depth information reveals:
- How much liquidity exists at each price level
- Where large orders might face slippage
- Support and resistance levels
- Overall market sentiment

## Market Orders vs Limit Orders

**Market Orders** execute immediately against the best available prices in the orderbook. Large market orders may "walk the book," executing at progressively worse prices as they consume available liquidity.

**Limit Orders** add to the orderbook at your specified price. They only execute if someone trades against your order. This gives you price certainty but not execution certainty.

## Strategic Considerations

When placing large orders, check the orderbook depth. If you want to buy 100 shares but only 30 are offered at the best ask, your order will execute at multiple price levels, increasing your average cost.

Consider splitting large orders or using limit orders to avoid slippage. Patience often results in better prices, especially in less liquid markets.

## Real-Time Updates

The orderbook updates in real-time as orders are placed, filled, or cancelled. Watch how it responds to news and events. Sudden changes in depth or spread often signal important information or large trader activity.

Understanding orderbook dynamics separates casual traders from sophisticated ones. Take time to observe before trading.`,
    nextArticle: 'managing-your-portfolio',
    prevArticle: 'understanding-shares',
  },
  {
    slug: 'managing-your-portfolio',
    title: 'Managing Your Portfolio',
    category: 'getting-started',
    readTime: 4,
    content: `# Managing Your Portfolio

Effective portfolio management is crucial for long-term success in prediction markets. This guide covers position tracking, risk management, and strategic decision-making.

## Your Portfolio Dashboard

Your portfolio displays all active positions, showing:
- Current holdings (quantity and outcome)
- Entry price (what you paid per share)
- Current market price
- Unrealized profit/loss
- Total position value

## Position Sizing

Never put all your capital in a single market. Diversification reduces risk and provides more opportunities to profit. A common approach is limiting any single position to 5-10% of your total bankroll.

Consider the event timeline too. Having all positions resolve on the same day concentrates risk. Spread positions across different dates and sports.

## When to Exit

You don't have to hold until settlement. Consider selling when:
- The price has moved significantly in your favor
- New information changes your probability assessment
- You need to free up capital for better opportunities
- The event is approaching and you want to lock in profits

## Tracking Performance

Monitor both individual positions and overall portfolio performance. Key metrics include:
- Win rate (percentage of profitable trades)
- Average profit per winning trade
- Average loss per losing trade
- Return on investment (ROI)
- Sharpe ratio (risk-adjusted returns)

## Risk Management Rules

Successful traders follow disciplined risk management:
- Set maximum loss limits per position
- Use stop-losses (sell if price moves against you)
- Don't chase losses by increasing position sizes
- Take partial profits on winning positions
- Keep some capital in reserve for opportunities

## Rebalancing Strategy

As positions profit or lose, your portfolio allocation shifts. Periodically rebalance by:
- Taking profits from oversized winning positions
- Cutting or exiting losing positions
- Reallocating to new opportunities
- Maintaining your target position sizes

## Tax Considerations

Keep records of all trades for tax purposes. In most jurisdictions, prediction market profits are taxable. Track your cost basis, sale prices, and holding periods. Consider consulting a tax professional familiar with cryptocurrency and prediction market taxation.

## Learning from Results

Review closed positions regularly. What worked? What didn't? Were your probability assessments accurate? Did you exit too early or too late? Continuous learning from both successes and failures improves future performance.`,
    nextArticle: 'market-pricing-basics',
    prevArticle: 'reading-the-orderbook',
  },
  {
    slug: 'market-pricing-basics',
    title: 'Market Pricing Basics',
    category: 'how-markets-work',
    readTime: 4,
    content: `# Market Pricing Basics

Understanding how prediction markets price outcomes is fundamental to successful trading. Prices reflect collective wisdom but aren't always perfectly accurate—that's where opportunities arise.

## Price Discovery

In prediction markets, prices emerge from the interaction of all traders' beliefs and capital. When someone thinks YES is underpriced at $0.60, they buy, pushing the price up. When others think it's overpriced, they sell, pushing it down. This continuous process discovers the market's consensus probability.

## Efficient Market Hypothesis

The efficient market hypothesis suggests prices reflect all available information. In practice, prediction markets are often efficient but not perfectly so. Inefficiencies create trading opportunities for those with superior information or analysis.

## Information Aggregation

Prediction markets excel at aggregating dispersed information. A trader might know about a key player's injury, another about weather conditions, another about historical matchup data. Their trades collectively incorporate all this information into the price.

## Why Markets Can Be Wrong

Despite their power, prediction markets can misprice outcomes due to:
- **Limited liquidity**: Small markets with few traders
- **Bias**: Systematic overconfidence or wishful thinking
- **Information asymmetry**: Some traders know more than others
- **Manipulation**: Large traders moving prices artificially
- **Correlation errors**: Misunderstanding how events relate

## Arbitrage Opportunities

When related markets price inconsistently, arbitrage opportunities emerge. For example, if Team A to win prices at $0.60 and Team B to win prices at $0.50 in a two-team game, buying both guarantees profit since one must win.

## Time Value

As events approach, prices typically become more accurate as uncertainty resolves. Early prices reflect less information and more speculation. Late prices incorporate breaking news, lineup changes, and other last-minute factors.

## Volume and Confidence

High trading volume suggests strong conviction and typically more accurate pricing. Low volume markets may have wider spreads and less reliable prices. Always consider liquidity when evaluating whether a price represents true consensus.

## Market Makers

Some traders act as market makers, continuously offering to buy and sell at slightly different prices. They profit from the spread while providing liquidity. Their presence tightens spreads and improves price discovery.

## Your Edge

To profit consistently, you need an edge—something that lets you assess probabilities better than the market. This might be:
- Superior analytical models
- Faster access to information
- Better understanding of specific sports or teams
- Psychological insights into market biases

Without an edge, you're essentially gambling against the collective wisdom of all other traders.`,
    nextArticle: 'liquidity-and-spreads',
    prevArticle: 'managing-your-portfolio',
  },
  {
    slug: 'liquidity-and-spreads',
    title: 'Liquidity and Spreads',
    category: 'how-markets-work',
    readTime: 4,
    content: `# Liquidity and Spreads

Liquidity and spreads are critical concepts that affect your trading costs and execution quality. Understanding them helps you trade more efficiently and avoid costly mistakes.

## What Is Liquidity?

Liquidity measures how easily you can buy or sell without significantly impacting the price. High liquidity means:
- Many buyers and sellers
- Large order sizes available
- Quick execution
- Minimal price impact

Low liquidity means the opposite—your orders may move prices substantially or take time to fill.

## The Bid-Ask Spread

The spread is the difference between the highest price someone will pay (bid) and the lowest price someone will accept (ask). If the best bid is $0.63 and best ask is $0.67, the spread is $0.04 or 4 cents.

## Spread as a Cost

The spread represents an implicit trading cost. If you buy at $0.67 and immediately sell at $0.63, you lose $0.04 per share—the spread. Tighter spreads mean lower trading costs.

## Factors Affecting Liquidity

Several factors influence market liquidity:

**Event Popularity**: Major games attract more traders and tighter spreads than obscure matchups.

**Time to Settlement**: Markets typically gain liquidity as events approach and interest increases.

**Market Uncertainty**: Highly uncertain outcomes may have wider spreads as traders demand compensation for risk.

**Platform Activity**: Overall platform usage affects individual market liquidity.

## Measuring Liquidity

Beyond the spread, consider:
- **Depth**: Total volume available near the current price
- **Order book thickness**: Number of orders at each price level
- **Recent volume**: How much has traded recently
- **Time to fill**: How quickly orders execute

## Trading in Illiquid Markets

When trading illiquid markets:
- Use limit orders to control your price
- Split large orders to avoid moving the market
- Be patient—better prices may appear
- Consider the spread cost in your profit calculations
- Avoid market orders that might execute at poor prices

## Providing Liquidity

You can profit by providing liquidity—placing limit orders that others trade against. If you place a buy order at $0.63 and a sell order at $0.67, you earn the $0.04 spread when both fill. This is market making.

However, market making carries risks:
- Adverse selection (informed traders taking your orders)
- Inventory risk (holding positions that move against you)
- Capital requirements (tying up funds in open orders)

## Spread Dynamics

Spreads widen when:
- Uncertainty increases (breaking news, injuries)
- Liquidity providers withdraw (market stress)
- Large orders enter the market
- Trading volume decreases

Spreads tighten when:
- More traders participate
- Uncertainty decreases
- Market makers compete
- Volume increases

## Impact on Strategy

Your trading strategy should account for liquidity:
- Frequent traders need tight spreads to overcome costs
- Long-term holders can tolerate wider spreads
- Large positions require deep liquidity
- Arbitrage strategies need tight spreads to be profitable

Always factor spread costs into your expected returns.`,
    nextArticle: 'market-efficiency',
    prevArticle: 'market-pricing-basics',
  },
  {
    slug: 'market-efficiency',
    title: 'Market Efficiency and Information',
    category: 'how-markets-work',
    readTime: 4,
    content: `# Market Efficiency and Information

Market efficiency determines how quickly and accurately prices reflect available information. Understanding efficiency helps you identify when markets are likely to be right—and when they might be wrong.

## Degrees of Efficiency

**Strong Efficiency**: Prices reflect all information, public and private. Nearly impossible to profit except by luck. Very few markets achieve this.

**Semi-Strong Efficiency**: Prices reflect all public information but not private information. Those with inside information can profit.

**Weak Efficiency**: Prices reflect historical data but not all public information. Analysis of news and events can provide an edge.

Most prediction markets fall between weak and semi-strong efficiency.

## Information Flow

Prices update as new information arrives:

**Immediate Impact**: Major news (injury announcements, lineup changes) typically moves prices within seconds as informed traders react quickly.

**Gradual Incorporation**: Complex information requiring analysis (statistical trends, weather forecasts) may take longer to fully reflect in prices.

**Overreaction and Correction**: Markets sometimes overreact to news, then correct as traders reassess. This creates short-term trading opportunities.

## Sources of Inefficiency

Markets become inefficient due to:

**Limited Participation**: Fewer traders means less information aggregation and more pricing errors.

**Cognitive Biases**: Overconfidence, recency bias, and wishful thinking cause systematic mispricing.

**Information Costs**: Gathering and analyzing information takes time and effort. Not all traders invest equally.

**Capital Constraints**: Even when traders identify mispricing, limited capital may prevent them from fully correcting it.

**Manipulation**: Large traders can temporarily distort prices, though this usually creates opportunities for others.

## Testing Market Accuracy

You can evaluate market efficiency by:
- Comparing final prices to actual outcomes
- Checking if prices respond appropriately to news
- Looking for exploitable patterns
- Measuring calibration (do 70% probabilities occur 70% of the time?)

Research shows prediction markets are often well-calibrated, especially for popular events.

## Your Information Edge

To profit from inefficiency, you need an information advantage:

**Speed**: React to news faster than others. Set up alerts, follow key sources, automate when possible.

**Analysis**: Develop better models or analytical frameworks. Statistical analysis, machine learning, or domain expertise can provide edges.

**Synthesis**: Combine multiple information sources in ways others don't. Understanding correlations and dependencies helps.

**Contrarian Thinking**: Identify when markets are biased. If everyone overvalues favorites, betting underdogs may be profitable.

## Information vs Noise

Not all information is valuable. Distinguish between:

**Signal**: Information that genuinely affects outcome probabilities (injury reports, weather, lineup changes).

**Noise**: Random fluctuations or irrelevant news that doesn't change true probabilities.

Overreacting to noise is a common mistake. Focus on information that materially impacts outcomes.

## Market Wisdom

The "wisdom of crowds" phenomenon means aggregated predictions often exceed individual expert forecasts. However, this requires:
- Diverse, independent traders
- Proper incentives (real money at stake)
- Sufficient liquidity
- No systematic biases

When these conditions hold, betting against the market requires strong justification.

## Continuous Learning

Market efficiency isn't static. As more sophisticated traders enter, markets become more efficient. Strategies that worked previously may stop working. Successful traders continuously adapt, finding new edges as old ones disappear.`,
    nextArticle: 'order-types-explained',
    prevArticle: 'liquidity-and-spreads',
  },
  {
    slug: 'order-types-explained',
    title: 'Order Types Explained',
    category: 'how-markets-work',
    readTime: 4,
    content: `# Order Types Explained

Different order types serve different trading strategies. Understanding when to use each type helps you execute trades more effectively and at better prices.

## Market Orders

Market orders execute immediately at the best available price. When you place a market buy order, you purchase from the lowest ask. A market sell order sells to the highest bid.

**Advantages**:
- Guaranteed execution (if liquidity exists)
- Immediate fills
- Simple to understand

**Disadvantages**:
- No price control
- Potential slippage on large orders
- May execute at unfavorable prices in volatile markets

**Best for**: Small orders in liquid markets when speed matters more than price precision.

## Limit Orders

Limit orders specify the maximum price you'll pay (buy) or minimum you'll accept (sell). A buy limit at $0.65 only executes at $0.65 or better. A sell limit at $0.70 only executes at $0.70 or better.

**Advantages**:
- Price control
- No slippage
- Can capture favorable price movements
- Provide liquidity (earn the spread)

**Disadvantages**:
- May not execute
- Require monitoring
- Opportunity cost if price moves away

**Best for**: Patient traders, large orders, illiquid markets, or when you have a specific target price.

## Limit Order Strategy

Place buy limits below current ask and sell limits above current bid. This positions you to:
- Buy at better prices if the market dips
- Sell at better prices if the market rises
- Earn the spread if both orders fill

However, your orders may not fill if prices don't reach your limits.

## Partial Fills

Large orders may fill partially. If you want 100 shares but only 30 are available at your limit price, you might get a partial fill of 30 shares. The remaining 70 shares stay as an open order.

You can specify "fill or kill" (execute completely or cancel) or "immediate or cancel" (fill what's available, cancel the rest) to control this behavior.

## Order Duration

Orders can be:

**Good Till Cancelled (GTC)**: Remains active until filled or manually cancelled.

**Good Till Date**: Automatically cancels at a specified time.

**Immediate or Cancel (IOC)**: Fills immediately available quantity, cancels the rest.

**Fill or Kill (FOK)**: Fills completely immediately or cancels entirely.

## Stop Orders

Stop orders trigger when price reaches a specified level. A stop-loss at $0.50 automatically sells if price drops to $0.50, limiting your losses.

**Stop-Loss**: Sells when price falls to your stop level, protecting against further losses.

**Stop-Limit**: Triggers a limit order at your stop level, giving price control but not execution certainty.

**Best for**: Risk management, protecting profits, or entering positions at specific price levels.

## Order Placement Strategy

Consider this approach:

1. **Assess urgency**: Need immediate execution? Use market orders.
2. **Check liquidity**: Thin orderbook? Use limit orders to avoid slippage.
3. **Set realistic limits**: Too far from market price won't fill.
4. **Monitor positions**: Adjust orders as market conditions change.
5. **Use stops**: Protect against adverse moves, especially overnight.

## Advanced Techniques

**Scaling In**: Place multiple limit orders at different prices to build positions gradually.

**Scaling Out**: Place multiple sell limits to take profits at different levels.

**Bracket Orders**: Combine profit targets and stop-losses to manage positions automatically.

## Common Mistakes

- Using market orders in illiquid markets (excessive slippage)
- Setting unrealistic limit prices that never fill
- Forgetting to cancel old orders
- Not using stops for risk management
- Chasing prices with repeated market orders

Master these order types to trade more effectively and efficiently.`,
    nextArticle: 'settlement-process',
    prevArticle: 'market-efficiency',
  },
  {
    slug: 'settlement-process',
    title: 'Settlement and Resolution',
    category: 'how-markets-work',
    readTime: 4,
    content: `# Settlement and Resolution

Understanding how markets settle and resolve is crucial for managing positions and planning your trading strategy. This guide covers the entire settlement process from event completion to payout.

## When Markets Settle

Markets settle after the event concludes and the outcome is definitively determined. For sports events, this typically means:
- Game completion (including overtime if applicable)
- Official result confirmation
- Any relevant review periods

Settlement timing varies by event type and may include delays for official confirmation.

## Resolution Process

**Step 1: Event Completion** - The real-world event finishes with a definitive outcome.

**Step 2: Verification** - Predictio verifies the outcome using official sources (league websites, sports data providers, multiple independent sources).

**Step 3: Resolution** - The market is marked as resolved with the correct outcome.

**Step 4: Settlement** - Winning shares are redeemed for $1 each. Losing shares expire worthless.

**Step 5: Payout** - Funds are credited to traders' accounts and available for withdrawal or reinvestment.

## Verification Sources

Predictio uses multiple authoritative sources to verify outcomes:
- Official league websites and APIs
- Established sports data providers
- Multiple independent confirmations
- Blockchain oracles for decentralized verification

This multi-source approach ensures accuracy and prevents manipulation.

## Disputed Outcomes

Rarely, outcomes may be disputed due to:
- Overturned results (disqualifications, rule violations)
- Ambiguous event definitions
- Technical issues or data errors

In such cases, Predictio follows a dispute resolution process:
1. Temporary settlement hold
2. Investigation using official sources
3. Community input if needed
4. Final determination by resolution committee
5. Settlement based on official outcome

## Calculating Payouts

Payouts are straightforward:
- **Winning shares**: Receive $1.00 per share
- **Losing shares**: Receive $0.00 per share

If you own 50 YES shares and YES wins, you receive $50. If NO wins, you receive $0.

Your profit equals payout minus cost. If you bought those 50 shares for $32.50 ($0.65 each), your profit is $17.50 ($50 payout - $32.50 cost).

## Early Settlement

Some markets may settle early if the outcome becomes certain before the event completes. For example, if a team leads by an insurmountable margin with seconds remaining, the market might settle early.

Early settlement is rare and only occurs when the outcome is absolutely certain.

## Tax Implications

Settlement triggers taxable events in most jurisdictions. Your profit (payout minus cost basis) is typically taxable income. Keep detailed records of:
- Purchase prices and dates
- Quantities bought and sold
- Settlement amounts
- Transaction fees

Consult a tax professional familiar with prediction markets and cryptocurrency taxation.

## Post-Settlement Actions

After settlement:
- Review your performance on that market
- Analyze whether your probability assessment was accurate
- Consider what you learned for future trades
- Reinvest profits or withdraw funds as desired

## Settlement Delays

Occasionally, settlement may be delayed due to:
- Pending official reviews or appeals
- Data provider issues
- Ambiguous outcomes requiring investigation
- Technical problems

Predictio communicates any delays and expected resolution timelines. Your funds remain secure during delays.

## Voided Markets

In extremely rare cases, markets may be voided if:
- The event is cancelled and not rescheduled
- The market was created with incorrect parameters
- Technical issues prevent fair resolution

Voided markets return all funds to traders at their purchase prices. No one profits or loses.

## Best Practices

- Understand settlement criteria before trading
- Don't assume early settlement will occur
- Keep records for tax purposes
- Verify outcomes independently if desired
- Plan your trading around settlement timelines

Understanding settlement helps you manage positions effectively and avoid surprises.`,
    prevArticle: 'order-types-explained',
  },
];
