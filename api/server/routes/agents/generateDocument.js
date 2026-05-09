const path = require('path');
const { v4 } = require('uuid');
const express = require('express');
const { FileContext } = require('librechat-data-provider');
const { logger } = require('@librechat/data-schemas');
const {
  fillTemplate,
  templatesDir,
  isLibreOfficeEnabledFor,
  convertOfficeToPdf,
  getStorageMetadata,
} = require('@librechat/api');
const { getFileStrategy } = require('~/server/utils/getFileStrategy');
const { getStrategyFunctions } = require('~/server/services/Files/strategies');
const db = require('~/models');

const ALLOWED_TEMPLATES = ['offer', 'contract'];
const ALLOWED_FORMATS = ['pdf', 'docx'];

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_MIME = 'application/pdf';

const router = express.Router();

/**
 * @route POST /api/agents/generate-document
 * @desc Generate a PDF or DOCX document from a named template and placeholder data.
 * @access Private (requireJwtAuth applied in agents/index.js before this router)
 *
 * @body {{ template: 'offer'|'contract', data: Record<string,unknown>, format: 'pdf'|'docx' }}
 * @returns {{ file_id, filename, type, source, filepath }}
 */
router.post('/', async (req, res) => {
  const { template, data, format = 'docx' } = req.body ?? {};

  if (!ALLOWED_TEMPLATES.includes(template)) {
    return res.status(400).json({
      error: `Invalid template. Must be one of: ${ALLOWED_TEMPLATES.join(', ')}`,
    });
  }

  if (!ALLOWED_FORMATS.includes(format)) {
    return res.status(400).json({
      error: `Invalid format. Must be one of: ${ALLOWED_FORMATS.join(', ')}`,
    });
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ error: '"data" must be a non-null object of placeholder values.' });
  }

  if (format === 'pdf' && !isLibreOfficeEnabledFor('docx')) {
    return res.status(503).json({
      error:
        'PDF generation not available — install LibreOffice and set OFFICE_PREVIEW_LIBREOFFICE=true',
    });
  }

  const templatePath = path.join(templatesDir(), `${template}-placeholder.docx`);

  let docxBuffer;
  try {
    docxBuffer = await fillTemplate(templatePath, data);
  } catch (err) {
    logger.error('[generateDocument] fillTemplate failed', { template, error: err.message });
    return res.status(500).json({ error: `Document generation failed: ${err.message}` });
  }

  let outputBuffer;
  let mimeType;
  let ext;

  if (format === 'pdf') {
    try {
      outputBuffer = await convertOfficeToPdf(docxBuffer, 'docx');
      mimeType = PDF_MIME;
      ext = 'pdf';
    } catch (err) {
      logger.error('[generateDocument] PDF conversion failed', { error: err.message });
      return res.status(500).json({ error: `PDF conversion failed: ${err.message}` });
    }
  } else {
    outputBuffer = docxBuffer;
    mimeType = DOCX_MIME;
    ext = 'docx';
  }

  const appConfig = req.config;
  const source = getFileStrategy(appConfig);
  const { saveBuffer } = getStrategyFunctions(source);

  if (typeof saveBuffer !== 'function') {
    logger.error('[generateDocument] Storage strategy has no saveBuffer', { source });
    return res.status(500).json({ error: 'File storage not configured for buffer uploads.' });
  }

  const file_id = v4();
  const filename = `${template}-${file_id}.${ext}`;

  let filepath;
  try {
    filepath = await saveBuffer({
      userId: req.user.id,
      fileName: `${file_id}-${filename}`,
      buffer: outputBuffer,
      tenantId: req.user.tenantId,
    });
  } catch (err) {
    logger.error('[generateDocument] saveBuffer failed', { error: err.message });
    return res.status(500).json({ error: `File storage failed: ${err.message}` });
  }

  const storageMetadata = getStorageMetadata({ filepath, source });

  let fileRecord;
  try {
    fileRecord = await db.createFile(
      {
        user: req.user.id,
        file_id,
        bytes: outputBuffer.length,
        filepath,
        ...storageMetadata,
        filename,
        context: FileContext.message_attachment,
        source,
        type: mimeType,
        tenantId: req.user.tenantId,
      },
      true,
    );
  } catch (err) {
    logger.error('[generateDocument] db.createFile failed', { error: err.message });
    return res.status(500).json({ error: `File registration failed: ${err.message}` });
  }

  return res.status(200).json({
    file_id: fileRecord.file_id,
    filename: fileRecord.filename,
    type: fileRecord.type,
    source: fileRecord.source,
    filepath: fileRecord.filepath,
  });
});

module.exports = router;
