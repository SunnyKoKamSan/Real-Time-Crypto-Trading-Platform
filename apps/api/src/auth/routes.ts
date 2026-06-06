import type { Request, Response } from 'express';
import { Router } from 'express';
import { ZodError } from 'zod';
import type { LoginRequest, RegisterRequest } from '@rtctp/domain';
import { env } from '../config/env.js';
import { sendError, sendSuccess } from '../http/responses.js';
import { createAuthRateLimitMiddleware } from './rate-limit.js';
import { getAccessTokenClaims, requireAccessToken } from './middleware.js';
import { loginRequestSchema, registerRequestSchema } from './schemas.js';
import {
  AuthPublicError,
  getMe,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
  type AuthContext,
} from './service.js';

function authContext(request: Request, response: Response): AuthContext {
  const ipAddress = request.ip;
  const userAgent = request.header('user-agent') ?? undefined;

  return {
    correlationId: response.locals.correlationId as string,
    ...(ipAddress ? { ipAddress } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

function readRefreshCookie(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[env.AUTH_COOKIE_NAME];

  return typeof value === 'string' ? value : undefined;
}

function readCsrfHeader(request: Request): string | undefined {
  return request.header(env.CSRF_HEADER_NAME) ?? undefined;
}

function setRefreshCookie(response: Response, refreshToken: string, expiresAt: string) {
  response.cookie(env.AUTH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.AUTH_COOKIE_SECURE,
    path: '/api/auth',
    expires: new Date(expiresAt),
  });
}

function clearRefreshCookie(response: Response) {
  response.clearCookie(env.AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.AUTH_COOKIE_SECURE,
    path: '/api/auth',
  });
}

function handleAuthError(error: unknown, response: Response) {
  const correlationId = response.locals.correlationId as string;

  if (error instanceof ZodError) {
    sendError(response, 400, {
      code: 'VALIDATION_ERROR',
      message: 'One or more fields are invalid.',
      correlationId,
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return true;
  }

  if (error instanceof AuthPublicError) {
    sendError(response, error.statusCode, {
      code: error.code,
      message: error.message,
      correlationId,
    });
    return true;
  }

  return false;
}

async function authRoute(
  request: Request,
  response: Response,
  handler: () => Promise<void>,
) {
  try {
    await handler();
  } catch (error) {
    if (!handleAuthError(error, response)) {
      throw error;
    }
  }
}

export function createAuthRouter() {
  const router = Router();

  router.post(
    '/auth/register',
    createAuthRateLimitMiddleware('register'),
    (request, response, next) => {
      authRoute(request, response, async () => {
        const input: RegisterRequest = registerRequestSchema.parse(request.body);
        const result = await registerUser(input, authContext(request, response));
        setRefreshCookie(response, result.refreshToken ?? '', result.data.auth.session.expiresAt);
        sendSuccess(response, result.data);
      }).catch(next);
    },
  );

  router.post('/auth/login', createAuthRateLimitMiddleware('login'), (request, response, next) => {
    authRoute(request, response, async () => {
      const input: LoginRequest = loginRequestSchema.parse(request.body);
      const result = await loginUser(input, authContext(request, response));
      setRefreshCookie(response, result.refreshToken ?? '', result.data.auth.session.expiresAt);
      sendSuccess(response, result.data);
    }).catch(next);
  });

  router.post(
    '/auth/refresh',
    createAuthRateLimitMiddleware('refresh'),
    (request, response, next) => {
      authRoute(request, response, async () => {
        const result = await refreshSession(
          readRefreshCookie(request),
          readCsrfHeader(request),
          authContext(request, response),
        );
        setRefreshCookie(response, result.refreshToken ?? '', result.data.auth.session.expiresAt);
        sendSuccess(response, result.data);
      }).catch(next);
    },
  );

  router.post('/auth/logout', createAuthRateLimitMiddleware('logout'), (request, response, next) => {
    authRoute(request, response, async () => {
      const result = await logoutSession(
        readRefreshCookie(request),
        readCsrfHeader(request),
        authContext(request, response),
      );
      clearRefreshCookie(response);
      sendSuccess(response, result);
    }).catch(next);
  });

  router.get('/me', requireAccessToken, (request, response, next) => {
    authRoute(request, response, async () => {
      void request;
      const claims = getAccessTokenClaims(response);
      sendSuccess(response, await getMe(claims.sub));
    }).catch(next);
  });

  return router;
}
