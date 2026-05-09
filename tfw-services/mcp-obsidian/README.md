# TFW MCP Obsidian Vault Server

MCP server that exposes the The Female Way knowledge vault to LibreChat agents via stdio transport.

## Vault Repository Setup

Create a **private** GitHub repository (e.g. `the-female-way/vault`) with the following structure:

```
vault/
├── raw/                        ← Uploaded source files (PDFs, DOCX, images …)
│   ├── nischenfindung/
│   ├── angebot/
│   ├── sales/
│   └── webseite/
└── wiki/                       ← Processed Markdown notes (read by MCP server)
    ├── 01-nischenfindung/
    ├── 02-angebot/
    ├── 03-sales/
    └── 04-webseite/
```

The `raw/` folder receives uploads from the admin UI. A pipeline processes raw files into `wiki/` Markdown notes.

## Frontmatter Convention

Every `wiki/**/*.md` note should include:

```yaml
---
title: "Human-readable note title"
source_id: "unique-identifier"
source_url: "https://original-source-link-if-any"
category: "nischenfindung"        # nischenfindung | angebot | sales | webseite
tags: [tag1, tag2]
created: 2025-01-01
---
```

The `source_url` field is surfaced in search results so agents can link back to origin content.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `VAULT_REPO_OWNER` | yes | — | GitHub org/user that owns the vault repo |
| `VAULT_REPO_NAME` | yes | — | Repository name (e.g. `vault`) |
| `VAULT_GITHUB_TOKEN` | yes | — | GitHub PAT with `repo` (read) scope |
| `VAULT_CACHE_DIR` | no | `./vault-cache` | Where the repo is cloned locally |
| `VAULT_PULL_INTERVAL_MS` | no | `600000` | Auto-pull interval (ms); default 10 min |

## Development

```bash
cd mcp-obsidian
npm install
# Set env vars (or create .env and source it)
export VAULT_REPO_OWNER=the-female-way
export VAULT_REPO_NAME=vault
export VAULT_GITHUB_TOKEN=ghp_...

npm run dev
```

## Build & Start

```bash
npm run build
npm start
```

## Registering in LibreChat

Add the server to your LibreChat `librechat.yaml` under `mcpServers`:

```yaml
mcpServers:
  tfw-vault:
    type: stdio
    command: node
    args:
      - /path/to/mcp-obsidian/dist/server.js
    env:
      VAULT_REPO_OWNER: the-female-way
      VAULT_REPO_NAME: vault
      VAULT_GITHUB_TOKEN: "${VAULT_GITHUB_TOKEN}"
      VAULT_CACHE_DIR: /tmp/tfw-vault-cache
```

Or for development with `tsx`:

```yaml
mcpServers:
  tfw-vault:
    type: stdio
    command: npx
    args:
      - tsx
      - /path/to/mcp-obsidian/src/server.ts
    env:
      VAULT_REPO_OWNER: the-female-way
      VAULT_REPO_NAME: vault
      VAULT_GITHUB_TOKEN: "${VAULT_GITHUB_TOKEN}"
```

## MCP Tools

| Tool | Input | Output |
|---|---|---|
| `search_vault` | `{ query: string }` | `SearchResult[]` — top 5 matches with path, title, snippet, score, source_url |
| `get_note` | `{ path: string }` | `{ content, frontmatter }` or `null` |
| `list_notes` | `{ folder?: string }` | `{ path, title }[]` |

## Seeding Initial Notes

The wiki directory is populated by the processing pipeline — not manually. To test locally, create placeholder files:

```bash
mkdir -p vault-cache/wiki/01-nischenfindung
cat > vault-cache/wiki/01-nischenfindung/intro.md << 'EOF'
---
title: "Nischenfindung — Einführung"
category: nischenfindung
---

Placeholder note. Replace with real pipeline output.
EOF
```
