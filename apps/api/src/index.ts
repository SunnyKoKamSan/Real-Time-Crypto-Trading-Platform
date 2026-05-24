import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './logger.js';
import { attachWebSocketGateway } from './realtime/websocket.js';

const app = createApp();
const server = createServer(app);

attachWebSocketGateway(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, `rtctp-api listening on http://localhost:${env.PORT}`);
});
