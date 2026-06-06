import { eq } from 'drizzle-orm';
import type { AuthUser } from '@rtctp/domain';
import type { RepositoryClient } from '../db/client.js';
import { runRepositoryQuery } from '../db/errors.js';
import { type NewUser, type User, users } from '../db/schema.js';
import { firstOrThrow } from './helpers.js';

export function canonicalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function createUser(client: RepositoryClient, user: NewUser) {
  const rows = await runRepositoryQuery(client.insert(users).values(user).returning());
  return firstOrThrow(rows, 'user insert returned no rows');
}

export async function findUserByEmail(client: RepositoryClient, email: string) {
  const rows = await runRepositoryQuery(
    client.select().from(users).where(eq(users.email, canonicalizeEmail(email))).limit(1),
  );
  return rows[0] ?? null;
}

export async function findUserById(client: RepositoryClient, id: string) {
  const rows = await runRepositoryQuery(
    client.select().from(users).where(eq(users.id, id)).limit(1),
  );
  return rows[0] ?? null;
}
