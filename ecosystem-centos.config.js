module.exports = {
  apps: [{
    name: 'casino-frontend',
    script: 'start-prod.js',
    cwd: '/home/deploy/casino-frontend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_API_URL: '/api',
      NEXT_PUBLIC_WS_URL: '/ws'
    },
    error_file: '/var/log/pm2/casino-frontend-error.log',
    out_file: '/var/log/pm2/casino-frontend-out.log',
    log_file: '/var/log/pm2/casino-frontend-combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000
  }]
}; 