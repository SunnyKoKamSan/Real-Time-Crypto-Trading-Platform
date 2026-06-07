import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('api app', () => {
  it('returns health status', async () => {
    const response = await request(createApp()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      data: {
        service: 'rtctp-api',
        status: 'ok',
      },
    });
    expect(response.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{9}Z$/);
  });

  it('lists supported trading symbols', async () => {
    const response = await request(createApp()).get('/api/symbols').expect(200);

    expect(response.headers['x-correlation-id']).toBeTypeOf('string');
    expect(response.body.ok).toBe(true);
    expect(response.body.meta.correlationId).toBe(response.headers['x-correlation-id']);
    expect(response.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{9}Z$/);
    expect(response.body.data.symbols).toEqual([
      {
        symbol: 'BTC-USD',
        baseAsset: 'BTC',
        quoteAsset: 'USD',
        priceScale: 8,
        quantityScale: 8,
        isActive: true,
      },
      {
        symbol: 'ETH-USD',
        baseAsset: 'ETH',
        quoteAsset: 'USD',
        priceScale: 8,
        quantityScale: 8,
        isActive: true,
      },
    ]);
  });

  it('uses caller-supplied correlation IDs', async () => {
    const response = await request(createApp())
      .get('/api/system/info')
      .set('x-correlation-id', 'test-correlation-id')
      .expect(200);

    expect(response.body.meta.correlationId).toBe('test-correlation-id');
  });

  it('formats validation issues as readable user messages', async () => {
    const response = await request(createApp())
      .post('/api/auth/register')
      .send({
        email: 'demo@example.local',
        displayName: 'Demo Trader',
        password: '!!!',
      })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message:
        'Password must be at least 8 characters, include at least one alphabetic character, and include at least one number.',
      details: [
        {
          path: 'password',
          message:
            'Password must be at least 8 characters, include at least one alphabetic character, and include at least one number.',
        },
      ],
    });
  });

  it('returns metadata on error envelopes', async () => {
    const response = await request(createApp()).get('/api/missing').expect(404);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.correlationId).toBe(response.body.meta.correlationId);
    expect(response.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{9}Z$/);
  });
});
