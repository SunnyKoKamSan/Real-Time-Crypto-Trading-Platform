import { describe, expect, it } from 'vitest';
import { formatLatency } from './format';

describe('formatLatency', () => {
  it('formats positive latency values', () => {
    expect(formatLatency(42.4)).toBe('42 ms');
  });

  it('guards invalid values', () => {
    expect(formatLatency(Number.NaN)).toBe('n/a');
    expect(formatLatency(-1)).toBe('n/a');
  });
});

