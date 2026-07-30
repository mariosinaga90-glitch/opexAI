import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();
const host = 'opextracker.com';
const username = 'root';
const password = 'Simanjorang83';

async function checkServer() {
  try {
    await ssh.connect({ host, username, password });
    
    const dockerResult = await ssh.execCommand('docker ps -a');
    console.log('\n--- ALL DOCKER CONTAINERS ---');
    console.log(dockerResult.stdout);

    ssh.dispose();
  } catch (error) {
    console.error('Error connecting:', error);
  }
}

checkServer();
