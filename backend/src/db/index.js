import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import path from 'path';
import fs from 'fs';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
// Calculate absolute db path relative to this file: backend/src/db/index.js -> backend/data/opex.db
const defaultDbPath = path.resolve(__dirname, '../../../data/opex.db');
const dbPath = process.env.DATABASE_PATH || defaultDbPath;
const dataDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
export const db = drizzle(sqlite, { schema });
