import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDueDate, formatTimestamp, isOverdue } from './format';

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

describe('formatTimestamp', () => {
  afterEach(() => vi.unstubAllEnvs());

  // 20:00 UTC on 24 Sep is already 25 Sep in Singapore but still 24 Sep in New York.
  it.each([
    ['Asia/Singapore', '2026-09-25'],
    ['America/New_York', '2026-09-24'],
  ])('shows the calendar day of a UTC timestamp in %s', (tz, localDay) => {
    vi.stubEnv('TZ', tz);
    expect(formatTimestamp('2026-09-24T20:00:00.000Z')).toBe(formatDueDate(localDay));
  });
});
