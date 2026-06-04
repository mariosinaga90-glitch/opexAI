import { NodeSSH } from 'node-ssh';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ssh = new NodeSSH();
const host = '202.10.34.185';
const username = 'root'; // Updated username
const password = '7L!1NPkYU9y6%H';

async function runDeploy() {
  try {
    console.log(`Connecting to ${host} as ${username}...`);
    await ssh.connect({
      host,
      username,
      password,
    });
    console.log('Connected!');

    // Check OS and Nginx
    const osResult = await ssh.execCommand('cat /etc/os-release');
    console.log('OS Info:', osResult.stdout.substring(0, 100));

    // Create web directory
    console.log('Setting up web directory...');
    await ssh.execCommand('mkdir -p /var/www/opexai');
    await ssh.execCommand(`chown -R ${username}:${username} /var/www/opexai`);

    // Upload files
    console.log('Uploading files...');
    const localDist = path.join(__dirname, 'dist');
    await ssh.putDirectory(localDist, '/var/www/opexai', {
      recursive: true,
      concurrency: 10,
    });
    console.log('Upload complete.');

    // Check Nginx installation
    console.log('Checking Nginx...');
    const nginxCheck = await ssh.execCommand('which nginx');
    if (!nginxCheck.stdout) {
      console.log('Installing Nginx...');
      await ssh.execCommand('apt-get update');
      await ssh.execCommand('apt-get install -y nginx');
    }

    // Configure Nginx
    console.log('Configuring Nginx...');
    const nginxConfig = `
server {
    listen 80;
    server_name ${host};

    root /var/www/opexai;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
`;
    // Write config to temp file and move it
    await ssh.execCommand(`echo '${nginxConfig}' > /tmp/opexai`);
    await ssh.execCommand('mv /tmp/opexai /etc/nginx/sites-available/opexai');
    await ssh.execCommand('ln -sf /etc/nginx/sites-available/opexai /etc/nginx/sites-enabled/');

    // Remove default nginx config to prevent conflicts on port 80
    await ssh.execCommand('rm -f /etc/nginx/sites-enabled/default');

    // Restart Nginx
    console.log('Restarting Nginx...');
    const restartResult = await ssh.execCommand('systemctl restart nginx');
    if (restartResult.stderr) {
      console.error('Nginx restart stderr:', restartResult.stderr);
    }

    console.log('Deployment successful! You can now access your app at http://' + host);

    ssh.dispose();
  } catch (error) {
    console.error('Deployment failed:', error);
    ssh.dispose();
  }
}

runDeploy();
