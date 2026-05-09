const express = require('express');
const { requireJwtAuth } = require('~/server/middleware');
const { listLeads, createLead, getLead, updateLead, deleteLead } = require('@librechat/api');

const router = express.Router();

const VALID_STATUSES = new Set(['cold', 'warm', 'hot', 'closed']);
const VALID_PLATFORMS = new Set(['linkedin', 'instagram', 'other']);

router.use(requireJwtAuth);

/**
 * GET /api/profile/leads
 * List leads for the current user. Query: filter, status, cursor, limit.
 */
router.get('/', async (req, res) => {
  const { filter, status, cursor, limit } = req.query;
  const opts = {};
  if (filter) opts.filter = String(filter);
  if (status && VALID_STATUSES.has(status)) opts.status = status;
  if (cursor) opts.cursor = String(cursor);
  if (limit) {
    const parsed = parseInt(limit, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 200) opts.limit = parsed;
  }
  try {
    const result = await listLeads(req.user.id, opts);
    return res.json(result);
  } catch (err) {
    return res.status(502).json({ error: err.message ?? 'Failed to list leads' });
  }
});

/**
 * POST /api/profile/leads
 * Create a new lead for the current user.
 */
router.post('/', async (req, res) => {
  const { lead_name, platform, status, notes, next_action, next_action_date } = req.body;

  if (!lead_name || typeof lead_name !== 'string' || lead_name.trim().length === 0 || lead_name.length > 200) {
    return res.status(400).json({ error: 'lead_name is required (1–200 chars)' });
  }

  const payload = { lead_name: lead_name.trim() };
  if (platform && VALID_PLATFORMS.has(platform)) payload.platform = platform;
  if (status && VALID_STATUSES.has(status)) payload.status = status;
  if (notes) payload.notes = String(notes);
  if (next_action) payload.next_action = String(next_action);
  if (next_action_date) payload.next_action_date = String(next_action_date);

  try {
    const lead = await createLead(req.user.id, payload);
    return res.status(201).json(lead);
  } catch (err) {
    return res.status(502).json({ error: err.message ?? 'Failed to create lead' });
  }
});

/**
 * GET /api/profile/leads/:leadId
 * Get a single lead.
 */
router.get('/:leadId', async (req, res) => {
  try {
    const lead = await getLead(req.user.id, req.params.leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    return res.json(lead);
  } catch (err) {
    return res.status(502).json({ error: err.message ?? 'Failed to get lead' });
  }
});

/**
 * PATCH /api/profile/leads/:leadId
 * Update a lead.
 */
router.patch('/:leadId', async (req, res) => {
  const { lead_name, platform, status, notes, next_action, next_action_date } = req.body;
  const partial = {};

  if (lead_name !== undefined) {
    if (typeof lead_name !== 'string' || lead_name.trim().length === 0 || lead_name.length > 200) {
      return res.status(400).json({ error: 'lead_name must be 1–200 chars' });
    }
    partial.lead_name = lead_name.trim();
  }
  if (platform !== undefined && VALID_PLATFORMS.has(platform)) partial.platform = platform;
  if (status !== undefined && VALID_STATUSES.has(status)) partial.status = status;
  if (notes !== undefined) partial.notes = String(notes);
  if (next_action !== undefined) partial.next_action = String(next_action);
  if (next_action_date !== undefined) partial.next_action_date = String(next_action_date);

  if (Object.keys(partial).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const lead = await updateLead(req.user.id, req.params.leadId, partial);
    return res.json(lead);
  } catch (err) {
    return res.status(502).json({ error: err.message ?? 'Failed to update lead' });
  }
});

/**
 * DELETE /api/profile/leads/:leadId
 * Delete a lead (DSGVO §17).
 */
router.delete('/:leadId', async (req, res) => {
  try {
    await deleteLead(req.user.id, req.params.leadId);
    return res.status(204).end();
  } catch (err) {
    return res.status(502).json({ error: err.message ?? 'Failed to delete lead' });
  }
});

module.exports = router;
