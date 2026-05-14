import { z } from "zod";

const envSchema = z.object({
  // Core — coerce odd NODE_ENV values (some hosts set "" or "staging")
  NODE_ENV: z.preprocess(
    (v) => (v === "development" || v === "production" ? v : "production"),
    z.enum(["development", "production"]),
  ),
  BASE_URL: z.string().optional(),
  BASE_URL_OTHER_PORT: z.string().optional(),
  FRONTEND_URL: z.string().optional().default("http://localhost:5173"),
  
  // Database
  DATABASE_URL: z.string().optional(),
  /**
   * Prisma Client log levels (comma-separated): query, info, warn, error.
   * Use `silent` or empty override with explicit value to disable Prisma stdout logs.
   * Default in development: warn only (avoids query + connection-error spam when Postgres is down).
   */
  PRISMA_LOG: z.string().optional(),
  
  // Auth
  // In Vercel builds we don't run admin routes; don't fail build on missing secret.
  ADMIN_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  BOT_API_KEY: z.string().optional(),
  
  // Developer API
  API_SECRET: z.string().optional(),
  DEVELOPER_API_ENABLED: z.string().optional().default("true"),
  
  // CORS
  CORS_ORIGIN: z.string().optional().default("http://localhost:5173"),
  
  // Error Monitoring
  VITE_ERROR_MONITORING_DSN: z.string().optional(),
  VITE_ERROR_MONITORING_ENVIRONMENT: z.string().optional(),
  VITE_APP_VERSION: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  
  // Azuro Protocol
  AZURO_API_KEY: z.string().optional(),
  AZURO_OPERATOR_ADDRESS: z.string().optional(),
  AZURO_CHAIN_ID: z.string().optional().default("8453"),
  /** Azuro V3 games/odds — use data-feed subgraph (Polygon prod). Overrides AZURO_GRAPHQL_URL when set. */
  AZURO_DATA_FEED_URL: z.string().optional(),
  AZURO_GRAPHQL_URL: z.string().optional(),
  
  // OpenRouter (AI) — server: OPENROUTER_KEY or OPENROUTER_API_KEY; VITE_* only for local/dev parity
  OPENROUTER_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  VITE_OPENROUTER_KEY: z.string().optional(),
  
  // Unsplash API
  UNSPLASH_ACCESS_KEY: z.string().optional(),
  
  // Twitter/X API
  X_API_KEY: z.string().optional(),
  X_API_SECRET: z.string().optional(),
  X_ACCESS_TOKEN: z.string().optional(),
  X_ACCESS_SECRET: z.string().optional(),
  
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHANNEL_ID: z.string().optional().default("@predictio"),
  
  // Bot Configuration
  MARKET_MAKER_MAX_EXPOSURE: z.string().optional().default("5000"),
  MARKET_MAKER_TARGET_SPREAD: z.string().optional().default("0.02"),
  GROWTH_ENGINE_CYCLE_HOURS: z.string().optional().default("2"),
  GROWTH_ENGINE_MAX_DMS: z.string().optional().default("5"),
  
  // Treasury and founder
  TREASURY_WALLET: z.string().optional(),
  FOUNDER_WALLET: z.string().optional(),
  FOUNDER_REF_CODE: z.string().optional().default("PREDICTIO"),
  
  // Fee constants
  FEE_VAULT: z.string().optional().default("0.50"),
  FEE_ANALYST: z.string().optional().default("0.35"),
  FEE_REFERRAL: z.string().optional().default("0.15"),
  TAKER_FEE_RATE: z.string().optional().default("0.01"),
  
  // Payout
  PAYOUT_THRESHOLD_EUR: z.string().optional().default("10"),
  USDC_EUR_RATE: z.string().optional().default("0.92"),
  
  // Cookie
  REFERRAL_COOKIE_DAYS: z.string().optional().default("120"),
  REFERRAL_COOKIE_NAME: z.string().optional().default("predictio_ref"),
  
  // Chain config
  BASE_CHAIN_ID: z.string().optional().default("8453"),
  BASE_SEPOLIA_CHAIN_ID: z.string().optional().default("84532"),
  BASE_RPC_URL: z.string().optional(),
  BASE_SEPOLIA_RPC_URL: z.string().optional(),
  
  // Contracts
  CTF_CONTRACT_ADDRESS: z.string().optional(),
  CTF_EXCHANGE_ADDRESS: z.string().optional(),
  USDC_CONTRACT_ADDRESS: z.string().optional(),
});

export const env = envSchema.parse(process.env);
