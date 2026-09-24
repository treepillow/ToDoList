import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { Task } from './types';

const task = (overrides: Partial<Task>): Task => ({
  id: 1,
  title: 'Task',
  notes: '',
  priority: null,
  dueDate: null,
  completed: false,
  position: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('shows tasks loaded from the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json([task({ id: 1, title: 'Stack = last in first out' }), task({ id: 2, title: 'Queue = FIFO' })]),
    );
    render(<App />);

    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Stack = last in first out'),
      expect.stringContaining('Queue = FIFO'),
    ]);
  });

  it('refetches with the chosen filter from the filter icon', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json([]));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/no tasks/i);

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Completed' }));

    expect(fetch).toHaveBeenLastCalledWith('/api/tasks?status=completed&sort=position', expect.anything());
  });

  it('shows a friendly error when the API is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load tasks/i);
  });
});
