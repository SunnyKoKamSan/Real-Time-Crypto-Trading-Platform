import { describe, expect, it } from 'vitest';
import { ReconnectController } from '../../src/market-data/reconnect.js';

describe('reconnect controller', () => {
  it('produces deterministic exponential delays with injected jitter', () => {
    const reconnect = new ReconnectController({
      baseMs: 250,
      maxMs: 1_000,
      jitterRatio: 0.2,
      random: () => 0.75,
    });

    reconnect.connect();
    expect(reconnect.getState()).toBe('connecting');
    reconnect.connected();
    expect(reconnect.getState()).toBe('connected');

    expect(reconnect.disconnected()).toBe(275);
    expect(reconnect.disconnected()).toBe(550);
    expect(reconnect.disconnected()).toBe(1_000);
    expect(reconnect.getState()).toBe('reconnecting');
    expect(reconnect.getAttempts()).toBe(3);
  });
});
