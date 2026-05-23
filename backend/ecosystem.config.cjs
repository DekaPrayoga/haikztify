module.exports = {
  apps: [{
    name: 'haikztify-api',
    script: 'server.mjs',
    cwd: '/root/main/spotify-clone-react/backend',
    node_args: '--max-old-space-size=256',   // limit to 256MB RAM
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '300M',              // auto-restart if >300MB
    env: {
      NODE_ENV: 'production',
    },
    // Logging
    error_file: '/root/main/spotify-clone-react/backend/logs/error.log',
    out_file: '/root/main/spotify-clone-react/backend/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    // Auto restart on crash
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 5000,
  }]
};
