import { and, eq, gt, isNull } from 'drizzle-orm';
import type { RepositoryClient } from '../db/client.js';
import { runRepositoryQuery } from '../db/errors.js';
import { type NewSession, type Session, sessions } from '../db/schema.js';
import { firstOrThrow } from './helpers.js';

export async function createSession(client: RepositoryClient, session: NewSession) {
  const rows = await runRepositoryQuery(client.insert(sessions).values(session).returning());
  return firstOrThrow(rows, 'session insert returned no rows');
}

export async function findSessionByRefreshTokenHash(client: RepositoryClient, refreshTokenHash: string) {
  const rows = await runRepositoryQuery(
    client
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, refreshTokenHash))
      .limit(1),
  );

  return rows[0] ?? null;
}

export function isRefreshSessionUsable(session: Session, now = new Date()): boolean {
  return session.revokedAt === null && session.expiresAt > now && session.replacedBySessionId === null;
}

export async function findActiveSessionByRefreshTokenHash(
  client: RepositoryClient,
  refreshTokenHash: string,
  now = new Date(),
) {
  const rows = await runRepositoryQuery(
    client
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.refreshTokenHash, refreshTokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
        ),
      )
      .limit(1),
  );

  return rows[0] ?? null;
}

export async function revokeSession(
  client: RepositoryClient,
  sessionId: string,
  revokedReason: string,
  now = new Date(),
) {
  const rows = await runRepositoryQuery(
    client
      .update(sessions)
      .set({ revokedAt: now, revokedReason, updatedAt: now })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
      .returning(),
  );

  return rows[0] ?? null;
}

export async function markSessionRotated(
  client: RepositoryClient,
  oldSessionId: string,
  newSessionId: string,
  now = new Date(),
) {
  const rows = await runRepositoryQuery(
    client
      .update(sessions)
      .set({
        lastUsedAt: now,
        revokedAt: now,
        revokedReason: 'ROTATED',
        replacedBySessionId: newSessionId,
        updatedAt: now,
      })
      .where(eq(sessions.id, oldSessionId))
      .returning(),
  );

  return firstOrThrow(rows, 'session rotation update returned no rows');
}

export async function touchSessionLastUsed(
  client: RepositoryClient,
  sessionId: string,
  now = new Date(),
) {
  await runRepositoryQuery(
    client.update(sessions).set({ lastUsedAt: now, updatedAt: now }).where(eq(sessions.id, sessionId)),
  );
}

export async function revokeTokenFamily(
  client: RepositoryClient,
  tokenFamilyId: string,
  revokedReason: string,
  now = new Date(),
) {
  return runRepositoryQuery(
    client
      .update(sessions)
      .set({ revokedAt: now, revokedReason, updatedAt: now })
      .where(and(eq(sessions.tokenFamilyId, tokenFamilyId), isNull(sessions.revokedAt)))
      .returning(),
  );
}
