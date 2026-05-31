import { sql as drizzleSql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;
export type TransactionClient = Parameters<Parameters<Database['transaction']>[0]>[0];
export type RepositoryClient = Database | TransactionClient;

export function createDatabase(databaseUrl = env.DATABASE_URL): {
  db: Database;
  sql: postgres.Sql;
} {
  const sql = postgres(databaseUrl, {
    max: env.NODE_ENV === 'test' ? 1 : 10,
    prepare: false,
  });

  return {
    db: drizzle(sql, { schema }),
    sql,
  };
}

export const { db, sql: queryClient } = createDatabase();

export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>,
  client: Database = db,
): Promise<T> {
  return client.transaction(callback);
}

export async function checkDatabaseHealth(client: Database = db): Promise<boolean> {
  await client.execute(drizzleSql`select 1`);
  return true;
}
