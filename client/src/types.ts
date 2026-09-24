// Mirrors the server's Task shape (server/src/tasks.repo.ts).
export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];
export type StatusFilter = 'all' | 'active' | 'completed';
export type SortOrder = 'position' | 'due' | 'priority';

export interface Task {
  id: number;
  title: string;
  notes: string;
  priority: Priority | null;
  dueDate: string | null;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewTask {
  title: string;
  notes?: string;
  priority?: Priority | null;
  dueDate?: string | null;
}

export type TaskChanges = Partial<Pick<Task, 'title' | 'notes' | 'priority' | 'dueDate' | 'completed'>>;
