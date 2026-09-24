import type { Db } from './db.js';
import type { CreateTaskInput, ListQuery, UpdateTaskInput } from './schemas.js';

export interface Task {
  id: number;
  title: string;
  notes: string;
  priority: 'low' | 'medium' | 'high' | null;
  dueDate: string | null;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskRow {
  id: number;
  title: string;
  notes: string;
  priority: Task['priority'];
  due_date: string | null;
  completed: 0 | 1;
  position: number;
  created_at: string;
  updated_at: string;
}

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  notes: row.notes,
  priority: row.priority,
  dueDate: row.due_date,
  completed: row.completed === 1,
  position: row.position,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Only these fixed SQL fragments can ever reach a query; user input never does.
const WHERE: Record<ListQuery['status'], string> = {
  all: '',
  active: 'WHERE completed = 0',
  completed: 'WHERE completed = 1',
};
const ORDER_BY: Record<ListQuery['sort'], string> = {
  position: 'position, id',
  due: 'due_date IS NULL, due_date, position',
  priority: "CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END, position",
};
const COLUMNS: Record<keyof UpdateTaskInput, string> = {
  title: 'title',
  notes: 'notes',
  priority: 'priority',
  dueDate: 'due_date',
  completed: 'completed',
};

export function createTaskRepo(db: Db) {
  const getStmt = db.prepare<[number], TaskRow>('SELECT * FROM tasks WHERE id = ?');

  const get = (id: number) => {
    const row = getStmt.get(id);
    return row ? toTask(row) : undefined;
  };

  return {
    get,

    list({ status, sort }: ListQuery): Task[] {
      const rows = db
        .prepare<[], TaskRow>(`SELECT * FROM tasks ${WHERE[status]} ORDER BY ${ORDER_BY[sort]}`)
        .all();
      return rows.map(toTask);
    },

    create(input: CreateTaskInput): Task {
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO tasks (title, notes, priority, due_date, position)
           VALUES (@title, @notes, @priority, @dueDate,
                   (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks))`,
        )
        .run({
          title: input.title,
          notes: input.notes ?? '',
          priority: input.priority ?? null,
          dueDate: input.dueDate ?? null,
        });
      return get(Number(lastInsertRowid))!;
    },

    update(id: number, input: UpdateTaskInput): Task | undefined {
      const keys = Object.keys(input) as (keyof UpdateTaskInput)[];
      const assignments = keys.map((key) => `${COLUMNS[key]} = @${key}`);
      // SQLite has no boolean type, so `completed` is stored as 0/1.
      const params = Object.fromEntries(
        keys.map((key) => [key, key === 'completed' ? Number(input.completed) : input[key]]),
      );

      const { changes } = db
        .prepare(
          `UPDATE tasks SET ${assignments.join(', ')},
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = @id`,
        )
        .run({ ...params, id });
      return changes ? get(id) : undefined;
    },

    remove(id: number): boolean {
      return db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0;
    },

    /** Returns false (and changes nothing) unless `ids` is exactly the set of existing task ids. */
    reorder: db.transaction((ids: number[]): boolean => {
      const existing = db.prepare<[], { id: number }>('SELECT id FROM tasks').all().map((r) => r.id);
      const unique = new Set(ids);
      if (unique.size !== ids.length || ids.length !== existing.length) return false;
      if (!existing.every((id) => unique.has(id))) return false;

      const setPosition = db.prepare('UPDATE tasks SET position = ? WHERE id = ?');
      ids.forEach((id, index) => setPosition.run(index + 1, id));
      return true;
    }),
  };
}

export type TaskRepo = ReturnType<typeof createTaskRepo>;
