import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyAPIKeySignature, generateChallengeMessage } from './utils/eip712';
import { generateAPIKey, hashAPIKey, generateNonce } from './utils/apiKey';
import { requireDeveloperApiKey } from './middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

async function authenticateAPIKey(req: Request, res: Response, next: NextFunction) {
  return requireDeveloperApiKey(req, res, next);
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const apiKey = (req as any).apiKey;
  if (!apiKey) {
    return next();
  }
  
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const limit = 1000; // 1000 requests per minute
  
  const key = apiKey.id;
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', (limit - 1).toString());
    res.setHeader('X-RateLimit-Reset', Math.floor((now + windowMs) / 1000).toString());
    return next();
  }
  
  if (record.count >= limit) {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', Math.floor(record.resetAt / 1000).toString());
    res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000).toString());
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  record.count++;
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', (limit - record.count).toString());
  res.setHeader('X-RateLimit-Reset', Math.floor(record.resetAt / 1000).toString());
  next();
}

router.get('/v1/auth/challenge', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;
    
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Missing wallet address' });
    }
    
    const walletAddress = wallet.toLowerCase();
    const nonce = generateNonce();
    const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    
    // Store challenge
    await prisma.authChallenge.create({
      data: {
        nonce,
        walletAddress,
        expiresAt: new Date(expiresAt * 1000),
      },
    });
    
    const challenge = generateChallengeMessage(walletAddress, nonce, expiresAt);
    
    res.json({
      challenge,
      nonce,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error('Challenge generation error:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

router.post('/v1/auth/verify', async (req: Request, res: Response) => {
  try {
    const { wallet, nonce, signature } = req.body;
    
    if (!wallet || !nonce || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const walletAddress = wallet.toLowerCase();
    
    // Verify challenge exists and not expired
    const challenge = await prisma.authChallenge.findUnique({
      where: { nonce },
    });
    
    if (!challenge) {
      return res.status(400).json({ error: 'Invalid nonce' });
    }
    
    if (challenge.usedAt) {
      return res.status(400).json({ error: 'Challenge already used' });
    }
    
    if (new Date() > challenge.expiresAt) {
      return res.status(400).json({ error: 'Challenge expired' });
    }
    
    if (challenge.walletAddress !== walletAddress) {
      return res.status(400).json({ error: 'Wallet mismatch' });
    }
    
    // Verify EIP-712 signature
    const message = {
      wallet: walletAddress,
      nonce,
      expires: Math.floor(challenge.expiresAt.getTime() / 1000),
    };
    
    let recoveredAddress: string;
    try {
      recoveredAddress = verifyAPIKeySignature(message, signature);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    if (recoveredAddress !== walletAddress) {
      return res.status(400).json({ error: 'Signature verification failed' });
    }
    
    // Mark challenge as used
    await prisma.authChallenge.update({
      where: { nonce },
      data: { usedAt: new Date() },
    });
    
    // Revoke any existing active keys for this wallet
    await prisma.apiKey.updateMany({
      where: {
        walletAddress,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    
    // Generate new API key
    const { key, prefix } = generateAPIKey();
    const keyHash = await hashAPIKey(key);
    const keySuffix = key.slice(-4);
    
    const apiKey = await prisma.apiKey.create({
      data: {
        walletAddress,
        keyHash,
        keyPrefix: prefix,
        keySuffix,
        nonceUsed: nonce,
        permissions: ['read', 'trade', 'stream'],
      },
    });
    
    res.json({
      api_key: key,
      wallet: walletAddress,
      created_at: Math.floor(apiKey.createdAt.getTime() / 1000),
      rate_limit: {
        rest: '1000/min',
        ws_connections: 10,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/v1/auth/revoke', authenticateAPIKey, async (req: Request, res: Response) => {
  try {
    const apiKey = (req as any).apiKey;
    
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { revokedAt: new Date() },
    });
    
    res.json({ revoked: true });
  } catch (error) {
    console.error('Revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke key' });
  }
});

router.get('/v1/markets', rateLimit, async (req: Request, res: Response) => {
  try {
    const {
      sport,
      status = 'open',
      sort = 'volume',
      limit = 20,
      offset = 0,
    } = req.query;
    
    const where: any = {};
    if (sport && sport !== 'all') where.sport = sport;
    if (status && status !== 'all') where.status = status;
    
    const markets = await prisma.market.findMany({
      where,
      take: Number(limit),
      skip: Number(offset),
      orderBy: sort === 'volume' ? { volume: 'desc' } : { closesAt: 'asc' },
    });
    
    const total = await prisma.market.count({ where });
    
    res.json({
      markets,
      total,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
    });
  } catch (error) {
    console.error('Markets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

router.get('/v1/markets/:id', rateLimit, async (req: Request, res: Response) => {
  try {
    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
    });
    
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }
    
    res.json({ market });
  } catch (error) {
    console.error('Market fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch market' });
  }
});

router.get('/v1/markets/:id/orderbook', rateLimit, async (req: Request, res: Response) => {
  try {
    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
    });
    
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }
    
    // Mock orderbook data
    const yesPrice = 0.65;
    const spread = 0.02;
    
    const bids = Array.from({ length: 5 }, (_, i) => [
      yesPrice - spread / 2 - i * 0.01,
      Math.floor(Math.random() * 5000) + 1000,
    ]);
    
    const asks = Array.from({ length: 5 }, (_, i) => [
      yesPrice + spread / 2 + i * 0.01,
      Math.floor(Math.random() * 4000) + 800,
    ]);
    
    res.json({
      market_id: market.id,
      bids,
      asks,
      spread_bps: Math.floor(spread * 10000),
      mid: yesPrice,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Orderbook fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orderbook' });
  }
});

router.get('/v1/markets/:id/trades', rateLimit, async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    
    const trades = await prisma.order.findMany({
      where: { marketId: req.params.id },
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        outcome: true,
        amount: true,
        avgPrice: true,
        createdAt: true,
        wallet: true,
      },
    });
    
    res.json({ trades });
  } catch (error) {
    console.error('Trades fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

router.post('/v1/orders', authenticateAPIKey, rateLimit, async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as any).walletAddress;
    const body = (req.body ?? {}) as any;
    // Support both snake_case (legacy bot docs) and camelCase (backend REST)
    const market_id = body.market_id ?? body.marketId;
    const side = body.side ?? body.outcome;
    const size = body.size ?? body.amount ?? body.amountUsd;
    const type = body.type ?? 'market';
    const price = body.price;
    
    if (!market_id || !side || !size) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const market = await prisma.market.findUnique({
      where: { id: market_id },
    });
    
    if (!market || market.status !== 'open') {
      return res.status(400).json({ error: 'Market not available' });
    }
    
    // Create order (simplified - in production, this would interact with smart contracts)
    const avgPrice = type === 'limit' && price ? price : 0.65;
    const shares = size / avgPrice;
    
    const order = await prisma.order.create({
      data: {
        marketId: market_id,
        wallet: walletAddress,
        outcome: side,
        amount: Number(size),
        shares,
        avgPrice,
        orderType: type.toUpperCase(),
        limitPrice: type === 'limit' ? price : null,
        status: 'open',
      },
    });
    
    res.json({
      order_id: order.id,
      market_id,
      side,
      size,
      price: avgPrice,
      shares,
      status: 'filled',
      timestamp: order.createdAt.getTime(),
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.get('/v1/orders', authenticateAPIKey, rateLimit, async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as any).walletAddress;
    const { market_id, status, limit = 50 } = req.query;
    
    const where: any = { wallet: walletAddress };
    if (market_id) where.marketId = market_id;
    if (status) where.status = status;
    
    const orders = await prisma.order.findMany({
      where,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ orders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/v1/account/positions', authenticateAPIKey, rateLimit, async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as any).walletAddress;
    
    const positions = await prisma.order.findMany({
      where: {
        wallet: walletAddress,
        status: 'open',
      },
      include: {
        market: true,
      },
    });
    
    res.json({ positions });
  } catch (error) {
    console.error('Positions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

router.get('/v1/account/fills', authenticateAPIKey, rateLimit, async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as any).walletAddress;
    const { limit = 100 } = req.query;
    
    const fills = await prisma.order.findMany({
      where: {
        wallet: walletAddress,
      },
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        market: true,
      },
    });
    
    res.json({ fills });
  } catch (error) {
    console.error('Fills fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch fills' });
  }
});

router.get('/v1/feeds/spreads', rateLimit, async (req: Request, res: Response) => {
  try {
    const { min_bps = 50 } = req.query;
    
    // Mock spread data
    const spreads = [
      {
        pair: ['market-1', 'market-2'],
        relationship: 'correlated',
        spread_pct: 0.034,
        implied_arb_bps: 120,
        timestamp: Date.now(),
      },
      {
        pair: ['market-3', 'market-4'],
        relationship: 'inverse',
        spread_pct: 0.028,
        implied_arb_bps: 95,
        timestamp: Date.now(),
      },
    ];
    
    const filtered = spreads.filter(s => s.implied_arb_bps >= Number(min_bps));
    
    res.json({ spreads: filtered });
  } catch (error) {
    console.error('Spreads fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch spreads' });
  }
});

router.get('/v1/feeds/volume-anomalies', rateLimit, async (req: Request, res: Response) => {
  try {
    const { window = '5m' } = req.query;
    
    // Mock anomaly data
    const anomalies = [
      {
        market_id: 'market-1',
        volume_5m_usd: 45000,
        volume_zscore: 3.8,
        price_impact_bps: 180,
        timestamp: Date.now(),
      },
    ];
    
    res.json({ anomalies });
  } catch (error) {
    console.error('Anomalies fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

router.get('/v1/feeds/liquidity-gaps', rateLimit, async (req: Request, res: Response) => {
  try {
    // Mock liquidity gap data
    const gaps = [
      {
        market_id: 'market-5',
        side: 'YES',
        gap_size_usd: 12000,
        depth_pct: 0.15,
        timestamp: Date.now(),
      },
    ];
    
    res.json({ gaps });
  } catch (error) {
    console.error('Liquidity gaps fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch liquidity gaps' });
  }
});

export default router;
