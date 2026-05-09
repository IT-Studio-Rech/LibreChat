const express = require('express');
const { requireJwtAuth } = require('~/server/middleware');
const { getICP, upsertICP, updateICP, deleteICP } = require('@librechat/api');

const router = express.Router();

router.use(requireJwtAuth);

/**
 * GET /api/profile/icp
 * Returns the current user's ICP record, or null if not found.
 */
router.get('/', async (req, res) => {
  try {
    const record = await getICP(req.user.id);
    if (!record) {
      return res.status(404).json({ icp: null });
    }
    return res.json(record);
  } catch (err) {
    return res.status(502).json({ error: err.message ?? 'Failed to fetch ICP' });
  }
});

/**
 * POST /api/profile/icp
 * Upsert (create or replace) the current user's ICP.
 */
router.post('/', async (req, res) => {
  const { icp_json, coaching_step } = req.body;
  if (icp_json == null) {
    return res.status(400).json({ error: 'icp_json is required' });
  }
  try {
    const record = await upsertICP(req.user.id, { icp_json, coaching_step });
    return res.json(record);
  } catch (err) {
    return res.status(502).json({ error: err.message ?? 'Failed to upsert ICP' });
  }
});

/**
 * PUT /api/profile/icp
 * Partial-update the current user's ICP.
 */
router.put('/', async (req, res) => {
  const { icp_json, coaching_step } = req.body;
  if (icp_json == null && coaching_step == null) {
    return res.status(400).json({ error: 'At least one field (icp_json, coaching_step) is required' });
  }
  const partial = {};
  if (icp_json != null) partial.icp_json = icp_json;
  if (coaching_step != null) partial.coaching_step = coaching_step;
  try {
    const record = await updateICP(req.user.id, partial);
    return res.json(record);
  } catch (err) {
    return res.status(502).json({ error: err.message ?? 'Failed to update ICP' });
  }
});

/**
 * DELETE /api/profile/icp
 * Delete the current user's ICP (DSGVO §17).
 */
router.delete('/', async (req, res) => {
  try {
    await deleteICP(req.user.id);
    return res.status(204).end();
  } catch (err) {
    return res.status(502).json({ error: err.message ?? 'Failed to delete ICP' });
  }
});

module.exports = router;
