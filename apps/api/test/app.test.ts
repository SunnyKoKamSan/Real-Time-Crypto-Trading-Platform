import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('api app', () => {
  it('returns health status', async () => {
    const response = await request(createApp()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      service: 'rtctp-api',
      status: 'ok',
    });
  });

  it('lists supported trading symbols', async () => {
    const response = await request(createApp()).get('/api/symbols').expect(200);

    expect(response.body.symbols).toEqual([
      { symbol: 'BTC-USD', baseAsset: 'BTC', quoteAsset: 'USD' },
      { symbol: 'ETH-USD', baseAsset: 'ETH', quoteAsset: 'USD' },
    ]);
  });
});

