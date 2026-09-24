import type { TaskList } from '../types';
import { ChevronsLeftIcon, PlusIcon, TasksIcon, TrashIcon } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  lists: TaskList[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onDelete: (list: TaskList) => void;
}

export function Sidebar({ open, onClose, lists, activeId, onSelect, onCreate, onDelete }: Props) {
  const onlyOne = lists.length <= 1;
  return (
    <>
      <nav className="sidebar" data-open={open} aria-label="Workspace" aria-hidden={!open} inert={!open}>
        <div className="sidebar-header">
          <span className="workspace-avatar" aria-hidden="true">
            W
          </span>
          <span className="workspace-name">My Workspace</span>
          <button type="button" className="icon-button sidebar-close" aria-label="Close sidebar" onClick={onClose}>
            <ChevronsLeftIcon />
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-label">Private</span>
            <button type="button" className="icon-button sidebar-add-icon" aria-label="New list" title="New list" onClick={onCreate}>
              <PlusIcon />
            </button>
          </div>

          <ul className="sidebar-lists" aria-label="Lists">
            {lists.map((list) => (
              <li key={list.id} className="sidebar-row">
                <a
                  className="sidebar-item"
                  href={`?list=${list.id}`}
                  aria-current={list.id === activeId ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault(); // client-side switch, no page reload
                    onSelect(list.id);
                  }}
                >
                  <TasksIcon />
                  <span className="sidebar-item-name">{list.name}</span>
                  {list.openCount > 0 && <span className="sidebar-count">{list.openCount}</span>}
                </a>
                <button
                  type="button"
                  className="icon-button sidebar-row-action"
                  aria-label={`Delete list: ${list.name}`}
                  title={onlyOne ? 'You need at least one list' : 'Delete list'}
                  disabled={onlyOne}
                  onClick={() => onDelete(list)}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>

          <button type="button" className="sidebar-item sidebar-new" onClick={onCreate}>
            <PlusIcon />
            <span>Add a list</span>
          </button>
        </div>
      </nav>
      {/* Tap-to-dismiss scrim, only visible on narrow screens */}
      <div className="scrim" data-open={open} onClick={onClose} aria-hidden="true" />
    </>
  );
}
