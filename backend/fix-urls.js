import Database from 'better-sqlite3';
const db = new Database('./data/opex.db');

console.log('Fixing old localhost:3001 URLs in database...');

const rows = db.prepare('SELECT id, photo, attachments FROM fund_requests').all();
for (const row of rows) {
  let changed = false;
  let photo = row.photo;
  let attachments = row.attachments;
  
  if (photo && photo.includes('http://localhost:3001')) {
    photo = photo.replace(/http:\/\/localhost:3001/g, '');
    changed = true;
  }
  
  if (attachments && attachments.includes('http://localhost:3001')) {
    attachments = attachments.replace(/http:\/\/localhost:3001/g, '');
    changed = true;
  }
  
  if (changed) {
    db.prepare('UPDATE fund_requests SET photo = ?, attachments = ? WHERE id = ?').run(photo, attachments, row.id);
    console.log(`Updated request ID: ${row.id}`);
  }
}

const reports = db.prepare('SELECT id, photo, attachments FROM fund_reports').all();
for (const row of reports) {
  let changed = false;
  let photo = row.photo;
  let attachments = row.attachments;
  
  if (photo && photo.includes('http://localhost:3001')) {
    photo = photo.replace(/http:\/\/localhost:3001/g, '');
    changed = true;
  }
  
  if (attachments && attachments.includes('http://localhost:3001')) {
    attachments = attachments.replace(/http:\/\/localhost:3001/g, '');
    changed = true;
  }
  
  if (changed) {
    db.prepare('UPDATE fund_reports SET photo = ?, attachments = ? WHERE id = ?').run(photo, attachments, row.id);
    console.log(`Updated report ID: ${row.id}`);
  }
}

console.log('Done fixing URLs!');
