import { vi } from 'vitest';
import type { Task, TaskList } from '../types';

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

type FakeTask = Task & { listId: number };

/**
 * In-memory stand-in for the Express API, installed as `fetch`.
 * Lets UI tests assert on what the "server" ended up storing.
 * Tasks go into list 1 ("Tasks") unless they name a `listId`.
 */
export function fakeServer(seed: Partial<FakeTask>[] = [], { lists: listSeed = [] as string[] } = {}) {
  let nextId = 1;
  let nextListId = 1;
  let lists: Omit<TaskList, 'openCount'>[] = [];
  const makeList = (name: string) => {
    const id = nextListId++;
    const list = { id, name, position: id, createdAt: '2026-09-01T00:00:00.000Z' };
    lists.push(list);
    return list;
  };
  ['Tasks', ...listSeed].forEach(makeList);
  const withCount = (l: Omit<TaskList, 'openCount'>): TaskList => ({
    ...l,
    openCount: tasks.filter((t) => t.listId === l.id && !t.completed).length,
  });

  const make = (fields: Partial<FakeTask>): FakeTask => {
    const id = nextId++;
    return {
      listId: 1,
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

  let tasks: FakeTask[] = seed.map(make);
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
    const listMatch = url.pathname.match(/^\/api\/lists\/(\d+)(\/tasks(\/order)?)?$/);
    const list = listMatch ? lists.find((l) => l.id === Number(listMatch[1])) : undefined;
    if (listMatch && !list) return json({ error: 'List not found' }, 404);

    if (url.pathname === '/api/lists') {
      if (method === 'GET') return json(lists.map(withCount));
      if (method === 'POST') return json(withCount(makeList(body.name.trim())), 201);
    }
    if (list && !listMatch![2]) {
      if (method === 'PATCH') return json(withCount(Object.assign(list, { name: body.name.trim() })));
      if (method === 'DELETE') {
        if (lists.length === 1) return json({ error: 'Cannot delete the last list' }, 409);
        lists = lists.filter((l) => l !== list);
        tasks = tasks.filter((t) => t.listId !== list.id);
        return json(undefined, 204);
      }
    }

    if (method === 'GET' && list && listMatch![2] && !listMatch![3]) {
      const status = url.searchParams.get('status');
      const sort = url.searchParams.get('sort');
      let result = tasks.filter(
        (t) => t.listId === list.id && (status === 'active' ? !t.completed : status === 'completed' ? t.completed : true),
      );
      result = [...result].sort((a, b) => {
        if (sort === 'priority') {
          return (a.priority ? PRIORITY_RANK[a.priority] : 3) - (b.priority ? PRIORITY_RANK[b.priority] : 3);
        }
        if (sort === 'due') return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
        return a.position - b.position;
      });
      return json(result);
    }
    if (method === 'POST' && list && listMatch![2]) {
      const created = make({ ...body, title: body.title.trim(), listId: list.id });
      tasks.push(created);
      return json(created, 201);
    }
    if (method === 'PUT' && list && listMatch![3]) {
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
    get lists() {
      return lists.map(withCount);
    },
    calls,
    /** Makes the next `count` requests fail with a 500. */
    failNext(count = 1) {
      failures = count;
    },
  };
}
