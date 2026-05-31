CREATE TYPE "public"."asset" AS ENUM('BTC', 'ETH', 'USD');--> statement-breakpoint
CREATE TYPE "public"."audit_event_type" AS ENUM('USER_CREATED', 'SESSION_CREATED', 'ORDER_CREATED', 'ORDER_CANCELLED', 'TRADE_EXECUTED', 'LEDGER_ENTRY_CREATED', 'SYSTEM_EVENT');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('SYSTEM_MINT', 'ORDER_RESERVE', 'ORDER_RELEASE', 'TRADE_SETTLEMENT', 'FEE');--> statement-breakpoint
CREATE TYPE "public"."order_side" AS ENUM('BUY', 'SELL');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('MARKET', 'LIMIT');--> statement-breakpoint
CREATE TYPE "public"."outbox_event_status" AS ENUM('PENDING', 'PUBLISHED', 'FAILED');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "audit_event_type" NOT NULL,
	"actor_user_id" uuid,
	"aggregate_type" varchar(64) NOT NULL,
	"aggregate_id" varchar(128) NOT NULL,
	"payload" jsonb NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol_id" uuid NOT NULL,
	"interval" varchar(16) NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"open" numeric(20, 8) NOT NULL,
	"high" numeric(20, 8) NOT NULL,
	"low" numeric(20, 8) NOT NULL,
	"close" numeric(20, 8) NOT NULL,
	"volume" numeric(20, 8) NOT NULL,
	CONSTRAINT "candles_prices_positive_check" CHECK ("candles"."open" > 0 and "candles"."high" > 0 and "candles"."low" > 0 and "candles"."close" > 0),
	CONSTRAINT "candles_volume_non_negative_check" CHECK ("candles"."volume" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset" "asset" NOT NULL,
	"type" "ledger_entry_type" NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"reference_type" varchar(64) NOT NULL,
	"reference_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_amount_non_zero_check" CHECK ("ledger_entries"."amount" <> 0)
);
--> statement-breakpoint
CREATE TABLE "market_ticks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol_id" uuid NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"bid" numeric(20, 8),
	"ask" numeric(20, 8),
	"source" varchar(32) NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_ticks_price_positive_check" CHECK ("market_ticks"."price" > 0),
	CONSTRAINT "market_ticks_bid_positive_check" CHECK ("market_ticks"."bid" is null or "market_ticks"."bid" > 0),
	CONSTRAINT "market_ticks_ask_positive_check" CHECK ("market_ticks"."ask" is null or "market_ticks"."ask" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol_id" uuid NOT NULL,
	"client_order_id" varchar(96),
	"side" "order_side" NOT NULL,
	"type" "order_type" NOT NULL,
	"status" "order_status" NOT NULL,
	"price" numeric(20, 8),
	"quantity" numeric(20, 8) NOT NULL,
	"filled_quantity" numeric(20, 8) DEFAULT '0' NOT NULL,
	"remaining_quantity" numeric(20, 8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_quantity_positive_check" CHECK ("orders"."quantity" > 0),
	CONSTRAINT "orders_filled_non_negative_check" CHECK ("orders"."filled_quantity" >= 0),
	CONSTRAINT "orders_remaining_non_negative_check" CHECK ("orders"."remaining_quantity" >= 0),
	CONSTRAINT "orders_filled_within_quantity_check" CHECK ("orders"."filled_quantity" <= "orders"."quantity"),
	CONSTRAINT "orders_limit_price_check" CHECK (("orders"."type" = 'LIMIT' and "orders"."price" > 0) or ("orders"."type" = 'MARKET' and "orders"."price" is null))
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"payload_version" integer NOT NULL,
	"aggregate_type" varchar(64) NOT NULL,
	"aggregate_id" varchar(128) NOT NULL,
	"partition_key" varchar(128) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_event_status" DEFAULT 'PENDING' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"correlation_id" uuid NOT NULL,
	"causation_id" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_events_payload_version_positive_check" CHECK ("outbox_events"."payload_version" > 0),
	CONSTRAINT "outbox_events_attempts_non_negative_check" CHECK ("outbox_events"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "processed_events" (
	"consumer_group_name" varchar(120) NOT NULL,
	"event_id" uuid NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processed_events_consumer_group_event_pk" PRIMARY KEY("consumer_group_name","event_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "symbols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(24) NOT NULL,
	"base_asset" "asset" NOT NULL,
	"quote_asset" "asset" NOT NULL,
	"price_scale" integer DEFAULT 8 NOT NULL,
	"quantity_scale" integer DEFAULT 8 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "symbols_assets_check" CHECK ("symbols"."base_asset" <> "symbols"."quote_asset"),
	CONSTRAINT "symbols_active_check" CHECK ("symbols"."is_active" in (0, 1))
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol_id" uuid NOT NULL,
	"buy_order_id" uuid NOT NULL,
	"sell_order_id" uuid NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"fee_amount" numeric(20, 8) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trades_quantity_positive_check" CHECK ("trades"."quantity" > 0),
	CONSTRAINT "trades_price_positive_check" CHECK ("trades"."price" > 0),
	CONSTRAINT "trades_fee_non_negative_check" CHECK ("trades"."fee_amount" >= 0),
	CONSTRAINT "trades_distinct_orders_check" CHECK ("trades"."buy_order_id" <> "trades"."sell_order_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"role" varchar(32) DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candles" ADD CONSTRAINT "candles_symbol_id_symbols_id_fk" FOREIGN KEY ("symbol_id") REFERENCES "public"."symbols"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_ticks" ADD CONSTRAINT "market_ticks_symbol_id_symbols_id_fk" FOREIGN KEY ("symbol_id") REFERENCES "public"."symbols"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_symbol_id_symbols_id_fk" FOREIGN KEY ("symbol_id") REFERENCES "public"."symbols"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_symbol_id_symbols_id_fk" FOREIGN KEY ("symbol_id") REFERENCES "public"."symbols"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_buy_order_id_orders_id_fk" FOREIGN KEY ("buy_order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_sell_order_id_orders_id_fk" FOREIGN KEY ("sell_order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_aggregate_idx" ON "audit_events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_created_idx" ON "audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "candles_symbol_interval_timestamp_unique" ON "candles" USING btree ("symbol_id","interval","timestamp");--> statement-breakpoint
CREATE INDEX "candles_symbol_interval_timestamp_idx" ON "candles" USING btree ("symbol_id","interval","timestamp");--> statement-breakpoint
CREATE INDEX "ledger_entries_user_asset_created_idx" ON "ledger_entries" USING btree ("user_id","asset","created_at");--> statement-breakpoint
CREATE INDEX "market_ticks_symbol_timestamp_idx" ON "market_ticks" USING btree ("symbol_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_user_client_order_unique" ON "orders" USING btree ("user_id","client_order_id") WHERE "orders"."client_order_id" is not null;--> statement-breakpoint
CREATE INDEX "orders_open_buy_book_idx" ON "orders" USING btree ("symbol_id","price" desc,"created_at" asc,"id" asc) WHERE "orders"."side" = 'BUY' and "orders"."status" in ('OPEN', 'PARTIALLY_FILLED') and "orders"."price" is not null;--> statement-breakpoint
CREATE INDEX "orders_open_sell_book_idx" ON "orders" USING btree ("symbol_id","price" asc,"created_at" asc,"id" asc) WHERE "orders"."side" = 'SELL' and "orders"."status" in ('OPEN', 'PARTIALLY_FILLED') and "orders"."price" is not null;--> statement-breakpoint
CREATE INDEX "orders_user_status_created_idx" ON "orders" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "outbox_events_status_created_idx" ON "outbox_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "processed_events_consumer_group_event_idx" ON "processed_events" USING btree ("consumer_group_name","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_expires_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "symbols_code_unique" ON "symbols" USING btree ("code");--> statement-breakpoint
CREATE INDEX "trades_symbol_created_idx" ON "trades" USING btree ("symbol_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");