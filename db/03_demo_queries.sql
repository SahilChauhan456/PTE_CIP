-- =============================================================
-- PTE CIP DEMO QUERIES
-- Use these queries to test dashboards and screens.
-- =============================================================

-- 1. Executive dashboard metrics
SELECT * FROM v_executive_dashboard;

-- 2. Skills library table
SELECT s.name AS skill_name, c.name AS category, s.criticality, s.future_relevance,
       COUNT(DISTINCT esa.employee_id) AS assigned_employees,
       COUNT(DISTINCT rb.job_role_id) AS linked_roles,
       COUNT(DISTINCT msm.mentor_id) AS mentors
FROM skills s
LEFT JOIN skill_categories c ON c.id=s.category_id
LEFT JOIN employee_skill_assignments esa ON esa.skill_id=s.id
LEFT JOIN job_role_skill_benchmarks rb ON rb.skill_id=s.id
LEFT JOIN mentor_skill_map msm ON msm.skill_id=s.id
GROUP BY s.id, s.name, c.name, s.criticality, s.future_relevance
ORDER BY s.name;

-- 3. Skill detail: CAN / LIN Communication
SELECT * FROM skills WHERE code='CAN-LIN';

SELECT assessor_type, ROUND(AVG(assessed_level),2) AS avg_level, COUNT(*) AS rating_count
FROM skill_assessments sa
JOIN skills s ON s.id=sa.skill_id
WHERE s.code='CAN-LIN'
GROUP BY assessor_type;

-- 4. Employee skill passport for Jasleen Kaur
SELECT m.skill_name, m.self_level, m.manager_level, m.mentor_level, m.effective_level
FROM v_employee_skill_matrix m
JOIN employees e ON e.id=m.employee_id
WHERE e.email='jasleen.kaur@ptecip.local'
ORDER BY m.skill_name;

-- 5. Mentor dashboard for Gurpreet Singh
SELECT * FROM v_mentor_dashboard WHERE mentor_name='Gurpreet Singh';

-- 6. Mentor mentee list
SELECT mentor.full_name AS mentor, mentee.full_name AS mentee, s.name AS skill, ma.status, ma.start_date
FROM mentor_assignments ma
JOIN employees mentor ON mentor.id=ma.mentor_id
JOIN employees mentee ON mentee.id=ma.mentee_id
LEFT JOIN skills s ON s.id=ma.skill_id
WHERE mentor.full_name='Gurpreet Singh';

-- 7. Training catalog
SELECT tc.title, tc.course_type, tc.delivery_mode, tc.duration_hours, sme.full_name AS owner_sme, coord.full_name AS coordinator, tc.status
FROM training_courses tc
LEFT JOIN employees sme ON sme.id=tc.owner_sme_id
LEFT JOIN employees coord ON coord.id=tc.coordinator_id
ORDER BY tc.title;

-- 8. Learning plan Kanban for Jasleen Kaur
SELECT e.full_name, tc.title, lpi.status, lpi.priority, lpi.progress_percent, lpi.due_date, lpi.notes
FROM learning_plan_items lpi
JOIN employees e ON e.id=lpi.employee_id
LEFT JOIN training_courses tc ON tc.id=lpi.course_id
WHERE e.email='jasleen.kaur@ptecip.local'
ORDER BY CASE lpi.status WHEN 'To Do' THEN 1 WHEN 'In Progress' THEN 2 WHEN 'Completed' THEN 3 ELSE 4 END;

-- 9. Role readiness
SELECT * FROM v_role_readiness ORDER BY readiness_percent DESC;

-- 10. Course development pipeline
SELECT cdr.request_code, cdr.capability_gap_title, s.name AS skill, cdr.status, sme.full_name AS sme, coord.full_name AS coordinator, cdr.target_launch_date
FROM course_development_requests cdr
LEFT JOIN skills s ON s.id=cdr.skill_id
LEFT JOIN employees sme ON sme.id=cdr.sme_id
LEFT JOIN employees coord ON coord.id=cdr.coordinator_id
ORDER BY cdr.created_at DESC;
