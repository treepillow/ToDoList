import type { NewTask, SortOrder, StatusFilter, Task, TaskChanges, TaskList } from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const send = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const keepaliveDelete = (keepalive: boolean): RequestInit =>
  keepalive ? { method: 'DELETE', keepalive } : { method: 'DELETE' };

export const api = {
  listLists: () => request<TaskList[]>('/api/lists', { method: 'GET' }),
  createList: (name: string) => request<TaskList>('/api/lists', send('POST', { name })),
  renameList: (id: number, name: string) => request<TaskList>(`/api/lists/${id}`, send('PATCH', { name })),
  deleteList: (id: number, { keepalive = false } = {}) => request<void>(`/api/lists/${id}`, keepaliveDelete(keepalive)),

  listTasks: (listId: number, { status, sort }: { status: StatusFilter; sort: SortOrder }) =>
    request<Task[]>(`/api/lists/${listId}/tasks?${new URLSearchParams({ status, sort })}`, { method: 'GET' }),
  createTask: (listId: number, task: NewTask) => request<Task>(`/api/lists/${listId}/tasks`, send('POST', task)),
  updateTask: (id: number, changes: TaskChanges) => request<Task>(`/api/tasks/${id}`, send('PATCH', changes)),
  /** `keepalive` lets the request finish even if the page is being closed. */
  deleteTask: (id: number, { keepalive = false } = {}) => request<void>(`/api/tasks/${id}`, keepaliveDelete(keepalive)),
  reorder: (listId: number, ids: number[]) => request<void>(`/api/lists/${listId}/tasks/order`, send('PUT', { ids })),
};
