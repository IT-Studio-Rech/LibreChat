import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { fillTemplate } from './templater';

/** Build a minimal valid DOCX buffer containing `text` as a single paragraph. */
function buildMinimalDocx(text: string): Buffer {
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordml/2006/main">
<w:body>
  <w:p>
    <w:r>
      <w:t xml:space="preserve">${text}</w:t>
    </w:r>
  </w:p>
  <w:sectPr/>
</w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('word/_rels/document.xml.rels', wordRelsXml);
  zip.file('word/document.xml', documentXml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
}

/** Extract raw text from a DOCX buffer via PizZip (no full parse needed). */
function extractDocxText(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  const xml = zip.file('word/document.xml')?.asText() ?? '';
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

describe('fillTemplate', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'templater-spec-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('replaces placeholders and returns a valid DOCX buffer', async () => {
    const templateBuffer = buildMinimalDocx('Hello {client_name}, your price is {price}.');
    const templatePath = path.join(tmpDir, 'test-template.docx');
    await fs.writeFile(templatePath, templateBuffer);

    const result = await fillTemplate(templatePath, { client_name: 'Lisa', price: '€ 999' });

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    const text = extractDocxText(result);
    expect(text).toContain('Lisa');
    expect(text).toContain('€ 999');
    expect(text).not.toContain('{client_name}');
    expect(text).not.toContain('{price}');
  });

  it('throws a clear error when the template file does not exist', async () => {
    const missing = path.join(tmpDir, 'nonexistent.docx');
    await expect(fillTemplate(missing, { foo: 'bar' })).rejects.toThrow(
      /Template file not found/,
    );
  });

  it('returns a buffer that can be re-parsed by docxtemplater without errors', async () => {
    const templateBuffer = buildMinimalDocx('{greeting}');
    const templatePath = path.join(tmpDir, 'round-trip.docx');
    await fs.writeFile(templatePath, templateBuffer);

    const result = await fillTemplate(templatePath, { greeting: 'Willkommen' });

    expect(() => {
      const zip = new PizZip(result);
      new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    }).not.toThrow();
  });
});
