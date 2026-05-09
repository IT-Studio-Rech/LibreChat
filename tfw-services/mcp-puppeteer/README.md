# mcp-puppeteer

MCP server exposing a single tool — `fetch_website` — for the LibreChat Webseiten-Feedback agent. Loads any public URL with a real Chromium browser (correct User-Agent, 15 s timeout), returns HTTP status, full HTML, and a PNG screenshot as base64.

## Why custom, not @modelcontextprotocol/server-puppeteer

The official package is **deprecated and archived** (read-only repo, no security patches). It exposes `puppeteer_navigate` / `puppeteer_screenshot` as separate tools, User-Agent is not configurable, and HTTP status is not returned as structured data — all three are hard requirements for the Webseiten-Feedback agent.

---

## Tool

### `fetch_website(url: string)`

| Field | Type | Description |
|---|---|---|
| `url` | string | The URL that was fetched |
| `status` | number | HTTP status code (0 = connection error / timeout) |
| `html` | string | Full page HTML after JS rendering |
| `screenshot_base64` | string | PNG screenshot, base64-encoded (above-the-fold, 1280×900) |
| `error?` | string | Present on status 0 — human-readable error reason |

LibreChat's `mcp/parsers.ts` converts the `image` content block automatically to `image_url` for Claude Vision — no additional wiring needed.

---

## LibreChat MCP Config

Add to your LibreChat `.env` / `librechat.yaml` MCP server block:

```yaml
# librechat.yaml — mcpServers section
mcpServers:
  puppeteer:
    type: stdio
    command: node
    args:
      - /path/to/the-female-way-services/mcp-puppeteer/dist/server.js
    # No env vars required
```

Or via Docker (recommended for production — Chromium is sandboxed):

```yaml
mcpServers:
  puppeteer:
    type: stdio
    command: docker
    args:
      - run
      - --rm
      - -i
      - --memory=1g
      - --shm-size=256m
      - tfw-mcp-puppeteer
```

> Memory note: Headless Chromium needs at least 512 MB. The `--shm-size=256m` flag prevents `/dev/shm` exhaustion which causes silent crashes.

---

## Build & Run

### Local (requires Chrome/Chromium installed on the host)

```bash
cd mcp-puppeteer
npm install
npm run build
npm start
```

### Docker

```bash
cd mcp-puppeteer
docker build -t tfw-mcp-puppeteer .
docker run --rm -i --memory=1g --shm-size=256m tfw-mcp-puppeteer
```

---

## ENV vars

None required. Puppeteer is fully configured in code (User-Agent, viewport, timeout).

To override the Chromium binary path (e.g., local dev with a non-standard install):

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome npm start
```

---

## User-Agent

Hard-coded to:
```
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36
```

This string passes OnePage's bot-detection. Update `src/fetch.ts → USER_AGENT` if OnePage changes its detection fingerprint.
