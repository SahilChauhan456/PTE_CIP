// SME-driven course development pipeline.
const express = require('express');
const { query } = require('../db');

const router = express.Router();

// GET /api/course-development — pipeline list (demo query #10).
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT cdr.id, cdr.request_code, cdr.capability_gap_title, s.name AS skill,
              cdr.source, cdr.business_need, cdr.status,
              sme.full_name AS sme, coord.full_name AS coordinator,
              vol.full_name AS volunteer, cdr.target_launch_date, cdr.created_at
       FROM course_development_requests cdr
       LEFT JOIN skills s ON s.id = cdr.skill_id
       LEFT JOIN employees sme ON sme.id = cdr.sme_id
       LEFT JOIN employees coord ON coord.id = cdr.coordinator_id
       LEFT JOIN employees vol ON vol.id = cdr.volunteer_id
       ORDER BY cdr.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/course-development/:id — request with its stages.
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const reqP = query(
      `SELECT cdr.*, s.name AS skill_name FROM course_development_requests cdr
       LEFT JOIN skills s ON s.id = cdr.skill_id WHERE cdr.id = $1`,
      [id]
    );
    const stagesP = query(
      `SELECT cds.stage_order, cds.stage_name, cds.status, cds.due_date, cds.completed_at,
              o.full_name AS owner
       FROM course_development_stages cds
       LEFT JOIN employees o ON o.id = cds.owner_id
       WHERE cds.request_id = $1 ORDER BY cds.stage_order`,
      [id]
    );
    const [request, stages] = await Promise.all([reqP, stagesP]);
    if (request.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json({ request: request.rows[0], stages: stages.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
