import 'dotenv/config';

import express from 'express';

import { apiPort } from './config.js';

const app = express();

app.disable('x-powered-by');

const server = app.listen(apiPort, () => {
  console.log(`Servidor iniciado na porta ${apiPort}.`);
});

function shutdown(): void {
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
