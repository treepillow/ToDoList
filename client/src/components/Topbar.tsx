import type { Theme } from '../hooks/useTheme';
import { LockIcon, MoonIcon, SidebarIcon, SunIcon, TasksIcon } from './icons';

interface Props {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function Topbar({ sidebarOpen, onOpenSidebar, theme, onToggleTheme }: Props) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return (
    <header className="topbar">
      <div className="topbar-left">
        {!sidebarOpen && (
          <button type="button" className="icon-button" aria-label="Open sidebar" onClick={onOpenSidebar}>
            <SidebarIcon />
          </button>
        )}
        <span className="breadcrumb">
          <TasksIcon />
          Tasks
        </span>
        <span className="visibility">
          <LockIcon />
          Private
        </span>
      </div>
      <button
        type="button"
        className="icon-button"
        aria-label={`Switch to ${nextTheme} mode`}
        title={`Switch to ${nextTheme} mode`}
        onClick={onToggleTheme}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  );
}
