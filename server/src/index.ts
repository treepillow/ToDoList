import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createApp } from './app.js';
import { openDb } from './db.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const port = Number(process.env.PORT ?? 3001);
const dbPath = resolve(process.env.DB_PATH ?? './data/todos.db');
mkdirSync(dirname(dbPath), { recursive: true });

const db = openDb(dbPath);
// Bind to loopback only: this is a single-user local app.
const server = createApp({ db }).listen(port, '127.0.0.1', () => {
  console.log(`API listening on http://127.0.0.1:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => db.close()));
}
