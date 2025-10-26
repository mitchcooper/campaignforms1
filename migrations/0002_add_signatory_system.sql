-- Migration: Add Signatory Management System
-- This migration adds support for multi-signatory forms with shared form instances

-- Create form_instances table for shared form state
CREATE TABLE "form_instances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"data" json NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"signing_mode" text DEFAULT 'all' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "form_instances_form_id_campaign_id_unique" UNIQUE("form_id","campaign_id")
);
--> statement-breakpoint

-- Create signatories table to track who needs to sign
CREATE TABLE "signatories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_instance_id" varchar NOT NULL,
	"access_link_id" varchar NOT NULL,
	"signatory_name" text NOT NULL,
	"signatory_email" text,
	"signed_at" timestamp,
	"signature_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add new columns to access_links table
ALTER TABLE "access_links" ADD COLUMN "form_instance_id" varchar;
ALTER TABLE "access_links" ADD COLUMN "signatory_role" text;
--> statement-breakpoint

-- Add form_instance_id to submissions table
ALTER TABLE "submissions" ADD COLUMN "form_instance_id" varchar;
--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "signatories" ADD CONSTRAINT "signatories_form_instance_id_form_instances_id_fk" FOREIGN KEY ("form_instance_id") REFERENCES "form_instances"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "signatories" ADD CONSTRAINT "signatories_access_link_id_access_links_id_fk" FOREIGN KEY ("access_link_id") REFERENCES "access_links"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "access_links" ADD CONSTRAINT "access_links_form_instance_id_form_instances_id_fk" FOREIGN KEY ("form_instance_id") REFERENCES "form_instances"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "submissions" ADD CONSTRAINT "submissions_form_instance_id_form_instances_id_fk" FOREIGN KEY ("form_instance_id") REFERENCES "form_instances"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create indexes for performance
CREATE INDEX "idx_form_instances_campaign_id" ON "form_instances" ("campaign_id");
CREATE INDEX "idx_form_instances_status" ON "form_instances" ("status");
CREATE INDEX "idx_signatories_form_instance_id" ON "signatories" ("form_instance_id");
CREATE INDEX "idx_signatories_signed_at" ON "signatories" ("signed_at");
CREATE INDEX "idx_access_links_form_instance_id" ON "access_links" ("form_instance_id");
CREATE INDEX "idx_submissions_form_instance_id" ON "submissions" ("form_instance_id");


