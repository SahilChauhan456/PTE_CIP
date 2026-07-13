// Certification tracker.
const express = require('express');
const { query } = require('../db');

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
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await query(
      `SELECT ec.id, e.full_name AS employee, c.title AS certification,
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
