import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import type { HealthResponse, MarketProviderHealthDto } from '@rtctp/domain';
import { createAuthRouter } from './auth/routes.js';
import { env } from './config/env.js';
import { checkDatabaseHealth } from './db/client.js';
import { db as defaultDb, type Database } from './db/client.js';
import { sendError, sendSuccess } from './http/responses.js';
import { logger } from './logger.js';
import { createMarketDataRouter } from './market-data/routes.js';
import { marketDataService } from './market-data/service.js';
import { supportedMarketSymbols } from './market-data/contracts.js';
import { listSymbols } from './repositories/symbols.js';
import { createHighPrecisionTimestamp } from './time.js';

const correlationHeader = 'x-correlation-id';

export interface CreateAppOptions {
  database?: Database;
  getMarketHealth?: () => MarketProviderHealthDto;
}

function readCorrelationId(request: Request): string {
  const headerValue = request.header(correlationHeader);

  if (headerValue && headerValue.length <= 128) {
    return headerValue;
  }

  return randomUUID();
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const database = options.database ?? defaultDb;
  const getMarketHealth = options.getMarketHealth ?? (() => marketDataService.getHealthSnapshot());

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use((request, response, next) => {
    const correlationId = readCorrelationId(request);
    const startedAt = performance.now();

    response.locals.correlationId = correlationId;
    response.setHeader(correlationHeader, correlationId);

    response.on('finish', () => {
      logger.info(
        {
          correlationId,
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
        },
        'request completed',
      );
    });

    next();
  });

  app.get('/health', (_request, response) => {
    const body: HealthResponse = {
      service: 'rtctp-api',
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: createHighPrecisionTimestamp(),
    };

    sendSuccess(response, body);
  });

  app.get('/health/database', async (_request, response, next) => {
    try {
      await checkDatabaseHealth();
      response.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/symbols', async (_request, response) => {
    try {
      const rows = await listSymbols(database);
      const activeRows = rows.filter((row) => row.isActive === 1);

      if (activeRows.length === 0) {
        sendSuccess(response, fallbackSymbols(true));
        return;
      }

      sendSuccess(response, {
        symbols: activeRows.map((row) => ({
          symbol: row.code,
          baseAsset: row.baseAsset,
          quoteAsset: row.quoteAsset,
          priceScale: row.priceScale,
          quantityScale: row.quantityScale,
          isActive: row.isActive === 1,
        })),
      });
    } catch (error) {
      logger.warn({ err: error }, 'falling back to static symbols');
      sendSuccess(response, fallbackSymbols(true));
    }
  });

  app.get('/api/system/info', (_request, response) => {
    sendSuccess(response, {
      name: 'Real-Time Crypto Trading Platform',
      mode: 'paper-trading',
      costModel: 'local-first-zero-cost',
      services: ['postgresql', 'redis', 'redpanda', 'prometheus', 'grafana', 'jaeger'],
    });
  });

  app.use('/api', createMarketDataRouter({ database, getHealth: getMarketHealth }));
  app.use('/api', createAuthRouter());

  app.use((request, response) => {
    const correlationId = response.locals.correlationId as string;

    sendError(response, 404, {
      code: 'NOT_FOUND',
      message: `No route matches ${request.method} ${request.path}.`,
      correlationId,
    });
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    void _next;

    const correlationId = response.locals.correlationId as string;

    logger.error(
      {
        correlationId,
        err: error,
      },
      'request failed',
    );

    sendError(response, 500, {
      code: 'INTERNAL_ERROR',
      message: 'The API could not complete the request.',
      correlationId,
    });
  });

  return app;
}

function fallbackSymbols(degraded: boolean) {
  return {
    degraded,
    symbols: supportedMarketSymbols.map((symbol) => ({
      symbol,
      baseAsset: symbol.split('-')[0],
      quoteAsset: symbol.split('-')[1],
      priceScale: 8,
      quantityScale: 8,
      isActive: true,
    })),
  };
}
