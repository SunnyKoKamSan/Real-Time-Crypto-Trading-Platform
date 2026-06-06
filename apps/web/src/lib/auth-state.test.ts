import { describe, expect, it } from 'vitest';
import { authReducer, initialAuthState } from './auth-state';

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'demo@rtctp.local',
  displayName: 'Demo',
  role: 'USER' as const,
  createdAt: '2026-06-06T00:00:00.000Z',
};

describe('auth reducer', () => {
  it('transitions through submit, authenticated, error, and logout states', () => {
    const submitting = authReducer(initialAuthState, { type: 'submit' });
    expect(submitting.status).toBe('submitting');

    const authenticated = authReducer(submitting, {
      type: 'authenticated',
      user,
      balances: [{ asset: 'USD', balance: '100000.00000000' }],
    });
    expect(authenticated.status).toBe('authenticated');
    expect(authenticated.user?.email).toBe('demo@rtctp.local');

    const errored = authReducer(authenticated, { type: 'error', message: 'Invalid login.' });
    expect(errored.status).toBe('anonymous');
    expect(errored.error).toBe('Invalid login.');

    expect(authReducer(authenticated, { type: 'logout' })).toEqual(initialAuthState);
  });
});
