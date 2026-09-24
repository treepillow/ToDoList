import { useLayoutEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import type { NewTask, StatusFilter, Task, TaskChanges } from '../types';
import { TaskRow } from './TaskRow';
import { PlusIcon } from './icons';

const EMPTY_MESSAGE: Record<StatusFilter, string> = {
  all: 'No tasks yet',
  active: 'No active tasks',
  completed: 'No completed tasks',
};

type Placement = 'before' | 'after';

interface Props {
  tasks: Task[];
  status: StatusFilter;
  reorderable: boolean;
  onCreate: (task: NewTask) => Promise<boolean>;
  onUpdate: (id: number, changes: TaskChanges) => void;
  onDelete: (task: Task) => void;
  onOpen: (task: Task) => void;
  onMove: (id: number, targetId: number, placement: Placement) => void;
}

export function TaskList({ tasks, status, reorderable, onCreate, onUpdate, onDelete, onOpen, onMove }: Props) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [drop, setDrop] = useState<{ id: number; placement: Placement } | null>(null);
  const refocusHandle = useRef<number | null>(null);

  // Keyed rows get moved in the DOM on reorder, which drops focus; put it back.
  useLayoutEffect(() => {
    if (refocusHandle.current === null) return;
    document.querySelector<HTMLElement>(`[data-handle="${refocusHandle.current}"]`)?.focus();
    refocusHandle.current = null;
  });

  const moveBy = (task: Task, direction: -1 | 1) => {
    const neighbour = tasks[tasks.findIndex((t) => t.id === task.id) + direction];
    if (!neighbour) return;
    refocusHandle.current = task.id;
    onMove(task.id, neighbour.id, direction === -1 ? 'before' : 'after');
  };

  const endDrag = () => {
    setDragId(null);
    setDrop(null);
  };

  const dragHandlers = {
    onDragStart: (task: Task, row: HTMLElement, e: DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(task.id)); // required by Firefox
      e.dataTransfer.setDragImage(row, 24, row.offsetHeight / 2);
      setDragId(task.id);
    },
    onDragEnd: endDrag,
    onDragOver: (task: Task, e: DragEvent<HTMLLIElement>) => {
      if (dragId === null) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const placement: Placement = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      if (drop?.id !== task.id || drop.placement !== placement) setDrop({ id: task.id, placement });
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (dragId !== null && drop) onMove(dragId, drop.id, drop.placement);
      endDrag();
    },
  };

  return (
    <>
      {tasks.length === 0 ? (
        <p className="empty">{EMPTY_MESSAGE[status]}</p>
      ) : (
        <ul className="task-list" aria-label="Tasks" data-dragging={dragId !== null || undefined}>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              reorderable={reorderable}
              dropPlacement={drop?.id === task.id && dragId !== task.id ? drop.placement : null}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onOpen={onOpen}
              onMoveBy={moveBy}
              {...dragHandlers}
            />
          ))}
        </ul>
      )}
      {status !== 'completed' && <NewTaskInput onCreate={onCreate} />}
    </>
  );
}

function NewTaskInput({ onCreate }: { onCreate: (task: NewTask) => Promise<boolean> }) {
  const [title, setTitle] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle(''); // clear immediately so the next task can be typed
    // If saving failed, give the text back — unless the user already started a new one.
    if (!(await onCreate({ title: trimmed }))) setTitle((current) => current || trimmed);
  };

  return (
    <form className="new-task" onSubmit={submit}>
      <PlusIcon />
      <input
        aria-label="New task"
        placeholder="New task"
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setTitle('');
            e.currentTarget.blur();
          }
        }}
      />
    </form>
  );
}
