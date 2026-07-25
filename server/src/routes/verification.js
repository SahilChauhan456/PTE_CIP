// Profile / CV verification workflow.
//   request  → an employee asks anyone in the directory to verify their CV
//   decision → that person approves or rejects it from their inbox
// The request is stored as an `approvals` row (approval_type
// 'Profile Verification', entity = the requester's employee_cv) plus an
// inbox_items row for the approver.
const express = require('express');
const { query, pool } = require('../db');

const router = express.Router();

const APPROVAL_TYPE = 'Profile Verification';

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

// POST /api/verification/request  { approver_employee_id, message? }
router.post('/request', async (req, res, next) => {
  try {
    const me = req.user.employee_id;
    const { approver_employee_id, message } = req.body || {};

    if (!approver_employee_id) {
      return res.status(400).json({ error: 'approver_employee_id is required' });
    }
    if (approver_employee_id === me) {
      return res.status(400).json({ error: 'You cannot verify your own profile' });
    }

    const approver = await query(
      "SELECT id, full_name FROM employees WHERE id = $1 AND employment_status = 'Active'",
      [approver_employee_id]
    );
    if (approver.rows.length === 0) {
      return res.status(404).json({ error: 'That person was not found in the directory' });
    }

    const approval = await withTransaction(async (client) => {
      // One open request at a time — asking someone else supersedes the old one.
      await client.query(
        `UPDATE approvals SET status = 'Cancelled', decided_at = NOW()
          WHERE approval_type = $2 AND entity_id = $1 AND status = 'Pending'`,
        [me, APPROVAL_TYPE]
      );

      await client.query(
        'INSERT INTO employee_cv (employee_id) VALUES ($1) ON CONFLICT (employee_id) DO NOTHING',
        [me]
      );
      await client.query(
        `UPDATE employee_cv
            SET verification_status = 'Pending', verified_by = NULL, verified_at = NULL
          WHERE employee_id = $1`,
        [me]
      );

      const inserted = await client.query(
        `INSERT INTO approvals
           (approval_type, requested_by, approver_id, entity_type, entity_id, status)
         VALUES ($1,$2,$3,'employee_cv',$2,'Pending')
         RETURNING id, approval_type, status, requested_at`,
        [APPROVAL_TYPE, me, approver_employee_id]
      );
      const row = inserted.rows[0];

      await client.query(
        `INSERT INTO inbox_items
           (recipient_employee_id, item_type, title, body, related_entity_type, related_entity_id, priority)
         VALUES ($1,'Approval',$2,$3,'approval',$4,'Medium')`,
        [
          approver_employee_id,
          `Profile verification requested by ${req.user.full_name}`,
          message ||
            `${req.user.full_name} has asked you to review and verify their profile / CV details.`,
          row.id,
        ]
      );

      return row;
    });

    res.status(201).json({ ...approval, approver_name: approver.rows[0].full_name });
  } catch (err) {
    next(err);
  }
});

// POST /api/verification/:id/decision  { decision: 'Approved'|'Rejected', comments? }
router.post('/:id/decision', async (req, res, next) => {
  try {
    const me = req.user.employee_id;
    const { decision, comments } = req.body || {};

    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'Approved' or 'Rejected'" });
    }

    const existing = await query(
      `SELECT a.id, a.approval_type, a.approver_id, a.requested_by, a.entity_id, a.status,
              rq.full_name AS requested_by_name
       FROM approvals a
       LEFT JOIN employees rq ON rq.id = a.requested_by
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    const approval = existing.rows[0];
    if (approval.approver_id !== me) {
      return res.status(403).json({ error: 'You are not the approver for this request' });
    }
    if (approval.status !== 'Pending') {
      return res.status(409).json({ error: `This request was already ${approval.status.toLowerCase()}` });
    }

    const updated = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE approvals
            SET status = $2, decision_comments = COALESCE($3, decision_comments), decided_at = NOW()
          WHERE id = $1
          RETURNING id, approval_type, status, decision_comments, decided_at`,
        [approval.id, decision, comments || null]
      );

      if (approval.approval_type === APPROVAL_TYPE) {
        await client.query(
          'INSERT INTO employee_cv (employee_id) VALUES ($1) ON CONFLICT (employee_id) DO NOTHING',
          [approval.entity_id]
        );
        await client.query(
          `UPDATE employee_cv
              SET verification_status = $2, verified_by = $3, verified_at = NOW()
            WHERE employee_id = $1`,
          [approval.entity_id, decision === 'Approved' ? 'Verified' : 'Rejected', me]
        );
      }

      // Close out the approver's own inbox item for this request…
      await client.query(
        `UPDATE inbox_items SET status = 'Actioned'
          WHERE recipient_employee_id = $1 AND related_entity_id = $2`,
        [me, approval.id]
      );

      // …and tell the requester what happened.
      await client.query(
        `INSERT INTO inbox_items
           (recipient_employee_id, item_type, title, body, related_entity_type, related_entity_id, priority)
         VALUES ($1,'System Notice',$2,$3,'approval',$4,$5)`,
        [
          approval.requested_by,
          decision === 'Approved'
            ? `${req.user.full_name} verified your profile`
            : `${req.user.full_name} rejected your profile verification`,
          comments ||
            (decision === 'Approved'
              ? 'Your profile / CV details have been verified.'
              : 'Your profile / CV details were not verified. Please review and request again.'),
          approval.id,
          decision === 'Approved' ? 'Low' : 'High',
        ]
      );

      return rows[0];
    });

    res.json({ ...updated, requested_by_name: approval.requested_by_name });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
