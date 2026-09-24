import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createApp } from './app.js';
import { openDb } from './db.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const port = Number(process.env.PORT ?? 3001);
const dbPath = resolve(process.env.DB_PATH ?? './data/todos.db');
mkdirSync(dirname(dbPath), { recursive: true });

const db = openDb(dbPath);

// Serve the built UI when it exists (`npm run build`), so one port runs the whole app.
const clientDist = join(import.meta.dirname, '../../client/dist');
const staticDir = existsSync(join(clientDist, 'index.html')) ? clientDist : undefined;

// Bind to loopback only: this is a single-user local app.
const server = createApp({ db, staticDir }).listen(port, '127.0.0.1', () => {
  console.log(`${staticDir ? 'App' : 'API'} listening on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => db.close()));
}
