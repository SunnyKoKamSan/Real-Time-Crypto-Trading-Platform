import { Decimal } from 'decimal.js';
import { z } from 'zod';

export const SUPPORTED_SYMBOLS = ['BTC-USD', 'ETH-USD'] as const;

export const ORDER_SIDES = ['BUY', 'SELL'] as const;
export const ORDER_TYPES = ['MARKET', 'LIMIT'] as const;
export const ORDER_STATUSES = [
  'PENDING',
  'OPEN',
  'PARTIALLY_FILLED',
  'FILLED',
  'CANCELLED',
  'REJECTED',
] as const;
export const LEDGER_ENTRY_TYPES = [
  'SYSTEM_MINT',
  'ORDER_RESERVE',
  'ORDER_RELEASE',
  'TRADE_SETTLEMENT',
  'FEE',
] as const;
export const ASSETS = ['BTC', 'ETH', 'USD'] as const;
export const AUDIT_EVENT_TYPES = [
  'USER_CREATED',
  'SESSION_CREATED',
  'AUTH_USER_REGISTERED',
  'AUTH_LOGIN_SUCCESS',
  'AUTH_LOGIN_FAILURE',
  'AUTH_TOKEN_REFRESHED',
  'AUTH_REFRESH_REPLAY_DETECTED',
  'AUTH_LOGOUT',
  'AUTH_SESSION_REVOKED',
  'ORDER_CREATED',
  'ORDER_CANCELLED',
  'TRADE_EXECUTED',
  'LEDGER_ENTRY_CREATED',
  'SYSTEM_EVENT',
] as const;
export const OUTBOX_EVENT_STATUSES = ['PENDING', 'PUBLISHED', 'FAILED'] as const;
export const USER_ROLES = ['USER', 'ADMIN'] as const;

export const orderSideSchema = z.enum(ORDER_SIDES);
export const orderTypeSchema = z.enum(ORDER_TYPES);
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const ledgerEntryTypeSchema = z.enum(LEDGER_ENTRY_TYPES);
export const assetSchema = z.enum(ASSETS);
export const auditEventTypeSchema = z.enum(AUDIT_EVENT_TYPES);
export const outboxEventStatusSchema = z.enum(OUTBOX_EVENT_STATUSES);
export const tradingSymbolSchema = z.enum(SUPPORTED_SYMBOLS);
export const userRoleSchema = z.enum(USER_ROLES);

export type OrderSide = z.infer<typeof orderSideSchema>;
export type OrderType = z.infer<typeof orderTypeSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type LedgerEntryType = z.infer<typeof ledgerEntryTypeSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type AuditEventType = z.infer<typeof auditEventTypeSchema>;
export type OutboxEventStatus = z.infer<typeof outboxEventStatusSchema>;
export type TradingSymbol = z.infer<typeof tradingSymbolSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;

export interface HealthResponse {
  service: 'rtctp-api';
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

export interface ApiMeta {
  correlationId: string;
  /**
   * ISO-8601 UTC timestamp with nanosecond precision, derived from process.hrtime.bigint().
   */
  timestamp: string;
}

export interface ApiSuccess<TData> {
  ok: true;
  data: TData;
  meta: ApiMeta;
}

export interface ApiError {
  ok: false;
  error: {
    code:
      | 'VALIDATION_ERROR'
      | 'AUTH_REQUIRED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'RATE_LIMITED'
      | 'INTERNAL_ERROR';
    message: string;
    correlationId: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

export type ApiEnvelope<TData> = ApiSuccess<TData> | ApiError;

export const passwordPolicySchema = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .refine((value) => /[A-Za-z]/.test(value), 'Password must include at least one letter.')
  .refine((value) => /[^A-Za-z]/.test(value), 'Password must include at least one non-letter.');

export function validatePasswordPolicy(password: string): boolean {
  return passwordPolicySchema.safeParse(password).success;
}

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1).max(120),
  role: userRoleSchema,
  createdAt: z.string().datetime(),
});

export const assetBalanceSchema = z.object({
  asset: assetSchema,
  balance: z.string(),
});

export const authSessionSchema = z.object({
  expiresAt: z.string().datetime(),
  csrfToken: z.string().min(16),
});

export const authTokenPairSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: z.string().datetime(),
  session: authSessionSchema,
});

export const registerRequestSchema = z.object({
  email: z.string().trim().email().max(320),
  displayName: z.string().trim().min(1).max(120),
  password: passwordPolicySchema,
});

export const loginRequestSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128),
});

export const refreshRequestSchema = z.object({});
export const logoutRequestSchema = z.object({});

export const registerResponseSchema = z.object({
  user: authUserSchema,
  balances: z.array(assetBalanceSchema),
  auth: authTokenPairSchema,
});

export const loginResponseSchema = registerResponseSchema;

export const refreshResponseSchema = z.object({
  auth: authTokenPairSchema,
});

export const logoutResponseSchema = z.object({
  loggedOut: z.literal(true),
});

export const meResponseSchema = z.object({
  user: authUserSchema,
  balances: z.array(assetBalanceSchema),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type AssetBalance = z.infer<typeof assetBalanceSchema>;
export type AuthTokenPair = z.infer<typeof authTokenPairSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;

export interface MarketTick {
  symbol: TradingSymbol;
  price: string;
  source: 'coinbase' | 'binance' | 'system';
  receivedAt: string;
}

export interface EventMetadata {
  eventId: string;
  eventType: string;
  payloadVersion: number;
  aggregateType: string;
  aggregateId: string;
  partitionKey: string;
  occurredAt: string;
  correlationId: string;
  causationId?: string;
}

const financialDecimalPattern = /^-?(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;

export function isSupportedSymbol(value: string): value is TradingSymbol {
  return SUPPORTED_SYMBOLS.includes(value as TradingSymbol);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === 'FILLED' || status === 'CANCELLED' || status === 'REJECTED';
}

export function canCancelOrder(status: OrderStatus): boolean {
  return status === 'PENDING' || status === 'OPEN' || status === 'PARTIALLY_FILLED';
}

export function requiresLimitPrice(type: OrderType): boolean {
  return type === 'LIMIT';
}

export function validateDecimalString(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    return false;
  }

  if (!financialDecimalPattern.test(value)) {
    return false;
  }

  try {
    return new Decimal(value).isFinite();
  } catch {
    return false;
  }
}

export function assertFinancialString(value: unknown, fieldName = 'financial value'): string {
  if (typeof value === 'number') {
    throw new TypeError(`${fieldName} must be a decimal string, not a JavaScript number`);
  }

  if (!validateDecimalString(value)) {
    throw new TypeError(`${fieldName} must be a decimal string with at most 8 decimal places`);
  }

  return value;
}

export function parseFinancialDecimal(value: unknown, fieldName?: string): Decimal {
  return new Decimal(assertFinancialString(value, fieldName));
}

export function validateOrderQuantity(quantity: unknown): string {
  const decimal = parseFinancialDecimal(quantity, 'order quantity');

  if (!decimal.greaterThan(0)) {
    throw new RangeError('order quantity must be positive');
  }

  return assertFinancialString(quantity, 'order quantity');
}
