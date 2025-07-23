ALTER TABLE "users" DROP CONSTRAINT "users_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_test_user" boolean DEFAULT false NOT NULL;