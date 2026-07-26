// Certification tracker.
const express = require('express');
const { query } = require('../db');
const { visibleIdsSql } = require('../lib/visibility');

const router = express.Router();

// GET /api/certifications?status=&search=
router.get('/', async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const params = [];
    const where = [];

    if (status) {
      params.push(status);
      where.push(`ec.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(e.full_name ILIKE $${params.length} OR c.title ILIKE $${params.length})`);
    }
    // This tracker names the person holding each certification, so it is a
    // per-employee list and follows the subtree rule.
    where.push(`ec.employee_id IN (${visibleIdsSql(req.user, params)})`);
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const { rows } = await query(
      `SELECT ec.id, e.full_name AS employee, e.org_title, c.title AS certification,
              c.certification_type, ec.status, ec.issued_date, ec.expiry_date,
              appr.full_name AS approved_by
       FROM employee_certifications ec
       JOIN employees e ON e.id = ec.employee_id
       JOIN certifications c ON c.id = ec.certification_id
       LEFT JOIN employees appr ON appr.id = ec.approved_by
       ${whereSql}
       ORDER BY ec.issued_date DESC NULLS LAST, e.full_name`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
