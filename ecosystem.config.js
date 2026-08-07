module.exports = {
  apps: [
    {
      name: "funraisingit-be",
      script: "pnpm",
      args: "run dev",

      instances: 1,
      exec_mode: "fork",

      watch: false,

      autorestart: true,
      max_restarts: 10,
    }
  ]
};