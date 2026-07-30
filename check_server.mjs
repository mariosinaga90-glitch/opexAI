import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();
const host = 'opextracker.com';
const username = 'root';
const password = 'Simanjorang83';

async function checkServer() {
  try {
    await ssh.connect({ host, username, password });
    console.log('Connected to server.');
    
    const dockerResult = await ssh.execCommand('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"');
    console.log('\n--- DOCKER CONTAINERS ---');
    console.log(dockerResult.stdout);

    const pm2Result = await ssh.execCommand('pm2 status || echo "PM2 not installed"');
    console.log('\n--- PM2 PROCESSES ---');
    console.log(pm2Result.stdout);

    ssh.dispose();
  } catch (error) {
    console.error('Error connecting:', error);
  }
}

checkServer();
