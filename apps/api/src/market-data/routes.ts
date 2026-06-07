import { Buffer } from 'node:buffer';
import { Router, type Request, type Response } from 'express';
import type { MarketCandleDto, MarketProviderHealthDto, MarketTickDto } from '@rtctp/domain';
import type { Database } from '../db/client.js';
import { db as defaultDb } from '../db/client.js';
import { sendError, sendSuccess } from '../http/responses.js';
import { listCandlesPage, listMarketTicksPage } from '../repositories/market-data.js';
import { findSymbolByCode } from '../repositories/symbols.js';
import { isSupportedCandleInterval, isSupportedMarketSymbol } from './contracts.js';

export interface MarketRouterOptions {
  database?: Database;
  getHealth: () => MarketProviderHealthDto;
}

export function createMarketDataRouter(options: MarketRouterOptions): Router {
  const router = Router();
  const database = options.database ?? defaultDb;

  router.get('/market/health', (_request, response) => {
    sendSuccess(response, options.getHealth());
  });

  router.get('/market/:symbol/ticks', async (request, response, next) => {
    try {
      const symbol = request.params.symbol;
      if (!isSupportedMarketSymbol(symbol)) {
        sendValidationError(response, request, 'Unsupported market symbol.');
        return;
      }

      const query = parsePageQuery(request, 50, 500);
      if (!query.ok) {
        sendValidationError(response, request, query.message);
        return;
      }

      const symbolRow = await findSymbolByCode(database, symbol);
      if (!symbolRow) {
        sendValidationError(response, request, 'Market symbol is not available.');
        return;
      }

      const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
      if (query.cursor && !cursor) {
        sendValidationError(response, request, 'Invalid pagination cursor.');
        return;
      }

      const since =
        typeof request.query.since === 'string' ? new Date(request.query.since) : undefined;
      if (request.query.since && (!since || Number.isNaN(since.getTime()))) {
        sendValidationError(response, request, 'since must be an ISO timestamp.');
        return;
      }

      const tickOptions = {
        limit: query.limit + 1,
        ...(cursor ? { cursor: { observedAt: cursor.timestamp, id: cursor.id } } : {}),
        ...(since ? { since } : {}),
      };
      const rows = await listMarketTicksPage(database, symbolRow.id, tickOptions);
      const page = rows.slice(0, query.limit);
      const next = rows.length > query.limit ? page.at(-1) : undefined;

      sendSuccess(response, {
        ticks: page.map(
          (row): MarketTickDto => ({
            id: row.id,
            symbol,
            price: row.price,
            size: row.size,
            source: row.source as MarketTickDto['source'],
            providerTimestamp: row.observedAt.toISOString(),
            receivedTimestamp: row.receivedAt.toISOString(),
            providerSequence: row.providerSequence ?? undefined,
            tradeId: row.tradeId ?? undefined,
          }),
        ),
        page: {
          limit: query.limit,
          nextCursor: next ? encodeCursor(next.observedAt, next.id) : null,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/market/:symbol/candles', async (request, response, next) => {
    try {
      const symbol = request.params.symbol;
      if (!isSupportedMarketSymbol(symbol)) {
        sendValidationError(response, request, 'Unsupported market symbol.');
        return;
      }

      const interval = request.query.interval ?? '1m';
      if (!isSupportedCandleInterval(interval)) {
        sendValidationError(response, request, 'interval must be 1m.');
        return;
      }

      const query = parsePageQuery(request, 50, 500);
      if (!query.ok) {
        sendValidationError(response, request, query.message);
        return;
      }

      const symbolRow = await findSymbolByCode(database, symbol);
      if (!symbolRow) {
        sendValidationError(response, request, 'Market symbol is not available.');
        return;
      }

      const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
      if (query.cursor && !cursor) {
        sendValidationError(response, request, 'Invalid pagination cursor.');
        return;
      }

      const candleOptions = {
        interval,
        limit: query.limit + 1,
        ...(cursor ? { cursor: { timestamp: cursor.timestamp, id: cursor.id } } : {}),
      };
      const rows = await listCandlesPage(database, symbolRow.id, candleOptions);
      const page = rows.slice(0, query.limit);
      const next = rows.length > query.limit ? page.at(-1) : undefined;

      sendSuccess(response, {
        candles: page.map(
          (row): MarketCandleDto => ({
            id: row.id,
            symbol,
            interval,
            intervalStart: row.timestamp.toISOString(),
            intervalEnd: new Date(row.timestamp.getTime() + 60_000).toISOString(),
            open: row.open,
            high: row.high,
            low: row.low,
            close: row.close,
            volume: row.volume,
          }),
        ),
        page: {
          limit: query.limit,
          nextCursor: next ? encodeCursor(next.timestamp, next.id) : null,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function parsePageQuery(
  request: Request,
  defaultLimit: number,
  maxLimit: number,
): { ok: true; limit: number; cursor?: string } | { ok: false; message: string } {
  const rawLimit = request.query.limit;
  const limit =
    rawLimit === undefined
      ? defaultLimit
      : typeof rawLimit === 'string'
        ? Number.parseInt(rawLimit, 10)
        : Number.NaN;

  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return { ok: false, message: `limit must be an integer between 1 and ${maxLimit}.` };
  }

  const rawCursor = request.query.cursor;
  if (rawCursor !== undefined && typeof rawCursor !== 'string') {
    return { ok: false, message: 'cursor must be a string.' };
  }

  return rawCursor ? { ok: true, limit, cursor: rawCursor } : { ok: true, limit };
}

function encodeCursor(timestamp: Date, id: string): string {
  return Buffer.from(JSON.stringify({ timestamp: timestamp.toISOString(), id }), 'utf8').toString(
    'base64url',
  );
}

function decodeCursor(cursor: string): { timestamp: Date; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      timestamp?: unknown;
      id?: unknown;
    };
    if (typeof parsed.timestamp !== 'string' || typeof parsed.id !== 'string') {
      return null;
    }

    const timestamp = new Date(parsed.timestamp);
    if (Number.isNaN(timestamp.getTime())) {
      return null;
    }

    return { timestamp, id: parsed.id };
  } catch (error) {
    void error;
    return null;
  }
}

function sendValidationError(response: Response, request: Request, message: string): void {
  sendError(response, 400, {
    code: 'VALIDATION_ERROR',
    message,
    correlationId: response.locals.correlationId as string,
    details: {
      path: request.path,
    },
  });
}
