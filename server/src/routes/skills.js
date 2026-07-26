// Skills library + skill detail.
//
// The skills catalog is company-wide — it describes capability the organization
// cares about, not people. Any per-employee count or list rolled up alongside it
// is scoped to the caller's subtree.
const express = require('express');
const { query } = require('../db');
const { visibleIdsSql } = require('../lib/visibility');

const router = express.Router();

// GET /api/skills?search=&category=&label=
router.get('/', async (req, res, next) => {
  try {
    const { search, category, label } = req.query;
    const params = [];
    const where = ['s.active = TRUE'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(s.name ILIKE $${params.length} OR s.description ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      where.push(`c.id = $${params.length}`);
    }
    if (label) {
      params.push(label);
      where.push(
        `EXISTS (SELECT 1 FROM skill_label_map slm WHERE slm.skill_id = s.id AND slm.label_id = $${params.length})`
      );
    }

    // Appended last so the placeholder numbers land after the filter params.
    const scope = visibleIdsSql(req.user, params);

    const { rows } = await query(
      `SELECT s.id, s.code, s.name AS skill_name, s.criticality, s.future_relevance,
              c.id AS category_id, c.name AS category,
              COUNT(DISTINCT esa.employee_id) AS assigned_employees,
              COUNT(DISTINCT rb.job_role_id) AS linked_roles,
              COUNT(DISTINCT msm.mentor_id) AS mentors,
              COALESCE(
                JSON_AGG(DISTINCT jsonb_build_object('name', sl.label_name, 'color', sl.label_color))
                  FILTER (WHERE sl.id IS NOT NULL),
                '[]'
              ) AS labels
       FROM skills s
       LEFT JOIN skill_categories c ON c.id = s.category_id
       LEFT JOIN employee_skill_assignments esa
              ON esa.skill_id = s.id AND esa.employee_id IN (${scope})
       LEFT JOIN job_role_skill_benchmarks rb ON rb.skill_id = s.id
       LEFT JOIN mentor_skill_map msm
              ON msm.skill_id = s.id AND msm.mentor_id IN (${scope})
       LEFT JOIN skill_label_map slm ON slm.skill_id = s.id
       LEFT JOIN skill_labels sl ON sl.id = slm.label_id
       WHERE ${where.join(' AND ')}
       GROUP BY s.id, s.code, s.name, s.criticality, s.future_relevance, c.id, c.name
       ORDER BY s.name`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/skills/categories — for filter dropdown.
router.get('/categories', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.code, c.name, c.description,
              COUNT(s.id) AS skill_count
       FROM skill_categories c
       LEFT JOIN skills s ON s.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/skills/categories — create a section (skill category).
router.post('/categories', async (req, res, next) => {
  try {
    const { code, name, description } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    // Derive a short code from the name when one isn't supplied.
    const finalCode =
      (code && code.trim()) ||
      name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 12) ||
      'SECTION';
    const { rows } = await query(
      `INSERT INTO skill_categories (code, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, code, name, description`,
      [finalCode, name.trim(), description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A section with that code or name already exists' });
    }
    next(err);
  }
});

// GET /api/skills/labels — for filter dropdown.
router.get('/labels', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT id, label_name, label_color FROM skill_labels ORDER BY label_name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/skills/:id — full detail.
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const skillP = query(
      `SELECT s.*, c.name AS category_name
       FROM skills s LEFT JOIN skill_categories c ON c.id = s.category_id
       WHERE s.id = $1`,
      [id]
    );
    const levelsP = query(
      `SELECT level_no, level_title, level_definition
       FROM skill_level_definitions WHERE skill_id = $1 ORDER BY level_no`,
      [id]
    );
    // Proficiency distribution across the latest per-employee effective levels,
    // scoped to the caller's subtree.
    const distParams = [id];
    const distributionP = query(
      `SELECT effective_level AS level, COUNT(*) AS count
       FROM v_employee_skill_matrix
       WHERE skill_id = $1 AND effective_level BETWEEN 1 AND 5
         AND employee_id IN (${visibleIdsSql(req.user, distParams)})
       GROUP BY effective_level ORDER BY effective_level`,
      distParams
    );
    // Benchmark: employee avg effective level vs avg required benchmark.
    // The benchmark side is role metadata and stays global; the employee side
    // is scoped.
    const benchParams = [id];
    const benchScope = visibleIdsSql(req.user, benchParams);
    const benchmarkP = query(
      `SELECT
         (SELECT ROUND(AVG(effective_level)::numeric, 1) FROM v_employee_skill_matrix
            WHERE skill_id = $1 AND effective_level > 0
              AND employee_id IN (${benchScope})) AS employee_avg,
         (SELECT ROUND(AVG(required_level)::numeric, 1) FROM job_role_skill_benchmarks
            WHERE skill_id = $1) AS benchmark`,
      benchParams
    );
    // Names people, so it must be scoped.
    const mentorParams = [id];
    const mentorsP = query(
      `SELECT e.id, e.full_name, e.org_title, e.photo_url, msm.mentor_level, msm.can_certify
       FROM mentor_skill_map msm JOIN employees e ON e.id = msm.mentor_id
       WHERE msm.skill_id = $1
         AND e.id IN (${visibleIdsSql(req.user, mentorParams)})
       ORDER BY msm.mentor_level DESC`,
      mentorParams
    );
    const trainingP = query(
      `SELECT tc.id, tc.title, tc.course_type, tc.delivery_mode
       FROM course_skill_map csm JOIN training_courses tc ON tc.id = csm.course_id
       WHERE csm.skill_id = $1 ORDER BY tc.title`,
      [id]
    );
    const rolesP = query(
      `SELECT jr.id, jr.role_name, jr.function_area, b.required_level, b.priority, b.mandatory
       FROM job_role_skill_benchmarks b JOIN job_roles jr ON jr.id = b.job_role_id
       WHERE b.skill_id = $1 ORDER BY b.required_level DESC`,
      [id]
    );
    const certsP = query(
      `SELECT c.id, c.title, c.certification_type, csm.required_level
       FROM certification_skill_map csm JOIN certifications c ON c.id = csm.certification_id
       WHERE csm.skill_id = $1 ORDER BY c.title`,
      [id]
    );
    const labelsP = query(
      `SELECT sl.label_name AS name, sl.label_color AS color
       FROM skill_label_map slm JOIN skill_labels sl ON sl.id = slm.label_id
       WHERE slm.skill_id = $1`,
      [id]
    );

    const [skill, levels, distribution, benchmark, mentors, training, roles, certs, labels] =
      await Promise.all([skillP, levelsP, distributionP, benchmarkP, mentorsP, trainingP, rolesP, certsP, labelsP]);

    if (skill.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({
      skill: skill.rows[0],
      labels: labels.rows,
      levelDefinitions: levels.rows,
      proficiencyDistribution: distribution.rows,
      benchmark: benchmark.rows[0] || {},
      mentors: mentors.rows,
      linkedTraining: training.rows,
      roles: roles.rows,
      certifications: certs.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/skills — admin: create a skill.
router.post('/', async (req, res, next) => {
  try {
    const { code, name, category_id, description, criticality, future_relevance } = req.body || {};
    if (!code || !name) {
      return res.status(400).json({ error: 'code and name are required' });
    }
    const { rows } = await query(
      `INSERT INTO skills (code, name, category_id, description, criticality, future_relevance)
       VALUES ($1,$2,$3,$4,COALESCE($5,'Medium'),COALESCE($6,'Medium'))
       RETURNING id, code, name`,
      [code, name, category_id || null, description || null, criticality, future_relevance]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
