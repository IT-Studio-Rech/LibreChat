# The Female Way — Deployment & Architecture Reference

Source of truth for system architecture, local dev setup, and pre-launch checklist.
Keep this file in sync when ports, env vars, or service boundaries change.

---

## Architecture Overview

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  LibreChat Fork              │        │  External Services           │
│  Express (API) + React (SPA) │◀──────▶│  Express + TypeScript        │
│  :3080 backend               │  HTTP  │  + Mongoose                  │
│  :3090 frontend (dev)        │  HMAC  │  :3001                       │
└──────────┬───────────────────┘        └──────────────┬───────────────┘
           │                                           │
           │                                           ▼
           │                              ┌────────────────────────┐
           │                              │  MongoDB               │
           │                              │  Atlas EU (Frankfurt)  │
           │                              │  — or local :27017 —   │
           │                              └────────────────────────┘
           │
           ├─ stdio ──▶  MCP Obsidian Vault Server
           │                 (node child process, spawned by LibreChat)
           │                 ▼
           │             GitHub Vault Repo (private)
           │             + parallel synthesis pipeline
           │
           └─ stdio ──▶  MCP Puppeteer Server
                         (node running inside tfw-puppeteer-mcp container)
                         ▼
                     Chromium (headless, 1 GB memory limit)
```

LibreChat is the single user-facing entry point. The External Services repo handles
data persistence for custom domain objects (ICP profiles, bonus codes, webinar data).
Both MCP servers are spawned via stdio — no HTTP ports are opened for them.

---

## Tech Stack

| Component | Stack | Repo |
|---|---|---|
| LibreChat Fork | TypeScript, React, Node.js, Express | LibreChat (this repo) |
| External Services | Express + TypeScript + Mongoose | the-female-way-services |
| Vault MCP Server | TypeScript + lunr + chokidar | the-female-way-services/mcp-obsidian |
| Puppeteer MCP Server | TypeScript + Puppeteer + Chromium | the-female-way-services/mcp-puppeteer |
| Database | MongoDB Atlas EU (Frankfurt) — not Supabase | external (see TECH-DECISIONS §3) |
| File Storage | Firebase Storage europe-west1 | external |
| LLM | Multi-provider: Anthropic / OpenAI / Google. MVP default: claude-sonnet-4-6 | API keys in .env |
| Vault | GitHub private repo + GitHub Actions synthesis pipeline | external (Davi) |

---

## Port Mapping

| Port | Service | Notes |
|---|---|---|
| 3080 | LibreChat Backend | Express API, always running |
| 3090 | LibreChat Frontend | Vite dev server (dev only) |
| 3001 | External Services | Express API |
| 27017 | MongoDB | Local dev only; production uses Atlas EU |
| — | MCP Obsidian | stdio, no port |
| — | MCP Puppeteer | stdio via `docker exec`, no exposed port |

---

## Environment Variables Reference

### LibreChat (`.env` in repo root)

```dotenv
# Branding
APP_TITLE=The Female Way
HELP_AND_FAQ_URL=https://skool.com/the-female-way

# LLM API Keys
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=

# Default model (optional — defaults to claude-sonnet-4-6 / anthropic)
TFW_DEFAULT_MODEL=claude-sonnet-4-6
TFW_DEFAULT_PROVIDER=anthropic

# Database
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/LibreChat

# Firebase Storage
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# External Services integration
TFW_SERVICES_BASE_URL=http://localhost:3001
TFW_SERVICES_SHARED_SECRET=<generate: openssl rand -hex 32>

# Vault / MCP Obsidian
VAULT_REPO_OWNER=
VAULT_REPO_NAME=
VAULT_GITHUB_TOKEN=
VAULT_DEFAULT_BRANCH=main

# Optional: PDF generation via LibreOffice
OFFICE_PREVIEW_LIBREOFFICE=/usr/bin/libreoffice
```

### External Services (`the-female-way-services/.env`)

```dotenv
PORT=3001
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/the-female-way
TFW_SERVICES_SHARED_SECRET=<same value as LibreChat>
```

### MCP Obsidian (`the-female-way-services/mcp-obsidian/.env` or inherited from parent)

```dotenv
VAULT_REPO_OWNER=
VAULT_REPO_NAME=
VAULT_GITHUB_TOKEN=
VAULT_CACHE_DIR=/tmp/vault-cache          # optional, defaults to system tmp
VAULT_PULL_INTERVAL_MS=300000             # optional, default 5 min
```

### MCP Puppeteer

No additional env vars required. Chromium is bundled via the Dockerfile.
Memory and shm limits are set at the container level (see docker-compose.yml).

---

## Local Dev Setup

### Prerequisites

- Node.js v20.19.0+ or ^22.12.0 or >= 23.0.0
- Docker Desktop (for MongoDB locally and Puppeteer container)
- MongoDB Atlas account (for production) or local Docker MongoDB (for dev)

### Step-by-step

```bash
# Terminal 1 — External Services
cd ~/rechstudio/the-female-way-services
cp .env.example .env
# Edit .env: set MONGO_URI and TFW_SERVICES_SHARED_SECRET

docker-compose up           # starts mongodb + services
# OR without Docker (local Node):
# npm install && npm run dev

# Terminal 2 — LibreChat backend
cd ~/rechstudio/LibreChat
cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY, MONGO_URI, VAULT_*, TFW_SERVICES_*

npm run smart-reinstall     # installs deps + builds all packages (Turborepo)
npm run backend:dev         # starts Express on :3080

# Terminal 3 — LibreChat frontend (dev HMR)
cd ~/rechstudio/LibreChat
npm run frontend:dev        # starts Vite on :3090 (requires backend running)

# First-run only — seed agents and open admin UI for bonus codes
npm run seed:agents         # requires an admin user to already be registered
# Open http://localhost:3090/admin/bonus-codes to generate registration codes
```

### MCP Puppeteer (memory-intensive — run in container)

```bash
cd ~/rechstudio/the-female-way-services
docker-compose --profile mcp up mcp-puppeteer -d
# Container name: tfw-puppeteer-mcp
# LibreChat invokes it via: docker exec tfw-puppeteer-mcp node /app/dist/server.js
```

### MCP Obsidian (stdio child process — no container needed)

```bash
cd ~/rechstudio/the-female-way-services/mcp-obsidian
npm install && npm run build
# Register in librechat.yaml (see below) — LibreChat spawns it automatically.
```

---

## MCP Server Registration in `librechat.yaml`

Add this block to the `mcpServers` section of `librechat.yaml`:

```yaml
mcpServers:
  obsidian-vault:
    type: stdio
    command: node
    args:
      - /Users/<you>/rechstudio/the-female-way-services/mcp-obsidian/dist/server.js
    env:
      VAULT_REPO_OWNER: ${VAULT_REPO_OWNER}
      VAULT_REPO_NAME: ${VAULT_REPO_NAME}
      VAULT_GITHUB_TOKEN: ${VAULT_GITHUB_TOKEN}
      VAULT_DEFAULT_BRANCH: ${VAULT_DEFAULT_BRANCH}

  puppeteer:
    type: stdio
    command: docker
    args:
      - exec
      - -i
      - tfw-puppeteer-mcp
      - node
      - /app/dist/server.js
```

Paths must be absolute. Replace `/Users/<you>` with the actual home directory.
The `tfw-puppeteer-mcp` container must be running before LibreChat starts.

---

## Production Deploy Notes

Production hosting is out of scope for this plan and will be handled by the team.

Recommended stack (DSGVO-compliant, EU-region):

| Tier | Option |
|---|---|
| LibreChat (full-stack) | Render (EU region) or self-hosted VPS |
| External Services | Fly.io (fra) or Railway (EU) |
| Database | MongoDB Atlas EU — Frankfurt (already configured) |
| File Storage | Firebase Storage europe-west1 (already configured) |
| Puppeteer Container | Same host as External Services |

DSGVO requirements: all data must remain in EU. Atlas EU + Firebase europe-west1 +
EU-region hosting satisfies this. Verify any chosen hosting provider signs an AVV
(Auftragsverarbeitungsvertrag). See `DSGVO.md` for the full compliance checklist.

---

## Pre-Launch Checklist

A shorter mirror of the full list in `OPEN-DETAILS.md`:

- [ ] All Tara content slots filled (agent system prompts, landing page copy)
- [ ] Bonus codes generated for first webinar cohort
- [ ] Vault initially seeded with real content (at least Modul A + B)
- [ ] Skool deep-link URL format confirmed and tested
- [ ] DSGVO tasks completed (see `DSGVO.md`):
  - [ ] AVV signed with all data processors (Atlas, Firebase, hosting, Anthropic)
  - [ ] Datenschutzerklärung published
  - [ ] Impressum published
  - [ ] ZDR (Zugangsdaten-Register) up to date
- [ ] All four agents smoke-tested end-to-end in production environment
- [ ] Admin UI for bonus code management verified with real user registration flow

---

## Demo Walkthrough

For Davi / Jonas when a demo date is scheduled. Shows Tara a full local run.

**Preparation (15 min before)**

1. Start Docker Desktop.
2. In `the-female-way-services`: `docker-compose up` — wait for mongodb + services healthy.
3. Start Puppeteer container: `docker-compose --profile mcp up mcp-puppeteer -d`.
4. In LibreChat: `npm run backend:dev` (Terminal 2), then `npm run frontend:dev` (Terminal 3).
5. Confirm http://localhost:3090 loads without errors.

**Demo flow (20–30 min)**

1. Open http://localhost:3090 — show the branded landing page with the four module tiles.
2. Log in as the admin user.
3. Navigate to Mein Profil — show the tab structure (Avatar, ICP, Webinar history).
4. Open Admin panel at `/admin/bonus-codes` — show code generation and redemption tracking.
5. Start a conversation in Modul B (ICP Builder):
   - Walk through the ICP questions.
   - Show the `save_icp` tool call firing in the chat (visible as an agent action).
   - Navigate to Avatar tab — ICP data now populated.
6. Start a conversation in Modul A (Sales Coach):
   - Show that the ICP context loads automatically without user input.
7. Start a conversation in Modul C (Website Feedback):
   - Enter a real URL and show Puppeteer taking a screenshot and returning feedback.
8. Start a conversation in Modul D (Wiki / Knowledge Base):
   - Ask a question that triggers a vault query.
   - Show the source attribution in the response.
