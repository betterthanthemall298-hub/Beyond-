// Local development server only (npm run dev). On Vercel the API runs from the bundled api/index.cjs.
import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import app from './api-src/index';

async function start() {
  const PORT = Number(process.env.PORT) || 3000;
  const server = express();
  server.use(app);
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  server.use(vite.middlewares);
  server.listen(PORT, '0.0.0.0', () => console.log(`Dev server running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Dev server failed to start:', err);
  process.exit(1);
});
