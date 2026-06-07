import { describe, expect, it } from 'vitest';
import {
  canCancelOrder,
  isTerminalOrderStatus,
  orderSideSchema,
  marketTickReceivedSchema,
  parseFinancialDecimal,
  passwordPolicySchema,
  requiresLimitPrice,
  validateDecimalString,
  validatePasswordPolicy,
  validateOrderQuantity,
} from './index.js';

describe('financial decimal helpers', () => {
  it('accepts decimal strings with exact database scale', () => {
    expect(validateDecimalString('0')).toBe(true);
    expect(validateDecimalString('123.12345678')).toBe(true);
    expect(parseFinancialDecimal('1.23000000').plus('2.00000000').toFixed(8)).toBe('3.23000000');
  });

  it('rejects numbers and over-scaled decimals at boundaries', () => {
    expect(validateDecimalString(1)).toBe(false);
    expect(validateDecimalString('1.123456789')).toBe(false);
    expect(() => parseFinancialDecimal(1, 'price')).toThrow('decimal string');
  });

  it('requires positive order quantities', () => {
    expect(validateOrderQuantity('0.00000001')).toBe('0.00000001');
    expect(() => validateOrderQuantity('0')).toThrow('positive');
    expect(() => validateOrderQuantity('-1.00000000')).toThrow('positive');
  });

  it('rejects JavaScript numbers in market tick financial fields', () => {
    const result = marketTickReceivedSchema.safeParse({
      type: 'MarketTickReceived',
      version: 1,
      symbol: 'BTC-USD',
      price: 65000,
      size: '0.01000000',
      providerTimestamp: '2026-06-07T00:00:01.000Z',
      receivedTimestamp: '2026-06-07T00:00:01.100Z',
      provider: 'coinbase',
    });

    expect(result.success).toBe(false);
  });
});

describe('auth contracts', () => {
  it('enforces password policy boundaries', () => {
    expect(validatePasswordPolicy('LongEnoughPassword!2026')).toBe(true);
    expect(validatePasswordPolicy('Pass1234')).toBe(true);
    expect(passwordPolicySchema.safeParse('short1').success).toBe(false);
    expect(passwordPolicySchema.safeParse('onlyletterslongenough').success).toBe(false);
    expect(passwordPolicySchema.safeParse('12345678').success).toBe(false);
  });
});

describe('domain enums and invariants', () => {
  it('validates order enum values', () => {
    expect(orderSideSchema.parse('BUY')).toBe('BUY');
    expect(() => orderSideSchema.parse('BID')).toThrow();
  });

  it('classifies order lifecycle transitions', () => {
    expect(isTerminalOrderStatus('FILLED')).toBe(true);
    expect(isTerminalOrderStatus('OPEN')).toBe(false);
    expect(canCancelOrder('PARTIALLY_FILLED')).toBe(true);
    expect(canCancelOrder('FILLED')).toBe(false);
    expect(requiresLimitPrice('LIMIT')).toBe(true);
    expect(requiresLimitPrice('MARKET')).toBe(false);
  });
});
