import Database from 'better-sqlite3';

const db = new Database('data/opex.db');
try {
  db.exec('ALTER TABLE users ADD COLUMN gensetBrand text;');
  console.log('Added gensetBrand');
} catch (e) {
  console.error('Failed or already exists:', e.message);
}

try {
  db.exec('ALTER TABLE users ADD COLUMN gensetCapacity text;');
  console.log('Added gensetCapacity');
} catch (e) {
  console.error('Failed or already exists:', e.message);
}

db.close();
