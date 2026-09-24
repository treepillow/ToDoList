import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { formatDueDate, isOverdue } from '../format';
import type { Task, TaskChanges } from '../types';
import { DragIcon, OpenIcon, TrashIcon } from './icons';

export const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' } as const;

interface Props {
  task: Task;
  reorderable: boolean;
  dropPlacement: 'before' | 'after' | null;
  onUpdate: (id: number, changes: TaskChanges) => void;
  onDelete: (task: Task) => void;
  onOpen: (task: Task) => void;
  onMoveBy: (task: Task, direction: -1 | 1) => void;
  onDragStart: (task: Task, row: HTMLElement, e: DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (task: Task, e: DragEvent<HTMLLIElement>) => void;
  onDrop: (e: DragEvent) => void;
}

export function TaskRow({ task, reorderable, dropPlacement, onUpdate, onDelete, onOpen, onMoveBy, ...drag }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const rowRef = useRef<HTMLLIElement>(null);
  const titleButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      titleButtonRef.current?.focus();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(task.title);
    setEditing(true);
  };

  // Guarded so Enter/Escape followed by the unmount blur can't save twice.
  const finish = (save: boolean, refocus: boolean) => {
    if (!editing) return;
    const title = draft.trim();
    if (save && title && title !== task.title) onUpdate(task.id, { title });
    restoreFocus.current = refocus;
    setEditing(false);
  };

  const onTitleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true, true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      finish(false, true);
    }
  };

  const onHandleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      onMoveBy(task, e.key === 'ArrowUp' ? -1 : 1);
    }
  };

  const overdue = isOverdue(task);

  return (
    <li
      ref={rowRef}
      className="task-row"
      data-completed={task.completed}
      data-drop={dropPlacement ?? undefined}
      onDragOver={(e) => drag.onDragOver(task, e)}
      onDrop={drag.onDrop}
    >
      {reorderable && (
        <button
          type="button"
          className="drag-handle"
          data-handle={task.id}
          aria-label={`Reorder: ${task.title}. Use arrow keys to move.`}
          title="Drag to move"
          draggable
          onDragStart={(e) => drag.onDragStart(task, rowRef.current!, e)}
          onDragEnd={drag.onDragEnd}
          onKeyDown={onHandleKeyDown}
        >
          <DragIcon />
        </button>
      )}

      <input
        type="checkbox"
        className="checkbox"
        checked={task.completed}
        onChange={(e) => onUpdate(task.id, { completed: e.target.checked })}
        aria-label={`Complete: ${task.title}`}
      />

      {editing ? (
        <input
          className="title-input"
          aria-label="Title"
          value={draft}
          maxLength={200}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onTitleKeyDown}
          onBlur={() => finish(true, false)}
        />
      ) : (
        <button
          ref={titleButtonRef}
          type="button"
          className="task-title"
          data-title-for={task.id}
          aria-label={`Edit title: ${task.title}`}
          onClick={startEditing}
        >
          {task.title}
        </button>
      )}

      <span className="task-meta">
        {task.priority && (
          <span className="tag" data-priority={task.priority}>
            {PRIORITY_LABEL[task.priority]}
          </span>
        )}
        {task.dueDate && (
          <time className="due" dateTime={task.dueDate} data-overdue={overdue || undefined}>
            {overdue && <span className="sr-only">Overdue: </span>}
            {formatDueDate(task.dueDate)}
          </time>
        )}
      </span>

      <span className="row-actions">
        <button type="button" className="icon-button" aria-label={`Open: ${task.title}`} title="Open" onClick={() => onOpen(task)}>
          <OpenIcon />
        </button>
        <button type="button" className="icon-button" aria-label={`Delete: ${task.title}`} title="Delete" onClick={() => onDelete(task)}>
          <TrashIcon />
        </button>
      </span>
    </li>
  );
}
