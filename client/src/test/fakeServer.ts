import { vi } from 'vitest';
import type { Task } from '../types';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

interface Call {
  method: string;
  path: string;
  body?: unknown;
}

const json = (body: unknown, status = 200) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/**
 * In-memory stand-in for the Express API, installed as `fetch`.
 * Lets UI tests assert on what the "server" ended up storing.
 */
export function fakeServer(seed: Partial<Task>[] = []) {
  let nextId = 1;
  const make = (fields: Partial<Task>): Task => {
    const id = nextId++;
    return {
      id,
      title: 'Task',
      notes: '',
      priority: null,
      dueDate: null,
      completed: false,
      position: id,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      ...fields,
    };
  };

  let tasks: Task[] = seed.map(make);
  const calls: Call[] = [];
  let failures = 0;

  const handle = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path: url.pathname, body });

    if (failures > 0) {
      failures--;
      return json({ error: 'Internal server error' }, 500);
    }

    const idMatch = url.pathname.match(/^\/api\/tasks\/(\d+)$/);
    const task = idMatch ? tasks.find((t) => t.id === Number(idMatch[1])) : undefined;

    if (method === 'GET' && url.pathname === '/api/tasks') {
      const status = url.searchParams.get('status');
      const sort = url.searchParams.get('sort');
      let list = tasks.filter((t) =>
        status === 'active' ? !t.completed : status === 'completed' ? t.completed : true,
      );
      list = [...list].sort((a, b) => {
        if (sort === 'priority') {
          return (a.priority ? PRIORITY_RANK[a.priority] : 3) - (b.priority ? PRIORITY_RANK[b.priority] : 3);
        }
        if (sort === 'due') return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
        return a.position - b.position;
      });
      return json(list);
    }
    if (method === 'POST' && url.pathname === '/api/tasks') {
      const created = make({ ...body, title: body.title.trim() });
      tasks.push(created);
      return json(created, 201);
    }
    if (method === 'PUT' && url.pathname === '/api/tasks/order') {
      body.ids.forEach((id: number, i: number) => {
        tasks.find((t) => t.id === id)!.position = i + 1;
      });
      return json(undefined, 204);
    }
    if (idMatch && !task) return json({ error: 'Task not found' }, 404);
    if (method === 'PATCH' && task) {
      Object.assign(task, body);
      return json(task);
    }
    if (method === 'DELETE' && task) {
      tasks = tasks.filter((t) => t !== task);
      return json(undefined, 204);
    }
    return json({ error: 'Not found' }, 404);
  };

  vi.spyOn(globalThis, 'fetch').mockImplementation(handle as typeof fetch);

  return {
    /** Tasks as stored "server-side", in manual order. */
    get tasks() {
      return [...tasks].sort((a, b) => a.position - b.position);
    },
    calls,
    /** Makes the next `count` requests fail with a 500. */
    failNext(count = 1) {
      failures = count;
    },
  };
}
