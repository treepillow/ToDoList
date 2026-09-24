import { useRef, useState } from 'react';
import { OptionsMenu } from './components/OptionsMenu';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { TaskPanel } from './components/TaskPanel';
import { Toasts } from './components/Toasts';
import { Topbar } from './components/Topbar';
import { FilterIcon, ListIcon, SortIcon, TasksIcon } from './components/icons';
import { useTasks } from './hooks/useTasks';
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
  const [openId, setOpenId] = useState<number | null>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const { tasks, loadError, saveError, dismissSaveError, pendingDelete, refresh, create, update, move, remove, undo } =
    useTasks(status, sort);

  const openTask = tasks?.find((t) => t.id === openId) ?? null;
  const completedIds = tasks?.filter((t) => t.completed).map((t) => t.id) ?? [];
  // Manual order only makes sense when every task is visible in manual order.
  const reorderable = status === 'all' && sort === 'position';

  const openPanel = (task: Task) => {
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    setOpenId(task.id);
  };

  const closePanel = () => {
    setOpenId(null);
    if (returnFocusTo.current?.isConnected) returnFocusTo.current.focus();
  };

  const deleteTask = (task: Task) => {
    if (task.id === openId) setOpenId(null);
    remove([task.id], 'Task deleted');
  };

  const clearCompleted = () =>
    remove(completedIds, `${completedIds.length} ${completedIds.length === 1 ? 'task' : 'tasks'} deleted`);

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        taskCount={tasks && status === 'all' ? tasks.length : null}
      />

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
              {completedIds.length > 0 && (
                <button type="button" className="text-button subtle" onClick={clearCompleted}>
                  Clear completed
                </button>
              )}
              <OptionsMenu
                label="Filter"
                icon={<FilterIcon />}
                options={FILTER_OPTIONS}
                value={status}
                onChange={setStatus}
                active={status !== 'all'}
              />
              <OptionsMenu
                label="Sort"
                icon={<SortIcon />}
                options={SORT_OPTIONS}
                value={sort}
                onChange={setSort}
                active={sort !== 'position'}
              />
            </div>
          </div>

          {loadError && !tasks ? (
            <div className="callout" role="alert">
              <span>Couldn’t load tasks. Is the API server running?</span>
              <button type="button" className="text-button" onClick={() => void refresh()}>
                Retry
              </button>
            </div>
          ) : tasks === null ? (
            <p className="empty" aria-busy="true">
              Loading…
            </p>
          ) : (
            <TaskList
              tasks={tasks}
              status={status}
              reorderable={reorderable}
              onCreate={(task) => void create(task)}
              onUpdate={(id, changes) => void update(id, changes)}
              onDelete={deleteTask}
              onOpen={openPanel}
              onMove={(id, targetId, placement) => void move(id, targetId, placement)}
            />
          )}
        </main>
      </div>

      {openTask && (
        <TaskPanel
          key={openTask.id}
          task={openTask}
          onUpdate={(id, changes) => void update(id, changes)}
          onDelete={deleteTask}
          onClose={closePanel}
        />
      )}

      <Toasts
        undoMessage={pendingDelete?.message ?? null}
        onUndo={undo}
        saveError={saveError}
        onDismissError={dismissSaveError}
      />
    </div>
  );
}
