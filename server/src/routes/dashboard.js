// Executive dashboard data.
const express = require('express');
const { query } = require('../db');

const router = express.Router();

// GET /api/dashboard/executive
router.get('/executive', async (req, res, next) => {
  try {
    const kpisP = query('SELECT * FROM v_executive_dashboard');

    // Skill coverage by department: average effective level vs a 5-point scale.
    const coverageP = query(
      `SELECT d.name AS department,
              ROUND(100.0 * AVG(COALESCE(m.effective_level,0)) / 5.0, 0) AS coverage_percent
       FROM departments d
       JOIN employees e ON e.department_id = d.id AND e.employment_status = 'Active'
       LEFT JOIN v_employee_skill_matrix m ON m.employee_id = e.id
       GROUP BY d.name
       ORDER BY coverage_percent DESC NULLS LAST`
    );

    // Capability gap heatmap: skill category (row) x department (col).
    // Value = average gap between required benchmark and effective level.
    const heatmapP = query(
      `SELECT sc.name AS skill_area,
              d.code AS department_code,
              d.name AS department_name,
              ROUND(AVG(GREATEST(COALESCE(b.required_level,0) - COALESCE(m.effective_level,0), 0)), 2) AS avg_gap,
              ROUND(AVG(COALESCE(m.effective_level,0)), 2) AS avg_level
       FROM skill_categories sc
       JOIN skills s ON s.category_id = sc.id
       JOIN departments d ON TRUE
       LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status = 'Active'
       LEFT JOIN v_employee_skill_matrix m ON m.employee_id = e.id AND m.skill_id = s.id
       LEFT JOIN job_role_skill_benchmarks b ON b.skill_id = s.id AND b.job_role_id = e.job_role_id
       GROUP BY sc.name, d.code, d.name
       ORDER BY sc.name, d.code`
    );

    const [kpis, coverage, heatmap] = await Promise.all([kpisP, coverageP, heatmapP]);

    res.json({
      kpis: kpis.rows[0] || {},
      skillCoverageByDepartment: coverage.rows,
      capabilityGapHeatmap: heatmap.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
