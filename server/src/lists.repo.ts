import type { Db } from './db.js';

export interface TaskList {
  id: number;
  name: string;
  position: number;
  openCount: number;
  createdAt: string;
}

interface ListRow {
  id: number;
  name: string;
  position: number;
  open_count: number;
  created_at: string;
}

const toList = (row: ListRow): TaskList => ({
  id: row.id,
  name: row.name,
  position: row.position,
  openCount: row.open_count,
  createdAt: row.created_at,
});

const SELECT_LISTS = `
  SELECT l.id, l.name, l.position, l.created_at,
         (SELECT COUNT(*) FROM tasks t WHERE t.list_id = l.id AND t.completed = 0) AS open_count
  FROM lists l`;

export function createListRepo(db: Db) {
  const getStmt = db.prepare<[number], ListRow>(`${SELECT_LISTS} WHERE l.id = ?`);
  const get = (id: number) => {
    const row = getStmt.get(id);
    return row ? toList(row) : undefined;
  };

  return {
    get,

    all: (): TaskList[] => db.prepare<[], ListRow>(`${SELECT_LISTS} ORDER BY l.position, l.id`).all().map(toList),

    create(name: string): TaskList {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO lists (name, position) VALUES (?, (SELECT COALESCE(MAX(position), 0) + 1 FROM lists))')
        .run(name);
      return get(Number(lastInsertRowid))!;
    },

    rename(id: number, name: string): TaskList | undefined {
      const { changes } = db.prepare('UPDATE lists SET name = ? WHERE id = ?').run(name, id);
      return changes ? get(id) : undefined;
    },

    /** Deletes a list and (via ON DELETE CASCADE) its tasks. The last list can't be deleted. */
    remove: db.transaction((id: number): 'deleted' | 'not-found' | 'last-list' => {
      if (!get(id)) return 'not-found';
      const { count } = db.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM lists').get()!;
      if (count <= 1) return 'last-list';
      db.prepare('DELETE FROM lists WHERE id = ?').run(id);
      return 'deleted';
    }),
  };
}

export type ListRepo = ReturnType<typeof createListRepo>;
