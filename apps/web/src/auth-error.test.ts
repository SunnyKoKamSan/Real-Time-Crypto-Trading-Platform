import { describe, expect, it } from 'vitest';
import { registerRequestSchema } from '@rtctp/domain';
import { publicAuthError } from './App';

describe('auth error formatting', () => {
  it('formats local password validation issues as readable text', () => {
    let error: unknown;

    try {
      registerRequestSchema.parse({
        email: 'demo@example.local',
        displayName: 'Demo Trader',
        password: '123',
      });
    } catch (caught) {
      error = caught;
    }

    expect(publicAuthError(error)).toBe(
      'Password must be at least 12 characters and include at least one letter.',
    );
  });
});
