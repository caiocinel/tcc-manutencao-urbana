module.exports = {
  apps: [{
    name: 'central-urbana-backend',
    script: 'index.js',
    node_args: '--max-old-space-size=2048',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_restarts: 10,
    restart_delay: 5000,
    autorestart: true,
  }],
};
