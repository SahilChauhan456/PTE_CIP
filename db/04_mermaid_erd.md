# PTE CIP High-Level ERD

```mermaid
erDiagram
  organizations ||--o{ business_units : has
  organizations ||--o{ locations : has
  business_units ||--o{ departments : has
  departments ||--o{ teams : has
  departments ||--o{ employees : employs
  teams ||--o{ employees : includes
  job_roles ||--o{ employees : assigned_to
  employees ||--o{ employees : manages

  job_roles ||--o{ job_role_skill_benchmarks : requires
  skills ||--o{ job_role_skill_benchmarks : benchmarked
  skill_categories ||--o{ skills : categorizes
  skills ||--o{ skill_level_definitions : defines
  skills ||--o{ employee_skill_assignments : assigned
  employees ||--o{ employee_skill_assignments : owns

  assessment_campaigns ||--o{ assessment_assignments : assigns
  assessment_campaigns ||--o{ skill_assessments : contains
  employees ||--o{ skill_assessments : assessed_employee
  employees ||--o{ skill_assessments : assessor
  skills ||--o{ skill_assessments : rated_skill
  skill_assessments ||--o{ skill_evidence : supported_by

  employees ||--|| mentor_profiles : mentor_account
  employees ||--|| sme_profiles : sme_account
  employees ||--|| training_coordinator_profiles : coordinator_account
  mentor_profiles ||--o{ mentor_skill_map : covers
  skills ||--o{ mentor_skill_map : mentored_skill
  employees ||--o{ mentor_assignments : mentor
  employees ||--o{ mentor_assignments : mentee
  mentor_assignments ||--o{ mentoring_sessions : has

  training_courses ||--o{ course_modules : contains
  training_courses ||--o{ course_skill_map : maps_to
  skills ||--o{ course_skill_map : developed_by
  training_courses ||--o{ training_sessions : scheduled_as
  training_courses ||--o{ training_enrollments : enrolled
  employees ||--o{ training_enrollments : learner
  training_enrollments ||--o{ training_feedback : receives
  employees ||--o{ learning_plan_items : has_plan
  training_courses ||--o{ learning_plan_items : planned_course

  course_development_requests ||--o{ course_development_stages : has_stages
  skills ||--o{ course_development_requests : gap_skill
  employees ||--o{ course_development_requests : sme
  employees ||--o{ course_development_requests : coordinator

  certifications ||--o{ certification_skill_map : validates
  skills ||--o{ certification_skill_map : skill
  employees ||--o{ employee_certifications : earns
  certifications ||--o{ employee_certifications : certificate

  surveys ||--o{ survey_questions : has
  surveys ||--o{ survey_assignments : assigned_to
  survey_assignments ||--o{ survey_answers : contains
  employees ||--o{ inbox_items : receives
  employees ||--o{ approvals : approves
```
