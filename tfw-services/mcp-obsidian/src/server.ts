import path from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { VaultLoader } from './vault.js';
import type { VaultConfig } from './types.js';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

const config: VaultConfig = {
  repoOwner: requireEnv('VAULT_REPO_OWNER'),
  repoName: requireEnv('VAULT_REPO_NAME'),
  githubToken: requireEnv('VAULT_GITHUB_TOKEN'),
  cacheDir: process.env['VAULT_CACHE_DIR'] ?? path.resolve('./vault-cache'),
  pullIntervalMs: Number(process.env['VAULT_PULL_INTERVAL_MS'] ?? 600_000),
};

const vault = new VaultLoader(config);

const server = new Server(
  { name: 'tfw-obsidian-vault', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [
    {
      name: 'search_vault',
      description: 'Full-text search across the TFW knowledge vault (wiki/**/*.md). Returns up to 5 matches.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_note',
      description: 'Read the full content and frontmatter of a vault note by its relative path.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          path: {
            type: 'string',
            description: 'Relative path from vault root, e.g. "wiki/01-nischenfindung/intro.md"',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'list_notes',
      description: 'List all vault notes, optionally filtered to a folder prefix.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          folder: {
            type: 'string',
            description: 'Optional folder prefix, e.g. "wiki/01-nischenfindung"',
          },
        },
        required: [],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, (req) => {
  const { name, arguments: args } = req.params;

  if (name === 'search_vault') {
    const query = String((args as Record<string, unknown>)['query'] ?? '');
    const results = vault.search(query);
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }

  if (name === 'get_note') {
    const notePath = String((args as Record<string, unknown>)['path'] ?? '');
    const note = vault.getNote(notePath);
    return {
      content: [
        {
          type: 'text',
          text: note === null ? 'null' : JSON.stringify(note, null, 2),
        },
      ],
    };
  }

  if (name === 'list_notes') {
    const folder =
      typeof (args as Record<string, unknown>)['folder'] === 'string'
        ? String((args as Record<string, unknown>)['folder'])
        : undefined;
    const list = vault.listNotes(folder);
    return { content: [{ type: 'text', text: JSON.stringify(list, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main(): Promise<void> {
  await vault.init();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[mcp-obsidian] Fatal:', err);
  process.exit(1);
});
