import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './api';

const mockFetch = (status: number, body?: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );

afterEach(() => vi.restoreAllMocks());

describe('api client', () => {
  it('passes filter and sort as query parameters', async () => {
    const fetch = mockFetch(200, []);
    await api.listTasks(3, { status: 'completed', sort: 'due' });
    expect(fetch).toHaveBeenCalledWith('/api/lists/3/tasks?status=completed&sort=due', expect.anything());
  });

  it('sends JSON bodies with the right method and content type', async () => {
    const fetch = mockFetch(200, { id: 1 });
    await api.updateTask(1, { completed: true });
    expect(fetch).toHaveBeenCalledWith('/api/tasks/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    });
  });

  it('resolves to undefined for 204 No Content', async () => {
    mockFetch(204);
    await expect(api.deleteTask(1)).resolves.toBeUndefined();
  });

  it('throws ApiError carrying the server message and status', async () => {
    mockFetch(400, { error: 'Validation failed' });
    const error = await api.createTask(1, { title: '' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: 'Validation failed' });
  });
});
