-- Migration: Migrate from SurveyJS to Template-based Forms
-- Changes:
-- 1. Update forms table: replace json with template and add ast, htmlPreview
-- 2. Update submissions table: add templateVersion, startedAt, completedAt

-- Update forms table
ALTER TABLE forms
  DROP COLUMN IF EXISTS json,
  ADD COLUMN template TEXT NOT NULL DEFAULT '',
  ADD COLUMN ast JSONB,
  ADD COLUMN html_preview TEXT;

-- Update submissions table to support new template system
-- Add templateVersion to track which form version was used
ALTER TABLE submissions
  ADD COLUMN template_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN started_at TIMESTAMP NOT NULL DEFAULT now(),
  ADD COLUMN completed_at TIMESTAMP;

-- Update the submissions table to store flat JSON instead of SurveyJS result
-- The data column remains but will now contain flat key-value pairs
-- Example: {"fullName": "John", "email": "john@example.com", "phone": "+64..."}

-- Create an index on templateVersion for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_template_version
  ON submissions(template_version);

-- Create an index on startedAt for filtering recent submissions
CREATE INDEX IF NOT EXISTS idx_submissions_started_at
  ON submissions(started_at DESC);

-- Create an index on completedAt for filtering completed submissions
CREATE INDEX IF NOT EXISTS idx_submissions_completed_at
  ON submissions(completed_at DESC);
