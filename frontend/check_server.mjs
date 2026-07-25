import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();
const host = 'opextracker.com';
const username = 'root';
const password = 'Simanjorang83';

async function checkServer() {
  try {
    await ssh.connect({ host, username, password });
    console.log('Connected to server!');

    console.log('\n--- Checking Coolify Health Post-Upgrade ---');
    const dockerPs = await ssh.execCommand('docker ps | grep coolify');
    console.log(dockerPs.stdout || dockerPs.stderr);
    
    console.log('\n--- Coolify HTTP Output ---');
    const curlCmd = await ssh.execCommand('curl -s -i http://localhost:8000/api/health');
    console.log(curlCmd.stdout || curlCmd.stderr);

    ssh.dispose();
  } catch (error) {
    console.error('Error connecting to server:', error.message);
    process.exit(1);
  }
}

checkServer();
