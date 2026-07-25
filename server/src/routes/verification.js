// Profile/CV verification workflow: an employee requests verification from any
// other employee, who approves or rejects it from their inbox.
const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// POST /api/verification/request — body { approver_employee_id }
// Creates an approval + inbox item for the chosen approver, marks CV Pending.
router.post('/request', async (req, res, next) => {
  const requesterId = req.user.employee_id;
  const requesterName = req.user.full_name || 'An employee';
  const { approver_employee_id } = req.body || {};

  if (!approver_employee_id) {
    return res.status(400).json({ error: 'approver_employee_id is required' });
  }
  if (approver_employee_id === requesterId) {
    return res.status(400).json({ error: 'You cannot send a verification request to yourself' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure a CV row exists and mark it Pending.
    await client.query(
      `INSERT INTO employee_cv (employee_id, verification_status)
       VALUES ($1, 'Pending')
       ON CONFLICT (employee_id) DO UPDATE SET
         verification_status = 'Pending', verified_by = NULL, verified_at = NULL`,
      [requesterId]
    );

    const approval = await client.query(
      `INSERT INTO approvals (approval_type, requested_by, approver_id, entity_type, entity_id, status)
       VALUES ('Profile Verification', $1, $2, 'employee_cv', $1, 'Pending')
       RETURNING id`,
      [requesterId, approver_employee_id]
    );

    await client.query(
      `INSERT INTO inbox_items (recipient_employee_id, item_type, title, body, related_entity_type, related_entity_id, priority)
       VALUES ($1, 'Approval', $2, $3, 'approval', $4, 'Medium')`,
      [
        approver_employee_id,
        `Profile verification request from ${requesterName}`,
        `${requesterName} has requested that you verify their profile / CV.`,
        approval.rows[0].id,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ approval_id: approval.rows[0].id, status: 'Pending' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/verification/:approvalId/decision — body { decision: 'Approved'|'Rejected', comments? }
router.post('/:approvalId/decision', async (req, res, next) => {
  const approverId = req.user.employee_id;
  const approverName = req.user.full_name || 'The reviewer';
  const { approvalId } = req.params;
  const { decision, comments } = req.body || {};

  if (!['Approved', 'Rejected'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'Approved' or 'Rejected'" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query(
      `SELECT id, requested_by, entity_id, status FROM approvals
        WHERE id = $1 AND approver_id = $2 AND approval_type = 'Profile Verification'
        FOR UPDATE`,
      [approvalId, approverId]
    );
    if (!found.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Verification request not found' });
    }
    if (found.rows[0].status !== 'Pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This request has already been decided' });
    }

    const approval = found.rows[0];

    await client.query(
      `UPDATE approvals SET status = $2, decision_comments = $3, decided_at = NOW() WHERE id = $1`,
      [approvalId, decision, comments || null]
    );

    await client.query(
      `UPDATE employee_cv
          SET verification_status = $2, verified_by = $3, verified_at = NOW()
        WHERE employee_id = $1`,
      [approval.entity_id, decision === 'Approved' ? 'Verified' : 'Rejected', approverId]
    );

    // Mark the approver's original inbox item as actioned.
    await client.query(
      `UPDATE inbox_items SET status = 'Actioned'
        WHERE recipient_employee_id = $1 AND related_entity_type = 'approval' AND related_entity_id = $2`,
      [approverId, approvalId]
    );

    // Notify the requester of the outcome.
    await client.query(
      `INSERT INTO inbox_items (recipient_employee_id, item_type, title, body, related_entity_type, related_entity_id, priority)
       VALUES ($1, 'System Notice', $2, $3, 'approval', $4, 'Medium')`,
      [
        approval.requested_by,
        `Profile verification ${decision.toLowerCase()}`,
        `${approverName} ${decision === 'Approved' ? 'verified' : 'rejected'} your profile / CV.` +
          (comments ? ` Note: ${comments}` : ''),
        approvalId,
      ]
    );

    await client.query('COMMIT');
    res.json({ approval_id: approvalId, status: decision });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
