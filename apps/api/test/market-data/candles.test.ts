import { describe, expect, it } from 'vitest';
import { OneMinuteCandleAggregator } from '../../src/market-data/candles.js';
import type { MarketTickReceived } from '@rtctp/domain';

function tick(overrides: Partial<MarketTickReceived>): MarketTickReceived {
  return {
    type: 'MarketTickReceived',
    version: 1,
    symbol: 'BTC-USD',
    price: '100.00000000',
    size: '1.00000000',
    providerTimestamp: '2026-06-07T00:00:10.000Z',
    receivedTimestamp: '2026-06-07T00:00:10.100Z',
    provider: 'coinbase',
    tradeId: 't1',
    ...overrides,
  };
}

describe('one-minute candle aggregator', () => {
  it('computes exact OHLCV and accepts late ticks inside the lateness window', () => {
    const aggregator = new OneMinuteCandleAggregator();

    expect(
      aggregator.apply(tick({ price: '100.00000000', size: '1.50000000', tradeId: 't1' })),
    ).toMatchObject({ status: 'updated' });
    expect(
      aggregator.apply(
        tick({
          price: '110.00000000',
          size: '0.25000000',
          providerTimestamp: '2026-06-07T00:00:50.000Z',
          tradeId: 't2',
        }),
      ),
    ).toMatchObject({ status: 'updated' });
    const late = aggregator.apply(
      tick({
        price: '90.00000000',
        size: '0.50000000',
        providerTimestamp: '2026-06-07T00:00:05.000Z',
        tradeId: 't3',
      }),
    );

    expect(late).toMatchObject({
      status: 'updated',
      late: true,
      candle: {
        open: '90.00000000',
        high: '110.00000000',
        low: '90.00000000',
        close: '110.00000000',
        volume: '2.25000000',
      },
    });
  });

  it('rejects duplicate and too-late ticks deterministically', () => {
    const aggregator = new OneMinuteCandleAggregator();
    const duplicate = tick({ tradeId: 'same' });

    expect(aggregator.apply(duplicate)).toMatchObject({ status: 'updated' });
    expect(aggregator.apply(duplicate)).toEqual({ status: 'duplicate' });
    expect(
      aggregator.apply(
        tick({
          providerTimestamp: '2026-06-07T00:02:30.000Z',
          tradeId: 'future',
        }),
      ),
    ).toMatchObject({ status: 'updated' });
    expect(
      aggregator.apply(
        tick({
          providerTimestamp: '2026-06-07T00:00:00.000Z',
          tradeId: 'too-late',
        }),
      ),
    ).toEqual({ status: 'too_late' });
  });
});
