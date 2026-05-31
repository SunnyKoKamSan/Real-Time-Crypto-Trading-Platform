import { and, eq } from 'drizzle-orm';
import type { EventMetadata } from '@rtctp/domain';
import type { RepositoryClient } from '../db/client.js';
import { runRepositoryQuery } from '../db/errors.js';
import { type NewOutboxEvent, outboxEvents, processedEvents } from '../db/schema.js';
import { firstOrThrow } from './helpers.js';

export type OutboxInsert = EventMetadata & {
  payload: Record<string, unknown>;
};

export async function insertOutboxEvent(client: RepositoryClient, event: OutboxInsert) {
  const row: NewOutboxEvent = {
    id: event.eventId,
    eventType: event.eventType,
    payloadVersion: event.payloadVersion,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    partitionKey: event.partitionKey,
    payload: event.payload,
    occurredAt: new Date(event.occurredAt),
    correlationId: event.correlationId,
    causationId: event.causationId,
  };

  const rows = await runRepositoryQuery(client.insert(outboxEvents).values(row).returning());
  return firstOrThrow(rows, 'outbox insert returned no rows');
}

export async function listPendingOutboxEvents(client: RepositoryClient, limit: number) {
  return runRepositoryQuery(
    client
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.status, 'PENDING'))
      .orderBy(outboxEvents.createdAt)
      .limit(limit),
  );
}

export async function markOutboxEventPublished(
  client: RepositoryClient,
  id: string,
  publishedAt = new Date(),
) {
  const rows = await runRepositoryQuery(
    client
      .update(outboxEvents)
      .set({ status: 'PUBLISHED', publishedAt })
      .where(eq(outboxEvents.id, id))
      .returning(),
  );

  return firstOrThrow(rows, 'outbox update returned no rows');
}

export async function recordProcessedEvent(
  client: RepositoryClient,
  consumerGroupName: string,
  eventId: string,
) {
  await runRepositoryQuery(
    client
      .insert(processedEvents)
      .values({ consumerGroupName, eventId })
      .onConflictDoNothing({
        target: [processedEvents.consumerGroupName, processedEvents.eventId],
      }),
  );
}

export async function hasProcessedEvent(
  client: RepositoryClient,
  consumerGroupName: string,
  eventId: string,
) {
  const rows = await runRepositoryQuery(
    client
      .select()
      .from(processedEvents)
      .where(
        and(
          eq(processedEvents.consumerGroupName, consumerGroupName),
          eq(processedEvents.eventId, eventId),
        ),
      )
      .limit(1),
  );

  return rows.length > 0;
}
