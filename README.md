# ToDoList

A Notion-inspired to-do app. React + Vite + TypeScript frontend, Express 5 + SQLite backend.

## Features

- Multiple lists (e.g. one per module, project or schedule) in a Notion-style sidebar: create, rename via
  the page title, delete (with its tasks) with 5s undo; open-task counts per list; last list remembered
- Add (Enter), rename inline (click title; Enter saves, Esc cancels), complete, delete with 5s undo
- Side-peek panel for priority, due date and notes
- Overdue tasks highlighted; filter (All / Active / Completed) and sort (Manual / Due date / Priority)
- Drag-and-drop reordering (or focus the ⋮⋮ handle and use ↑/↓)
- Light/dark theme following the OS, with a remembered manual toggle
- Responsive: the sidebar becomes a slide-in drawer on phones
- Everything persists in SQLite; existing databases are migrated automatically

## Getting started

Requires Node.js 22+.

```bash
npm install                  # installs both workspaces and the git pre-commit hook
cp .env.example server/.env  # optional — defaults work out of the box
```

| Mode | Command | Open |
| --- | --- | --- |
| Development (hot reload) | `npm run dev` | http://localhost:5173 |
| Production (single port) | `npm start` | http://localhost:3001 |

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Server + client test suites (Vitest) — 102 tests, incl. a real Vite-proxy integration test |
| `npm run typecheck` | Strict TypeScript check across workspaces |
| `npm run build` | Build the client into `client/dist` |
| `npm run lint:secrets` | Scan the repo for committed secrets |
| `npm run audit` | Fail on high/critical dependency vulnerabilities |

CI (`.github/workflows/ci.yml`) runs secret scan → audit → typecheck → tests → build on every push and PR.

## Project layout

```
server/src/
  app.ts           Express app wiring (security middleware, API, static client)
  security.ts      Host allow-list, CSRF, JSON-only bodies, rate limiting, CSP
  db.ts            SQLite connection + versioned migrations (v1 tasks, v2 lists)
  schemas.ts       Zod request schemas
  lists.repo.ts    Lists SQL (open-task counts, cascade delete)
  lists.routes.ts  /api/lists and the list-scoped task routes
  tasks.repo.ts    Tasks SQL (parameterized)
  tasks.routes.ts  Single-task update/delete
client/src/
  hooks/useLists.ts          Sidebar lists: create, rename, delete with undo
  hooks/useTasks.ts          Tasks of the open list: optimistic updates, re-sync
  hooks/useDeferredDelete.ts Shared 5s-undo delete logic (flushed on tab close)
  hooks/useTheme.ts          OS-aware theme with persisted override
  components/                Sidebar, Topbar, PageTitle, TaskList/TaskRow, TaskPanel, OptionsMenu, Toasts
  styles.css                 Notion design tokens (light + dark)
```

## API

| Method & path | Description |
| --- | --- |
| `GET /api/lists` | All lists with `openCount` |
| `POST /api/lists` | Create `{ name }` |
| `PATCH /api/lists/:id` | Rename `{ name }` |
| `DELETE /api/lists/:id` | Delete a list and its tasks (`409` for the last remaining list) |
| `GET /api/lists/:id/tasks?status=all\|active\|completed&sort=position\|due\|priority` | Tasks in a list |
| `POST /api/lists/:id/tasks` | Create `{ title, notes?, priority?, dueDate? }` |
| `PUT /api/lists/:id/tasks/order` | Save manual order `{ ids: [...] }` (must list every task in the list once) |
| `PATCH /api/tasks/:id` | Partial update, incl. `{ completed: true }`; `null` clears optional fields |
| `DELETE /api/tasks/:id` | Delete one task |

Validation errors return `400 { error: "Validation failed", details: [{ path, message }] }`.

## Project notes

- [`prompt.md`](prompt.md): the original prompt that started this project
- [`reflection.md`](reflection.md): reflection on working with AI on it

## Security model

This is a single-user app that runs on your own machine, so there are no accounts or passwords.
The threats it defends against are **other websites you visit** trying to reach the local server,
**malformed input**, and **secrets or data leaking into git**.

| Threat | Defence |
| --- | --- |
| Other devices on your network | Server binds to `127.0.0.1` only |
| DNS rebinding (evil domain resolving to 127.0.0.1) | `Host` header must be `localhost` / `127.0.0.1` / `[::1]` → otherwise 403 |
| CSRF from another site | Writes rejected unless `Origin` / `Sec-Fetch-Site` are same-origin; bodies must be `application/json` (415 otherwise), which forces a CORS preflight that the server never approves |
| XSS | React escapes all output (no `dangerouslySetInnerHTML`); strict CSP: `script-src 'self'`, no inline or eval, `object-src 'none'` |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| SQL injection | Bound parameters only; sort/filter choose from fixed SQL fragments |
| Mass assignment / bad data | Strict Zod schemas reject unknown fields; SQLite `CHECK` constraints repeat the rules |
| Abuse / runaway clients | 10 KB body limit; write rate limit (600/min) |
| Information leakage | Generic error bodies (no stack traces); `x-powered-by` off; `Cache-Control: no-store` on API; `Referrer-Policy: no-referrer` |
| Secrets in git | Pre-commit **secretlint** hook + CI scan; `.env*`, `*.db`, key files gitignored |
| Vulnerable / tampered dependencies | `npm ci` from lockfile, `npm audit` in CI, GitHub Actions pinned to commit SHAs, workflow token read-only |
