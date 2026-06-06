import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import type { HealthResponse } from '@rtctp/domain';
import { createAuthRouter } from './auth/routes.js';
import { env } from './config/env.js';
import { checkDatabaseHealth } from './db/client.js';
import { sendError, sendSuccess } from './http/responses.js';
import { logger } from './logger.js';
import { createHighPrecisionTimestamp } from './time.js';

const correlationHeader = 'x-correlation-id';
const supportedSymbols = ['BTC-USD', 'ETH-USD'] as const;

function readCorrelationId(request: Request): string {
  const headerValue = request.header(correlationHeader);

  if (headerValue && headerValue.length <= 128) {
    return headerValue;
  }

  return randomUUID();
}

export function createApp() {
  const app = express();

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

  app.get('/api/symbols', (_request, response) => {
    sendSuccess(response, {
      symbols: supportedSymbols.map((symbol) => ({
        symbol,
        baseAsset: symbol.split('-')[0],
        quoteAsset: symbol.split('-')[1],
      })),
    });
  });

  app.get('/api/system/info', (_request, response) => {
    sendSuccess(response, {
      name: 'Real-Time Crypto Trading Platform',
      mode: 'paper-trading',
      costModel: 'local-first-zero-cost',
      services: ['postgresql', 'redis', 'redpanda', 'prometheus', 'grafana', 'jaeger'],
    });
  });

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
