import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dbPath = process.env.DATABASE_PATH || './data/opex.db';
const dataDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
export const db = drizzle(sqlite, { schema });
