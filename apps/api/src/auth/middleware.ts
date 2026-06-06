import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../http/responses.js';
import { verifyAccessToken, type VerifiedAccessToken } from './tokens.js';

export function readBearerToken(request: Request): string | null {
  const authorization = request.header('authorization');

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export function requireAccessToken(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const correlationId = response.locals.correlationId as string;
  const token = readBearerToken(request);

  if (!token) {
    sendError(response, 401, {
      code: 'AUTH_REQUIRED',
      message: 'Authentication is required.',
      correlationId,
    });
    return;
  }

  verifyAccessToken(token)
    .then((claims) => {
      response.locals.auth = claims;
      next();
    })
    .catch(() => {
      sendError(response, 401, {
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required.',
        correlationId,
      });
    });
}

export function getAccessTokenClaims(response: Response): VerifiedAccessToken {
  return response.locals.auth as VerifiedAccessToken;
}
