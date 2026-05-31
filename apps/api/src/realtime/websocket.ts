import type { Server } from 'node:http';
import { WebSocketServer, type RawData } from 'ws';
import { createHighPrecisionTimestamp } from '../time.js';

interface GatewayMessage {
  type: string;
  payload: Record<string, unknown>;
  meta: {
    timestamp: string;
  };
}

function serializeMessage(type: string, payload: Record<string, unknown>): string {
  const message: GatewayMessage = {
    type,
    payload,
    meta: {
      timestamp: createHighPrecisionTimestamp(),
    },
  };

  return JSON.stringify(message);
}

function getRawDataSize(raw: RawData): number {
  if (Array.isArray(raw)) {
    return raw.reduce((total, chunk) => total + chunk.byteLength, 0);
  }

  return raw.byteLength;
}

export function attachWebSocketGateway(server: Server) {
  const gateway = new WebSocketServer({
    server,
    path: '/ws',
  });

  gateway.on('connection', (socket) => {
    socket.send(
      serializeMessage('system.connected', {
        service: 'rtctp-api',
        channels: ['market.ticks.BTC-USD', 'market.ticks.ETH-USD', 'system.health'],
      }),
    );

    socket.on('message', (raw) => {
      socket.send(
        serializeMessage('system.echo', {
          receivedBytes: getRawDataSize(raw),
        }),
      );
    });
  });

  return gateway;
}
