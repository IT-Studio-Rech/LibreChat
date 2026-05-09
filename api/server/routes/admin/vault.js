const multer = require('multer');
const express = require('express');
const axios = require('axios');
const { SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

router.use(requireJwtAuth, requireCapability(SystemCapabilities.ACCESS_ADMIN));

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/markdown',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]);

const ALLOWED_CATEGORIES = new Set(['nischenfindung', 'angebot', 'sales', 'webseite']);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const vaultUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

router.post('/upload', vaultUpload.single('file'), async (req, res) => {
  const { category } = req.body;

  if (!ALLOWED_CATEGORIES.has(category)) {
    return res.status(400).json({
      error: `Invalid category "${category}". Must be one of: ${[...ALLOWED_CATEGORIES].join(', ')}`,
    });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { VAULT_GITHUB_TOKEN, VAULT_REPO_OWNER, VAULT_REPO_NAME } = process.env;

  if (!VAULT_GITHUB_TOKEN || !VAULT_REPO_OWNER || !VAULT_REPO_NAME) {
    return res
      .status(500)
      .json({ error: 'Vault repository is not configured (missing env vars)' });
  }

  const filename = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `raw/${category}/${filename}`;
  const content = req.file.buffer.toString('base64');

  const apiUrl = `https://api.github.com/repos/${VAULT_REPO_OWNER}/${VAULT_REPO_NAME}/contents/${filePath}`;

  try {
    const ghRes = await axios.put(
      apiUrl,
      {
        message: `upload: ${filePath}`,
        content,
      },
      {
        headers: {
          Authorization: `token ${VAULT_GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
      },
    );

    return res.json({
      status: 'success',
      path: filePath,
      commit_url: ghRes.data?.commit?.html_url ?? null,
    });
  } catch (err) {
    const message =
      err?.response?.data?.message ?? err?.message ?? 'GitHub API request failed';
    return res.status(500).json({ error: `Failed to upload to vault: ${message}` });
  }
});

module.exports = router;
