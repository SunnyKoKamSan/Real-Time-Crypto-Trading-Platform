import cors from 'cors';
import express from 'express';
import { SUPPORTED_SYMBOLS, type HealthResponse } from '@rtctp/domain';
import { env } from './config/env.js';
import { checkDatabaseHealth } from './db/client.js';
import { logger } from './logger.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use((request, response, next) => {
    const startedAt = performance.now();

    response.on('finish', () => {
      logger.info(
        {
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
      timestamp: new Date().toISOString(),
    };

    response.json(body);
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
    response.json({
      symbols: SUPPORTED_SYMBOLS.map((symbol) => ({
        symbol,
        baseAsset: symbol.split('-')[0],
        quoteAsset: symbol.split('-')[1],
      })),
    });
  });

  app.get('/api/system/info', (_request, response) => {
    response.json({
      name: 'Real-Time Crypto Trading Platform',
      mode: 'paper-trading',
      costModel: 'local-first-zero-cost',
      services: ['postgresql', 'redis', 'redpanda', 'prometheus', 'grafana', 'jaeger'],
    });
  });

  return app;
}
