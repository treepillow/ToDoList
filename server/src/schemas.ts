import { z } from 'zod';

export const PRIORITIES = ['low', 'medium', 'high'] as const;

const title = z.string().trim().min(1, 'Title is required').max(200);
const notes = z.string().max(5000);
const priority = z.enum(PRIORITIES).nullable();
const dueDate = z.iso.date().nullable();

// strictObject rejects unknown keys, so clients cannot set id/position/timestamps.
export const createTaskSchema = z.strictObject({
  title,
  notes: notes.optional(),
  priority: priority.optional(),
  dueDate: dueDate.optional(),
});

export const updateTaskSchema = z
  .strictObject({
    title: title.optional(),
    notes: notes.optional(),
    priority: priority.optional(),
    dueDate: dueDate.optional(),
    completed: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update');

export const listQuerySchema = z.strictObject({
  status: z.enum(['all', 'active', 'completed']).default('all'),
  sort: z.enum(['position', 'due', 'priority']).default('position'),
});

export const reorderSchema = z.strictObject({
  ids: z.array(z.number().int().positive()).max(10_000),
});

export const idParamSchema = z.coerce.number().int().positive();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
