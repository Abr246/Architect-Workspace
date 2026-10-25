import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Real persistence (a single file on disk, no separate database server to
// run or configure) in dev/prod, but an isolated in-memory database in
// tests - Jest gives each test file its own fresh module registry, so a
// fresh `:memory:` database per file reproduces the exact "clean store per
// test file" behavior every service's resetX() already relied on before
// this migration, without tests ever touching a real file or each other.
const isTest = process.env.NODE_ENV === 'test';

function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  const dataDir = path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'goalkick.sqlite');
}

export const db = new Database(isTest ? ':memory:' : resolveDbPath());

if (!isTest) {
  // Better write concurrency for a real file; meaningless (and better left
  // untouched) for an in-memory test database.
  db.pragma('journal_mode = WAL');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS fields (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    surface_type TEXT NOT NULL,
    price_per_hour REAL NOT NULL,
    available INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    field_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS escalations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    decided_at TEXT,
    decided_by TEXT,
    decision_notes TEXT,
    customer_notified_at TEXT
  );

  CREATE TABLE IF NOT EXISTS scheduling_issues (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    field_id TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL,
    detected_at TEXT NOT NULL,
    notified_at TEXT,
    resolved_at TEXT,
    resolved_by TEXT,
    resolution_notes TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_entries (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    details TEXT NOT NULL
  );
`);

type TableName = 'fields' | 'bookings' | 'escalations' | 'scheduling_issues' | 'audit_entries';

// A real database file created by an earlier session won't have columns
// added after that - `CREATE TABLE IF NOT EXISTS` is a no-op against an
// existing table, so new columns need their own idempotent migration step.
// `definition` must be a literal SQL fragment from this file, never
// caller/user-supplied data.
function ensureColumn(table: TableName, column: string, definition: string): void {
  const existing = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!existing.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('fields', 'size_format', "TEXT NOT NULL DEFAULT ''");
ensureColumn('fields', 'description', "TEXT NOT NULL DEFAULT ''");
ensureColumn('fields', 'amenities', "TEXT NOT NULL DEFAULT '[]'");

// Every id in this codebase is a human-readable prefixed string
// (`booking-3`, `escalation-1`, ...), not a raw database id - this keeps
// that format exactly as it was under the in-memory arrays, but derives the
// next number from what's actually stored so numbering continues correctly
// across a restart instead of colliding with real data. `table` is typed to
// the fixed set of tables this module creates, never a caller-supplied
// string, so it is safe to interpolate directly.
export function nextSequenceNumber(table: TableName, idPrefix: string): number {
  const rows = db.prepare(`SELECT id FROM ${table}`).all() as { id: string }[];
  let max = 0;
  const pattern = new RegExp(`^${idPrefix}-(\\d+)$`);
  for (const row of rows) {
    const match = row.id.match(pattern);
    if (match) {
      const n = Number(match[1]);
      if (n > max) max = n;
    }
  }
  return max + 1;
}
