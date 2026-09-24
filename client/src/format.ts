const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const dateFormatWithYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** Formats a YYYY-MM-DD date like Notion ("Sep 30"), adding the year only when it differs. */
export function formatDueDate(isoDate: string, today = new Date()): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!); // local midnight — avoids UTC off-by-one
  return (y === today.getFullYear() ? dateFormat : dateFormatWithYear).format(date);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export const localISODate = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Overdue = still open and due before today (a task due today is not late yet). */
export function isOverdue(task: { dueDate: string | null; completed: boolean }, today = new Date()): boolean {
  return !task.completed && task.dueDate !== null && task.dueDate < localISODate(today);
}
