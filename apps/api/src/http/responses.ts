import type { Response } from 'express';
import type { ApiError, ApiSuccess } from '@rtctp/domain';
import { createHighPrecisionTimestamp } from '../time.js';

export function sendSuccess<TData>(response: Response, data: TData) {
  const correlationId = response.locals.correlationId as string;
  const body: ApiSuccess<TData> = {
    ok: true,
    data,
    meta: {
      correlationId,
      timestamp: createHighPrecisionTimestamp(),
    },
  };

  response.json(body);
}

export function sendError(response: Response, statusCode: number, error: ApiError['error']) {
  const correlationId = response.locals.correlationId as string;

  response.status(statusCode).json({
    ok: false,
    error,
    meta: {
      correlationId,
      timestamp: createHighPrecisionTimestamp(),
    },
  } satisfies ApiError);
}
