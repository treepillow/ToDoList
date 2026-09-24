import { Router, type RequestHandler, type Response } from 'express';
import type { ZodError } from 'zod';
import type { ListRepo } from './lists.repo.js';
import {
  createListSchema,
  createTaskSchema,
  idParamSchema,
  listQuerySchema,
  reorderSchema,
  updateListSchema,
} from './schemas.js';
import type { TaskRepo } from './tasks.repo.js';

export const validationError = (res: Response, error: ZodError) =>
  res.status(400).json({
    error: 'Validation failed',
    details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });

const listNotFound = (res: Response) => res.status(404).json({ error: 'List not found' });

export function listsRouter(lists: ListRepo, tasks: TaskRepo) {
  const router = Router();

  /** Validates :listId and 404s for unknown lists; the id is left in res.locals.listId. */
  const withList: RequestHandler = (req, res, next) => {
    const id = idParamSchema.safeParse(req.params.listId);
    if (!id.success) return validationError(res, id.error);
    if (!lists.get(id.data)) return listNotFound(res);
    res.locals.listId = id.data;
    next();
  };

  router.get('/', (_req, res) => {
    res.json(lists.all());
  });

  router.post('/', (req, res) => {
    const body = createListSchema.safeParse(req.body);
    if (!body.success) return validationError(res, body.error);
    res.status(201).json(lists.create(body.data.name));
  });

  router.patch('/:listId', (req, res) => {
    const id = idParamSchema.safeParse(req.params.listId);
    if (!id.success) return validationError(res, id.error);
    const body = updateListSchema.safeParse(req.body);
    if (!body.success) return validationError(res, body.error);
    const list = lists.rename(id.data, body.data.name);
    if (!list) return listNotFound(res);
    res.json(list);
  });

  router.delete('/:listId', (req, res) => {
    const id = idParamSchema.safeParse(req.params.listId);
    if (!id.success) return validationError(res, id.error);
    const result = lists.remove(id.data);
    if (result === 'not-found') return listNotFound(res);
    if (result === 'last-list') return res.status(409).json({ error: 'Cannot delete the last list' });
    res.status(204).end();
  });

  router.get('/:listId/tasks', withList, (req, res) => {
    const query = listQuerySchema.safeParse(req.query);
    if (!query.success) return validationError(res, query.error);
    res.json(tasks.list(res.locals.listId, query.data));
  });

  router.post('/:listId/tasks', withList, (req, res) => {
    const body = createTaskSchema.safeParse(req.body);
    if (!body.success) return validationError(res, body.error);
    res.status(201).json(tasks.create(res.locals.listId, body.data));
  });

  router.put('/:listId/tasks/order', withList, (req, res) => {
    const body = reorderSchema.safeParse(req.body);
    if (!body.success) return validationError(res, body.error);
    if (!tasks.reorder(res.locals.listId, body.data.ids)) {
      return res.status(400).json({ error: 'ids must list every task in the list exactly once' });
    }
    res.status(204).end();
  });

  return router;
}
