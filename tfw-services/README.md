# The Female Way — External Services

Express + TypeScript + Mongoose service backend for LibreChat agent tools.

## Services

- **User Context (ICP)** — `/icp` — Stores and retrieves user ICP profiles and coaching state.
- **Lead Memory** — `/leads` — CRM-style lead tracking with follow-up scheduling.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your values
npm install
npm run dev
```

Or with Docker:

```bash
docker compose up
```

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default: 3001) |
| `MONGO_URI` | MongoDB connection URI |
| `TFW_SERVICES_SHARED_SECRET` | Shared secret for Bearer auth |
| `NODE_ENV` | `development` or `production` |

## Auth

All endpoints except `GET /health` require:
- `Authorization: Bearer <TFW_SERVICES_SHARED_SECRET>`
- `X-User-Id: <user_id>`

## OpenAPI

Generate combined spec:

```bash
npm run build:openapi
# → dist/openapi.json
```

## Tests

```bash
npm test
```
