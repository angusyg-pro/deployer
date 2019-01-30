module.exports = {
  apps: [{
    name: 'deployer',
    script: './server/src/bin/www',
    watch: ['./server/src'],
    ignore_watch: ['./node_modules', './logs'],
    max_memory_restart: '200M',
    wait_ready: true,
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    merge_logs: true,
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      DB_URL: 'localhost:27017',
      DB_NAME: 'deployer',
      SERVER_URL: 'http://localhost:3000', // URL du serveur back, utilisé par le client Angularjs
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      DB_URL: '10.0.129.120:27017',
      DB_NAME: 'deployer',
      SERVER_URL: 'http://10.0.129.120:3001', // URL du serveur back, utilisé par le client Angularjs
    },
  }],
};
