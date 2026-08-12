import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkDb() {
  try {
    await ssh.connect({
      host: 'opextracker.com',
      username: 'root',
      password: 'Simanjorang83'
    });
    
    const containerResult = await ssh.execCommand("docker ps --format '{{.Names}}' | grep dnudzs4iz4nfn5cptv0d93ib | head -n 1");
    const containerName = containerResult.stdout.trim();
    console.log('Container:', containerName);
    
    // Use sqlite3 CLI inside the container
    const dbCheck = await ssh.execCommand(`docker exec ${containerName} sh -c "node -e \\"const Database = require('better-sqlite3'); const db = new Database('/app/backend/data/opex.db'); const rows = db.prepare('SELECT datasetId, fileName, length(data) as dataSize FROM dashboard_data').all(); console.log(JSON.stringify(rows)); db.close();\\""`);
    
    console.log('Dashboard Data:', dbCheck.stdout);
    if (dbCheck.stderr) console.log('Stderr:', dbCheck.stderr);
    
    ssh.dispose();
  } catch (e) {
    console.error('Failed:', e.message);
    if (ssh) ssh.dispose();
  }
}

checkDb();
