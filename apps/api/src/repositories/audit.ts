import { and, eq } from 'drizzle-orm';
import type { RepositoryClient } from '../db/client.js';
import { runRepositoryQuery } from '../db/errors.js';
import { auditEvents, type NewAuditEvent } from '../db/schema.js';
import { firstOrThrow } from './helpers.js';

export async function appendAuditEvent(client: RepositoryClient, event: NewAuditEvent) {
  const rows = await runRepositoryQuery(client.insert(auditEvents).values(event).returning());
  return firstOrThrow(rows, 'audit event insert returned no rows');
}

export async function listAuditEventsForAggregate(
  client: RepositoryClient,
  aggregateType: string,
  aggregateId: string,
) {
  return runRepositoryQuery(
    client
      .select()
      .from(auditEvents)
      .where(
        and(eq(auditEvents.aggregateType, aggregateType), eq(auditEvents.aggregateId, aggregateId)),
      )
      .orderBy(auditEvents.createdAt),
  );
}
