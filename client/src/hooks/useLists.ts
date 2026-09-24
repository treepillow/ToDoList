import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { TaskList } from '../types';
import { useDeferredDelete } from './useDeferredDelete';

/** The sidebar's lists: load, create, rename, and delete-with-undo. */
export function useLists() {
  const [lists, setLists] = useState<TaskList[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLists(await api.listLists());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (name: string): Promise<TaskList | null> => {
      try {
        const list = await api.createList(name);
        setLists((current) => current && [...current, list]);
        setSaveError(false);
        return list;
      } catch {
        setSaveError(true);
        return null;
      } finally {
        void refresh();
      }
    },
    [refresh],
  );

  const rename = useCallback(
    async (id: number, name: string) => {
      setLists((current) => current && current.map((l) => (l.id === id ? { ...l, name } : l)));
      try {
        await api.renameList(id, name);
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
      await refresh();
    },
    [refresh],
  );

  const deletes = useDeferredDelete(async (ids, { keepalive }) => {
    const results = await Promise.allSettled(ids.map((id) => api.deleteList(id, { keepalive })));
    if (results.some((r) => r.status === 'rejected')) setSaveError(true);
    if (!keepalive) await refresh();
  });

  return {
    lists: lists?.filter((l) => !deletes.hiddenIds.has(l.id)) ?? null,
    loadError,
    saveError,
    dismissSaveError: () => setSaveError(false),
    pendingDelete: deletes.pending,
    refresh,
    create,
    rename,
    remove: deletes.schedule,
    undo: deletes.undo,
  };
}
