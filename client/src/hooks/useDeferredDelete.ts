import { useCallback, useEffect, useRef, useState } from 'react';

export const UNDO_WINDOW_MS = 5000;

export interface PendingDelete {
  ids: number[];
  message: string;
}

/**
 * Deletes that can be undone: `schedule` hides items for UNDO_WINDOW_MS, then calls
 * `commit`. Only one delete is pending at a time (a new one commits the previous),
 * and a pending delete is flushed with `keepalive` if the tab is closed.
 */
export function useDeferredDelete(commit: (ids: number[], options: { keepalive: boolean }) => Promise<void>) {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const pendingRef = useRef<PendingDelete | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const flush = useCallback(async ({ keepalive = false } = {}) => {
    const current = pendingRef.current;
    if (!current) return;
    clearTimeout(timerRef.current);
    pendingRef.current = null;
    setPending(null);
    await commitRef.current(current.ids, { keepalive });
  }, []);

  const schedule = useCallback(
    (ids: number[], message: string) => {
      if (ids.length === 0) return;
      void flush();
      const next = { ids, message };
      pendingRef.current = next;
      setPending(next);
      timerRef.current = setTimeout(() => void flush(), UNDO_WINDOW_MS);
    },
    [flush],
  );

  const undo = useCallback(() => {
    clearTimeout(timerRef.current);
    pendingRef.current = null;
    setPending(null);
  }, []);

  useEffect(() => {
    const onPageHide = () => void flush({ keepalive: true });
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [flush]);

  return { pending, schedule, undo, hiddenIds: new Set(pending?.ids) };
}
