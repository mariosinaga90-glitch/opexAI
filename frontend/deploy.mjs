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
    await ssh.connect({
      host,
      username,
      password,
    });
    console.log('Connected!');

    // Upload files to a temporary location
    console.log('Uploading files to temporary server location...');
    await ssh.execCommand('mkdir -p /tmp/opexai-frontend-dist');
    const localDist = path.join(__dirname, 'dist');
    await ssh.putDirectory(localDist, '/tmp/opexai-frontend-dist', {
      recursive: true,
      concurrency: 10,
    });
    console.log('Upload complete.');

    // Inject files directly into the active Coolify container
    console.log('Searching for active Coolify application container...');
    const containerResult = await ssh.execCommand("docker ps --format '{{.Names}}' | grep dnudzs4iz4nfn5cptv0d93ib");
    const containerName = containerResult.stdout.trim();
    
    if (containerName) {
        console.log(`Found container: ${containerName}`);
        console.log('Injecting new frontend build into the container...');
        const cpResult = await ssh.execCommand(`docker cp /tmp/opexai-frontend-dist/. ${containerName}:/app/frontend/dist/`);
        
        if (cpResult.stderr) {
            console.error('Warning during injection:', cpResult.stderr);
        }
        
        console.log('Deployment successful! You can now access your app at http://opextracker.com');
    } else {
        console.error('Error: Could not find the active Coolify container. Is the backend running?');
    }

    ssh.dispose();
  } catch (error) {
    console.error('Deployment failed:', error);
    ssh.dispose();
  }
}

runDeploy();
