# ToDoList

A Notion-inspired to-do app. React + Vite + TypeScript frontend, Express 5 + SQLite backend.

## Features

- Add (Enter), rename inline (click title; Enter saves, Esc cancels), complete, delete with 5s undo
- Side-peek panel for priority, due date and notes
- Overdue tasks highlighted; filter (All / Active / Completed) and sort (Manual / Due date / Priority)
- Drag-and-drop reordering (or focus the ⋮⋮ handle and use ↑/↓)
- Light/dark theme following the OS, with a remembered manual toggle
- Everything persists in SQLite

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

## API

| Method & path | Description |
| --- | --- |
| `GET /api/tasks?status=all\|active\|completed&sort=position\|due\|priority` | List tasks |
| `POST /api/tasks` | Create `{ title, notes?, priority?, dueDate? }` |
| `PATCH /api/tasks/:id` | Partial update, incl. `{ completed: true }`; `null` clears optional fields |
| `DELETE /api/tasks/:id` | Delete one task |
| `PUT /api/tasks/order` | Save manual order `{ ids: [...] }` (must list every task once) |

Validation errors return `400 { error: "Validation failed", details: [{ path, message }] }`.

## Security (shift-left)

- Pre-commit hook runs **secretlint** on staged files and blocks the commit if a secret is found.
- `.env*`, SQLite `*.db` files and key material are gitignored; only `.env.example` is committed.
- API: `helmet` security headers, `x-powered-by` disabled, 10 KB JSON body limit, generic error
  responses (no stack traces), server bound to `127.0.0.1`.
- Input validated with strict Zod schemas (unknown fields rejected — no mass assignment); SQLite
  `CHECK` constraints enforce the same rules as a second layer.
- All SQL uses bound parameters; sort/filter options map to fixed SQL fragments via allow-lists.
