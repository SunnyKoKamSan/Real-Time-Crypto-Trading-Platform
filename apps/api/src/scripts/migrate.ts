import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, queryClient } from '../db/client.js';

const migrationsFolder = new URL('../../drizzle', import.meta.url).pathname;

await migrate(db, { migrationsFolder });
await queryClient.end();
