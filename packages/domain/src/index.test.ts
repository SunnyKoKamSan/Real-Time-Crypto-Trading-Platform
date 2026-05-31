import { describe, expect, it } from 'vitest';
import {
  canCancelOrder,
  isTerminalOrderStatus,
  orderSideSchema,
  parseFinancialDecimal,
  requiresLimitPrice,
  validateDecimalString,
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
