import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { NewTask, SortOrder, StatusFilter, Task, TaskChanges } from '../types';

export const UNDO_WINDOW_MS = 5000;

interface PendingDelete {
  ids: number[];
  message: string;
}

/**
 * Owns the task list for the current view.
 * - Edits are applied optimistically, then the list is re-synced from the server
 *   (which also rolls back a failed change).
 * - Deletes are deferred for UNDO_WINDOW_MS so they can be undone.
 */
export function useTasks(status: StatusFilter, sort: SortOrder) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [pending, setPending] = useState<PendingDelete | null>(null);

  const pendingRef = useRef<PendingDelete | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestRequest = useRef(0);
  const viewRef = useRef({ status, sort });
  viewRef.current = { status, sort };

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      const data = await api.listTasks(viewRef.current);
      // Drop stale responses when several refreshes overlap.
      if (requestId === latestRequest.current) {
        setTasks(data);
        setLoadError(false);
      }
    } catch {
      if (requestId === latestRequest.current) setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [status, sort, refresh]);

  const mutate = useCallback(
    async (optimistic: (tasks: Task[]) => Task[], request: () => Promise<unknown>) => {
      setTasks((current) => current && optimistic(current));
      try {
        await request();
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
      await refresh();
    },
    [refresh],
  );

  const create = useCallback(
    async (task: NewTask) => {
      try {
        const created = await api.createTask(task);
        setTasks((current) => current && [...current, created]);
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
      await refresh();
    },
    [refresh],
  );

  const update = useCallback(
    (id: number, changes: TaskChanges) =>
      mutate(
        (list) => list.map((t) => (t.id === id ? { ...t, ...changes } : t)),
        () => api.updateTask(id, changes),
      ),
    [mutate],
  );

  /** Moves `id` next to `targetId`. Works on the full list so hidden (pending-delete) rows keep their place. */
  const move = useCallback(
    (id: number, targetId: number, placement: 'before' | 'after') => {
      if (id === targetId || !tasks) return;
      const without = tasks.filter((t) => t.id !== id);
      const moving = tasks.find((t) => t.id === id);
      const targetIndex = without.findIndex((t) => t.id === targetId);
      if (!moving || targetIndex < 0) return;
      without.splice(placement === 'before' ? targetIndex : targetIndex + 1, 0, moving);
      return mutate(
        () => without,
        () => api.reorder(without.map((t) => t.id)),
      );
    },
    [tasks, mutate],
  );

  const commitPending = useCallback(
    async ({ keepalive = false } = {}) => {
      const current = pendingRef.current;
      if (!current) return;
      clearTimeout(timerRef.current);
      pendingRef.current = null;
      setPending(null);
      const results = await Promise.allSettled(current.ids.map((id) => api.deleteTask(id, { keepalive })));
      if (results.some((r) => r.status === 'rejected')) setSaveError(true);
      if (!keepalive) await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    (ids: number[], message: string) => {
      if (ids.length === 0) return;
      void commitPending(); // only one undo at a time, like Notion
      const next = { ids, message };
      pendingRef.current = next;
      setPending(next);
      timerRef.current = setTimeout(() => void commitPending(), UNDO_WINDOW_MS);
    },
    [commitPending],
  );

  const undo = useCallback(() => {
    clearTimeout(timerRef.current);
    pendingRef.current = null;
    setPending(null);
  }, []);

  // Don't lose a pending delete if the tab closes during the undo window.
  useEffect(() => {
    const flush = () => void commitPending({ keepalive: true });
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [commitPending]);

  const hidden = new Set(pending?.ids);
  const visible = tasks?.filter((t) => !hidden.has(t.id)) ?? null;

  return {
    tasks: visible,
    loadError,
    saveError,
    dismissSaveError: () => setSaveError(false),
    pendingDelete: pending,
    refresh,
    create,
    update,
    move,
    remove,
    undo,
  };
}
