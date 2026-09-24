import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { OptionsMenu } from './components/OptionsMenu';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { Topbar } from './components/Topbar';
import { FilterIcon, ListIcon, SortIcon, TasksIcon } from './components/icons';
import { useTheme } from './hooks/useTheme';
import type { SortOrder, StatusFilter, Task } from './types';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All tasks' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
] as const satisfies readonly { value: StatusFilter; label: string }[];

const SORT_OPTIONS = [
  { value: 'position', label: 'Manual' },
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
] as const satisfies readonly { value: SortOrder; label: string }[];

const isWide = () => window.matchMedia?.('(min-width: 768px)').matches ?? true;

export function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(isWide);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOrder>('position');
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setError(false);
    api
      .listTasks({ status, sort })
      .then((data) => !cancelled && setTasks(data))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [status, sort]);

  useEffect(load, [load]);

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} taskCount={tasks && status === 'all' ? tasks.length : null} />

      <div className="main">
        <Topbar
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="page">
          <div className="page-icon" aria-hidden="true">
            <TasksIcon width={56} height={56} strokeWidth={1} />
          </div>
          <h1 className="page-title">Tasks</h1>

          <div className="db-toolbar">
            <span className="view-tab">
              <ListIcon />
              List
            </span>
            <div className="db-actions">
              <OptionsMenu label="Filter" icon={<FilterIcon />} options={FILTER_OPTIONS} value={status} onChange={setStatus} active={status !== 'all'} />
              <OptionsMenu label="Sort" icon={<SortIcon />} options={SORT_OPTIONS} value={sort} onChange={setSort} active={sort !== 'position'} />
            </div>
          </div>

          {error ? (
            <div className="callout" role="alert">
              <span>Couldn’t load tasks. Is the API server running?</span>
              <button type="button" className="text-button" onClick={load}>
                Retry
              </button>
            </div>
          ) : tasks === null ? (
            <p className="empty" aria-busy="true">
              Loading…
            </p>
          ) : (
            <TaskList tasks={tasks} status={status} />
          )}
        </main>
      </div>
    </div>
  );
}
