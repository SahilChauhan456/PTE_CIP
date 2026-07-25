// Employee directory, profile (header + CV + skills passport + learning),
// and the self-service CV editing endpoints.
const express = require('express');
const multer = require('multer');
const { query, pool } = require('../db');
const { requireRole, requireSelfOrAdmin } = require('../middleware/auth');
const { uploadPublicFile } = require('../supabase');

const router = express.Router();

// Roles allowed to onboard people from the UI.
const MANAGE_ROLES = ['admin', 'executive', 'department_head'];

// Profile pictures are small; keep them in memory and stream to Supabase Storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) {
      return cb(new Error('Only PNG, JPG, WEBP or GIF images are allowed'));
    }
    return cb(null, true);
  },
});

// Multer reports oversized/wrong-type files through next(err); translate those
// into a 400 instead of letting the generic error handler call them a 500.
function uploadPhoto(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'Image must be smaller than 5 MB' : err.message;
      return res.status(400).json({ error: message });
    }
    return next();
  });
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

// Make sure the 1:1 CV row exists before updating it.
function ensureCv(client, employeeId) {
  return client.query(
    'INSERT INTO employee_cv (employee_id) VALUES ($1) ON CONFLICT (employee_id) DO NOTHING',
    [employeeId]
  );
}

// Any CV edit invalidates a previous verification: back to Draft, and any
// approval still sitting in someone's inbox is cancelled.
async function resetVerification(client, employeeId) {
  await ensureCv(client, employeeId);
  await client.query(
    `UPDATE employee_cv
        SET verification_status = 'Draft', verified_by = NULL, verified_at = NULL
      WHERE employee_id = $1 AND verification_status <> 'Draft'`,
    [employeeId]
  );
  await client.query(
    `UPDATE approvals SET status = 'Cancelled', decided_at = NOW()
      WHERE approval_type = 'Profile Verification' AND entity_id = $1 AND status = 'Pending'`,
    [employeeId]
  );
}

// Runs fn(client) inside a transaction.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const EXPERIENCE_COLUMNS = `id, title, organization,
  to_char(start_date, 'YYYY-MM-DD') AS start_date,
  to_char(end_date, 'YYYY-MM-DD') AS end_date,
  description, sort_order`;

const EDUCATION_COLUMNS =
  'id, degree, institution, field_of_study, start_year, end_year, grade, sort_order';

// Turn a typed skill name into a unique code, e.g. "Battery BMS" -> "BATTERY-BMS".
async function uniqueSkillCode(client, name) {
  const base =
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20) || 'SKILL';
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { rows } = await client.query('SELECT 1 FROM skills WHERE code = $1', [candidate]);
    if (rows.length === 0) return candidate;
  }
  return `${base}-${Math.floor(Math.random() * 100000)}`;
}

// ---------------------------------------------------------------
// Directory & onboarding
// ---------------------------------------------------------------

// GET /api/employees/form-options — dropdown data for the Add Employee form.
router.get('/form-options', requireRole(...MANAGE_ROLES), async (req, res, next) => {
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
router.post('/', requireRole(...MANAGE_ROLES), async (req, res, next) => {
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
      `SELECT e.id, e.full_name, e.email, e.photo_url,
              jr.role_name AS job_role, d.name AS department
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

// ---------------------------------------------------------------
// Profile (read)
// ---------------------------------------------------------------

// GET /api/employees/:id/profile
router.get('/:id/profile', async (req, res, next) => {
  try {
    const { id } = req.params;

    const headerP = query(
      `SELECT e.id, e.full_name, e.email, e.employee_code, e.grade, e.joining_date, e.photo_url,
              jr.role_name AS job_role, d.name AS department, t.name AS team,
              l.name AS location,
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
       LEFT JOIN locations l ON l.id = e.location_id
       LEFT JOIN employees mgr ON mgr.id = e.manager_id
       WHERE e.id = $1`,
      [id]
    );

    // Always returns a row for an existing employee, even with no CV yet.
    const cvP = query(
      `SELECT COALESCE(cv.verification_status, 'Draft') AS verification_status,
              cv.headline, cv.summary, cv.phone, cv.location_text, cv.linkedin_url,
              cv.verified_at, cv.updated_at,
              vb.full_name AS verified_by_name,
              (SELECT ap.full_name FROM approvals a
                 JOIN employees ap ON ap.id = a.approver_id
                 WHERE a.approval_type = 'Profile Verification'
                   AND a.entity_id = e.id AND a.status = 'Pending'
                 ORDER BY a.requested_at DESC LIMIT 1) AS pending_with
       FROM employees e
       LEFT JOIN employee_cv cv ON cv.employee_id = e.id
       LEFT JOIN employees vb ON vb.id = cv.verified_by
       WHERE e.id = $1`,
      [id]
    );

    const experienceP = query(
      `SELECT ${EXPERIENCE_COLUMNS} FROM employee_experience
       WHERE employee_id = $1
       ORDER BY sort_order, start_date DESC NULLS LAST`,
      [id]
    );

    const educationP = query(
      `SELECT ${EDUCATION_COLUMNS} FROM employee_education
       WHERE employee_id = $1
       ORDER BY sort_order, end_year DESC NULLS LAST`,
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

    const [header, cv, experience, education, passport, recentLearning, certs, mentorNotes] =
      await Promise.all([
        headerP,
        cvP,
        experienceP,
        educationP,
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

// ---------------------------------------------------------------
// CV header (self-service)
// ---------------------------------------------------------------

// PUT /api/employees/:id/cv — upsert the typed CV header.
router.put('/:id/cv', requireSelfOrAdmin(), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { headline, summary, phone, location_text, linkedin_url } = req.body || {};

    const row = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO employee_cv (employee_id, headline, summary, phone, location_text, linkedin_url)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (employee_id) DO UPDATE
           SET headline = EXCLUDED.headline,
               summary = EXCLUDED.summary,
               phone = EXCLUDED.phone,
               location_text = EXCLUDED.location_text,
               linkedin_url = EXCLUDED.linkedin_url
         RETURNING employee_id, headline, summary, phone, location_text, linkedin_url,
                   verification_status`,
        [
          id,
          headline || null,
          summary || null,
          phone || null,
          location_text || null,
          linkedin_url || null,
        ]
      );
      await resetVerification(client, id);
      return rows[0];
    });

    res.json({ ...row, verification_status: 'Draft' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// Experience (self-service)
// ---------------------------------------------------------------

// POST /api/employees/:id/experience
router.post('/:id/experience', requireSelfOrAdmin(), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, organization, start_date, end_date, description, sort_order } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const row = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO employee_experience
           (employee_id, title, organization, start_date, end_date, description, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,0))
         RETURNING ${EXPERIENCE_COLUMNS}`,
        [
          id,
          title.trim(),
          organization || null,
          start_date || null,
          end_date || null,
          description || null,
          Number.isFinite(Number(sort_order)) ? Number(sort_order) : null,
        ]
      );
      await resetVerification(client, id);
      return rows[0];
    });

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id/experience/:expId
router.put('/:id/experience/:expId', requireSelfOrAdmin(), async (req, res, next) => {
  try {
    const { id, expId } = req.params;
    const { title, organization, start_date, end_date, description, sort_order } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const row = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE employee_experience
            SET title = $3, organization = $4, start_date = $5, end_date = $6,
                description = $7, sort_order = COALESCE($8, sort_order)
          WHERE id = $1 AND employee_id = $2
          RETURNING ${EXPERIENCE_COLUMNS}`,
        [
          expId,
          id,
          title.trim(),
          organization || null,
          start_date || null,
          end_date || null,
          description || null,
          Number.isFinite(Number(sort_order)) ? Number(sort_order) : null,
        ]
      );
      if (rows.length === 0) return null;
      await resetVerification(client, id);
      return rows[0];
    });

    if (!row) return res.status(404).json({ error: 'Experience entry not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employees/:id/experience/:expId
router.delete('/:id/experience/:expId', requireSelfOrAdmin(), async (req, res, next) => {
  try {
    const { id, expId } = req.params;
    const deleted = await withTransaction(async (client) => {
      const { rowCount } = await client.query(
        'DELETE FROM employee_experience WHERE id = $1 AND employee_id = $2',
        [expId, id]
      );
      if (rowCount === 0) return false;
      await resetVerification(client, id);
      return true;
    });
    if (!deleted) return res.status(404).json({ error: 'Experience entry not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// Education (self-service)
// ---------------------------------------------------------------

// POST /api/employees/:id/education
router.post('/:id/education', requireSelfOrAdmin(), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { degree, institution, field_of_study, start_year, end_year, grade, sort_order } =
      req.body || {};
    if (!degree || !degree.trim()) {
      return res.status(400).json({ error: 'degree is required' });
    }

    const row = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO employee_education
           (employee_id, degree, institution, field_of_study, start_year, end_year, grade, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,0))
         RETURNING ${EDUCATION_COLUMNS}`,
        [
          id,
          degree.trim(),
          institution || null,
          field_of_study || null,
          start_year || null,
          end_year || null,
          grade || null,
          Number.isFinite(Number(sort_order)) ? Number(sort_order) : null,
        ]
      );
      await resetVerification(client, id);
      return rows[0];
    });

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id/education/:eduId
router.put('/:id/education/:eduId', requireSelfOrAdmin(), async (req, res, next) => {
  try {
    const { id, eduId } = req.params;
    const { degree, institution, field_of_study, start_year, end_year, grade, sort_order } =
      req.body || {};
    if (!degree || !degree.trim()) {
      return res.status(400).json({ error: 'degree is required' });
    }

    const row = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE employee_education
            SET degree = $3, institution = $4, field_of_study = $5, start_year = $6,
                end_year = $7, grade = $8, sort_order = COALESCE($9, sort_order)
          WHERE id = $1 AND employee_id = $2
          RETURNING ${EDUCATION_COLUMNS}`,
        [
          eduId,
          id,
          degree.trim(),
          institution || null,
          field_of_study || null,
          start_year || null,
          end_year || null,
          grade || null,
          Number.isFinite(Number(sort_order)) ? Number(sort_order) : null,
        ]
      );
      if (rows.length === 0) return null;
      await resetVerification(client, id);
      return rows[0];
    });

    if (!row) return res.status(404).json({ error: 'Education entry not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employees/:id/education/:eduId
router.delete('/:id/education/:eduId', requireSelfOrAdmin(), async (req, res, next) => {
  try {
    const { id, eduId } = req.params;
    const deleted = await withTransaction(async (client) => {
      const { rowCount } = await client.query(
        'DELETE FROM employee_education WHERE id = $1 AND employee_id = $2',
        [eduId, id]
      );
      if (rowCount === 0) return false;
      await resetVerification(client, id);
      return true;
    });
    if (!deleted) return res.status(404).json({ error: 'Education entry not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// Skills typed in by the employee
// ---------------------------------------------------------------

// POST /api/employees/:id/skills  { skill_id? | skill_name?, self_level }
// Picks an existing library skill or creates one from a typed name, links it to
// the employee and records a Self assessment (which drives the skill matrix).
router.post('/:id/skills', requireSelfOrAdmin(), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { skill_id, skill_name, self_level, comments } = req.body || {};
    const level = Number(self_level);

    if (!skill_id && !(skill_name && skill_name.trim())) {
      return res.status(400).json({ error: 'skill_id or skill_name is required' });
    }
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      return res.status(400).json({ error: 'self_level must be an integer between 1 and 5' });
    }

    const result = await withTransaction(async (client) => {
      let resolvedId = skill_id || null;
      let created = false;

      if (!resolvedId) {
        const name = skill_name.trim();
        const existing = await client.query('SELECT id FROM skills WHERE name ILIKE $1 LIMIT 1', [
          name,
        ]);
        if (existing.rows.length) {
          resolvedId = existing.rows[0].id;
        } else {
          const code = await uniqueSkillCode(client, name);
          const inserted = await client.query(
            `INSERT INTO skills (code, name, description)
             VALUES ($1, $2, 'Added from an employee profile')
             RETURNING id`,
            [code, name]
          );
          resolvedId = inserted.rows[0].id;
          created = true;
        }
      }

      await client.query(
        `INSERT INTO employee_skill_assignments (employee_id, skill_id, assigned_by_employee_id)
         VALUES ($1,$2,$3)
         ON CONFLICT (employee_id, skill_id) DO NOTHING`,
        [id, resolvedId, req.user.employee_id]
      );

      // A new row per submission; v_latest_skill_levels reads the most recent.
      await client.query(
        `INSERT INTO skill_assessments
           (employee_id, skill_id, assessor_employee_id, assessor_type, assessed_level, comments, status)
         VALUES ($1,$2,$3,'Self',$4,$5,'Submitted')`,
        [id, resolvedId, req.user.employee_id, level, comments || null]
      );

      const { rows } = await client.query(
        `SELECT skill_id, skill_name, self_level, manager_level, mentor_level, effective_level
         FROM v_employee_skill_matrix WHERE employee_id = $1 AND skill_id = $2`,
        [id, resolvedId]
      );
      return { skill: rows[0] || { skill_id: resolvedId }, created_skill: created };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employees/:id/skills/:skillId — drop a self-added skill.
// Refuses when a manager/mentor/SME has assessed it, so employees can't erase
// an organisational assessment from their passport.
router.delete('/:id/skills/:skillId', requireSelfOrAdmin(), async (req, res, next) => {
  try {
    const { id, skillId } = req.params;

    const outcome = await withTransaction(async (client) => {
      const others = await client.query(
        `SELECT 1 FROM skill_assessments
          WHERE employee_id = $1 AND skill_id = $2
            AND assessor_type IN ('Manager','Mentor','SME')
          LIMIT 1`,
        [id, skillId]
      );
      if (others.rows.length) return 'assessed';

      const { rowCount } = await client.query(
        'DELETE FROM employee_skill_assignments WHERE employee_id = $1 AND skill_id = $2',
        [id, skillId]
      );
      if (rowCount === 0) return 'missing';

      await client.query(
        `DELETE FROM skill_assessments
          WHERE employee_id = $1 AND skill_id = $2 AND assessor_type = 'Self'`,
        [id, skillId]
      );
      return 'deleted';
    });

    if (outcome === 'assessed') {
      return res.status(409).json({
        error: 'This skill has a manager or mentor assessment and cannot be removed here.',
      });
    }
    if (outcome === 'missing') {
      return res.status(404).json({ error: 'Skill is not on this profile' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// Profile picture
// ---------------------------------------------------------------

// POST /api/employees/:id/photo — multipart/form-data, field name "file".
router.post('/:id/photo', requireSelfOrAdmin(), uploadPhoto, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: file)' });

    // Timestamped path so the browser/CDN never serves a stale avatar.
    const ext = (req.file.originalname.split('.').pop() || 'png').toLowerCase().slice(0, 5);
    const path = `${id}/avatar-${Date.now()}.${ext}`;

    const publicUrl = await uploadPublicFile(path, req.file.buffer, req.file.mimetype);

    const { rows } = await query(
      'UPDATE employees SET photo_url = $2 WHERE id = $1 RETURNING id, photo_url',
      [id, publicUrl]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
