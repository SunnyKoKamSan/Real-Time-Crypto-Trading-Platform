import { and, eq, gt, isNull } from 'drizzle-orm';
import type { RepositoryClient } from '../db/client.js';
import { runRepositoryQuery } from '../db/errors.js';
import { type NewSession, sessions } from '../db/schema.js';
import { firstOrThrow } from './helpers.js';

export async function createSession(client: RepositoryClient, session: NewSession) {
  const rows = await runRepositoryQuery(client.insert(sessions).values(session).returning());
  return firstOrThrow(rows, 'session insert returned no rows');
}

export async function findActiveSessionByTokenHash(
  client: RepositoryClient,
  tokenHash: string,
  now = new Date(),
) {
  const rows = await runRepositoryQuery(
    client
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
        ),
      )
      .limit(1),
  );

  return rows[0] ?? null;
}
