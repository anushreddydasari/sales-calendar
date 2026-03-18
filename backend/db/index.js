const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Database = require('better-sqlite3');
const { initSchema } = require('./schema');

const BACKEND_ROOT = path.join(__dirname, '..');

/** DB path from .env SQLITE_DB_PATH, or default data/sales-calendar.db under backend */
function resolveDbPath() {
  const raw = (process.env.SQLITE_DB_PATH || '').trim();
  if (!raw) {
    return path.join(BACKEND_ROOT, 'data', 'sales-calendar.db');
  }
  if (path.isAbsolute(raw)) {
    return raw;
  }
  return path.join(BACKEND_ROOT, raw.replace(/^[/\\]+/, ''));
}

const DB_PATH = resolveDbPath();

let db;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    console.log(`✅ SQLite database ready at ${DB_PATH}`);
  }
  return db;
}

module.exports = { getDb, getDbPath: () => DB_PATH };
