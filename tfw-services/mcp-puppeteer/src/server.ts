import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fetchWebsite } from './fetch.js';

const server = new Server(
  { name: 'tfw-puppeteer', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [
    {
      name: 'fetch_website',
      description:
        'Loads a public URL with a real browser (Chromium), returns HTTP status, full HTML, and a PNG screenshot (base64). Use for reachability checks and visual analysis.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          url: {
            type: 'string',
            description: 'The fully-qualified URL to fetch, e.g. https://example.onepage.me',
          },
        },
        required: ['url'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name !== 'fetch_website') {
    throw new Error(`Unknown tool: ${name}`);
  }

  const url = String((args as Record<string, unknown>)['url'] ?? '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            url,
            status: 0,
            html: '',
            screenshot_base64: '',
            error: 'invalid URL — must start with http:// or https://',
          }),
        },
      ],
    };
  }

  const result = await fetchWebsite(url);

  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
  > = [
    {
      type: 'text',
      text: JSON.stringify({
        url: result.url,
        status: result.status,
        html: result.html,
        error: result.error,
      }),
    },
  ];

  if (result.screenshot_base64) {
    content.push({
      type: 'image',
      data: result.screenshot_base64,
      mimeType: 'image/png',
    });
  }

  return { content };
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('[mcp-puppeteer] Fatal:', err);
  process.exit(1);
});
