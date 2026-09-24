import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

let app: Express;
beforeEach(() => {
  app = createApp({ db: openDb(':memory:') });
});

const createList = (name: unknown) => request(app).post('/api/lists').send({ name });
const addTask = (listId: number, title: string) => request(app).post(`/api/lists/${listId}/tasks`).send({ title });
const titles = async (listId: number) =>
  (await request(app).get(`/api/lists/${listId}/tasks`)).body.map((t: { title: string }) => t.title);

describe('lists', () => {
  it('starts every workspace with a default "Tasks" list', async () => {
    const res = await request(app).get('/api/lists');
    expect(res.body).toEqual([expect.objectContaining({ id: 1, name: 'Tasks', openCount: 0 })]);
  });

  it('creates lists in order with a trimmed name', async () => {
    const res = await createList('  CS301  ');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'CS301', openCount: 0 });

    const names = (await request(app).get('/api/lists')).body.map((l: { name: string }) => l.name);
    expect(names).toEqual(['Tasks', 'CS301']);
  });

  it.each([
    ['blank name', '   '],
    ['name over 100 chars', 'x'.repeat(101)],
    ['non-string name', 42],
  ])('rejects %s', async (_label, name) => {
    expect((await createList(name)).status).toBe(400);
  });

  it('rejects unexpected fields (mass assignment)', async () => {
    expect((await request(app).post('/api/lists').send({ name: 'ok', id: 7 })).status).toBe(400);
  });

  it('renames a list and 404s for unknown lists', async () => {
    const res = await request(app).patch('/api/lists/1').send({ name: 'Inbox' });
    expect(res.body).toMatchObject({ id: 1, name: 'Inbox' });
    expect((await request(app).patch('/api/lists/99').send({ name: 'x' })).status).toBe(404);
  });

  it('counts only open tasks per list', async () => {
    const { body: list } = await createList('ESD');
    await addTask(list.id, 'Open');
    const { body: done } = await addTask(list.id, 'Done');
    await request(app).patch(`/api/tasks/${done.id}`).send({ completed: true });

    const lists = (await request(app).get('/api/lists')).body;
    expect(lists.find((l: { id: number }) => l.id === list.id).openCount).toBe(1);
  });

  it('deleting a list deletes its tasks and leaves other lists alone', async () => {
    const { body: list } = await createList('SE301');
    await addTask(list.id, 'Gone with the list');
    await addTask(1, 'Survivor');

    expect((await request(app).delete(`/api/lists/${list.id}`)).status).toBe(204);

    expect((await request(app).get(`/api/lists/${list.id}/tasks`)).status).toBe(404);
    expect(await titles(1)).toEqual(['Survivor']);
  });

  it('refuses to delete the last remaining list', async () => {
    expect((await request(app).delete('/api/lists/1')).status).toBe(409);
  });
});

describe('tasks are scoped to their list', () => {
  it('only lists tasks from the requested list', async () => {
    const { body: other } = await createList('Other');
    await addTask(1, 'In Tasks');
    await addTask(other.id, 'In Other');

    expect(await titles(1)).toEqual(['In Tasks']);
    expect(await titles(other.id)).toEqual(['In Other']);
  });

  it('404s when adding a task to a list that does not exist', async () => {
    expect((await addTask(99, 'Orphan')).status).toBe(404);
  });

  it('will not reorder using a task from another list', async () => {
    const { body: other } = await createList('Other');
    const { body: mine } = await addTask(1, 'Mine');
    const { body: theirs } = await addTask(other.id, 'Theirs');

    const res = await request(app).put('/api/lists/1/tasks/order').send({ ids: [theirs.id, mine.id] });
    expect(res.status).toBe(400);
  });
});
