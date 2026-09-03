module.exports = {
  apps: [
    {
      name: "law-api",
      cwd: "/home/ubuntu/law-marketing",
      script: "./run_api.sh",
      interpreter: "bash"
    },
    {
      name: "law-front",
      cwd: "/home/ubuntu/law-marketing/frontend",
      script: "npm",
      args: "start -- -p 3000"
    }
  ]
};
