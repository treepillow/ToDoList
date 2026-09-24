import { Router, type Response } from 'express';
import type { ZodError } from 'zod';
import {
  createTaskSchema,
  idParamSchema,
  listQuerySchema,
  reorderSchema,
  updateTaskSchema,
} from './schemas.js';
import type { TaskRepo } from './tasks.repo.js';

const validationError = (res: Response, error: ZodError) =>
  res.status(400).json({
    error: 'Validation failed',
    details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });

const notFound = (res: Response) => res.status(404).json({ error: 'Task not found' });

export function tasksRouter(repo: TaskRepo) {
  const router = Router();

  router.get('/', (req, res) => {
    const query = listQuerySchema.safeParse(req.query);
    if (!query.success) return validationError(res, query.error);
    res.json(repo.list(query.data));
  });

  router.post('/', (req, res) => {
    const body = createTaskSchema.safeParse(req.body);
    if (!body.success) return validationError(res, body.error);
    res.status(201).json(repo.create(body.data));
  });

  router.put('/order', (req, res) => {
    const body = reorderSchema.safeParse(req.body);
    if (!body.success) return validationError(res, body.error);
    if (!repo.reorder(body.data.ids)) {
      return res.status(400).json({ error: 'ids must list every task exactly once' });
    }
    res.status(204).end();
  });

  router.patch('/:id', (req, res) => {
    const id = idParamSchema.safeParse(req.params.id);
    if (!id.success) return validationError(res, id.error);
    const body = updateTaskSchema.safeParse(req.body);
    if (!body.success) return validationError(res, body.error);

    const task = repo.update(id.data, body.data);
    if (!task) return notFound(res);
    res.json(task);
  });

  router.delete('/:id', (req, res) => {
    const id = idParamSchema.safeParse(req.params.id);
    if (!id.success) return validationError(res, id.error);
    if (!repo.remove(id.data)) return notFound(res);
    res.status(204).end();
  });

  return router;
}
