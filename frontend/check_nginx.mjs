import { NodeSSH } from 'node-ssh';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();
const host = 'opextracker.com';
const username = 'root';
const password = 'Simanjorang83';

async function testDeploy() {
  try {
    await ssh.connect({ host, username, password });
    console.log('Connected. Uploading dist...');
    
    // Upload files to a temporary location
    await ssh.execCommand('mkdir -p /tmp/opexai-dist');
    const localDist = path.join(__dirname, 'dist');
    await ssh.putDirectory(localDist, '/tmp/opexai-dist', {
      recursive: true,
      concurrency: 10,
    });
    console.log('Upload to /tmp complete.');

    // Find the container
    const containerResult = await ssh.execCommand("docker ps --format '{{.Names}}' | grep dnudzs4iz4nfn5cptv0d93ib");
    const containerName = containerResult.stdout.trim();
    if (containerName) {
        console.log(`Found container: ${containerName}. Copying files...`);
        const cpResult = await ssh.execCommand(`docker cp /tmp/opexai-dist/. ${containerName}:/app/frontend/dist/`);
        console.log('CP Result:', cpResult.stdout || cpResult.stderr);
        console.log('Deployment to container successful!');
    } else {
        console.log('Container not found!');
    }

    ssh.dispose();
  } catch (error) {
    console.error('Error:', error);
    ssh.dispose();
  }
}

testDeploy();
