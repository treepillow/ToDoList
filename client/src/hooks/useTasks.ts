import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { NewTask, SortOrder, StatusFilter, Task, TaskChanges } from '../types';
import { useDeferredDelete } from './useDeferredDelete';

/**
 * Owns the tasks of one list for the current view.
 * - Edits are applied optimistically, then the list is re-synced from the server
 *   (which also rolls back a failed change).
 * - Deletes are deferred so they can be undone.
 * - `onSynced` runs after every write so other views (list counts) can refresh.
 */
export function useTasks(listId: number | null, status: StatusFilter, sort: SortOrder, onSynced?: () => void) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const latestRequest = useRef(0);
  const viewRef = useRef({ listId, status, sort });
  viewRef.current = { listId, status, sort };
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  const refresh = useCallback(async () => {
    const { listId, ...query } = viewRef.current;
    if (listId === null) return;
    const requestId = ++latestRequest.current;
    try {
      const data = await api.listTasks(listId, query);
      // Drop stale responses when several refreshes overlap (or the list changed).
      if (requestId === latestRequest.current) {
        setTasks(data);
        setLoadError(false);
      }
    } catch {
      if (requestId === latestRequest.current) setLoadError(true);
    }
  }, []);

  const shownListId = useRef(listId);
  useEffect(() => {
    // Don't flash the previous list's tasks while the new list loads.
    if (shownListId.current !== listId) {
      shownListId.current = listId;
      setTasks(null);
    }
    void refresh();
  }, [listId, status, sort, refresh]);

  const afterWrite = useCallback(async () => {
    await refresh();
    onSyncedRef.current?.();
  }, [refresh]);

  const mutate = useCallback(
    async (optimistic: (tasks: Task[]) => Task[], request: () => Promise<unknown>) => {
      setTasks((current) => current && optimistic(current));
      try {
        await request();
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
      await afterWrite();
    },
    [afterWrite],
  );

  const create = useCallback(
    async (task: NewTask): Promise<boolean> => {
      const { listId } = viewRef.current;
      if (listId === null) return false;
      let ok = true;
      try {
        const created = await api.createTask(listId, task);
        setTasks((current) => current && [...current, created]);
        setSaveError(false);
      } catch {
        setSaveError(true);
        ok = false;
      }
      await afterWrite();
      return ok;
    },
    [afterWrite],
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
      const { listId } = viewRef.current;
      if (id === targetId || !tasks || listId === null) return;
      const without = tasks.filter((t) => t.id !== id);
      const moving = tasks.find((t) => t.id === id);
      const targetIndex = without.findIndex((t) => t.id === targetId);
      if (!moving || targetIndex < 0) return;
      without.splice(placement === 'before' ? targetIndex : targetIndex + 1, 0, moving);
      return mutate(
        () => without,
        () => api.reorder(listId, without.map((t) => t.id)),
      );
    },
    [tasks, mutate],
  );

  const deletes = useDeferredDelete(async (ids, { keepalive }) => {
    const results = await Promise.allSettled(ids.map((id) => api.deleteTask(id, { keepalive })));
    if (results.some((r) => r.status === 'rejected')) setSaveError(true);
    if (!keepalive) await afterWrite();
  });

  return {
    tasks: tasks?.filter((t) => !deletes.hiddenIds.has(t.id)) ?? null,
    loadError,
    saveError,
    dismissSaveError: () => setSaveError(false),
    pendingDelete: deletes.pending,
    refresh,
    create,
    update,
    move,
    remove: deletes.schedule,
    undo: deletes.undo,
  };
}
