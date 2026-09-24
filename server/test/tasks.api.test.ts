import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

let app: Express;

beforeEach(() => {
  app = createApp({ db: openDb(':memory:') });
});

const create = (body: Record<string, unknown>) => request(app).post('/api/tasks').send(body);

describe('POST /api/tasks', () => {
  it('creates a task with sensible defaults and a trimmed title', async () => {
    const res = await create({ title: '  Revise stacks  ' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      title: 'Revise stacks',
      notes: '',
      priority: null,
      dueDate: null,
      completed: false,
    });
  });

  it('appends new tasks to the end of the list', async () => {
    const a = await create({ title: 'A' });
    const b = await create({ title: 'B' });
    expect(b.body.position).toBeGreaterThan(a.body.position);
  });

  it.each([
    ['missing title', {}],
    ['blank title', { title: '   ' }],
    ['title over 200 chars', { title: 'x'.repeat(201) }],
    ['notes over 5000 chars', { title: 'ok', notes: 'x'.repeat(5001) }],
    ['unknown priority', { title: 'ok', priority: 'urgent' }],
    ['malformed due date', { title: 'ok', dueDate: '24/09/2026' }],
    ['impossible due date', { title: 'ok', dueDate: '2026-02-30' }],
    ['unexpected field (mass assignment)', { title: 'ok', id: 999 }],
  ])('rejects %s with 400 and field details', async (_label, body) => {
    const res = await create(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('stores SQL-looking input literally (parameterized queries)', async () => {
    const title = "x'); DROP TABLE tasks; --";
    await create({ title });

    const list = await request(app).get('/api/tasks');
    expect(list.status).toBe(200);
    expect(list.body[0].title).toBe(title);
  });
});

describe('GET /api/tasks', () => {
  beforeEach(async () => {
    await create({ title: 'Low, late', priority: 'low', dueDate: '2026-12-01' });
    await create({ title: 'No due date', priority: 'high' });
    const done = await create({ title: 'Done early', priority: 'medium', dueDate: '2026-01-01' });
    await request(app).patch(`/api/tasks/${done.body.id}`).send({ completed: true });
  });

  const titles = (res: request.Response) => res.body.map((t: { title: string }) => t.title);

  it('lists tasks in manual (position) order by default', async () => {
    const res = await request(app).get('/api/tasks');
    expect(titles(res)).toEqual(['Low, late', 'No due date', 'Done early']);
  });

  it('filters by status', async () => {
    const active = await request(app).get('/api/tasks?status=active');
    const completed = await request(app).get('/api/tasks?status=completed');
    expect(titles(active)).toEqual(['Low, late', 'No due date']);
    expect(titles(completed)).toEqual(['Done early']);
  });

  it('sorts by due date with undated tasks last', async () => {
    const res = await request(app).get('/api/tasks?sort=due');
    expect(titles(res)).toEqual(['Done early', 'Low, late', 'No due date']);
  });

  it('sorts by priority, highest first', async () => {
    const res = await request(app).get('/api/tasks?sort=priority');
    expect(titles(res)).toEqual(['No due date', 'Done early', 'Low, late']);
  });

  it('rejects unknown filter/sort values', async () => {
    expect((await request(app).get('/api/tasks?status=everything')).status).toBe(400);
    expect((await request(app).get('/api/tasks?sort=title;DROP')).status).toBe(400);
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('updates only the provided fields', async () => {
    const { body: task } = await create({ title: 'Old', notes: 'keep me', priority: 'high' });

    const res = await request(app).patch(`/api/tasks/${task.id}`).send({ title: 'New' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'New', notes: 'keep me', priority: 'high' });
  });

  it('marks complete and clears nullable fields with null', async () => {
    const { body: task } = await create({ title: 'T', dueDate: '2026-10-01', priority: 'low' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .send({ completed: true, dueDate: null, priority: null });

    expect(res.body).toMatchObject({ completed: true, dueDate: null, priority: null });
  });

  it('returns 404 for a missing task and 400 for a bad id or empty body', async () => {
    const { body: task } = await create({ title: 'T' });
    expect((await request(app).patch('/api/tasks/9999').send({ title: 'x' })).status).toBe(404);
    expect((await request(app).patch('/api/tasks/abc').send({ title: 'x' })).status).toBe(400);
    expect((await request(app).patch(`/api/tasks/${task.id}`).send({})).status).toBe(400);
  });
});

describe('DELETE', () => {
  it('deletes a single task, then 404s on repeat', async () => {
    const { body: task } = await create({ title: 'Bye' });
    expect((await request(app).delete(`/api/tasks/${task.id}`)).status).toBe(204);
    expect((await request(app).delete(`/api/tasks/${task.id}`)).status).toBe(404);
  });

  it('clears only completed tasks', async () => {
    const { body: done } = await create({ title: 'Done' });
    await create({ title: 'Open' });
    await request(app).patch(`/api/tasks/${done.id}`).send({ completed: true });

    const res = await request(app).delete('/api/tasks/completed');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: 1 });
    const list = await request(app).get('/api/tasks');
    expect(list.body.map((t: { title: string }) => t.title)).toEqual(['Open']);
  });
});

describe('PUT /api/tasks/order', () => {
  it('persists a new manual order', async () => {
    const ids = [];
    for (const title of ['A', 'B', 'C']) ids.push((await create({ title })).body.id);

    const res = await request(app).put('/api/tasks/order').send({ ids: [ids[2], ids[0], ids[1]] });

    expect(res.status).toBe(204);
    const list = await request(app).get('/api/tasks');
    expect(list.body.map((t: { title: string }) => t.title)).toEqual(['C', 'A', 'B']);
  });

  it.each([
    ['missing an id', (ids: number[]) => ids.slice(0, 2)],
    ['duplicate ids', (ids: number[]) => [ids[0], ids[0], ids[1]]],
    ['an unknown id', (ids: number[]) => [ids[0], ids[1], 9999]],
  ])('rejects an order %s', async (_label, mutate) => {
    const ids: number[] = [];
    for (const title of ['A', 'B', 'C']) ids.push((await create({ title })).body.id);

    const res = await request(app).put('/api/tasks/order').send({ ids: mutate(ids) });
    expect(res.status).toBe(400);
  });
});
