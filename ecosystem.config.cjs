module.exports = {
  apps: [
    {
      name: "opexai-production",
      script: "src/index.js",
      cwd: "./backend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
        HOST: "0.0.0.0",
        DATABASE_PATH: "./data/opex.db",
        CORS_ORIGIN: "http://localhost,http://localhost:3001"
      }
    }
  ]
};
