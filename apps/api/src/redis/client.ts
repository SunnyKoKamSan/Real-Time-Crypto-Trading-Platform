import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../logger.js';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    redisClient.on('error', (error: Error) => {
      logger.warn({ err: error }, 'redis client error');
    });
  }

  return redisClient;
}

export async function closeRedisClient() {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
}
