-- =============================================================
-- PTE CIP — Profile / CV + Verification workflow (additive migration)
-- Run this in the Supabase SQL Editor after 01_schema.sql / 02_seed.sql.
-- Idempotent: safe to re-run.
-- =============================================================

-- -----------------------------
-- CV core (1:1 with employees)
-- -----------------------------
CREATE TABLE IF NOT EXISTS employee_cv (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  headline TEXT,
  summary TEXT,
  phone TEXT,
  location_text TEXT,
  linkedin_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'Draft'
    CHECK (verification_status IN ('Draft','Pending','Verified','Rejected')),
  verified_by UUID REFERENCES employees(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_employee_cv_updated_at ON employee_cv;
CREATE TRIGGER trg_employee_cv_updated_at BEFORE UPDATE ON employee_cv
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------
-- Work experience
-- -----------------------------
CREATE TABLE IF NOT EXISTS employee_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  organization TEXT,
  start_date DATE,
  end_date DATE,                 -- NULL = current / present
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employee_experience_emp ON employee_experience(employee_id);

-- -----------------------------
-- Education
-- -----------------------------
CREATE TABLE IF NOT EXISTS employee_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  degree TEXT NOT NULL,
  institution TEXT,
  field_of_study TEXT,
  start_year INT,
  end_year INT,
  grade TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employee_education_emp ON employee_education(employee_id);

-- -----------------------------
-- Allow "Profile Verification" as an approval type
-- -----------------------------
ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_approval_type_check;
ALTER TABLE approvals ADD CONSTRAINT approvals_approval_type_check
  CHECK (approval_type IN (
    'Training Nomination','Certification','Skill Level',
    'Course Publish','Mentor Recommendation','Profile Verification'
  ));
