# ToDoList

A Notion-inspired to-do app. React + Vite + TypeScript frontend, Express 5 + SQLite backend.

## Getting started

```bash
npm install          # installs both workspaces and the git pre-commit hook
cp .env.example server/.env
npm run dev          # API on :3001, UI on :5173 (proxied /api)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Run server + client test suites (Vitest) |
| `npm run typecheck` | Strict TypeScript check across workspaces |
| `npm run lint:secrets` | Scan the repo for committed secrets |

## Security (shift-left)

- Pre-commit hook runs **secretlint** on staged files and blocks the commit if a secret is found.
- `.env*`, SQLite `*.db` files and key material are gitignored; only `.env.example` is committed.
- API: `helmet` security headers, `x-powered-by` disabled, 10 KB JSON body limit, generic error
  responses (no stack traces), server bound to `127.0.0.1`.
