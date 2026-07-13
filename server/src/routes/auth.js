// Demo persona login → JWT.
const express = require('express');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Demo persona cards for the login picker (title = access level, subtitle = job · dept).
const DEMO_PERSONAS = [
  { title: 'Executive Viewer', full_name: 'Rahul Sharma', email: 'rahul.sharma@ptecip.local', subtitle: 'Executive Director · Powertrain Engineering' },
  { title: 'Department Head', full_name: 'Neha Verma', email: 'neha.verma@ptecip.local', subtitle: 'Head, Powertrain · EV Systems' },
  { title: 'Manager', full_name: 'Shalini Srivastava', email: 'shalini.srivastava@ptecip.local', subtitle: 'Manager · EV Systems' },
  { title: 'Mentor', full_name: 'Gurpreet Singh', email: 'gurpreet.singh@ptecip.local', subtitle: 'Powertrain Capability Mentor · EV Systems' },
  { title: 'SME', full_name: 'Moumita Bose', email: 'moumita.bose@ptecip.local', subtitle: 'Battery Systems SME · Battery Systems' },
  { title: 'Training Coordinator', full_name: 'Nidhi Tripathi', email: 'nidhi.tripathi@ptecip.local', subtitle: 'Training Coordinator / Admin · Capability Development Cell' },
  { title: 'Employee', full_name: 'Jasleen Kaur', email: 'jasleen.kaur@ptecip.local', subtitle: 'Validation Engineer · EV Systems' },
  { title: 'Admin', full_name: 'Nidhi Tripathi', email: 'nidhi.tripathi@ptecip.local', subtitle: 'Platform Admin · Capability Development Cell' },
];

// GET /api/auth/personas — list persona cards for the login screen.
router.get('/personas', (req, res) => {
  res.json(DEMO_PERSONAS);
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const demoPassword = process.env.DEMO_PASSWORD || 'demo123';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password !== demoPassword) {
      return res.status(401).json({ error: 'Invalid demo password' });
    }

    const { rows } = await query(
      `SELECT e.id AS employee_id, e.full_name, e.email, e.job_role_id,
              jr.role_name AS job_role_name, d.name AS department_name,
              COALESCE(
                ARRAY_AGG(DISTINCT pr.role_key) FILTER (WHERE pr.role_key IS NOT NULL),
                '{}'
              ) AS roles
       FROM employees e
       LEFT JOIN job_roles jr ON jr.id = e.job_role_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN app_users au ON au.employee_id = e.id
       LEFT JOIN user_permission_role_map m ON m.user_id = au.id
       LEFT JOIN app_permission_roles pr ON pr.id = m.permission_role_id
       WHERE lower(e.email) = lower($1)
       GROUP BY e.id, e.full_name, e.email, e.job_role_id, jr.role_name, d.name`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No employee found for that email' });
    }

    const emp = rows[0];
    const roles = emp.roles || [];
    // Pick a primary role for display, in priority order.
    const priority = [
      'admin',
      'executive',
      'department_head',
      'manager',
      'training_coordinator',
      'sme',
      'mentor',
      'employee',
    ];
    const primaryRole = priority.find((p) => roles.includes(p)) || 'employee';

    const payload = {
      employee_id: emp.employee_id,
      email: emp.email,
      full_name: emp.full_name,
      role: primaryRole,
      roles,
      job_role_name: emp.job_role_name,
      department_name: emp.department_name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    // Best-effort: record last login (ignore failure).
    query('UPDATE app_users SET last_login_at = NOW() WHERE lower(email) = lower($1)', [email]).catch(
      () => {}
    );

    res.json({ token, user: payload });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
