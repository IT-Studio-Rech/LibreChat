import fs from 'node:fs/promises';
import path from 'node:path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { logger } from '@librechat/data-schemas';

export interface TemplateData {
  [key: string]: string | number | TemplateData[] | undefined;
}

/** Render a docxtemplater DOCX template with `data` and return the filled buffer. */
export async function fillTemplate(templatePath: string, data: TemplateData): Promise<Buffer> {
  let raw: Buffer;
  try {
    raw = await fs.readFile(templatePath);
  } catch (err) {
    throw new Error(
      `Template file not found: "${templatePath}" — ${(err as Error).message}`,
    );
  }

  try {
    const zip = new PizZip(raw);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(data);
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
  } catch (err) {
    const e = err as Error & { properties?: { errors?: unknown[] } };
    logger.error('[templater] Template rendering failed', {
      template: templatePath,
      message: e.message,
      errors: e.properties?.errors,
    });
    throw new Error(`Template rendering failed: ${e.message}`);
  }
}

/** Absolute path to the repo-level templates/ directory. */
export function templatesDir(): string {
  return path.join(process.cwd(), 'templates');
}
