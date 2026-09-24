import { ChevronsLeftIcon, TasksIcon } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  taskCount: number | null;
}

export function Sidebar({ open, onClose, taskCount }: Props) {
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
          <div className="sidebar-label">Private</div>
          <a className="sidebar-item" href="/" aria-current="page">
            <TasksIcon />
            <span>Tasks</span>
            {taskCount !== null && <span className="sidebar-count">{taskCount}</span>}
          </a>
        </div>
      </nav>
      {/* Tap-to-dismiss scrim, only visible on narrow screens */}
      <div className="scrim" data-open={open} onClick={onClose} aria-hidden="true" />
    </>
  );
}
