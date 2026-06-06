import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url().default('postgres://trader:trader@localhost:5432/crypto_trading'),
  TEST_DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z
    .string()
    .min(32)
    .default('local-development-jwt-secret-change-before-production'),
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
});

export const env = envSchema.parse(process.env);
