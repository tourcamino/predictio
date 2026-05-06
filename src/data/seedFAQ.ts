export interface FAQItem {
  question: string;
  answer: string;
  category: 'getting-started' | 'fees' | 'safety' | 'trading' | 'withdrawals' | 'legal';
  relatedArticle?: string;
}

export const FAQ_CATEGORIES = {
  'getting-started': 'Getting Started',
  'fees': 'Fees & Costs',
  'safety': 'Safety & Security',
  'trading': 'Markets & Trading',
  'withdrawals': 'Withdrawals',
  'legal': 'Taxes & Legal',
};

export const SEED_FAQ: FAQItem[] = [
  // Getting Started
  {
    question: 'How do I start trading on Predictio?',
    answer: 'To start trading, you\'ll need three things: (1) A Web3 wallet like MetaMask or Coinbase Wallet, (2) Some USDC stablecoin to trade with, and (3) A small amount of ETH for gas fees. Once your wallet is connected, you can browse markets, deposit USDC, and start making predictions. If you\'re new to crypto, we recommend trying Demo Mode first to learn how everything works without risking real money.',
    category: 'getting-started',
    relatedArticle: 'your-first-prediction',
  },
  {
    question: 'What is a prediction market?',
    answer: 'A prediction market is a platform where you can buy and sell shares based on the outcome of future events. If you think an event will happen, you buy "Yes" shares. If you think it won\'t happen, you buy "No" shares. When the event resolves, winning shares are worth $1.00 each, and losing shares are worth $0. The current price reflects what the crowd thinks the probability is - for example, if Yes shares cost $0.65, the market believes there\'s a 65% chance the event will happen.',
    category: 'getting-started',
  },
  {
    question: 'Do I need cryptocurrency to use Predictio?',
    answer: 'Yes, Predictio operates on blockchain technology, so you\'ll need USDC (a stablecoin pegged to the US dollar) to trade. You\'ll also need a small amount of ETH to pay for transaction fees (gas). If you\'re new to crypto, you can purchase USDC directly through exchanges like Coinbase, Kraken, or Binance, then transfer it to your Web3 wallet. We\'re working on adding credit card deposits to make this easier in the future.',
    category: 'getting-started',
    relatedArticle: 'getting-usdc',
  },
  {
    question: 'What is Demo Mode and should I use it?',
    answer: 'Demo Mode gives you virtual currency to practice trading without risking real money. It\'s perfect for learning how prediction markets work, understanding how prices move, and testing strategies. Your demo trades use real market data but don\'t affect actual markets. We highly recommend all new users spend time in Demo Mode before trading with real funds. You can switch between Demo and Real mode anytime from your account settings.',
    category: 'getting-started',
  },
  {
    question: 'Can I use Predictio on mobile?',
    answer: 'Yes! Predictio works on mobile browsers, and you can use mobile wallet apps like MetaMask Mobile, Coinbase Wallet, or Rainbow Wallet. Simply open your mobile wallet\'s browser and navigate to Predictio. The interface is fully responsive and optimized for mobile trading. We\'re also developing native iOS and Android apps that will be released in the coming months.',
    category: 'getting-started',
  },

  // Fees & Costs
  {
    question: 'What fees does Predictio charge?',
    answer: 'Predictio charges a 2% fee on winning positions when markets resolve. There are no fees for deposits, withdrawals, or losing positions. Additionally, you\'ll pay blockchain gas fees (paid in ETH) for transactions like deposits, trades, and withdrawals. Gas fees vary based on network congestion but typically range from $1-10 per transaction. We display estimated gas costs before you confirm any transaction.',
    category: 'fees',
  },
  {
    question: 'What are gas fees and why do I pay them?',
    answer: 'Gas fees are transaction costs paid to the Ethereum network (not to Predictio) to process your transactions. These fees compensate network validators for computing power and security. Gas fees fluctuate based on network demand - they\'re lower during off-peak hours and higher when the network is busy. You can check current gas prices at ethgasstation.info. Pro tip: Trading during weekends or late nights (US time) often results in lower gas fees.',
    category: 'fees',
  },
  {
    question: 'Are there any hidden fees?',
    answer: 'No. Predictio is completely transparent about fees. You only pay: (1) A 2% platform fee on winning positions when markets resolve, and (2) Gas fees to the Ethereum network for blockchain transactions. We show you the exact fees before you confirm any action. There are no subscription fees, monthly charges, inactivity fees, or hidden costs of any kind.',
    category: 'fees',
  },
  {
    question: 'How much money do I need to start?',
    answer: 'You can start trading with as little as $10 in USDC, though we recommend starting with at least $50-100 to account for gas fees and allow for multiple trades. Remember, you\'ll also need a small amount of ETH (around $20-30 worth) to cover gas fees for several transactions. If you\'re just learning, use Demo Mode first - it\'s completely free and gives you $1,000 in virtual currency to practice with.',
    category: 'fees',
  },

  // Safety & Security
  {
    question: 'Is my money safe on Predictio?',
    answer: 'Predictio uses audited smart contracts to hold all funds. Your money never sits in a company bank account - it\'s secured by blockchain technology. Smart contracts are immutable code that automatically execute according to their programming, removing the need to trust any individual or company. Our contracts have been audited by leading blockchain security firms. However, like all DeFi platforms, smart contracts carry inherent risks, and you should never invest more than you can afford to lose.',
    category: 'safety',
    relatedArticle: 'security-overview',
  },
  {
    question: 'What happens if Predictio shuts down?',
    answer: 'Because Predictio is built on decentralized smart contracts, your funds remain accessible even if our website goes offline. The smart contracts exist permanently on the Ethereum blockchain and can be interacted with directly or through alternative interfaces. All open positions would continue to be tradeable, and markets would still resolve according to their programmed rules. Your wallet always maintains custody of your funds - we never hold them.',
    category: 'safety',
  },
  {
    question: 'How do you prevent market manipulation?',
    answer: 'We employ multiple safeguards: (1) Minimum liquidity requirements for all markets, (2) Trading limits that prevent single users from dominating small markets, (3) Monitoring algorithms that flag suspicious trading patterns, (4) A decentralized oracle system for market resolution, and (5) Community reporting tools. Additionally, the transparent nature of blockchain means all trades are publicly visible and auditable. Manipulation attempts are rare because they\'re expensive, risky, and easily detected.',
    category: 'safety',
  },
  {
    question: 'Can I lose more money than I invest?',
    answer: 'No. Predictio does not offer leverage or margin trading. The maximum you can lose is the amount you invest in a position. If you buy $100 worth of shares and the market resolves against you, you lose $100 - nothing more. This is different from traditional trading platforms where leverage can result in losses exceeding your initial investment. Your risk is always limited to your position size.',
    category: 'safety',
  },

  // Markets & Trading
  {
    question: 'How are market outcomes determined?',
    answer: 'Markets are resolved using a decentralized oracle system. For most markets, we use a combination of: (1) Reputable data sources (like official election results, sports scores, or financial data), (2) A council of verified resolvers who stake reputation, and (3) A dispute period where the community can challenge incorrect resolutions. The resolution process is transparent and follows predetermined rules specified in each market\'s description. If disputes arise, they\'re resolved through community voting.',
    category: 'trading',
    relatedArticle: 'how-markets-resolve',
  },
  {
    question: 'Can I sell my shares before a market resolves?',
    answer: 'Yes! You can sell your shares at any time before the market resolves. The price you receive depends on current market conditions - if sentiment has moved in your favor, you might sell at a profit even before resolution. If sentiment has moved against you, you might sell at a loss to limit your downside. This liquidity is one of the key advantages of prediction markets - you\'re never locked into a position until resolution.',
    category: 'trading',
  },
  {
    question: 'What does the percentage on a market mean?',
    answer: 'The percentage represents the market\'s collective probability estimate for that outcome. It\'s calculated from the current share price - if Yes shares cost $0.73, the market shows 73%. This means traders collectively believe there\'s a 73% chance the event will happen. These probabilities are often more accurate than expert predictions because they aggregate information from many participants who have "skin in the game." The percentage updates in real-time as people trade.',
    category: 'trading',
  },
  {
    question: 'What is liquidity and why does it matter?',
    answer: 'Liquidity refers to how easily you can buy or sell shares without significantly affecting the price. High liquidity means you can trade large amounts with minimal price impact. Low liquidity means your trades might move the price substantially. We display liquidity metrics on each market. For beginners, we recommend trading in high-liquidity markets. Market makers provide liquidity by offering to buy and sell shares, earning small profits from the spread between buy and sell prices.',
    category: 'trading',
  },
  {
    question: 'Can I create my own markets?',
    answer: 'Yes! Users with verified accounts can create markets. You\'ll need to: (1) Provide a clear, unambiguous question, (2) Specify resolution criteria and data sources, (3) Set an end date, and (4) Provide initial liquidity (typically $100-500 in USDC). Market creators earn a small percentage of trading fees. However, you\'re responsible for ensuring your market is clear and resolvable. Ambiguous or poorly designed markets may be flagged by the community and won\'t attract traders.',
    category: 'trading',
    relatedArticle: 'creating-markets',
  },

  // Withdrawals
  {
    question: 'How do I withdraw my funds?',
    answer: 'To withdraw, go to your Portfolio page and click "Withdraw." Enter the amount of USDC you want to withdraw, and it will be sent directly to your connected wallet. Withdrawals are processed immediately on the blockchain - there\'s no waiting period or approval process. You\'ll pay a gas fee for the withdrawal transaction. Note that you can only withdraw funds that aren\'t currently locked in open positions. Close or sell your positions first if you want to withdraw everything.',
    category: 'withdrawals',
  },
  {
    question: 'Is there a minimum withdrawal amount?',
    answer: 'There\'s no minimum withdrawal amount set by Predictio, but because you pay gas fees (typically $2-10) for each withdrawal, it doesn\'t make economic sense to withdraw very small amounts. We recommend withdrawing at least $50-100 at a time to keep gas fees reasonable relative to your withdrawal amount. You can check the current gas fee estimate before confirming your withdrawal.',
    category: 'withdrawals',
  },
  {
    question: 'How long do withdrawals take?',
    answer: 'Withdrawals are processed immediately on the blockchain, typically confirming within 15 seconds to 2 minutes depending on network congestion and the gas price you pay. Once confirmed, the USDC appears in your wallet instantly. There are no holding periods, approval delays, or processing times. This is one of the advantages of DeFi - you have complete control over your funds at all times.',
    category: 'withdrawals',
  },

  // Taxes & Legal
  {
    question: 'Do I need to pay taxes on my winnings?',
    answer: 'In most jurisdictions, yes. Prediction market winnings are typically treated as capital gains or gambling income, depending on your location. In the US, you\'re required to report all cryptocurrency gains and losses to the IRS. We provide transaction history exports to help with tax reporting, but we recommend consulting a tax professional familiar with cryptocurrency. Tax laws vary significantly by country and are rapidly evolving in this space.',
    category: 'legal',
    relatedArticle: 'tax-reporting',
  },
  {
    question: 'Is prediction market trading legal?',
    answer: 'The legality of prediction markets varies by jurisdiction. In the US, prediction markets exist in a regulatory gray area - some are legal under CFTC oversight, while others operate as decentralized protocols. Predictio is a decentralized platform, and users are responsible for ensuring their participation complies with local laws. We restrict access from certain jurisdictions where prediction markets are explicitly prohibited. Always check your local regulations before trading.',
    category: 'legal',
  },
  {
    question: 'What countries can\'t use Predictio?',
    answer: 'Due to regulatory restrictions, we block access from: United States (certain states), China, North Korea, Iran, Syria, Cuba, and several other sanctioned regions. We use IP detection and may require identity verification for large traders. These restrictions are subject to change as regulations evolve. If you\'re traveling, you may experience access issues from restricted regions. Using VPNs to circumvent geographic restrictions violates our terms of service and may result in account suspension.',
    category: 'legal',
  },
  {
    question: 'Does Predictio collect my personal information?',
    answer: 'We collect minimal information. Basic usage: We only see your wallet address and on-chain transaction history (which is public anyway). No email, name, or personal details required. However, for regulatory compliance, users who trade above certain thresholds ($10,000+ in volume) may be required to complete KYC (Know Your Customer) verification, which involves providing identification documents. We never sell user data, and we minimize data collection wherever possible.',
    category: 'legal',
    relatedArticle: 'privacy-policy',
  },
];
