import { minioClient } from "../minio";
import { db } from "../db";
import { mockAnalysts } from "../../data/mockAffiliates";
import { cleanupOldNotifications } from "./cleanupOldNotifications";
import { createCaller } from "../trpc/root";
import { env } from "../env";
import { seedCopyTradingExperience } from "./seedCopyTrading";

/** Legacy `mockMarkets` DB seed removed — market rows are created from Azuro trades and curation only. */
async function logAzuroOnlyMarketPolicy() {
  console.log(
    "[Setup] Market rows: Azuro / curated catalog only (no static mock seed).",
  );
}

async function logTableCounts() {
  const [
    users,
    markets,
    orders,
    analysts,
    affiliates,
    vaultAllocations,
    pointsTotals,
  ] = await Promise.all([
    db.user.count(),
    db.market.count(),
    db.order.count(),
    db.analyst.count(),
    db.affiliate.count(),
    db.vaultAllocation.count(),
    db.pointsTotal.count(),
  ]);
  console.log(
    "[DB COUNTS]",
    JSON.stringify({
      users,
      markets,
      orders,
      analysts,
      affiliates,
      vaultAllocations,
      pointsTotals,
    }),
  );
}

async function seedAnalysts() {
  console.log("Seeding analyst data...");
  
  for (const mockAnalyst of mockAnalysts) {
    try {
      const wallet = mockAnalyst.wallet.toLowerCase();
      await db.analyst.upsert({
        where: { wallet },
        create: {
          wallet,
          displayName: mockAnalyst.displayName,
          avatar: mockAnalyst.avatar,
          bio: mockAnalyst.bio,
          sport: mockAnalyst.sport,
          verificationTier: mockAnalyst.verificationTier ?? null,
          roi: mockAnalyst.roi,
          winRate: mockAnalyst.winRate,
          totalPredictions: mockAnalyst.totalPredictions,
          avgOdds: mockAnalyst.avgOdds,
          followersCount: mockAnalyst.followersCount,
          volumeGenerated: mockAnalyst.volumeGenerated,
          pendingRewards: mockAnalyst.pendingRewards,
          totalEarned: mockAnalyst.totalEarned,
          autoCompound: mockAnalyst.autoCompound,
          activityDays: mockAnalyst.activityDays,
          validFollowers: mockAnalyst.validFollowers,
          onchainRegistered: mockAnalyst.onchainRegistered,
          referralCode: mockAnalyst.referralCode,
        },
        update: {
          displayName: mockAnalyst.displayName,
          avatar: mockAnalyst.avatar,
          bio: mockAnalyst.bio,
          sport: mockAnalyst.sport,
          verificationTier: mockAnalyst.verificationTier ?? null,
          avgOdds: mockAnalyst.avgOdds,
          pendingRewards: mockAnalyst.pendingRewards,
          totalEarned: mockAnalyst.totalEarned,
          autoCompound: mockAnalyst.autoCompound,
          activityDays: mockAnalyst.activityDays,
        },
      });
      console.log(`Upserted analyst: ${mockAnalyst.displayName}`);
    } catch (error) {
      console.error(`Error seeding analyst ${mockAnalyst.displayName}:`, error);
    }
  }
  
  console.log("Analyst seeding complete");
}

async function seedBlogPosts() {
  console.log("Seeding blog posts...");
  
  const existingPosts = await db.blogPost.count();
  
  if (existingPosts > 0) {
    console.log("Blog posts already exist, skipping seed");
    return;
  }
  
  const blogPosts = [
    {
      title: "The Future of Decentralized Betting",
      slug: "the-future-of-decentralized-betting",
      excerpt: "Explore how Web3 technology is revolutionizing the sports betting industry with transparency, fairness, and global accessibility.",
      content: `# The Future of Decentralized Betting

The sports betting industry is undergoing a revolutionary transformation thanks to Web3 technology. Traditional betting platforms have long been plagued by issues of transparency, accessibility, and trust. Decentralized prediction markets are changing all of that.

## Why Decentralization Matters

Blockchain technology brings several key advantages to sports betting:

- **Transparency**: Every bet, every outcome, and every transaction is recorded on an immutable ledger
- **Global Access**: No geographic restrictions or banking limitations
- **Fair Odds**: Peer-to-peer markets eliminate the house edge
- **Instant Settlements**: Smart contracts enable immediate payouts

## The Technology Behind It

Decentralized betting platforms leverage smart contracts on blockchain networks to create trustless, automated markets. Users can place predictions directly against each other, with the blockchain ensuring fair execution and settlement.

## Looking Ahead

As Web3 adoption grows, we expect to see decentralized prediction markets expand beyond sports into politics, entertainment, and financial markets. The future is decentralized, transparent, and accessible to all.`,
      featuredImage: null,
      tags: ["Web3", "Blockchain", "DeFi", "Innovation"],
      metaTitle: "The Future of Decentralized Betting | Web3 Sports Prediction Markets",
      metaDescription: "Discover how blockchain and Web3 technology are revolutionizing sports betting with transparency, fairness, and global accessibility.",
      published: true,
    },
    {
      title: "How to Analyze Sports Data for Better Predictions",
      slug: "how-to-analyze-sports-data-for-better-predictions",
      excerpt: "Learn the essential techniques and metrics used by professional analysts to make informed sports predictions and improve your win rate.",
      content: `# How to Analyze Sports Data for Better Predictions

Making successful sports predictions requires more than just gut feeling. Professional analysts use data-driven approaches to gain an edge. Here's how you can too.

## Key Metrics to Track

### Team Performance
- Win/loss records
- Points scored vs. points allowed
- Home vs. away performance
- Recent form (last 5-10 games)

### Player Statistics
- Individual player performance metrics
- Injury reports and player availability
- Head-to-head matchup history

### Advanced Analytics
- Expected goals (xG) in soccer
- Player efficiency rating (PER) in basketball
- DVOA (Defense-adjusted Value Over Average) in football

## Tools and Resources

There are numerous free and paid tools available for sports data analysis:

- **Statistics websites**: Track historical data and trends
- **Odds comparison sites**: Identify value bets
- **Advanced analytics platforms**: Access proprietary metrics

## Building Your Analysis Framework

1. **Collect relevant data** from reliable sources
2. **Identify patterns** and trends in historical performance
3. **Consider context** like injuries, weather, and motivation
4. **Calculate probabilities** based on your analysis
5. **Compare with market odds** to find value

## Common Mistakes to Avoid

- Overreacting to recent results
- Ignoring sample size
- Letting emotions influence decisions
- Chasing losses

Start small, track your predictions, and continuously refine your approach based on results.`,
      featuredImage: null,
      tags: ["Education", "Analytics", "Strategy", "Tutorial"],
      metaTitle: "How to Analyze Sports Data for Better Predictions | Expert Guide",
      metaDescription: "Master the art of sports prediction with our comprehensive guide to data analysis, key metrics, and professional techniques.",
      published: true,
    },
    {
      title: "NBA Finals 2026: Market Trends and Liquidity",
      slug: "nba-finals-2026-market-trends-and-liquidity",
      excerpt: "An in-depth look at the prediction markets surrounding the NBA Finals, including volume trends, odds movements, and liquidity analysis.",
      content: `# NBA Finals 2026: Market Trends and Liquidity

The NBA Finals are always a major event for prediction markets, and 2026 is shaping up to be one of the most active years yet. Let's dive into the market dynamics.

## Current Market Overview

As of today, the NBA Finals prediction markets are showing unprecedented activity:

- **Total Volume**: Over $50M in predictions placed
- **Number of Bettors**: 125,000+ unique participants
- **Average Position Size**: $400

## Odds Movement Analysis

The odds have been highly dynamic throughout the playoffs:

### Eastern Conference Champion
- Early favorite shifted from Boston to Milwaukee
- Current odds reflect a competitive series

### Western Conference Champion  
- Denver maintaining strong position
- Phoenix emerging as dark horse

## Liquidity Depth

One of the most impressive aspects of decentralized prediction markets is the liquidity depth. The NBA Finals markets are showing:

- **Bid-ask spreads** of less than 1%
- **Market depth** sufficient for positions up to $100K
- **Price stability** even during high-volume periods

## Trading Strategies

Professional traders are employing various strategies:

1. **Early positioning** on undervalued teams
2. **Live betting** during games for arbitrage opportunities
3. **Hedging** positions as odds shift

## What This Means for the Future

The success of NBA Finals prediction markets demonstrates the viability of decentralized sports betting at scale. As liquidity grows, we expect to see even tighter spreads and more efficient markets.`,
      featuredImage: null,
      tags: ["NBA", "News", "Market Analysis", "Liquidity"],
      metaTitle: "NBA Finals 2026: Market Trends and Liquidity Analysis",
      metaDescription: "Comprehensive analysis of NBA Finals 2026 prediction markets, including volume trends, odds movements, and liquidity depth.",
      published: true,
    },
    {
      title: "The Rise of Crypto in the Global Sports Industry",
      slug: "the-rise-of-crypto-in-the-global-sports-industry",
      excerpt: "Cryptocurrency is transforming the sports industry beyond just betting. Explore how teams, leagues, and athletes are embracing digital assets.",
      content: `# The Rise of Crypto in the Global Sports Industry

Cryptocurrency adoption in sports has accelerated dramatically over the past few years. What started with sponsorship deals has evolved into a fundamental shift in how sports organizations operate.

## Major Developments

### Team and League Adoption

Several major sports organizations have embraced crypto:

- **NBA teams** launching fan tokens
- **Soccer clubs** accepting crypto payments
- **Formula 1** partnering with crypto exchanges
- **UFC** integrating blockchain technology

### Athlete Involvement

Top athletes are becoming crypto advocates:

- Salary payments in cryptocurrency
- NFT collections and digital memorabilia
- Personal token launches
- Investment in Web3 projects

## Use Cases Beyond Betting

### Fan Engagement
- Tokenized voting rights for team decisions
- Exclusive access to events and content
- Rewards programs using blockchain

### Ticketing
- NFT-based tickets preventing fraud
- Secondary market transparency
- Enhanced fan experiences

### Sponsorships
- Crypto company sponsorship deals
- Stadium naming rights
- Jersey partnerships

## Economic Impact

The financial impact is substantial:

- Over $5B in crypto sponsorship deals (2023-2025)
- Growing market for sports NFTs
- New revenue streams for teams and athletes

## Challenges and Opportunities

While adoption is growing, challenges remain:

- Regulatory uncertainty in various jurisdictions
- Volatility concerns for salary payments
- Education needed for mainstream adoption

However, the opportunities far outweigh the challenges. Sports organizations that embrace crypto early are positioning themselves for the future of fan engagement and revenue generation.

## Looking Forward

We expect to see:

- More leagues launching official tokens
- Increased integration of DeFi in sports finance
- Blockchain-based fantasy sports platforms
- Metaverse sports experiences

The intersection of crypto and sports is just beginning, and the next few years will be transformative.`,
      featuredImage: null,
      tags: ["Crypto", "Industry", "Sports", "Innovation"],
      metaTitle: "The Rise of Crypto in the Global Sports Industry",
      metaDescription: "How cryptocurrency is transforming sports beyond betting, from fan tokens to NFTs and blockchain-based engagement.",
      published: true,
    },
    {
      title: "Understanding Odds: A Guide for Beginners",
      slug: "understanding-odds-a-guide-for-beginners",
      excerpt: "New to sports betting? This comprehensive guide breaks down how odds work, how to calculate potential returns, and how to identify value.",
      content: `# Understanding Odds: A Guide for Beginners

If you're new to sports prediction markets, understanding odds is essential. This guide will walk you through everything you need to know.

## What Are Odds?

Odds represent the probability of an event occurring and determine your potential payout. In prediction markets, odds are expressed as probabilities between 0 and 1 (or 0% and 100%).

## Types of Odds Formats

### Decimal Odds (Most Common)
- Format: 2.50, 1.80, 3.00
- Calculation: Stake × Odds = Total Return
- Example: $100 at 2.50 odds = $250 total return ($150 profit)

### Fractional Odds
- Format: 3/1, 5/2, 1/2
- Common in UK markets
- Example: 3/1 means you win $3 for every $1 staked

### American Odds
- Format: +200, -150, +300
- Positive numbers show profit on $100 stake
- Negative numbers show stake needed to win $100

## Probability vs. Odds

Understanding the relationship between probability and odds:

- 50% probability = 2.00 decimal odds
- 33.3% probability = 3.00 decimal odds
- 25% probability = 4.00 decimal odds

**Formula**: Decimal Odds = 1 / Probability

## Implied Probability

Odds contain an "implied probability" - the bookmaker's assessment of likelihood:

**Formula**: Implied Probability = 1 / Decimal Odds

Example: Odds of 2.50 imply a 40% chance (1/2.50 = 0.40)

## Finding Value

A "value bet" occurs when you believe the true probability is higher than the implied probability:

- Market odds: 3.00 (33.3% implied probability)
- Your assessment: 40% probability
- This represents value!

## Understanding Market Movements

Odds change based on:

1. **New information** (injuries, weather, etc.)
2. **Betting volume** (where money is going)
3. **Market sentiment** (public opinion)

## Common Beginner Mistakes

### 1. Chasing High Odds
High odds = low probability. Don't bet on longshots just because the payout is attractive.

### 2. Ignoring Bankroll Management
Never bet more than you can afford to lose. Recommended: 1-5% of bankroll per bet.

### 3. Emotional Betting
Don't let team loyalty or recent losses influence your decisions.

### 4. Not Shopping for Best Odds
Different platforms may offer different odds. Always compare.

## Practical Example

Let's say you want to bet on an NBA game:

- Team A: 1.80 odds (55.6% implied probability)
- Team B: 2.20 odds (45.5% implied probability)

Notice these add up to more than 100%? That's the "margin" - the platform's built-in profit. In decentralized markets, this margin is typically much lower.

## Advanced Concepts

### Expected Value (EV)
EV = (Probability of Winning × Profit) - (Probability of Losing × Stake)

Positive EV = Good bet
Negative EV = Bad bet

### Arbitrage Opportunities
When odds differences across platforms allow guaranteed profit (rare in efficient markets).

## Next Steps

Now that you understand odds:

1. Start with small stakes while learning
2. Track your predictions and results
3. Study market movements
4. Learn from experienced traders
5. Continuously refine your strategy

Remember: Successful betting is about finding value and managing risk, not just picking winners.`,
      featuredImage: null,
      tags: ["Tutorial", "Beginner", "Education", "Odds"],
      metaTitle: "Understanding Odds: Complete Beginner's Guide to Sports Betting",
      metaDescription: "Learn how odds work, calculate potential returns, and identify value bets with our comprehensive beginner's guide to sports prediction markets.",
      published: true,
    },
  ];
  
  for (const post of blogPosts) {
    try {
      await db.blogPost.create({ data: post });
      console.log(`Created blog post: ${post.title}`);
    } catch (error) {
      console.error(`Error creating blog post ${post.title}:`, error);
    }
  }
  
  console.log("Blog post seeding complete");
}

async function seedJobPositions() {
  console.log("Seeding job positions...");
  
  const existingPositions = await db.jobPosition.count();
  
  if (existingPositions > 0) {
    console.log("Job positions already exist, skipping seed");
    return;
  }
  
  const jobPositions = [
    {
      title: "Senior Solidity Developer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: `# Senior Solidity Developer

We're looking for an experienced Solidity developer to help build the future of decentralized prediction markets.

## About the Role

You'll be working on cutting-edge smart contracts that power our prediction market platform, handling millions in volume and serving thousands of users globally.

## What You'll Do

- Design and implement secure smart contracts for prediction markets
- Optimize gas efficiency and contract architecture
- Conduct security audits and implement best practices
- Collaborate with frontend and backend teams
- Contribute to protocol design decisions

## Technologies We Use

- Solidity, Hardhat, Foundry
- EVM-compatible chains (Ethereum, Polygon, Arbitrum)
- The Graph for indexing
- IPFS for decentralized storage`,
      requirements: `## Requirements

- 3+ years of professional Solidity development experience
- Deep understanding of EVM and smart contract security
- Experience with DeFi protocols (AMMs, lending, prediction markets)
- Strong knowledge of gas optimization techniques
- Familiarity with security tools (Slither, Mythril, etc.)
- Experience with testing frameworks (Hardhat, Foundry)

## Nice to Have

- Contributions to open-source Web3 projects
- Experience with cross-chain protocols
- Understanding of prediction market mechanics
- Previous work on high-volume protocols
- Smart contract audit experience

## Benefits

- Competitive salary + token allocation
- Fully remote work environment
- Flexible hours
- Annual company retreats
- Learning & development budget
- Top-tier health insurance`,
      isOpen: true,
    },
    {
      title: "Sports Data Analyst",
      department: "Analytics",
      location: "London/Hybrid",
      type: "Full-time",
      description: `# Sports Data Analyst

Join our analytics team to help build the most accurate sports prediction models in the industry.

## About the Role

You'll be responsible for analyzing sports data, building predictive models, and providing insights that drive our platform's intelligence features.

## What You'll Do

- Collect and analyze sports data from multiple sources
- Build and maintain predictive models for various sports
- Develop data pipelines for real-time analysis
- Create visualizations and reports for stakeholders
- Collaborate with product team on AI features
- Monitor model performance and accuracy

## Sports We Cover

- Football (Soccer)
- Basketball (NBA, EuroLeague)
- American Football (NFL)
- Tennis, MMA, and more`,
      requirements: `## Requirements

- Bachelor's degree in Statistics, Mathematics, or related field
- 2+ years of experience in sports analytics
- Proficiency in Python (pandas, scikit-learn, etc.)
- Experience with SQL and data warehousing
- Strong understanding of statistical modeling
- Knowledge of at least 2 major sports

## Nice to Have

- Experience with machine learning frameworks (TensorFlow, PyTorch)
- Familiarity with betting markets and odds
- Previous work in sports betting or fantasy sports
- Experience with real-time data processing
- Knowledge of blockchain/Web3

## Benefits

- Competitive salary
- Hybrid work model (3 days in office)
- Season tickets to local sports events
- Annual sports analytics conference attendance
- Health insurance and pension
- 25 days holiday + bank holidays`,
      isOpen: true,
    },
    {
      title: "Community & Social Media Manager",
      department: "Marketing",
      location: "Remote",
      type: "Full-time",
      description: `# Community & Social Media Manager

We're seeking a passionate community builder to grow and engage our global user base across social media platforms.

## About the Role

You'll be the voice of our brand, managing our social media presence, engaging with our community, and building relationships with influencers and partners.

## What You'll Do

- Manage social media accounts (Twitter, Discord, Telegram, etc.)
- Create engaging content and campaigns
- Build and moderate our Discord community
- Engage with users and respond to inquiries
- Coordinate with influencers and partners
- Track metrics and optimize engagement
- Organize community events and AMAs

## Our Community

- 50K+ Twitter followers
- 10K+ Discord members
- Active Telegram groups
- Growing presence on emerging platforms`,
      requirements: `## Requirements

- 3+ years of community management experience
- Strong understanding of Web3/crypto culture
- Excellent written and verbal communication
- Experience with social media management tools
- Proven track record of growing engaged communities
- Comfortable working across multiple time zones

## Nice to Have

- Experience in sports or betting industry
- Personal presence in crypto/Web3 space
- Graphic design skills
- Video editing capabilities
- Experience with Discord bots and automation
- Multilingual abilities

## Benefits

- Competitive salary + token allocation
- Fully remote work
- Flexible schedule
- Annual team meetups
- Conference attendance budget
- Latest tech equipment
- Health insurance`,
      isOpen: true,
    },
    {
      title: "UI/UX Designer - Web3 Specialist",
      department: "Design",
      location: "Milan/Remote",
      type: "Full-time",
      description: `# UI/UX Designer - Web3 Specialist

We're looking for a talented designer who understands both beautiful interfaces and Web3 user experience patterns.

## About the Role

You'll design intuitive, beautiful interfaces for our prediction market platform, ensuring users can easily navigate complex trading features.

## What You'll Do

- Design user interfaces for web and mobile applications
- Create and maintain design systems
- Conduct user research and usability testing
- Design Web3-specific flows (wallet connection, transactions, etc.)
- Collaborate with developers on implementation
- Create marketing materials and brand assets
- Prototype new features and concepts

## Our Design Philosophy

- Clean, modern aesthetics
- User-first approach
- Accessibility as a priority
- Performance-conscious design`,
      requirements: `## Requirements

- 4+ years of UI/UX design experience
- Strong portfolio demonstrating Web3/crypto projects
- Proficiency in Figma (primary tool)
- Understanding of responsive and mobile-first design
- Experience with design systems
- Knowledge of Web3 UX patterns (wallet interactions, etc.)

## Nice to Have

- Experience with trading platforms or financial interfaces
- Motion design and animation skills
- Front-end development knowledge (React)
- Illustration capabilities
- Experience with user research methodologies
- Understanding of sports betting interfaces

## Benefits

- Competitive salary + equity
- Remote or hybrid (Milan office)
- Flexible working hours
- Latest MacBook Pro and design tools
- Annual design conference budget
- Health insurance and wellness stipend
- 30 days holiday`,
      isOpen: true,
    },
    {
      title: "Customer Support Lead",
      department: "Operations",
      location: "Remote",
      type: "Full-time, 24/7 Shift",
      description: `# Customer Support Lead

We're seeking an experienced support professional to lead our customer support team and ensure world-class user experience.

## About the Role

You'll build and lead our support team, handling escalations, and ensuring users receive timely, helpful assistance across all channels.

## What You'll Do

- Lead and mentor a team of support specialists
- Handle complex customer inquiries and escalations
- Develop support processes and documentation
- Monitor support metrics and improve response times
- Coordinate with product team on user feedback
- Manage support tools and systems
- Create self-service resources (FAQs, guides)
- Ensure 24/7 coverage across time zones

## Support Channels

- Live chat (primary)
- Email support
- Discord community support
- Social media inquiries`,
      requirements: `## Requirements

- 5+ years of customer support experience
- 2+ years in leadership/management role
- Experience with Web3/crypto products
- Strong problem-solving skills
- Excellent written and verbal communication
- Comfortable with technical troubleshooting
- Experience with support tools (Zendesk, Intercom, etc.)

## Nice to Have

- Experience in fintech or betting industry
- Technical background or blockchain knowledge
- Multilingual abilities (especially Spanish, French, German)
- Experience building support teams from scratch
- Knowledge of Web3 wallet troubleshooting
- Previous work in 24/7 operations

## Benefits

- Competitive salary + token allocation
- Fully remote work
- Shift differential pay for night shifts
- Comprehensive health insurance
- Mental health and wellness support
- Annual team retreats
- Career development opportunities
- Flexible scheduling within shift requirements`,
      isOpen: true,
    },
  ];
  
  for (const position of jobPositions) {
    try {
      await db.jobPosition.create({ data: position });
      console.log(`Created job position: ${position.title}`);
    } catch (error) {
      console.error(`Error creating job position ${position.title}:`, error);
    }
  }
  
  console.log("Job position seeding complete");
}

async function seedFounderAffiliate() {
  console.log("Seeding founder affiliate...");
  
  const founderWallet = env.FOUNDER_WALLET || "0x0000000000000000000000000000000000000000";
  const founderRefCode = env.FOUNDER_REF_CODE || "PREDICTIO";
  
  try {
    // Check if founder affiliate already exists
    const existing = await db.affiliate.findUnique({
      where: { refCode: founderRefCode },
    });
    
    if (!existing) {
      await db.affiliate.create({
        data: {
          walletAddress: founderWallet.toLowerCase(),
          refCode: founderRefCode,
          isFounder: true,
          totalReferrals: 0,
          totalVolumeUsd: 0,
          totalRewardsUsd: 0,
          pendingRewardsUsd: 0,
          pendingRewardsEur: 0,
        },
      });
      console.log(`Created founder affiliate: ${founderRefCode} (${founderWallet})`);
    } else {
      console.log(`Founder affiliate already exists: ${founderRefCode}`);
    }
  } catch (error) {
    console.error("Error seeding founder affiliate:", error);
  }
  
  console.log("Founder affiliate seeding complete");
}

async function migrateRetroactivePoints() {
  console.log("[Points Migration] Starting retroactive points migration...");
  
  try {
    // Get all existing users
    const users = await db.user.findMany();
    console.log(`[Points Migration] Found ${users.length} users to process`);
    
    for (const user of users) {
      const walletAddress = user.wallet.toLowerCase();
      
      // Check if user already has WALLET_CONNECTED points
      const walletConnectedEntry = await db.pointsLedger.findFirst({
        where: {
          walletAddress,
          actionType: 'WALLET_CONNECTED',
        },
      });
      
      if (!walletConnectedEntry) {
        // Credit WALLET_CONNECTED points
        await db.pointsLedger.create({
          data: {
            walletAddress,
            actionType: 'WALLET_CONNECTED',
            points: 100,
            metadata: { retroactive: true },
          },
        });
        
        await db.pointsTotal.upsert({
          where: { walletAddress },
          create: {
            walletAddress,
            totalPoints: 100,
            season: 1,
            tier: 'BRONZE',
          },
          update: {
            totalPoints: { increment: 100 },
          },
        });
      }
      
      // Check if user has made any trades
      const userTrades = await db.order.findMany({
        where: { wallet: walletAddress },
        orderBy: { createdAt: 'asc' },
      });
      
      const firstTrade = userTrades[0];
      if (firstTrade) {
        // Check if FIRST_TRADE points already credited
        const firstTradeEntry = await db.pointsLedger.findFirst({
          where: {
            walletAddress,
            actionType: 'FIRST_TRADE',
          },
        });
        
        if (!firstTradeEntry) {
          // Credit FIRST_TRADE points
          await db.pointsLedger.create({
            data: {
              walletAddress,
              actionType: 'FIRST_TRADE',
              points: 500,
              metadata: { retroactive: true, marketId: firstTrade.marketId },
            },
          });
          
          const pointsTotal = await db.pointsTotal.findUnique({
            where: { walletAddress },
          });
          
          const newTotal = (pointsTotal?.totalPoints || 0) + 500;
          const newTier = newTotal >= 20000 ? 'DIAMOND' : newTotal >= 5000 ? 'GOLD' : newTotal >= 1000 ? 'SILVER' : 'BRONZE';
          
          await db.pointsTotal.upsert({
            where: { walletAddress },
            create: {
              walletAddress,
              totalPoints: 500,
              season: 1,
              tier: 'BRONZE',
            },
            update: {
              totalPoints: newTotal,
              tier: newTier,
            },
          });
        }
        
        // Credit TRADE_PLACED points for each trade (if not already credited)
        for (const trade of userTrades) {
          const tradePlacedEntry = await db.pointsLedger.findFirst({
            where: {
              walletAddress,
              actionType: 'TRADE_PLACED',
              metadata: {
                path: ['orderId'],
                equals: trade.id,
              },
            },
          });
          
          if (!tradePlacedEntry) {
            await db.pointsLedger.create({
              data: {
                walletAddress,
                actionType: 'TRADE_PLACED',
                points: 50,
                metadata: { 
                  retroactive: true, 
                  marketId: trade.marketId,
                  orderId: trade.id,
                },
              },
            });
            
            const pointsTotal = await db.pointsTotal.findUnique({
              where: { walletAddress },
            });
            
            const newTotal = (pointsTotal?.totalPoints || 0) + 50;
            const newTier = newTotal >= 20000 ? 'DIAMOND' : newTotal >= 5000 ? 'GOLD' : newTotal >= 1000 ? 'SILVER' : 'BRONZE';
            
            await db.pointsTotal.upsert({
              where: { walletAddress },
              create: {
                walletAddress,
                totalPoints: 50,
                season: 1,
                tier: 'BRONZE',
              },
              update: {
                totalPoints: newTotal,
                tier: newTier,
              },
            });
          }
        }
      }
    }
    
    console.log("[Points Migration] Retroactive points migration complete");
  } catch (error) {
    console.error("[Points Migration] Error during retroactive migration:", error);
    // Don't throw - we don't want to stop the app from starting
  }
}

async function updateAnalystMetrics() {
  console.log("[Analyst Metrics] Updating analyst metrics on startup...");
  
  try {
    const caller = createCaller({ req: null as any, res: null as any });
    const result = await caller.updateAnalystMetrics({});
    console.log(`[Analyst Metrics] ${result.message}`);
  } catch (error) {
    console.error("[Analyst Metrics] Error updating analyst metrics:", error);
    // Don't throw - we don't want to stop the app from starting
  }
}

async function initializeMockAMM() {
  console.log("[AMM Mock] Initializing Phase 0 AMM simulation...");
  
  try {
    // Initialize vault state if not exists
    const vaultState = await db.vaultState.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        totalTvl: 500,
        availableLiquidity: 500,
        exposedLiquidity: 0,
        feeCollected: 0,
        lastRebalance: new Date(),
      },
      update: {},
    });

    console.log(`[AMM Mock] Vault state initialized: $${vaultState.totalTvl} TVL`);

    // Get active markets
    const activeMarkets = await db.market.findMany({
      where: { status: 'open' },
      take: 5, // Just process first 5 markets for demo
    });

    if (activeMarkets.length === 0) {
      console.log("[AMM Mock] No active markets found, skipping order placement");
      return;
    }

    // Create vault allocations for each market
    const totalVolume = activeMarkets.reduce((sum, m) => sum + m.volume, 0);
    
    for (const market of activeMarkets) {
      const weight = totalVolume > 0 ? market.volume / totalVolume : 1 / activeMarkets.length;
      const allocatedUsdc = vaultState.totalTvl * weight;
      const percentage = weight * 100;
      const maxCap = vaultState.totalTvl * 0.30; // 30% cap

      await db.vaultAllocation.upsert({
        where: { marketId: market.id },
        create: {
          marketId: market.id,
          allocatedUsdc,
          percentage,
          maxCap,
          currentExposure: 0,
        },
        update: {
          allocatedUsdc,
          percentage,
          maxCap,
        },
      });

      // Place mock AMM orders (10% of allocation per order)
      const orderSize = Math.min(allocatedUsdc * 0.1, 50); // Max $50 per order for demo
      
      if (orderSize < 5) continue; // Skip if too small

      // Parse market outcomes to get current prices
      const outcomes = market.outcomes as any;
      const yesPrice = outcomes[0]?.price || 0.5;
      const noPrice = outcomes[1]?.price || 0.5;
      
      const spread = 0.02; // 2% spread

      // Place YES bid (buy YES below fair value)
      const yesBidPrice = Math.max(0.01, Math.min(0.99, yesPrice - spread / 2));
      await db.ammOrder.create({
        data: {
          marketId: market.id,
          side: 'YES',
          price: yesBidPrice,
          size: orderSize,
          type: 'BID',
          status: 'ACTIVE',
          azuroFairValue: yesPrice,
          spreadApplied: spread,
        },
      });

      // Place NO bid (buy NO below fair value)
      const noBidPrice = Math.max(0.01, Math.min(0.99, noPrice - spread / 2));
      await db.ammOrder.create({
        data: {
          marketId: market.id,
          side: 'NO',
          price: noBidPrice,
          size: orderSize,
          type: 'BID',
          status: 'ACTIVE',
          azuroFairValue: noPrice,
          spreadApplied: spread,
        },
      });

      // Update vault exposure
      await db.vaultAllocation.update({
        where: { marketId: market.id },
        data: {
          currentExposure: orderSize * 2, // 2 orders
        },
      });

      console.log(`[AMM Mock] Placed 2 orders on ${market.event}: $${orderSize} each`);
    }

    // Update vault exposed liquidity
    const totalExposure = activeMarkets.length * 2 * 50; // Rough estimate
    await db.vaultState.update({
      where: { id: 'singleton' },
      data: {
        exposedLiquidity: Math.min(totalExposure, vaultState.availableLiquidity),
        availableLiquidity: Math.max(0, vaultState.availableLiquidity - totalExposure),
      },
    });

    // Initialize bot heartbeat as OFFLINE (waiting for real bot)
    await db.botHeartbeat.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        status: 'OFFLINE',
        lastRun: new Date(),
        nextRun: null,
        marketsProcessed: 0,
        ordersPlaced: 0,
        rebalancesDone: 0,
        errorMessage: 'Phase 0: Waiting for VPS bot deployment',
      },
      update: {},
    });

    console.log("[AMM Mock] Phase 0 AMM simulation complete");
  } catch (error) {
    console.error("[AMM Mock] Error initializing AMM:", error);
    // Don't throw - we don't want to stop the app from starting
  }
}

async function setup() {
  await logAzuroOnlyMarketPolicy();

  // Seed analyst data
  await seedAnalysts();

  // Copy-trading demo orders + copiers (uses live Market rows when available)
  await seedCopyTradingExperience();
  
  // Seed blog posts
  await seedBlogPosts();
  
  // Seed job positions
  await seedJobPositions();
  
  // Seed founder affiliate
  await seedFounderAffiliate();
  
  // Migrate retroactive points for existing users
  await migrateRetroactivePoints();
  
  // Update analyst metrics
  await updateAnalystMetrics();
  
  // Initialize mock AMM (Phase 0)
  await initializeMockAMM();
  
  // Clean up old notifications (older than 7 days)
  await cleanupOldNotifications();

  await logTableCounts();

  // Create og-images bucket for social media preview cards
  const ogImagesBucket = "og-images";

  if (!minioClient) {
    console.warn("Skipping MinIO bucket setup (ADMIN_PASSWORD unset)");
    return;
  }

  try {
    const bucketExists = await minioClient.bucketExists(ogImagesBucket);
    
    if (!bucketExists) {
      await minioClient.makeBucket(ogImagesBucket, "us-east-1");
      console.log(`Created bucket: ${ogImagesBucket}`);
      
      // Set public read policy for the bucket
      const publicReadPolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${ogImagesBucket}/*`],
          },
        ],
      };
      
      await minioClient.setBucketPolicy(
        ogImagesBucket,
        JSON.stringify(publicReadPolicy)
      );
      console.log(`Set public read policy for bucket: ${ogImagesBucket}`);
    } else {
      console.log(`Bucket already exists: ${ogImagesBucket}`);
    }
  } catch (error) {
    console.warn(
      `[Setup] MinIO bucket '${ogImagesBucket}' skipped (optional — run MinIO locally or configure S3-compatible storage):`,
      error,
    );
  }
}

setup()
  .then(() => {
    console.log("setup.ts complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
