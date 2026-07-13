// Employee profile: header, skills passport, recent learning, certifications.
const express = require('express');
const { query, pool } = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/employees/form-options — dropdown data for the Add Employee form (admin).
router.get('/form-options', requireRole('admin'), async (req, res, next) => {
  try {
    const [departments, teams, roles, locations, managers] = await Promise.all([
      query('SELECT id, name FROM departments ORDER BY name'),
      query('SELECT id, name, department_id FROM teams ORDER BY name'),
      query('SELECT id, role_name FROM job_roles ORDER BY role_name'),
      query('SELECT id, name FROM locations ORDER BY name'),
      query("SELECT id, full_name FROM employees WHERE employment_status = 'Active' ORDER BY full_name"),
    ]);
    res.json({
      departments: departments.rows,
      teams: teams.rows,
      jobRoles: roles.rows,
      locations: locations.rows,
      managers: managers.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/employees — admin: create an employee (and, by default, a login account).
router.post('/', requireRole('admin'), async (req, res, next) => {
  const {
    employee_code,
    full_name,
    email,
    gender,
    grade,
    joining_date,
    department_id,
    team_id,
    job_role_id,
    manager_id,
    location_id,
    create_login = true,
  } = req.body || {};

  if (!employee_code || !full_name || !email) {
    return res.status(400).json({ error: 'employee_code, full_name and email are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const emp = await client.query(
      `INSERT INTO employees
         (employee_code, full_name, email, gender, grade, joining_date,
          department_id, team_id, job_role_id, manager_id, location_id)
       VALUES ($1,$2,$3,COALESCE($4,'Not Specified'),$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, employee_code, full_name, email`,
      [
        employee_code,
        full_name,
        email,
        gender || null,
        grade || null,
        joining_date || null,
        department_id || null,
        team_id || null,
        job_role_id || null,
        manager_id || null,
        location_id || null,
      ]
    );
    const employee = emp.rows[0];

    if (create_login) {
      const user = await client.query(
        `INSERT INTO app_users (employee_id, email, display_name)
         VALUES ($1,$2,$3) RETURNING id`,
        [employee.id, email, full_name]
      );
      await client.query(
        `INSERT INTO user_permission_role_map (user_id, permission_role_id)
         SELECT $1, id FROM app_permission_roles WHERE role_key = 'employee'
         ON CONFLICT DO NOTHING`,
        [user.rows[0].id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(employee);
  } catch (err) {
    await client.query('ROLLBACK');
    // Friendly message for duplicate code/email.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An employee with that code or email already exists' });
    }
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/employees?search= — lightweight directory (used by search & pickers).
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    const params = [];
    let where = "e.employment_status = 'Active'";
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (e.full_name ILIKE $${params.length} OR e.email ILIKE $${params.length})`;
    }
    const { rows } = await query(
      `SELECT e.id, e.full_name, e.email, jr.role_name AS job_role, d.name AS department
       FROM employees e
       LEFT JOIN job_roles jr ON jr.id = e.job_role_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE ${where}
       ORDER BY e.full_name`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id/profile
router.get('/:id/profile', async (req, res, next) => {
  try {
    const { id } = req.params;

    const headerP = query(
      `SELECT e.id, e.full_name, e.email, e.employee_code, e.grade, e.joining_date,
              jr.role_name AS job_role, d.name AS department, t.name AS team,
              mgr.full_name AS manager_name,
              (SELECT me.full_name FROM mentor_assignments ma
                 JOIN employees me ON me.id = ma.mentor_id
                 WHERE ma.mentee_id = e.id AND ma.status = 'Active'
                 ORDER BY ma.start_date ASC LIMIT 1) AS mentor_name,
              (SELECT jr2.role_name FROM mentor_recommendations mr
                 JOIN job_roles jr2 ON jr2.id = mr.recommended_role_id
                 WHERE mr.employee_id = e.id AND mr.recommended_role_id IS NOT NULL
                 ORDER BY mr.submitted_at DESC LIMIT 1) AS target_role
       FROM employees e
       LEFT JOIN job_roles jr ON jr.id = e.job_role_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN teams t ON t.id = e.team_id
       LEFT JOIN employees mgr ON mgr.id = e.manager_id
       WHERE e.id = $1`,
      [id]
    );

    const passportP = query(
      `SELECT skill_id, skill_name, self_level, manager_level, mentor_level, effective_level
       FROM v_employee_skill_matrix
       WHERE employee_id = $1
       ORDER BY effective_level DESC NULLS LAST, skill_name`,
      [id]
    );

    const recentLearningP = query(
      `SELECT tc.title, te.status, te.completed_at, te.progress_percent, tc.course_type
       FROM training_enrollments te JOIN training_courses tc ON tc.id = te.course_id
       WHERE te.employee_id = $1
       ORDER BY COALESCE(te.completed_at, te.enrolled_at) DESC
       LIMIT 8`,
      [id]
    );

    const certsP = query(
      `SELECT c.title, ec.status, ec.issued_date, ec.expiry_date, appr.full_name AS approved_by
       FROM employee_certifications ec
       JOIN certifications c ON c.id = ec.certification_id
       LEFT JOIN employees appr ON appr.id = ec.approved_by
       WHERE ec.employee_id = $1
       ORDER BY ec.issued_date DESC NULLS LAST`,
      [id]
    );

    const mentorNotesP = query(
      `SELECT ms.session_date, ms.mode, ms.topic, ms.notes, ms.action_items,
              mtr.full_name AS mentor_name
       FROM mentoring_sessions ms
       JOIN mentor_assignments ma ON ma.id = ms.mentor_assignment_id
       JOIN employees mtr ON mtr.id = ma.mentor_id
       WHERE ma.mentee_id = $1
       ORDER BY ms.session_date DESC`,
      [id]
    );

    const [header, passport, recentLearning, certs, mentorNotes] = await Promise.all([
      headerP,
      passportP,
      recentLearningP,
      certsP,
      mentorNotesP,
    ]);

    if (header.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({
      header: header.rows[0],
      skillsPassport: passport.rows,
      recentLearning: recentLearning.rows,
      certifications: certs.rows,
      mentorNotes: mentorNotes.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
