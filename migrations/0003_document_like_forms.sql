-- Migration: Document-like Form Instances
-- This migration removes the unique constraint and adds tracking for void/lock/complete states

-- Drop the unique constraint to allow multiple form instances per form/campaign
ALTER TABLE "form_instances" DROP CONSTRAINT "form_instances_form_id_campaign_id_unique";

-- Add new columns for tracking form instance states
ALTER TABLE "form_instances" ADD COLUMN "voided_at" timestamp;
ALTER TABLE "form_instances" ADD COLUMN "voided_by" text;
ALTER TABLE "form_instances" ADD COLUMN "voided_reason" text;
ALTER TABLE "form_instances" ADD COLUMN "locked_at" timestamp;
ALTER TABLE "form_instances" ADD COLUMN "completed_at" timestamp;
ALTER TABLE "form_instances" ADD COLUMN "unlocked_at" timestamp;
ALTER TABLE "form_instances" ADD COLUMN "unlocked_by" text;

-- Update status column to include new states
-- Note: We'll handle the enum update in the application layer
-- The status field will support: draft, ready_to_sign, locked, completed, voided

-- Add indexes for performance on new timestamp columns
CREATE INDEX "idx_form_instances_voided_at" ON "form_instances" ("voided_at");
CREATE INDEX "idx_form_instances_locked_at" ON "form_instances" ("locked_at");
CREATE INDEX "idx_form_instances_completed_at" ON "form_instances" ("completed_at");
CREATE INDEX "idx_form_instances_unlocked_at" ON "form_instances" ("unlocked_at");
CREATE INDEX "idx_form_instances_status_voided" ON "form_instances" ("status", "voided_at") WHERE "voided_at" IS NOT NULL;
