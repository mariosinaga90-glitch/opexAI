const http = require('http');
const fs = require('fs');

// Baca file log error yang dihasilkan dari crash
const errorLog = fs.existsSync('/tmp/crash.log') 
  ? fs.readFileSync('/tmp/crash.log', 'utf8') 
  : 'Unknown error (No crash log found)';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🚨 APPLICATION CRASHED 🚨\n\nError Details:\n' + errorLog);
});

// Dengarkan di port yang sama agar Health Check Coolify lolos
server.listen(3001, '0.0.0.0', () => {
  console.log('Debug server running on port 3001');
});
