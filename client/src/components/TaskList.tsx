import { formatDueDate } from '../format';
import type { StatusFilter, Task } from '../types';

const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' } as const;

const EMPTY_MESSAGE: Record<StatusFilter, string> = {
  all: 'No tasks yet',
  active: 'No active tasks',
  completed: 'No completed tasks',
};

interface Props {
  tasks: Task[];
  status: StatusFilter;
}

// Read-only for Stage 3; interactions are wired up in Stage 4.
export function TaskList({ tasks, status }: Props) {
  if (tasks.length === 0) return <p className="empty">{EMPTY_MESSAGE[status]}</p>;

  return (
    <ul className="task-list" aria-label="Tasks">
      {tasks.map((task) => (
        <li key={task.id} className="task-row" data-completed={task.completed}>
          <span className="checkbox" data-checked={task.completed} aria-hidden="true" />
          <span className="task-title">{task.title}</span>
          <span className="task-meta">
            {task.priority && (
              <span className="tag" data-priority={task.priority}>
                {PRIORITY_LABEL[task.priority]}
              </span>
            )}
            {task.dueDate && (
              <time className="due" dateTime={task.dueDate}>
                {formatDueDate(task.dueDate)}
              </time>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
