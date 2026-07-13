-- =============================================================
-- PTE CIP PROXY DATABASE STRUCTURE
-- Powertrain Engineering Capability Intelligence Platform
-- Target DB: PostgreSQL / Supabase
-- Purpose: fully functional SaaS demo database with proxy data
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------
-- Generic helpers
-- -----------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------
-- Organization structure
-- -----------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  head_employee_id UUID,
  UNIQUE (business_unit_id, code)
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  UNIQUE (department_id, code)
);

-- -----------------------------
-- Roles, career tracks and employees
-- -----------------------------
CREATE TABLE IF NOT EXISTS job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  role_name TEXT NOT NULL,
  role_family TEXT NOT NULL,
  function_area TEXT NOT NULL,
  role_level TEXT NOT NULL,
  criticality TEXT NOT NULL DEFAULT 'Medium' CHECK (criticality IN ('Low','Medium','High','Critical')),
  is_future_role BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_job_roles_updated_at BEFORE UPDATE ON job_roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  gender TEXT CHECK (gender IN ('Male','Female','Other','Not Specified')) DEFAULT 'Not Specified',
  department_id UUID REFERENCES departments(id),
  team_id UUID REFERENCES teams(id),
  job_role_id UUID REFERENCES job_roles(id),
  manager_id UUID REFERENCES employees(id),
  location_id UUID REFERENCES locations(id),
  grade TEXT,
  employment_status TEXT NOT NULL DEFAULT 'Active' CHECK (employment_status IN ('Active','Inactive','On Leave','Separated')),
  joining_date DATE,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE departments
  ADD CONSTRAINT fk_departments_head_employee
  FOREIGN KEY (head_employee_id) REFERENCES employees(id);

CREATE TABLE IF NOT EXISTS career_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS career_track_roles (
  career_track_id UUID NOT NULL REFERENCES career_tracks(id) ON DELETE CASCADE,
  job_role_id UUID NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
  sequence_order INT NOT NULL,
  PRIMARY KEY (career_track_id, job_role_id)
);

CREATE TABLE IF NOT EXISTS app_permission_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT UNIQUE NOT NULL,
  role_name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  auth_provider TEXT DEFAULT 'SSO',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_permission_role_map (
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  permission_role_id UUID NOT NULL REFERENCES app_permission_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, permission_role_id)
);

-- -----------------------------
-- Skills library and taxonomy
-- -----------------------------
CREATE TABLE IF NOT EXISTS skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES skill_categories(id),
  description TEXT,
  criticality TEXT NOT NULL DEFAULT 'Medium' CHECK (criticality IN ('Low','Medium','High','Critical')),
  future_relevance TEXT NOT NULL DEFAULT 'Medium' CHECK (future_relevance IN ('Low','Medium','High','Very High')),
  owner_sme_id UUID REFERENCES employees(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category_id);
CREATE TRIGGER trg_skills_updated_at BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS skill_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_name TEXT UNIQUE NOT NULL,
  label_color TEXT
);

CREATE TABLE IF NOT EXISTS skill_label_map (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES skill_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, label_id)
);

CREATE TABLE IF NOT EXISTS skill_level_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  level_no INT NOT NULL CHECK (level_no BETWEEN 1 AND 5),
  level_title TEXT NOT NULL,
  level_definition TEXT NOT NULL,
  UNIQUE(skill_id, level_no)
);

CREATE TABLE IF NOT EXISTS job_role_skill_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id UUID NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required_level INT NOT NULL CHECK (required_level BETWEEN 1 AND 5),
  mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  priority TEXT NOT NULL DEFAULT 'Core' CHECK (priority IN ('Foundation','Core','Advanced','Strategic')),
  target_year INT DEFAULT 2026,
  UNIQUE(job_role_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_role_skill_job_role ON job_role_skill_benchmarks(job_role_id);
CREATE INDEX IF NOT EXISTS idx_role_skill_skill ON job_role_skill_benchmarks(skill_id);

CREATE TABLE IF NOT EXISTS employee_skill_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  assigned_by_employee_id UUID REFERENCES employees(id),
  target_level INT CHECK (target_level BETWEEN 1 AND 5),
  focus_flag BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, skill_id)
);

-- -----------------------------
-- Assessment framework
-- -----------------------------
CREATE TABLE IF NOT EXISTS assessment_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Active','Completed','Archived')),
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('Self','Manager','Mentor','SME','Certification')),
  description TEXT,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  question_order INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('Rating','Text','File','YesNo','MultipleChoice')),
  required BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS assessment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES assessment_campaigns(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES employees(id),
  mentor_id UUID REFERENCES employees(id),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Self Submitted','Manager Reviewed','Mentor Reviewed','Completed')),
  self_submitted_at TIMESTAMPTZ,
  manager_reviewed_at TIMESTAMPTZ,
  mentor_reviewed_at TIMESTAMPTZ,
  UNIQUE(campaign_id, employee_id)
);

CREATE TABLE IF NOT EXISTS skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES assessment_campaigns(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  assessor_employee_id UUID REFERENCES employees(id),
  assessor_type TEXT NOT NULL CHECK (assessor_type IN ('Self','Manager','Mentor','SME','System')),
  assessed_level INT NOT NULL CHECK (assessed_level BETWEEN 1 AND 5),
  confidence_level INT CHECK (confidence_level BETWEEN 1 AND 5),
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Draft','Submitted','Approved','Rejected','Superseded')),
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_emp_skill ON skill_assessments(employee_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_campaign ON skill_assessments(campaign_id);

CREATE TABLE IF NOT EXISTS skill_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES skill_assessments(id) ON DELETE SET NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('Project Report','Test Data','Simulation File','Training Assignment','Presentation','Manager Note','Mentor Note','Certificate','Other')),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_by UUID REFERENCES employees(id),
  validation_status TEXT DEFAULT 'Pending' CHECK (validation_status IN ('Pending','Validated','Rejected'))
);

-- -----------------------------
-- Talent flags and signals
-- -----------------------------
CREATE TABLE IF NOT EXISTS talent_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT UNIQUE NOT NULL,
  flag_name TEXT NOT NULL,
  description TEXT,
  color TEXT
);

CREATE TABLE IF NOT EXISTS employee_talent_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  flag_id UUID NOT NULL REFERENCES talent_flags(id),
  skill_id UUID REFERENCES skills(id),
  job_role_id UUID REFERENCES job_roles(id),
  assigned_by UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, flag_id, skill_id, job_role_id)
);

-- -----------------------------
-- Mentors, SMEs and technical support
-- -----------------------------
CREATE TABLE IF NOT EXISTS mentor_profiles (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  mentor_status TEXT NOT NULL DEFAULT 'Active' CHECK (mentor_status IN ('Active','Inactive','On Hold')),
  max_mentees INT DEFAULT 20,
  office_hours TEXT,
  bio TEXT
);

CREATE TABLE IF NOT EXISTS mentor_skill_map (
  mentor_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  mentor_level INT NOT NULL CHECK (mentor_level BETWEEN 3 AND 5),
  can_certify BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (mentor_id, skill_id)
);

CREATE TABLE IF NOT EXISTS sme_profiles (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  expertise_summary TEXT,
  content_development_capacity TEXT,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sme_skill_map (
  sme_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  sme_level INT NOT NULL CHECK (sme_level BETWEEN 4 AND 5),
  owns_curriculum BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (sme_id, skill_id)
);

CREATE TABLE IF NOT EXISTS training_coordinator_profiles (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  scope TEXT,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS mentor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Completed','Paused','Cancelled')),
  assignment_reason TEXT,
  UNIQUE(mentor_id, mentee_id, skill_id, status)
);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentor ON mentor_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentee ON mentor_assignments(mentee_id);

CREATE TABLE IF NOT EXISTS mentoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_assignment_id UUID NOT NULL REFERENCES mentor_assignments(id) ON DELETE CASCADE,
  session_date TIMESTAMPTZ NOT NULL,
  mode TEXT CHECK (mode IN ('Office Hour','One-to-One','Workshop','Online','Project Review')),
  topic TEXT NOT NULL,
  notes TEXT,
  action_items TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS technical_support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES employees(id),
  skill_id UUID REFERENCES skills(id),
  request_title TEXT NOT NULL,
  request_detail TEXT,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Critical')),
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open','Assigned','In Progress','Resolved','Closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- -----------------------------
-- Training and learning plan
-- -----------------------------
CREATE TABLE IF NOT EXISTS training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  course_type TEXT NOT NULL CHECK (course_type IN ('Course','Workshop','Seminar','Certification','Learning Path','Webinar')),
  delivery_mode TEXT NOT NULL CHECK (delivery_mode IN ('ILT','Self Paced','Mixed','Online')),
  duration_hours NUMERIC(6,2),
  difficulty TEXT CHECK (difficulty IN ('Foundation','Intermediate','Advanced','Expert')),
  owner_sme_id UUID REFERENCES employees(id),
  coordinator_id UUID REFERENCES employees(id),
  linked_job_role_id UUID REFERENCES job_roles(id),
  status TEXT DEFAULT 'Published' CHECK (status IN ('Draft','Review','Published','Retired')),
  post_training_mentoring_days INT DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_training_courses_updated_at BEFORE UPDATE ON training_courses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  module_order INT NOT NULL,
  module_title TEXT NOT NULL,
  module_description TEXT,
  duration_minutes INT,
  UNIQUE(course_id, module_order)
);

CREATE TABLE IF NOT EXISTS course_skill_map (
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  target_level_after_completion INT CHECK (target_level_after_completion BETWEEN 1 AND 5),
  PRIMARY KEY(course_id, skill_id)
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  session_title TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  location_text TEXT,
  trainer_id UUID REFERENCES employees(id),
  capacity INT,
  status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled','Completed','Cancelled','Draft'))
);

CREATE TABLE IF NOT EXISTS training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  nominated_by UUID REFERENCES employees(id),
  status TEXT NOT NULL DEFAULT 'Nominated' CHECK (status IN ('Nominated','Approved','In Progress','Completed','Rejected','Cancelled','Expired')),
  progress_percent INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  score NUMERIC(5,2),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(course_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_employee ON training_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_course ON training_enrollments(course_id);

CREATE TABLE IF NOT EXISTS training_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
  content_relevance INT CHECK (content_relevance BETWEEN 1 AND 5),
  trainer_effectiveness INT CHECK (trainer_effectiveness BETWEEN 1 AND 5),
  practical_usefulness INT CHECK (practical_usefulness BETWEEN 1 AND 5),
  confidence_before INT CHECK (confidence_before BETWEEN 1 AND 5),
  confidence_after INT CHECK (confidence_after BETWEEN 1 AND 5),
  needs_mentor_support BOOLEAN DEFAULT FALSE,
  comments TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  course_id UUID REFERENCES training_courses(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES employees(id),
  status TEXT DEFAULT 'To Do' CHECK (status IN ('To Do','In Progress','Completed','Archived')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Critical')),
  progress_percent INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- -----------------------------
-- SME-driven course development workflow
-- -----------------------------
CREATE TABLE IF NOT EXISTS course_development_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code TEXT UNIQUE NOT NULL,
  capability_gap_title TEXT NOT NULL,
  skill_id UUID REFERENCES skills(id),
  source TEXT CHECK (source IN ('Future Skills Dashboard','Assessment Gap','Manager Request','Leadership Priority','Audit Finding','Project Need')),
  business_need TEXT,
  status TEXT DEFAULT 'Need Identified' CHECK (status IN ('Need Identified','SME Assigned','Coordinator Assigned','Material Draft','SME Review','Pilot','Published','Effectiveness Review','Closed')),
  sme_id UUID REFERENCES employees(id),
  coordinator_id UUID REFERENCES employees(id),
  volunteer_id UUID REFERENCES employees(id),
  target_launch_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_development_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES course_development_requests(id) ON DELETE CASCADE,
  stage_order INT NOT NULL,
  stage_name TEXT NOT NULL,
  owner_id UUID REFERENCES employees(id),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Completed','Delayed','Blocked')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  UNIQUE(request_id, stage_order)
);

CREATE TABLE IF NOT EXISTS mentor_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id),
  recommended_level INT CHECK (recommended_level BETWEEN 1 AND 5),
  recommended_role_id UUID REFERENCES job_roles(id),
  recommended_course_id UUID REFERENCES training_courses(id),
  readiness TEXT CHECK (readiness IN ('Ready Now','Ready in 3 Months','Ready in 6 Months','Needs Foundation','Not Ready')),
  recommendation_text TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'Submitted' CHECK (status IN ('Draft','Submitted','Accepted','Rejected'))
);

-- -----------------------------
-- Certification management
-- -----------------------------
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  certification_type TEXT DEFAULT 'Internal' CHECK (certification_type IN ('Internal','External','Mandatory','Role Based')),
  validity_months INT,
  approver_role TEXT,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS certification_skill_map (
  certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required_level INT CHECK (required_level BETWEEN 1 AND 5),
  PRIMARY KEY(certification_id, skill_id)
);

CREATE TABLE IF NOT EXISTS employee_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Requested' CHECK (status IN ('Requested','Approved','Denied','Expired','Renewal Due')),
  requested_date DATE,
  approved_date DATE,
  issued_date DATE,
  expiry_date DATE,
  approved_by UUID REFERENCES employees(id),
  evidence_file_url TEXT,
  comments TEXT,
  UNIQUE(employee_id, certification_id, issued_date)
);

-- -----------------------------
-- Surveys and feedback
-- -----------------------------
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  survey_type TEXT CHECK (survey_type IN ('Training Feedback','Mentor Feedback','Capability Pulse','Course Need','Workshop Effectiveness')),
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Active','Closed','Archived')),
  created_by UUID REFERENCES employees(id),
  start_date DATE,
  due_date DATE
);

CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  question_order INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('Rating','Text','YesNo','MultipleChoice')),
  required BOOLEAN DEFAULT TRUE,
  UNIQUE(survey_id, question_order)
);

CREATE TABLE IF NOT EXISTS survey_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Submitted','Expired')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  UNIQUE(survey_id, employee_id)
);

CREATE TABLE IF NOT EXISTS survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_assignment_id UUID NOT NULL REFERENCES survey_assignments(id) ON DELETE CASCADE,
  survey_question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_rating INT CHECK (answer_rating BETWEEN 1 AND 5),
  UNIQUE(survey_assignment_id, survey_question_id)
);

-- -----------------------------
-- Inbox, approvals, admin
-- -----------------------------
CREATE TABLE IF NOT EXISTS inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  item_type TEXT CHECK (item_type IN ('Approval','Assessment','Training','Certification','Mentor Request','Survey','System Notice')),
  title TEXT NOT NULL,
  body TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  status TEXT DEFAULT 'Unread' CHECK (status IN ('Unread','Read','Actioned','Archived')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Critical')),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_type TEXT CHECK (approval_type IN ('Training Nomination','Certification','Skill Level','Course Publish','Mentor Recommendation')),
  requested_by UUID REFERENCES employees(id),
  approver_id UUID REFERENCES employees(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
  decision_comments TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_type TEXT CHECK (batch_type IN ('Employee Master','Skill Library','Role Framework','Training History','Assessment Data','Certification Records')),
  file_name TEXT,
  imported_by UUID REFERENCES employees(id),
  total_records INT DEFAULT 0,
  success_records INT DEFAULT 0,
  failed_records INT DEFAULT 0,
  status TEXT DEFAULT 'Uploaded' CHECK (status IN ('Uploaded','Validated','Imported','Failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_employee_id UUID REFERENCES employees(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES employees(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------
-- Analytics views for SaaS screens
-- -----------------------------
CREATE OR REPLACE VIEW v_latest_skill_levels AS
SELECT DISTINCT ON (employee_id, skill_id, assessor_type)
  employee_id,
  skill_id,
  assessor_type,
  assessed_level,
  assessed_at,
  assessor_employee_id
FROM skill_assessments
WHERE status IN ('Submitted','Approved')
ORDER BY employee_id, skill_id, assessor_type, assessed_at DESC;

CREATE OR REPLACE VIEW v_employee_skill_matrix AS
SELECT
  e.id AS employee_id,
  e.full_name AS employee_name,
  s.id AS skill_id,
  s.name AS skill_name,
  MAX(CASE WHEN l.assessor_type = 'Self' THEN l.assessed_level END) AS self_level,
  MAX(CASE WHEN l.assessor_type = 'Manager' THEN l.assessed_level END) AS manager_level,
  MAX(CASE WHEN l.assessor_type = 'Mentor' THEN l.assessed_level END) AS mentor_level,
  COALESCE(MAX(CASE WHEN l.assessor_type = 'Manager' THEN l.assessed_level END), MAX(CASE WHEN l.assessor_type = 'Self' THEN l.assessed_level END), 0) AS effective_level
FROM employees e
JOIN employee_skill_assignments esa ON esa.employee_id = e.id
JOIN skills s ON s.id = esa.skill_id
LEFT JOIN v_latest_skill_levels l ON l.employee_id = e.id AND l.skill_id = s.id
GROUP BY e.id, e.full_name, s.id, s.name;

CREATE OR REPLACE VIEW v_role_readiness AS
SELECT
  e.id AS employee_id,
  e.full_name AS employee_name,
  jr.id AS job_role_id,
  jr.role_name,
  COUNT(b.skill_id) AS required_skills,
  COUNT(CASE WHEN COALESCE(m.effective_level, 0) >= b.required_level THEN 1 END) AS skills_meeting_target,
  ROUND(100.0 * COUNT(CASE WHEN COALESCE(m.effective_level, 0) >= b.required_level THEN 1 END) / NULLIF(COUNT(b.skill_id),0), 1) AS readiness_percent
FROM employees e
JOIN job_roles jr ON jr.id = e.job_role_id
JOIN job_role_skill_benchmarks b ON b.job_role_id = jr.id
LEFT JOIN v_employee_skill_matrix m ON m.employee_id = e.id AND m.skill_id = b.skill_id
GROUP BY e.id, e.full_name, jr.id, jr.role_name;

CREATE OR REPLACE VIEW v_executive_dashboard AS
SELECT
  (SELECT COUNT(*) FROM employees WHERE employment_status='Active') AS total_employees,
  (SELECT COUNT(*) FROM skills WHERE active=TRUE) AS strategic_skills,
  (SELECT COUNT(*) FROM employee_certifications WHERE status='Approved') AS certified_employees,
  (SELECT COUNT(*) FROM mentor_profiles WHERE mentor_status='Active') AS active_mentors,
  (SELECT COUNT(*) FROM sme_profiles WHERE active=TRUE) AS identified_smes,
  (SELECT COUNT(*) FROM skills WHERE criticality IN ('High','Critical')) AS critical_skill_count,
  (SELECT ROUND(AVG(readiness_percent),1) FROM v_role_readiness) AS average_role_readiness_percent,
  (SELECT ROUND(AVG(progress_percent),1) FROM training_enrollments) AS average_training_progress_percent;

CREATE OR REPLACE VIEW v_mentor_dashboard AS
SELECT
  mp.employee_id AS mentor_id,
  e.full_name AS mentor_name,
  COUNT(DISTINCT ma.mentee_id) FILTER (WHERE ma.status='Active') AS active_mentees,
  COUNT(DISTINCT tsr.id) FILTER (WHERE tsr.status IN ('Open','Assigned','In Progress')) AS open_support_requests,
  COUNT(DISTINCT mr.id) FILTER (WHERE mr.status='Submitted') AS submitted_recommendations
FROM mentor_profiles mp
JOIN employees e ON e.id = mp.employee_id
LEFT JOIN mentor_assignments ma ON ma.mentor_id = mp.employee_id
LEFT JOIN technical_support_requests tsr ON tsr.mentor_id = mp.employee_id
LEFT JOIN mentor_recommendations mr ON mr.mentor_id = mp.employee_id
GROUP BY mp.employee_id, e.full_name;
