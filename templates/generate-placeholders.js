/**
 * Generates minimal valid DOCX placeholder files for offer and contract templates.
 *
 * Usage:
 *   node templates/generate-placeholders.js
 *
 * Outputs:
 *   templates/offer-placeholder.docx
 *   templates/contract-placeholder.docx
 *
 * Each file contains a single-page Word document with example docxtemplater
 * placeholders. Tara replaces these files with the real branded DOCX templates.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const WORD_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

/**
 * Build a minimal word/document.xml embedding the provided lines of text.
 * Each entry in `lines` becomes a separate paragraph. Curly-brace placeholders
 * (e.g. {client_name}) are written as-is — docxtemplater resolves them at
 * render time.
 */
function buildDocumentXml(title, lines) {
  const paragraphs = lines
    .map(
      (text) => `
  <w:p>
    <w:r>
      <w:t xml:space="preserve">${text}</w:t>
    </w:r>
  </w:p>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:w="http://schemas.openxmlformats.org/wordml/2006/main"
            xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
            xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
<w:body>
  <w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
      <w:t>PLATZHALTER – TARA-CONTENT-SLOT</w:t>
    </w:r>
  </w:p>
  <w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
      <w:t>${title}</w:t>
    </w:r>
  </w:p>
  <w:p><w:r><w:t> </w:t></w:r></w:p>
  ${paragraphs}
  <w:sectPr/>
</w:body>
</w:document>`;
}

function buildDocx(title, lines) {
  const zip = new PizZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES_XML);
  zip.file('_rels/.rels', RELS_XML);
  zip.file('word/_rels/document.xml.rels', WORD_RELS_XML);
  zip.file('word/document.xml', buildDocumentXml(title, lines));
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

const templates = [
  {
    filename: 'offer-placeholder.docx',
    title: 'Angebot / Offer',
    lines: [
      'Kundin / Client: {client_name}',
      'E-Mail: {client_email}',
      'Datum / Date: {offer_date}',
      '',
      'Leistungen / Services:',
      '{services}',
      '',
      'Gesamtpreis / Total price: {price}',
      '',
      'Anmerkungen / Notes: {notes}',
    ],
  },
  {
    filename: 'contract-placeholder.docx',
    title: 'Vertrag / Contract',
    lines: [
      'Vertragsparteien / Parties:',
      'Kundin / Client: {client_name}',
      'E-Mail: {client_email}',
      'Vertragsdatum / Contract date: {contract_date}',
      '',
      'Vertragsgegenstand / Subject:',
      '{contract_text}',
      '',
      'Leistungen / Services: {services}',
      'Honorar / Fee: {price}',
      '',
      'Unterschrift / Signature: {signature_placeholder}',
    ],
  },
];

const outDir = path.join(__dirname);

for (const { filename, title, lines } of templates) {
  const outPath = path.join(outDir, filename);
  const buffer = buildDocx(title, lines);
  fs.writeFileSync(outPath, buffer);
  console.log(`Written: ${outPath} (${buffer.length} bytes)`);
}
