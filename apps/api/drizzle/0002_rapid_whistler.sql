CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'AUTH_USER_REGISTERED' BEFORE 'ORDER_CREATED';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'AUTH_LOGIN_SUCCESS' BEFORE 'ORDER_CREATED';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'AUTH_LOGIN_FAILURE' BEFORE 'ORDER_CREATED';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'AUTH_TOKEN_REFRESHED' BEFORE 'ORDER_CREATED';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'AUTH_REFRESH_REPLAY_DETECTED' BEFORE 'ORDER_CREATED';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'AUTH_LOGOUT' BEFORE 'ORDER_CREATED';--> statement-breakpoint
ALTER TYPE "public"."audit_event_type" ADD VALUE 'AUTH_SESSION_REVOKED' BEFORE 'ORDER_CREATED';--> statement-breakpoint
DROP INDEX "sessions_token_hash_unique";--> statement-breakpoint
DROP INDEX "sessions_user_expires_idx";--> statement-breakpoint
DELETE FROM "sessions";--> statement-breakpoint
UPDATE "users" SET "role" = 'ADMIN' WHERE "role" = 'DEV';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "refresh_token_hash" varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "csrf_token_hash" varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "token_family_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "rotated_from_session_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "replaced_by_session_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "last_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "revoked_reason" varchar(64);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "ip_address" varchar(64);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_agent" varchar(512);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" varchar(255);--> statement-breakpoint
UPDATE "users" SET "password_hash" = '$argon2id$v=19$m=19456,t=2,p=1$i4BiPmIA38LBtImHSjQ2jg$ISa8j23WmOaZu3tDS0iim6NZNlk8CjWVgp9vy45ZaGg' WHERE "password_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_refresh_token_hash_unique" ON "sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_created_idx" ON "sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_token_family_idx" ON "sessions" USING btree ("token_family_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_active_refresh_idx" ON "sessions" USING btree ("user_id","expires_at") WHERE "sessions"."revoked_at" is null;--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "token_hash";
