// Mentor dashboard + mentee list.
const express = require('express');
const { query } = require('../db');

const router = express.Router();

// GET /api/mentor/:mentorId/dashboard
router.get('/:mentorId/dashboard', async (req, res, next) => {
  try {
    const { mentorId } = req.params;

    const summaryP = query('SELECT * FROM v_mentor_dashboard WHERE mentor_id = $1', [mentorId]);

    // Mentee list: target skill (from assignment), mentee's current level for
    // that skill, a project-application level (mentor recommended level),
    // and last interaction (latest mentoring session).
    const menteesP = query(
      `SELECT ma.id AS assignment_id,
              mentee.id AS mentee_id,
              mentee.full_name AS mentee_name,
              s.name AS target_skill,
              esa.target_level,
              COALESCE(m.effective_level, 0) AS current_level,
              (SELECT recommended_level FROM mentor_recommendations mr
                 WHERE mr.mentor_id = ma.mentor_id AND mr.employee_id = ma.mentee_id
                 ORDER BY mr.submitted_at DESC LIMIT 1) AS project_level,
              (SELECT MAX(ms.session_date) FROM mentoring_sessions ms
                 WHERE ms.mentor_assignment_id = ma.id) AS last_interaction,
              ma.status
       FROM mentor_assignments ma
       JOIN employees mentee ON mentee.id = ma.mentee_id
       LEFT JOIN skills s ON s.id = ma.skill_id
       LEFT JOIN employee_skill_assignments esa
              ON esa.employee_id = ma.mentee_id AND esa.skill_id = ma.skill_id
       LEFT JOIN v_employee_skill_matrix m
              ON m.employee_id = ma.mentee_id AND m.skill_id = ma.skill_id
       WHERE ma.mentor_id = $1
       ORDER BY last_interaction DESC NULLS LAST, mentee.full_name`,
      [mentorId]
    );

    const [summary, mentees] = await Promise.all([summaryP, menteesP]);

    res.json({
      summary: summary.rows[0] || { mentor_id: mentorId, active_mentees: 0, open_support_requests: 0, submitted_recommendations: 0 },
      mentees: mentees.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
