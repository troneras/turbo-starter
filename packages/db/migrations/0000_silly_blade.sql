CREATE TYPE "public"."entity_change_type" AS ENUM('CREATE', 'UPDATE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."entity_type_enum" AS ENUM('translation', 'translation_key', 'feature_flag', 'setting', 'page', 'article', 'content', 'menu', 'navigation', 'component', 'template', 'media', 'user_preference');--> statement-breakpoint
CREATE TYPE "public"."relation_action_type" AS ENUM('ADD', 'REMOVE');--> statement-breakpoint
CREATE TYPE "public"."release_status" AS ENUM('OPEN', 'CLOSED', 'DEPLOYED', 'ROLLED_BACK');--> statement-breakpoint
CREATE SEQUENCE "public"."deploy_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "brand_jurisdictions" (
	"brand_id" integer NOT NULL,
	"jurisdiction_id" integer NOT NULL,
	CONSTRAINT "brand_jurisdictions_brand_id_jurisdiction_id_pk" PRIMARY KEY("brand_id","jurisdiction_id")
);
--> statement-breakpoint
CREATE TABLE "brand_locales" (
	"brand_id" integer NOT NULL,
	"locale_id" integer NOT NULL,
	CONSTRAINT "brand_locales_brand_id_locale_id_pk" PRIMARY KEY("brand_id","locale_id")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "jurisdictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"region" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jurisdictions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "locales" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "locales_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"resource" varchar(100) NOT NULL,
	"action" varchar(100) NOT NULL,
	"category" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_role_id" integer,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "service_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"scope" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_user_id" uuid NOT NULL,
	"performed_by" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"is_automatic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"azure_ad_oid" varchar(255),
	"azure_ad_tid" varchar(255),
	"last_login_at" timestamp,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_test_user" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" bigserial,
	"name" text NOT NULL,
	"description" text,
	"status" "release_status" DEFAULT 'OPEN' NOT NULL,
	"deploy_seq" bigint,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deployed_at" timestamp,
	"deployed_by" uuid,
	CONSTRAINT "releases_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "releases_deploy_seq_unique" UNIQUE("deploy_seq")
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" bigserial,
	"entity_type" "entity_type_enum" NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "entities_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "entity_versions" (
	"id" bigserial,
	"entity_id" bigint NOT NULL,
	"release_id" bigint NOT NULL,
	"entity_type" "entity_type_enum" NOT NULL,
	"entity_key" varchar(255),
	"brand_id" integer,
	"jurisdiction_id" integer,
	"locale_id" integer,
	"parent_entity_id" bigint,
	"value" text,
	"status" varchar(20) DEFAULT 'DRAFT',
	"published_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"payload" jsonb,
	"change_type" "entity_change_type" DEFAULT 'UPDATE' NOT NULL,
	"change_set_id" uuid,
	"change_reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "entity_versions_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "entity_versions_entity_id_release_id_unique" UNIQUE("entity_id","release_id")
);
--> statement-breakpoint
CREATE TABLE "relation_versions" (
	"id" bigserial,
	"release_id" bigint NOT NULL,
	"left_entity_id" bigint NOT NULL,
	"right_entity_id" bigint NOT NULL,
	"relation_type" varchar(50) NOT NULL,
	"action" "relation_action_type" NOT NULL,
	"position" integer,
	"metadata" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "relation_versions_id_pk" PRIMARY KEY("id"),
	CONSTRAINT "relation_versions_left_entity_id_right_entity_id_relation_type_release_id_unique" UNIQUE("left_entity_id","right_entity_id","relation_type","release_id")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_id" bigint,
	"release_id" bigint NOT NULL,
	"entity_type" varchar(50),
	"operation" varchar(20) NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"request_id" varchar(255),
	"ip_address" "inet",
	"user_agent" text
);
--> statement-breakpoint
ALTER TABLE "brand_jurisdictions" ADD CONSTRAINT "brand_jurisdictions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_jurisdictions" ADD CONSTRAINT "brand_jurisdictions_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_locales" ADD CONSTRAINT "brand_locales_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_locales" ADD CONSTRAINT "brand_locales_locale_id_locales_id_fk" FOREIGN KEY ("locale_id") REFERENCES "public"."locales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_parent_role_id_roles_id_fk" FOREIGN KEY ("parent_role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tokens" ADD CONSTRAINT "service_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_audit_logs" ADD CONSTRAINT "user_audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_audit_logs" ADD CONSTRAINT "user_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_deployed_by_users_id_fk" FOREIGN KEY ("deployed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_jurisdiction_id_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_locale_id_locales_id_fk" FOREIGN KEY ("locale_id") REFERENCES "public"."locales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_parent_entity_id_entities_id_fk" FOREIGN KEY ("parent_entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_versions" ADD CONSTRAINT "relation_versions_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_versions" ADD CONSTRAINT "relation_versions_left_entity_id_entities_id_fk" FOREIGN KEY ("left_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_versions" ADD CONSTRAINT "relation_versions_right_entity_id_entities_id_fk" FOREIGN KEY ("right_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_versions" ADD CONSTRAINT "relation_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "releases_status_idx" ON "releases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "releases_deploy_seq_idx" ON "releases" USING btree ("deploy_seq");--> statement-breakpoint
CREATE INDEX "releases_id_deploy_seq_idx" ON "releases" USING btree ("id","deploy_seq");--> statement-breakpoint
CREATE INDEX "entities_entity_type_idx" ON "entities" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "entity_versions_entity_type_idx" ON "entity_versions" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "entity_versions_brand_idx" ON "entity_versions" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "entity_versions_release_idx" ON "entity_versions" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "entity_versions_entity_release_optimized_idx" ON "entity_versions" USING btree ("entity_id","release_id");--> statement-breakpoint
CREATE INDEX "entity_versions_entity_key_idx" ON "entity_versions" USING btree ("entity_key","release_id");--> statement-breakpoint
CREATE INDEX "entity_versions_parent_entity_idx" ON "entity_versions" USING btree ("parent_entity_id","release_id");--> statement-breakpoint
CREATE INDEX "relation_versions_release_idx" ON "relation_versions" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "relation_versions_left_entity_idx" ON "relation_versions" USING btree ("left_entity_id");--> statement-breakpoint
CREATE INDEX "relation_versions_right_entity_idx" ON "relation_versions" USING btree ("right_entity_id");--> statement-breakpoint
CREATE INDEX "relation_versions_relation_type_idx" ON "relation_versions" USING btree ("relation_type");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_id","changed_at");--> statement-breakpoint
CREATE INDEX "audit_events_release_idx" ON "audit_events" USING btree ("release_id","changed_at");--> statement-breakpoint
CREATE INDEX "audit_events_user_idx" ON "audit_events" USING btree ("changed_by","changed_at");--> statement-breakpoint
CREATE VIEW "public"."v_active_entities" AS (select "entity_versions"."id", "entity_versions"."entity_id", "entity_versions"."entity_type", "entity_versions"."entity_key", "entity_versions"."value", "entity_versions"."status", "entity_versions"."created_at" from "entity_versions" inner join "releases" on "entity_versions"."release_id" = "releases"."id" where "releases"."status" = 'OPEN');--> statement-breakpoint
CREATE VIEW "public"."v_entities" AS (select "entity_versions"."id", "entity_versions"."entity_id", "entity_versions"."release_id", "entity_versions"."entity_type", "entity_versions"."entity_key", "entity_versions"."brand_id", "entity_versions"."jurisdiction_id", "entity_versions"."locale_id", "entity_versions"."parent_entity_id", "entity_versions"."value", "entity_versions"."status", "entity_versions"."published_at", "entity_versions"."is_deleted", "entity_versions"."payload", "entity_versions"."change_type", "entity_versions"."change_set_id", "entity_versions"."change_reason", "entity_versions"."created_by", "entity_versions"."created_at", CASE WHEN "releases"."status" = 'OPEN' THEN true ELSE false END as "is_from_active_release" from "entity_versions" left join "releases" on "entity_versions"."release_id" = "releases"."id");