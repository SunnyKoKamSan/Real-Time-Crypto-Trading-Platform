import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './logger.js';
import { marketDataService } from './market-data/service.js';
import { attachWebSocketGateway } from './realtime/websocket.js';

const app = createApp();
const server = createServer(app);

attachWebSocketGateway(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, `rtctp-api listening on http://localhost:${env.PORT}`);
});

marketDataService.start().catch((error: unknown) => {
  logger.warn({ err: error }, 'market data service failed to start');
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'shutting down rtctp-api');
  await marketDataService.stop();
  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'http server shutdown failed');
      process.exit(1);
    }
    process.exit(0);
  });
}

process.once('SIGINT', (signal) => {
  void shutdown(signal);
});

process.once('SIGTERM', (signal) => {
  void shutdown(signal);
});
