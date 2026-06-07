import 'dotenv/config';
import { z } from 'zod';

const defaultMarketDataMode = process.env.NODE_ENV === 'test' ? 'fixture' : 'disabled';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url().default('postgres://trader:trader@localhost:5432/crypto_trading'),
  TEST_DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).default('local-development-jwt-secret-change-before-production'),
  JWT_ISSUER: z.string().min(1).default('rtctp-api'),
  JWT_AUDIENCE: z.string().min(1).default('rtctp-web'),
  ACCESS_TOKEN_TTL: z.string().min(1).default('15m'),
  REFRESH_TOKEN_TTL: z.string().min(1).default('7d'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  AUTH_COOKIE_NAME: z.string().min(1).default('rtctp_refresh'),
  AUTH_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value ? value === 'true' : process.env.NODE_ENV === 'production')),
  CSRF_HEADER_NAME: z.string().min(1).default('x-csrf-token'),
  SEED_DEMO_PASSWORD: z.string().min(12).default('LocalDemoPassword!2026'),
  MARKET_DATA_MODE: z.enum(['disabled', 'fixture', 'live']).default(defaultMarketDataMode),
  MARKET_DATA_PROVIDER: z.enum(['coinbase']).default('coinbase'),
  MARKET_DATA_SYMBOLS: z.string().min(1).default('BTC-USD,ETH-USD'),
  MARKET_DATA_FIXTURE_PATH: z
    .string()
    .min(1)
    .default('apps/api/test/fixtures/market-data/coinbase-market-trades.jsonl'),
  MARKET_DATA_REPLAY_SPEED: z.coerce.number().positive().default(1),
  MARKET_DATA_QUEUE_CAPACITY: z.coerce.number().int().positive().default(5000),
  MARKET_DATA_TICK_RETENTION_PER_SYMBOL: z.coerce.number().int().positive().default(10000),
  MARKET_DATA_CANDLE_RETENTION_PER_SYMBOL: z.coerce.number().int().positive().default(1440),
  MARKET_DATA_RECONNECT_BASE_MS: z.coerce.number().int().positive().default(250),
  MARKET_DATA_RECONNECT_MAX_MS: z.coerce.number().int().positive().default(30000),
  MARKET_DATA_RECONNECT_JITTER_RATIO: z.coerce.number().min(0).max(1).default(0.2),
  MARKET_DATA_HEALTH_STALE_MS: z.coerce.number().int().positive().default(15000),
});

export const env = envSchema.parse(process.env);
