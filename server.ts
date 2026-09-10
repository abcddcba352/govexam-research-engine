import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import { createApp } from './server/serverApp.ts';

if (!process.env.PERSISTENCE_BACKEND) {
  process.env.PERSISTENCE_BACKEND = 'DATABASE';
}

async function startServer() {
  const app = createApp();
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
  }
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => console.log('GovExam Research Server listening on port ' + port));
}
startServer().catch(error => { console.error(error); process.exitCode = 1; });
