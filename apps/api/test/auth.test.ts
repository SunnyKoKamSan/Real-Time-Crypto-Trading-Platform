import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/password.js';
import { createAccessToken, createOpaqueToken, hashToken, verifyAccessToken } from '../src/auth/tokens.js';
import { MemoryRateLimitStore } from '../src/redis/rate-limit.js';

describe('auth password helpers', () => {
  it('hashes with argon2id and verifies only the correct password', async () => {
    const hash = await hashPassword('LongEnoughPassword!2026');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash, 'LongEnoughPassword!2026')).toBe(true);
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });
});

describe('auth token helpers', () => {
  it('creates and verifies access tokens', async () => {
    const token = await createAccessToken({
      sub: '00000000-0000-4000-8000-000000000001',
      sid: '00000000-0000-4000-8000-000000000002',
      role: 'USER',
    });

    const claims = await verifyAccessToken(token.accessToken);
    expect(claims.sub).toBe('00000000-0000-4000-8000-000000000001');
    expect(claims.sid).toBe('00000000-0000-4000-8000-000000000002');
    expect(claims.role).toBe('USER');
  });

  it('rejects expired and malformed access tokens', async () => {
    const token = await createAccessToken(
      {
        sub: '00000000-0000-4000-8000-000000000001',
        sid: '00000000-0000-4000-8000-000000000002',
        role: 'ADMIN',
      },
      new Date('2000-01-01T00:00:00.000Z'),
    );

    await expect(verifyAccessToken(token.accessToken)).rejects.toThrow();
    await expect(verifyAccessToken('not-a-jwt')).rejects.toThrow();
  });

  it('hashes opaque refresh tokens without preserving raw token text', () => {
    const token = createOpaqueToken();
    const hash = hashToken(token);

    expect(token).toHaveLength(43);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
  });
});

describe('memory rate limiter', () => {
  it('allows, blocks, and resets on a deterministic clock', async () => {
    const store = new MemoryRateLimitStore();
    const rule = { limit: 2, windowMs: 1_000 };

    expect((await store.check('key', rule, new Date(0))).allowed).toBe(true);
    expect((await store.check('key', rule, new Date(100))).allowed).toBe(true);

    const blocked = await store.check('key', rule, new Date(200));
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);

    const reset = await store.check('key', rule, new Date(1_101));
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(1);
  });
});
