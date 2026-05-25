import { z } from 'zod';

export const SUPPORTED_SYMBOLS = ['BTC-USD', 'ETH-USD'] as const;

export const orderSideSchema = z.enum(['BUY', 'SELL']);
export const orderTypeSchema = z.enum(['MARKET', 'LIMIT']);
export const orderStatusSchema = z.enum([
  'PENDING',
  'OPEN',
  'PARTIALLY_FILLED',
  'FILLED',
  'CANCELLED',
  'REJECTED',
]);
export const tradingSymbolSchema = z.enum(SUPPORTED_SYMBOLS);

export type OrderSide = z.infer<typeof orderSideSchema>;
export type OrderType = z.infer<typeof orderTypeSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type TradingSymbol = z.infer<typeof tradingSymbolSchema>;

export interface HealthResponse {
  service: string;
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

export interface ApiMeta {
  correlationId: string;
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
    code: 'VALIDATION_ERROR' | 'AUTH_REQUIRED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR';
    message: string;
    correlationId: string;
    details?: unknown;
  };
}

export type ApiEnvelope<TData> = ApiSuccess<TData> | ApiError;

export interface MarketTick {
  symbol: TradingSymbol;
  price: string;
  source: 'coinbase' | 'binance' | 'system';
  receivedAt: string;
}

export function isSupportedSymbol(value: string): value is TradingSymbol {
  return SUPPORTED_SYMBOLS.includes(value as TradingSymbol);
}
