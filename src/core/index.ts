import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import apiRouter, { closeApiDependencies } from '../routes/api.js';
import { apiPort } from './config.js';

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json());
app.use(apiRouter);
app.use(
  (
    _error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    response.status(500).json({
      success: false,
      message: 'Erro interno do servidor.',
    });
  },
);

const server = app.listen(apiPort, () => {
  console.log(`Servidor iniciado na porta ${apiPort}.`);
});

function shutdown(): void {
  server.close((error) => {
    void closeApiDependencies().finally(() => {
      process.exit(error ? 1 : 0);
    });
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
