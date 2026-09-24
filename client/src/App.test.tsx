import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { fakeServer } from './test/fakeServer';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const rowTitles = () =>
  within(screen.getByRole('list', { name: 'Tasks' }))
    .getAllByRole('listitem')
    .map((li) => within(li).getByRole('button', { name: /^Edit title/ }).textContent);

const renderApp = async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('textbox', { name: 'New task' });
  return user;
};

describe('loading', () => {
  it('shows a friendly error when the API is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load tasks/i);
  });

  it('refetches with the chosen filter from the filter icon', async () => {
    const server = fakeServer([{ title: 'Open' }, { title: 'Done', completed: true }]);
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Completed' }));

    await waitFor(() => expect(rowTitles()).toEqual(['Done']));
    expect(server.calls.at(-1)?.path).toBe('/api/tasks');
  });
});

describe('adding tasks', () => {
  it('adds a task on Enter and keeps the input ready for the next one', async () => {
    const server = fakeServer();
    const user = await renderApp();
    const input = screen.getByRole('textbox', { name: 'New task' });

    await user.type(input, 'Revise stacks{Enter}');

    expect(await screen.findByRole('button', { name: 'Edit title: Revise stacks' })).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(server.tasks.map((t) => t.title)).toEqual(['Revise stacks']);
  });

  it('keeps the typed title when saving fails, so nothing is lost', async () => {
    const server = fakeServer();
    const user = await renderApp();
    const input = screen.getByRole('textbox', { name: 'New task' });

    server.failNext();
    await user.type(input, 'Lab report{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i);
    expect(input).toHaveValue('Lab report');
  });

  it('ignores blank input', async () => {
    const server = fakeServer();
    const user = await renderApp();
    await user.type(screen.getByRole('textbox', { name: 'New task' }), '   {Enter}');
    expect(server.calls.some((c) => c.method === 'POST')).toBe(false);
  });
});

describe('editing tasks', () => {
  it('marks a task complete and persists it', async () => {
    const server = fakeServer([{ title: 'Lab 2' }]);
    const user = await renderApp();

    await user.click(screen.getByRole('checkbox', { name: 'Complete: Lab 2' }));

    expect(screen.getByRole('checkbox', { name: 'Complete: Lab 2' })).toBeChecked();
    await waitFor(() => expect(server.tasks[0]?.completed).toBe(true));
  });

  it('renames inline with Enter, and Escape discards the edit', async () => {
    const server = fakeServer([{ title: 'Old' }]);
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Edit title: Old' }));
    await user.clear(screen.getByRole('textbox', { name: 'Title' }));
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'New{Enter}');
    await waitFor(() => expect(server.tasks[0]?.title).toBe('New'));

    await user.click(screen.getByRole('button', { name: 'Edit title: New' }));
    await user.type(screen.getByRole('textbox', { name: 'Title' }), ' draft{Escape}');
    expect(screen.getByRole('button', { name: 'Edit title: New' })).toBeInTheDocument();
    expect(server.tasks[0]?.title).toBe('New');
  });

  it('keeps the old title if the edit is cleared', async () => {
    const server = fakeServer([{ title: 'Keep me' }]);
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Edit title: Keep me' }));
    await user.clear(screen.getByRole('textbox', { name: 'Title' }));
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Edit title: Keep me' })).toBeInTheDocument();
    expect(server.calls.some((c) => c.method === 'PATCH')).toBe(false);
  });

  it('edits priority, due date and notes in the task panel', async () => {
    const server = fakeServer([{ title: 'Essay' }]);
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Open: Essay' }));
    const panel = screen.getByRole('dialog', { name: 'Essay' });
    await user.selectOptions(within(panel).getByLabelText('Priority'), 'high');
    await user.type(within(panel).getByLabelText('Due date'), '2026-10-05');
    await user.type(within(panel).getByLabelText('Notes'), 'Min 2000 words');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(server.tasks[0]).toMatchObject({ priority: 'high', dueDate: '2026-10-05', notes: 'Min 2000 words' }),
    );
    // Close and unmount both try to save drafts; the notes must only be sent once.
    const notePatches = server.calls.filter((c) => c.method === 'PATCH' && (c.body as { notes?: string }).notes);
    expect(notePatches).toHaveLength(1);
  });

  it('closes the panel for good when its task leaves the filtered view', async () => {
    fakeServer([{ title: 'Essay' }]);
    const user = await renderApp();
    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Active' }));

    await user.click(await screen.findByRole('button', { name: 'Open: Essay' }));
    await user.click(within(screen.getByRole('dialog')).getByLabelText('Done'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'All tasks' }));
    await screen.findByRole('button', { name: 'Edit title: Essay' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reverts an optimistic change and tells the user when saving fails', async () => {
    const server = fakeServer([{ title: 'Flaky' }]);
    const user = await renderApp();

    server.failNext();
    await user.click(screen.getByRole('checkbox', { name: 'Complete: Flaky' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i);
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Complete: Flaky' })).not.toBeChecked());
  });
});

describe('overdue tasks', () => {
  it('flags open tasks whose due date has passed', async () => {
    fakeServer([
      { title: 'Late', dueDate: '2020-01-01' },
      { title: 'Late but done', dueDate: '2020-01-01', completed: true },
    ]);
    await renderApp();

    const [late, done] = within(screen.getByRole('list', { name: 'Tasks' })).getAllByRole('listitem');
    expect(within(late!).getByText(/overdue/i)).toBeInTheDocument();
    expect(within(done!).queryByText(/overdue/i)).not.toBeInTheDocument();
  });
});

describe('deleting tasks', () => {
  it('hides a deleted task immediately and lets the user undo', async () => {
    const server = fakeServer([{ title: 'Oops' }]);
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Delete: Oops' }));
    expect(screen.queryByRole('button', { name: 'Edit title: Oops' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: 'Edit title: Oops' })).toBeInTheDocument();
    expect(server.calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('deletes on the server once the undo window passes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const server = fakeServer([{ title: 'Gone' }, { title: 'Stays' }]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Delete: Gone' }));
    await act(() => vi.advanceTimersByTimeAsync(6000));

    await waitFor(() => expect(server.tasks.map((t) => t.title)).toEqual(['Stays']));
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('clears all completed tasks (with undo)', async () => {
    fakeServer([{ title: 'Done 1', completed: true }, { title: 'Open' }, { title: 'Done 2', completed: true }]);
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Clear completed' }));
    expect(rowTitles()).toEqual(['Open']);
    expect(screen.getByRole('status')).toHaveTextContent('2 tasks deleted');
  });
});

describe('focus after deleting', () => {
  it('moves focus to the next task when a row is deleted', async () => {
    fakeServer([{ title: 'A' }, { title: 'B' }]);
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Delete: A' }));

    expect(screen.getByRole('button', { name: 'Edit title: B' })).toHaveFocus();
  });

  it('moves focus back into the list when deleting from the panel', async () => {
    fakeServer([{ title: 'A' }, { title: 'B' }]);
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Open: B' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete: B' }));

    expect(screen.getByRole('button', { name: 'Edit title: A' })).toHaveFocus();
  });

  it('falls back to the new-task input when the last task is deleted', async () => {
    fakeServer([{ title: 'Only' }]);
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Delete: Only' }));

    expect(screen.getByRole('textbox', { name: 'New task' })).toHaveFocus();
  });
});

describe('navigation', () => {
  it('does not reload the page when the current page is clicked in the sidebar', async () => {
    fakeServer();
    await renderApp();
    const link = screen.getByRole('link', { name: /tasks/i, hidden: true }); // sidebar starts closed on narrow test viewport
    expect(fireEvent.click(link)).toBe(false); // false = default navigation was prevented
  });
});

describe('reordering', () => {
  it('moves a task with the keyboard and saves the new order', async () => {
    const server = fakeServer([{ title: 'A' }, { title: 'B' }, { title: 'C' }]);
    const user = await renderApp();

    screen.getByRole('button', { name: /^Reorder: A/ }).focus();
    await user.keyboard('{ArrowDown}');

    expect(rowTitles()).toEqual(['B', 'A', 'C']);
    await waitFor(() => expect(server.tasks.map((t) => t.title)).toEqual(['B', 'A', 'C']));
    expect(screen.getByRole('button', { name: /^Reorder: A/ })).toHaveFocus();
  });

  it('is unavailable while the list is filtered or sorted', async () => {
    fakeServer([{ title: 'A' }, { title: 'B' }]);
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Sort' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Priority' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /^Reorder/ })).not.toBeInTheDocument());
  });
});
