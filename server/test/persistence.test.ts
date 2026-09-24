import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

let dir: string;
afterEach(() => rmSync(dir, { recursive: true, force: true }));

it('keeps tasks after the database is closed and reopened', async () => {
  dir = mkdtempSync(join(tmpdir(), 'todolist-'));
  const file = join(dir, 'todos.db');

  const first = openDb(file);
  await request(createApp({ db: first })).post('/api/tasks').send({ title: 'Survive restart' });
  first.close();

  const second = openDb(file);
  const res = await request(createApp({ db: second })).get('/api/tasks');
  second.close();

  expect(res.body.map((t: { title: string }) => t.title)).toEqual(['Survive restart']);
});
