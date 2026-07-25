// Employee profile: header, skills passport, recent learning, certifications,
// plus self-service CV editing, skills, and profile photo upload.
const express = require('express');
const multer = require('multer');
const { query, pool } = require('../db');
const { requireRole, requireSelfOrAdmin } = require('../middleware/auth');
const { uploadPublicFile } = require('../supabase');

const router = express.Router();

// In-memory upload for profile photos (5 MB cap, images only).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('Only image files are allowed'), { status: 400 }));
  },
});

// Roles allowed to add employees: admin plus top-of-hierarchy leaders.
const CAN_ADD_EMPLOYEE = ['admin', 'executive', 'department_head'];

// Builds a URL-safe unique skill code from a free-text skill name.
function slugCode(name) {
  const base = String(name).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
  return `${base || 'SKILL'}-${Date.now().toString(36).toUpperCase()}`;
}

// GET /api/employees/form-options — dropdown data for the Add Employee form.
router.get('/form-options', requireRole(...CAN_ADD_EMPLOYEE), async (req, res, next) => {
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

// POST /api/employees — create an employee (and, by default, a login account).
router.post('/', requireRole(...CAN_ADD_EMPLOYEE), async (req, res, next) => {
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
              e.photo_url,
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

    const cvP = query(
      `SELECT cv.headline, cv.summary, cv.phone, cv.location_text, cv.linkedin_url,
              cv.verification_status, cv.verified_at, vb.full_name AS verified_by_name
       FROM employee_cv cv
       LEFT JOIN employees vb ON vb.id = cv.verified_by
       WHERE cv.employee_id = $1`,
      [id]
    );
    const experienceP = query(
      `SELECT id, title, organization, start_date, end_date, description
       FROM employee_experience WHERE employee_id = $1
       ORDER BY sort_order, start_date DESC NULLS LAST`,
      [id]
    );
    const educationP = query(
      `SELECT id, degree, institution, field_of_study, start_year, end_year, grade
       FROM employee_education WHERE employee_id = $1
       ORDER BY sort_order, end_year DESC NULLS LAST`,
      [id]
    );

    const [header, passport, recentLearning, certs, mentorNotes, cv, experience, education] =
      await Promise.all([
        headerP,
        passportP,
        recentLearningP,
        certsP,
        mentorNotesP,
        cvP,
        experienceP,
        educationP,
      ]);

    if (header.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({
      header: header.rows[0],
      cv: cv.rows[0] || { verification_status: 'Draft' },
      experience: experience.rows,
      education: education.rows,
      skillsPassport: passport.rows,
      recentLearning: recentLearning.rows,
      certifications: certs.rows,
      mentorNotes: mentorNotes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// Any edit to CV content invalidates a prior verification — send it back to Draft.
async function resetVerification(runner, employeeId) {
  await runner(
    `UPDATE employee_cv
        SET verification_status = 'Draft', verified_by = NULL, verified_at = NULL
      WHERE employee_id = $1 AND verification_status IN ('Verified','Pending')`,
    [employeeId]
  );
}

// PATCH /api/employees/:id/cv — upsert the CV core (self or admin).
router.patch('/:id/cv', requireSelfOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { headline, summary, phone, location_text, linkedin_url } = req.body || {};
    const { rows } = await query(
      `INSERT INTO employee_cv (employee_id, headline, summary, phone, location_text, linkedin_url)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (employee_id) DO UPDATE SET
         headline = EXCLUDED.headline,
         summary = EXCLUDED.summary,
         phone = EXCLUDED.phone,
         location_text = EXCLUDED.location_text,
         linkedin_url = EXCLUDED.linkedin_url,
         verification_status = 'Draft',
         verified_by = NULL,
         verified_at = NULL
       RETURNING headline, summary, phone, location_text, linkedin_url, verification_status`,
      [id, headline || null, summary || null, phone || null, location_text || null, linkedin_url || null]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/employees/:id/experience
router.post('/:id/experience', requireSelfOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, organization, start_date, end_date, description, sort_order } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    const { rows } = await query(
      `INSERT INTO employee_experience (employee_id, title, organization, start_date, end_date, description, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,0))
       RETURNING id, title, organization, start_date, end_date, description`,
      [id, title.trim(), organization || null, start_date || null, end_date || null, description || null, sort_order]
    );
    await resetVerification(query, id);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employees/:id/experience/:expId
router.patch('/:id/experience/:expId', requireSelfOrAdmin, async (req, res, next) => {
  try {
    const { id, expId } = req.params;
    const { title, organization, start_date, end_date, description } = req.body || {};
    const { rows } = await query(
      `UPDATE employee_experience
          SET title = COALESCE($3, title), organization = $4, start_date = $5,
              end_date = $6, description = $7
        WHERE id = $1 AND employee_id = $2
       RETURNING id, title, organization, start_date, end_date, description`,
      [expId, id, title || null, organization || null, start_date || null, end_date || null, description || null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Experience not found' });
    await resetVerification(query, id);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employees/:id/experience/:expId
router.delete('/:id/experience/:expId', requireSelfOrAdmin, async (req, res, next) => {
  try {
    const { id, expId } = req.params;
    await query('DELETE FROM employee_experience WHERE id = $1 AND employee_id = $2', [expId, id]);
    await resetVerification(query, id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/employees/:id/education
router.post('/:id/education', requireSelfOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { degree, institution, field_of_study, start_year, end_year, grade, sort_order } = req.body || {};
    if (!degree || !degree.trim()) return res.status(400).json({ error: 'degree is required' });
    const { rows } = await query(
      `INSERT INTO employee_education (employee_id, degree, institution, field_of_study, start_year, end_year, grade, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,0))
       RETURNING id, degree, institution, field_of_study, start_year, end_year, grade`,
      [id, degree.trim(), institution || null, field_of_study || null, start_year || null, end_year || null, grade || null, sort_order]
    );
    await resetVerification(query, id);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employees/:id/education/:eduId
router.patch('/:id/education/:eduId', requireSelfOrAdmin, async (req, res, next) => {
  try {
    const { id, eduId } = req.params;
    const { degree, institution, field_of_study, start_year, end_year, grade } = req.body || {};
    const { rows } = await query(
      `UPDATE employee_education
          SET degree = COALESCE($3, degree), institution = $4, field_of_study = $5,
              start_year = $6, end_year = $7, grade = $8
        WHERE id = $1 AND employee_id = $2
       RETURNING id, degree, institution, field_of_study, start_year, end_year, grade`,
      [eduId, id, degree || null, institution || null, field_of_study || null, start_year || null, end_year || null, grade || null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Education not found' });
    await resetVerification(query, id);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employees/:id/education/:eduId
router.delete('/:id/education/:eduId', requireSelfOrAdmin, async (req, res, next) => {
  try {
    const { id, eduId } = req.params;
    await query('DELETE FROM employee_education WHERE id = $1 AND employee_id = $2', [eduId, id]);
    await resetVerification(query, id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/employees/:id/skills — self-declare a skill (pick existing or create new)
// with a self-assessed level. Body: { skill_id?, skill_name?, self_level }.
router.post('/:id/skills', requireSelfOrAdmin, async (req, res, next) => {
  const { id } = req.params;
  let { skill_id, skill_name, self_level } = req.body || {};
  const level = Number(self_level);
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    return res.status(400).json({ error: 'self_level must be an integer 1-5' });
  }
  if (!skill_id && !(skill_name && skill_name.trim())) {
    return res.status(400).json({ error: 'skill_id or skill_name is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve the skill: use the given id, match an existing name, or create it.
    if (!skill_id) {
      const found = await client.query('SELECT id FROM skills WHERE name ILIKE $1 LIMIT 1', [skill_name.trim()]);
      if (found.rows.length) {
        skill_id = found.rows[0].id;
      } else {
        const created = await client.query(
          `INSERT INTO skills (code, name) VALUES ($1, $2) RETURNING id`,
          [slugCode(skill_name), skill_name.trim()]
        );
        skill_id = created.rows[0].id;
      }
    }

    // Link the skill to the employee (idempotent).
    await client.query(
      `INSERT INTO employee_skill_assignments (employee_id, skill_id, assigned_by_employee_id)
       VALUES ($1, $2, $1) ON CONFLICT (employee_id, skill_id) DO NOTHING`,
      [id, skill_id]
    );

    // Record the self assessment (feeds v_employee_skill_matrix).
    await client.query(
      `INSERT INTO skill_assessments (employee_id, skill_id, assessor_employee_id, assessor_type, assessed_level, status)
       VALUES ($1, $2, $1, 'Self', $3, 'Submitted')`,
      [id, skill_id, level]
    );

    const skill = await client.query('SELECT id AS skill_id, name AS skill_name FROM skills WHERE id = $1', [skill_id]);
    await client.query('COMMIT');
    res.status(201).json({ ...skill.rows[0], self_level: level });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/employees/:id/skills/:skillId — remove a self-declared skill.
router.delete('/:id/skills/:skillId', requireSelfOrAdmin, async (req, res, next) => {
  const { id, skillId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM employee_skill_assignments WHERE employee_id = $1 AND skill_id = $2', [id, skillId]);
    await client.query(
      "DELETE FROM skill_assessments WHERE employee_id = $1 AND skill_id = $2 AND assessor_type = 'Self'",
      [id, skillId]
    );
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/employees/:id/photo — upload a profile picture to Supabase Storage.
router.post('/:id/photo', requireSelfOrAdmin, upload.single('photo'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image uploaded (field name: photo)' });

    const ext = (req.file.mimetype.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const path = `${id}/avatar-${Date.now()}.${ext}`;
    const publicUrl = await uploadPublicFile(path, req.file.buffer, req.file.mimetype);

    await query('UPDATE employees SET photo_url = $1 WHERE id = $2', [publicUrl, id]);
    res.json({ photo_url: publicUrl });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
