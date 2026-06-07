import type {
  MarketDataMode,
  MarketDataProvider,
  MarketProviderState,
  MarketTickReceived,
  TradingSymbol,
} from '@rtctp/domain';

export interface MarketDataConfig {
  mode: MarketDataMode;
  provider: Extract<MarketDataProvider, 'coinbase'>;
  symbols: TradingSymbol[];
  fixturePath: string;
  replaySpeed: number;
  queueCapacity: number;
  tickRetentionPerSymbol: number;
  candleRetentionPerSymbol: number;
  reconnectBaseMs: number;
  reconnectMaxMs: number;
  reconnectJitterRatio: number;
  healthStaleMs: number;
}

export interface ParserCounters {
  parsed: number;
  ignored: number;
  errors: number;
  duplicates: number;
}

export interface CandleCounters {
  updated: number;
  lateAccepted: number;
  tooLateRejected: number;
}

export interface CacheCounters {
  latestPriceWrites: number;
  errors: number;
}

export interface ProviderRuntimeState {
  state: MarketProviderState;
  startedAt: string | null;
  connectedAt: string | null;
  lastMessageAt: string | null;
  lastHeartbeatAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  reconnectCount: number;
}

export type TickHandler = (tick: MarketTickReceived) => void;

export interface MarketDataAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
}
