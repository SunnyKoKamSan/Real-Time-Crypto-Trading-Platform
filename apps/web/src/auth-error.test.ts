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
        password: '!!!',
      });
    } catch (caught) {
      error = caught;
    }

    expect(publicAuthError(error)).toBe(
      'Password must be at least 8 characters, include at least one alphabetic character, and include at least one number.',
    );
  });
});
