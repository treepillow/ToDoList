import { describe, expect, it } from 'vitest';
import { isOverdue } from './format';

describe('isOverdue', () => {
  const today = new Date(2026, 8, 24, 23, 30); // 24 Sep 2026, late evening local time

  it('is true for an open task due before today', () => {
    expect(isOverdue({ dueDate: '2026-09-23', completed: false }, today)).toBe(true);
  });

  it('is false for a task due today (still has time)', () => {
    expect(isOverdue({ dueDate: '2026-09-24', completed: false }, today)).toBe(false);
  });

  it('is false once the task is completed or has no due date', () => {
    expect(isOverdue({ dueDate: '2026-01-01', completed: true }, today)).toBe(false);
    expect(isOverdue({ dueDate: null, completed: false }, today)).toBe(false);
  });
});
