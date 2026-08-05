import { NodeSSH } from 'node-ssh';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ssh = new NodeSSH();
const host = 'opextracker.com';
const username = 'root'; 
const password = 'Simanjorang83';

async function runDeploy() {
  try {
    console.log(`Connecting to ${host} as ${username}...`);
    await ssh.connect({ host, username, password });
    console.log('Connected!');

    console.log('Uploading backend files to temporary server location...');
    await ssh.execCommand('mkdir -p /tmp/opexai-backend-src');
    
    const localSrc = path.join(__dirname, '../backend/src');
    await ssh.putDirectory(localSrc, '/tmp/opexai-backend-src', {
      recursive: true,
      concurrency: 10,
    });
    
    await ssh.putFile(path.join(__dirname, '../backend/migrate.js'), '/tmp/migrate.js');
    console.log('Upload complete.');

    console.log('Searching for active Coolify application container...');
    const containerResult = await ssh.execCommand("docker ps --format '{{.Names}}' | grep dnudzs4iz4nfn5cptv0d93ib | head -n 1");
    const containerName = containerResult.stdout.trim();
    
    if (containerName) {
        console.log(`Found container: ${containerName}`);
        console.log('Injecting new backend build into the container...');
        await ssh.execCommand(`docker cp /tmp/opexai-backend-src/. ${containerName}:/app/backend/src/`);
        await ssh.execCommand(`docker cp /tmp/migrate.js ${containerName}:/app/backend/`);
        
        console.log('Restarting container to apply backend changes...');
        await ssh.execCommand(`docker restart ${containerName}`);
        
        console.log('Backend deployment successful!');
    } else {
        console.error('Error: Could not find the active Coolify container.');
    }

    ssh.dispose();
  } catch (error) {
    console.error('Deployment failed:', error);
    if (ssh) ssh.dispose();
  }
}

runDeploy();
