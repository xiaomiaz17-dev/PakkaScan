-- Session 8: PDF hash verification + feedback
ALTER TABLE scan_usage
  ADD COLUMN IF NOT EXISTS pdf_hash text,
  ADD COLUMN IF NOT EXISTS pdf_generated_at timestamptz;

CREATE TABLE IF NOT EXISTS scan_feedback (
  id            bigserial PRIMARY KEY,
  reference_code text,
  helpful       boolean NOT NULL,
  comment       text,
  page          text DEFAULT 'scan_results',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_feedback_ref ON scan_feedback (reference_code);
CREATE INDEX IF NOT EXISTS idx_scan_usage_pdf_hash ON scan_usage (pdf_hash) WHERE pdf_hash IS NOT NULL;
