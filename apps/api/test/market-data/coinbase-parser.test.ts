import { describe, expect, it } from 'vitest';
import { CoinbaseMarketTradesParser } from '../../src/market-data/coinbase-parser.js';

const receivedAt = '2026-06-07T00:00:00.000Z';

describe('coinbase market trades parser', () => {
  it('normalizes market_trades into decimal-string tick events', () => {
    const parser = new CoinbaseMarketTradesParser(['BTC-USD', 'ETH-USD']);
    const result = parser.parse(
      JSON.stringify({
        channel: 'market_trades',
        sequence_num: 10,
        events: [
          {
            type: 'update',
            trades: [
              {
                trade_id: '1',
                product_id: 'BTC-USD',
                price: '65000.12000000',
                size: '0.01000000',
                side: 'BUY',
                time: '2026-06-07T00:00:01.000Z',
              },
            ],
          },
        ],
      }),
      receivedAt,
    );

    expect(result).toMatchObject({
      kind: 'ticks',
      ticks: [
        {
          type: 'MarketTickReceived',
          symbol: 'BTC-USD',
          price: '65000.12000000',
          size: '0.01000000',
          provider: 'coinbase',
          providerSequence: '10',
          tradeId: '1',
        },
      ],
    });
  });

  it('handles heartbeats, unsupported products, malformed JSON, invalid decimals, and duplicates', () => {
    const parser = new CoinbaseMarketTradesParser(['BTC-USD']);

    expect(parser.parse('{"channel":"heartbeats"}')).toEqual({ kind: 'heartbeat' });
    expect(
      parser.parse(
        '{"channel":"market_trades","events":[{"trades":[{"trade_id":"x","product_id":"DOGE-USD","price":"1.00000000","size":"1.00000000","time":"2026-06-07T00:00:01.000Z"}]}]}',
      ),
    ).toEqual({ kind: 'ignored', ignored: 1 });
    expect(parser.parse('{')).toMatchObject({ kind: 'error' });
    expect(
      parser.parse(
        '{"channel":"market_trades","events":[{"trades":[{"trade_id":"bad","product_id":"BTC-USD","price":1,"size":"1.00000000","time":"2026-06-07T00:00:01.000Z"}]}]}',
      ),
    ).toMatchObject({ kind: 'error' });

    const duplicateMessage =
      '{"channel":"market_trades","events":[{"trades":[{"trade_id":"dupe","product_id":"BTC-USD","price":"1.00000000","size":"1.00000000","time":"2026-06-07T00:00:01.000Z"}]}]}';
    expect(parser.parse(duplicateMessage)).toMatchObject({ kind: 'ticks' });
    expect(parser.parse(duplicateMessage)).toMatchObject({
      kind: 'ticks',
      ticks: [],
      duplicates: 1,
    });
  });
});
