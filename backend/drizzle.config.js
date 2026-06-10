import fs from 'fs';
import path from 'path';

// Pastikan direktori database ada sebelum drizzle-kit mencoba mengaksesnya
const dbPath = process.env.DATABASE_PATH || './data/opex.db';
const dbDir = path.dirname(path.resolve(dbPath));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export default {
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath,
  },
};
