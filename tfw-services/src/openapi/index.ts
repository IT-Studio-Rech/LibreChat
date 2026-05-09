import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { userContextOpenApi } from '../userContext/openapi.js';
import { leadsOpenApi } from '../leads/openapi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const combined = {
  openapi: '3.0.3',
  info: {
    title: 'The Female Way — External Services',
    version: '0.1.0',
    description: 'Combined OpenAPI spec for LibreChat agent tool registration.',
  },
  paths: {
    ...userContextOpenApi.paths,
    ...leadsOpenApi.paths,
  },
  components: {
    schemas: {
      ...userContextOpenApi.components.schemas,
      ...leadsOpenApi.components.schemas,
    },
  },
};

const outDir = resolve(__dirname, '../../dist');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'openapi.json');
writeFileSync(outPath, JSON.stringify(combined, null, 2), 'utf-8');
console.log(`OpenAPI spec written to ${outPath}`);
