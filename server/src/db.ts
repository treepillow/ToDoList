import Database from 'better-sqlite3';

export type Db = Database.Database;

// Each entry upgrades the schema by one version (tracked via PRAGMA user_version).
// CHECK constraints duplicate the API validation on purpose: defence in depth.
const migrations = [
  `CREATE TABLE tasks (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     title      TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
     notes      TEXT    NOT NULL DEFAULT '' CHECK (length(notes) <= 5000),
     priority   TEXT    CHECK (priority IN ('low', 'medium', 'high')),
     due_date   TEXT    CHECK (due_date IS NULL OR due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
     completed  INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
     position   INTEGER NOT NULL,
     created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
     updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
   );
   CREATE INDEX idx_tasks_position ON tasks (position);`,

  // v2: multiple lists. Existing tasks move into a default "Tasks" list.
  `CREATE TABLE lists (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     name       TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
     position   INTEGER NOT NULL,
     created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
   );
   INSERT INTO lists (id, name, position) VALUES (1, 'Tasks', 1);
   ALTER TABLE tasks ADD COLUMN list_id INTEGER REFERENCES lists (id) ON DELETE CASCADE;
   UPDATE tasks SET list_id = 1;
   CREATE INDEX idx_tasks_list ON tasks (list_id, position);`,
];

export function openDb(filename: string): Db {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const version = db.pragma('user_version', { simple: true }) as number;
  db.transaction(() => {
    migrations.slice(version).forEach((sql) => db.exec(sql));
    db.pragma(`user_version = ${migrations.length}`);
  })();

  return db;
}
