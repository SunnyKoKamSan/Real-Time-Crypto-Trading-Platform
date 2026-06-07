import WebSocket from 'ws';
import type { TradingSymbol } from '@rtctp/domain';
import { ReconnectController } from './reconnect.js';
import type { MarketDataAdapter, MarketDataConfig } from './types.js';

const coinbaseWebSocketUrl = 'wss://advanced-trade-ws.coinbase.com';

export class CoinbaseMarketDataAdapter implements MarketDataAdapter {
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopped = false;
  private readonly reconnect: ReconnectController;

  constructor(
    private readonly config: MarketDataConfig,
    private readonly onRawMessage: (raw: string) => void,
    private readonly onConnected: () => void,
    private readonly onReconnect: (error?: unknown) => void,
    private readonly onDisconnected: (error?: unknown) => void,
  ) {
    this.reconnect = new ReconnectController({
      baseMs: config.reconnectBaseMs,
      maxMs: config.reconnectMaxMs,
      jitterRatio: config.reconnectJitterRatio,
    });
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.reconnect.stop();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  private connect(): void {
    this.reconnect.connect();
    const socket = new WebSocket(coinbaseWebSocketUrl);
    this.socket = socket;

    socket.on('open', () => {
      this.reconnect.connected();
      this.onConnected();
      socket.send(JSON.stringify(subscriptionMessage('heartbeats', this.config.symbols)));
      socket.send(JSON.stringify(subscriptionMessage('market_trades', this.config.symbols)));
    });

    socket.on('message', (data) => {
      this.onRawMessage(data.toString('utf8'));
    });

    socket.on('error', (error) => {
      this.scheduleReconnect(error);
    });

    socket.on('close', () => {
      if (this.stopped) {
        this.onDisconnected();
        return;
      }

      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(error?: unknown): void {
    if (this.stopped || this.reconnectTimer) {
      return;
    }

    const delay = this.reconnect.disconnected();
    this.onReconnect(error);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

function subscriptionMessage(channel: 'heartbeats' | 'market_trades', symbols: TradingSymbol[]) {
  return {
    type: 'subscribe',
    product_ids: symbols,
    channel,
  };
}
