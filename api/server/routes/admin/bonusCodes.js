const express = require('express');
const { generateBonusCodes, listCharges, getChargeDetails } = require('@librechat/api');
const { SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');
const db = require('~/models');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);

const deps = {
  consumeBonusCode: db.consumeBonusCode,
  setUserBonusActivated: db.setUserBonusActivated,
  insertBonusCodes: db.insertBonusCodes,
  findChargesAggregated: db.findChargesAggregated,
  findChargeDetails: db.findChargeDetails,
};

router.use(requireJwtAuth, requireAdminAccess);

router.post('/', async (req, res) => {
  const { count, description } = req.body;
  if (
    typeof count !== 'number' ||
    count < 1 ||
    count > 1000 ||
    !description ||
    typeof description !== 'string' ||
    description.trim().length === 0 ||
    description.length > 200
  ) {
    return res.status(400).json({ error: 'Invalid count (1–1000) or description (1–200 chars)' });
  }
  try {
    const codes = await generateBonusCodes(count, description.trim(), deps);
    return res.json({ codes });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate bonus codes' });
  }
});

router.get('/charges', async (_req, res) => {
  try {
    const charges = await listCharges(deps);
    return res.json(charges);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list charges' });
  }
});

router.get('/charges/:description', async (req, res) => {
  const { description } = req.params;
  if (!description || description.trim().length === 0) {
    return res.status(400).json({ error: 'Description is required' });
  }
  try {
    const details = await getChargeDetails(decodeURIComponent(description), deps);
    return res.json(details);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get charge details' });
  }
});

module.exports = router;
