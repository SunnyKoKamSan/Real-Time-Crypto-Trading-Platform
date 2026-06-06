import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '@rtctp/domain';
import { env } from '../config/env.js';

export interface AccessTokenClaims {
  sub: string;
  sid: string;
  role: UserRole;
}

export interface VerifiedAccessToken extends AccessTokenClaims {
  exp: number;
  iat: number;
}

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

export function parseDurationMs(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);

  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 's' ? 1_000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;

  return amount * multiplier;
}

export function refreshTokenExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + parseDurationMs(env.REFRESH_TOKEN_TTL));
}

export function accessTokenExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + parseDurationMs(env.ACCESS_TOKEN_TTL));
}

export async function createAccessToken(
  claims: AccessTokenClaims,
  now = new Date(),
): Promise<{ accessToken: string; expiresAt: Date }> {
  const expiresAt = accessTokenExpiresAt(now);
  const accessToken = await new SignJWT({ role: claims.role, sid: claims.sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt(Math.floor(now.getTime() / 1_000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1_000))
    .sign(jwtSecret);

  return { accessToken, expiresAt };
}

export async function verifyAccessToken(accessToken: string): Promise<VerifiedAccessToken> {
  const { payload } = await jwtVerify(accessToken, jwtSecret, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    (payload.role !== 'USER' && payload.role !== 'ADMIN') ||
    typeof payload.exp !== 'number' ||
    typeof payload.iat !== 'number'
  ) {
    throw new Error('Invalid access token claims.');
  }

  return {
    sub: payload.sub,
    sid: payload.sid,
    role: payload.role,
    exp: payload.exp,
    iat: payload.iat,
  };
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function createTokenFamilyId(): string {
  return randomUUID();
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
