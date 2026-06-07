import { asc, desc, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const financial = (name: string) => numeric(name, { precision: 20, scale: 8 });

export const assetEnum = pgEnum('asset', ['BTC', 'ETH', 'USD']);
export const auditEventTypeEnum = pgEnum('audit_event_type', [
  'USER_CREATED',
  'SESSION_CREATED',
  'AUTH_USER_REGISTERED',
  'AUTH_LOGIN_SUCCESS',
  'AUTH_LOGIN_FAILURE',
  'AUTH_TOKEN_REFRESHED',
  'AUTH_REFRESH_REPLAY_DETECTED',
  'AUTH_LOGOUT',
  'AUTH_SESSION_REVOKED',
  'ORDER_CREATED',
  'ORDER_CANCELLED',
  'TRADE_EXECUTED',
  'LEDGER_ENTRY_CREATED',
  'SYSTEM_EVENT',
]);
export const ledgerEntryTypeEnum = pgEnum('ledger_entry_type', [
  'SYSTEM_MINT',
  'ORDER_RESERVE',
  'ORDER_RELEASE',
  'TRADE_SETTLEMENT',
  'FEE',
]);
export const orderSideEnum = pgEnum('order_side', ['BUY', 'SELL']);
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING',
  'OPEN',
  'PARTIALLY_FILLED',
  'FILLED',
  'CANCELLED',
  'REJECTED',
]);
export const orderTypeEnum = pgEnum('order_type', ['MARKET', 'LIMIT']);
export const outboxEventStatusEnum = pgEnum('outbox_event_status', [
  'PENDING',
  'PUBLISHED',
  'FAILED',
]);
export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 320 }).notNull(),
    displayName: varchar('display_name', { length: 120 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull().default('USER'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    usersEmailUnique: uniqueIndex('users_email_unique').on(table.email),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: varchar('refresh_token_hash', { length: 128 }).notNull(),
    csrfTokenHash: varchar('csrf_token_hash', { length: 128 }).notNull(),
    tokenFamilyId: uuid('token_family_id').notNull(),
    rotatedFromSessionId: uuid('rotated_from_session_id'),
    replacedBySessionId: uuid('replaced_by_session_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: varchar('revoked_reason', { length: 64 }),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: varchar('user_agent', { length: 512 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionsRefreshTokenHashUnique: uniqueIndex('sessions_refresh_token_hash_unique').on(
      table.refreshTokenHash,
    ),
    sessionsUserCreatedIdx: index('sessions_user_created_idx').on(table.userId, table.createdAt),
    sessionsTokenFamilyIdx: index('sessions_token_family_idx').on(
      table.tokenFamilyId,
      table.createdAt,
    ),
    sessionsActiveRefreshIdx: index('sessions_active_refresh_idx')
      .on(table.userId, table.expiresAt)
      .where(sql`${table.revokedAt} is null`),
  }),
);

export const symbols = pgTable(
  'symbols',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 24 }).notNull(),
    baseAsset: assetEnum('base_asset').notNull(),
    quoteAsset: assetEnum('quote_asset').notNull(),
    priceScale: integer('price_scale').notNull().default(8),
    quantityScale: integer('quantity_scale').notNull().default(8),
    isActive: integer('is_active').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    symbolsCodeUnique: uniqueIndex('symbols_code_unique').on(table.code),
    symbolsAssetsCheck: check(
      'symbols_assets_check',
      sql`${table.baseAsset} <> ${table.quoteAsset}`,
    ),
    symbolsActiveCheck: check('symbols_active_check', sql`${table.isActive} in (0, 1)`),
  }),
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    symbolId: uuid('symbol_id')
      .notNull()
      .references(() => symbols.id, { onDelete: 'restrict' }),
    clientOrderId: varchar('client_order_id', { length: 96 }),
    side: orderSideEnum('side').notNull(),
    type: orderTypeEnum('type').notNull(),
    status: orderStatusEnum('status').notNull(),
    price: financial('price'),
    quantity: financial('quantity').notNull(),
    filledQuantity: financial('filled_quantity').notNull().default('0'),
    remainingQuantity: financial('remaining_quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ordersClientOrderUnique: uniqueIndex('orders_user_client_order_unique')
      .on(table.userId, table.clientOrderId)
      .where(sql`${table.clientOrderId} is not null`),
    openBuyOrdersIdx: index('orders_open_buy_book_idx')
      .on(table.symbolId, desc(table.price), asc(table.createdAt), asc(table.id))
      .where(
        sql`${table.side} = 'BUY' and ${table.status} in ('OPEN', 'PARTIALLY_FILLED') and ${table.price} is not null`,
      ),
    openSellOrdersIdx: index('orders_open_sell_book_idx')
      .on(table.symbolId, asc(table.price), asc(table.createdAt), asc(table.id))
      .where(
        sql`${table.side} = 'SELL' and ${table.status} in ('OPEN', 'PARTIALLY_FILLED') and ${table.price} is not null`,
      ),
    ordersUserStatusCreatedIdx: index('orders_user_status_created_idx').on(
      table.userId,
      table.status,
      table.createdAt,
    ),
    ordersQuantityPositiveCheck: check(
      'orders_quantity_positive_check',
      sql`${table.quantity} > 0`,
    ),
    ordersFilledNonNegativeCheck: check(
      'orders_filled_non_negative_check',
      sql`${table.filledQuantity} >= 0`,
    ),
    ordersRemainingNonNegativeCheck: check(
      'orders_remaining_non_negative_check',
      sql`${table.remainingQuantity} >= 0`,
    ),
    ordersFilledWithinQuantityCheck: check(
      'orders_filled_within_quantity_check',
      sql`${table.filledQuantity} <= ${table.quantity}`,
    ),
    ordersLimitPriceCheck: check(
      'orders_limit_price_check',
      sql`(${table.type} = 'LIMIT' and ${table.price} > 0) or (${table.type} = 'MARKET' and ${table.price} is null)`,
    ),
  }),
);

export const trades = pgTable(
  'trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    symbolId: uuid('symbol_id')
      .notNull()
      .references(() => symbols.id, { onDelete: 'restrict' }),
    buyOrderId: uuid('buy_order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    sellOrderId: uuid('sell_order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    price: financial('price').notNull(),
    quantity: financial('quantity').notNull(),
    feeAmount: financial('fee_amount').notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tradesSymbolCreatedIdx: index('trades_symbol_created_idx').on(table.symbolId, table.createdAt),
    tradesQuantityPositiveCheck: check(
      'trades_quantity_positive_check',
      sql`${table.quantity} > 0`,
    ),
    tradesPricePositiveCheck: check('trades_price_positive_check', sql`${table.price} > 0`),
    tradesFeeNonNegativeCheck: check('trades_fee_non_negative_check', sql`${table.feeAmount} >= 0`),
    tradesDistinctOrdersCheck: check(
      'trades_distinct_orders_check',
      sql`${table.buyOrderId} <> ${table.sellOrderId}`,
    ),
  }),
);

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    asset: assetEnum('asset').notNull(),
    type: ledgerEntryTypeEnum('type').notNull(),
    amount: financial('amount').notNull(),
    referenceType: varchar('reference_type', { length: 64 }).notNull(),
    referenceId: uuid('reference_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ledgerUserAssetCreatedIdx: index('ledger_entries_user_asset_created_idx').on(
      table.userId,
      table.asset,
      table.createdAt,
    ),
    ledgerAmountNonZeroCheck: check(
      'ledger_entries_amount_non_zero_check',
      sql`${table.amount} <> 0`,
    ),
    ledgerSignedTypeCheck: check(
      'ledger_entries_signed_type_check',
      sql`(
        (${table.type} = 'SYSTEM_MINT' and ${table.amount} > 0)
        or (${table.type} = 'ORDER_RESERVE' and ${table.amount} < 0)
        or (${table.type} = 'ORDER_RELEASE' and ${table.amount} > 0)
        or (${table.type} = 'TRADE_SETTLEMENT' and ${table.amount} <> 0)
        or (${table.type} = 'FEE' and ${table.amount} < 0)
      )`,
    ),
  }),
);

export const marketTicks = pgTable(
  'market_ticks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    symbolId: uuid('symbol_id')
      .notNull()
      .references(() => symbols.id, { onDelete: 'restrict' }),
    price: financial('price').notNull(),
    size: financial('size').notNull(),
    bid: financial('bid'),
    ask: financial('ask'),
    source: varchar('source', { length: 32 }).notNull(),
    providerSequence: varchar('provider_sequence', { length: 128 }),
    tradeId: varchar('trade_id', { length: 128 }),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    marketTicksSymbolTimestampIdx: index('market_ticks_symbol_timestamp_idx').on(
      table.symbolId,
      table.observedAt,
    ),
    marketTicksSymbolObservedDescIdx: index('market_ticks_symbol_observed_desc_idx').on(
      table.symbolId,
      desc(table.observedAt),
      desc(table.id),
    ),
    marketTicksTradeDedupeIdx: uniqueIndex('market_ticks_symbol_source_trade_unique')
      .on(table.symbolId, table.source, table.tradeId)
      .where(sql`${table.tradeId} is not null`),
    marketTicksPricePositiveCheck: check(
      'market_ticks_price_positive_check',
      sql`${table.price} > 0`,
    ),
    marketTicksSizeNonNegativeCheck: check(
      'market_ticks_size_non_negative_check',
      sql`${table.size} >= 0`,
    ),
    marketTicksBidPositiveCheck: check(
      'market_ticks_bid_positive_check',
      sql`${table.bid} is null or ${table.bid} > 0`,
    ),
    marketTicksAskPositiveCheck: check(
      'market_ticks_ask_positive_check',
      sql`${table.ask} is null or ${table.ask} > 0`,
    ),
  }),
);

export const candles = pgTable(
  'candles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    symbolId: uuid('symbol_id')
      .notNull()
      .references(() => symbols.id, { onDelete: 'restrict' }),
    interval: varchar('interval', { length: 16 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    open: financial('open').notNull(),
    high: financial('high').notNull(),
    low: financial('low').notNull(),
    close: financial('close').notNull(),
    volume: financial('volume').notNull(),
  },
  (table) => ({
    candlesUnique: uniqueIndex('candles_symbol_interval_timestamp_unique').on(
      table.symbolId,
      table.interval,
      table.timestamp,
    ),
    candlesSymbolIntervalTimestampIdx: index('candles_symbol_interval_timestamp_idx').on(
      table.symbolId,
      table.interval,
      table.timestamp,
    ),
    candlesSymbolIntervalTimestampDescIdx: index('candles_symbol_interval_timestamp_desc_idx').on(
      table.symbolId,
      table.interval,
      desc(table.timestamp),
      desc(table.id),
    ),
    candlesPricesPositiveCheck: check(
      'candles_prices_positive_check',
      sql`${table.open} > 0 and ${table.high} > 0 and ${table.low} > 0 and ${table.close} > 0`,
    ),
    candlesVolumeNonNegativeCheck: check(
      'candles_volume_non_negative_check',
      sql`${table.volume} >= 0`,
    ),
  }),
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: auditEventTypeEnum('type').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    aggregateType: varchar('aggregate_type', { length: 64 }).notNull(),
    aggregateId: varchar('aggregate_id', { length: 128 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    auditAggregateIdx: index('audit_events_aggregate_idx').on(
      table.aggregateType,
      table.aggregateId,
    ),
    auditActorCreatedIdx: index('audit_events_actor_created_idx').on(
      table.actorUserId,
      table.createdAt,
    ),
  }),
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey(),
    eventType: varchar('event_type', { length: 120 }).notNull(),
    payloadVersion: integer('payload_version').notNull(),
    aggregateType: varchar('aggregate_type', { length: 64 }).notNull(),
    aggregateId: varchar('aggregate_id', { length: 128 }).notNull(),
    partitionKey: varchar('partition_key', { length: 128 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: outboxEventStatusEnum('status').notNull().default('PENDING'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    correlationId: uuid('correlation_id').notNull(),
    causationId: uuid('causation_id'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    outboxStatusCreatedIdx: index('outbox_events_status_created_idx').on(
      table.status,
      table.createdAt,
    ),
    outboxPayloadVersionPositiveCheck: check(
      'outbox_events_payload_version_positive_check',
      sql`${table.payloadVersion} > 0`,
    ),
    outboxAttemptsNonNegativeCheck: check(
      'outbox_events_attempts_non_negative_check',
      sql`${table.attempts} >= 0`,
    ),
  }),
);

export const processedEvents = pgTable(
  'processed_events',
  {
    consumerGroupName: varchar('consumer_group_name', { length: 120 }).notNull(),
    eventId: uuid('event_id').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    processedEventsPk: primaryKey({
      name: 'processed_events_consumer_group_event_pk',
      columns: [table.consumerGroupName, table.eventId],
    }),
    processedEventsGroupEventIdx: index('processed_events_consumer_group_event_idx').on(
      table.consumerGroupName,
      table.eventId,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SymbolRow = typeof symbols.$inferSelect;
export type NewSymbol = typeof symbols.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type NewOutboxEvent = typeof outboxEvents.$inferInsert;
export type MarketTickRow = typeof marketTicks.$inferSelect;
export type NewMarketTick = typeof marketTicks.$inferInsert;
