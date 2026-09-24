import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatTimestamp, isOverdue } from '../format';
import { PRIORITIES, type Priority, type Task, type TaskChanges } from '../types';
import { CalendarIcon, ChevronsRightIcon, ClockIcon, FlagIcon, StatusIcon, TrashIcon } from './icons';
import { PRIORITY_LABEL } from './TaskRow';

interface Props {
  task: Task;
  onUpdate: (id: number, changes: TaskChanges) => void;
  onDelete: (task: Task) => void;
  onClose: () => void;
}

/** Notion-style "side peek" for a task's properties and notes. */
export function TaskPanel({ task, onUpdate, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const panelRef = useRef<HTMLElement>(null);

  // Text fields save on blur/close/unmount rather than per keystroke. `saved` tracks
  // what was last sent, so the several triggers never send the same change twice.
  const latest = useRef({ title, notes });
  latest.current = { title, notes };
  const saved = useRef({ title: task.title, notes: task.notes });
  const flushText = () => {
    const { title, notes } = latest.current;
    const changes: TaskChanges = {};
    if (title.trim() && title.trim() !== saved.current.title) changes.title = title.trim();
    if (notes !== saved.current.notes) changes.notes = notes;
    if (Object.keys(changes).length === 0) return;
    saved.current = { title: changes.title ?? saved.current.title, notes };
    onUpdate(task.id, changes);
  };
  const flushRef = useRef(flushText);
  flushRef.current = flushText;
  // The panel can also unmount without a close (task deleted or filtered out): save drafts then too.
  useEffect(() => () => flushRef.current(), []);

  const close = () => {
    flushText();
    onClose();
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const overdue = isOverdue(task);

  return (
    <aside className="panel" role="dialog" aria-label={task.title} tabIndex={-1} ref={panelRef}>
      <div className="panel-toolbar">
        <button type="button" className="icon-button" aria-label="Close panel" title="Close (Esc)" onClick={close}>
          <ChevronsRightIcon />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={`Delete: ${task.title}`}
          title="Delete"
          onClick={() => onDelete(task)}
        >
          <TrashIcon />
        </button>
      </div>

      <div className="panel-body">
        <textarea
          className="panel-title"
          aria-label="Task title"
          rows={1}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
          onBlur={() => (title.trim() ? flushText() : setTitle(task.title))}
        />

        <dl className="properties">
          <Property icon={<StatusIcon />} label="Done" htmlFor="prop-done">
            <input
              id="prop-done"
              type="checkbox"
              className="checkbox"
              checked={task.completed}
              onChange={(e) => onUpdate(task.id, { completed: e.target.checked })}
            />
          </Property>

          <Property icon={<FlagIcon />} label="Priority" htmlFor="prop-priority">
            <select
              id="prop-priority"
              className="property-input"
              data-priority={task.priority ?? undefined}
              value={task.priority ?? ''}
              onChange={(e) => onUpdate(task.id, { priority: (e.target.value || null) as Priority | null })}
            >
              <option value="">Empty</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </Property>

          <Property icon={<CalendarIcon />} label="Due date" htmlFor="prop-due">
            <input
              id="prop-due"
              type="date"
              className="property-input"
              data-overdue={overdue || undefined}
              value={task.dueDate ?? ''}
              onChange={(e) => onUpdate(task.id, { dueDate: e.target.value || null })}
            />
            {overdue && <span className="overdue-label">Overdue</span>}
          </Property>

          <Property icon={<ClockIcon />} label="Created">
            <span className="property-static">{formatTimestamp(task.createdAt)}</span>
          </Property>
        </dl>

        <hr className="divider" />

        <label className="sr-only" htmlFor="prop-notes">
          Notes
        </label>
        <textarea
          id="prop-notes"
          className="panel-notes"
          placeholder="Add notes…"
          maxLength={5000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={flushText}
        />
      </div>
    </aside>
  );
}

function Property({ icon, label, htmlFor, children }: { icon: ReactNode; label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="property">
      <dt>
        {htmlFor ? <label htmlFor={htmlFor}>{icon}{label}</label> : <span>{icon}{label}</span>}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
