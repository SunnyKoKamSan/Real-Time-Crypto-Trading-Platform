import type { NextFunction, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { sendError } from '../http/responses.js';
import { logger } from '../logger.js';
import { getRedisClient } from '../redis/client.js';
import {
  RedisRateLimitStore,
  type RateLimitResult,
  type RateLimitRule,
  type RateLimitStore,
} from '../redis/rate-limit.js';

export const authRateLimitRules = {
  register: { limit: 5, windowMs: 15 * 60_000 },
  login: { limit: 8, windowMs: 15 * 60_000 },
  refresh: { limit: 30, windowMs: 15 * 60_000 },
  logout: { limit: 30, windowMs: 15 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;

let authRateLimitStore: RateLimitStore | null = null;

export function setAuthRateLimitStore(store: RateLimitStore | null) {
  authRateLimitStore = store;
}

function getAuthRateLimitStore(): RateLimitStore {
  authRateLimitStore ??= new RedisRateLimitStore(getRedisClient());
  return authRateLimitStore;
}

function hashKeyPart(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

export function authRateLimitKey(request: Request, scope: string): string {
  const email =
    typeof request.body === 'object' &&
    request.body !== null &&
    'email' in request.body &&
    typeof request.body.email === 'string'
      ? request.body.email.trim().toLowerCase()
      : '';
  const emailPart = email ? `:${hashKeyPart(email)}` : '';

  return `rtctp:v1:rate-limit:auth:${scope}:${request.ip}${emailPart}`;
}

function setRateLimitHeaders(response: Response, result: RateLimitResult) {
  response.setHeader('X-RateLimit-Limit', String(result.limit));
  response.setHeader('X-RateLimit-Remaining', String(result.remaining));
  response.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt.getTime() / 1_000)));

  if (result.retryAfterSeconds) {
    response.setHeader('Retry-After', String(result.retryAfterSeconds));
  }
}

export function createAuthRateLimitMiddleware(scope: keyof typeof authRateLimitRules) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const correlationId = response.locals.correlationId as string;

    try {
      const result = await getAuthRateLimitStore().check(
        authRateLimitKey(request, scope),
        authRateLimitRules[scope],
        new Date(),
      );
      setRateLimitHeaders(response, result);

      if (!result.allowed) {
        sendError(response, 429, {
          code: 'RATE_LIMITED',
          message: 'Too many authentication requests. Try again later.',
          correlationId,
        });
        return;
      }

      next();
    } catch (error) {
      logger.warn({ err: error, scope }, 'auth rate limit unavailable');

      if (env.NODE_ENV === 'production') {
        sendError(response, 429, {
          code: 'RATE_LIMITED',
          message: 'Authentication is temporarily unavailable.',
          correlationId,
        });
        return;
      }

      next();
    }
  };
}
