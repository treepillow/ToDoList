import { join } from 'node:path';
import express, { type ErrorRequestHandler } from 'express';
import type { Db } from './db.js';
import {
  requireJsonBody,
  requireLoopbackHost,
  requireSameOrigin,
  securityHeaders,
  writeRateLimiter,
  type RateLimitOptions,
} from './security.js';
import { createTaskRepo } from './tasks.repo.js';
import { tasksRouter } from './tasks.routes.js';

export interface AppOptions {
  db: Db;
  /** Directory of the built client (client/dist). When set, the UI is served too. */
  staticDir?: string;
  writeRateLimit?: RateLimitOptions;
}

export function createApp({ db, staticDir, writeRateLimit = { windowMs: 60_000, limit: 600 } }: AppOptions) {
  const app = express();

  app.disable('x-powered-by');
  app.use(requireLoopbackHost);
  app.use(securityHeaders());

  const api = express.Router();
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(requireSameOrigin);
  api.use(requireJsonBody);
  // Small body cap: a task never needs more than a few KB.
  api.use(express.json({ limit: '10kb' }));
  api.use(writeRateLimiter(writeRateLimit));

  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  api.use('/tasks', tasksRouter(createTaskRepo(db)));
  api.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use('/api', api);

  if (staticDir) {
    // Hashed filenames under /assets can be cached forever; index.html must revalidate.
    app.use('/assets', express.static(join(staticDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
    app.use(express.static(staticDir, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html')) return next();
      res.set('Cache-Control', 'no-cache');
      res.sendFile(join(staticDir, 'index.html'));
    });
  }

  // Never expose stack traces or internal messages to the client.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = typeof err?.status === 'number' ? err.status : 500;
    if (status >= 500) console.error(err);
    const message = status >= 500 ? 'Internal server error' : status === 404 ? 'Not found' : 'Bad request';
    res.status(status).json({ error: message });
  };
  app.use(errorHandler);

  return app;
}
