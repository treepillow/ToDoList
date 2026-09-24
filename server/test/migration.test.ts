import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import request from 'supertest';
import { afterEach, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

let dir: string;
afterEach(() => rmSync(dir, { recursive: true, force: true }));

it('upgrades a database from before lists existed without losing tasks', async () => {
  dir = mkdtempSync(join(tmpdir(), 'todolist-migrate-'));
  const file = join(dir, 'todos.db');

  // Snapshot of the schema as shipped in schema version 1.
  const old = new Database(file);
  old.exec(`CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
    priority TEXT, due_date TEXT, completed INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z', updated_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z');
    INSERT INTO tasks (title, position) VALUES ('Existing task', 1);
    PRAGMA user_version = 1;`);
  old.close();

  const db = openDb(file);
  const res = await request(createApp({ db })).get('/api/lists/1/tasks');
  db.close();

  expect(res.body.map((t: { title: string }) => t.title)).toEqual(['Existing task']);
});
