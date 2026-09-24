import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import type { Db } from './db.js';
import { createTaskRepo } from './tasks.repo.js';
import { tasksRouter } from './tasks.routes.js';

export function createApp({ db }: { db: Db }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  // Small body cap: a task never needs more than a few KB.
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/tasks', tasksRouter(createTaskRepo(db)));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Never expose stack traces or internal messages to the client.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = typeof err?.status === 'number' ? err.status : 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : 'Bad request' });
  };
  app.use(errorHandler);

  return app;
}
