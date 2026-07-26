// Job roles list + role detail (mandatory skills + people readiness).
const express = require('express');
const { query } = require('../db');
const { visibleIdsSql } = require('../lib/visibility');

const router = express.Router();

// GET /api/roles
//
// The role catalog itself is company-wide (it describes the org, not people),
// but the headcount per role is scoped — otherwise it reports how many people
// hold a role that the caller cannot see a single one of.
router.get('/', async (req, res, next) => {
  try {
    const params = [];
    const scope = visibleIdsSql(req.user, params);
    const { rows } = await query(
      `SELECT jr.id, jr.code, jr.role_name, jr.role_family, jr.function_area,
              jr.role_level, jr.criticality, jr.is_future_role,
              COUNT(DISTINCT b.skill_id) AS required_skills,
              COUNT(DISTINCT e.id) AS employees
       FROM job_roles jr
       LEFT JOIN job_role_skill_benchmarks b ON b.job_role_id = jr.id
       LEFT JOIN employees e ON e.job_role_id = jr.id AND e.id IN (${scope})
       GROUP BY jr.id
       ORDER BY jr.role_name`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/roles/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const roleP = query('SELECT * FROM job_roles WHERE id = $1', [id]);

    const skillsP = query(
      `SELECT s.id AS skill_id, s.name AS skill_name, s.criticality,
              b.required_level, b.priority, b.mandatory, b.target_year
       FROM job_role_skill_benchmarks b JOIN skills s ON s.id = b.skill_id
       WHERE b.job_role_id = $1
       ORDER BY b.required_level DESC, s.name`,
      [id]
    );

    // People readiness bucketed from v_role_readiness — scoped to the caller's
    // subtree, so the counts describe their own organization rather than the
    // whole company.
    const readinessParams = [id];
    const readinessP = query(
      `SELECT
         COUNT(*) FILTER (WHERE readiness_percent >= 100) AS ready_now,
         COUNT(*) FILTER (WHERE readiness_percent >= 75 AND readiness_percent < 100) AS ready_3m,
         COUNT(*) FILTER (WHERE readiness_percent >= 50 AND readiness_percent < 75) AS ready_6m,
         COUNT(*) FILTER (WHERE readiness_percent < 50) AS not_ready,
         COUNT(*) AS total,
         ROUND(AVG(readiness_percent), 1) AS avg_readiness
       FROM v_role_readiness
       WHERE job_role_id = $1
         AND employee_id IN (${visibleIdsSql(req.user, readinessParams)})`,
      readinessParams
    );

    // This one names people, so it must be scoped: it used to list every
    // employee holding the role, regardless of who was asking.
    const peopleParams = [id];
    const peopleP = query(
      `SELECT employee_id, employee_name, required_skills, skills_meeting_target, readiness_percent
       FROM v_role_readiness
       WHERE job_role_id = $1
         AND employee_id IN (${visibleIdsSql(req.user, peopleParams)})
       ORDER BY readiness_percent DESC NULLS LAST`,
      peopleParams
    );

    const trainingP = query(
      `SELECT id, title, course_type, delivery_mode, difficulty
       FROM training_courses WHERE linked_job_role_id = $1 ORDER BY title`,
      [id]
    );

    const [role, skills, readiness, people, training] = await Promise.all([
      roleP,
      skillsP,
      readinessP,
      peopleP,
      trainingP,
    ]);

    if (role.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({
      role: role.rows[0],
      mandatorySkills: skills.rows,
      peopleReadiness: readiness.rows[0] || {},
      people: people.rows,
      trainingPath: training.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
