-- Backfill migration: memberships, revisions, subscriptions + tenant indexes/constraints.
-- Applies on databases created from 0000 (documents+sources only).
CREATE TABLE IF NOT EXISTS "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"role" text DEFAULT 'contributor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_tenant_unique" UNIQUE("user_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"diff" jsonb NOT NULL,
	"facts_snapshot" jsonb,
	"bundle_snapshot" jsonb,
	"author_id" text NOT NULL,
	"reason" text DEFAULT 'Initial draft' NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revisions_doc_number_unique" UNIQUE("document_id","revision_number")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "revisions" ADD CONSTRAINT "revisions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"payer_type" text DEFAULT 'organization' NOT NULL,
	"plan_slug" text NOT NULL,
	"status" text NOT NULL,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_tenant_id_idx" ON "documents" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sources_document_id_idx" ON "sources" USING btree ("document_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_tenant_id_idx" ON "memberships" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "revisions_document_id_idx" ON "revisions" USING btree ("document_id");
