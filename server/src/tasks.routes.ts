import { Router, type Response } from 'express';
import { validationError } from './lists.routes.js';
import { idParamSchema, updateTaskSchema } from './schemas.js';
import type { TaskRepo } from './tasks.repo.js';

const notFound = (res: Response) => res.status(404).json({ error: 'Task not found' });

/** Routes for a single task. Listing, creating and reordering live under /api/lists/:listId/tasks. */
export function tasksRouter(repo: TaskRepo) {
  const router = Router();

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
