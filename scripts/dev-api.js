const { createApp } = require('../server/app');

const PORT = Number(process.env.PORT || 5000);

async function main() {
  const app = await createApp();
  const server = app.listen(PORT, () => {
    console.log(`Dev API running on http://localhost:${PORT}`);
  });
  const keepAlive = setInterval(() => {}, 60 * 1000);

  const shutdown = () => {
    clearInterval(keepAlive);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start dev API:', error);
  process.exit(1);
});
