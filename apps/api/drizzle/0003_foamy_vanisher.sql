ALTER TABLE "market_ticks" ADD COLUMN "size" numeric(20, 8) DEFAULT '0.00000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "market_ticks" ADD COLUMN "provider_sequence" varchar(128);--> statement-breakpoint
ALTER TABLE "market_ticks" ADD COLUMN "trade_id" varchar(128);--> statement-breakpoint
CREATE INDEX "candles_symbol_interval_timestamp_desc_idx" ON "candles" USING btree ("symbol_id","interval","timestamp" desc,"id" desc);--> statement-breakpoint
CREATE INDEX "market_ticks_symbol_observed_desc_idx" ON "market_ticks" USING btree ("symbol_id","observed_at" desc,"id" desc);--> statement-breakpoint
CREATE UNIQUE INDEX "market_ticks_symbol_source_trade_unique" ON "market_ticks" USING btree ("symbol_id","source","trade_id") WHERE "market_ticks"."trade_id" is not null;--> statement-breakpoint
ALTER TABLE "market_ticks" ADD CONSTRAINT "market_ticks_size_non_negative_check" CHECK ("market_ticks"."size" >= 0);--> statement-breakpoint
ALTER TABLE "market_ticks" ALTER COLUMN "size" DROP DEFAULT;
